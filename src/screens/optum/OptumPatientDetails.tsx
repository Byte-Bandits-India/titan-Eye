import * as React from 'react';
import {
  User,
  Video,
  Phone,
  UserCircle,
  ChevronLeft,
  Monitor,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { useToast } from '../../components/ui/toast';
import { useAppDispatch, useAppSelector } from '../../store';
import { updateCustomerAction, initiateCallAction, endCallAction } from '../../Actions/customerActions';
import type { Customer, CustomerStatus, RxValues, OptumRxValues, OptumPatientDetailsProps } from '../../types';
import { rxFields, optumFields, rxHeaders, optumHeaders } from '../../options/Option';
import { RichTextEditor } from '../../components/ui/RichTextEditor';

const emptyRxValues: RxValues = { sph: '', cyl: '', axis: '', pd: '', prism: '', base: '', add: '' };
const emptyOptumRxValues: OptumRxValues = { sph: '', cyl: '', axis: '', prism: '', base: '', va: '', add: '' };

export function OptumPatientDetails({
  selectedCustomer,
  onBack,
}: OptumPatientDetailsProps) {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const [isCallLoading, setIsCallLoading] = React.useState(false);
  const currentUserName = user?.name || '';

  const isTakenByMe = !!selectedCustomer?.callActive && selectedCustomer?.callTakenBy === currentUserName;

  const [form, setForm] = React.useState({
    name: '',
    age: '',
    gender: 'Male',
    mobile: '',
    customerType: 'New',
    preferredLanguage: 'English',
    storeFeedback: '',
    optumFeedback: '',
    status: 'Created' as CustomerStatus,
    activeProfile: false,
  });

  const [rxForm, setRxForm] = React.useState({
    autoRefRe: { ...emptyRxValues },
    autoRefLe: { ...emptyRxValues },
    pgpRe: { ...emptyRxValues },
    pgpLe: { ...emptyRxValues },
  });

  const [optumRxForm, setOptumRxForm] = React.useState({
    re: { ...emptyOptumRxValues },
    le: { ...emptyOptumRxValues },
  });

  React.useEffect(() => {
    if (selectedCustomer) {
      setForm({
        name: selectedCustomer.name || '',
        age: selectedCustomer.age || '',
        gender: selectedCustomer.gender || 'Male',
        mobile: selectedCustomer.mobile || '',
        customerType: selectedCustomer.customerType || 'New',
        preferredLanguage: selectedCustomer.preferredLanguage || 'English',
        storeFeedback: selectedCustomer.storeFeedback || '',
        optumFeedback: selectedCustomer.optumFeedback || '',
        status: selectedCustomer.status,
        activeProfile: selectedCustomer.activeProfile || false,
      });
      setRxForm(selectedCustomer.rxData || {
        autoRefRe: { ...emptyRxValues },
        autoRefLe: { ...emptyRxValues },
        pgpRe: { ...emptyRxValues },
        pgpLe: { ...emptyRxValues },
      });
      setOptumRxForm(selectedCustomer.optumRxData || {
        re: { ...emptyOptumRxValues },
        le: { ...emptyOptumRxValues },
      });
    }
  }, [selectedCustomer]);

  const setField = (field: string) => (val: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const setOptumRxField = (eye: 're' | 'le', field: keyof OptumRxValues, val: string) => {
    const cleanVal = val.replace(/[a-zA-Z]/g, '');
    setOptumRxForm((prev) => ({
      ...prev,
      [eye]: { ...prev[eye], [field]: cleanVal },
    }));
  };

  const buildTimestamp = (): string =>
    new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
    });

  const buildUpdatedCustomer = (): Customer | null => {
    if (!selectedCustomer) return null;
    return {
      ...selectedCustomer,
      name: form.name,
      age: form.age,
      gender: form.gender,
      mobile: form.mobile,
      customerType: form.customerType,
      preferredLanguage: form.preferredLanguage,
      storeFeedback: form.storeFeedback,
      optumFeedback: form.optumFeedback,
      status: form.status,
      activeProfile: form.activeProfile,
      rxData: rxForm,
      optumRxData: optumRxForm,
      lastUpdatedOn: buildTimestamp(),
    };
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    if (!optumRxForm.re.sph || !optumRxForm.re.cyl || !optumRxForm.re.axis || !optumRxForm.re.va) {
      toast({ title: 'Validation Error', description: 'Sph, Cyl, Axis, and VA are required fields for Optum R E.', type: 'error' });
      return;
    }
    if (!optumRxForm.le.sph || !optumRxForm.le.cyl || !optumRxForm.le.axis || !optumRxForm.le.va) {
      toast({ title: 'Validation Error', description: 'Sph, Cyl, Axis, and VA are required fields for Optum L E.', type: 'error' });
      return;
    }

    const updatedCustomer = buildUpdatedCustomer();
    if (!updatedCustomer) return;

    try {
      await dispatch(updateCustomerAction(selectedCustomer.id, updatedCustomer));
      toast({ title: 'Success', description: 'Customer assessment and feedback updated successfully.', type: 'success' });
      onBack();
    } catch (e) {
      const err = e as Error;
      toast({ title: 'Error Saving Assessment', description: err.message || 'Failed to connect to the backend database.', type: 'error' });
    }
  };

  const handleInitiateCall = async () => {
    if (!selectedCustomer) return;
    setIsCallLoading(true);
    try {
      const result = await dispatch(initiateCallAction(selectedCustomer.id));

      const teamsUser = result.customer?.storeContactEmail || '';
      if (!teamsUser) {
        toast({ title: 'Missing Contact', description: 'No store contact is on file for this customer yet.', type: 'error' });
        return;
      }
      const appLink = 'msteams://teams.microsoft.com/l/call/0/0?users=' + encodeURIComponent(teamsUser);
      window.location.href = appLink;
    } catch (e) {
      const err = e as Error;
      if (err.message && (err.message.includes('409') || err.message.includes('already taken'))) {
        toast({ title: 'Call Collision', description: err.message || 'This call is already taken by another agent.', type: 'error' });
      } else {
        toast({ title: 'System Error', description: err.message || 'Failed to connect to the server to initiate call.', type: 'error' });
      }
    } finally {
      setIsCallLoading(false);
    }
  };

  const handleEndCall = async () => {
    if (!selectedCustomer) return;
    setIsCallLoading(true);
    try {
      await dispatch(endCallAction(selectedCustomer.id));
    } catch (e) {
      const err = e as Error;
      toast({ title: 'System Error', description: err.message || 'Failed to connect to the server to end call.', type: 'error' });
    } finally {
      setIsCallLoading(false);
    }
  };

  const handleUpdateStatusOnly = async (newStatus?: CustomerStatus) => {
    if (!selectedCustomer) return;
    const updatedCustomer = buildUpdatedCustomer();
    if (!updatedCustomer) return;
    if (newStatus) updatedCustomer.status = newStatus;
    if (newStatus === 'Completed') {
      updatedCustomer.callActive = false;
    }

    try {
      await dispatch(updateCustomerAction(selectedCustomer.id, updatedCustomer));
    } catch (e) {
      const err = e as Error;
      toast({ title: 'Error Updating Status', description: `Failed to update status: ${err.message || 'Database error'}`, type: 'error' });
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
    toast({ title: 'TeamViewer', description: 'Opening TeamViewer connection...', type: 'info' });
    if (isMobile) {
      if (isAndroid) {
        window.location.href = 'intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.teamviewer.teamviewer.market.mobile;end';
        setTimeout(() => { if (!document.hidden) window.open('https://play.google.com/store/apps/details?id=com.teamviewer.teamviewer.market.mobile', '_blank'); }, 2500);
      } else {
        window.location.href = 'teamviewer://';
        setTimeout(() => { if (!document.hidden) window.open('https://apps.apple.com/app/teamviewer-remote-control/id692045981', '_blank'); }, 2500);
      }
      return;
    }
    window.location.href = 'teamviewer10://';
  };

  return (
    <main className="flex-1 px-8 py-8 space-y-6 w-full max-w-[1400px] mx-auto animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md animate-pulse">
            <UserCircle className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Update Profile</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge className="bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold rounded px-1.5 py-0.5">
                ID: {selectedCustomer?.id}
              </Badge>
              <span className="text-xs text-gray-500 font-medium">
                Manage assessment details and feedback.
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={onBack} className="rounded-xl px-4 h-10 border-gray-200 text-gray-600 text-xs font-bold bg-white hover:bg-slate-50 flex items-center gap-1.5 shadow-sm transition-all active:scale-98">
            <ChevronLeft size={16} />
            Back
          </Button>
        </div>
      </div>

      <Card className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8">
        <form onSubmit={handleUpdateDetails} className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Customer Details</h2>
              {selectedCustomer?.lastUpdatedOn && (
                <span className="text-xs text-gray-400 font-medium">Last Updated On: {selectedCustomer.lastUpdatedOn}</span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-6 space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Name *</label>
                <Input type="text" value={form.name} disabled className="bg-slate-50 border-0 outline-none text-gray-500 font-medium cursor-not-allowed" placeholder="Enter full name" icon={User} required />
              </div>
              <div className="md:col-span-3 space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Age *</label>
                <Input type="number" value={form.age} disabled className="bg-slate-50 border-0 outline-none text-gray-500 font-medium cursor-not-allowed" placeholder="Age" required />
              </div>
              <div className="md:col-span-3 space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Gender *</label>
                <Select value={form.gender} disabled className="bg-slate-50 border-0 outline-none text-gray-500 font-medium cursor-not-allowed disabled:opacity-100" options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Mobile Number *</label>
                <Input type="tel" value={form.mobile} disabled className="bg-slate-50 border-0 outline-none text-gray-500 font-medium cursor-not-allowed" placeholder="Enter mobile number" icon={Phone} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Customer Type *</label>
                <Select value={form.customerType} disabled className="bg-slate-50 border-0 outline-none text-gray-500 font-medium cursor-not-allowed disabled:opacity-100" options={[{ value: 'New', label: 'New' }, { value: 'Existing', label: 'Existing' }, { value: 'VIP', label: 'VIP' }]} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Preferred Language *</label>
                <Select value={form.preferredLanguage} disabled className="bg-slate-50 border-0 outline-none text-gray-500 font-medium cursor-not-allowed disabled:opacity-100" options={[{ value: 'English', label: 'English' }, { value: 'Hindi', label: 'Hindi' }, { value: 'Tamil', label: 'Tamil' }, { value: 'Telugu', label: 'Telugu' }, { value: 'Kannada', label: 'Kannada' }]} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-400 rounded-lg shadow-sm">
              <Table className="w-full border-collapse text-center text-xs">
                <TableHeader className="[&_tr]:border-b border-slate-400 bg-slate-100">
                  <TableRow className="border-b border-slate-400 hover:bg-slate-100/50">
                    <TableHead colSpan={9} className="py-2.5 font-extrabold text-sm text-slate-900 text-center uppercase tracking-wider">Store Login</TableHead>
                  </TableRow>
                  <TableRow className="bg-slate-100/70 border-b border-slate-400 hover:bg-slate-100/50">
                    <TableHead colSpan={2} className="border-r border-slate-400 px-3 py-2 font-black text-xs text-[#1a2b6e] text-center uppercase tracking-wider whitespace-nowrap">R X</TableHead>
                    {rxHeaders.map((h) => (
                      <TableHead key={h} className="border-r border-slate-400 px-3 py-2 font-black text-xs text-center text-[#1a2b6e] last:border-r-0">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(['autoRefRe', 'autoRefLe', 'pgpRe', 'pgpLe'] as const).map((row, rowIdx) => (
                    <TableRow key={row} className={rowIdx < 3 ? 'border-b border-slate-400' : 'border-0'}>
                      {rowIdx % 2 === 0 && (
                        <TableCell rowSpan={2} className="border-r border-b border-slate-400 font-black text-xs text-[#1a2b6e] bg-slate-50/50 px-3 py-4 w-[100px] text-center animate-none">
                          {rowIdx < 2 ? 'Auto Ref' : 'PGP'}
                        </TableCell>
                      )}
                      <TableCell className="border-r border-b border-slate-400 font-black text-xs text-[#1a2b6e] bg-slate-50/50 px-3 py-3 w-[60px] whitespace-nowrap text-center animate-none">
                        {rowIdx % 2 === 0 ? 'R E' : 'L E'}
                      </TableCell>
                      {rxFields.map((field, idx) => (
                        <TableCell key={field} className={`${rowIdx < 3 ? 'border-b border-slate-400' : ''} p-0 ${idx < 6 ? 'border-r border-slate-400' : ''}`}>
                          <input type="text" value={rxForm[row][field] || ''} disabled className="w-full h-full text-center bg-slate-50 border-0 outline-none px-3 py-2.5 text-xs text-gray-500 font-medium cursor-not-allowed" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600">Store Action / Feedback</label>
            <RichTextEditor value={form.storeFeedback} readOnly />
          </div>

          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-400 rounded-lg shadow-sm">
              <Table className="w-full border-collapse text-center text-xs">
                <TableHeader className="[&_tr]:border-b border-slate-400 bg-slate-100">
                  <TableRow className="border-b border-slate-400 hover:bg-slate-100/50">
                    <TableHead colSpan={8} className="py-2.5 font-extrabold text-sm text-slate-900 text-center uppercase tracking-wider bg-slate-100">Optum Login</TableHead>
                  </TableRow>
                  <TableRow className="bg-slate-100/50 border-b border-slate-400 hover:bg-slate-100/50">
                    <TableHead className="border-r border-slate-400 py-1 text-center font-bold text-blue-600 text-sm"></TableHead>
                    <TableHead className="border-r border-slate-400 py-1 text-center font-bold text-blue-600 text-sm">*</TableHead>
                    <TableHead className="border-r border-slate-400 py-1 text-center font-bold text-blue-600 text-sm">*</TableHead>
                    <TableHead className="border-r border-slate-400 py-1 text-center font-bold text-blue-600 text-sm">*</TableHead>
                    <TableHead className="border-r border-slate-400 py-1 text-center font-bold text-blue-600 text-sm"></TableHead>
                    <TableHead className="border-r border-slate-400 py-1 text-center font-bold text-blue-600 text-sm"></TableHead>
                    <TableHead className="border-r border-slate-400 py-1 text-center font-bold text-blue-600 text-sm">*</TableHead>
                    <TableHead className="py-1 text-center font-bold text-blue-600 text-sm"></TableHead>
                  </TableRow>
                  <TableRow className="bg-slate-100/70 border-b border-slate-400 hover:bg-slate-100/50">
                    <TableHead className="border-r border-slate-400 px-3 py-2 font-black text-xs text-[#1a2b6e] text-center uppercase tracking-wider whitespace-nowrap">R X</TableHead>
                    {optumHeaders.map((h) => (
                      <TableHead key={h} className="border-r border-slate-400 px-3 py-2 font-black text-xs text-center text-[#1a2b6e] last:border-r-0">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(['re', 'le'] as const).map((eye, idx) => (
                    <TableRow key={eye} className={idx === 0 ? 'border-b border-slate-400' : 'border-0'}>
                      <TableCell className="border-r border-slate-400 font-black text-xs text-[#1a2b6e] bg-slate-50/50 py-3 whitespace-nowrap text-center animate-none">
                        {eye === 're' ? 'R E' : 'L E'}
                      </TableCell>
                      {optumFields.map((field, fIdx) => (
                        <TableCell key={field} className={`${idx === 0 ? 'border-b border-slate-400' : ''} p-0 ${fIdx < 6 ? 'border-r border-slate-400' : ''}`}>
                          <input
                            type="text"
                            value={optumRxForm[eye][field] || ''}
                            onChange={(e) => setOptumRxField(eye, field, e.target.value)}
                            className="w-full h-full text-center bg-transparent border-0 outline-none focus:ring-1 focus:ring-blue-500 px-3 py-2.5 text-xs text-gray-900 font-medium"
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
            <label className="text-xs font-bold text-gray-600">Optum Action / Feedback</label>
            <RichTextEditor
              value={form.optumFeedback}
              onChange={setField('optumFeedback')}
              placeholder="Enter clinical assessment details or feedback comments..."
            />
          </div>

          <div className="pt-4 border-t border-gray-150 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto justify-start">
              {isTakenByMe ? (
                <Button type="button" onClick={handleEndCall} disabled={isCallLoading} className="rounded-xl px-4 h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-98 cursor-pointer border border-gray-300" title="End Call Session">
                  {isCallLoading ? <span className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" /> : null}
                  Call Initiated
                </Button>
              ) : (
                <Button type="button" onClick={handleInitiateCall} disabled={isCallLoading} className="rounded-xl px-4 h-10 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-98 cursor-pointer" title="Initiate Microsoft Teams Call">
                  {isCallLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Video size={16} />}
                  Initiate Call
                </Button>
              )}
              <Button type="button" onClick={handleOpenTeamViewer} className="rounded-xl px-4 h-10 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-98 cursor-pointer" title="Open TeamViewer Remote Control">
                <Monitor size={16} />
                Open TeamViewer
              </Button>
            </div>

            <div className="flex items-end gap-3 w-full sm:w-auto justify-end pt-5 sm:pt-0">
              <div className="space-y-1.5 w-full sm:max-w-xs">
                <label className="text-xs font-bold text-gray-600">Status</label>
                <Select value={form.status} onChange={(e) => handleStatusChange(e.target.value)} options={[{ value: 'Created', label: 'Created' }, { value: 'Initiated', label: 'Initiated' }, { value: 'Accepted', label: 'Accepted' }, { value: 'Completed', label: 'Completed' }]} />
              </div>
              <Button type="submit" className="rounded-xl px-4 h-10 bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-98 cursor-pointer">
                Update Customer Details
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </main>
  );
}
