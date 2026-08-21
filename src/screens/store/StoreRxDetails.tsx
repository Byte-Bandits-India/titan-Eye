import { FileText } from 'lucide-react';
import * as React from 'react';

import type { Customer, RxValues, StoreRxDetailsProps } from '../../types';

import { updateCustomerAction } from '../../Actions/customerActions';
import { BackButton } from '../../components/shared/BackButton';
import { CardFrame } from '../../components/shared/CardFrame';
import { CustomerFeedbackImageBox } from '../../components/shared/CustomerFeedbackImageBox';
import { RxScrollPicker } from '../../components/shared/RxScrollPicker';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { useToast } from '../../components/ui/toast';
import { cn } from '../../lib/utils';
import {
  ADD_OPTIONS,
  ADD_REGEX,
  AXIS_OPTIONS,
  AXIS_REGEX,
  BASE_OPTIONS,
  CYL_OPTIONS,
  CYL_REGEX,
  emptyOptometristRxValues,
  emptyRxValues,
  optometristFields,
  optometristHeaders,
  PD_OPTIONS,
  PD_REGEX,
  POWER_OPTIONS,
  PRISM_OPTIONS,
  PRISM_REGEX,
  rxFields,
  rxHeaders,
  SPH_REGEX,
} from '../../options/Option';
import { useAppDispatch } from '../../store';

export function StoreRxDetails({ onBack, selectedCustomer }: StoreRxDetailsProps) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const [storeFeedback, setStoreFeedback] = React.useState(() => selectedCustomer?.storeFeedback || '');
  const [rxErrors, setRxErrors] = React.useState<Record<string, boolean>>({});

  const [rxForm, setRxForm] = React.useState(
    () =>
      selectedCustomer?.rxData || {
        autoRefLe: { ...emptyRxValues },
        autoRefRe: { ...emptyRxValues },
        pgpLe: { ...emptyRxValues },
        pgpRe: { ...emptyRxValues },
      }
  );

  const [optometristRxForm, setOptometristRxForm] = React.useState(() => {
    const optometristRx = selectedCustomer?.optometristRxData;

    return optometristRx
      ? { le: { ...optometristRx.le }, re: { ...optometristRx.re } }
      : { le: { ...emptyOptometristRxValues }, re: { ...emptyOptometristRxValues } };
  });

  const [prevCustomerId, setPrevCustomerId] = React.useState(selectedCustomer?.id);

  if (selectedCustomer?.id !== prevCustomerId) {
    setPrevCustomerId(selectedCustomer?.id);

    if (selectedCustomer) {
      setStoreFeedback(selectedCustomer.storeFeedback || '');
      setRxForm(
        selectedCustomer.rxData || {
          autoRefLe: { ...emptyRxValues },
          autoRefRe: { ...emptyRxValues },
          pgpLe: { ...emptyRxValues },
          pgpRe: { ...emptyRxValues },
        }
      );
      const optometristRx = selectedCustomer.optometristRxData;

      if (optometristRx) {
        setOptometristRxForm({
          le: { ...optometristRx.le },
          re: { ...optometristRx.re },
        });
      } else {
        setOptometristRxForm({
          le: { ...emptyOptometristRxValues },
          re: { ...emptyOptometristRxValues },
        });
      }
    }
  }

  const setRxField = (
    row: 'autoRefLe' | 'autoRefRe' | 'pgpLe' | 'pgpRe',
    field: keyof RxValues,
    val: string
  ) => {
    const cleanVal = field === 'base' ? val : val.replace(/[a-zA-Z]/g, '');
    setRxForm((prev) => ({
      ...prev,
      [row]: { ...prev[row], [field]: cleanVal },
    }));

    const key = `${row}.${field}`;

    if (rxErrors[key]) {
      setRxErrors((prev) => {
        const next = { ...prev };
        delete next[key];

        return next;
      });
    }
  };

  const validatePrescriptionFields = (): boolean => {
    const errors: Record<string, boolean> = {};
    const rows: ('autoRefLe' | 'autoRefRe' | 'pgpLe' | 'pgpRe')[] = [
      'autoRefRe',
      'autoRefLe',
      'pgpRe',
      'pgpLe',
    ];

    for (const row of rows) {
      const data = rxForm[row];

      if (data.sph && !SPH_REGEX.test(data.sph)) {
        errors[`${row}.sph`] = true;
      }

      if (data.cyl && !CYL_REGEX.test(data.cyl)) {
        errors[`${row}.cyl`] = true;
      }

      if (data.axis && !AXIS_REGEX.test(data.axis)) {
        errors[`${row}.axis`] = true;
      }

      if (data.pd && !PD_REGEX.test(data.pd)) {
        errors[`${row}.pd`] = true;
      }

      if (data.prism && !PRISM_REGEX.test(data.prism)) {
        errors[`${row}.prism`] = true;
      }

      if (data.add && !ADD_REGEX.test(data.add)) {
        errors[`${row}.add`] = true;
      }
    }

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

  const handleSaveRx = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomer) {
      return;
    }

    if (!validatePrescriptionFields()) {
      toast({
        description: 'Some prescription fields contain invalid values. Please fix them before saving.',
        title: 'Validation Error',
        type: 'error',
      });

      return;
    }

    const updatedCustomer: Customer = {
      ...selectedCustomer,
      lastUpdatedOn: buildTimestamp(),
      optometristRxData: optometristRxForm,
      rxData: rxForm,
      storeFeedback,
    };

    try {
      await dispatch(updateCustomerAction(selectedCustomer.id, updatedCustomer));
      toast({
        description: 'Prescription details updated successfully.',
        title: 'Rx Data Saved',
        type: 'success',
      });
      onBack();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      toast({
        description: error.message || 'Failed to update prescription data.',
        title: 'Error Saving Rx',
        type: 'error',
      });
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-4 px-3 py-4 duration-200 animate-in fade-in sm:space-y-6 sm:px-6 sm:py-8 md:px-8">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-md">
            <FileText className="text-white" size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-foreground sm:text-xl">
              Prescription (RX) Management
            </h1>
            <p className="truncate text-xs font-medium text-muted-foreground">
              Patient: <span className="font-medium text-foreground">{selectedCustomer?.name}</span> (
              {selectedCustomer?.id}) — {selectedCustomer?.storeName}
            </p>
          </div>
        </div>

        <BackButton onClick={onBack} />
      </div>

      <CardFrame className="p-3 sm:p-6 md:p-8">
        <form className="space-y-6 sm:space-y-8" onSubmit={handleSaveRx}>
          <div className="space-y-4">
            <div className="shadow-xs w-full overflow-x-auto rounded-lg border border-slate-300 dark:border-zinc-700">
              <Table className="w-full min-w-[650px] table-fixed border-collapse text-center text-xs">
                <colgroup>
                  <col className="w-[100px]" />
                  <col className="w-[60px]" />
                  {rxHeaders.map((h) => (
                    <col key={h} />
                  ))}
                </colgroup>
                <TableHeader className="border-slate-400 bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 [&_tr]:border-b">
                  <TableRow className="border-b border-slate-400 hover:bg-slate-100/50 dark:border-zinc-700 dark:hover:bg-zinc-800/50">
                    <TableHead
                      className="border-b border-slate-400 py-2.5 text-center text-sm font-medium uppercase tracking-wider text-slate-900 dark:border-zinc-700 dark:text-zinc-100"
                      colSpan={9}
                    >
                      Objective prescription
                    </TableHead>
                  </TableRow>
                  <TableRow className="border-b border-slate-400 bg-slate-100/50 hover:bg-slate-100/50 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:bg-zinc-800/50">
                    <TableHead
                      className="border-r border-slate-400 py-1 text-center text-sm font-medium text-blue-600 dark:border-zinc-700 dark:text-blue-400"
                      colSpan={2}
                    ></TableHead>
                    <TableHead className="border-r border-slate-400 py-1 text-center text-sm font-medium text-blue-600 dark:border-zinc-700 dark:text-blue-400">
                      *
                    </TableHead>
                    <TableHead className="border-r border-slate-400 py-1 text-center text-sm font-medium text-blue-600 dark:border-zinc-700 dark:text-blue-400">
                      *
                    </TableHead>
                    <TableHead className="border-r border-slate-400 py-1 text-center text-sm font-medium text-blue-600 dark:border-zinc-700 dark:text-blue-400">
                      *
                    </TableHead>
                    <TableHead className="border-r border-slate-400 py-1 text-center text-sm font-medium text-blue-600 dark:border-zinc-700 dark:text-blue-400">
                      *
                    </TableHead>
                    <TableHead className="border-r border-slate-400 py-1 text-center text-sm font-medium text-blue-600 dark:border-zinc-700 dark:text-blue-400"></TableHead>
                    <TableHead className="border-r border-slate-400 py-1 text-center text-sm font-medium text-blue-600 dark:border-zinc-700 dark:text-blue-400"></TableHead>
                    <TableHead className="py-1 text-center text-sm font-medium text-blue-600 dark:text-blue-400"></TableHead>
                  </TableRow>
                  <TableRow className="border-b border-slate-400 bg-slate-100/70 hover:bg-slate-100/50 dark:border-zinc-700 dark:bg-zinc-800/70 dark:hover:bg-zinc-800/50">
                    <TableHead
                      className="whitespace-nowrap border-r border-slate-400 px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-[#1a2b6e] dark:border-zinc-700 dark:text-blue-400"
                      colSpan={2}
                    >
                      R X
                    </TableHead>
                    {rxHeaders.map((h) => (
                      <TableHead
                        className="border-r border-slate-400 px-3 py-2 text-center text-xs font-medium text-[#1a2b6e] last:border-r-0 dark:border-zinc-700 dark:text-blue-400"
                        key={h}
                      >
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(['autoRefRe', 'autoRefLe', 'pgpRe', 'pgpLe'] as const).map((row, rowIdx) => (
                    <TableRow
                      className={rowIdx < 3 ? 'border-b border-slate-400 dark:border-zinc-700' : 'border-0'}
                      key={row}
                    >
                      {rowIdx % 2 === 0 && (
                        <TableCell
                          className="w-[100px] animate-none border-b border-r border-slate-400 bg-slate-50/50 px-3 py-4 text-center text-xs font-medium text-[#1a2b6e] dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-blue-400"
                          rowSpan={2}
                        >
                          {rowIdx < 2 ? (
                            'Auto Ref'
                          ) : (
                            <>
                              PGP
                              <br />
                              Old RX
                              <br />
                              Outside RX
                            </>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="w-[60px] animate-none whitespace-nowrap border-b border-r border-slate-400 bg-slate-50/50 px-3 py-3 text-center text-xs font-medium text-[#1a2b6e] dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-blue-400">
                        {rowIdx % 2 === 0 ? 'R E' : 'L E'}
                      </TableCell>
                      {rxFields.map((field, idx) => {
                        const errKey = `${row}.${field}`;
                        const hasErr = !!rxErrors[errKey];

                        let optionsList: string[] = [];

                        if (field === 'sph') {
                          optionsList = POWER_OPTIONS;
                        } else if (field === 'cyl') {
                          optionsList = CYL_OPTIONS;
                        } else if (field === 'add') {
                          optionsList = ADD_OPTIONS;
                        } else if (field === 'axis') {
                          optionsList = AXIS_OPTIONS;
                        } else if (field === 'pd') {
                          optionsList = PD_OPTIONS;
                        } else if (field === 'prism') {
                          optionsList = PRISM_OPTIONS;
                        } else if (field === 'base') {
                          optionsList = BASE_OPTIONS;
                        }

                        return (
                          <TableCell
                            className={cn(
                              rowIdx < 3 ? 'border-b border-slate-400 dark:border-zinc-700' : '',
                              'group relative p-0',
                              idx < 6 ? 'border-r border-slate-400 dark:border-zinc-700' : ''
                            )}
                            key={field}
                          >
                            <RxScrollPicker
                              defaultValue={
                                (row === 'autoRefRe' || row === 'autoRefLe') &&
                                (field === 'sph' || field === 'cyl' || field === 'axis' || field === 'pd')
                                  ? '____'
                                  : field === 'prism' || field === 'base'
                                    ? '0'
                                    : '0.00'
                              }
                              hasError={hasErr}
                              onChange={(val) => setRxField(row, field, val)}
                              options={optionsList}
                              value={rxForm[row][field] || ''}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="shadow-xs overflow-x-auto rounded-lg border border-slate-300 dark:border-zinc-700">
              <Table className="w-full min-w-[550px] table-fixed border-collapse text-center text-xs">
                <TableHeader className="border-slate-400 bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 [&_tr]:border-b">
                  <TableRow className="border-b border-slate-400 hover:bg-slate-100/50 dark:border-zinc-700 dark:hover:bg-zinc-800/50">
                    <TableHead
                      className="border-b border-slate-400 py-2.5 text-center text-sm font-medium uppercase tracking-wider text-slate-900 dark:border-zinc-700 dark:text-zinc-100"
                      colSpan={8}
                    >
                      Subjective/Final
                    </TableHead>
                  </TableRow>
                  <TableRow className="border-b border-slate-400 bg-slate-100/70 hover:bg-slate-100/50 dark:border-zinc-700 dark:bg-zinc-800/70 dark:hover:bg-zinc-800/50">
                    <TableHead className="w-[70px] whitespace-nowrap border-r border-slate-400 px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-[#1a2b6e] dark:border-zinc-700 dark:text-blue-400">
                      R X
                    </TableHead>
                    {optometristHeaders.map((h) => (
                      <TableHead
                        className="border-r border-slate-400 px-3 py-2 text-center text-xs font-medium text-[#1a2b6e] last:border-r-0 dark:border-zinc-700 dark:text-blue-400"
                        key={h}
                      >
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(['re', 'le'] as const).map((eye, idx) => (
                    <TableRow
                      className={idx === 0 ? 'border-b border-slate-400 dark:border-zinc-700' : 'border-0'}
                      key={eye}
                    >
                      <TableCell className="w-[70px] animate-none whitespace-nowrap border-r border-slate-400 bg-slate-50/50 py-3 text-center text-xs font-medium text-[#1a2b6e] dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-blue-400">
                        {eye === 're' ? 'R E' : 'L E'}
                      </TableCell>
                      {optometristFields.map((field, fIdx) => (
                        <TableCell
                          className={`${idx === 0 ? 'border-b border-slate-400 dark:border-zinc-700' : ''} p-0 ${fIdx < 6 ? 'border-r border-slate-400 dark:border-zinc-700' : ''}`}
                          key={field}
                        >
                          <input
                            className="h-full w-full cursor-not-allowed border-0 bg-slate-50 px-3 py-2.5 text-center text-xs font-medium text-muted-foreground outline-none dark:bg-zinc-900"
                            disabled
                            type="text"
                            value={optometristRxForm[eye][field] || ''}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
            <div className="space-y-1.5 sm:col-span-3">
              <label className="text-[14px] font-medium uppercase tracking-wider text-foreground">
                Store Action / Feedback
              </label>
              <textarea
                className="h-[176px] w-full resize-none rounded-md border border-input bg-background p-3 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(e) => setStoreFeedback(e.target.value)}
                placeholder="Enter store action, clinical notes, or remarks..."
                value={storeFeedback}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-[14px] font-medium uppercase tracking-wider text-foreground">
                Attachment 1
              </label>
              <CustomerFeedbackImageBox
                customerId={selectedCustomer?.id ?? ''}
                hasImage={!!selectedCustomer?.storeFeedbackImage1}
                slot={1}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-[14px] font-medium uppercase tracking-wider text-foreground">
                Attachment 2
              </label>
              <CustomerFeedbackImageBox
                customerId={selectedCustomer?.id ?? ''}
                hasImage={!!selectedCustomer?.storeFeedbackImage2}
                slot={2}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse items-center justify-end gap-3 border-t border-border pt-4 sm:flex-row">
            <Button
              className="h-10 w-full cursor-pointer rounded-[50px] border-border px-5 text-xs font-medium text-muted-foreground shadow-sm hover:bg-muted sm:w-auto"
              onClick={onBack}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="active:scale-98 h-10 w-full cursor-pointer rounded-[50px] px-6 text-xs font-medium shadow-md transition-all sm:w-auto"
              type="submit"
              variant="gradient"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </CardFrame>
    </main>
  );
}
