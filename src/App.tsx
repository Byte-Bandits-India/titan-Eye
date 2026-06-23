import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { routes } from './Routes';
import { ToastProvider } from './components/ui/toast';

const router = createBrowserRouter(routes);

export default function App() {
  return (
    <Provider store={store}>
      <ToastProvider>
        <div className="min-h-screen flex flex-col font-sans select-none antialiased">
          <RouterProvider router={router} />
        </div>
      </ToastProvider>
    </Provider>
  );
}
