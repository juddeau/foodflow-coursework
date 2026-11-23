import { useCallback, useEffect, useState } from 'react';
import { gql, rub, STATUS_LABELS } from '../api';
import { usePolling } from '../usePolling';

interface MenuItem { id: string; name: string; description?: string; category: string; price: number }
interface Restaurant { id: string; name: string; description?: string; cuisine: string; isOpen: boolean; avgCookingMinutes: number; menu: MenuItem[] }
interface Order {
  id: string; restaurantName: string; total: number; status: string; createdAt: string;
  items: { name: string; quantity: number }[];
  delivery: { status: string } | null;
  courier: { name: string } | null;
}

const RESTAURANTS = `{ restaurants { id name description cuisine isOpen avgCookingMinutes
  menu(onlyAvailable: true) { id name description category price } } }`;

// Один запрос через шлюз собирает данные из трёх сервисов:
// заказ (orders), доставку (delivery) и имя курьера (users)
const MY_ORDERS = `{ myOrders { id restaurantName total status createdAt
  items { name quantity } delivery { status } courier { name } } }`;

const PLACE = `mutation ($input: PlaceOrderInput!) { placeOrder(input: $input) { id } }`;
const CANCEL = `mutation ($id: ID!) { cancelOrder(id: $id) { id } }`;

export function CustomerView() {
  const [restaurants, setRestaurants] = useState<Restaurant[] | null>(null);
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [address, setAddress] = useState('Москва, ул. Стромынка, 20, кв. 5');
  const [message, setMessage] = useState<string | null>(null);

  const loadOrders = useCallback(() => gql<{ myOrders: Order[] }>(MY_ORDERS).then((d) => d.myOrders), []);
  const orders = usePolling(loadOrders);

  useEffect(() => {
    gql<{ restaurants: Restaurant[] }>(RESTAURANTS).then((d) => setRestaurants(d.restaurants), (e) => setMessage(e.message));
  }, []);

  const change = (id: string, delta: number) =>
    setCart((c) => {
      const q = Math.max(0, (c[id] ?? 0) + delta);
      const next = { ...c, [id]: q };
      if (q === 0) delete next[id];
      return next;
    });

  const cartTotal = selected ? selected.menu.reduce((s, m) => s + (cart[m.id] ?? 0) * m.price, 0) : 0;

  const placeOrder = async () => {
    if (!selected) return;
    try {
      await gql(PLACE, {
        input: {
          restaurantId: selected.id,
          address,
          items: Object.entries(cart).map(([menuItemId, quantity]) => ({ menuItemId, quantity })),
        },
      });
      setCart({});
      setMessage('Заказ оформлен');
      orders.refresh();
    } catch (e) {
      setMessage((e as Error).message);
    }
  };

  return (
    <div className="grid">
      <section>
        <h2>Рестораны</h2>
        <div className="list">
          {restaurants?.map((r) => (
            <button
              key={r.id}
              className={`card restaurant ${selected?.id === r.id ? 'active' : ''}`}
              disabled={!r.isOpen}
              onClick={() => {
                setSelected(r);
                setCart({});
              }}
            >
              <strong>{r.name}</strong>
              <span className="muted">
                {r.cuisine} · ~{r.avgCookingMinutes} мин {r.isOpen ? '' : '· закрыт'}
              </span>
            </button>
          ))}
        </div>

        {selected && (
          <>
            <h2>Меню: {selected.name}</h2>
            {selected.menu.map((m) => (
              <div key={m.id} className="row">
                <div>
                  <div>{m.name}</div>
                  <div className="muted small">{m.category} {m.description ? `· ${m.description}` : ''}</div>
                </div>
                <div className="qty">
                  <span>{rub(m.price)}</span>
                  <button className="secondary" onClick={() => change(m.id, -1)}>−</button>
                  <span>{cart[m.id] ?? 0}</span>
                  <button className="secondary" onClick={() => change(m.id, 1)}>+</button>
                </div>
              </div>
            ))}
            <div className="card checkout">
              <label>
                Адрес доставки
                <input value={address} onChange={(e) => setAddress(e.target.value)} />
              </label>
              <div className="row">
                <span>Сумма блюд: {rub(cartTotal)}</span>
                <button disabled={cartTotal === 0} onClick={placeOrder}>Оформить заказ</button>
              </div>
              <div className="muted small">Доставка 149 ₽, от 1500 ₽ бесплатно</div>
            </div>
          </>
        )}
        {message && <div className="notice">{message}</div>}
      </section>

      <section>
        <h2>Мои заказы</h2>
        {orders.error && <div className="error">{orders.error}</div>}
        {orders.data?.length === 0 && <p className="muted">Заказов пока нет</p>}
        {orders.data?.map((o) => (
          <div key={o.id} className="card">
            <div className="row">
              <strong>{o.restaurantName}</strong>
              <span className={`badge s-${o.status}`}>{STATUS_LABELS[o.status]}</span>
            </div>
            <div className="small">{o.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')}</div>
            <div className="row small muted">
              <span>{new Date(o.createdAt).toLocaleTimeString('ru-RU')} · {rub(o.total)}</span>
              {o.courier && <span>Курьер: {o.courier.name}</span>}
            </div>
            {o.status === 'CREATED' && (
              <button className="link" onClick={() => gql(CANCEL, { id: o.id }).then(orders.refresh, (e) => setMessage(e.message))}>
                Отменить
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
