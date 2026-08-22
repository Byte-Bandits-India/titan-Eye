import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  ClipboardCheck,
  PhoneIncoming,
  PhoneOff,
  UserCheck,
  UserPlus,
  Volume2,
  VolumeX,
  X,
  XCircle,
} from 'lucide-react';
import * as React from 'react';

import type { CallSessionPayload, LogNotificationType, NotificationPopoverProps } from '../../types';

import { fetchCustomersAction, initiateCallAction, rejectCallAction } from '../../Actions/customerActions';
import { fetchUsersAction } from '../../Actions/userActions';
import { useAppDispatch, useAppSelector } from '../../store';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useNotificationLog } from '../ui/notificationLog';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ScrollArea } from '../ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { useToast } from '../ui/toast';
import { TeamsCallModal } from './TeamsCallModal';

const LOG_ICONS: Record<LogNotificationType, React.ComponentType<{ className?: string }>> = {
  assessment_accepted: ClipboardCheck,
  assessment_complete: CheckCircle2,
  call_closed: XCircle,
  call_ended: PhoneOff,
  call_initiated: PhoneIncoming,
  no_optometrist_available: AlertTriangle,
  optometrist_available: UserCheck,
  patient_registered: UserPlus,
};

export function NotificationPopover({
  autoOpen = true,
  onSelectCustomer,
  showTrigger = true,
  trigger,
  variant = 'popover',
}: NotificationPopoverProps) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { dismissLogNotification, logNotifications } = useNotificationLog();
  const user = useAppSelector((state) => state.auth.user);
  const customers = useAppSelector((state) => state.customers.customers);
  const users = useAppSelector((state) => state.users.users);

  const [open, setOpen] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set());
  const [retryingLogId, setRetryingLogId] = React.useState<null | string>(null);
  const [callSession, setCallSession] = React.useState<CallSessionPayload | null>(null);
  const handleCallModalClose = React.useCallback(() => setCallSession(null), []);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const wantsPlayingRef = React.useRef(false);
  const genericAudioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    const handleStartOptometristCall = (e: Event) => {
      const detail = (e as CustomEvent<CallSessionPayload>).detail;

      if (detail && detail.role === 'optometrist') {
        setCallSession(detail);
      }
    };

    const handleCallSessionEnded = () => {
      setCallSession(null);
    };

    window.addEventListener('titan:start_optometrist_call', handleStartOptometristCall);
    window.addEventListener('titan:call_session_ended', handleCallSessionEnded);

    return () => {
      window.removeEventListener('titan:start_optometrist_call', handleStartOptometristCall);
      window.removeEventListener('titan:call_session_ended', handleCallSessionEnded);
    };
  }, []);

  const getAudioElement = React.useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/call-Notification.mp3');
      audioRef.current.loop = true;
    }

    return audioRef.current;
  }, []);

  const stopAudio = React.useCallback(() => {
    wantsPlayingRef.current = false;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const playGenericNotificationSound = React.useCallback(() => {
    if (!genericAudioRef.current) {
      genericAudioRef.current = new Audio('/store-notification.mp3');
    }

    const el = genericAudioRef.current;

    el.currentTime = 0;
    el.play().catch((e) => {
      console.warn('Notification sound playback error:', e);
    });
  }, []);

  React.useEffect(() => {
    if (user?.role !== 'optometrist') {
      return;
    }

    let unlocked = false;

    const unlock = () => {
      if (unlocked) {
        return;
      }

      const el = getAudioElement();
      const previousVolume = el.volume;

      el.volume = 0;
      el.play()
        .then(() => {
          el.pause();
          el.currentTime = 0;
          el.volume = previousVolume;
          unlocked = true;
        })
        .catch(() => {
          el.volume = previousVolume;
        });
    };

    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);

    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, [user, getAudioElement]);

  const [now, setNow] = React.useState<number>(() => Date.now());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    dispatch(fetchCustomersAction());
    dispatch(fetchUsersAction());

    const handleSseEvent = () => {
      dispatch(fetchCustomersAction());
      dispatch(fetchUsersAction());
    };

    window.addEventListener('titan:sse_event', handleSseEvent);

    return () => window.removeEventListener('titan:sse_event', handleSseEvent);
  }, [dispatch]);

  const isTakenByOptometristUser = React.useCallback(
    (callTakenBy?: null | string) => {
      if (!callTakenBy) {
        return false;
      }

      const takenByLower = callTakenBy.toLowerCase();

      if (takenByLower.startsWith('dr.') || takenByLower.includes('optometrist')) {
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

  type NotificationItem = {
    customer: (typeof customers)[0];
    id: string;
    subtitle: string;
    timestamp: number | string;
    title: string;
    type: 'admin_status' | 'call_accepted' | 'call_completed' | 'incoming_call';
  };

  const notifications = React.useMemo<NotificationItem[]>(() => {
    if (!user) {
      return [];
    }

    if (user.role === 'optometrist') {
      const isOptometristUserInCall = customers.some((c) => {
        if (!(c.status === 'Initiated' || c.status === 'Accepted') || !c.callTakenBy) {
          return false;
        }

        const takenByLower = c.callTakenBy.toLowerCase();

        return takenByLower === user.name.toLowerCase() || takenByLower === user.email.toLowerCase();
      });

      if (isOptometristUserInCall) {
        return [];
      }

      return customers
        .filter((c) => {
          if (c.status !== 'Initiated') {
            return false;
          }

          const offeredTo = (c.offeredToOptometristEmail || '').toLowerCase();

          if (offeredTo !== user.email.toLowerCase()) {
            return false;
          }

          const itemKey = `${c.id}_${c.callStartTime || c.lastUpdatedOn || ''}`;

          return !dismissedIds.has(itemKey);
        })
        .map((c) => {
          const itemKey = `${c.id}_${c.callStartTime || c.lastUpdatedOn || ''}`;
          const startMs = parseTimestamp(c.callStartTime || c.lastUpdatedOn);
          const waitSecs = startMs > 0 ? Math.floor((now - startMs) / 1000) : 0;
          const waitMins = Math.floor(waitSecs / 60);
          const isUrgent = waitMins >= 49 && waitMins < 59;

          return {
            customer: c,
            id: itemKey,
            subtitle: isUrgent
              ? `URGENT ALERT (Minute ${waitMins}/59): Patient waiting for ${waitMins} mins! Pick up call immediately • Store: ${c.storeName || 'Store'}`
              : `Requesting access permission • Store: ${c.storeName || 'Store'}`,
            timestamp: c.lastUpdatedOn || now,
            title: isUrgent ? `🚨 URGENT CALL (Min ${waitMins}/59): ${c.name}` : c.name,
            type: 'incoming_call' as const,
          };
        });
    }

    if (user.role === 'store') {
      return customers
        .filter((c) => {
          const isMyStore =
            !user.storeName || (c.storeName && c.storeName.toLowerCase() === user.storeName.toLowerCase());

          if (!isMyStore) {
            return false;
          }

          const isCallActive = !!c.callActive && isTakenByOptometristUser(c.callTakenBy);

          if (!isCallActive) {
            return false;
          }

          const itemKey = `${c.id}_${c.optometristCallStartTime || c.callStartTime || c.lastUpdatedOn || ''}`;

          return !dismissedIds.has(itemKey);
        })
        .map((c) => {
          const itemKey = `${c.id}_${c.optometristCallStartTime || c.callStartTime || c.lastUpdatedOn || ''}`;
          const startMs = parseTimestamp(c.callStartTime);
          const optometristCallStartTime = c.optometristCallStartTime;
          const optometristMs = parseTimestamp(optometristCallStartTime || c.lastUpdatedOn);
          const waitSecs =
            startMs > 0 && optometristMs >= startMs ? Math.floor((optometristMs - startMs) / 1000) : 0;
          const isPost59Min = waitSecs >= 3540;

          let subtitleText = `${c.callTakenBy || 'Optometrist Doctor'} accepted the call`;

          if (isPost59Min) {
            subtitleText = `${c.callTakenBy || 'Optometrist Doctor'} is still on a call with ${c.name} after 59 mins.`;
          }

          return {
            customer: c,
            id: itemKey,
            subtitle: subtitleText,
            timestamp: c.lastUpdatedOn || now,
            title: isPost59Min ? `⏰ Long Call: ${c.name}` : c.name,
            type: 'call_accepted' as const,
          };
        });
    }

    if (user.role === 'admin') {
      return customers
        .filter((c) => Boolean(c.patientFeedback && c.patientFeedback.trim()) && !dismissedIds.has(c.id))
        .map((c) => ({
          customer: c,
          id: c.id,
          subtitle: `${c.name} (${c.storeName || 'Store'})`,
          timestamp: c.lastUpdatedOn || now,
          title: 'New Patient Feedback',
          type: 'admin_status' as const,
        }));
    }

    return [];
  }, [user, customers, dismissedIds, isTakenByOptometristUser, now]);

  const nonCallNotificationIds = React.useMemo(
    () => [
      ...notifications.filter((n) => n.type !== 'incoming_call').map((n) => n.id),
      ...logNotifications.map((n) => n.id),
    ],
    [notifications, logNotifications]
  );

  const currentNotificationIds = React.useMemo(
    () => [...notifications.map((n) => n.id), ...logNotifications.map((n) => n.id)].join(','),
    [notifications, logNotifications]
  );

  const prevNotificationIdsRef = React.useRef<null | string>(null);

  React.useEffect(() => {
    if (!autoOpen) {
      return;
    }

    if (prevNotificationIdsRef.current === null) {
      prevNotificationIdsRef.current = currentNotificationIds;

      return;
    }

    const prevIds = new Set(prevNotificationIdsRef.current.split(',').filter(Boolean));
    const currentIds = currentNotificationIds.split(',').filter(Boolean);

    const hasNewNotification = currentIds.some((id) => !prevIds.has(id));

    if (hasNewNotification && currentIds.length > 0) {
      setOpen(true);

      const hasNewNonCallNotification = nonCallNotificationIds.some((id) => !prevIds.has(id));

      if (hasNewNonCallNotification && !isMuted) {
        playGenericNotificationSound();
      }
    }

    prevNotificationIdsRef.current = currentNotificationIds;
  }, [currentNotificationIds, nonCallNotificationIds, autoOpen, isMuted, playGenericNotificationSound]);

  React.useEffect(() => {
    const handleOpenNotificationDrawer = () => {
      setOpen(true);
    };

    window.addEventListener('titan:open_notifications', handleOpenNotificationDrawer);

    return () => {
      window.removeEventListener('titan:open_notifications', handleOpenNotificationDrawer);
    };
  }, []);

  React.useEffect(() => {
    if (!user || user.role !== 'optometrist' || notifications.length === 0 || isMuted) {
      stopAudio();

      return;
    }

    wantsPlayingRef.current = true;

    const el = getAudioElement();
    const playPromise = el.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          if (!wantsPlayingRef.current) {
            el.pause();
            el.currentTime = 0;
          }
        })
        .catch((e) => {
          console.warn('Audio notification playback error:', e);
        });
    }

    return () => {
      stopAudio();
    };
  }, [user, notifications.length, isMuted, stopAudio, getAudioElement]);

  const handleDecline = (customerId: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      notifications.filter((n) => n.customer.id === customerId).forEach((n) => next.add(n.id));
      next.add(customerId);

      return next;
    });
    stopAudio();
    dispatch(rejectCallAction(customerId)).catch((e) => {
      console.warn('rejectCallAction error:', e);
    });
  };

  const handleDismiss = (customerId: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      notifications.filter((n) => n.customer.id === customerId).forEach((n) => next.add(n.id));
      next.add(customerId);

      return next;
    });
    stopAudio();
  };

  const handleAccept = (customerId: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      notifications.filter((n) => n.customer.id === customerId).forEach((n) => next.add(n.id));
      next.add(customerId);

      return next;
    });
    stopAudio();
    setOpen(false);

    if (onSelectCustomer) {
      onSelectCustomer(customerId);
    }
  };

  const handleClearAll = () => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => {
        next.add(n.id);
        next.add(n.customer.id);
      });

      return next;
    });

    logNotifications.forEach((l) => {
      dismissLogNotification(l.id);
    });

    stopAudio();
  };

  const handleRetryFromLog = async (customerId: string, logId: string) => {
    setRetryingLogId(logId);

    try {
      await dispatch(initiateCallAction(customerId));
      dismissLogNotification(logId);
      toast({
        description: 'Your request has been sent to the available Optometrist doctor.',
        title: 'Optometrist Requested',
        type: 'success',
      });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));

      toast({
        description: err.message || 'Failed to request an Optometrist doctor.',
        title: 'Retry Failed',
        type: 'error',
      });
    } finally {
      setRetryingLogId(null);
    }
  };

  const unreadCount = notifications.length + logNotifications.length;

  const muteButton = user?.role === 'optometrist' && unreadCount > 0 && (
    <Button
      className="h-7 w-7 cursor-pointer rounded-lg text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      onClick={() => {
        setIsMuted((prev) => {
          const next = !prev;

          if (next) {
            stopAudio();
          }

          return next;
        });
      }}
      size="icon"
      title={isMuted ? 'Unmute chime' : 'Mute chime'}
      variant="ghost"
    >
      {isMuted ? (
        <VolumeX className="h-4 w-4 text-rose-500" />
      ) : (
        <Volume2 className="h-4 w-4 text-emerald-600" />
      )}
    </Button>
  );

  type UnifiedNotificationItem =
    | {
        category: 'customer';
        customer: (typeof customers)[0];
        id: string;
        subtitle: string;
        timestamp: number;
        title: string;
        type: 'admin_status' | 'call_accepted' | 'call_completed' | 'incoming_call';
      }
    | {
        category: 'log';
        customerId?: string;
        description: string;
        id: string;
        logType: LogNotificationType;
        timestamp: number;
        title: string;
      };

  const allNotifications = React.useMemo<UnifiedNotificationItem[]>(() => {
    const list: UnifiedNotificationItem[] = [];

    notifications.forEach((n) => {
      list.push({
        category: 'customer',
        customer: n.customer,
        id: n.id,
        subtitle: n.subtitle,
        timestamp: parseTimestamp(n.timestamp),
        title: n.title,
        type: n.type,
      });
    });

    logNotifications.forEach((l) => {
      list.push({
        category: 'log',
        customerId: l.customerId,
        description: l.description,
        id: l.id,
        logType: l.type,
        timestamp: parseTimestamp(l.timestamp),
        title: l.title,
      });
    });

    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [notifications, logNotifications]);

  const defaultTrigger = (
    <button
      className="relative cursor-pointer rounded-xl p-2 text-gray-500 transition-all hover:bg-slate-100 hover:text-gray-900 focus:outline-none dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      title="Notifications"
      type="button"
    >
      <Bell
        className={`h-5 w-5 ${unreadCount > 0 ? 'animate-bounce text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-zinc-400'}`}
      />
      {unreadCount > 0 && (
        <span className="absolute right-1 top-1 flex h-4 w-4 animate-pulse items-center justify-center rounded-full bg-rose-600 text-[10px] font-medium text-white ring-2 ring-white dark:ring-zinc-900">
          {unreadCount}
        </span>
      )}
    </button>
  );

  const notificationList = (
    <ScrollArea className="max-h-[460px] w-full">
      {allNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center space-y-3 px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 shadow-inner dark:bg-zinc-800 dark:text-zinc-500">
            <CheckCheck className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">No new notifications</p>
            <p className="max-w-[220px] text-sm text-muted-foreground">
              You're all caught up! New updates and requests will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5 p-3">
          {allNotifications.map((item) => {
            const formattedTime =
              item.timestamp > 0
                ? new Date(item.timestamp).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    hour12: true,
                    minute: '2-digit',
                  })
                : '';

            if (item.category === 'log') {
              const Icon = LOG_ICONS[item.logType] ?? Bell;

              return (
                <div
                  className="shadow-xs group relative flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                  key={`log-${item.id}`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-2 ring-blue-100 dark:bg-blue-950/60 dark:text-blue-400 dark:ring-blue-900/40">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1 pr-24">
                    <div className="text-sm font-medium leading-snug text-foreground">{item.title}</div>
                    <div className="text-[11px] leading-relaxed text-muted-foreground">
                      {item.description}
                    </div>
                    {item.logType === 'no_optometrist_available' && item.customerId && (
                      <button
                        className="shadow-xs mt-1.5 cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-medium text-white transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={retryingLogId === item.id}
                        onClick={() => handleRetryFromLog(item.customerId!, item.id)}
                        type="button"
                      >
                        {retryingLogId === item.id ? 'Retrying…' : 'Retry'}
                      </button>
                    )}
                  </div>
                  <div className="absolute right-3.5 top-3.5 flex items-center gap-1.5">
                    {formattedTime && (
                      <span className="text-[10px] font-medium text-slate-400 dark:text-zinc-500">
                        {formattedTime}
                      </span>
                    )}
                    <button
                      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      onClick={() => dismissLogNotification(item.id)}
                      title="Close notification"
                      type="button"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            }

            const initials = item.title
              ? item.title
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
              : 'P';

            return (
              <div
                className="shadow-xs group relative flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                key={`cust-${item.id}`}
              >
                <Avatar className="shadow-xs h-9 w-9 shrink-0 ring-2 ring-blue-100 dark:ring-zinc-700">
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-blue-600 text-sm font-medium text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-1 pr-24">
                  <div className="truncate text-sm font-medium leading-snug text-foreground">
                    {item.title}
                  </div>
                  <div className="text-[11px] leading-relaxed text-muted-foreground">{item.subtitle}</div>
                  {item.type === 'incoming_call' && (
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        className="shadow-xs flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-sm font-medium text-white transition-all hover:bg-emerald-700 active:scale-95"
                        onClick={() => handleAccept(item.customer.id)}
                        type="button"
                      >
                        View
                      </button>

                      <button
                        className="shadow-xs cursor-pointer rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-100 active:scale-95 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        onClick={() => handleDecline(item.customer.id)}
                        type="button"
                      >
                        Ignore
                      </button>
                    </div>
                  )}
                </div>
                <div className="absolute right-3.5 top-3.5 flex items-center gap-1.5">
                  {formattedTime && (
                    <span className="text-[10px] font-medium text-slate-400 dark:text-zinc-500">
                      {formattedTime}
                    </span>
                  )}
                  <button
                    className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    onClick={() => handleDismiss(item.customer.id)}
                    title="Dismiss notification"
                    type="button"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ScrollArea>
  );

  if (variant === 'toast') {
    const toastItems = allNotifications.slice(0, 4);

    return (
      <>
        {toastItems.length > 0 && (
          <div className="fixed bottom-4 right-4 z-50 flex w-full max-w-[22rem] flex-col-reverse gap-3">
            {toastItems.map((item) => {
              const title = item.title;
              const subtitle = item.category === 'customer' ? item.subtitle : item.description;
              const initial = (title || 'N').trim().charAt(0).toUpperCase();
              const dismissId = item.category === 'customer' ? item.customer.id : item.id;
              const isIncomingCall = item.category === 'customer' && item.type === 'incoming_call';
              const isCallAccepted = item.category === 'customer' && item.type === 'call_accepted';
              const isAdminStatus = item.category === 'customer' && item.type === 'admin_status';
              const isRetryable =
                item.category === 'log' && item.logType === 'no_optometrist_available' && item.customerId;
              const hasCustomerLog =
                item.category === 'log' &&
                Boolean(item.customerId) &&
                item.logType !== 'no_optometrist_available';

              return (
                <div
                  className="w-full overflow-hidden rounded-xl shadow-lg duration-200 animate-in fade-in slide-in-from-bottom-4"
                  key={`toast-${item.category}-${item.id}`}
                  style={{ backgroundColor: '#4F59C9' }}
                >
                  <div className="flex items-start gap-4 p-5">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold"
                      style={{ backgroundColor: '#F3D4FE', color: '#9035B8' }}
                    >
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold text-white">{title}</p>
                      <p className="mt-1.5 text-sm font-medium text-white/90">{subtitle}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {isIncomingCall && user?.role === 'optometrist' && (
                        <button
                          className="shrink-0 cursor-pointer rounded-lg p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                          onClick={() => {
                            setIsMuted((prev) => {
                              const next = !prev;

                              if (next) {
                                stopAudio();
                              }

                              return next;
                            });
                          }}
                          title={isMuted ? 'Unmute chime' : 'Mute chime'}
                          type="button"
                        >
                          {isMuted ? (
                            <VolumeX className="h-4 w-4 text-rose-300" />
                          ) : (
                            <Volume2 className="h-4 w-4 text-emerald-300" />
                          )}
                        </button>
                      )}
                      <button
                        className="shrink-0 cursor-pointer rounded-lg p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                        onClick={() =>
                          item.category === 'customer'
                            ? handleDismiss(dismissId)
                            : dismissLogNotification(dismissId)
                        }
                        title="Close"
                        type="button"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {isIncomingCall && (
                    <div className="flex divide-x divide-white/15" style={{ backgroundColor: '#222876' }}>
                      <button
                        className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-emerald-300 transition-colors hover:bg-white/10"
                        onClick={() => handleAccept(item.customer.id)}
                        type="button"
                      >
                        Accept / View
                      </button>
                      <button
                        className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-rose-300 transition-colors hover:bg-white/10"
                        onClick={() => handleDecline(item.customer.id)}
                        type="button"
                      >
                        Ignore
                      </button>
                    </div>
                  )}

                  {isCallAccepted && (
                    <div className="flex" style={{ backgroundColor: '#222876' }}>
                      <button
                        className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                        onClick={() => handleAccept(item.customer.id)}
                        type="button"
                      >
                        View
                      </button>
                    </div>
                  )}

                  {isAdminStatus && (
                    <div className="flex" style={{ backgroundColor: '#222876' }}>
                      <button
                        className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                        onClick={() => handleAccept(item.customer.id)}
                        type="button"
                      >
                        Review Feedback
                      </button>
                    </div>
                  )}

                  {isRetryable && (
                    <div className="flex" style={{ backgroundColor: '#222876' }}>
                      <button
                        className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={retryingLogId === item.id}
                        onClick={() => handleRetryFromLog(item.customerId!, item.id)}
                        type="button"
                      >
                        {retryingLogId === item.id ? 'Retrying…' : 'Try Again'}
                      </button>
                    </div>
                  )}

                  {hasCustomerLog && (
                    <div className="flex" style={{ backgroundColor: '#222876' }}>
                      <button
                        className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                        onClick={() => handleAccept(item.customerId!)}
                        type="button"
                      >
                        View Customer
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {callSession && <TeamsCallModal onClose={handleCallModalClose} session={callSession} />}
      </>
    );
  }

  if (variant === 'drawer') {
    return (
      <>
        <Sheet onOpenChange={setOpen} open={open}>
          {showTrigger && <SheetTrigger asChild>{trigger ?? defaultTrigger}</SheetTrigger>}

          <SheetContent side="left" className="flex w-[400px] flex-col p-0 sm:max-w-[400px]">
            <SheetHeader className="flex flex-row items-center justify-between border-b border-border bg-slate-50 px-4 py-3.5 dark:bg-zinc-900/90">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  <Bell className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-sm font-medium text-foreground">Notifications</SheetTitle>
                  {unreadCount > 0 && (
                    <Badge
                      className="border-blue-200 bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:border-blue-800 dark:text-blue-400"
                      variant="secondary"
                    >
                      {unreadCount} new
                    </Badge>
                  )}
                </div>
              </div>
              <div className="mr-6 flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <Button
                    className="h-7 px-2 text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-zinc-100"
                    onClick={handleClearAll}
                    size="sm"
                    variant="ghost"
                  >
                    Clear all
                  </Button>
                )}
                {muteButton}
              </div>
            </SheetHeader>
            {notificationList}
          </SheetContent>
        </Sheet>
        {callSession && <TeamsCallModal onClose={handleCallModalClose} session={callSession} />}
      </>
    );
  }

  return (
    <>
      <Popover onOpenChange={setOpen} open={open}>
        {showTrigger && <PopoverTrigger asChild>{trigger ?? defaultTrigger}</PopoverTrigger>}

        <PopoverContent
          align="end"
          className="w-[380px] overflow-hidden rounded-2xl border border-border p-0 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-border bg-slate-50 px-4 py-3.5 dark:bg-zinc-900/90">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <Bell className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <Badge
                    className="border-blue-200 bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:border-blue-800 dark:text-blue-400"
                    variant="secondary"
                  >
                    {unreadCount} new
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  className="h-7 px-2 text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-zinc-100"
                  onClick={handleClearAll}
                  size="sm"
                  variant="ghost"
                >
                  Clear all
                </Button>
              )}
              {muteButton}
            </div>
          </div>

          {notificationList}
        </PopoverContent>
      </Popover>
      {callSession && <TeamsCallModal onClose={handleCallModalClose} session={callSession} />}
    </>
  );
}

function parseTimestamp(val: null | number | string | undefined): number {
  if (!val) {
    return 0;
  }

  if (typeof val === 'number') {
    return val;
  }

  const num = parseInt(val, 10);

  if (!isNaN(num) && String(num).length >= 10) {
    return num;
  }

  const dateMs = new Date(val).getTime();

  return isNaN(dateMs) ? 0 : dateMs;
}
