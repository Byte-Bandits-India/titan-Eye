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

interface OptomIncomingCallAlertProps {
  onSelectCustomer?: (customerId: string) => void;
}

export function OptomIncomingCallAlert({ onSelectCustomer }: OptomIncomingCallAlertProps) {
  const user = useAppSelector((state) => state.auth.user);
  const customers = useAppSelector((state) => state.customers.customers);
  const users = useAppSelector((state) => state.users.users);

  const [isMuted, setIsMuted] = React.useState(false);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set());
  const audioContextRef = React.useRef<AudioContext | null>(null);

  const isTakenByOptomUser = React.useCallback(
    (callTakenBy?: null | string) => {
      if (!callTakenBy) {return false;}

      const takenByLower = callTakenBy.toLowerCase();

      if (takenByLower.startsWith('dr.')) {return true;}

      return users.some(
        (u) =>
          u.role === 'optom' &&
          (u.name.toLowerCase() === takenByLower || u.email.toLowerCase() === takenByLower)
      );
    },
    [users]
  );

  const pendingCalls = React.useMemo(() => {
    if (!user || user.role !== 'optom') {return [];}

    const isOptomUserInCall = customers.some((c) => {
      if (!c.callActive || !c.callTakenBy) {return false;}

      const takenByLower = c.callTakenBy.toLowerCase();

      return (
        takenByLower === user.name.toLowerCase() ||
        takenByLower === user.email.toLowerCase()
      );
    });

    if (isOptomUserInCall) {return [];}

    return customers.filter((c) => {
      if (c.status === 'Closed' || c.status === 'Completed' || c.status === 'Accepted') {return false;}

      const isInitiated = c.status === 'Initiated' || c.callActive;
      const isTakenByOptom = isTakenByOptomUser(c.callTakenBy);
      const isDismissed = dismissedIds.has(c.id);

      return isInitiated && !isTakenByOptom && !isDismissed;
    });
  }, [user, customers, dismissedIds, isTakenByOptomUser]);

  React.useEffect(() => {
    if (currentIndex >= pendingCalls.length && pendingCalls.length > 0) {
      setCurrentIndex(pendingCalls.length - 1);
    }
  }, [pendingCalls.length, currentIndex]);

  React.useEffect(() => {
    if (!user || user.role !== 'optom' || pendingCalls.length === 0 || isMuted) {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }

      return;
    }

    let intervalId: null | ReturnType<typeof setInterval> = null;

    const playChime = () => {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

        if (!AudioCtx) {return;}

        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new AudioCtx();
        }

        const ctx = audioContextRef.current;

        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
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
      if (intervalId) {clearInterval(intervalId);}

      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [user, pendingCalls.length, isMuted]);

  const userHasActiveCall = React.useMemo(() => {
    if (!user) {return false;}

    const userNameLower = user.name.toLowerCase();
    const userEmailLower = user.email.toLowerCase();

    return customers.some((c) => {
      if (!c.callActive || !c.callTakenBy) {return false;}

      const takenByLower = c.callTakenBy.toLowerCase();

      return takenByLower === userNameLower || takenByLower === userEmailLower;
    });
  }, [user, customers]);

  if (!user || user.role !== 'optom' || userHasActiveCall || pendingCalls.length === 0) {
    return null;
  }

  const currentCall = pendingCalls[currentIndex] ?? pendingCalls[0];

  if (!currentCall) {return null;}

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
    <div className="fixed top-5 right-5 z-[100] w-full max-w-sm sm:max-w-md animate-in slide-in-from-top-5 fade-in duration-300 pointer-events-auto">
      <div className="bg-white text-slate-900 rounded-2xl border border p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-100 rounded-full blur-2xl pointer-events-none animate-pulse opacity-60" />

        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center shrink-0">
              <span className="animate-ping absolute inline-flex h-9 w-9 rounded-full bg-rose-400 opacity-60" />
              <div className="w-9 h-9 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center font-bold relative z-10 shadow-xs">
                <Bell className="w-4 h-4 animate-bounce" />
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-black text-[10px] uppercase tracking-wider bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-rose-600" />
                  Incoming Call
                </span>
                {pendingCalls.length > 1 && (
                  <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-bold" variant="outline">
                    {currentIndex + 1} of {pendingCalls.length}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              className="h-7 w-7 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              onClick={() => setIsMuted(!isMuted)}
              size="icon"
              title={isMuted ? 'Unmute alert sound' : 'Mute alert sound'}
              variant="ghost"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-emerald-600 animate-pulse" />}
            </Button>

            <Button
              className="h-7 w-7 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              onClick={() => handleDismiss(currentCall.id)}
              size="icon"
              title="Close alert"
              variant="ghost"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 relative z-10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <User className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-extrabold text-sm text-slate-900 truncate">{currentCall.name}</span>
            </div>
            <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded shrink-0">
              {currentCall.id}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-200/60">
            <div className="flex items-center gap-1.5 min-w-0">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate text-slate-700 font-semibold">{currentCall.storeName || 'Store'}</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-700 bg-slate-200/60 px-2 py-0.5 rounded border border-slate-300/50 shrink-0">
              {currentCall.preferredLanguage}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-500 text-[11px] font-medium">Wait Time:</span>
            <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full text-rose-700 font-mono font-bold text-[11px]">
              <CallTimer
                active={true}
                startTime={currentCall.callStartTime || currentCall.lastUpdatedOn}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 relative z-10">
          {pendingCalls.length > 1 ? (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <Button
                className="h-7 w-7 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded cursor-pointer"
                onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : pendingCalls.length - 1))}
                size="icon"
                title="Previous call"
                variant="ghost"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-[10px] font-mono px-1 font-bold text-slate-600">
                {currentIndex + 1}/{pendingCalls.length}
              </span>
              <Button
                className="h-7 w-7 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded cursor-pointer"
                onClick={() => setCurrentIndex((prev) => (prev < pendingCalls.length - 1 ? prev + 1 : 0))}
                size="icon"
                title="Next call"
                variant="ghost"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div />
          )}

          <Button
            className="flex-1 max-w-[210px] bg-primary text-primary-foreground hover:bg-primary/90 font-extrabold text-xs h-9.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            onClick={() => handleAcceptCall(currentCall.id)}
          >
            <PhoneCall className="w-4 h-4 animate-bounce" />
            ACCEPT & TAKE CALL
          </Button>
        </div>
      </div>
    </div>
  );
}
