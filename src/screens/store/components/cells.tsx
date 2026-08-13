/* eslint-disable react-refresh/only-export-components */
import * as React from 'react';
import { useCountUp } from 'react-countup';

import type { Customer } from '../../../types';

import { CallTimer } from '../../../components/ui/CallTimer';
import { formatDurationLong, formatSeconds, parseTimestamp } from './formatters';

export function MetricCountUp({ className, value }: { className?: string; value: number }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  useCountUp({ duration: 1, end: value, ref: ref as React.RefObject<HTMLElement> });

  return <span className={className} ref={ref} />;
}

export function renderCallDuration(cust: Customer) {
  const optomCallStartTime = cust.optomCallStartTime;

  if (cust.callActive && optomCallStartTime) {
    const startMs = parseTimestamp(cust.callStartTime);
    const optomMs = parseTimestamp(optomCallStartTime);
    const waitSecs = startMs > 0 && optomMs >= startMs ? Math.floor((optomMs - startMs) / 1000) : 0;
    const maxCallSecs = Math.max(0, 3540 - waitSecs);

    return <CallTimer active={true} maxDurationSeconds={maxCallSecs} startTime={optomCallStartTime} />;
  }

  if (cust.callDuration && cust.callDuration > 0) {
    return <span className="font-mono font-bold text-foreground">{formatSeconds(cust.callDuration)}</span>;
  }

  return <span className="text-muted-foreground">—</span>;
}

const MAX_WAITING_MS = 59 * 60 * 1000;

export function renderWaitingDuration(cust: Customer, now: number) {
  const startMs = parseTimestamp(cust.createdOn);

  if (!startMs) {
    return <span className="text-muted-foreground">—</span>;
  }

  const endMs = cust.optomCallStartTime ? parseTimestamp(cust.optomCallStartTime) || now : now;
  const elapsedMs = Math.min(endMs - startMs, MAX_WAITING_MS);

  return <span className="font-mono text-xs text-foreground">{formatDurationLong(elapsedMs)}</span>;
}

export function WaitingCell({ cust }: { cust: Customer }) {
  const [now, setNow] = React.useState<number>(() => Date.now());

  React.useEffect(() => {
    if (cust.optomCallStartTime) {
      return;
    }

    const timer = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(timer);
  }, [cust.optomCallStartTime]);

  return renderWaitingDuration(cust, now);
}
