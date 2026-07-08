import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { routes } from './Routes';
import { ToastProvider } from './components/ui/toast';
import { useSSE } from './hooks/useSSE';

function SSEBridge() {
  useSSE();
  return null;
}

const theme: 'light' | 'dark' = 'light';

const router = createBrowserRouter(routes);

export default function App() {
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  return (
    <Provider store={store}>
      <ToastProvider>
        <SSEBridge />
        <div className="min-h-screen flex flex-col font-sans select-none antialiased">
          <RouterProvider router={router} />
        </div>
      </ToastProvider>
    </Provider>
  );
}

