import * as React from 'react';

import type { CallTimerProps } from '../../types';

const INITIAL_ELAPSED = '00:00:00';

export function CallTimer({ active, maxDurationSeconds = 3540, onTimeout, startTime }: CallTimerProps) {
  const [elapsed, setElapsed] = React.useState(INITIAL_ELAPSED);
  const hasTimedOut = React.useRef(false);

  React.useEffect(() => {
    if (active && startTime) {
      hasTimedOut.current = false;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setElapsed(INITIAL_ELAPSED);
    }
  }, [startTime, active]);

  React.useEffect(() => {
    if (!active || !startTime) {
      if (!hasTimedOut.current) {
        setElapsed(INITIAL_ELAPSED);
      }

      return;
    }

    let startMs = parseInt(startTime, 10);

    if (isNaN(startMs) || String(startMs).length < 10) {
      startMs = new Date(startTime).getTime();
    }

    if (isNaN(startMs)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setElapsed(INITIAL_ELAPSED);

      return;
    }

    const updateTimer = () => {
      const diffMs = Date.now() - startMs;

      if (diffMs < 0) {
        setElapsed(INITIAL_ELAPSED);

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

  return <span className="whitespace-nowrap text-sm font-normal text-gray-700">{elapsed}</span>;
}

function formatSeconds(secs: number): string {
  const hours = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  const s = secs % 60;

  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
