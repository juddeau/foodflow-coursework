import { GraphQLError } from 'graphql';
import { Delivery } from '../models/delivery.js';
import { publish, SUBJECTS, OrderReadyEvent, DeliveryStatusEvent } from '../events.js';

const bad = (message: string, code = 'BAD_USER_INPUT') => new GraphQLError(message, { extensions: { code } });

// Обработчик события order.ready. upsert делает обработку идемпотентной:
// повторное событие не создаст второе задание на доставку
export async function createFromOrder(e: OrderReadyEvent): Promise<void> {
  await Delivery.updateOne(
    { orderId: e.orderId },
    {
      $setOnInsert: {
        orderId: e.orderId,
        customerId: e.customerId,
        restaurantName: e.restaurantName,
        pickupAddress: e.pickupAddress,
        dropoffAddress: e.dropoffAddress,
        status: 'WAITING_COURIER',
      },
    },
    { upsert: true },
  );
  console.log(`Создано задание на доставку заказа ${e.orderId}`);
}

export function listAvailable() {
  return Delivery.find({ status: 'WAITING_COURIER' }).sort({ createdAt: 1 }).limit(50).exec();
}

export function listForCourier(courierId: string) {
  return Delivery.find({ courierId }).sort({ updatedAt: -1 }).limit(50).exec();
}

function notify(orderId: string, status: DeliveryStatusEvent['status'], courierId: string) {
  publish<DeliveryStatusEvent>(SUBJECTS.DELIVERY_STATUS, { orderId, status, courierId });
}

export async function accept(courierId: string, id: string) {
  // Атомарное условие status = WAITING_COURIER: два курьера не возьмут один заказ
  const d = await Delivery.findOneAndUpdate(
    { _id: id, status: 'WAITING_COURIER' },
    { status: 'ASSIGNED', courierId, assignedAt: new Date() },
    { new: true },
  );
  if (!d) throw bad('Заказ уже взят другим курьером или не найден', 'CONFLICT');
  notify(d.orderId, 'ASSIGNED', courierId);
  return d;
}

async function advance(courierId: string, id: string, from: string, to: 'PICKED_UP' | 'DELIVERED') {
  const stamp = to === 'PICKED_UP' ? { pickedUpAt: new Date() } : { deliveredAt: new Date() };
  const d = await Delivery.findOneAndUpdate({ _id: id, courierId, status: from }, { status: to, ...stamp }, { new: true });
  if (!d) throw bad(`Доставку нельзя перевести в ${to}`);
  notify(d.orderId, to, courierId);
  return d;
}

export const pickUp = (courierId: string, id: string) => advance(courierId, id, 'ASSIGNED', 'PICKED_UP');
export const complete = (courierId: string, id: string) => advance(courierId, id, 'PICKED_UP', 'DELIVERED');
