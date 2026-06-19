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
        const parsed: Customer[] = JSON.parse(saved);
        // Merge saved records with initialCustomers defaults so that new
        // fields added to mockData.ts are backfilled into old saved records
        const defaultsMap = Object.fromEntries(initialCustomers.map((c) => [c.id, c]));
        return parsed.map((c) => ({ ...defaultsMap[c.id], ...c }));
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
