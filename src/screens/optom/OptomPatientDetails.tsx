import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Monitor,
  Phone,
  User,
  UserCircle,
  Video,
} from 'lucide-react';
import * as React from 'react';
import ReactDOM from 'react-dom';

import type { Customer, CustomerStatus, OptomPatientDetailsProps, OptomRxValues, RxValues } from '../../types';

import { endCallAction, initiateCallAction, updateCustomerAction } from '../../Actions/customerActions';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { ScrollArea } from '../../components/ui/scroll-area';
import { LegacySelect as Select } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { useToast } from '../../components/ui/toast';
import { cn } from '../../lib/utils';
import {
  ADD_OPTIONS, AXIS_OPTIONS, BASE_OPTIONS, CYL_OPTIONS,
  optomFields, optomHeaders, POWER_OPTIONS, PRISM_OPTIONS, rxFields, rxHeaders,
} from '../../options/Option';
import { useAppDispatch, useAppSelector } from '../../store';
import { openTeamsCallWindow } from '../../Util/teamsCall';

interface RxScrollPickerProps {
  defaultValue?: string;
  onChange: (val: string) => void;
  options: string[];
  value: string;
}

function RxScrollPicker({ defaultValue = '0.00', onChange, options, value }: RxScrollPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [cardPos, setCardPos] = React.useState<{ left: number; top: number; }>({ left: 0, top: 0 });
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
    if (!open || !listRef.current) {return;}

    const target = displayValue;
    const idx = options.indexOf(target);

    if (idx !== -1) {
      listRef.current.scrollTop = Math.max(0, idx * ITEM_H - ITEM_H * 3);
    }
  }, [open, options, displayValue]);

  React.useEffect(() => {
    if (!open) {return;}

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
            style={{ left: cardPos.left, top: cardPos.top, transform: 'translateX(-50%)' }}
          >
            <Card className="w-36 rounded-xl border border-border shadow-2xl overflow-hidden bg-card p-0">
              <div className="bg-slate-100 dark:bg-zinc-800 border-b border-border py-1.5 flex items-center justify-center gap-1 text-[10px] font-extrabold text-foreground uppercase tracking-widest">
                <ChevronUp size={10} />
                <span>Minus ( − )</span>
              </div>
              <ScrollArea className="h-56 w-full">
                <div className="flex flex-col overflow-auto h-56" ref={listRef}>
                  {options.map((opt) => (
                    <button
                      className={cn(
                        'w-full text-center font-mono text-xs py-2 px-3 transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer text-foreground',
                        opt === displayValue && 'bg-blue-500 text-white font-black',
                        (opt === '0.00' || opt === '0') && opt !== displayValue && 'bg-slate-100 dark:bg-zinc-800 font-black border-y border-slate-300 dark:border-zinc-600'
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
              <div className="bg-slate-100 dark:bg-zinc-800 border-t border-border py-1.5 flex items-center justify-center gap-1 text-[10px] font-extrabold text-foreground uppercase tracking-widest">
                <ChevronDown size={10} />
                <span>Plus ( + )</span>
              </div>
            </Card>
          </div>
        </>,
        document.body
      )
    : null;

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full group">
      <button
        className={cn(
          'w-full h-9 flex items-center justify-center font-mono text-xs font-semibold text-foreground transition-colors',
          'hover:bg-slate-100/60 dark:hover:bg-zinc-800/60 focus:outline-none focus:ring-1 focus:ring-blue-500',
          !value && 'text-foreground font-semibold'
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

const emptyRxValues: RxValues = { add: '', axis: '', base: '', cyl: '', pd: '', prism: '', sph: '' };
const emptyOptomRxValues: OptomRxValues = { add: '', axis: '', base: '', cyl: '', prism: '', sph: '', va: '' };

export function OptomPatientDetails({
  onBack,
  selectedCustomer,
}: OptomPatientDetailsProps) {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const [isCallLoading, setIsCallLoading] = React.useState(false);
  const currentUserName = user?.name || '';

  const isTakenByMe = !!selectedCustomer?.callActive && selectedCustomer?.callTakenBy === currentUserName;

  const [form, setForm] = React.useState({
    activeProfile: false,
    age: '',
    customerType: 'New',
    gender: 'Male',
    mobile: '',
    name: '',
    optomFeedback: '',
    preferredLanguage: 'English',
    status: 'Created' as CustomerStatus,
    storeFeedback: '',
  });

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

  React.useEffect(() => {
    if (selectedCustomer) {
      setForm({
        activeProfile: selectedCustomer.activeProfile || false,
        age: selectedCustomer.age || '',
        customerType: selectedCustomer.customerType || 'New',
        gender: selectedCustomer.gender || 'Male',
        mobile: selectedCustomer.mobile || '',
        name: selectedCustomer.name || '',
        optomFeedback: selectedCustomer.optomFeedback || '',
        preferredLanguage: selectedCustomer.preferredLanguage || 'English',
        status: selectedCustomer.status,
        storeFeedback: selectedCustomer.storeFeedback || '',
      });
      setRxForm(selectedCustomer.rxData || {
        autoRefLe: { ...emptyRxValues },
        autoRefRe: { ...emptyRxValues },
        pgpLe: { ...emptyRxValues },
        pgpRe: { ...emptyRxValues },
      });
      setOptomRxForm(selectedCustomer.optomRxData || {
        le: { ...emptyOptomRxValues },
        re: { ...emptyOptomRxValues },
      });
    }
  }, [selectedCustomer]);

  const setField = (field: string) => (val: boolean | string) => {
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const setOptomRxField = (eye: 'le' | 're', field: keyof OptomRxValues, val: string) => {
    const cleanVal = field === 'base' ? val : val.replace(/[a-zA-Z]/g, '');
    setOptomRxForm((prev) => ({
      ...prev,
      [eye]: { ...prev[eye], [field]: cleanVal },
    }));
  };

  const buildTimestamp = (): string =>
    new Date().toLocaleString('en-US', {
      day: 'numeric', hour: 'numeric', hour12: true,
      minute: '2-digit', month: 'short', second: '2-digit', year: 'numeric',
    });

  const buildUpdatedCustomer = (): Customer | null => {
    if (!selectedCustomer) {return null;}

    return {
      ...selectedCustomer,
      activeProfile: form.activeProfile,
      age: form.age,
      customerType: form.customerType,
      gender: form.gender,
      lastUpdatedOn: buildTimestamp(),
      mobile: form.mobile,
      name: form.name,
      optomFeedback: form.optomFeedback,
      optomRxData: optomRxForm,
      preferredLanguage: form.preferredLanguage,
      rxData: rxForm,
      status: form.status,
      storeFeedback: form.storeFeedback,
    };
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomer) {return;}

    if (!optomRxForm.re.sph || !optomRxForm.re.cyl || !optomRxForm.re.axis || !optomRxForm.re.va) {
      toast({ description: 'Sph, Cyl, Axis, and VA are required fields for Optom R E.', title: 'Validation Error', type: 'error' });

      return;
    }

    if (!optomRxForm.le.sph || !optomRxForm.le.cyl || !optomRxForm.le.axis || !optomRxForm.le.va) {
      toast({ description: 'Sph, Cyl, Axis, and VA are required fields for Optom L E.', title: 'Validation Error', type: 'error' });

      return;
    }

    const updatedCustomer = buildUpdatedCustomer();

    if (!updatedCustomer) {return;}

    try {
      await dispatch(updateCustomerAction(selectedCustomer.id, updatedCustomer));
      toast({ description: 'Customer assessment and feedback updated successfully.', title: 'Success', type: 'success' });
      onBack();
    } catch (e) {
      const err = e as Error;
      toast({ description: err.message || 'Failed to connect to the backend database.', title: 'Error Saving Assessment', type: 'error' });
    }
  };

  const handleInitiateCall = async () => {
    if (!selectedCustomer) {return;}

    setIsCallLoading(true);

    try {
      const result = await dispatch(initiateCallAction(selectedCustomer.id));

      const teamsUser = result.customer?.storeContactEmail || '';

      if (!teamsUser) {
        toast({ description: 'No store contact is on file for this customer yet.', title: 'Missing Contact', type: 'error' });

        return;
      }

      openTeamsCallWindow(teamsUser);
    } catch (e) {
      const err = e as Error;

      if (err.message && (err.message.includes('409') || err.message.includes('already taken'))) {
        toast({ description: err.message || 'This call is already taken by another agent.', title: 'Call Collision', type: 'error' });
      } else {
        toast({ description: err.message || 'Failed to connect to the server to initiate call.', title: 'System Error', type: 'error' });
      }
    } finally {
      setIsCallLoading(false);
    }
  };

  const handleEndCall = async () => {
    if (!selectedCustomer) {return;}

    setIsCallLoading(true);

    try {
      await dispatch(endCallAction(selectedCustomer.id));
    } catch (e) {
      const err = e as Error;
      toast({ description: err.message || 'Failed to connect to the server to end call.', title: 'System Error', type: 'error' });
    } finally {
      setIsCallLoading(false);
    }
  };

  const handleUpdateStatusOnly = async (newStatus?: CustomerStatus) => {
    if (!selectedCustomer) {return;}

    const updatedCustomer = buildUpdatedCustomer();

    if (!updatedCustomer) {return;}

    if (newStatus) {updatedCustomer.status = newStatus;}

    if (newStatus === 'Completed') {
      updatedCustomer.callActive = false;
    }

    try {
      await dispatch(updateCustomerAction(selectedCustomer.id, updatedCustomer));
    } catch (e) {
      const err = e as Error;
      toast({ description: `Failed to update status: ${err.message || 'Database error'}`, title: 'Error Updating Status', type: 'error' });
    }
  };

  const handleStatusChange = (val: string) => {
    const newStatus = val as CustomerStatus;
    setField('status')(newStatus);
    handleUpdateStatusOnly(newStatus);
  };

  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);

  const handleOpenTeamViewer = () => {
    toast({ description: 'Opening TeamViewer connection...', title: 'TeamViewer', type: 'info' });

    if (isMobile) {
      if (isAndroid) {
        window.location.href = 'intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.teamviewer.teamviewer.market.mobile;end';
        setTimeout(() => { if (!document.hidden) {window.open('https://play.google.com/store/apps/details?id=com.teamviewer.teamviewer.market.mobile', '_blank');} }, 2500);
      } else {
        window.location.href = 'teamviewer://';
        setTimeout(() => { if (!document.hidden) {window.open('https://apps.apple.com/app/teamviewer-remote-control/id692045981', '_blank');} }, 2500);
      }

      return;
    }

    window.location.href = 'teamviewer10://';
  };

  return (
    <main className="flex-1 px-3 sm:px-6 md:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 w-full max-w-[1400px] mx-auto animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md animate-pulse shrink-0">
            <UserCircle className="text-white" size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-foreground truncate">Update Profile</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Badge className="bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold rounded px-1.5 py-0.5 shrink-0">
                ID: {selectedCustomer?.id}
              </Badge>
              <span className="text-xs text-gray-500 dark:text-muted-foreground font-medium truncate">
                Manage assessment details and feedback.
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <Button className="rounded-[50px] px-4 h-9 sm:h-10 border-gray-200 text-gray-600 text-xs font-bold bg-white hover:bg-slate-50 flex items-center gap-1.5 shadow-sm transition-all active:scale-98 cursor-pointer" onClick={onBack} type="button" variant="outline">
            <ChevronLeft size={16} />
            Back
          </Button>
        </div>
      </div>

      <Card className="bg-white dark:bg-card rounded-2xl border border-gray-200 dark:border-border shadow-lg p-4 sm:p-6 md:p-8">
        <form className="space-y-6 sm:space-y-8" onSubmit={handleUpdateDetails}>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-4">
              <h2 className="text-xs sm:text-sm font-bold text-gray-800 dark:text-foreground uppercase tracking-wider">Customer Details</h2>
              {selectedCustomer?.lastUpdatedOn && (
                <span className="text-xs text-gray-400 font-medium">Last Updated On: {selectedCustomer.lastUpdatedOn}</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 dark:text-muted-foreground">Name *</label>
                <Input className="bg-slate-50 border-0 outline-none text-gray-500 font-medium cursor-not-allowed" disabled icon={User} placeholder="Enter full name" required type="text" value={form.name} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 dark:text-muted-foreground">Age *</label>
                <Input className="bg-slate-50 border-0 outline-none text-gray-500 font-medium cursor-not-allowed" disabled placeholder="Age" required type="number" value={form.age} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 dark:text-muted-foreground">Gender *</label>
                <Select className="bg-slate-50 border-0 outline-none text-gray-500 font-medium cursor-not-allowed disabled:opacity-100" disabled options={[{ label: 'Male', value: 'Male' }, { label: 'Female', value: 'Female' }, { label: 'Other', value: 'Other' }]} value={form.gender} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 dark:text-muted-foreground">Mobile Number *</label>
                <Input className="bg-slate-50 border-0 outline-none text-gray-500 font-medium cursor-not-allowed" disabled icon={Phone} placeholder="Enter mobile number" required type="tel" value={form.mobile} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 dark:text-muted-foreground">Customer Type *</label>
                <Select className="bg-slate-50 border-0 outline-none text-gray-500 font-medium cursor-not-allowed disabled:opacity-100" disabled options={[{ label: 'New', value: 'New' }, { label: 'Existing', value: 'Existing' }]} value={form.customerType} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 dark:text-muted-foreground">Preferred Language *</label>
                <Select className="bg-slate-50 border-0 outline-none text-gray-500 font-medium cursor-not-allowed disabled:opacity-100" disabled options={[{ label: 'English', value: 'English' }, { label: 'Hindi', value: 'Hindi' }, { label: 'Tamil', value: 'Tamil' }, { label: 'Telugu', value: 'Telugu' }, { label: 'Kannada', value: 'Kannada' }]} value={form.preferredLanguage} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-300 dark:border-zinc-700 rounded-lg shadow-xs">
              <Table className="w-full min-w-[650px] border-collapse text-center text-xs">
                <TableHeader className="[&_tr]:border-b border-slate-400 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800">
                  <TableRow className="border-b border-slate-400 dark:border-zinc-700 hover:bg-slate-100/50 dark:hover:bg-zinc-800/50">
                    <TableHead className="py-2.5 font-extrabold text-sm text-slate-900 dark:text-zinc-100 text-center uppercase tracking-wider" colSpan={9}>Store Login</TableHead>
                  </TableRow>
                  <TableRow className="bg-slate-100/70 dark:bg-zinc-800/70 border-b border-slate-400 dark:border-zinc-700 hover:bg-slate-100/50 dark:hover:bg-zinc-800/50">
                    <TableHead className="border-r border-slate-400 dark:border-zinc-700 px-3 py-2 font-black text-xs text-[#1a2b6e] dark:text-blue-400 text-center uppercase tracking-wider whitespace-nowrap" colSpan={2}>R X</TableHead>
                    {rxHeaders.map((h) => (
                      <TableHead className="border-r border-slate-400 dark:border-zinc-700 px-3 py-2 font-black text-xs text-center text-[#1a2b6e] dark:text-blue-400 last:border-r-0" key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(['autoRefRe', 'autoRefLe', 'pgpRe', 'pgpLe'] as const).map((row, rowIdx) => (
                    <TableRow className={rowIdx < 3 ? 'border-b border-slate-400 dark:border-zinc-700' : 'border-0'} key={row}>
                      {rowIdx % 2 === 0 && (
                        <TableCell className="border-r border-b border-slate-400 dark:border-zinc-700 font-black text-xs text-[#1a2b6e] dark:text-blue-400 bg-slate-50/50 dark:bg-zinc-900/50 px-3 py-4 w-[100px] text-center animate-none" rowSpan={2}>
                          {rowIdx < 2 ? 'Auto Ref' : 'PGP'}
                        </TableCell>
                      )}
                      <TableCell className="border-r border-b border-slate-400 dark:border-zinc-700 font-black text-xs text-[#1a2b6e] dark:text-blue-400 bg-slate-50/50 dark:bg-zinc-900/50 px-3 py-3 w-[60px] whitespace-nowrap text-center animate-none">
                        {rowIdx % 2 === 0 ? 'R E' : 'L E'}
                      </TableCell>
                      {rxFields.map((field, idx) => (
                        <TableCell className={`${rowIdx < 3 ? 'border-b border-slate-400 dark:border-zinc-700' : ''} p-0 ${idx < 6 ? 'border-r border-slate-400 dark:border-zinc-700' : ''}`} key={field}>
                          <input className="w-full h-full text-center bg-slate-50 dark:bg-zinc-900 border-0 outline-none px-3 py-2.5 text-xs text-gray-500 dark:text-muted-foreground font-medium cursor-not-allowed" disabled type="text" value={rxForm[row][field] || ''} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 dark:text-muted-foreground">Store Action / Feedback</label>
            <RichTextEditor readOnly value={form.storeFeedback} />
          </div>

          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-300 dark:border-zinc-700 rounded-lg shadow-xs">
              <Table className="w-full min-w-[650px] border-collapse text-center text-xs">
                <TableHeader className="[&_tr]:border-b border-slate-400 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800">
                  <TableRow className="border-b border-slate-400 dark:border-zinc-700 hover:bg-slate-100/50 dark:hover:bg-zinc-800/50">
                    <TableHead className="py-2.5 font-extrabold text-sm text-slate-900 dark:text-zinc-100 text-center uppercase tracking-wider bg-slate-100 dark:bg-zinc-800" colSpan={8}>Optom Login</TableHead>
                  </TableRow>
                  <TableRow className="bg-slate-100/50 dark:bg-zinc-800/50 border-b border-slate-400 dark:border-zinc-700 hover:bg-slate-100/50 dark:hover:bg-zinc-800/50">
                    <TableHead className="border-r border-slate-400 dark:border-zinc-700 py-1 text-center font-bold text-blue-600 dark:text-blue-400 text-sm"></TableHead>
                    <TableHead className="border-r border-slate-400 dark:border-zinc-700 py-1 text-center font-bold text-blue-600 dark:text-blue-400 text-sm">*</TableHead>
                    <TableHead className="border-r border-slate-400 dark:border-zinc-700 py-1 text-center font-bold text-blue-600 dark:text-blue-400 text-sm">*</TableHead>
                    <TableHead className="border-r border-slate-400 dark:border-zinc-700 py-1 text-center font-bold text-blue-600 dark:text-blue-400 text-sm">*</TableHead>
                    <TableHead className="border-r border-slate-400 dark:border-zinc-700 py-1 text-center font-bold text-blue-600 dark:text-blue-400 text-sm"></TableHead>
                    <TableHead className="border-r border-slate-400 dark:border-zinc-700 py-1 text-center font-bold text-blue-600 dark:text-blue-400 text-sm"></TableHead>
                    <TableHead className="border-r border-slate-400 dark:border-zinc-700 py-1 text-center font-bold text-blue-600 dark:text-blue-400 text-sm">*</TableHead>
                    <TableHead className="py-1 text-center font-bold text-blue-600 dark:text-blue-400 text-sm"></TableHead>
                  </TableRow>
                  <TableRow className="bg-slate-100/70 dark:bg-zinc-800/70 border-b border-slate-400 dark:border-zinc-700 hover:bg-slate-100/50 dark:hover:bg-zinc-800/50">
                    <TableHead className="border-r border-slate-400 dark:border-zinc-700 px-3 py-2 font-black text-xs text-[#1a2b6e] dark:text-blue-400 text-center uppercase tracking-wider whitespace-nowrap">R X</TableHead>
                    {optomHeaders.map((h) => (
                      <TableHead className="border-r border-slate-400 dark:border-zinc-700 px-3 py-2 font-black text-xs text-center text-[#1a2b6e] dark:text-blue-400 last:border-r-0" key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(['re', 'le'] as const).map((eye, idx) => (
                    <TableRow className={idx === 0 ? 'border-b border-slate-400 dark:border-zinc-700' : 'border-0'} key={eye}>
                      <TableCell className="border-r border-slate-400 dark:border-zinc-700 font-black text-xs text-[#1a2b6e] dark:text-blue-400 bg-slate-50/50 dark:bg-zinc-900/50 py-3 whitespace-nowrap text-center animate-none">
                        {eye === 're' ? 'R E' : 'L E'}
                      </TableCell>
                      {optomFields.map((field, fIdx) => {
                        let optionsList: string[] = [];

                        if (field === 'sph') {
                          optionsList = POWER_OPTIONS;
                        } else if (field === 'cyl') {
                          optionsList = CYL_OPTIONS;
                        } else if (field === 'add') {
                          optionsList = ADD_OPTIONS;
                        } else if (field === 'axis') {
                          optionsList = AXIS_OPTIONS;
                        } else if (field === 'prism') {
                          optionsList = PRISM_OPTIONS;
                        } else if (field === 'base') {
                          optionsList = BASE_OPTIONS;
                        } else if (field === 'va') {
                          return (
                            <TableCell className={`${idx === 0 ? 'border-b border-slate-400 dark:border-zinc-700' : ''} p-0 ${fIdx < 6 ? 'border-r border-slate-400 dark:border-zinc-700' : ''}`} key={field}>
                              <input
                                className="w-full h-9 text-center bg-transparent border-0 outline-none focus:ring-1 focus:ring-blue-500 px-3 py-2.5 text-xs text-gray-900 dark:text-foreground font-medium"
                                onChange={(e) => setOptomRxField(eye, field, e.target.value)}
                                type="text"
                                value={optomRxForm[eye][field] || ''}
                              />
                            </TableCell>
                          );
                        }

                        return (
                          <TableCell className={cn(
                            idx === 0 ? 'border-b border-slate-400 dark:border-zinc-700' : '',
                            'p-0 relative group',
                            fIdx < 6 ? 'border-r border-slate-400 dark:border-zinc-700' : ''
                          )} key={field}>
                            <RxScrollPicker
                              defaultValue={(field as string) === 'axis' || (field as string) === 'prism' || (field as string) === 'va' || (field as string) === 'base' ? '0' : '0.00'}
                              onChange={(val) => setOptomRxField(eye, field, val)}
                              options={optionsList}
                              value={optomRxForm[eye][field] || ''}
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

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 dark:text-muted-foreground">Optom Action / Feedback</label>
            <RichTextEditor
              onChange={setField('optomFeedback')}
              placeholder="Enter clinical assessment details or feedback comments..."
              value={form.optomFeedback}
            />
          </div>

          <div className="pt-4 border-t border-border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
            <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-2.5 sm:gap-3 w-full md:w-auto">
              {isTakenByMe ? (
                <Button className="w-full md:w-auto h-10 px-3 sm:px-4 rounded-[50px] bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-98 cursor-pointer border border-gray-300 whitespace-nowrap min-w-0" disabled={isCallLoading} onClick={handleEndCall} title="End Call Session" type="button">
                  {isCallLoading ? <span className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin shrink-0" /> : null}
                  <span>Call Initiated</span>
                </Button>
              ) : (
                <Button className="w-full md:w-auto h-10 px-3 sm:px-4 rounded-[50px] bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-98 cursor-pointer whitespace-nowrap min-w-0" disabled={isCallLoading} onClick={handleInitiateCall} title="Initiate Microsoft Teams Call" type="button">
                  {isCallLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" /> : <Video className="shrink-0" size={15} />}
                  <span>Initiate Call</span>
                </Button>
              )}
              <Button className="w-full md:w-auto h-10 px-3 sm:px-4 rounded-[50px] bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-98 cursor-pointer whitespace-nowrap min-w-0" onClick={handleOpenTeamViewer} title="Open TeamViewer Remote Control" type="button">
                <Monitor className="shrink-0" size={15} />
                <span>TeamViewer</span>
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto justify-end">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-xs font-bold text-gray-600 dark:text-muted-foreground whitespace-nowrap">Status:</label>
                <Select className="rounded-[50px] flex-1 h-10" onChange={(e) => handleStatusChange(e.target.value)} options={[{ label: 'Created', value: 'Created' }, { label: 'Initiated', value: 'Initiated' }, { label: 'Accepted', value: 'Accepted' }, { label: 'Completed', value: 'Completed' }]} value={form.status} />
              </div>
              <Button className="w-full sm:w-auto md:w-auto h-10 px-5 rounded-[50px] bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-98 cursor-pointer shrink-0 whitespace-nowrap" type="submit">
                Update Customer Details
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </main>
  );
}
