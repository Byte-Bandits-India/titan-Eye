import * as React from 'react';

export type BrowserNotificationPermission = 'default' | 'denied' | 'granted' | 'unsupported';

export function useBrowserNotifications() {
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  const [permission, setPermission] = React.useState<BrowserNotificationPermission>(() =>
    isSupported ? Notification.permission : 'unsupported'
  );

  const requestPermission = React.useCallback(async () => {
    if (!isSupported) {
      return 'unsupported' as const;
    }

    const result = await Notification.requestPermission();

    setPermission(result);

    return result;
  }, [isSupported]);

  const notify = React.useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!isSupported || Notification.permission !== 'granted') {
        return;
      }

      if (document.visibilityState === 'visible') {
        return;
      }

      try {
        new Notification(title, options);
      } catch {
        // Some browsers throw when constructing Notification directly; safe to ignore.
      }
    },
    [isSupported]
  );

  return { isSupported, notify, permission, requestPermission };
}
