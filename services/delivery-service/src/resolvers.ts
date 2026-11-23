import { Delivery } from './models/delivery.js';
import * as svc from './services/delivery.service.js';
import { Context, requireUser } from './context.js';

type DeliveryDoc = {
  orderId: string;
  courierId?: string | null;
  assignedAt?: Date | null;
  pickedUpAt?: Date | null;
  deliveredAt?: Date | null;
};

const iso = (d?: Date | null) => (d ? d.toISOString() : null);

export const resolvers = {
  Query: {
    deliveryByOrder: (_: unknown, { orderId }: { orderId: string }) => Delivery.findOne({ orderId }).exec(),
    availableDeliveries: (_: unknown, __: unknown, ctx: Context) => {
      requireUser(ctx, 'COURIER');
      return svc.listAvailable();
    },
    myDeliveries: (_: unknown, __: unknown, ctx: Context) => svc.listForCourier(requireUser(ctx, 'COURIER').id),
  },
  Mutation: {
    acceptDelivery: (_: unknown, { id }: { id: string }, ctx: Context) => svc.accept(requireUser(ctx, 'COURIER').id, id),
    pickUpDelivery: (_: unknown, { id }: { id: string }, ctx: Context) => svc.pickUp(requireUser(ctx, 'COURIER').id, id),
    completeDelivery: (_: unknown, { id }: { id: string }, ctx: Context) =>
      svc.complete(requireUser(ctx, 'COURIER').id, id),
  },
  Order: {
    delivery: (o: { id: string }) => Delivery.findOne({ orderId: o.id }).exec(),
  },
  Delivery: {
    order: (d: DeliveryDoc) => ({ __typename: 'Order', id: d.orderId }),
    courier: (d: DeliveryDoc) => (d.courierId ? { __typename: 'User', id: d.courierId } : null),
    assignedAt: (d: DeliveryDoc) => iso(d.assignedAt),
    pickedUpAt: (d: DeliveryDoc) => iso(d.pickedUpAt),
    deliveredAt: (d: DeliveryDoc) => iso(d.deliveredAt),
  },
};
