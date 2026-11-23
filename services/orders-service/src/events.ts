import { connect, JSONCodec, NatsConnection } from 'nats';

// Асинхронный обмен событиями между сервисами через брокер NATS
export const SUBJECTS = {
  ORDER_READY: 'order.ready',
  DELIVERY_STATUS: 'delivery.status',
} as const;

export interface OrderReadyEvent {
  orderId: string;
  restaurantName: string;
  pickupAddress: string;
  dropoffAddress: string;
  customerId: string;
}

export interface DeliveryStatusEvent {
  orderId: string;
  status: 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED';
  courierId: string;
}

const codec = JSONCodec();
let nc: NatsConnection | null = null;

export async function connectBus(url: string): Promise<NatsConnection> {
  for (let attempt = 1; ; attempt++) {
    try {
      nc = await connect({ servers: url, name: process.env.SERVICE_NAME ?? 'service' });
      console.log(`NATS подключён: ${url}`);
      return nc;
    } catch (err) {
      if (attempt >= 10) throw err;
      console.log(`NATS недоступен, попытка ${attempt}/10`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

export function publish<T>(subject: string, payload: T): void {
  if (!nc) throw new Error('Шина событий не подключена');
  nc.publish(subject, codec.encode(payload));
}

// Очередь (queue group) нужна, чтобы при нескольких репликах сервиса
// событие обработала только одна из них
export function subscribe<T>(subject: string, queue: string, handler: (data: T) => Promise<void>): void {
  if (!nc) throw new Error('Шина событий не подключена');
  const sub = nc.subscribe(subject, { queue });
  (async () => {
    for await (const msg of sub) {
      try {
        await handler(codec.decode(msg.data) as T);
      } catch (err) {
        console.error(`Ошибка обработки ${subject}:`, err);
      }
    }
  })();
}
