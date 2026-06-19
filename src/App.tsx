import * as React from 'react';
import { ToastProvider } from './components/ui/toast';
import { LoginScreen } from './components/LoginScreen';
import { StoreScreen } from './components/StoreScreen';
import { OptemScreen } from './components/OptemScreen';
import { initialCustomers } from './data/mockData';
import { User, Customer } from './types';

export default function App() {
  const [user, setUser] = React.useState<User | null>(() => {
    // Optional: Load session from localStorage for persistence
    const saved = localStorage.getItem('titan_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [customers, setCustomers] = React.useState<Customer[]>(() => {
    const saved = localStorage.getItem('titan_customers');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return initialCustomers;
      }
    }
    return initialCustomers;
  });

  // Save session and customers
  React.useEffect(() => {
    if (user) {
      localStorage.setItem('titan_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('titan_user');
    }
  }, [user]);

  React.useEffect(() => {
    localStorage.setItem('titan_customers', JSON.stringify(customers));
  }, [customers]);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col font-sans select-none antialiased">
        {!user ? (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        ) : user.role === 'store' ? (
          <StoreScreen
            user={user}
            onLogout={handleLogout}
            customers={customers}
            setCustomers={setCustomers}
          />
        ) : (
          <OptemScreen
            user={user}
            onLogout={handleLogout}
            customers={customers}
            setCustomers={setCustomers}
          />
        )}
      </div>
    </ToastProvider>
  );
}
