import * as React from 'react';

export type LogNotificationType =
  | 'optom_available'
  | 'patient_registered'
  | 'call_initiated'
  | 'call_ended'
  | 'call_closed'
  | 'assessment_complete'
  | 'assessment_accepted'
  | 'no_optom_available';

export interface LogNotification {
  id: string;
  title: string;
  description: string;
  type: LogNotificationType;
  timestamp: number;
  customerId?: string;
}

type NotificationLogContextType = {
  logNotifications: LogNotification[];
  addLogNotification: (notification: Omit<LogNotification, 'id' | 'timestamp'>) => void;
  dismissLogNotification: (id: string) => void;
};

const NotificationLogContext = React.createContext<NotificationLogContextType | undefined>(undefined);

export function NotificationLogProvider({ children }: { children: React.ReactNode }) {
  const [logNotifications, setLogNotifications] = React.useState<LogNotification[]>([]);

  const addLogNotification = React.useCallback(
    (notification: Omit<LogNotification, 'id' | 'timestamp'>) => {
      setLogNotifications((prev) => {
        // Deduplicate: skip if the same title+description is still sitting undismissed
        const isDuplicate = prev.some(
          (n) => n.title === notification.title && n.description === notification.description
        );
        if (isDuplicate) return prev;

        const id = Math.random().toString(36).substring(2, 9);
        return [{ ...notification, id, timestamp: Date.now() }, ...prev];
      });
    },
    []
  );

  const dismissLogNotification = React.useCallback((id: string) => {
    setLogNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationLogContext.Provider value={{ logNotifications, addLogNotification, dismissLogNotification }}>
      {children}
    </NotificationLogContext.Provider>
  );
}

export function useNotificationLog() {
  const context = React.useContext(NotificationLogContext);
  if (!context) {
    throw new Error('useNotificationLog must be used within a NotificationLogProvider');
  }
  return context;
}
