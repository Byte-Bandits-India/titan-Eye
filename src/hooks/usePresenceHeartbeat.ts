import * as React from 'react';

import { APP_CONFIG, API_BASE_URL } from '../options/Option';
import { useAppSelector } from '../store';
import { apiClient } from '../Util/apiClient';

/**
 * Keeps the current user's online status alive by pinging the server while the app is open,
 * and tells the server to mark the user offline immediately when the tab/app is actually closed.
 * The server treats a user as offline once pings stop arriving, so this is the sole source of
 * "online" for presence display elsewhere in the app.
 */
export function usePresenceHeartbeat(): void {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  React.useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const sendPing = () => {
      apiClient.post('/users/ping').catch(() => undefined);
    };

    sendPing();
    const intervalId = window.setInterval(sendPing, APP_CONFIG.PRESENCE_PING_INTERVAL_MS);

    const sendOffline = () => {
      navigator.sendBeacon(`${API_BASE_URL}/users/offline`);
    };

    window.addEventListener('pagehide', sendOffline);
    window.addEventListener('beforeunload', sendOffline);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('pagehide', sendOffline);
      window.removeEventListener('beforeunload', sendOffline);
    };
  }, [isAuthenticated]);
}
