import type { Role } from '../context.js';

export type OrderStatus = 'CREATED' | 'ACCEPTED' | 'READY' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';

// Кто и в какой статус может перевести заказ. SYSTEM — события от delivery-service.
type Actor = Role | 'SYSTEM';

const TRANSITIONS: Record<OrderStatus, Partial<Record<OrderStatus, Actor[]>>> = {
  CREATED: { ACCEPTED: ['RESTAURANT'], CANCELLED: ['CUSTOMER', 'RESTAURANT'] },
  ACCEPTED: { READY: ['RESTAURANT'], CANCELLED: ['RESTAURANT'] },
  READY: { PICKED_UP: ['SYSTEM'] },
  PICKED_UP: { DELIVERED: ['SYSTEM'] },
  DELIVERED: {},
  CANCELLED: {},
};

export function canTransition(from: OrderStatus, to: OrderStatus, actor: Actor): boolean {
  return TRANSITIONS[from][to]?.includes(actor) ?? false;
}

export function isFinal(status: OrderStatus): boolean {
  return Object.keys(TRANSITIONS[status]).length === 0;
}
