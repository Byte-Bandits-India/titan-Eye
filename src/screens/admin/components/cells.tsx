import type { AuditLog, Customer } from '../../../types';

import { CallTimer } from '../../../components/ui/CallTimer';
import { formatSeconds, parseTimestamp } from './adminUtils';

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

export function renderTimeStarted(cust: AuditLog | Customer) {
  if (cust.status === 'Closed') {
    return <span className="font-mono font-bold text-foreground">59m:00s</span>;
  }

  const optomCallStartTime = cust.optomCallStartTime;
  const isWaitingForOptom = cust.status === 'Initiated' && !optomCallStartTime && cust.callActive;

  if (isWaitingForOptom && cust.callStartTime) {
    const startMs = parseTimestamp(cust.callStartTime);

    if (startMs > 0 && Date.now() - startMs >= 3540000) {
      return <span className="font-mono font-bold text-foreground">59m:00s</span>;
    }

    return <CallTimer active={true} maxDurationSeconds={3540} startTime={cust.callStartTime} />;
  }

  if (cust.callStartTime && optomCallStartTime) {
    const startMs = parseTimestamp(cust.callStartTime);
    const optomMs = parseTimestamp(optomCallStartTime);

    if (startMs > 0 && optomMs >= startMs) {
      const waitSecs = Math.floor((optomMs - startMs) / 1000);

      return (
        <span className="font-mono font-bold text-foreground">{formatSeconds(Math.min(waitSecs, 3540))}</span>
      );
    }
  }

  if (cust.callStartTime) {
    const startMs = parseTimestamp(cust.callStartTime);

    if (startMs > 0) {
      const endMs = parseTimestamp(cust.lastUpdatedOn) || Date.now();
      const waitSecs = endMs >= startMs ? Math.floor((endMs - startMs) / 1000) : 0;

      return (
        <span className="font-mono font-bold text-foreground">{formatSeconds(Math.min(waitSecs, 3540))}</span>
      );
    }
  }

  if (cust.callDuration && cust.callDuration > 0) {
    return <span className="font-mono font-bold text-foreground">{formatSeconds(cust.callDuration)}</span>;
  }

  return <span className="text-muted-foreground">—</span>;
}
