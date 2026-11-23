import { useCallback, useState } from 'react';
import { gql, STATUS_LABELS } from '../api';
import { usePolling } from '../usePolling';

interface Delivery {
  id: string; restaurantName: string; pickupAddress: string; dropoffAddress: string; status: string;
  order: { total: number; items: { name: string; quantity: number }[] };
}

const FIELDS = `id restaurantName pickupAddress dropoffAddress status order { total items { name quantity } }`;
const QUERY = `{ availableDeliveries { ${FIELDS} } myDeliveries { ${FIELDS} } }`;

const ACTIONS: Record<string, { mutation: string; label: string }> = {
  WAITING_COURIER: { mutation: 'acceptDelivery', label: 'Взять заказ' },
  ASSIGNED: { mutation: 'pickUpDelivery', label: 'Забрал из ресторана' },
  PICKED_UP: { mutation: 'completeDelivery', label: 'Доставил' },
};

export function CourierView() {
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => gql<{ availableDeliveries: Delivery[]; myDeliveries: Delivery[] }>(QUERY), []);
  const { data, refresh } = usePolling(load);

  const act = (d: Delivery) => {
    const a = ACTIONS[d.status];
    gql(`mutation ($id: ID!) { ${a.mutation}(id: $id) { id } }`, { id: d.id }).then(
      () => { setError(null); refresh(); },
      (e) => setError(e.message),
    );
  };

  const card = (d: Delivery) => (
    <div key={d.id} className="card">
      <div className="row">
        <strong>{d.restaurantName}</strong>
        <span className={`badge s-${d.status}`}>{STATUS_LABELS[d.status]}</span>
      </div>
      <div className="small">Откуда: {d.pickupAddress}</div>
      <div className="small">Куда: {d.dropoffAddress}</div>
      <div className="small muted">{d.order.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')}</div>
      {ACTIONS[d.status] && <button onClick={() => act(d)}>{ACTIONS[d.status].label}</button>}
    </div>
  );

  return (
    <div className="grid">
      <section>
        <h2>Свободные заказы</h2>
        {error && <div className="error">{error}</div>}
        {data?.availableDeliveries.length === 0 && <p className="muted">Пока нет готовых заказов</p>}
        {data?.availableDeliveries.map(card)}
      </section>
      <section>
        <h2>Мои доставки</h2>
        {data?.myDeliveries.length === 0 && <p className="muted">Вы ещё не брали заказы</p>}
        {data?.myDeliveries.map(card)}
      </section>
    </div>
  );
}
