import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { GraphQLError } from 'graphql';
import { User } from '../models/user.js';
import type { Role } from '../context.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';
const TOKEN_TTL = '12h';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: Role;
}

export function signToken(id: string, role: Role): string {
  return jwt.sign({ sub: id, role }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export async function register(input: RegisterInput) {
  if (input.password.length < 6) {
    throw new GraphQLError('Пароль должен быть не короче 6 символов', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const exists = await User.exists({ email: input.email.toLowerCase() });
  if (exists) {
    throw new GraphQLError('Пользователь с таким email уже есть', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const user = await User.create({
    email: input.email,
    name: input.name,
    phone: input.phone ?? '',
    role: input.role,
    passwordHash: await bcrypt.hash(input.password, 10),
  });
  return { token: signToken(user.id, input.role), user };
}

export async function login(email: string, password: string) {
  const user = await User.findOne({ email: email.toLowerCase() }).exec();
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new GraphQLError('Неверный email или пароль', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  return { token: signToken(user.id, user.role as Role), user };
}

// Демо-пользователи с фиксированными id: на них ссылаются данные других сервисов
export const DEMO_USERS = [
  { _id: '000000000000000000000001', email: 'client@demo.ru', name: 'Иван Клиентов', role: 'CUSTOMER' },
  { _id: '000000000000000000000002', email: 'pizza@demo.ru', name: 'Пиццерия «Наполи»', role: 'RESTAURANT' },
  { _id: '000000000000000000000004', email: 'sushi@demo.ru', name: 'Суши-бар «Васаби»', role: 'RESTAURANT' },
  { _id: '000000000000000000000003', email: 'courier@demo.ru', name: 'Пётр Курьеров', role: 'COURIER' },
] as const;

export async function seedDemoUsers(): Promise<void> {
  if ((await User.estimatedDocumentCount()) > 0) return;
  const passwordHash = await bcrypt.hash('demo123', 10);
  await User.insertMany(DEMO_USERS.map((u) => ({ ...u, passwordHash })));
  console.log('Созданы демо-пользователи (пароль demo123)');
}
