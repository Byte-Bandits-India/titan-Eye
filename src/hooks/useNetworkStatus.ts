import * as React from 'react';
import { APP_CONFIG } from '../constants';
import type { NetworkStatus } from '../types';

export function useNetworkStatus(
  fallbackSpeed: string = '25',
  fallbackStatus: string = 'EXCELLENT',
): NetworkStatus {
  const [speed, setSpeed] = React.useState(fallbackSpeed);
  const [statusLabel, setStatusLabel] = React.useState(fallbackStatus);
  const [statusColor, setStatusColor] = React.useState('bg-emerald-500 text-white');
  const [wifiIconColor, setWifiIconColor] = React.useState('text-emerald-500');

  React.useEffect(() => {
    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const runSpeedTest = async () => {
      if (!navigator.onLine) {
        if (active) {
          setSpeed('999');
          setStatusLabel('OFFLINE');
          setStatusColor('bg-red-500 text-white animate-pulse');
          setWifiIconColor('text-red-500');
        }
        timeoutId = setTimeout(runSpeedTest, 1000);
        return;
      }

      try {
        const startTime = performance.now();
        const response = await fetch('/api/ping?t=' + Date.now(), { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to ping');

        const endTime = performance.now();
        const latencyMs = Math.max(1, endTime - startTime);

        let speedInMbps = 600 / (latencyMs + 2);
        if (speedInMbps > 150) speedInMbps = 150;

        if (active) {
          setSpeed(speedInMbps.toFixed(1));

          if (speedInMbps < 2.0) {
            setStatusLabel('LOW');
            setStatusColor('bg-yellow-400 text-yellow-900');
            setWifiIconColor('text-orange-400');
          } else if (speedInMbps < 12.0) {
            setStatusLabel('GOOD');
            setStatusColor('bg-blue-500 text-white');
            setWifiIconColor('text-blue-500');
          } else {
            setStatusLabel('EXCELLENT');
            setStatusColor('bg-emerald-500 text-white');
            setWifiIconColor('text-emerald-500');
          }
        }
      } catch {
        if (active) {
          if (!navigator.onLine) {
            setSpeed('0.0');
            setStatusLabel('OFFLINE');
            setStatusColor('bg-red-500 text-white animate-pulse');
            setWifiIconColor('text-red-500');
          } else {
            setSpeed(fallbackSpeed);
            setStatusLabel(fallbackStatus);
            setStatusColor('bg-emerald-500 text-white');
            setWifiIconColor('text-emerald-500');
          }
        }
      }

      if (active) {
        timeoutId = setTimeout(runSpeedTest, APP_CONFIG.NETWORK_POLL_INTERVAL_MS);
      }
    };

    const handleOnlineStatus = () => {
      if (timeoutId) clearTimeout(timeoutId);
      void runSpeedTest();
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    void runSpeedTest();

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, [fallbackSpeed, fallbackStatus]);

  return { speed, statusLabel, statusColor, wifiIconColor };
}
