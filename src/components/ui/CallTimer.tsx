import * as React from 'react';

import type { CallTimerProps } from '../../types';

export function CallTimer({ active, maxDurationSeconds = 3540, onTimeout, startTime }: CallTimerProps) {
  const [elapsed, setElapsed] = React.useState('00m:00s');
  const hasTimedOut = React.useRef(false);

  React.useEffect(() => {
    if (active && startTime) {
      hasTimedOut.current = false;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setElapsed('00m:00s');
    }
  }, [startTime, active]);

  React.useEffect(() => {
    if (!active || !startTime) {
      if (!hasTimedOut.current) {
        setElapsed('00m:00s');
      }

      return;
    }

    let startMs = parseInt(startTime, 10);

    if (isNaN(startMs) || String(startMs).length < 10) {
      startMs = new Date(startTime).getTime();
    }

    if (isNaN(startMs)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setElapsed('00m:00s');

      return;
    }

    const updateTimer = () => {
      const diffMs = Date.now() - startMs;

      if (diffMs < 0) {
        setElapsed('00m:00s');

        return;
      }

      const cappedMax = Math.min(maxDurationSeconds, 3540);
      const diffSecs = Math.floor(diffMs / 1000);

      if (diffSecs >= cappedMax) {
        setElapsed(formatSeconds(cappedMax));

        if (onTimeout && !hasTimedOut.current) {
          hasTimedOut.current = true;
          onTimeout();
        }

        return;
      }

      setElapsed(formatSeconds(Math.min(diffSecs, cappedMax)));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [startTime, active, maxDurationSeconds, onTimeout]);

  return <span className="whitespace-nowrap font-mono font-bold text-gray-700">{elapsed}</span>;
}

function formatSeconds(secs: number): string {
  const mins = Math.floor(secs / 60);
  const s = secs % 60;

  return `${String(mins).padStart(2, '0')}m:${String(s).padStart(2, '0')}s`;
}
