// Минимальный GraphQL-клиент: один POST на /graphql с JWT в заголовке
export interface Session {
  token: string;
  user: { id: string; name: string; role: 'CUSTOMER' | 'RESTAURANT' | 'COURIER' };
}

const KEY = 'foodflow.session';

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(s: Session | null): void {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* хранилище недоступно, сессия живёт до перезагрузки */
  }
}

export async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const session = loadSession();
  const res = await fetch('/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(session ? { authorization: `Bearer ${session.token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (body.errors?.length) throw new Error(body.errors[0].message);
  return body.data as T;
}

export const STATUS_LABELS: Record<string, string> = {
  CREATED: 'Новый',
  ACCEPTED: 'Готовится',
  READY: 'Ждёт курьера',
  PICKED_UP: 'В пути',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
  WAITING_COURIER: 'Свободен',
  ASSIGNED: 'Назначен мне',
};

export const rub = (n: number) => `${n.toLocaleString('ru-RU')} ₽`;
