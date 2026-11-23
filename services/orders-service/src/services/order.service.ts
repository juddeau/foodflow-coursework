import { GraphQLError } from 'graphql';
import { Order } from '../models/order.js';
import { canTransition, OrderStatus } from '../domain/order-status.js';
import { calculateTotals } from '../domain/pricing.js';
import { fetchRestaurantWithItems } from './restaurant.client.js';
import { publish, SUBJECTS, OrderReadyEvent, DeliveryStatusEvent } from '../events.js';
import type { AuthUser } from '../context.js';

export interface PlaceOrderInput {
  restaurantId: string;
  items: { menuItemId: string; quantity: number }[];
  address: string;
  comment?: string;
}

const bad = (message: string, code = 'BAD_USER_INPUT') => new GraphQLError(message, { extensions: { code } });

export async function placeOrder(customerId: string, input: PlaceOrderInput) {
  if (!input.address.trim()) throw bad('Укажите адрес доставки');
  const ids = [...new Set(input.items.map((i) => i.menuItemId))];
  const { restaurant, items } = await fetchRestaurantWithItems(input.restaurantId, ids);

  if (!restaurant) throw bad('Ресторан не найден', 'NOT_FOUND');
  if (!restaurant.isOpen) throw bad('Ресторан сейчас не принимает заказы');

  const byId = new Map(items.map((m) => [m.id, m]));
  const lines = input.items.map((i) => {
    const m = byId.get(i.menuItemId);
    if (!m || m.restaurant.id !== restaurant.id) throw bad('В заказе есть блюдо из другого ресторана или удалённое');
    if (!m.available) throw bad(`Блюдо «${m.name}» закончилось`);
    return { menuItemId: m.id, name: m.name, price: m.price, quantity: i.quantity };
  });

  let totals;
  try {
    totals = calculateTotals(lines);
  } catch (e) {
    throw bad((e as Error).message);
  }

  return Order.create({
    customerId,
    restaurantId: restaurant.id,
    restaurantOwnerId: restaurant.owner.id,
    restaurantName: restaurant.name,
    restaurantAddress: restaurant.address,
    items: lines,
    ...totals,
    address: input.address.trim(),
    comment: input.comment ?? '',
    status: 'CREATED',
    statusHistory: [{ status: 'CREATED' }],
  });
}

async function findOrder(id: string) {
  const order = await Order.findById(id).exec();
  if (!order) throw bad('Заказ не найден', 'NOT_FOUND');
  return order;
}

export async function getOrderFor(user: AuthUser, id: string) {
  const order = await findOrder(id);
  const allowed =
    (user.role === 'CUSTOMER' && order.customerId === user.id) ||
    (user.role === 'RESTAURANT' && order.restaurantOwnerId === user.id) ||
    (user.role === 'COURIER' && order.courierId === user.id);
  if (!allowed) throw bad('Нет доступа к заказу', 'FORBIDDEN');
  return order;
}

// Чтение заказа из карточки доставки: свободное готовое задание видно курьерам.
// Данные уже назначенного задания доступны только назначенному курьеру.
export async function getOrderForDelivery(user: AuthUser, id: string) {
  if (user.role !== 'COURIER') return getOrderFor(user, id);
  const order = await findOrder(id);
  const available = order.status === 'READY' && !order.courierId;
  if (!available && order.courierId !== user.id) {
    throw bad('Нет доступа к заказу', 'FORBIDDEN');
  }
  return order;
}

export function listForCustomer(customerId: string) {
  return Order.find({ customerId }).sort({ createdAt: -1 }).limit(50).exec();
}

export function listForRestaurant(ownerId: string, status?: OrderStatus) {
  return Order.find({ restaurantOwnerId: ownerId, ...(status ? { status } : {}) })
    .sort({ createdAt: -1 })
    .limit(100).exec();
}

export async function changeStatus(user: AuthUser, id: string, to: OrderStatus) {
  const order = await getOrderFor(user, id);
  const from = order.status as OrderStatus;
  if (!canTransition(from, to, user.role)) throw bad(`Нельзя перевести заказ из ${from} в ${to}`);

  order.status = to;
  order.statusHistory.push({ status: to, at: new Date() });
  await order.save();

  if (to === 'READY') {
    // Заказ готов: delivery-service по этому событию создаёт задание для курьеров
    publish<OrderReadyEvent>(SUBJECTS.ORDER_READY, {
      orderId: order.id,
      restaurantName: order.restaurantName,
      pickupAddress: order.restaurantAddress,
      dropoffAddress: order.address,
      customerId: order.customerId,
    });
  }
  return order;
}

// Обработчик событий от delivery-service
export async function applyDeliveryStatus(event: DeliveryStatusEvent): Promise<void> {
  const order = await Order.findById(event.orderId).exec();
  if (!order) return;
  if (event.status === 'ASSIGNED') {
    order.courierId = event.courierId;
    await order.save();
    return;
  }
  const from = order.status as OrderStatus;
  if (!canTransition(from, event.status, 'SYSTEM')) {
    console.warn(`Пропущено событие ${event.status} для заказа ${order.id} в статусе ${from}`);
    return;
  }
  order.status = event.status;
  order.courierId = event.courierId;
  order.statusHistory.push({ status: event.status, at: new Date() });
  await order.save();
}
