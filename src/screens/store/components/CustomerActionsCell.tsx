import { CheckCircle2, ClipboardPlus, FileText, MoreHorizontal, UserPen, XCircle } from 'lucide-react';

import type { Customer, StatusTab, User } from '../../../types';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { isObjectiveRxComplete } from '../../../options/Option';

export function CustomerStatusBadge({ status }: { status: Customer['status'] }) {
  if (status === 'Created') {
    return (
      <Badge
        className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-sm font-medium tracking-wide text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
        variant="Created"
      >
        Created
      </Badge>
    );
  }

  if (status === 'Queued' || status === 'Initiated') {
    return (
      <Badge
        className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-sm font-medium tracking-wide text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        variant="Initiated"
      >
        Queued
      </Badge>
    );
  }

  if (status === 'Testing' || status === 'Accepted') {
    return (
      <Badge
        className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-sm font-medium tracking-wide text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        variant="Initiated"
      >
        Testing
      </Badge>
    );
  }

  if (status === 'Test Completed') {
    return (
      <Badge
        className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-sm font-medium tracking-wide text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300"
        variant="default"
      >
        Test Completed
      </Badge>
    );
  }

  if (status === 'Completed') {
    return (
      <Badge
        className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-sm font-medium tracking-wide text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
        variant="Completed"
      >
        Completed
      </Badge>
    );
  }

  if (status === 'Closed' || status === 'Cancelled') {
    return (
      <Badge
        className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-sm font-medium tracking-wide text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
        variant="Closed"
      >
        Cancelled
      </Badge>
    );
  }

  if (status === 'Drop') {
    return (
      <Badge
        className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-sm font-medium tracking-wide text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        variant="Drop"
      >
        Dropped
      </Badge>
    );
  }

  return (
    <Badge
      className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-sm font-medium tracking-wide text-slate-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
      variant="default"
    >
      {status}
    </Badge>
  );
}

export function ConversionStatusBadge({ conversionStatus }: { conversionStatus?: null | string }) {
  if (conversionStatus === 'Converted') {
    return (
      <Badge
        className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-sm font-medium tracking-wide text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
        variant="Completed"
      >
        Converted
      </Badge>
    );
  }

  if (conversionStatus === 'Not Converted') {
    return (
      <Badge
        className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-sm font-medium tracking-wide text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
        variant="Closed"
      >
        Not Converted
      </Badge>
    );
  }

  return (
    <Badge
      className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-sm font-medium tracking-wide text-slate-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
      variant="default"
    >
      Not Converted
    </Badge>
  );
}

type CustomerActionsCellProps = {
  completingCallId: null | string;
  cust: Customer;
  disableRequest?: boolean;
  onCancelCall?: (id: string) => void;
  onCompleteCall: (id: string, name: string) => void;
  onCreateTest: (id: string) => void;
  onSelectCustomer: (id: string) => void;
  onSetEditing: (v: boolean) => void;
  onSetEditingRx: (v: boolean) => void;
  onUpdateStatus: (id: string) => void;
  statusTab?: StatusTab;
  user: null | User;
};

export function CustomerActionsCell({
  completingCallId,
  cust,
  disableRequest,
  onCancelCall,
  onCompleteCall,
  onCreateTest,
  onSelectCustomer,
  onSetEditing,
  onSetEditingRx,
  onUpdateStatus,
  statusTab,
}: CustomerActionsCellProps) {
  const primaryBtn = (() => {
    if (cust.status === 'Testing' || cust.status === 'Accepted') {
      return (
        <div className="flex items-center gap-1">
          <Button
            className="rounded-xs flex h-8 cursor-not-allowed items-center gap-1.5 border-0 bg-muted px-4 text-sm font-medium text-muted-foreground opacity-100"
            disabled
            title="Call in progress"
          >
            Call Initiated
          </Button>
        </div>
      );
    }

    if (cust.status === 'Queued' || cust.status === 'Initiated') {
      return (
        <div className="flex items-center gap-1">
          <Button
            className="rounded-xs flex h-8 cursor-not-allowed items-center gap-1.5 border-0 bg-amber-100 px-3 text-sm font-medium text-amber-800 opacity-100 dark:bg-amber-950/60 dark:text-amber-300"
            disabled
            title="Waiting for an Optometrist doctor to respond"
          >
            Requesting Optometrist…
          </Button>
          {(statusTab === 'Pending' || statusTab === 'all') && onCancelCall && (
            <Button
              className="rounded-xs flex h-8 cursor-pointer items-center border border-red-200 px-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950/40"
              onClick={() => onCancelCall(cust.id)}
              title="Cancel pending Optometrist request"
              variant="outline"
            >
              Cancel
            </Button>
          )}
        </div>
      );
    }

    if (cust.status === 'Test Completed') {
      const isRxComplete = isObjectiveRxComplete(cust.rxData);

      if (isRxComplete) {
        return (
          <Button
            className="h-8 gap-1.5 px-3 text-sm font-medium text-white shadow-sm cursor-pointer"
            onClick={() => onUpdateStatus(cust.id)}
            size="sm"
            variant="gradient"
            title="Complete consultation and sales checkout"
          >
            <CheckCircle2 size={14} />
            Completed
          </Button>
        );
      }

      return (
        <Button
          className="h-8 gap-1.5 px-3 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 shadow-sm cursor-pointer"
          onClick={() => {
            onSelectCustomer(cust.id);
            onSetEditingRx(true);
            onSetEditing(false);
          }}
          size="sm"
          title="Fill mandatory Rx values before completing"
        >
          <FileText size={14} />
          Edit Rx
        </Button>
      );
    }

    if (cust.status === 'Completed') {
      return (
        <Button
          className="rounded-xs flex h-8 cursor-not-allowed items-center gap-1.5 border-0 bg-muted px-4 text-sm font-medium text-muted-foreground opacity-100"
          disabled
          title="This customer consultation is completed"
        >
          Completed
        </Button>
      );
    }

    if (cust.status === 'Closed' || cust.status === 'Cancelled') {
      return (
        <Button
          className="rounded-xs flex h-8 cursor-not-allowed items-center gap-1.5 border-0 bg-muted px-4 text-sm font-medium text-muted-foreground opacity-100"
          disabled
          title="This request was cancelled"
        >
          Cancelled
        </Button>
      );
    }

    return (
      <Button
        className="flex h-8 cursor-pointer items-center gap-1.5 px-4 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disableRequest}
        onClick={() => onCreateTest(cust.id)}
        title={
          disableRequest
            ? 'You already have an active Optometrist request. Only one request is allowed at a time.'
            : 'Create a test for this customer'
        }
        variant="gradient"
      >
        <ClipboardPlus size={14} />
        Create Test
      </Button>
    );
  })();

  const isCreateTestState = cust.status === 'Created' || (!cust.status && !cust.callStartTime);

  return (
    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
      {primaryBtn}

      {/* ── ⋯ overflow menu ─────────────────────────────────────────────── */}
      {!isCreateTestState && (
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
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
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

            {/* Edit Rx */}
            <button
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
              onClick={() => {
                onSelectCustomer(cust.id);
                onSetEditingRx(true);
                onSetEditing(false);
              }}
              type="button"
            >
              <FileText className="shrink-0 text-emerald-600 dark:text-emerald-400" size={14} />
              <span>Edit Rx</span>
            </button>

            {/* Completed — only available for Test Completed when all RX_MANDATORY_FIELDS are filled */}
            {cust.status === 'Test Completed' && isObjectiveRxComplete(cust.rxData) && (
              <>
                <div className="my-1 h-px bg-border" />
                <button
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                  onClick={() => onUpdateStatus(cust.id)}
                  type="button"
                >
                  <CheckCircle2 className="shrink-0 text-indigo-600 dark:text-indigo-400" size={14} />
                  <span>Completed</span>
                </button>
              </>
            )}

            {/* Cancel — only available from the Queue tab, while the request is still pending */}
            {statusTab === 'Pending' && cust.status === 'Initiated' && onCancelCall && (
              <>
                <div className="my-1 h-px bg-border" />
                <button
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
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
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
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
      )}
    </div>
  );
}
