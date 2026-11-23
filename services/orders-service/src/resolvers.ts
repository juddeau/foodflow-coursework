import { Order } from './models/order.js';
import * as svc from './services/order.service.js';
import type { OrderStatus } from './domain/order-status.js';
import { Context, requireUser } from './context.js';

type OrderDoc = {
  customerId: string;
  restaurantId: string;
  courierId?: string | null;
  createdAt: Date;
  statusHistory: { status: string; at: Date }[];
};

export const resolvers = {
  Query: {
    deliveryOrder: (_: unknown, { id }: { id: string }, ctx: Context) => svc.getOrderForDelivery(requireUser(ctx), id),
    order: (_: unknown, { id }: { id: string }, ctx: Context) => svc.getOrderFor(requireUser(ctx), id),
    myOrders: (_: unknown, __: unknown, ctx: Context) => svc.listForCustomer(requireUser(ctx, 'CUSTOMER').id),
    restaurantOrders: (_: unknown, { status }: { status?: OrderStatus }, ctx: Context) =>
      svc.listForRestaurant(requireUser(ctx, 'RESTAURANT').id, status),
  },
  Mutation: {
    placeOrder: (_: unknown, { input }: { input: svc.PlaceOrderInput }, ctx: Context) =>
      svc.placeOrder(requireUser(ctx, 'CUSTOMER').id, input),
    cancelOrder: (_: unknown, { id }: { id: string }, ctx: Context) =>
      svc.changeStatus(requireUser(ctx, 'CUSTOMER', 'RESTAURANT'), id, 'CANCELLED'),
    updateOrderStatus: (_: unknown, args: { id: string; status: OrderStatus }, ctx: Context) =>
      svc.changeStatus(requireUser(ctx, 'RESTAURANT'), args.id, args.status),
  },
  Order: {
    customer: (o: OrderDoc) => ({ __typename: 'User', id: o.customerId }),
    restaurant: (o: OrderDoc) => ({ __typename: 'Restaurant', id: o.restaurantId }),
    courier: (o: OrderDoc) => (o.courierId ? { __typename: 'User', id: o.courierId } : null),
    createdAt: (o: OrderDoc) => o.createdAt.toISOString(),
    statusHistory: (o: OrderDoc) => o.statusHistory.map((h) => ({ status: h.status, at: h.at.toISOString() })),
  },
};
