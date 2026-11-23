import { useState } from 'react';
import { loadSession, saveSession, Session } from './api';
import { Login } from './views/Login';
import { CustomerView } from './views/CustomerView';
import { RestaurantView } from './views/RestaurantView';
import { CourierView } from './views/CourierView';

const ROLE_TITLES = { CUSTOMER: 'Клиент', RESTAURANT: 'Ресторан', COURIER: 'Курьер' };

export function App() {
  const [session, setSession] = useState<Session | null>(loadSession());

  const logout = () => {
    saveSession(null);
    setSession(null);
  };

  if (!session) {
    return (
      <Login
        onLogin={(s) => {
          saveSession(s);
          setSession(s);
        }}
      />
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="logo">FoodFlow</span>
        <span className="who">
          {session.user.name} · {ROLE_TITLES[session.user.role]}
        </span>
        <button className="link" onClick={logout}>
          Выйти
        </button>
      </header>
      <main>
        {session.user.role === 'CUSTOMER' && <CustomerView />}
        {session.user.role === 'RESTAURANT' && <RestaurantView />}
        {session.user.role === 'COURIER' && <CourierView />}
      </main>
    </div>
  );
}
