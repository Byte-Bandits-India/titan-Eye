import * as React from 'react';
import { ToastProvider, useToast } from './components/ui/toast';
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

  const handleLogout = React.useCallback(() => {
    setUser(null);
  }, []);

  // Fetch customers from SQLite backend
  const fetchCustomers = React.useCallback(async () => {
    if (!user || !user.token) return;
    try {
      const response = await fetch(`${apiBaseUrl}/customers`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
        credentials: 'include',
      });
      if (response.status === 401) {
        handleLogout();
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      } else {
        console.error('Failed to fetch customers:', response.statusText);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  }, [apiBaseUrl, user, handleLogout]);

  // Fetch once when user logs in or mounts. SSE is used for real-time updates.
  React.useEffect(() => {
    if (!user) return;
    fetchCustomers();
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

  return (
    <ToastProvider>
      <SseListener apiBaseUrl={apiBaseUrl} user={user} customers={customers} setCustomers={setCustomers} />
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

interface SseListenerProps {
  apiBaseUrl: string;
  user: User | null;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

function SseListener({ apiBaseUrl, user, customers, setCustomers }: SseListenerProps) {
  const { toast } = useToast();
  const customersRef = React.useRef(customers);

  React.useEffect(() => {
    customersRef.current = customers;
  }, [customers]);

  React.useEffect(() => {
    if (!user || !user.token) return;

    const eventSource = new EventSource(`${apiBaseUrl}/events?token=${encodeURIComponent(user.token)}`);

    eventSource.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data);
        const currentCustomers = customersRef.current;
        
        if (type === 'CUSTOMER_CREATED') {
          if (currentCustomers.some((c) => c.id === data.id)) return;
          
          toast({
            title: 'Patient Registered',
            description: `Successfully added ${data.name} with ID ${data.id}.`,
            type: 'success',
          });
          setCustomers((prev) => [data, ...prev]);
        } else if (type === 'CUSTOMER_UPDATED') {
          const oldCust = currentCustomers.find((c) => c.id === data.id);
          
          if (data.callActive && (!oldCust || !oldCust.callActive)) {
            toast({
              title: 'Call Initiated',
              description: `Call initiated by ${data.storeName} for ${data.name}.`,
              type: 'info',
            });
          } else if (!data.callActive && oldCust && oldCust.callActive) {
            toast({
              title: 'Call Ended',
              description: `Call session ended for ${data.name} (ID: ${data.id}).`,
              type: 'info',
            });
          } else if (data.status === 'Completed' && (!oldCust || oldCust.status !== 'Completed')) {
            toast({
              title: 'Assessment Complete',
              description: `Clinical assessment submitted for ${data.name} (ID: ${data.id}).`,
              type: 'success',
            });
          } else if (data.status === 'Accepted' && oldCust && oldCust.status === 'Initiated' && !data.callActive) {
            toast({
              title: 'Assessment Accepted',
              description: `Patient assessment status updated to Accepted.`,
              type: 'success',
            });
          }

          setCustomers((prev) => prev.map((c) => (c.id === data.id ? data : c)));
        }
      } catch (err) {
        console.error('Error handling SSE message:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
    };

    return () => {
      eventSource.close();
    };
  }, [apiBaseUrl, user, toast, setCustomers]);

  return null;
}
