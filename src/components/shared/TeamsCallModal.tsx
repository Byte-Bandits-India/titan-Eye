import { AzureCommunicationTokenCredential } from '@azure/communication-common';
import { CallComposite, useAzureCommunicationCallAdapter } from '@azure/communication-react';
import { GripHorizontal, Maximize2, Minimize2, Minus, PhoneOff } from 'lucide-react';
import * as React from 'react';

import type { CallSessionPayload } from '../../types';

import { apiClient } from '../../Util/apiClient';

interface TeamsCallModalProps {
  initialMode?: 'fullscreen' | 'normal';
  onClose: () => void;
  session: CallSessionPayload | null;
  variant?: 'embedded' | 'floating';
}

function TeamsCallModalComponent({
  initialMode = 'normal',
  onClose,
  session,
  variant = 'floating',
}: TeamsCallModalProps) {
  const acsToken = session?.acsToken;
  const groupId = session?.groupId;
  const meetingUrl = session?.meetingUrl;
  const acsUserId = session?.acsUserId;
  const displayName = session?.displayName;

  const [mode, setMode] = React.useState<'fullscreen' | 'minimized' | 'normal'>(initialMode);
  const [position, setPosition] = React.useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = React.useRef(false);
  const dragStartRef = React.useRef<{ mouseX: number; mouseY: number; posX: number; posY: number }>({
    mouseX: 0,
    mouseY: 0,
    posX: 0,
    posY: 0,
  });

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (mode !== 'minimized') {
      return;
    }

    if ((e.target as HTMLElement).closest('button')) {
      return;
    }

    isDraggingRef.current = true;
    const currentX = position?.x ?? Math.max(16, window.innerWidth - 360);
    const currentY = position?.y ?? Math.max(16, window.innerHeight - 70);

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: currentX,
      posY: currentY,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) {
        return;
      }

      const deltaX = moveEvent.clientX - dragStartRef.current.mouseX;
      const deltaY = moveEvent.clientY - dragStartRef.current.mouseY;

      const newX = Math.max(10, Math.min(window.innerWidth - 350, dragStartRef.current.posX + deltaX));
      const newY = Math.max(10, Math.min(window.innerHeight - 60, dragStartRef.current.posY + deltaY));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const credential = React.useMemo(() => {
    if (!acsToken) {
      return null;
    }

    return new AzureCommunicationTokenCredential(acsToken);
  }, [acsToken]);

  const locator = React.useMemo(() => {
    if (groupId) {
      return { groupId };
    }

    if (meetingUrl) {
      return { meetingLink: meetingUrl };
    }

    return undefined;
  }, [groupId, meetingUrl]);

  const userId = React.useMemo(() => {
    if (!acsUserId) {
      return undefined;
    }

    return { communicationUserId: acsUserId };
  }, [acsUserId]);

  const adapterArgs = React.useMemo(() => {
    if (!credential || !locator || !userId || !displayName) {
      return undefined;
    }

    return {
      credential,
      displayName,
      locator,
      userId,
    };
  }, [credential, locator, userId, displayName]);

  const adapter = useAzureCommunicationCallAdapter(adapterArgs ?? {});
  const hasJoinedRef = React.useRef(false);

  const handleEndCall = React.useCallback(
    async (sourceReason?: string) => {
      console.warn(`[TeamsCallModal] handleEndCall triggered (Source: ${sourceReason ?? 'manual action'})`, {
        customerId: session?.customerId,
      });

      if (session?.customerId) {
        try {
          await apiClient.post('/calls/end', { customerId: session.customerId });
        } catch (err) {
          console.error('[TeamsCallModal] Failed to send /calls/end request:', err);
        }

        try {
          await apiClient.post(`/customers/${encodeURIComponent(session.customerId)}/end-call`);
        } catch (err) {
          console.error('[TeamsCallModal] Failed to update customer end-call state:', err);
        }
      }

      onClose();
    },
    [session, onClose]
  );

  const compositeOptions = React.useMemo(
    () => ({
      surveyOptions: {
        disableSurvey: true,
        onSurveyClosed: () => handleEndCall('survey closed'),
        onSurveySubmitted: async () => handleEndCall('survey submitted'),
      },
    }),
    [handleEndCall]
  );

  React.useEffect(() => {
    hasJoinedRef.current = false;
  }, [session?.customerId]);

  React.useEffect(() => {
    if (!adapter) {
      return;
    }

    const handleStateChange = () => {
      try {
        const state = adapter.getState();
        const page = state.page;

        console.log('[TeamsCallModal] Adapter state update:', {
          page,
          callEndReason: state.call?.callEndReason,
          latestErrors: state.latestErrors,
        });

        if (page === 'configuration' && !hasJoinedRef.current) {
          hasJoinedRef.current = true;
          adapter.joinCall();
        } else if (
          page === 'leftCall' ||
          page === 'accessDeniedTeamsMeeting' ||
          page === 'removedFromCall' ||
          page === 'joinCallFailedDueToNoNetwork' ||
          page === 'badRequest'
        ) {
          console.error(`[TeamsCallModal] Call ended or failed on page: '${page}'`, {
            page,
            callEndReason: state.call?.callEndReason,
            latestErrors: state.latestErrors,
            fullState: state,
          });
          handleEndCall(`Adapter page changed to '${page}'`);
        }
      } catch (err) {
        console.warn('[TeamsCallModal] Auto-join/state handling error:', err);
      }
    };

    handleStateChange();
    adapter.onStateChange(handleStateChange);

    return () => {
      adapter.offStateChange(handleStateChange);
    };
  }, [adapter, handleEndCall]);

  if (!session) {
    return null;
  }

  if (variant === 'embedded') {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 animate-pulse rounded-full bg-emerald-500" />
            <h3 className="text-sm font-medium text-white sm:text-sm">
              Live Video Consultation — Customer #{session.customerId}
            </h3>
          </div>

          <button
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-rose-600 px-2.5 py-1 text-sm font-medium text-white transition-all hover:bg-rose-700 active:scale-95"
            onClick={() => handleEndCall('User clicked End Call button')}
            type="button"
          >
            <PhoneOff size={14} />
            <span>End Call</span>
          </button>
        </div>

        <div className="relative flex-1 bg-black">
          {adapter ? (
            <CallComposite adapter={adapter} options={compositeOptions} />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-slate-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <p className="text-sm font-medium sm:text-sm">Initializing video consultation stream...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'minimized') {
    return (
      <>
        {/* Hidden CallComposite keeps audio/video WebRTC connection active */}
        <div className="hidden">
          {adapter && <CallComposite adapter={adapter} options={compositeOptions} />}
        </div>

        {/* Small Draggable Floating Bar */}
        <div
          className="fixed z-[100] flex cursor-move select-none items-center justify-between gap-3 rounded-full border border-slate-700/80 bg-slate-900/95 px-4 py-2 shadow-2xl backdrop-blur-md"
          onMouseDown={handleHeaderMouseDown}
          style={
            position
              ? {
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                }
              : {
                  bottom: '24px',
                  right: '24px',
                }
          }
        >
          <div className="flex items-center gap-2.5">
            <GripHorizontal className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="flex h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-emerald-500" />
            <span className="whitespace-nowrap text-sm font-medium text-white sm:text-sm">
              Call Active · #{session.customerId}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Expand Button */}
            <button
              className="flex cursor-pointer items-center justify-center rounded-full p-1.5 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
              onClick={() => setMode('normal')}
              title="Expand Video Call"
              type="button"
            >
              <Maximize2 size={14} />
            </button>

            {/* End Call Button */}
            <button
              className="flex cursor-pointer items-center gap-1 rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-medium text-white transition-all hover:bg-rose-700 active:scale-95"
              onClick={() => handleEndCall('User clicked End Call in mini bar')}
              title="Terminate Call Session"
              type="button"
            >
              <PhoneOff size={12} />
              <span>End</span>
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div
      className={
        mode === 'fullscreen'
          ? 'fixed inset-0 z-50 bg-black'
          : 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md sm:p-6'
      }
    >
      <div
        className={
          mode === 'fullscreen'
            ? 'relative flex h-screen w-screen flex-col overflow-hidden bg-slate-900'
            : 'relative flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl'
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 animate-pulse rounded-full bg-emerald-500" />
            <div>
              <h3 className="text-sm font-medium text-white sm:text-sm">
                Live Video Consultation — Customer #{session.customerId}
              </h3>
              <p className="text-[11px] text-slate-400">
                Connected via Azure Communication Services & Microsoft Teams
              </p>
            </div>
          </div>

          {/* Window Controls */}
          <div className="flex items-center gap-1.5">
            {/* Minimize / Floating Toggle */}
            <button
              className="flex cursor-pointer items-center rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
              onClick={() => setMode('minimized')}
              title="Minimize to Floating Bar"
              type="button"
            >
              <Minus size={16} />
            </button>

            {/* Fullscreen Toggle */}
            <button
              className="flex cursor-pointer items-center rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
              onClick={() => setMode((prev) => (prev === 'fullscreen' ? 'normal' : 'fullscreen'))}
              title={mode === 'fullscreen' ? 'Exit Fullscreen' : 'Fullscreen Window'}
              type="button"
            >
              {mode === 'fullscreen' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            {/* End Call Button */}
            <button
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-rose-600 px-2.5 py-1 text-sm font-medium text-white transition-all hover:bg-rose-700 active:scale-95"
              onClick={() => handleEndCall('User clicked End Call button')}
              type="button"
            >
              <PhoneOff size={14} />
              <span>End Call</span>
            </button>
          </div>
        </div>

        {/* ACS Video Composite Container */}
        <div className="relative flex-1 bg-black">
          {adapter ? (
            <CallComposite adapter={adapter} options={compositeOptions} />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-slate-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <p className="text-sm font-medium sm:text-sm">Initializing video consultation stream...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const TeamsCallModal = React.memo(TeamsCallModalComponent);
