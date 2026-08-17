import { Loader2, Phone, PhoneOff } from 'lucide-react';
import * as React from 'react';

import type { CallSessionPayload, Customer, OptometristRxValues } from '../../../types';

import { updateCustomerAction } from '../../../Actions/customerActions';
import { RxScrollPicker } from '../../../components/shared/RxScrollPicker';
import { TeamsCallModal } from '../../../components/shared/TeamsCallModal';
import { Input } from '../../../components/ui/input';
import { Sheet, SheetBody, SheetContent, SheetFooter } from '../../../components/ui/sheet';
import { useToast } from '../../../components/ui/toast';
import {
  ADD_OPTIONS,
  ADD_REGEX,
  AXIS_OPTIONS,
  AXIS_REGEX,
  BASE_OPTIONS,
  CYL_OPTIONS,
  CYL_REGEX,
  emptyOptometristRxValues,
  optometristFields,
  optometristHeaders,
  POWER_OPTIONS,
  PRISM_OPTIONS,
  PRISM_REGEX,
  SPH_REGEX,
} from '../../../options/Option';
import { useAppDispatch } from '../../../store';
import { apiClient } from '../../../Util/apiClient';

interface OptometristCallDrawerProps {
  customer: Customer;
  minimized: boolean;
  onClose: () => void;
  onMinimize: () => void;
}

const OPTIONS_BY_FIELD: Partial<Record<keyof OptometristRxValues, string[]>> = {
  add: ADD_OPTIONS,
  axis: AXIS_OPTIONS,
  base: BASE_OPTIONS,
  cyl: CYL_OPTIONS,
  prism: PRISM_OPTIONS,
  sph: POWER_OPTIONS,
};

const REGEX_BY_FIELD: Partial<Record<keyof OptometristRxValues, RegExp>> = {
  add: ADD_REGEX,
  axis: AXIS_REGEX,
  cyl: CYL_REGEX,
  prism: PRISM_REGEX,
  sph: SPH_REGEX,
};

export function OptometristCallDrawer({
  customer,
  minimized,
  onClose,
  onMinimize,
}: OptometristCallDrawerProps) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const [re, setRe] = React.useState<OptometristRxValues>(
    customer.optometristRxData?.re || { ...emptyOptometristRxValues }
  );
  const [le, setLe] = React.useState<OptometristRxValues>(
    customer.optometristRxData?.le || { ...emptyOptometristRxValues }
  );
  const [notes, setNotes] = React.useState(customer.optometristFeedback || '');
  const [rxErrors, setRxErrors] = React.useState<Record<string, boolean>>({});
  const [callSession, setCallSession] = React.useState<CallSessionPayload | null>(null);
  const [callActive, setCallActive] = React.useState(false);
  const [isStartingCall, setIsStartingCall] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleEmbeddedCallClose = React.useCallback(() => setCallActive(false), []);

  const handleStartCall = async () => {
    setIsStartingCall(true);

    try {
      const { data } = await apiClient.post<CallSessionPayload>('/calls/start', {
        customerId: customer.id,
      });
      setCallSession(data);
      setCallActive(true);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({
        description: err.message || 'Failed to reach the store.',
        title: 'Call Failed',
        type: 'error',
      });
    } finally {
      setIsStartingCall(false);
    }
  };

  const endCallIfActive = React.useCallback(async () => {
    if (!callActive || !callSession) {
      return;
    }

    setCallActive(false);

    try {
      await apiClient.post('/calls/end', { customerId: callSession.customerId });
    } catch (err) {
      console.error('[OptometristCallDrawer] Failed to send /calls/end request:', err);
    }

    try {
      await apiClient.post(`/customers/${encodeURIComponent(callSession.customerId)}/end-call`);
    } catch (err) {
      console.error('[OptometristCallDrawer] Failed to update customer end-call state:', err);
    }
  }, [callActive, callSession]);

  const handleMinimize = async () => {
    await endCallIfActive();
    onMinimize();
  };

  const validate = (): boolean => {
    const errors: Record<string, boolean> = {};

    (['re', 'le'] as const).forEach((eye) => {
      const data = eye === 're' ? re : le;

      optometristFields.forEach((field) => {
        const regex = REGEX_BY_FIELD[field];
        const val = data[field];

        if (regex && val && !regex.test(val)) {
          errors[`${eye}.${field}`] = true;
        }
      });
    });

    setRxErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const buildTimestamp = (): string =>
    new Date().toLocaleString('en-US', {
      day: 'numeric',
      hour: 'numeric',
      hour12: true,
      minute: '2-digit',
      month: 'short',
      second: '2-digit',
      year: 'numeric',
    });

  const handleCompleteAndSave = async () => {
    if (!validate()) {
      toast({
        description: 'Some prescription fields contain invalid values. Please fix them before saving.',
        title: 'Validation Error',
        type: 'error',
      });

      return;
    }

    setIsSaving(true);

    try {
      await endCallIfActive();

      const updatedCustomer: Customer = {
        ...customer,
        callActive: false,
        lastUpdatedOn: buildTimestamp(),
        optometristFeedback: notes,
        optometristRxData: { le, re },
        status: 'Completed',
      };

      await dispatch(updateCustomerAction(customer.id, updatedCustomer));
      toast({
        description: 'Subjective/Final prescription saved and consultation marked as completed.',
        title: 'Saved',
        type: 'success',
      });
      onClose();
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({
        description: err.message || 'Failed to save prescription data.',
        title: 'Error Saving',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderValueCell = (eye: 'le' | 're', field: keyof OptometristRxValues) => {
    const data = eye === 're' ? re : le;
    const setData = eye === 're' ? setRe : setLe;
    const options = OPTIONS_BY_FIELD[field];
    const hasError = !!rxErrors[`${eye}.${field}`];

    if (!options) {
      return (
        <Input
          className={hasError ? 'border-rose-400 text-center text-xs' : 'text-center text-xs'}
          onChange={(e) => setData({ ...data, [field]: e.target.value })}
          value={data[field]}
        />
      );
    }

    return (
      <RxScrollPicker
        hasError={hasError}
        onChange={(val) => setData({ ...data, [field]: val })}
        options={options}
        value={data[field]}
      />
    );
  };

  return (
    <Sheet onOpenChange={(open) => !open && handleMinimize()} open={!minimized}>
      <SheetContent hideCloseButton={false} side="bottom">
        <div className="flex h-full flex-col lg:flex-row">
          <div className="min-h-[45vh] flex-1 lg:min-h-0">
            {callSession && callActive ? (
              <TeamsCallModal onClose={handleEmbeddedCallClose} session={callSession} variant="embedded" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-slate-900">
                {callSession && (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <PhoneOff size={28} />
                    <p className="text-sm font-medium">Call ended</p>
                  </div>
                )}

                <button
                  className="active:scale-98 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-6 text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isStartingCall}
                  onClick={handleStartCall}
                  type="button"
                >
                  {isStartingCall ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone size={16} />}
                  {callSession ? 'Call Again' : 'Call'}
                </button>
                <p className="text-xs text-slate-400">Ring the store to start the video consultation.</p>
              </div>
            )}
          </div>

          <div className="flex w-full flex-col border-t border-border lg:w-[440px] lg:border-l lg:border-t-0">
            <SheetBody className="p-4 sm:p-6">
              <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-foreground">
                Subjective / Final
              </h2>

              <div className="space-y-2">
                {optometristFields.map((field, idx) => (
                  <div className="grid grid-cols-3 items-center gap-2" key={field}>
                    {renderValueCell('re', field)}
                    <p className="text-center text-xs font-medium text-muted-foreground">
                      {optometristHeaders[idx]}
                    </p>
                    {renderValueCell('le', field)}
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-foreground">
                  Optometrist Notes
                </label>
                <textarea
                  className="min-h-[120px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter clinical notes, remarks, or advice for the patient..."
                  value={notes}
                />
              </div>
            </SheetBody>

            <SheetFooter>
              <button
                className="active:scale-98 flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 px-5 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
                onClick={handleCompleteAndSave}
                type="button"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Complete and save
              </button>
            </SheetFooter>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
