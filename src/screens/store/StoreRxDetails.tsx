import { ChevronDown, ChevronLeft, FileText } from 'lucide-react';
import * as React from 'react';
import ReactDOM from 'react-dom';

import type { Customer, RxValues, StoreRxDetailsProps } from '../../types';

import { updateCustomerAction } from '../../Actions/customerActions';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { ScrollArea } from '../../components/ui/scroll-area';
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
  emptyOptomRxValues,
  emptyRxValues,
  optomFields,
  optomHeaders,
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

interface RxScrollPickerProps {
  defaultValue?: string;
  hasError?: boolean;
  onChange: (val: string) => void;
  options: string[];
  value: string;
}

export function StoreRxDetails({ onBack, selectedCustomer }: StoreRxDetailsProps) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const [storeFeedback, setStoreFeedback] = React.useState('');
  const [rxErrors, setRxErrors] = React.useState<Record<string, boolean>>({});

  const [rxForm, setRxForm] = React.useState({
    autoRefLe: { ...emptyRxValues },
    autoRefRe: { ...emptyRxValues },
    pgpLe: { ...emptyRxValues },
    pgpRe: { ...emptyRxValues },
  });

  const [optomRxForm, setOptomRxForm] = React.useState({
    le: { ...emptyOptomRxValues },
    re: { ...emptyOptomRxValues },
  });

  const [prevSelectedCustomer, setPrevSelectedCustomer] = React.useState(selectedCustomer);

  if (selectedCustomer !== prevSelectedCustomer) {
    setPrevSelectedCustomer(selectedCustomer);

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
      const optomRx = selectedCustomer.optomRxData;

      if (optomRx) {
        setOptomRxForm({
          le: { ...optomRx.le },
          re: { ...optomRx.re },
        });
      } else {
        setOptomRxForm({
          le: { ...emptyOptomRxValues },
          re: { ...emptyOptomRxValues },
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
      optomRxData: optomRxForm,
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
      const error = err as Error;
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
              Patient: <span className="font-bold text-foreground">{selectedCustomer?.name}</span> (
              {selectedCustomer?.id}) — {selectedCustomer?.storeName}
            </p>
          </div>
        </div>

        <Button
          className="active:scale-98 flex h-9 shrink-0 cursor-pointer items-center gap-1.5 self-start rounded-[50px] border-border bg-card px-4 text-xs font-bold text-muted-foreground shadow-sm transition-all hover:bg-muted sm:h-10 sm:self-auto"
          onClick={onBack}
          type="button"
          variant="outline"
        >
          <ChevronLeft size={16} />
          Back
        </Button>
      </div>

      <Card className="rounded-2xl border border-border bg-card p-3 shadow-lg sm:p-6 md:p-8">
        <form className="space-y-6 sm:space-y-8" onSubmit={handleSaveRx}>
          <div className="space-y-4">
            <div className="shadow-xs w-full overflow-x-auto rounded-lg border border-slate-300 dark:border-zinc-700">
              <Table className="w-full min-w-[650px] border-collapse text-center text-xs">
                <TableHeader className="border-slate-400 bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 [&_tr]:border-b">
                  <TableRow className="border-b border-slate-400 hover:bg-slate-100/50 dark:border-zinc-700 dark:hover:bg-zinc-800/50">
                    <TableHead
                      className="border-b border-slate-400 py-2.5 text-center text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:border-zinc-700 dark:text-zinc-100"
                      colSpan={9}
                    >
                      Store Login
                    </TableHead>
                  </TableRow>
                  <TableRow className="border-b border-slate-400 bg-slate-100/50 hover:bg-slate-100/50 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:bg-zinc-800/50">
                    <TableHead
                      className="border-r border-slate-400 py-1 text-center text-sm font-bold text-blue-600 dark:border-zinc-700 dark:text-blue-400"
                      colSpan={2}
                    ></TableHead>
                    <TableHead className="border-r border-slate-400 py-1 text-center text-sm font-bold text-blue-600 dark:border-zinc-700 dark:text-blue-400">
                      *
                    </TableHead>
                    <TableHead className="border-r border-slate-400 py-1 text-center text-sm font-bold text-blue-600 dark:border-zinc-700 dark:text-blue-400">
                      *
                    </TableHead>
                    <TableHead className="border-r border-slate-400 py-1 text-center text-sm font-bold text-blue-600 dark:border-zinc-700 dark:text-blue-400">
                      *
                    </TableHead>
                    <TableHead className="border-r border-slate-400 py-1 text-center text-sm font-bold text-blue-600 dark:border-zinc-700 dark:text-blue-400"></TableHead>
                    <TableHead className="border-r border-slate-400 py-1 text-center text-sm font-bold text-blue-600 dark:border-zinc-700 dark:text-blue-400"></TableHead>
                    <TableHead className="border-r border-slate-400 py-1 text-center text-sm font-bold text-blue-600 dark:border-zinc-700 dark:text-blue-400"></TableHead>
                    <TableHead className="py-1 text-center text-sm font-bold text-blue-600 dark:text-blue-400"></TableHead>
                  </TableRow>
                  <TableRow className="border-b border-slate-400 bg-slate-100/70 hover:bg-slate-100/50 dark:border-zinc-700 dark:bg-zinc-800/70 dark:hover:bg-zinc-800/50">
                    <TableHead
                      className="whitespace-nowrap border-r border-slate-400 px-3 py-2 text-center text-xs font-black uppercase tracking-wider text-[#1a2b6e] dark:border-zinc-700 dark:text-blue-400"
                      colSpan={2}
                    >
                      R X
                    </TableHead>
                    {rxHeaders.map((h) => (
                      <TableHead
                        className="border-r border-slate-400 px-3 py-2 text-center text-xs font-black text-[#1a2b6e] last:border-r-0 dark:border-zinc-700 dark:text-blue-400"
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
                          className="w-[100px] animate-none border-b border-r border-slate-400 bg-slate-50/50 px-3 py-4 text-center text-xs font-black text-[#1a2b6e] dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-blue-400"
                          rowSpan={2}
                        >
                          {rowIdx < 2 ? 'Auto Ref' : 'PGP'}
                        </TableCell>
                      )}
                      <TableCell className="w-[60px] animate-none whitespace-nowrap border-b border-r border-slate-400 bg-slate-50/50 px-3 py-3 text-center text-xs font-black text-[#1a2b6e] dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-blue-400">
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
                                (field as string) === 'axis' ||
                                (field as string) === 'prism' ||
                                (field as string) === 'base'
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
              <Table className="w-full min-w-[550px] border-collapse text-center text-xs">
                <TableHeader className="border-slate-400 bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 [&_tr]:border-b">
                  <TableRow className="border-b border-slate-400 hover:bg-slate-100/50 dark:border-zinc-700 dark:hover:bg-zinc-800/50">
                    <TableHead
                      className="border-b border-slate-400 py-2.5 text-center text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:border-zinc-700 dark:text-zinc-100"
                      colSpan={8}
                    >
                      Optom Login
                    </TableHead>
                  </TableRow>
                  <TableRow className="border-b border-slate-400 bg-slate-100/70 hover:bg-slate-100/50 dark:border-zinc-700 dark:bg-zinc-800/70 dark:hover:bg-zinc-800/50">
                    <TableHead className="whitespace-nowrap border-r border-slate-400 px-3 py-2 text-center text-xs font-black uppercase tracking-wider text-[#1a2b6e] dark:border-zinc-700 dark:text-blue-400">
                      R X
                    </TableHead>
                    {optomHeaders.map((h) => (
                      <TableHead
                        className="border-r border-slate-400 px-3 py-2 text-center text-xs font-black text-[#1a2b6e] last:border-r-0 dark:border-zinc-700 dark:text-blue-400"
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
                      <TableCell className="animate-none whitespace-nowrap border-r border-slate-400 bg-slate-50/50 py-3 text-center text-xs font-black text-[#1a2b6e] dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-blue-400">
                        {eye === 're' ? 'R E' : 'L E'}
                      </TableCell>
                      {optomFields.map((field, fIdx) => (
                        <TableCell
                          className={`${idx === 0 ? 'border-b border-slate-400 dark:border-zinc-700' : ''} p-0 ${fIdx < 6 ? 'border-r border-slate-400 dark:border-zinc-700' : ''}`}
                          key={field}
                        >
                          <input
                            className="h-full w-full cursor-not-allowed border-0 bg-slate-50 px-3 py-2.5 text-center text-xs font-medium text-muted-foreground outline-none dark:bg-zinc-900"
                            disabled
                            type="text"
                            value={optomRxForm[eye][field] || ''}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground">
              Store Action / Feedback
            </label>
            <RichTextEditor
              onChange={setStoreFeedback}
              placeholder="Enter store action, clinical notes, or remarks..."
              value={storeFeedback}
            />
          </div>

          <div className="flex flex-col-reverse items-center justify-end gap-3 border-t border-border pt-4 sm:flex-row">
            <Button
              className="h-10 w-full cursor-pointer rounded-[50px] border-border px-5 text-xs font-bold text-muted-foreground shadow-sm hover:bg-muted sm:w-auto"
              onClick={onBack}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="active:scale-98 h-10 w-full cursor-pointer rounded-[50px] px-6 text-xs font-bold shadow-md transition-all sm:w-auto"
              type="submit"
              variant="gradient"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}

function RxScrollPicker({ defaultValue = '0.00', hasError, onChange, options, value }: RxScrollPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [cardPos, setCardPos] = React.useState<{ left: number; top: number }>({
    left: 0,
    top: 0,
  });
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const ITEM_H = 32;

  const displayValue = value || defaultValue;

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCardPos({
        left: rect.left + rect.width / 2,
        top: rect.bottom + 4,
      });
    }

    setOpen((o) => !o);
  };

  React.useEffect(() => {
    if (!open || !listRef.current) {
      return;
    }

    const target = displayValue;
    const idx = options.indexOf(target);

    if (idx !== -1) {
      listRef.current.scrollTop = Math.max(0, idx * ITEM_H - ITEM_H * 3);
    }
  }, [open, options, displayValue]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const update = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setCardPos({ left: rect.left + rect.width / 2, top: rect.bottom + 4 });
      }
    };

    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);

    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  const handleSelect = (opt: string) => {
    onChange(opt);
    setOpen(false);
  };

  const dropdownPortal = open
    ? ReactDOM.createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[9999]"
            style={{
              left: cardPos.left,
              top: cardPos.top,
              transform: 'translateX(-50%)',
            }}
          >
            <Card className="w-36 overflow-hidden rounded-xl border border-border bg-card p-0 shadow-2xl">
              <div className="flex items-center justify-center gap-1 border-b border-border bg-slate-100 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-foreground dark:bg-zinc-800">
                <span>Minus ( − )</span>
              </div>
              <ScrollArea className="h-56 w-full">
                <div className="flex h-56 flex-col overflow-auto" ref={listRef}>
                  {options.map((opt) => (
                    <button
                      className={cn(
                        'w-full cursor-pointer px-3 py-2 text-center font-mono text-xs text-foreground transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/40',
                        opt === displayValue && 'bg-blue-500 font-black text-white',
                        (opt === '0.00' || opt === '0') &&
                          opt !== displayValue &&
                          'border-y border-slate-300 bg-slate-100 font-black dark:border-zinc-600 dark:bg-zinc-800'
                      )}
                      key={opt}
                      onClick={() => handleSelect(opt)}
                      type="button"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex items-center justify-center gap-1 border-t border-border bg-slate-100 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-foreground dark:bg-zinc-800">
                <span>Plus ( + )</span>
              </div>
            </Card>
          </div>
        </>,
        document.body
      )
    : null;

  return (
    <div className="group relative flex h-full w-full flex-col items-center justify-center">
      <button
        className={cn(
          'flex h-9 w-full items-center justify-center font-mono text-xs font-semibold text-foreground transition-colors',
          'hover:bg-slate-100/60 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:hover:bg-zinc-800/60',
          hasError && 'bg-rose-50 font-bold text-rose-600',
          !value && !hasError && 'font-semibold text-foreground'
        )}
        onClick={handleOpen}
        ref={triggerRef}
        type="button"
      >
        <span>{displayValue}</span>
        <ChevronDown className="ml-1 opacity-40" size={10} />
      </button>
      {dropdownPortal}
    </div>
  );
}
