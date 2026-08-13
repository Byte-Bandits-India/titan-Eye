/* eslint-disable react-refresh/only-export-components */
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';

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
        // Deduplicate: skip if the same title+description is already visible
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
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-md flex-col gap-2">
      {toasts.map((t) => (
        <div
          className={cn(
            'pointer-events-auto flex translate-y-0 transform gap-3 rounded-xl border p-4 shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-5',
            t.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/90 dark:text-emerald-300'
              : t.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/90 dark:text-rose-300'
                : 'border-gray-200 bg-white text-gray-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200'
          )}
          key={t.id}
        >
          <div className="mt-0.5 flex-shrink-0">
            {t.type === 'success' && (
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            )}
            {t.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />}
            {t.type === 'info' && <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
          </div>
          <div className="flex-grow">
            {t.title && <div className="mb-0.5 text-sm font-semibold">{t.title}</div>}
            <div className="text-xs opacity-90">{t.description}</div>
          </div>
          <button
            className="h-4 w-4 flex-shrink-0 text-gray-400 transition-colors hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            onClick={() => dismiss(t.id)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
