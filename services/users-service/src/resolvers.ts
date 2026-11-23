import { User } from './models/user.js';
import * as auth from './services/auth.service.js';
import { Context, requireUser } from './context.js';

// Контроллеры (resolvers) только разбирают запрос и вызывают сервисный слой
export const resolvers = {
  Query: {
    user: (_: unknown, { id }: { id: string }) => User.findById(id).exec(),
    me: async (_: unknown, __: unknown, ctx: Context) => {
      const user = requireUser(ctx);
      return User.findById(user.id).exec();
    },
  },
  Mutation: {
    register: (_: unknown, { input }: { input: auth.RegisterInput }) => auth.register(input),
    login: (_: unknown, args: { email: string; password: string }) => auth.login(args.email, args.password),
  },
  User: {
  },
};
