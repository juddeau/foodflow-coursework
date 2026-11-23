import { FormEvent, useState } from 'react';
import { gql, Session } from '../api';

const DEMO = [
  { email: 'client@demo.ru', label: 'Клиент' },
  { email: 'pizza@demo.ru', label: 'Пиццерия' },
  { email: 'sushi@demo.ru', label: 'Суши-бар' },
  { email: 'courier@demo.ru', label: 'Курьер' },
];

const LOGIN = `mutation ($email: String!, $password: String!) {
  login(email: $email, password: $password) { token user { id name role } }
}`;

export function Login({ onLogin }: { onLogin: (s: Session) => void }) {
  const [email, setEmail] = useState('client@demo.ru');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e?: FormEvent, override?: string) => {
    e?.preventDefault();
    try {
      const data = await gql<{ login: Session }>(LOGIN, { email: override ?? email, password });
      onLogin(data.login);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="login">
      <h1>FoodFlow</h1>
      <p className="muted">Заказ и доставка еды из ресторанов</p>
      <form onSubmit={submit} className="card">
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Пароль
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <div className="error">{error}</div>}
        <button type="submit">Войти</button>
      </form>
      <div className="demo">
        <span className="muted">Демо-входы (пароль demo123):</span>
        {DEMO.map((d) => (
          <button key={d.email} className="secondary" onClick={() => submit(undefined, d.email)}>
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}
