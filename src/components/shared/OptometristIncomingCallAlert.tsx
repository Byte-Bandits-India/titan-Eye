import {
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  PhoneCall,
  ShieldAlert,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import * as React from 'react';

import { useAppSelector } from '../../store';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { CallTimer } from '../ui/CallTimer';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

interface OptometristIncomingCallAlertProps {
  onSelectCustomer?: (customerId: string) => void;
}

export function OptometristIncomingCallAlert({ onSelectCustomer }: OptometristIncomingCallAlertProps) {
  const user = useAppSelector((state) => state.auth.user);
  const customers = useAppSelector((state) => state.customers.customers);
  const users = useAppSelector((state) => state.users.users);

  const [isMuted, setIsMuted] = React.useState(false);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set());
  const audioContextRef = React.useRef<AudioContext | null>(null);

  const isTakenByOptometristUser = React.useCallback(
    (callTakenBy?: null | string) => {
      if (!callTakenBy) {
        return false;
      }

      const takenByLower = callTakenBy.toLowerCase();

      if (takenByLower.startsWith('dr.')) {
        return true;
      }

      return users.some(
        (u) =>
          u.role === 'optometrist' &&
          (u.name.toLowerCase() === takenByLower || u.email.toLowerCase() === takenByLower)
      );
    },
    [users]
  );

  const pendingCalls = React.useMemo(() => {
    if (!user || user.role !== 'optometrist') {
      return [];
    }

    const isOptometristUserInCall = customers.some((c) => {
      if (!c.callActive || !c.callTakenBy) {
        return false;
      }

      const takenByLower = c.callTakenBy.toLowerCase();

      return takenByLower === user.name.toLowerCase() || takenByLower === user.email.toLowerCase();
    });

    if (isOptometristUserInCall) {
      return [];
    }

    return customers.filter((c) => {
      if (c.status === 'Closed' || c.status === 'Completed' || c.status === 'Accepted') {
        return false;
      }

      const isInitiated = c.status === 'Initiated' || c.callActive;
      const isTakenByOptometrist = isTakenByOptometristUser(c.callTakenBy);
      const isDismissed = dismissedIds.has(c.id);

      return isInitiated && !isTakenByOptometrist && !isDismissed;
    });
  }, [user, customers, dismissedIds, isTakenByOptometristUser]);

  React.useEffect(() => {
    if (!user || user.role !== 'optometrist' || pendingCalls.length === 0 || isMuted) {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => null);
        audioContextRef.current = null;
      }

      return;
    }

    let intervalId: null | ReturnType<typeof setInterval> = null;

    const playChime = () => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;

        if (!AudioCtx) {
          return;
        }

        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new AudioCtx();
        }

        const ctx = audioContextRef.current;

        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => undefined);
        }

        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1046.5, now + 0.15);

        gain.gain.setValueAtTime(0.55, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.15);
        osc2.start(now + 0.15);
        osc2.stop(now + 0.6);
      } catch (e) {
        console.warn('Audio alert playback error:', e);
      }
    };

    playChime();
    intervalId = setInterval(playChime, 2500);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }

      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => undefined);
        audioContextRef.current = null;
      }
    };
  }, [user, pendingCalls.length, isMuted]);

  const userHasActiveCall = React.useMemo(() => {
    if (!user) {
      return false;
    }

    const userNameLower = user.name.toLowerCase();
    const userEmailLower = user.email.toLowerCase();

    return customers.some((c) => {
      if (!c.callActive || !c.callTakenBy) {
        return false;
      }

      const takenByLower = c.callTakenBy.toLowerCase();

      return takenByLower === userNameLower || takenByLower === userEmailLower;
    });
  }, [user, customers]);

  if (!user || user.role !== 'optometrist' || userHasActiveCall || pendingCalls.length === 0) {
    return null;
  }

  const safeIndex = Math.min(currentIndex, pendingCalls.length - 1);
  const currentCall = pendingCalls[safeIndex];

  if (!currentCall) {
    return null;
  }

  const handleDismiss = (customerId: string) => {
    setDismissedIds((prev) => new Set(prev).add(customerId));
  };

  const handleAcceptCall = (customerId: string) => {
    setDismissedIds((prev) => new Set(prev).add(customerId));

    if (onSelectCustomer) {
      onSelectCustomer(customerId);
    }
  };

  return (
    <div className="pointer-events-auto fixed right-5 top-5 z-[100] w-full max-w-sm duration-300 animate-in fade-in slide-in-from-top-5 sm:max-w-md">
      <div className="relative overflow-hidden rounded-2xl border bg-white p-5 text-slate-900">
        <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 animate-pulse rounded-full bg-rose-100 opacity-60 blur-2xl" />

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex shrink-0 items-center justify-center">
              <span className="absolute inline-flex h-9 w-9 animate-ping rounded-full bg-rose-400 opacity-60" />
              <div className="shadow-xs relative z-10 flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 font-medium text-rose-600">
                <Bell className="h-4 w-4 animate-bounce" />
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-rose-700">
                  <ShieldAlert className="h-3 w-3 text-rose-600" />
                  Incoming Call
                </span>
                {pendingCalls.length > 1 && (
                  <Badge
                    className="border-slate-200 bg-slate-100 text-[10px] font-medium text-slate-700"
                    variant="outline"
                  >
                    {safeIndex + 1} of {pendingCalls.length}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              className="h-7 w-7 cursor-pointer rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
              onClick={() => setIsMuted(!isMuted)}
              size="icon"
              title={isMuted ? 'Unmute alert sound' : 'Mute alert sound'}
              variant="ghost"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4 text-rose-500" />
              ) : (
                <Volume2 className="h-4 w-4 animate-pulse text-emerald-600" />
              )}
            </Button>

            <Button
              className="h-7 w-7 cursor-pointer rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
              onClick={() => handleDismiss(currentCall.id)}
              size="icon"
              title="Close alert"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative z-10 mt-4 space-y-2 rounded-xl border border-slate-200/80 bg-slate-50 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <User className="h-4 w-4 shrink-0 text-rose-600" />
              <span className="truncate text-sm font-medium text-slate-900">{currentCall.name}</span>
            </div>
            <span className="shrink-0 rounded border border-rose-200 bg-rose-50 px-2 py-0.5 font-mono text-xs font-medium text-rose-700">
              {currentCall.id}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200/60 pt-1 text-xs text-slate-600">
            <div className="flex min-w-0 items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate font-medium text-slate-700">
                {currentCall.storeName || 'Store'}
              </span>
            </div>
            <span className="shrink-0 rounded border border-slate-300/50 bg-slate-200/60 px-2 py-0.5 text-[11px] font-medium text-slate-700">
              {currentCall.preferredLanguage}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-[11px] font-medium text-slate-500">Wait Time:</span>
            <div className="flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 font-mono text-[11px] font-medium text-rose-700">
              <CallTimer active={true} startTime={currentCall.callStartTime || currentCall.lastUpdatedOn} />
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-4 flex items-center justify-between gap-2">
          {pendingCalls.length > 1 ? (
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
              <Button
                className="h-7 w-7 cursor-pointer rounded text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                onClick={() => setCurrentIndex(safeIndex > 0 ? safeIndex - 1 : pendingCalls.length - 1)}
                size="icon"
                title="Previous call"
                variant="ghost"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-1 font-mono text-[10px] font-medium text-slate-600">
                {safeIndex + 1}/{pendingCalls.length}
              </span>
              <Button
                className="h-7 w-7 cursor-pointer rounded text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                onClick={() => setCurrentIndex(safeIndex < pendingCalls.length - 1 ? safeIndex + 1 : 0)}
                size="icon"
                title="Next call"
                variant="ghost"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div />
          )}

          <Button
            className="hover:bg-primary/90 h-9.5 flex max-w-[210px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-xs font-medium text-primary-foreground shadow-md transition-all active:scale-95"
            onClick={() => handleAcceptCall(currentCall.id)}
          >
            <PhoneCall className="h-4 w-4 animate-bounce" />
            ACCEPT & TAKE CALL
          </Button>
        </div>
      </div>
    </div>
  );
}
