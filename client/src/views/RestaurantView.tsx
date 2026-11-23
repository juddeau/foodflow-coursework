import { useCallback, useState } from 'react';
import { gql, rub, STATUS_LABELS } from '../api';
import { usePolling } from '../usePolling';

interface Order {
  id: string; total: number; status: string; address: string; comment?: string; createdAt: string;
  items: { name: string; quantity: number }[];
  customer: { name: string; phone?: string };
}

const ORDERS = `{ myRestaurant { name isOpen }
  restaurantOrders { id total status address comment createdAt items { name quantity } customer { name phone } } }`;
const UPDATE = `mutation ($id: ID!, $status: OrderStatus!) { updateOrderStatus(id: $id, status: $status) { id status } }`;
const SET_OPEN = `mutation ($isOpen: Boolean!) { setRestaurantOpen(isOpen: $isOpen) { isOpen } }`;

const NEXT: Record<string, { status: string; label: string }[]> = {
  CREATED: [{ status: 'ACCEPTED', label: 'Принять' }, { status: 'CANCELLED', label: 'Отклонить' }],
  ACCEPTED: [{ status: 'READY', label: 'Готов к выдаче' }],
};

export function RestaurantView() {
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(
    () => gql<{ myRestaurant: { name: string; isOpen: boolean }; restaurantOrders: Order[] }>(ORDERS),
    [],
  );
  const { data, refresh } = usePolling(load);

  const act = (id: string, status: string) => gql(UPDATE, { id, status }).then(refresh, (e) => setError(e.message));

  const active = data?.restaurantOrders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status)) ?? [];
  const done = data?.restaurantOrders.filter((o) => ['DELIVERED', 'CANCELLED'].includes(o.status)) ?? [];

  return (
    <div>
      <div className="row">
        <h2>{data?.myRestaurant.name ?? 'Ресторан'}: заказы</h2>
        {data && (
          <button className="secondary" onClick={() => gql(SET_OPEN, { isOpen: !data.myRestaurant.isOpen }).then(refresh)}>
            {data.myRestaurant.isOpen ? 'Закрыть приём заказов' : 'Открыть приём заказов'}
          </button>
        )}
      </div>
      {error && <div className="error">{error}</div>}
      {active.length === 0 && <p className="muted">Активных заказов нет</p>}
      <div className="list">
        {active.map((o) => (
          <div key={o.id} className="card">
            <div className="row">
              <strong>Заказ от {new Date(o.createdAt).toLocaleTimeString('ru-RU')}</strong>
              <span className={`badge s-${o.status}`}>{STATUS_LABELS[o.status]}</span>
            </div>
            <ul>
              {o.items.map((i) => <li key={i.name}>{i.name} × {i.quantity}</li>)}
            </ul>
            <div className="small muted">{o.customer.name} · {o.address} · {rub(o.total)}</div>
            <div className="actions">
              {NEXT[o.status]?.map((n) => (
                <button key={n.status} className={n.status === 'CANCELLED' ? 'secondary' : ''} onClick={() => act(o.id, n.status)}>
                  {n.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {done.length > 0 && (
        <>
          <h3>Завершённые</h3>
          {done.map((o) => (
            <div key={o.id} className="row small">
              <span>{new Date(o.createdAt).toLocaleString('ru-RU')} · {rub(o.total)}</span>
              <span className={`badge s-${o.status}`}>{STATUS_LABELS[o.status]}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
