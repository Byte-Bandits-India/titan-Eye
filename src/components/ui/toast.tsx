/* eslint-disable react-refresh/only-export-components */
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import * as React from 'react';

export interface ToastMessage {
  description: string;
  duration?: number;
  id: string;
  title?: string;
  type?: ToastType;
}

export type ToastType = 'error' | 'info' | 'success';

type ToastContextType = {
  dismiss: (id: string) => void;
  toast: (message: Omit<ToastMessage, 'id'>) => void;
  toasts: ToastMessage[];
};

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const toast = React.useCallback(
    ({ description, duration = 5000, title, type = 'info' }: Omit<ToastMessage, 'id'>) => {
      setToasts((prev) => {
        const isDuplicate = prev.some((t) => t.title === title && t.description === description);

        if (isDuplicate) {
          return prev;
        }

        const id = Math.random().toString(36).substring(2, 9);

        if (duration > 0) {
          setTimeout(() => {
            setToasts((p) => p.filter((t) => t.id !== id));
          }, duration);
        }

        return [...prev, { description, duration, id, title, type }];
      });
    },
    []
  );

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ dismiss, toast, toasts }}>
      {children}
      <Toaster dismiss={dismiss} toasts={toasts} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}

function Toaster({ dismiss, toasts }: { dismiss: (id: string) => void; toasts: ToastMessage[] }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-[22rem] flex-col gap-3">
      {toasts.map((t) => (
        <div
          className="pointer-events-auto w-full overflow-hidden rounded-xl shadow-lg duration-200 animate-in fade-in slide-in-from-top-5"
          key={t.id}
          style={{ backgroundColor: '#4F59C9' }}
        >
          <div className="flex items-start gap-4 p-5">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: '#F3D4FE', color: '#9035B8' }}
            >
              {t.type === 'success' && <CheckCircle className="h-5 w-5" />}
              {t.type === 'error' && <AlertCircle className="h-5 w-5" />}
              {t.type === 'info' && <Info className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              {t.title && <p className="truncate text-base font-bold text-white">{t.title}</p>}
              <p className="mt-1.5 text-sm font-medium text-white/90">{t.description}</p>
            </div>
            <button
              className="shrink-0 cursor-pointer rounded-lg p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              onClick={() => dismiss(t.id)}
              title="Close"
              type="button"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
