import * as React from 'react';
import {
  User,
  Video,
  Phone,
  UserCircle,
  History,
  ChevronLeft,
  Monitor,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Badge } from './ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table';
import { Customer, CustomerStatus, RxValues, OptomRxValues } from '../types';

interface OptemPatientDetailsProps {
  selectedCustomer: Customer | null;
  onBack: () => void;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  toast: any;
}

export function OptemPatientDetails({
  selectedCustomer,
  onBack,
  setCustomers,
  toast,
}: OptemPatientDetailsProps) {
  const [isCallLoading, setIsCallLoading] = React.useState(false);
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
    autoRefRe: { sph: '', cyl: '', axis: '', pd: '', prism: '', base: '', add: '' },
    autoRefLe: { sph: '', cyl: '', axis: '', pd: '', prism: '', base: '', add: '' },
    pgpRe: { sph: '', cyl: '', axis: '', pd: '', prism: '', base: '', add: '' },
    pgpLe: { sph: '', cyl: '', axis: '', pd: '', prism: '', base: '', add: '' },
  });

  const [optomRxForm, setOptomRxForm] = React.useState({
    re: { sph: '', cyl: '', axis: '', prism: '', base: '', va: '', add: '' },
    le: { sph: '', cyl: '', axis: '', prism: '', base: '', va: '', add: '' },
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
        autoRefRe: { sph: '', cyl: '', axis: '', pd: '', prism: '', base: '', add: '' },
        autoRefLe: { sph: '', cyl: '', axis: '', pd: '', prism: '', base: '', add: '' },
        pgpRe: { sph: '', cyl: '', axis: '', pd: '', prism: '', base: '', add: '' },
        pgpLe: { sph: '', cyl: '', axis: '', pd: '', prism: '', base: '', add: '' },
      });

      setOptomRxForm(selectedCustomer.optomRxData || {
        re: { sph: '', cyl: '', axis: '', prism: '', base: '', va: '', add: '' },
        le: { sph: '', cyl: '', axis: '', prism: '', base: '', va: '', add: '' },
      });
    }
  }, [selectedCustomer]);

  const setField = (field: string) => (val: any) => {
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const setOptomRxField = (eye: 're' | 'le', field: keyof OptomRxValues, val: string) => {
    // Only allow numbers and special characters (no letters)
    const cleanVal = val.replace(/[a-zA-Z]/g, '');
    setOptomRxForm((prev) => ({
      ...prev,
      [eye]: {
        ...prev[eye],
        [field]: cleanVal,
      },
    }));
  };

  const handleUpdateDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    // Validate Optom RE required fields (Sph, Cyl, Axis, VA)
    if (
      !optomRxForm.re.sph ||
      !optomRxForm.re.cyl ||
      !optomRxForm.re.axis ||
      !optomRxForm.re.va
    ) {
      toast({
        title: 'Validation Error',
        description: 'Sph, Cyl, Axis, and VA are required fields for Optom R E.',
        type: 'error',
      });
      return;
    }

    // Validate Optom LE required fields (Sph, Cyl, Axis, VA)
    if (
      !optomRxForm.le.sph ||
      !optomRxForm.le.cyl ||
      !optomRxForm.le.axis ||
      !optomRxForm.le.va
    ) {
      toast({
        title: 'Validation Error',
        description: 'Sph, Cyl, Axis, and VA are required fields for Optom L E.',
        type: 'error',
      });
      return;
    }

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const updatedCustomer: Customer = {
      ...selectedCustomer,
      name: form.name,
      age: form.age,
      gender: form.gender,
      mobile: form.mobile,
      customerType: form.customerType,
      preferredLanguage: form.preferredLanguage,
      storeFeedback: form.storeFeedback,
      optumFeedback: form.optumFeedback,
      status: 'Completed',
      activeProfile: form.activeProfile,
      rxData: rxForm,
      optomRxData: optomRxForm,
      lastUpdatedOn: timestamp,
    };

    const savedUser = localStorage.getItem('titan_user');
    const token = savedUser ? JSON.parse(savedUser).token : '';

    fetch(`${apiBaseUrl}/customers/${encodeURIComponent(selectedCustomer.id)}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updatedCustomer),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to update database');
        setCustomers((prev) =>
          prev.map((c) => (c.id === selectedCustomer.id ? updatedCustomer : c))
        );
        toast({
          title: 'Success',
          description: 'Customer assessment and feedback updated successfully.',
          type: 'success',
        });
        onBack();
      })
      .catch((err) => {
        console.error(err);
        toast({
          title: 'Error Saving Assessment',
          description: 'Failed to connect to the backend database.',
          type: 'error',
        });
      });
  };

  // Detect mobile/tablet — server.js local agent cannot run on phones/tablets
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);
  const localAgentUrl = import.meta.env.VITE_LOCAL_SERVICE_URL || 'http://localhost:3001/api';

  const handleInitiateCall = async () => {
    if (!selectedCustomer) return;

    const savedUser = localStorage.getItem('titan_user');
    const userObj = savedUser ? JSON.parse(savedUser) : null;
    const token = userObj?.token || '';
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

    setIsCallLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/customers/${encodeURIComponent(selectedCustomer.id)}/initiate-call`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 409) {
        const errorData = await response.json();
        toast({
          title: 'Call Collision',
          description: errorData.error || 'This call is already taken by another agent.',
          type: 'error',
        });
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to initiate call');
      }

      toast({
        title: 'Video Call',
        description: `Initiating video consultation with patient ${form.name}...`,
        type: 'success',
      });

      if (isMobile) {
        window.location.href = 'msteams://';
        setTimeout(() => window.open('https://teams.microsoft.com/v2/', '_blank'), 2000);
        return;
      }

      window.location.href = 'msteams://';

      fetch(`${localAgentUrl}/open-teams`, { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).catch(() => {});

    } catch (err) {
      console.error(err);
      toast({
        title: 'System Error',
        description: 'Failed to connect to the server to initiate call.',
        type: 'error',
      });
    } finally {
      setIsCallLoading(false);
    }
  };

  const handleEndCall = async () => {
    if (!selectedCustomer) return;
    const savedUser = localStorage.getItem('titan_user');
    const token = savedUser ? JSON.parse(savedUser).token : '';
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

    setIsCallLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/customers/${encodeURIComponent(selectedCustomer.id)}/end-call`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast({
          title: 'Call Ended',
          description: 'The call session has been closed successfully.',
          type: 'info',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to terminate call session.',
          type: 'error',
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: 'System Error',
        description: 'Failed to connect to the server to end call.',
        type: 'error',
      });
    } finally {
      setIsCallLoading(false);
    }
  };

  const handleOpenTeamViewer = () => {
    toast({
      title: 'TeamViewer',
      description: `Opening TeamViewer connection...`,
      type: 'info',
    });

    if (isMobile) {
      if (isAndroid) {
        // Android: launch TeamViewer app by package name
        // If app is installed → opens it. If not → falls back to Play Store.
        window.location.href =
          'intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.teamviewer.teamviewer.market.mobile;end';

        // Smart fallback: if page is still visible after 2.5s, app wasn't opened
        // document.hidden becomes true when an app takes over the foreground
        setTimeout(() => {
          if (!document.hidden) {
            window.open(
              'https://play.google.com/store/apps/details?id=com.teamviewer.teamviewer.market.mobile',
              '_blank'
            );
          }
        }, 2500);
      } else {
        // iOS: teamviewer:// is registered by the TeamViewer iOS app
        window.location.href = 'teamviewer://';
        setTimeout(() => {
          if (!document.hidden) {
            window.open('https://apps.apple.com/app/teamviewer-remote-control/id692045981', '_blank');
          }
        }, 2500);
      }
      return;
    }

    // Desktop: fire teamviewer:// immediately (registered on Windows & Mac by TeamViewer)
    window.location.href = 'teamviewer://';

    const savedUser = localStorage.getItem('titan_user');
    const token = savedUser ? JSON.parse(savedUser).token : '';

    // Also call server.js in parallel for window auto-positioning
    fetch(`${localAgentUrl}/open-teamviewer`, { 
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).catch(() => {
      // server.js not running — URI scheme above already handled it, nothing to do
    });
  };


  return (
    <main className="flex-1 px-8 py-8 space-y-6 w-full max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Page Title Row */}
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
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              toast({
                title: 'History',
                description: 'No prior assessment logs found for this customer.',
                type: 'info',
              });
            }}
            className="rounded-xl px-4 h-10 border-gray-200 text-gray-600 text-xs font-bold bg-white hover:bg-slate-50 flex items-center gap-1.5 shadow-sm transition-all active:scale-98"
          >
            <History size={14} />
            View History
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="rounded-xl px-4 h-10 border-gray-200 text-gray-600 text-xs font-bold bg-white hover:bg-slate-50 flex items-center gap-1.5 shadow-sm transition-all active:scale-98"
          >
            <ChevronLeft size={16} />
            Back
          </Button>
        </div>
      </div>

      {/* Customer Details Form & Table Card */}
      <Card className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8">
        <form onSubmit={handleUpdateDetails} className="space-y-8">
          {/* Section 1: Customer Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Customer Details</h2>
              {selectedCustomer?.lastUpdatedOn && (
                <span className="text-xs text-gray-400 font-medium">
                  Last Updated On: {selectedCustomer.lastUpdatedOn}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-6 space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Name *</label>
                <Input
                  type="text"
                  value={form.name}
                  disabled
                  className="bg-slate-50 border-0 outline-none text-gray-500 font-medium cursor-not-allowed"
                  placeholder="Enter full name"
                  icon={User}
                  required
                />
              </div>
              <div className="md:col-span-3 space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Age *</label>
                <Input
                  type="number"
                  value={form.age}
                  disabled
                  className="bg-slate-50 border-0 outline-none text-gray-500 font-medium cursor-not-allowed"
                  placeholder="Age"
                  required
                />
              </div>
              <div className="md:col-span-3 space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Gender *</label>
                <Select
                  value={form.gender}
                  disabled
                  className="bg-slate-50 border-0 outline-none text-gray-500 font-medium cursor-not-allowed disabled:opacity-100"
                  options={[
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' },
                    { value: 'Other', label: 'Other' },
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Mobile Number *</label>
                <Input
                  type="tel"
                  value={form.mobile}
                  disabled
                  className="bg-slate-50 border-0 outline-none text-gray-500 font-medium cursor-not-allowed"
                  placeholder="Enter mobile number"
                  icon={Phone}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Customer Type *</label>
                <Select
                  value={form.customerType}
                  disabled
                  className="bg-slate-50 border-0 outline-none text-gray-500 font-medium cursor-not-allowed disabled:opacity-100"
                  options={[
                    { value: 'New', label: 'New' },
                    { value: 'Existing', label: 'Existing' },
                    { value: 'VIP', label: 'VIP' },
                  ]}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Preferred Language *</label>
                <Select
                  value={form.preferredLanguage}
                  disabled
                  className="bg-slate-50 border-0 outline-none text-gray-500 font-medium cursor-not-allowed disabled:opacity-100"
                  options={[
                    { value: 'English', label: 'English' },
                    { value: 'Hindi', label: 'Hindi' },
                    { value: 'Tamil', label: 'Tamil' },
                    { value: 'Telugu', label: 'Telugu' },
                    { value: 'Kannada', label: 'Kannada' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Store Login RX Table */}
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-400 rounded-lg shadow-sm">
              <Table className="w-full border-collapse text-center text-xs">
                <TableHeader className="[&_tr]:border-b border-slate-400 bg-slate-100">
                  <TableRow className="border-b border-slate-400 hover:bg-slate-100/50">
                    <TableHead colSpan={9} className="py-2.5 font-extrabold text-sm text-slate-900 text-center uppercase tracking-wider">
                      Store Login
                    </TableHead>
                  </TableRow>
                  <TableRow className="bg-slate-100/70 border-b border-slate-400 hover:bg-slate-100/50">
                    <TableHead colSpan={2} className="border-r border-slate-400 px-3 py-2 font-black text-xs text-[#1a2b6e] text-center uppercase tracking-wider whitespace-nowrap">R X</TableHead>
                    <TableHead className="border-r border-slate-400 px-3 py-2 font-black text-xs text-center text-[#1a2b6e]">Sph</TableHead>
                    <TableHead className="border-r border-slate-400 px-3 py-2 font-black text-xs text-center text-[#1a2b6e]">Cyl</TableHead>
                    <TableHead className="border-r border-slate-400 px-3 py-2 font-black text-xs text-center text-[#1a2b6e]">Axis</TableHead>
                    <TableHead className="border-r border-slate-400 px-3 py-2 font-black text-xs text-center text-[#1a2b6e]">PD</TableHead>
                    <TableHead className="border-r border-slate-400 px-3 py-2 font-black text-xs text-center text-[#1a2b6e]">Prism</TableHead>
                    <TableHead className="border-r border-slate-400 px-3 py-2 font-black text-xs text-center text-[#1a2b6e]">Base</TableHead>
                    <TableHead className="px-3 py-2 font-black text-xs text-[#1a2b6e] text-center">ADD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Auto Ref */}
                  <TableRow className="border-b border-slate-400">
                    <TableCell rowSpan={2} className="border-r border-b border-slate-400 font-black text-xs text-[#1a2b6e] bg-slate-50/50 px-3 py-4 w-[100px] text-center animate-none">Auto Ref</TableCell>
                    <TableCell className="border-r border-b border-slate-400 font-black text-xs text-[#1a2b6e] bg-slate-50/50 px-3 py-3 w-[60px] whitespace-nowrap text-center animate-none">R E</TableCell>
                    {['sph', 'cyl', 'axis', 'pd', 'prism', 'base', 'add'].map((field, idx) => (
                      <TableCell key={field} className={`border-b border-slate-400 p-0 ${idx < 6 ? 'border-r border-slate-400' : ''}`}>
                        <input
                          type="text"
                          value={rxForm.autoRefRe[field as keyof RxValues] || ''}
                          disabled
                          className="w-full h-full text-center bg-slate-50 border-0 outline-none px-3 py-2.5 text-xs text-gray-500 font-medium cursor-not-allowed"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow className="border-b border-slate-400">
                    <TableCell className="border-r border-b border-slate-400 font-black text-xs text-[#1a2b6e] bg-slate-50/50 px-3 py-3 whitespace-nowrap text-center animate-none">L E</TableCell>
                    {['sph', 'cyl', 'axis', 'pd', 'prism', 'base', 'add'].map((field, idx) => (
                      <TableCell key={field} className={`border-b border-slate-400 p-0 ${idx < 6 ? 'border-r border-slate-400' : ''}`}>
                        <input
                          type="text"
                          value={rxForm.autoRefLe[field as keyof RxValues] || ''}
                          disabled
                          className="w-full h-full text-center bg-slate-50 border-0 outline-none px-3 py-2.5 text-xs text-gray-500 font-medium cursor-not-allowed"
                        />
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* PGP */}
                  <TableRow className="border-b border-slate-400">
                    <TableCell rowSpan={2} className="border-r border-b border-slate-400 font-black text-xs text-[#1a2b6e] bg-slate-50/50 px-3 py-4 text-center animate-none">PGP</TableCell>
                    <TableCell className="border-r border-b border-slate-400 font-black text-xs text-[#1a2b6e] bg-slate-50/50 px-3 py-3 whitespace-nowrap text-center animate-none">R E</TableCell>
                    {['sph', 'cyl', 'axis', 'pd', 'prism', 'base', 'add'].map((field, idx) => (
                      <TableCell key={field} className={`border-b border-slate-400 p-0 ${idx < 6 ? 'border-r border-slate-400' : ''}`}>
                        <input
                          type="text"
                          value={rxForm.pgpRe[field as keyof RxValues] || ''}
                          disabled
                          className="w-full h-full text-center bg-slate-50 border-0 outline-none px-3 py-2.5 text-xs text-gray-500 font-medium cursor-not-allowed"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow className="border-0">
                    <TableCell className="border-r border-slate-400 font-black text-xs text-[#1a2b6e] bg-slate-50/50 px-3 py-3 whitespace-nowrap text-center animate-none">L E</TableCell>
                    {['sph', 'cyl', 'axis', 'pd', 'prism', 'base', 'add'].map((field, idx) => (
                      <TableCell key={field} className={`p-0 ${idx < 6 ? 'border-r border-slate-400' : ''}`}>
                        <input
                          type="text"
                          value={rxForm.pgpLe[field as keyof RxValues] || ''}
                          disabled
                          className="w-full h-full text-center bg-slate-50 border-0 outline-none px-3 py-2.5 text-xs text-gray-500 font-medium cursor-not-allowed"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>


          {/* Section 3: Store Action / Feedback */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600">Store Action / Feedback</label>
            <textarea
              value={form.storeFeedback}
              disabled
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500 bg-slate-50/50 shadow-sm resize-none transition-all font-medium cursor-not-allowed"
            />
          </div>

          {/* Section 4: Optom Login RX Table */}
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-400 rounded-lg shadow-sm">
              <Table className="w-full border-collapse text-center text-xs">
                <TableHeader className="[&_tr]:border-b border-slate-400 bg-slate-100">
                  <TableRow className="border-b border-slate-400 hover:bg-slate-100/50">
                    <TableHead colSpan={8} className="py-2.5 font-extrabold text-sm text-slate-900 text-center uppercase tracking-wider bg-slate-100">
                      Optom Login
                    </TableHead>
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
                    <TableHead className="border-r border-slate-400 px-3 py-2 font-black text-xs text-center text-[#1a2b6e]">Sph</TableHead>
                    <TableHead className="border-r border-slate-400 px-3 py-2 font-black text-xs text-center text-[#1a2b6e]">Cyl</TableHead>
                    <TableHead className="border-r border-slate-400 px-3 py-2 font-black text-xs text-center text-[#1a2b6e]">Axis</TableHead>
                    <TableHead className="border-r border-slate-400 px-3 py-2 font-black text-xs text-center text-[#1a2b6e]">Prism</TableHead>
                    <TableHead className="border-r border-slate-400 px-3 py-2 font-black text-xs text-center text-[#1a2b6e]">Base</TableHead>
                    <TableHead className="border-r border-slate-400 px-3 py-2 font-black text-xs text-center text-[#1a2b6e]">VA</TableHead>
                    <TableHead className="px-3 py-2 font-black text-xs text-[#1a2b6e] text-center">ADD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* RE row */}
                  <TableRow className="border-b border-slate-400">
                    <TableCell className="border-r border-b border-slate-400 font-black text-xs text-[#1a2b6e] bg-slate-50/50 py-3 whitespace-nowrap text-center animate-none">R E</TableCell>
                    {['sph', 'cyl', 'axis', 'prism', 'base', 'va', 'add'].map((field, idx) => (
                      <TableCell key={field} className={`border-b border-slate-400 p-0 ${idx < 6 ? 'border-r border-slate-400' : ''}`}>
                        <input
                          type="text"
                          value={optomRxForm.re[field as keyof OptomRxValues] || ''}
                          onChange={(e) => setOptomRxField('re', field as keyof OptomRxValues, e.target.value)}
                          className="w-full h-full text-center bg-transparent border-0 outline-none focus:ring-1 focus:ring-blue-500 px-3 py-2.5 text-xs text-gray-900 font-medium"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                  {/* LE row */}
                  <TableRow className="border-0">
                    <TableCell className="border-r border-slate-400 font-black text-xs text-[#1a2b6e] bg-slate-50/50 py-3 whitespace-nowrap text-center animate-none">L E</TableCell>
                    {['sph', 'cyl', 'axis', 'prism', 'base', 'va', 'add'].map((field, idx) => (
                      <TableCell key={field} className={`p-0 ${idx < 6 ? 'border-r border-slate-400' : ''}`}>
                        <input
                          type="text"
                          value={optomRxForm.le[field as keyof OptomRxValues] || ''}
                          onChange={(e) => setOptomRxField('le', field as keyof OptomRxValues, e.target.value)}
                          className="w-full h-full text-center bg-transparent border-0 outline-none focus:ring-1 focus:ring-blue-500 px-3 py-2.5 text-xs text-gray-900 font-medium"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Section 5: Optum Action / Feedback */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600">Optum Action / Feedback</label>
            <textarea
              value={form.optumFeedback}
              onChange={(e) => setField('optumFeedback')(e.target.value)}
              rows={3}
              placeholder="Enter clinical assessment details or feedback comments..."
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white shadow-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 transition-all font-medium"
            />
          </div>

          {/* Section 6: Status & Footer Buttons */}
          <div className="pt-4 border-t border-gray-150 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1.5 w-full sm:max-w-xs">
              <label className="text-xs font-bold text-gray-600">Status</label>
              <Select
                value={form.status}
                onChange={(e) => setField('status')(e.target.value)}
                options={[
                  { value: 'Created', label: 'Created' },
                  { value: 'Initiated', label: 'Initiated' },
                  { value: 'Accepted', label: 'Accepted' },
                  { value: 'Completed', label: 'Completed' },
                ]}
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end pt-5 sm:pt-0">
              {selectedCustomer?.callActive ? (
                selectedCustomer.callTakenBy === (localStorage.getItem('titan_user') ? JSON.parse(localStorage.getItem('titan_user') || '{}').name : '') ? (
                  <Button
                    type="button"
                    onClick={handleEndCall}
                    disabled={isCallLoading}
                    className="rounded-xl px-4 h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-98 cursor-pointer border border-gray-300"
                    title="End Call Session"
                  >
                    {isCallLoading ? (
                      <span className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                    ) : null}
                    Call Initiated
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled
                    className="rounded-xl px-4 h-10 bg-gray-200 text-gray-500 text-xs font-bold flex items-center gap-1.5 cursor-not-allowed opacity-100 border-0"
                    title={`Call already taken by ${selectedCustomer.callTakenBy}`}
                  >
                    Taken by {selectedCustomer.callTakenBy}
                  </Button>
                )
              ) : (
                <Button
                  type="button"
                  onClick={handleInitiateCall}
                  disabled={isCallLoading}
                  className="rounded-xl px-4 h-10 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-98 cursor-pointer"
                  title="Initiate Microsoft Teams Call"
                >
                  {isCallLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Video size={16} />
                  )}
                  Initiate Call
                </Button>
              )}
              {selectedCustomer?.callActive ? (
                <Button
                  type="button"
                  disabled
                  className="rounded-xl px-4 h-10 bg-gray-200 text-gray-500 text-xs font-bold flex items-center gap-1.5 cursor-not-allowed opacity-100 border-0"
                  title={
                    selectedCustomer.callTakenBy === (localStorage.getItem('titan_user') ? JSON.parse(localStorage.getItem('titan_user') || '{}').name : '')
                      ? "TeamViewer blocked: Call active"
                      : `TeamViewer blocked: call taken by ${selectedCustomer.callTakenBy}`
                  }
                >
                  <Monitor size={16} />
                  Open TeamViewer
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleOpenTeamViewer}
                  className="rounded-xl px-4 h-10 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-98 cursor-pointer"
                  title="Open TeamViewer Remote Control"
                >
                  <Monitor size={16} />
                  Open TeamViewer
                </Button>
              )}
              <Button
                type="submit"
                className="rounded-xl px-4 h-10 bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-98 cursor-pointer"
              >
                Update Customer Details
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </main>
  );
}
