// Синхронный запрос к restaurants-service по внутренней сети.
// Цены берём с сервера, а не от клиента, чтобы их нельзя было подменить.
const RESTAURANTS_URL = process.env.RESTAURANTS_URL ?? 'http://localhost:4002/graphql';

export interface RestaurantInfo {
  id: string;
  name: string;
  address: string;
  isOpen: boolean;
  owner: { id: string };
}

export interface MenuItemInfo {
  id: string;
  name: string;
  price: number;
  available: boolean;
  restaurant: { id: string };
}

async function query<T>(q: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(RESTAURANTS_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'apollo-require-preflight': 'true' },
    body: JSON.stringify({ query: q, variables }),
    signal: AbortSignal.timeout(3000),
  });
  const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (body.errors?.length || !body.data) {
    throw new Error(`restaurants-service: ${body.errors?.[0]?.message ?? res.statusText}`);
  }
  return body.data;
}

export async function fetchRestaurantWithItems(restaurantId: string, itemIds: string[]) {
  const data = await query<{ restaurant: RestaurantInfo | null; menuItemsByIds: MenuItemInfo[] }>(
    `query ($id: ID!, $ids: [ID!]!) {
      restaurant(id: $id) { id name address isOpen owner { id } }
      menuItemsByIds(ids: $ids) { id name price available restaurant { id } }
    }`,
    { id: restaurantId, ids: itemIds },
  );
  return { restaurant: data.restaurant, items: data.menuItemsByIds };
}
