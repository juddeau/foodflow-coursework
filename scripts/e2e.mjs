// Сквозной тест всего сценария через API Gateway.
// Запуск: docker run --rm --network food-delivery_default -v "$PWD/scripts:/s" node:22-alpine node /s/e2e.mjs
const URL = process.env.GATEWAY_URL ?? 'http://gateway:4000/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gql(query, variables = {}, token) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors));
  return body.data;
}

const login = async (email) =>
  (await gql(`mutation($e:String!){ login(email:$e, password:"demo123"){ token user { name role } } }`, { e: email })).login;

function check(cond, msg) {
  if (!cond) throw new Error('ПРОВАЛ: ' + msg);
  console.log('OK  ' + msg);
}

const client = await login('client@demo.ru');
const pizza = await login('pizza@demo.ru');
const courier = await login('courier@demo.ru');
check(client.user.role === 'CUSTOMER', 'вход клиента, получен JWT');

const { restaurants } = await gql(`{ restaurants { id name menu { id name price } } }`);
const napoli = restaurants.find((r) => r.name.includes('Наполи'));
check(restaurants.length >= 2 && napoli.menu.length > 0, `рестораны и меню: ${restaurants.length} шт.`);

const [m1, m2] = napoli.menu;
const { placeOrder } = await gql(
  `mutation($i:PlaceOrderInput!){ placeOrder(input:$i){ id status subtotal deliveryFee total } }`,
  { i: { restaurantId: napoli.id, address: 'Москва, тестовый адрес, 1', items: [{ menuItemId: m1.id, quantity: 2 }, { menuItemId: m2.id, quantity: 1 }] } },
  client.token,
);
const expected = m1.price * 2 + m2.price;
check(placeOrder.status === 'CREATED' && placeOrder.subtotal === expected, `заказ создан, сумма блюд ${placeOrder.subtotal} ₽, итого ${placeOrder.total} ₽`);

let denied = false;
try { await gql(`mutation($id:ID!){ updateOrderStatus(id:$id, status:ACCEPTED){ id } }`, { id: placeOrder.id }, client.token); } catch { denied = true; }
check(denied, 'клиент не может принять заказ за ресторан');

await gql(`mutation($id:ID!){ updateOrderStatus(id:$id, status:ACCEPTED){ id } }`, { id: placeOrder.id }, pizza.token);
await gql(`mutation($id:ID!){ updateOrderStatus(id:$id, status:READY){ id } }`, { id: placeOrder.id }, pizza.token);
check(true, 'ресторан принял заказ и отметил готовым');

let delivery;
for (let i = 0; i < 20 && !delivery; i++) {
  await sleep(500);
  const d = await gql(`{ availableDeliveries { id order { id } } }`, {}, courier.token);
  delivery = d.availableDeliveries.find((x) => x.order.id === placeOrder.id);
}
check(delivery, 'событие order.ready дошло, у курьера появилось задание');

// Точный набор вложенных полей, который запрашивает CourierView до назначения.
const screen = await gql(`{ availableDeliveries { id restaurantName pickupAddress dropoffAddress status order { total items { name quantity } } } myDeliveries { id restaurantName pickupAddress dropoffAddress status order { total items { name quantity } } } }`, {}, courier.token);
const card = screen.availableDeliveries.find((d) => d.id === delivery.id);
check(card?.order.items.length > 0 && card.order.total === placeOrder.total, 'экран курьера видит состав и сумму свободного заказа');


for (const m of ['acceptDelivery', 'pickUpDelivery', 'completeDelivery']) {
  await gql(`mutation($id:ID!){ ${m}(id:$id){ status } }`, { id: delivery.id }, courier.token);
}
check(true, 'курьер взял, забрал и доставил заказ');

let order;
for (let i = 0; i < 20; i++) {
  await sleep(500);
  order = (await gql(`query($id:ID!){ order(id:$id){ status courier { name } delivery { status } statusHistory { status } } }`, { id: placeOrder.id }, client.token)).order;
  if (order.status === 'DELIVERED') break;
}
check(order.status === 'DELIVERED', 'событие delivery.status дошло, заказ DELIVERED');
check(order.courier?.name && order.delivery?.status === 'DELIVERED', `проверка данных: курьер «${order.courier?.name}», доставка ${order.delivery?.status}`);
console.log('История статусов: ' + order.statusHistory.map((h) => h.status).join(' -> '));
console.log('\nВСЕ ПРОВЕРКИ ПРОЙДЕНЫ');
