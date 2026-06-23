import * as React from 'react';
import {
  User,
  Phone,
  UserCircle,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { useToast } from '../../components/ui/toast';
import { useAppDispatch, useAppSelector } from '../../store';
import { createCustomerAction, updateCustomerAction } from '../../Actions/customerActions';
import type { Customer, CustomerStatus, RxValues, OptomRxValues } from '../../types';

interface StorePatientDetailsProps {
  isAddingNew: boolean;
  selectedCustomer: Customer | null;
  onBack: () => void;
  setSelectedCustomerId: (id: string | null) => void;
}

const emptyRxValues: RxValues = { sph: '', cyl: '', axis: '', pd: '', prism: '', base: '', add: '' };
const emptyOptomRxValues: OptomRxValues = { sph: '', cyl: '', axis: '', prism: '', base: '', va: '', add: '' };

export function StorePatientDetails({
  isAddingNew,
  selectedCustomer,
  onBack,
  setSelectedCustomerId,
}: StorePatientDetailsProps) {
  const user = useAppSelector((state) => state.auth.user);
  const customers = useAppSelector((state) => state.customers.customers);
  const dispatch = useAppDispatch();
  const { toast } = useToast();

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
    status: 'Created' as CustomerStatus,
    activeProfile: false,
  });

  const [rxForm, setRxForm] = React.useState({
    autoRefRe: { ...emptyRxValues },
    autoRefLe: { ...emptyRxValues },
    pgpRe: { ...emptyRxValues },
    pgpLe: { ...emptyRxValues },
  });

  const [optomRxForm, setOptomRxForm] = React.useState({
    re: { ...emptyOptomRxValues },
    le: { ...emptyOptomRxValues },
  });

  React.useEffect(() => {
    if (selectedCustomer && !isAddingNew) {
      setForm({
        name: selectedCustomer.name || '',
        age: selectedCustomer.age || '',
        gender: selectedCustomer.gender || 'Male',
        mobile: selectedCustomer.mobile || '',
        customerType: selectedCustomer.customerType || 'New',
        storeName: selectedCustomer.storeName || user?.name || '',
        preferredLanguage: selectedCustomer.preferredLanguage || 'English',
        preferredLanguage2: selectedCustomer.preferredLanguage2 || 'None',
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
      if (selectedCustomer.optomRxData) {
        setOptomRxForm({
          re: { ...selectedCustomer.optomRxData.re },
          le: { ...selectedCustomer.optomRxData.le },
        });
      } else {
        setOptomRxForm({
          re: { ...emptyOptomRxValues },
          le: { ...emptyOptomRxValues },
        });
      }
    } else if (isAddingNew) {
      setForm({
        name: '',
        age: '',
        gender: 'Male',
        mobile: '',
        customerType: 'New',
        storeName: user?.name || '',
        preferredLanguage: 'English',
        preferredLanguage2: 'None',
        storeFeedback: '',
        optumFeedback: '',
        status: 'Created',
        activeProfile: true,
      });
      setRxForm({
        autoRefRe: { ...emptyRxValues },
        autoRefLe: { ...emptyRxValues },
        pgpRe: { ...emptyRxValues },
        pgpLe: { ...emptyRxValues },
      });
      setOptomRxForm({
        re: { ...emptyOptomRxValues },
        le: { ...emptyOptomRxValues },
      });
    }
  }, [selectedCustomer, isAddingNew, user]);

  const setField = (key: string) => (val: string | boolean) => {
    setForm((f) => ({ ...f, [key]: val }));
  };

  const setRxField = (row: 'autoRefRe' | 'autoRefLe' | 'pgpRe' | 'pgpLe', field: keyof RxValues, val: string) => {
    const cleanVal = val.replace(/[a-zA-Z]/g, '');
    setRxForm((prev) => ({
      ...prev,
      [row]: { ...prev[row], [field]: cleanVal },
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.age || !form.mobile) {
      toast({ title: 'Validation Error', description: 'Please specify the Name, Age, and Mobile number.', type: 'error' });
      return;
    }

    if (!/^[0-9]{10}$/.test(form.mobile)) {
      toast({ title: 'Validation Error', description: 'Mobile number must be exactly 10 digits.', type: 'error' });
      return;
    }

    if (!rxForm.autoRefRe.sph || !rxForm.autoRefRe.cyl || !rxForm.autoRefRe.axis || !rxForm.autoRefRe.pd) {
      toast({ title: 'Validation Error', description: 'Sph, Cyl, Axis, and PD are required fields for Auto Ref R E.', type: 'error' });
      return;
    }

    if (!rxForm.autoRefLe.sph || !rxForm.autoRefLe.cyl || !rxForm.autoRefLe.axis || !rxForm.autoRefLe.pd) {
      toast({ title: 'Validation Error', description: 'Sph, Cyl, Axis, and PD are required fields for Auto Ref L E.', type: 'error' });
      return;
    }

    const hasPgpRe = Object.values(rxForm.pgpRe).some((v) => v !== '');
    if (hasPgpRe && (!rxForm.pgpRe.sph || !rxForm.pgpRe.cyl || !rxForm.pgpRe.axis || !rxForm.pgpRe.pd)) {
      toast({ title: 'Validation Error', description: 'Sph, Cyl, Axis, and PD are required fields for PGP R E.', type: 'error' });
      return;
    }

    const hasPgpLe = Object.values(rxForm.pgpLe).some((v) => v !== '');
    if (hasPgpLe && (!rxForm.pgpLe.sph || !rxForm.pgpLe.cyl || !rxForm.pgpLe.axis || !rxForm.pgpLe.pd)) {
      toast({ title: 'Validation Error', description: 'Sph, Cyl, Axis, and PD are required fields for PGP L E.', type: 'error' });
      return;
    }

    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true,
    });

    if (isAddingNew) {
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
        lastUpdatedOn: timestamp,
        rxData: rxForm,
      };

      try {
        const created = await dispatch(createCustomerAction(newCustomer));
        setSelectedCustomerId(created.id);
        onBack();
        toast({ title: 'Patient Registered', description: `Successfully added ${form.name} with ID ${created.id}`, type: 'success' });
      } catch (err: any) {
        toast({ title: 'Error Saving Patient', description: err.message || 'Failed to connect to backend database.', type: 'error' });
      }
    } else {
      if (!selectedCustomer) return;

      const updatedCustomer: Customer = {
        ...selectedCustomer,
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
        lastUpdatedOn: timestamp,
        rxData: rxForm,
      };

      try {
        await dispatch(updateCustomerAction(selectedCustomer.id, updatedCustomer));
        onBack();
        toast({ title: 'Profile Updated', description: `Patient details for ${form.name} have been updated.`, type: 'success' });
      } catch (err: any) {
        toast({ title: 'Error Updating Patient', description: err.message || 'Failed to connect to backend database.', type: 'error' });
      }
    }
  };

  const rxFields: (keyof RxValues)[] = ['sph', 'cyl', 'axis', 'pd', 'prism', 'base', 'add'];
  const optomFields: (keyof OptomRxValues)[] = ['sph', 'cyl', 'axis', 'prism', 'base', 'va', 'add'];

  return (
    <main className="flex-1 px-8 py-8 space-y-6 w-full max-w-7xl mx-auto animate-in fade-in duration-200">
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
              {isAddingNew
                ? 'Manage assessment details and feedback.'
                : `ID: ${selectedCustomer?.id} • Manage assessment details and feedback.`}
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

      <Card className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8">
        <form onSubmit={handleFormSubmit} className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Customer Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-6 space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Name *</label>
                <Input type="text" value={form.name} onChange={(e) => setField('name')(e.target.value)} placeholder="Enter full name" icon={User} required />
              </div>
              <div className="md:col-span-3 space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Age *</label>
                <Input type="number" value={form.age} onChange={(e) => setField('age')(e.target.value)} placeholder="Age" required />
              </div>
              <div className="md:col-span-3 space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Gender *</label>
                <Select value={form.gender} onChange={(e) => setField('gender')(e.target.value)} options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Mobile Number *</label>
                <Input type="tel" value={form.mobile} onChange={(e) => setField('mobile')(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="Enter mobile number" icon={Phone} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Customer Type *</label>
                <Select value={form.customerType} onChange={(e) => setField('customerType')(e.target.value)} options={[{ value: 'New', label: 'New' }, { value: 'Existing', label: 'Existing' }, { value: 'VIP', label: 'VIP' }]} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Store Name</label>
                <Input type="text" value={form.storeName} disabled className="bg-slate-50 border-0 outline-none text-gray-500 font-medium cursor-not-allowed" placeholder="Store Name" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Preferred Language 1 *</label>
                <Select value={form.preferredLanguage} onChange={(e) => setField('preferredLanguage')(e.target.value)} options={[{ value: 'English', label: 'English' }, { value: 'Hindi', label: 'Hindi' }, { value: 'Tamil', label: 'Tamil' }, { value: 'Telugu', label: 'Telugu' }, { value: 'Kannada', label: 'Kannada' }, { value: 'Malayalam', label: 'Malayalam' }, { value: 'Marathi', label: 'Marathi' }, { value: 'Bengali', label: 'Bengali' }, { value: 'Gujarati', label: 'Gujarati' }]} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Preferred Language 2</label>
                <Select value={form.preferredLanguage2} onChange={(e) => setField('preferredLanguage2')(e.target.value)} options={[{ value: 'None', label: 'None' }, { value: 'English', label: 'English' }, { value: 'Hindi', label: 'Hindi' }, { value: 'Tamil', label: 'Tamil' }, { value: 'Telugu', label: 'Telugu' }, { value: 'Kannada', label: 'Kannada' }, { value: 'Malayalam', label: 'Malayalam' }, { value: 'Marathi', label: 'Marathi' }, { value: 'Bengali', label: 'Bengali' }, { value: 'Gujarati', label: 'Gujarati' }]} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-400 rounded-lg shadow-sm">
              <Table className="w-full border-collapse text-center text-xs">
                <TableHeader className="[&_tr]:border-b border-slate-400 bg-slate-100">
                  <TableRow className="border-b border-slate-400 hover:bg-slate-100/50">
                    <TableHead colSpan={9} className="py-2.5 font-extrabold text-sm text-slate-900 text-center uppercase tracking-wider bg-slate-100 animate-none">Store Login</TableHead>
                  </TableRow>
                  <TableRow className="bg-slate-100/50 border-b border-slate-400 hover:bg-slate-100/50">
                    <TableHead colSpan={2} className="border-r border-slate-400 py-1 text-center font-bold text-blue-600 text-sm"></TableHead>
                    <TableHead className="border-r border-slate-400 py-1 text-center font-bold text-blue-600 text-sm">*</TableHead>
                    <TableHead className="border-r border-slate-400 py-1 text-center font-bold text-blue-600 text-sm">*</TableHead>
                    <TableHead className="border-r border-slate-400 py-1 text-center font-bold text-blue-600 text-sm">*</TableHead>
                    <TableHead className="border-r border-slate-400 py-1 text-center font-bold text-blue-600 text-sm">*</TableHead>
                    <TableHead className="border-r border-slate-400 py-1 text-center font-bold text-blue-600 text-sm"></TableHead>
                    <TableHead className="border-r border-slate-400 py-1 text-center font-bold text-blue-600 text-sm"></TableHead>
                    <TableHead className="py-1 text-center font-bold text-blue-600 text-sm"></TableHead>
                  </TableRow>
                  <TableRow className="bg-slate-100/70 border-b border-slate-400 hover:bg-slate-100/50">
                    <TableHead colSpan={2} className="border-r border-slate-400 px-3 py-2 font-black text-xs text-[#1a2b6e] text-center uppercase tracking-wider whitespace-nowrap">R X</TableHead>
                    {['Sph', 'Cyl', 'Axis', 'PD', 'Prism', 'Base', 'ADD'].map((h) => (
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
                          <input
                            type="text"
                            value={rxForm[row][field] || ''}
                            onChange={(e) => setRxField(row, field, e.target.value)}
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

          {!isAddingNew && (
            <div className="space-y-4">
              <div className="overflow-x-auto border border-slate-400 rounded-lg shadow-sm">
                <Table className="w-full border-collapse text-center text-xs">
                  <TableHeader className="[&_tr]:border-b border-slate-400 bg-slate-100">
                    <TableRow className="border-b border-slate-400 hover:bg-slate-100/50">
                      <TableHead colSpan={8} className="py-2.5 font-extrabold text-sm text-slate-900 text-center uppercase tracking-wider">Optom Login</TableHead>
                    </TableRow>
                    <TableRow className="bg-slate-100/70 border-b border-slate-400 hover:bg-slate-100/50">
                      <TableHead className="border-r border-slate-400 px-3 py-2 font-black text-xs text-[#1a2b6e] text-center uppercase tracking-wider whitespace-nowrap">R X</TableHead>
                      {['Sph', 'Cyl', 'Axis', 'Prism', 'Base', 'VA', 'ADD'].map((h) => (
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
                        {optomFields.map((field, fIdx) => (
                          <TableCell key={field} className={`${idx === 0 ? 'border-b border-slate-400' : ''} p-0 ${fIdx < 6 ? 'border-r border-slate-400' : ''}`}>
                            <input
                              type="text"
                              value={optomRxForm[eye][field] || ''}
                              disabled
                              className="w-full h-full text-center bg-slate-50 border-0 outline-none px-3 py-2.5 text-xs text-gray-500 font-medium cursor-not-allowed"
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

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

          <div className="pt-4 border-t border-gray-150 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6"></div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Button type="button" variant="outline" onClick={onBack} className="rounded-xl h-10 px-5 font-bold text-xs border-gray-200 text-gray-500 hover:bg-slate-50 shadow-sm">
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl h-10 px-6 font-bold text-xs bg-[#1a2b6e] hover:bg-[#152260] text-white shadow-md active:scale-98 transition-all">
                {isAddingNew ? 'Create' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </main>
  );
}
