import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';
import { buildContext } from './context.js';
import { connectDb } from './db.js';
import { connectBus, subscribe, SUBJECTS, OrderReadyEvent } from './events.js';
import { createFromOrder } from './services/delivery.service.js';

const PORT = Number(process.env.PORT ?? 4000);
const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/delivery_db';
const NATS_URL = process.env.NATS_URL ?? 'nats://localhost:4222';

await connectDb(MONGO_URI);
await connectBus(NATS_URL);
subscribe<OrderReadyEvent>(SUBJECTS.ORDER_READY, "delivery-service", createFromOrder);

const server = new ApolloServer({
  typeDefs, resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: PORT },
  context: async ({ req }) => buildContext(req.headers),
});
console.log(`delivery-service запущен: ${url}`);
