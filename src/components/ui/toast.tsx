import * as React from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  title?: string;
  description: string;
  type?: ToastType;
  duration?: number;
}

type ToastContextType = {
  toast: (message: Omit<ToastMessage, 'id'>) => void;
  dismiss: (id: string) => void;
  toasts: ToastMessage[];
};

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const toast = React.useCallback(
    ({ title, description, type = 'info', duration = 3000 }: Omit<ToastMessage, 'id'>) => {
      setToasts((prev) => {
        // Deduplicate: skip if the same title+description is already visible
        const isDuplicate = prev.some(
          (t) => t.title === title && t.description === description
        );
        if (isDuplicate) return prev;

        const id = Math.random().toString(36).substring(2, 9);
        if (duration > 0) {
          setTimeout(() => {
            setToasts((p) => p.filter((t) => t.id !== id));
          }, duration);
        }
        return [...prev, { id, title, description, type, duration }];
      });
    },
    []
  );

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss, toasts }}>
      {children}
      <Toaster toasts={toasts} dismiss={dismiss} />
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

function Toaster({
  toasts,
  dismiss,
}: {
  toasts: ToastMessage[];
  dismiss: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex gap-3 p-4 rounded-xl border shadow-lg pointer-events-auto transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-bottom-5',
            t.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/90 dark:border-emerald-900/50 dark:text-emerald-300'
              : t.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/90 dark:border-rose-900/50 dark:text-rose-300'
                : 'bg-white border-gray-200 text-gray-800 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-200'
          )}
        >
          <div className="flex-shrink-0 mt-0.5">
            {t.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          </div>
          <div className="flex-grow">
            {t.title && <div className="font-semibold text-sm mb-0.5">{t.title}</div>}
            <div className="text-xs opacity-90">{t.description}</div>
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="flex-shrink-0 h-4 w-4 text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
