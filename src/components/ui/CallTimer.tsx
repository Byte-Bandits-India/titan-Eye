import * as React from 'react';
import type { CallTimerProps } from '../../types';

export function CallTimer({ startTime, active }: CallTimerProps) {
  const [elapsed, setElapsed] = React.useState('00m:00s');

  React.useEffect(() => {
    if (!active || !startTime) {
      setElapsed('00m:00s');
      return;
    }

    let startMs = parseInt(startTime, 10);
    if (isNaN(startMs) || String(startMs).length < 10) {
      startMs = new Date(startTime).getTime();
    }

    if (isNaN(startMs)) {
      setElapsed('00m:00s');
      return;
    }

    const updateTimer = () => {
      const diffMs = Date.now() - startMs;
      if (diffMs < 0) {
        setElapsed('00m:00s');
        return;
      }
      const diffSecs = Math.floor(diffMs / 1000) % 3600;
      const minutes = Math.floor(diffSecs / 60);
      const seconds = diffSecs % 60;
      
      const formattedMin = String(minutes).padStart(2, '0');
      const formattedSec = String(seconds).padStart(2, '0');
      setElapsed(`${formattedMin}m:${formattedSec}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [startTime, active]);

  return (
    <span className="font-mono text-gray-700 font-bold whitespace-nowrap">
      {elapsed}
    </span>
  );
}
