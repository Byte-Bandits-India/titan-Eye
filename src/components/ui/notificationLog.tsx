/* eslint-disable react-refresh/only-export-components */
import * as React from 'react';

import type { LogNotification } from '../../types';

type NotificationLogContextType = {
  addLogNotification: (notification: Omit<LogNotification, 'id' | 'timestamp'>) => void;
  dismissLogNotification: (id: string) => void;
  logNotifications: LogNotification[];
};

const NotificationLogContext = React.createContext<NotificationLogContextType | undefined>(undefined);

export function NotificationLogProvider({ children }: { children: React.ReactNode }) {
  const [logNotifications, setLogNotifications] = React.useState<LogNotification[]>([]);

  const addLogNotification = React.useCallback((notification: Omit<LogNotification, 'id' | 'timestamp'>) => {
    setLogNotifications((prev) => {
      const isDuplicate = prev.some(
        (n) => n.title === notification.title && n.description === notification.description
      );

      if (isDuplicate) {
        return prev;
      }

      const id = Math.random().toString(36).substring(2, 9);

      return [{ ...notification, id, timestamp: Date.now() }, ...prev];
    });
  }, []);

  const dismissLogNotification = React.useCallback((id: string) => {
    setLogNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationLogContext.Provider value={{ addLogNotification, dismissLogNotification, logNotifications }}>
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
