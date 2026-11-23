import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';
import { buildContext } from './context.js';
import { connectDb } from './db.js';
import { seedDemoData } from './services/restaurant.service.js';

const PORT = Number(process.env.PORT ?? 4000);
const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/restaurants_db';

await connectDb(MONGO_URI);
await seedDemoData();

const server = new ApolloServer({
  typeDefs, resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: PORT },
  context: async ({ req }) => buildContext(req.headers),
});
console.log(`restaurants-service запущен: ${url}`);
