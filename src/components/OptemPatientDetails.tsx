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
  const [form, setForm] = React.useState({
    name: '',
    age: '',
    gender: 'Male',
    mobile: '',
    customerType: 'New',
    preferredLanguage: 'English',
    storeFeedback: '',
    optumFeedback: '',
    status: 'Initiated' as CustomerStatus,
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
    setOptomRxForm((prev) => ({
      ...prev,
      [eye]: {
        ...prev[eye],
        [field]: val,
      },
    }));
  };

  const handleUpdateDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

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
      status: form.status,
      activeProfile: form.activeProfile,
      rxData: rxForm,
      optomRxData: optomRxForm,
      lastUpdatedOn: timestamp,
    };

    fetch(`${apiBaseUrl}/customers/${encodeURIComponent(selectedCustomer.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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
          description: 'Failed to connect to backend database.',
          type: 'error',
        });
      });
  };

  // Detect mobile/tablet — server.js local agent cannot run on phones/tablets
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);
  const localAgentUrl = import.meta.env.VITE_LOCAL_SERVICE_URL || 'http://localhost:3001/api';

  const handleInitiateCall = () => {
    toast({
      title: 'Video Call',
      description: `Initiating video consultation with patient ${form.name}...`,
      type: 'info',
    });

    if (isMobile) {
      // Mobile: msteams:// opens Teams app directly (bypasses popup blockers)
      window.location.href = 'msteams://';
      // Fallback to web Teams after 2s if app is not installed
      setTimeout(() => window.open('https://teams.microsoft.com/v2/', '_blank'), 2000);
      return;
    }

    // Desktop: fire URI scheme immediately (guaranteed to open app if installed)
    window.location.href = 'msteams://';

    // Also call server.js in parallel for Chrome PWA window positioning
    fetch(`${localAgentUrl}/open-teams`, { method: 'POST' }).catch(() => {
      // server.js not running — URI scheme above already handled it, nothing to do
    });
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

    // Also call server.js in parallel for window auto-positioning
    fetch(`${localAgentUrl}/open-teamviewer`, { method: 'POST' }).catch(() => {
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
                  onChange={(e) => setField('name')(e.target.value)}
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
                  onChange={(e) => setField('age')(e.target.value)}
                  placeholder="Age"
                  required
                />
              </div>
              <div className="md:col-span-3 space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Gender *</label>
                <Select
                  value={form.gender}
                  onChange={(e) => setField('gender')(e.target.value)}
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
                  onChange={(e) => setField('mobile')(e.target.value)}
                  placeholder="Enter mobile number"
                  icon={Phone}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Customer Type *</label>
                <Select
                  value={form.customerType}
                  onChange={(e) => setField('customerType')(e.target.value)}
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
                  onChange={(e) => setField('preferredLanguage')(e.target.value)}
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
              <table className="w-full border-collapse text-center text-xs">
                <thead>
                  <tr>
                    <th colSpan={9} className="border-b border-slate-400 py-2.5 font-extrabold text-sm text-slate-900 uppercase tracking-wider bg-slate-100">
                      Store Login
                    </th>
                  </tr>
                  <tr className="bg-slate-50/30">
                    <th colSpan={2} className="border-r border-b border-slate-400"></th>
                    <th className="border-r border-b border-slate-400 py-1 text-blue-600 font-extrabold text-[14px]">*</th>
                    <th className="border-r border-b border-slate-400 py-1 text-blue-600 font-extrabold text-[14px]">*</th>
                    <th className="border-r border-b border-slate-400 py-1 text-blue-600 font-extrabold text-[14px]">*</th>
                    <th className="border-r border-b border-slate-400 py-1 text-blue-600 font-extrabold text-[14px]">*</th>
                    <th className="border-r border-b border-slate-400"></th>
                    <th className="border-r border-b border-slate-400"></th>
                    <th className="border-b border-slate-400"></th>
                  </tr>
                  <tr className="bg-slate-100/70">
                    <th colSpan={2} className="border-r border-b border-slate-400 py-2 font-black text-xs text-[#1a2b6e] uppercase tracking-wider">RX</th>
                    <th className="border-r border-b border-slate-400 py-2 font-black text-xs text-[#1a2b6e]">Sph</th>
                    <th className="border-r border-b border-slate-400 py-2 font-black text-xs text-[#1a2b6e]">Cyl</th>
                    <th className="border-r border-b border-slate-400 py-2 font-black text-xs text-[#1a2b6e]">Axis</th>
                    <th className="border-r border-b border-slate-400 py-2 font-black text-xs text-[#1a2b6e]">PD</th>
                    <th className="border-r border-b border-slate-400 py-2 font-black text-xs text-[#1a2b6e]">Prism</th>
                    <th className="border-r border-b border-slate-400 py-2 font-black text-xs text-[#1a2b6e]">Base</th>
                    <th className="border-b border-slate-400 py-2 font-black text-xs text-[#1a2b6e]">ADD</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Auto Ref */}
                  <tr>
                    <td rowSpan={2} className="border-r border-b border-slate-400 font-black text-xs text-[#1a2b6e] bg-slate-50/50 px-3 py-4 w-[100px]">Auto Ref</td>
                    <td className="border-r border-b border-slate-400 font-black text-xs text-[#1a2b6e] bg-slate-50/50 py-3 w-[60px]">RE</td>
                    {['sph', 'cyl', 'axis', 'pd', 'prism', 'base', 'add'].map((field, idx) => (
                      <td key={field} className={`border-b border-slate-400 p-0 ${idx < 6 ? 'border-r' : ''}`}>
                        <input
                          type="text"
                          value={rxForm.autoRefRe[field as keyof RxValues] || ''}
                          disabled
                          className="w-full h-full text-center bg-slate-50 border-0 outline-none py-2.5 text-xs text-gray-500 font-medium cursor-not-allowed"
                        />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="border-r border-b border-slate-400 font-black text-xs text-[#1a2b6e] bg-slate-50/50 py-3">LE</td>
                    {['sph', 'cyl', 'axis', 'pd', 'prism', 'base', 'add'].map((field, idx) => (
                      <td key={field} className={`border-b border-slate-400 p-0 ${idx < 6 ? 'border-r' : ''}`}>
                        <input
                          type="text"
                          value={rxForm.autoRefLe[field as keyof RxValues] || ''}
                          disabled
                          className="w-full h-full text-center bg-slate-50 border-0 outline-none py-2.5 text-xs text-gray-500 font-medium cursor-not-allowed"
                        />
                      </td>
                    ))}
                  </tr>

                  {/* PGP */}
                  <tr>
                    <td rowSpan={2} className="border-r border-slate-400 font-black text-xs text-[#1a2b6e] bg-slate-50/50 px-3 py-4">PGP</td>
                    <td className="border-r border-b border-slate-400 font-black text-xs text-[#1a2b6e] bg-slate-50/50 py-3">RE</td>
                    {['sph', 'cyl', 'axis', 'pd', 'prism', 'base', 'add'].map((field, idx) => (
                      <td key={field} className={`border-b border-slate-400 p-0 ${idx < 6 ? 'border-r' : ''}`}>
                        <input
                          type="text"
                          value={rxForm.pgpRe[field as keyof RxValues] || ''}
                          disabled
                          className="w-full h-full text-center bg-slate-50 border-0 outline-none py-2.5 text-xs text-gray-500 font-medium cursor-not-allowed"
                        />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="border-r border-slate-400 font-black text-xs text-[#1a2b6e] bg-slate-50/50 py-3">LE</td>
                    {['sph', 'cyl', 'axis', 'pd', 'prism', 'base', 'add'].map((field, idx) => (
                      <td key={field} className={`p-0 ${idx < 6 ? 'border-r' : ''}`}>
                        <input
                          type="text"
                          value={rxForm.pgpLe[field as keyof RxValues] || ''}
                          disabled
                          className="w-full h-full text-center bg-slate-50 border-0 outline-none py-2.5 text-xs text-gray-500 font-medium cursor-not-allowed"
                        />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
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
              <table className="w-full border-collapse text-center text-xs">
                <thead>
                  <tr>
                    <th colSpan={8} className="border-b border-slate-400 py-2.5 font-extrabold text-sm text-slate-900 uppercase tracking-wider bg-slate-100">
                      Optom Login
                    </th>
                  </tr>
                  <tr className="bg-slate-50/30">
                    <th className="border-r border-b border-slate-400 w-[100px]"></th>
                    <th className="border-r border-b border-slate-400 py-1 text-blue-600 font-extrabold text-[14px]">*</th>
                    <th className="border-r border-b border-slate-400 py-1 text-blue-600 font-extrabold text-[14px]">*</th>
                    <th className="border-r border-b border-slate-400 py-1 text-blue-600 font-extrabold text-[14px]">*</th>
                    <th className="border-r border-b border-slate-400"></th>
                    <th className="border-r border-b border-slate-400"></th>
                    <th className="border-r border-b border-slate-400 py-1 text-blue-600 font-extrabold text-[14px]">*</th>
                    <th className="border-b border-slate-400"></th>
                  </tr>
                  <tr className="bg-slate-100/70">
                    <th className="border-r border-b border-slate-400 py-2 font-black text-xs text-[#1a2b6e] uppercase tracking-wider">RX</th>
                    <th className="border-r border-b border-slate-400 py-2 font-black text-xs text-[#1a2b6e]">Sph</th>
                    <th className="border-r border-b border-slate-400 py-2 font-black text-xs text-[#1a2b6e]">Cyl</th>
                    <th className="border-r border-b border-slate-400 py-2 font-black text-xs text-[#1a2b6e]">Axis</th>
                    <th className="border-r border-b border-slate-400 py-2 font-black text-xs text-[#1a2b6e]">Prism</th>
                    <th className="border-r border-b border-slate-400 py-2 font-black text-xs text-[#1a2b6e]">Base</th>
                    <th className="border-r border-b border-slate-400 py-2 font-black text-xs text-[#1a2b6e]">VA</th>
                    <th className="border-b border-slate-400 py-2 font-black text-xs text-[#1a2b6e]">ADD</th>
                  </tr>
                </thead>
                <tbody>
                  {/* RE row */}
                  <tr>
                    <td className="border-r border-b border-slate-400 font-black text-xs text-[#1a2b6e] bg-slate-50/50 py-3">RE</td>
                    {['sph', 'cyl', 'axis', 'prism', 'base', 'va', 'add'].map((field, idx) => (
                      <td key={field} className={`border-b border-slate-400 p-0 ${idx < 6 ? 'border-r' : ''}`}>
                        <input
                          type="text"
                          value={optomRxForm.re[field as keyof OptomRxValues] || ''}
                          onChange={(e) => setOptomRxField('re', field as keyof OptomRxValues, e.target.value)}
                          className="w-full h-full text-center bg-transparent border-0 outline-none focus:ring-1 focus:ring-blue-500 py-2.5 text-xs text-gray-900 font-medium"
                        />
                      </td>
                    ))}
                  </tr>
                  {/* LE row */}
                  <tr>
                    <td className="border-r border-slate-400 font-black text-xs text-[#1a2b6e] bg-slate-50/50 py-3">LE</td>
                    {['sph', 'cyl', 'axis', 'prism', 'base', 'va', 'add'].map((field, idx) => (
                      <td key={field} className={`p-0 ${idx < 6 ? 'border-r' : ''}`}>
                        <input
                          type="text"
                          value={optomRxForm.le[field as keyof OptomRxValues] || ''}
                          onChange={(e) => setOptomRxField('le', field as keyof OptomRxValues, e.target.value)}
                          className="w-full h-full text-center bg-transparent border-0 outline-none focus:ring-1 focus:ring-blue-500 py-2.5 text-xs text-gray-900 font-medium"
                        />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
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
                onChange={(e) => setField('status')(e.target.value as CustomerStatus)}
                options={[
                  { value: 'Initiated', label: 'Initiated' },
                  { value: 'Accepted', label: 'Accepted' },
                  { value: 'Completed', label: 'Completed' },
                ]}
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end pt-5 sm:pt-0">
              <Button
                type="button"
                onClick={handleInitiateCall}
                className="rounded-xl px-4 h-10 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-98 cursor-pointer"
                title="Initiate Microsoft Teams Call"
              >
                <Video size={16} />
                Initiate Call
              </Button>
              <Button
                type="button"
                onClick={handleOpenTeamViewer}
                className="rounded-xl px-4 h-10 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-98 cursor-pointer"
                title="Open TeamViewer Remote Control"
              >
                <Monitor size={16} />
                Open TeamViewer
              </Button>
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
