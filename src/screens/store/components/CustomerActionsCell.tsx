import { CheckCircle2, FileText, MoreHorizontal, UserPen, Video, XCircle } from 'lucide-react';

import type { Customer, StatusTab, User } from '../../../types';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';

type CustomerActionsCellProps = {
  completingCallId: null | string;
  cust: Customer;
  loadingCallId: null | string;
  onCancelCall?: (id: string) => void;
  onCompleteCall: (id: string, name: string) => void;
  onInitiateCall: (id: string) => void;
  onSelectCustomer: (id: string) => void;
  onSetEditing: (v: boolean) => void;
  onSetEditingRx: (v: boolean) => void;
  statusTab?: StatusTab;
  user: null | User;
};

export function CustomerActionsCell({
  completingCallId,
  cust,
  loadingCallId,
  onCancelCall,
  onCompleteCall,
  onInitiateCall,
  onSelectCustomer,
  onSetEditing,
  onSetEditingRx,
  statusTab,
}: CustomerActionsCellProps) {
  // ── Status badge for "All" tab ──────────────────────────────────────────
  const statusBadge = (() => {
    if (cust.status === 'Created') {
      return (
        <Badge
          className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
          variant="Created"
        >
          Queued
        </Badge>
      );
    }

    if (cust.status === 'Initiated' || cust.status === 'Accepted') {
      return (
        <Badge
          className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
          variant="Initiated"
        >
          Testing
        </Badge>
      );
    }

    if (cust.status === 'Completed') {
      return (
        <Badge
          className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          variant="Completed"
        >
          Completed
        </Badge>
      );
    }

    if (cust.status === 'Closed') {
      return (
        <Badge
          className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
          variant="Closed"
        >
          Cancelled
        </Badge>
      );
    }

    if (cust.status === 'Drop') {
      return (
        <Badge
          className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
          variant="Drop"
        >
          Dropped
        </Badge>
      );
    }

    return (
      <Badge
        className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-slate-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        variant="default"
      >
        {cust.status}
      </Badge>
    );
  })();

  // ── Primary call-action button ──────────────────────────────────────────
  const primaryBtn = (() => {
    if (cust.status === 'Accepted') {
      return (
        <Button
          className="rounded-xs flex h-8 cursor-not-allowed items-center gap-1.5 border-0 bg-muted px-4 text-xs font-bold text-muted-foreground opacity-100"
          disabled
          title="Call Initiated"
        >
          Call Initiated
        </Button>
      );
    }

    if (cust.status === 'Initiated') {
      return (
        <div className="flex items-center gap-1">
          <Button
            className="rounded-xs flex h-8 cursor-not-allowed items-center gap-1.5 border-0 bg-amber-100 px-3 text-xs font-bold text-amber-800 opacity-100 dark:bg-amber-950/60 dark:text-amber-300"
            disabled
            title="Waiting for an Optom doctor to respond"
          >
            Requesting Optom…
          </Button>
          {onCancelCall && (
            <Button
              className="rounded-xs flex h-8 cursor-pointer items-center border border-red-200 px-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950/40"
              onClick={() => onCancelCall(cust.id)}
              title="Cancel pending Optom request"
              variant="outline"
            >
              Cancel
            </Button>
          )}
        </div>
      );
    }

    if (cust.status === 'Completed' || cust.status === 'Closed') {
      return (
        <Button
          className="rounded-xs flex h-8 cursor-not-allowed items-center gap-1.5 border-0 bg-muted px-4 text-xs font-bold text-muted-foreground opacity-100"
          disabled
          title="This consultation is already completed"
        >
          Completed
        </Button>
      );
    }

    return (
      <Button
        className="rounded-xs flex h-8 cursor-pointer items-center gap-1.5 border-0 bg-[#4f46e5] px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#4338ca] active:scale-95 dark:bg-indigo-600 dark:hover:bg-indigo-700"
        disabled={loadingCallId === cust.id}
        onClick={() => onInitiateCall(cust.id)}
        title="Request an Optom doctor for this call"
      >
        {loadingCallId === cust.id ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <Video size={14} />
        )}
        Request Optom
      </Button>
    );
  })();

  return (
    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
      {statusTab === 'all' ? statusBadge : primaryBtn}

      {/* ── ⋯ overflow menu ─────────────────────────────────────────────── */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            className="rounded-xs flex h-8 w-8 cursor-pointer items-center justify-center border-border p-0 shadow-sm transition-all hover:bg-muted active:scale-95"
            size="icon"
            title="Actions Menu"
            variant="outline"
          >
            <MoreHorizontal className="text-muted-foreground" size={16} />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="z-50 w-48 space-y-1 rounded-xl border border-border bg-card p-1.5 shadow-xl"
          sideOffset={6}
        >
          {/* Edit Customer */}
          <button
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-foreground transition-colors hover:bg-muted"
            onClick={() => {
              onSelectCustomer(cust.id);
              onSetEditing(true);
              onSetEditingRx(false);
            }}
            type="button"
          >
            <UserPen className="shrink-0 text-blue-600 dark:text-blue-400" size={14} />
            <span>Edit Customer</span>
          </button>

          {/* Store Rx */}
          <button
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-foreground transition-colors hover:bg-muted"
            onClick={() => {
              onSelectCustomer(cust.id);
              onSetEditingRx(true);
              onSetEditing(false);
            }}
            type="button"
          >
            <FileText className="shrink-0 text-emerald-600 dark:text-emerald-400" size={14} />
            <span>Store Rx</span>
          </button>

          {/* Cancel Request — only when call is Initiated */}
          {cust.status === 'Initiated' && onCancelCall && (
            <>
              <div className="my-1 h-px bg-border" />
              <button
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                onClick={() => onCancelCall(cust.id)}
                type="button"
              >
                <XCircle className="shrink-0 text-red-600 dark:text-red-400" size={14} />
                <span>Cancel Request</span>
              </button>
            </>
          )}

          {/* Complete Call — only when call is Accepted but not actively live */}
          {cust.status === 'Accepted' && !cust.callActive && (
            <>
              <div className="my-1 h-px bg-border" />
              <button
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                disabled={completingCallId === cust.id}
                onClick={() => onCompleteCall(cust.id, cust.name)}
                type="button"
              >
                <CheckCircle2 className="shrink-0 text-indigo-600 dark:text-indigo-400" size={14} />
                <span>{completingCallId === cust.id ? 'Completing…' : 'Complete Call'}</span>
              </button>
            </>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
