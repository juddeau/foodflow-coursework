import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { buildSchema, getNamedType, GraphQLError } from 'graphql';
import jwt from 'jsonwebtoken';
import { typeDefs } from './schema.js';

const PORT = Number(process.env.PORT ?? 4000);
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';
const urls = {
  users: process.env.USERS_URL ?? 'http://localhost:4001/graphql',
  restaurants: process.env.RESTAURANTS_URL ?? 'http://localhost:4002/graphql',
  orders: process.env.ORDERS_URL ?? 'http://localhost:4003/graphql',
  delivery: process.env.DELIVERY_URL ?? 'http://localhost:4004/graphql',
};
type Service = keyof typeof urls;
interface Context { user: { id: string; role: string } | null }
type RecordValue = Record<string, any>;
function authenticate(header?: string): Context['user'] {
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const p = jwt.verify(header.slice(7), JWT_SECRET) as { sub: string; role: string };
    return { id: p.sub, role: p.role };
  } catch { return null; }
}
const selections: Record<string, string> = {
  User: 'id email name phone role',
  AuthPayload: 'token user { id email name phone role }',
  Restaurant: 'id name description address cuisine isOpen avgCookingMinutes owner { id }',
  MenuItem: 'id name description category price available restaurant { id }',
  Order: 'id customer { id } restaurant { id } restaurantName items { menuItemId name price quantity } subtotal deliveryFee total address comment status statusHistory { status at } courier { id } createdAt',
  Delivery: 'id order { id } restaurantName pickupAddress dropoffAddress status courier { id } assignedAt pickedUpAt deliveredAt',
};
const schema = buildSchema(typeDefs);
async function request(service: Service, query: string, variables: RecordValue, ctx: Context): Promise<RecordValue> {
  let response: Response;
  try {
    response = await fetch(urls[service], {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(ctx.user ? { 'x-user-id': ctx.user.id, 'x-user-role': ctx.user.role } : {}) },
      body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(5000),
    });
  } catch { throw new GraphQLError(`Сервис ${service} недоступен`, { extensions: { code: 'SERVICE_UNAVAILABLE' } }); }
  const body = await response.json() as { data?: RecordValue; errors?: { message: string; extensions?: RecordValue }[] };
  if (body.errors?.length) throw new GraphQLError(body.errors[0].message, { extensions: body.errors[0].extensions });
  if (!response.ok || !body.data) throw new GraphQLError(`Ошибка сервиса ${service}`);
  return body.data;
}
async function delegate(service: Service, operation: 'query' | 'mutation', field: string, args: RecordValue, ctx: Context) {
  const root = operation === 'query' ? schema.getQueryType()! : schema.getMutationType()!;
  const def = root.getFields()[field];
  const defs = def.args.filter(a => Object.hasOwn(args, a.name));
  const vars = defs.map(a => `$${a.name}: ${a.type}`).join(', ');
  const params = defs.map(a => `${a.name}: $${a.name}`).join(', ');
  const type = getNamedType(def.type).name;
  const query = `${operation}${vars ? `(${vars})` : ''} { ${field}${params ? `(${params})` : ''} { ${selections[type]} } }`;
  return (await request(service, query, args, ctx))[field];
}
const routes: Record<Service, string[]> = {
  users: ['me', 'register', 'login'],
  restaurants: ['restaurants', 'restaurant', 'myRestaurant', 'menuItemsByIds', 'addMenuItem', 'updateMenuItem', 'setRestaurantOpen'],
  orders: ['order', 'myOrders', 'restaurantOrders', 'placeOrder', 'cancelOrder', 'updateOrderStatus'],
  delivery: ['availableDeliveries', 'myDeliveries', 'acceptDelivery', 'pickUpDelivery', 'completeDelivery'],
};
const Query: Record<string, any> = {}, Mutation: Record<string, any> = {};
for (const [service, fields] of Object.entries(routes)) for (const field of fields) {
  const op = schema.getQueryType()!.getFields()[field] ? 'query' : 'mutation';
  (op === 'query' ? Query : Mutation)[field] = (_: unknown, args: RecordValue, ctx: Context) => delegate(service as Service, op, field, args, ctx);
}
async function user(ref: RecordValue | null, ctx: Context) {
  if (!ref) return null;
  return (await request('users', `query($id:ID!){user(id:$id){${selections.User}}}`, { id: ref.id }, ctx)).user;
}
const resolvers = {
  Query, Mutation,
  Restaurant: {
    owner: (p: RecordValue, _: unknown, ctx: Context) => user(p.owner, ctx),
    menu: async (p: RecordValue, args: RecordValue, ctx: Context) => (await request('restaurants',
      `query($id:ID!,$available:Boolean){restaurant(id:$id){menu(onlyAvailable:$available){${selections.MenuItem}}}}`,
      { id: p.id, available: args.onlyAvailable ?? false }, ctx)).restaurant.menu,
  },
  MenuItem: { restaurant: (p: RecordValue, _: unknown, ctx: Context) => delegate('restaurants', 'query', 'restaurant', { id: p.restaurant.id }, ctx) },
  Order: {
    customer: (p: RecordValue, _: unknown, ctx: Context) => user(p.customer, ctx),
    courier: (p: RecordValue, _: unknown, ctx: Context) => user(p.courier, ctx),
    restaurant: (p: RecordValue, _: unknown, ctx: Context) => delegate('restaurants', 'query', 'restaurant', { id: p.restaurant.id }, ctx),
    delivery: async (p: RecordValue, _: unknown, ctx: Context) => (await request('delivery',
      `query($id:ID!){deliveryByOrder(orderId:$id){${selections.Delivery}}}`, { id: p.id }, ctx)).deliveryByOrder,
  },
  Delivery: {
    courier: (p: RecordValue, _: unknown, ctx: Context) => user(p.courier, ctx),
    order: async (p: RecordValue, _: unknown, ctx: Context) => (await request('orders',
      `query($id:ID!){deliveryOrder(id:$id){${selections.Order}}}`, { id: p.order.id }, ctx)).deliveryOrder,
  },
};
const server = new ApolloServer<Context>({ typeDefs, resolvers, introspection: true,
  plugins: [ApolloServerPluginLandingPageLocalDefault({ embed: true })] });
const { url } = await startStandaloneServer(server, { listen: { port: PORT },
  context: async ({ req }) => ({ user: authenticate(req.headers.authorization) }) });
console.log(`API Gateway запущен: ${url}`);
