import { AlertTriangle, Bell, CheckCheck, CheckCircle2, ClipboardCheck, Clock, PhoneIncoming, PhoneOff, UserCheck, UserPlus, Volume2, VolumeX, X, XCircle } from "lucide-react";
import * as React from "react";

import { fetchCustomersAction, initiateCallAction, rejectCallAction } from "../../Actions/customerActions";
import { fetchUsersAction } from "../../Actions/userActions";
import { useAppDispatch, useAppSelector } from "../../store";
import { openTeamsCallWindow } from "../../Util/teamsCall";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { type LogNotificationType, useNotificationLog } from "../ui/notificationLog";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ScrollArea } from "../ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";
import { useToast } from "../ui/toast";

const LOG_ICONS: Record<LogNotificationType, React.ComponentType<{ className?: string }>> = {
  assessment_accepted: ClipboardCheck,
  assessment_complete: CheckCircle2,
  call_closed: XCircle,
  call_ended: PhoneOff,
  call_initiated: PhoneIncoming,
  no_optom_available: AlertTriangle,
  optom_available: UserCheck,
  patient_registered: UserPlus,
};

interface NotificationPopoverProps {
  onSelectCustomer?: (customerId: string) => void;
  trigger?: React.ReactNode;
  variant?: "drawer" | "popover";
}

export function NotificationPopover({
  onSelectCustomer,
  trigger,
  variant = "popover",
}: NotificationPopoverProps) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { dismissLogNotification, logNotifications } = useNotificationLog();
  const user = useAppSelector((state) => state.auth.user);
  const customers = useAppSelector((state) => state.customers.customers);
  const users = useAppSelector((state) => state.users.users);

  const [open, setOpen] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(
    new Set(),
  );
  const [retryingLogId, setRetryingLogId] = React.useState<null | string>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  // play() is async - a pause() issued while a play() request is still
  // in-flight can lose the race in some (especially embedded/webview)
  // browsers, leaving the ring audibly running after the app's own state
  // says it should be stopped. This flag records the *latest intent* so it
  // can be re-applied once the in-flight play() promise actually settles.
  const wantsPlayingRef = React.useRef(false);

  const getAudioElement = React.useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/call-Notification.mp3");
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

  // Browsers block audio.play() until the page has seen a user gesture.
  // Priming (muted play + immediate pause) on the first click/keypress unlocks
  // playback for this session, so the ring can autoplay later when an SSE
  // event arrives with no gesture attached.
  React.useEffect(() => {
    if (user?.role !== "optom" && user?.role !== "store") return;

    let unlocked = false;

    const unlock = () => {
      if (unlocked) return;

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

    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);

    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, [user, getAudioElement]);

  const [now, setNow] = React.useState<number>(Date.now());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const prevLogCountRef = React.useRef(logNotifications.length);
  React.useEffect(() => {
    if (variant === "drawer" && logNotifications.length > prevLogCountRef.current) {
      setOpen(true);
    }

    prevLogCountRef.current = logNotifications.length;
  }, [logNotifications.length, variant]);

  React.useEffect(() => {
    dispatch(fetchCustomersAction());
    dispatch(fetchUsersAction());

    const handleSseEvent = () => {
      dispatch(fetchCustomersAction());
      dispatch(fetchUsersAction());
    };

    window.addEventListener("titan:sse_event", handleSseEvent);

    return () => window.removeEventListener("titan:sse_event", handleSseEvent);
  }, [dispatch]);

  const isTakenByOptomUser = React.useCallback(
    (callTakenBy?: null | string) => {
      if (!callTakenBy) {return false;}

      const takenByLower = callTakenBy.toLowerCase();

      if (takenByLower.startsWith("dr.") || takenByLower.includes("optom"))
        {return true;}

      return users.some(
        (u) =>
          u.role === "optom" &&
          (u.name.toLowerCase() === takenByLower ||
            u.email.toLowerCase() === takenByLower),
      );
    },
    [users],
  );

  type NotificationItem = {
    customer: (typeof customers)[0];
    id: string;
    subtitle: string;
    timestamp: number | string;
    title: string;
    type: "admin_status" | "call_accepted" | "call_completed" | "incoming_call";
  };

  const notifications = React.useMemo<NotificationItem[]>(() => {
    if (!user) {return [];}

    if (user.role === "optom") {
      const isOptomUserInCall = customers.some((c) => {
        if (!(c.status === "Initiated" || c.status === "Accepted") || !c.callTakenBy) {return false;}

        const takenByLower = c.callTakenBy.toLowerCase();

        return (
          takenByLower === user.name.toLowerCase() ||
          takenByLower === user.email.toLowerCase()
        );
      });

      if (isOptomUserInCall) {
        return [];
      }

      return customers
        .filter((c) => {
          if (c.status !== "Initiated") {return false;}

          const offeredTo = (c.offeredToOptomEmail || "").toLowerCase();

          if (offeredTo !== user.email.toLowerCase()) {return false;}

          return !dismissedIds.has(c.id);
        })
        .map((c) => {
          const startMs = parseTimestamp(c.callStartTime || c.lastUpdatedOn);
          const waitSecs = startMs > 0 ? Math.floor((now - startMs) / 1000) : 0;
          const waitMins = Math.floor(waitSecs / 60);
          const isUrgent = waitMins >= 49 && waitMins < 59;

          return {
            customer: c,
            id: c.id,
            subtitle: isUrgent
              ? `URGENT ALERT (Minute ${waitMins}/59): Patient waiting for ${waitMins} mins! Pick up call immediately • Store: ${c.storeName || "Store"}`
              : `Requesting access permission • Store: ${c.storeName || "Store"}`,
            timestamp: c.lastUpdatedOn || now,
            title: isUrgent
              ? `🚨 URGENT CALL (Min ${waitMins}/59): ${c.name}`
              : c.name,
            type: "incoming_call" as const,
          };
        });
    }

    if (user.role === "store") {
      return customers
        .filter((c) => {
          const isMyStore =
            !user.storeName ||
            (c.storeName &&
              c.storeName.toLowerCase() === user.storeName.toLowerCase());

          if (!isMyStore) {return false;}

          if (dismissedIds.has(c.id)) {return false;}

          const isAccepted =
            c.status === "Accepted" ||
            (c.callActive && isTakenByOptomUser(c.callTakenBy));
          const isCompleted = c.status === "Completed";

          return isAccepted || isCompleted;
        })
        .map((c) => {
          const isAccepted =
            c.status === "Accepted" ||
            (c.callActive && isTakenByOptomUser(c.callTakenBy));
          const startMs = parseTimestamp(c.callStartTime);
          const optomCallStartTime = c.optomCallStartTime;
          const optomMs = parseTimestamp(optomCallStartTime || c.lastUpdatedOn);
          const waitSecs =
            startMs > 0 && optomMs >= startMs
              ? Math.floor((optomMs - startMs) / 1000)
              : 0;
          const isPost59Min = waitSecs >= 3540;

          let subtitleText = `Consultation completed by ${c.callTakenBy || "Optom Doctor"}`;

          if (isAccepted) {
            if (isPost59Min) {
              subtitleText = `Optom Doctor Calling: ${c.callTakenBy || "Optom Doctor"} is calling for ${c.name} after 59 mins. Please attend!`;
            } else {
              subtitleText = `Call accepted by ${c.callTakenBy || "Optom Doctor"}`;
            }
          }

          return {
            customer: c,
            id: c.id,
            subtitle: subtitleText,
            timestamp: c.lastUpdatedOn || now,
            title:
              isPost59Min && isAccepted ? `📞 ATTEND CALL: ${c.name}` : c.name,
            type: isAccepted ? "call_accepted" : "call_completed",
          };
        });
    }

    if (user.role === "admin") {
      return customers
        .filter((c) => !dismissedIds.has(c.id))
        .map((c) => ({
          customer: c,
          id: c.id,
          subtitle: `${c.name} (${c.storeName || "Store"})`,
          timestamp: c.lastUpdatedOn || now,
          title: `Status: ${c.status}`,
          type: "admin_status" as const,
        }));
    }

    return [];
  }, [user, customers, dismissedIds, isTakenByOptomUser, now]);

  React.useEffect(() => {
    if (
      !user ||
      user.role !== "optom" ||
      notifications.length === 0 ||
      isMuted
    ) {
      stopAudio();

      return;
    }

    wantsPlayingRef.current = true;

    const el = getAudioElement();
    const playPromise = el.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // The desired state may have flipped to "stopped" while this
          // request was still resolving - re-apply it now instead of
          // leaving a stray loop running.
          if (!wantsPlayingRef.current) {
            el.pause();
            el.currentTime = 0;
          }
        })
        .catch((e) => {
          console.warn("Audio notification playback error:", e);
        });
    }

    return () => {
      stopAudio();
    };
  }, [user, notifications.length, isMuted, stopAudio, getAudioElement]);

  // Stores don't get the continuous optom ring, but a "no Optom available/
  // answered" log entry is time-sensitive enough to deserve a one-shot alert
  // rather than relying on someone noticing the bell badge.
  const seenNoOptomLogIdsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (!user || user.role !== "store") return;

    const currentIds = logNotifications
      .filter((n) => n.type === "no_optom_available")
      .map((n) => n.id);
    const hasNewAlert = currentIds.some((id) => !seenNoOptomLogIdsRef.current.has(id));

    seenNoOptomLogIdsRef.current = new Set(currentIds);

    if (!hasNewAlert || isMuted) return;

    // This element is shared with the (mutually exclusive, optom-only)
    // continuous ring effect above - a store session never runs that one, so
    // it's safe to pin loop off here for a single play-through.
    const el = getAudioElement();

    el.loop = false;
    el.currentTime = 0;
    el.play().catch((e) => {
      console.warn("Audio notification playback error:", e);
    });
  }, [logNotifications, user, isMuted, getAudioElement]);

  const handleDecline = (customerId: string) => {
    setDismissedIds((prev) => new Set(prev).add(customerId));
    stopAudio();
    dispatch(rejectCallAction(customerId)).catch(() => {
      /* handled via toast in the future if needed; SSE refetch will reconcile state */
    });
  };

  const handleDismiss = (customerId: string) => {
    setDismissedIds((prev) => new Set(prev).add(customerId));
  };

  const handleAccept = (customerId: string) => {
    setDismissedIds((prev) => new Set(prev).add(customerId));
    stopAudio();
    setOpen(false);

    if (onSelectCustomer) {
      onSelectCustomer(customerId);
    }
  };

  const handleAttend = async (customerId: string) => {
    setDismissedIds((prev) => new Set(prev).add(customerId));
    stopAudio();
    setOpen(false);

    try {
      const result = await dispatch(initiateCallAction(customerId));
      const targetEmail = result?.customer?.storeContactEmail;

      if (targetEmail) {
        openTeamsCallWindow(targetEmail);
      }
    } catch (e) {
      const err = e as Error;
      toast({ description: err.message || "Failed to attend the call.", title: "System Error", type: "error" });
    }
  };

  const handleRetryFromLog = async (customerId: string, logId: string) => {
    setRetryingLogId(logId);

    try {
      await dispatch(initiateCallAction(customerId));
      dismissLogNotification(logId);
      toast({
        description: "Your request has been sent to the available Optom doctor.",
        title: "Optom Requested",
        type: "success",
      });
    } catch (e) {
      const err = e as Error;

      toast({
        description: err.message || "Failed to request an Optom doctor.",
        title: "Retry Failed",
        type: "error",
      });
    } finally {
      setRetryingLogId(null);
    }
  };

  const unreadCount = notifications.length + logNotifications.length;

  const muteButton = user?.role === "optom" && unreadCount > 0 && (
    <Button
      className="h-7 w-7 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg cursor-pointer"
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
      title={isMuted ? "Unmute chime" : "Mute chime"}
      variant="ghost"
    >
      {isMuted ? (
        <VolumeX className="w-4 h-4 text-rose-500" />
      ) : (
        <Volume2 className="w-4 h-4 text-emerald-600" />
      )}
    </Button>
  );

  const defaultTrigger = (
    <button
      className="relative text-gray-500 hover:text-gray-900 hover:bg-slate-100 p-2 rounded-xl transition-all cursor-pointer focus:outline-none"
      title="Notifications"
      type="button"
    >
      <Bell
        className={`w-5 h-5 ${unreadCount > 0 ? "text-blue-600 animate-bounce" : "text-gray-500"}`}
      />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white ring-2 ring-white animate-pulse">
          {unreadCount}
        </span>
      )}
    </button>
  );

  const logNotificationList = logNotifications.length > 0 && (
    <div className="p-3 space-y-2 border-b border-border bg-slate-50/60 dark:bg-zinc-800/30">
      {logNotifications.map((item) => {
        const Icon = LOG_ICONS[item.type] ?? Bell;
        const formattedTime = new Date(item.timestamp).toLocaleTimeString("en-US", {
          hour: "numeric",
          hour12: true,
          minute: "2-digit",
        });

        return (
          <div
            className="relative flex items-start gap-2.5 rounded-lg border border-border bg-white dark:bg-zinc-900 shadow-sm p-3 pr-8"
            key={item.id}
          >
            <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="font-bold text-xs text-foreground leading-snug">{item.title}</div>
              <div className="text-[11px] text-muted-foreground leading-tight">{item.description}</div>
              {item.type === "no_optom_available" && item.customerId && (
                <button
                  className="mt-1 px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={retryingLogId === item.id}
                  onClick={() => handleRetryFromLog(item.customerId!, item.id)}
                  type="button"
                >
                  {retryingLogId === item.id ? "Retrying…" : "Retry"}
                </button>
              )}
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium pt-0.5">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{formattedTime}</span>
              </div>
            </div>
            <button
              className="absolute top-2 right-2 h-5 w-5 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              onClick={() => dismissLogNotification(item.id)}
              title="Close notification"
              type="button"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );

  const notificationList = (
    <ScrollArea className="max-h-[400px] w-full">
      {logNotificationList}
      {notifications.length === 0 && logNotifications.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400">
                <CheckCheck className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground">
                No new notifications
              </p>
              <p className="text-[11px] text-slate-400">
                All notifications have been addressed.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((item) => {
                const initials = item.title
                  ? item.title
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : "P";

                const formattedTime = new Date(
                  item.timestamp,
                ).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  hour12: true,
                  minute: "2-digit",
                });

                return (
                  <div
                    className="p-4 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors relative group"
                    key={item.id}
                  >
                    <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-white" />
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10 shrink-0 ring-2 ring-slate-200 dark:ring-zinc-700">
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-bold text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 pr-4 space-y-1">
                        <div className="font-bold text-sm text-foreground leading-snug truncate">
                          {item.title}
                        </div>
                        <div className="text-xs text-muted-foreground font-medium leading-tight">
                          {item.subtitle}
                        </div>
                        {item.type === "incoming_call" ? (
                          <div className="flex items-center gap-2 pt-2">
                            <button
                              className="px-3.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-95"
                              onClick={() => handleAttend(item.customer.id)}
                              type="button"
                            >
                              Attend
                            </button>

                            <button
                              className="px-3.5 py-1.5 rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-semibold shadow-2xs transition-all cursor-pointer active:scale-95"
                              onClick={() => handleAccept(item.customer.id)}
                              type="button"
                            >
                              View
                            </button>

                            <button
                              className="px-3.5 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-95"
                              onClick={() => handleDecline(item.customer.id)}
                              type="button"
                            >
                              Ignore
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 pt-2">
                            <button
                              className="px-3 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 text-[11px] font-semibold transition-colors cursor-pointer"
                              onClick={() => handleDismiss(item.customer.id)}
                              type="button"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium pt-1.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formattedTime}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
    </ScrollArea>
  );

  if (variant === "drawer") {
    return (
      <Sheet onOpenChange={setOpen} open={open}>
        <SheetTrigger asChild>{trigger ?? defaultTrigger}</SheetTrigger>
        <SheetContent className="p-0 sm:max-w-sm" side="left">
          <SheetHeader className="flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SheetTitle className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600" />
                Notifications
              </SheetTitle>
              {unreadCount > 0 && (
                <Badge
                  className="bg-blue-100 text-blue-700 font-extrabold text-[10px] px-2 py-0.5"
                  variant="secondary"
                >
                  {unreadCount} new
                </Badge>
              )}
            </div>
            {muteButton}
          </SheetHeader>
          {notificationList}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>{trigger ?? defaultTrigger}</PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[360px] p-0 shadow-2xl rounded-2xl overflow-hidden border border-border"
      >
        <div className="bg-slate-50 dark:bg-zinc-800/80 border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-sm text-foreground">
              Notifications
            </span>
            {unreadCount > 0 && (
              <Badge
                className="bg-blue-100 text-blue-700 font-extrabold text-[10px] px-2 py-0.5"
                variant="secondary"
              >
                {unreadCount} new
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">{muteButton}</div>
        </div>

        {notificationList}
      </PopoverContent>
    </Popover>
  );
}

function parseTimestamp(val: null | number | string | undefined): number {
  if (!val) {return 0;}

  if (typeof val === "number") {return val;}

  const num = parseInt(val, 10);

  if (!isNaN(num) && String(num).length >= 10) {return num;}

  const dateMs = new Date(val).getTime();

  return isNaN(dateMs) ? 0 : dateMs;
}
