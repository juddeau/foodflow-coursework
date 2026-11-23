import { GraphQLError } from 'graphql';

export type Role = 'CUSTOMER' | 'RESTAURANT' | 'COURIER';

export interface AuthUser {
  id: string;
  role: Role;
}

export interface Context {
  user: AuthUser | null;
}

// Шлюз проверяет JWT и передаёт данные пользователя в заголовках.
// Сервисы доступны только во внутренней сети, поэтому заголовкам можно доверять.
export function buildContext(headers: Record<string, string | string[] | undefined>): Context {
  const id = headers['x-user-id'];
  const role = headers['x-user-role'];
  if (typeof id === 'string' && typeof role === 'string' && id && role) {
    return { user: { id, role: role as Role } };
  }
  return { user: null };
}

export function requireUser(ctx: Context, ...roles: Role[]): AuthUser {
  if (!ctx.user) {
    throw new GraphQLError('Требуется авторизация', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  if (roles.length > 0 && !roles.includes(ctx.user.role)) {
    throw new GraphQLError('Недостаточно прав', { extensions: { code: 'FORBIDDEN' } });
  }
  return ctx.user;
}
