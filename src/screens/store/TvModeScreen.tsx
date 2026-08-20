import { Maximize, PhoneIncoming } from 'lucide-react';
import * as React from 'react';

import type { CallSessionPayload, ManagedVideo } from '../../types';

import { TeamsCallModal } from '../../components/shared/TeamsCallModal';
import { useFullscreen } from '../../hooks/useFullscreen';
import { API_BASE_URL } from '../../options/Option';
import { useAppSelector } from '../../store';
import { apiClient } from '../../Util/apiClient';
import { getYoutubeEmbedUrl } from '../../utils/youtube';

const INCOMING_CALL_SPLASH_MS = 2200;

function useTvModeVideo(): ManagedVideo | null {
  const [video, setVideo] = React.useState<ManagedVideo | null>(null);

  const fetchTvModeVideo = React.useCallback(async () => {
    try {
      const res = await apiClient.get<{ video: ManagedVideo | null }>('/videos/tvmode-active');
      setVideo(res.data.video ?? null);
    } catch {
      setVideo(null);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchTvModeVideo();

    const handleTvModeVideoChanged = () => void fetchTvModeVideo();

    window.addEventListener('titan:tvmode_video_changed', handleTvModeVideoChanged);

    return () => window.removeEventListener('titan:tvmode_video_changed', handleTvModeVideoChanged);
  }, [fetchTvModeVideo]);

  return video;
}

function TvModeVideoBackground({ onError, video }: { onError: () => void; video: ManagedVideo }) {
  if (video.sourceType === 'youtube' && video.youtubeUrl) {
    const embedUrl = getYoutubeEmbedUrl(video.youtubeUrl, { autoplay: true, loop: true, mute: true });

    if (!embedUrl) {
      onError();

      return null;
    }

    return (
      <iframe
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        className="pointer-events-none absolute inset-0 h-full w-full"
        src={embedUrl}
        title={video.title}
      />
    );
  }

  return (
    <video
      autoPlay
      className="absolute inset-0 h-full w-full object-cover"
      loop
      muted
      onError={onError}
      playsInline
      src={`${API_BASE_URL}/videos/${video.id}/stream`}
    />
  );
}

function useClock() {
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);

    return () => clearInterval(id);
  }, []);

  return now;
}

function TvModeClock() {
  const now = useClock();

  return (
    <div className="text-right">
      <p className="text-4xl font-semibold tabular-nums tracking-tight text-white sm:text-5xl">
        {now.toLocaleTimeString([], { hour: '2-digit', hour12: true, minute: '2-digit' })}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-300">
        {now.toLocaleDateString([], { day: 'numeric', month: 'long', weekday: 'long', year: 'numeric' })}
      </p>
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2 backdrop-blur-md">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
      </span>
      <span className="text-sm font-medium text-white">{label}</span>
    </div>
  );
}

function IncomingCallSplash({ session }: { session: CallSessionPayload }) {
  const customer = useAppSelector((state) =>
    state.customers.customers.find((c) => c.id === session.customerId)
  );

  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-cyan-950 via-slate-950 to-black">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(34,211,238,0.18),transparent_55%)]" />

      <img alt="TITAN EYE+ Logo" className="absolute left-8 top-8 h-9 w-auto" src="/images/logo.png" />

      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        <span className="relative flex h-28 w-28 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-500/30" />
          <span className="absolute inline-flex h-20 w-20 animate-ping rounded-full bg-cyan-500/40 [animation-delay:200ms]" />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-lg shadow-cyan-500/30">
            <PhoneIncoming size={26} />
          </span>
        </span>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-400">Incoming Consultation</p>
          <h1 className="mt-1 text-3xl font-bold text-white sm:text-4xl">
            {customer?.name ? `Call for ${customer.name}` : 'Optometrist is calling'}
          </h1>
          <p className="mt-3 text-sm text-slate-400">Connecting you now, please wait…</p>
        </div>
      </div>
    </div>
  );
}

function Screensaver({ onEnterTvMode }: { onEnterTvMode: () => void }) {
  const [imageFailed, setImageFailed] = React.useState(false);
  const [videoFailed, setVideoFailed] = React.useState(false);
  const { isFullscreen } = useFullscreen();
  const tvModeVideo = useTvModeVideo();

  const showVideo = Boolean(tvModeVideo) && !videoFailed;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950">
      {showVideo && tvModeVideo && (
        <TvModeVideoBackground onError={() => setVideoFailed(true)} video={tvModeVideo} />
      )}

      {!showVideo && !imageFailed && (
        <img
          alt=""
          className="animate-tvmode-kenburns absolute inset-0 h-full w-full object-cover"
          onError={() => setImageFailed(true)}
          src="/images/tvmode-screensaver.jpg"
        />
      )}

      {!showVideo && imageFailed && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(34,211,238,0.14),transparent_55%)]" />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/50" />

      <div className="absolute right-8 top-8 z-10 drop-shadow-lg">
        <TvModeClock />
      </div>

      <div className="absolute bottom-8 left-8 z-10 flex flex-col items-start gap-3">
        <StatusPill label="Ready for your next consultation" />
        {imageFailed && <p className="text-sm font-medium text-slate-400">Waiting for a call…</p>}
      </div>

      {!isFullscreen && (
        <button
          className="absolute bottom-8 right-8 z-20 flex items-center gap-2 rounded-lg border border-white/20 bg-black/60 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-black/80"
          onClick={onEnterTvMode}
          type="button"
        >
          <Maximize size={16} />
          Enter full screen
        </button>
      )}
    </div>
  );
}

export function TvModeScreen() {
  const [callSession, setCallSession] = React.useState<CallSessionPayload | null>(null);
  const [showSplash, setShowSplash] = React.useState(false);
  const { toggleFullscreen } = useFullscreen();
  const attemptedAutoFullscreen = React.useRef(false);
  const splashTimerRef = React.useRef<null | ReturnType<typeof setTimeout>>(null);

  React.useEffect(() => {
    if (attemptedAutoFullscreen.current) {
      return;
    }

    attemptedAutoFullscreen.current = true;
    document.documentElement.requestFullscreen?.().catch(() => {
      // Blocked without a user gesture — the "Enter full screen" button handles it.
    });
  }, []);

  React.useEffect(() => {
    const handleCallSessionReady = (e: Event) => {
      const detail = (e as CustomEvent<CallSessionPayload>).detail;

      if (detail && detail.role === 'store') {
        setCallSession(detail);
        setShowSplash(true);

        if (splashTimerRef.current) {
          clearTimeout(splashTimerRef.current);
        }

        splashTimerRef.current = setTimeout(() => setShowSplash(false), INCOMING_CALL_SPLASH_MS);
      }
    };

    const handleCallSessionEnded = () => {
      if (splashTimerRef.current) {
        clearTimeout(splashTimerRef.current);
      }

      setShowSplash(false);
      setCallSession(null);
    };

    window.addEventListener('titan:call_session_ready', handleCallSessionReady);
    window.addEventListener('titan:call_session_ended', handleCallSessionEnded);

    return () => {
      if (splashTimerRef.current) {
        clearTimeout(splashTimerRef.current);
      }

      window.removeEventListener('titan:call_session_ready', handleCallSessionReady);
      window.removeEventListener('titan:call_session_ended', handleCallSessionEnded);
    };
  }, []);

  if (callSession && showSplash) {
    return <IncomingCallSplash session={callSession} />;
  }

  if (callSession) {
    return (
      <TeamsCallModal initialMode="fullscreen" onClose={() => setCallSession(null)} session={callSession} />
    );
  }

  return <Screensaver onEnterTvMode={toggleFullscreen} />;
}
