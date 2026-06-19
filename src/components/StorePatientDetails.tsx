import * as React from 'react';
import {
  User,
  Phone,
  UserCircle,
  ChevronLeft,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Switch } from './ui/switch';
import { Customer, CustomerStatus, RxValues } from '../types';

interface StorePatientDetailsProps {
  isAddingNew: boolean;
  selectedCustomer: Customer | null;
  onBack: () => void;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  setSelectedCustomerId: (id: string | null) => void;
  customers: Customer[];
  toast: any;
}

export function StorePatientDetails({
  isAddingNew,
  selectedCustomer,
  onBack,
  setCustomers,
  setSelectedCustomerId,
  customers,
  toast,
}: StorePatientDetailsProps) {
  const [form, setForm] = React.useState({
    name: '',
    age: '',
    gender: 'Male',
    mobile: '',
    customerType: 'New',
    storeName: '',
    preferredLanguage: 'English',
    preferredLanguage2: 'None',
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

  React.useEffect(() => {
    if (selectedCustomer && !isAddingNew) {
      setForm({
        name: selectedCustomer.name || '',
        age: selectedCustomer.age || '',
        gender: selectedCustomer.gender || 'Male',
        mobile: selectedCustomer.mobile || '',
        customerType: selectedCustomer.customerType || 'New',
        storeName: selectedCustomer.storeName || '',
        preferredLanguage: selectedCustomer.preferredLanguage || 'English',
        preferredLanguage2: selectedCustomer.preferredLanguage2 || 'None',
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
    } else if (isAddingNew) {
      setForm({
        name: '',
        age: '',
        gender: 'Male',
        mobile: '',
        customerType: 'New',
        storeName: '',
        preferredLanguage: 'English',
        preferredLanguage2: 'None',
        storeFeedback: '',
        optumFeedback: '',
        status: 'Initiated',
        activeProfile: true,
      });
      setRxForm({
        autoRefRe: { sph: '', cyl: '', axis: '', pd: '', prism: '', base: '', add: '' },
        autoRefLe: { sph: '', cyl: '', axis: '', pd: '', prism: '', base: '', add: '' },
        pgpRe: { sph: '', cyl: '', axis: '', pd: '', prism: '', base: '', add: '' },
        pgpLe: { sph: '', cyl: '', axis: '', pd: '', prism: '', base: '', add: '' },
      });
    }
  }, [selectedCustomer, isAddingNew]);

  const setField = (key: string) => (val: any) => {
    setForm((f) => ({ ...f, [key]: val }));
  };

  const setRxField = (row: 'autoRefRe' | 'autoRefLe' | 'pgpRe' | 'pgpLe', field: keyof RxValues, val: string) => {
    setRxForm((prev) => ({
      ...prev,
      [row]: {
        ...prev[row],
        [field]: val,
      },
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.age || !form.mobile) {
      toast({
        title: 'Validation Error',
        description: 'Please specify the Name, Age, and Mobile number.',
        type: 'error',
      });
      return;
    }

    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true,
    });

    if (isAddingNew) {
      // Generate new ID
      const numericIds = customers
        .map((c) => parseInt(c.id.replace('#', ''), 10))
        .filter((n) => !isNaN(n));
      const nextNum = Math.max(...numericIds, 0) + 1;
      const newId = `#${String(nextNum).padStart(4, '0')}`;

      const newCustomer: Customer = {
        id: newId,
        name: form.name,
        age: form.age,
        gender: form.gender,
        mobile: form.mobile,
        customerType: form.customerType,
        storeName: form.storeName,
        preferredLanguage: form.preferredLanguage,
        preferredLanguage2: form.preferredLanguage2,
        storeFeedback: form.storeFeedback,
        optumFeedback: '',
        status: form.status,
        activeProfile: form.activeProfile,
        lastUpdatedOn: `${timestamp}`,
        rxData: rxForm,
      };

      setCustomers((prev) => [newCustomer, ...prev]);
      setSelectedCustomerId(newId);
      onBack();

      toast({
        title: 'Patient Registered',
        description: `Successfully added ${form.name} with ID ${newId}`,
        type: 'success',
      });
    } else {
      if (!selectedCustomer) return;

      setCustomers((prev) =>
        prev.map((c) =>
          c.id === selectedCustomer.id
            ? {
                ...c,
                name: form.name,
                age: form.age,
                gender: form.gender,
                mobile: form.mobile,
                customerType: form.customerType,
                storeName: form.storeName,
                preferredLanguage: form.preferredLanguage,
                preferredLanguage2: form.preferredLanguage2,
                storeFeedback: form.storeFeedback,
                status: form.status,
                activeProfile: form.activeProfile,
                lastUpdatedOn: `${timestamp}`,
                rxData: rxForm,
              }
            : c
        )
      );

      onBack();

      toast({
        title: 'Profile Updated',
        description: `Patient details for ${form.name} have been updated.`,
        type: 'success',
      });
    }
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
            <h1 className="text-xl font-bold text-gray-900">
              {isAddingNew ? 'New Enrollment' : 'Edit Patient Profile'}
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              {isAddingNew ? 'Manage assessment details and feedback.' : `ID: ${selectedCustomer?.id} • Manage assessment details and feedback.`}
            </p>
          </div>
        </div>
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

      {/* Customer Details Form & Table Card */}
      <Card className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8">
        <form onSubmit={handleFormSubmit} className="space-y-8">
          {/* Section 1: Customer Details */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Customer Details</h2>
            
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
                <label className="text-xs font-bold text-gray-600">Store Name</label>
                <Input
                  type="text"
                  value={form.storeName}
                  onChange={(e) => setField('storeName')(e.target.value)}
                  placeholder="Enter store name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Preferred Language 1 *</label>
                <Select
                  value={form.preferredLanguage}
                  onChange={(e) => setField('preferredLanguage')(e.target.value)}
                  options={[
                    { value: 'English', label: 'English' },
                    { value: 'Hindi', label: 'Hindi' },
                    { value: 'Tamil', label: 'Tamil' },
                    { value: 'Telugu', label: 'Telugu' },
                    { value: 'Kannada', label: 'Kannada' },
                    { value: 'Malayalam', label: 'Malayalam' },
                    { value: 'Marathi', label: 'Marathi' },
                    { value: 'Bengali', label: 'Bengali' },
                    { value: 'Gujarati', label: 'Gujarati' },
                  ]}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Preferred Language 2</label>
                <Select
                  value={form.preferredLanguage2}
                  onChange={(e) => setField('preferredLanguage2')(e.target.value)}
                  options={[
                    { value: 'None', label: 'None' },
                    { value: 'English', label: 'English' },
                    { value: 'Hindi', label: 'Hindi' },
                    { value: 'Tamil', label: 'Tamil' },
                    { value: 'Telugu', label: 'Telugu' },
                    { value: 'Kannada', label: 'Kannada' },
                    { value: 'Malayalam', label: 'Malayalam' },
                    { value: 'Marathi', label: 'Marathi' },
                    { value: 'Bengali', label: 'Bengali' },
                    { value: 'Gujarati', label: 'Gujarati' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Section 2: RX Table */}
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
                          onChange={(e) => setRxField('autoRefRe', field as keyof RxValues, e.target.value)}
                          className="w-full h-full text-center bg-transparent border-0 outline-none focus:ring-1 focus:ring-blue-500 py-2.5 text-xs text-gray-900 font-medium"
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
                          onChange={(e) => setRxField('autoRefLe', field as keyof RxValues, e.target.value)}
                          className="w-full h-full text-center bg-transparent border-0 outline-none focus:ring-1 focus:ring-blue-500 py-2.5 text-xs text-gray-900 font-medium"
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
                          onChange={(e) => setRxField('pgpRe', field as keyof RxValues, e.target.value)}
                          className="w-full h-full text-center bg-transparent border-0 outline-none focus:ring-1 focus:ring-blue-500 py-2.5 text-xs text-gray-900 font-medium"
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
                          onChange={(e) => setRxField('pgpLe', field as keyof RxValues, e.target.value)}
                          className="w-full h-full text-center bg-transparent border-0 outline-none focus:ring-1 focus:ring-blue-500 py-2.5 text-xs text-gray-900 font-medium"
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
              onChange={(e) => setField('storeFeedback')(e.target.value)}
              rows={4}
              placeholder="Enter clinical assessment details or feedback comments..."
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white shadow-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 transition-all font-medium"
            />
          </div>

          {/* Section 4: Status & Active Profile Toggle & Create Button */}
          <div className="pt-4 border-t border-gray-150 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 select-none">
                <Switch
                  checked={form.activeProfile}
                  onCheckedChange={(checked) => setField('activeProfile')(checked)}
                  id="page-active-profile"
                />
                <label htmlFor="page-active-profile" className="text-xs font-bold text-gray-600 cursor-pointer">
                  Active Profile
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="rounded-xl h-10 px-5 font-bold text-xs border-gray-200 text-gray-500 hover:bg-slate-50 shadow-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl h-10 px-6 font-bold text-xs bg-[#1a2b6e] hover:bg-[#152260] text-white shadow-md active:scale-98 transition-all"
              >
                {isAddingNew ? 'Create' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </main>
  );
}
