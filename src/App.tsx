import * as React from 'react';
import { ToastProvider } from './components/ui/toast';
import { LoginScreen } from './components/LoginScreen';
import { StoreScreen } from './components/StoreScreen';
import { OptemScreen } from './components/OptemScreen';
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

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

  const [customers, setCustomers] = React.useState<Customer[]>([]);

  // Fetch customers from SQLite backend
  const fetchCustomers = React.useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/customers`);
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      } else {
        console.error('Failed to fetch customers:', response.statusText);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  }, [apiBaseUrl]);

  // Fetch whenever user logs in or mounts
  React.useEffect(() => {
    if (user) {
      fetchCustomers();
    }
  }, [user, fetchCustomers]);

  // Save user session only
  React.useEffect(() => {
    if (user) {
      localStorage.setItem('titan_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('titan_user');
    }
  }, [user]);

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
