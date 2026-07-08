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
import type { Customer, CustomerStatus, RxValues, OptemRxValues, StorePatientDetailsProps } from '../../types';
import { rxFields, optemFields, rxHeaders, optemHeaders } from '../../options/Option';
import { cn } from '../../lib/utils';
import { RichTextEditor } from '../../components/ui/RichTextEditor';

const emptyRxValues: RxValues = { sph: '', cyl: '', axis: '', pd: '', prism: '', base: '', add: '' };
const emptyOptemRxValues: OptemRxValues = { sph: '', cyl: '', axis: '', prism: '', base: '', va: '', add: '' };
const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Bengali', 'Gujarati'];

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

  const [errors, setErrors] = React.useState<Record<string, string>>({});



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
    optemFeedback: '',
    status: 'Created' as CustomerStatus,
    activeProfile: false,
  });

  const [rxForm, setRxForm] = React.useState({
    autoRefRe: { ...emptyRxValues },
    autoRefLe: { ...emptyRxValues },
    pgpRe: { ...emptyRxValues },
    pgpLe: { ...emptyRxValues },
  });

  const [optemRxForm, setOptemRxForm] = React.useState({
    re: { ...emptyOptemRxValues },
    le: { ...emptyOptemRxValues },
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
        optemFeedback: selectedCustomer.optemFeedback || '',
        status: selectedCustomer.status,
        activeProfile: selectedCustomer.activeProfile || false,
      });
      setRxForm(selectedCustomer.rxData || {
        autoRefRe: { ...emptyRxValues },
        autoRefLe: { ...emptyRxValues },
        pgpRe: { ...emptyRxValues },
        pgpLe: { ...emptyRxValues },
      });
      if (selectedCustomer.optemRxData) {
        setOptemRxForm({
          re: { ...selectedCustomer.optemRxData.re },
          le: { ...selectedCustomer.optemRxData.le },
        });
      } else {
        setOptemRxForm({
          re: { ...emptyOptemRxValues },
          le: { ...emptyOptemRxValues },
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
        optemFeedback: '',
        status: 'Created',
        activeProfile: true,
      });
      setRxForm({
        autoRefRe: { ...emptyRxValues },
        autoRefLe: { ...emptyRxValues },
        pgpRe: { ...emptyRxValues },
        pgpLe: { ...emptyRxValues },
      });
      setOptemRxForm({
        re: { ...emptyOptemRxValues },
        le: { ...emptyOptemRxValues },
      });
    }
  }, [selectedCustomer, isAddingNew, user]);

  const setField = (key: string) => (val: string | boolean) => {
    setForm((f) => {
      const next = { ...f, [key]: val };
      if (key === 'preferredLanguage' && val === f.preferredLanguage2 && val !== 'None') {
        next.preferredLanguage2 = 'None';
      }
      return next;
    });
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        if (key === 'preferredLanguage' && next.preferredLanguage2) {
          delete next.preferredLanguage2;
        }
        return next;
      });
    }
  };

  const setRxField = (row: 'autoRefRe' | 'autoRefLe' | 'pgpRe' | 'pgpLe', field: keyof RxValues, val: string) => {
    const cleanVal = val.replace(/[a-zA-Z]/g, '');
    setRxForm((prev) => ({
      ...prev,
      [row]: { ...prev[row], [field]: cleanVal },
    }));
    const errorKey = `${row}.${field}`;
    if (errors[errorKey]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (form.name.trim().length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    } else if (!/^[A-Za-z\s]+$/.test(form.name)) {
      newErrors.name = 'Name can only contain alphabetic characters and spaces';
    }

    if (!form.age) {
      newErrors.age = 'Age is required';
    } else {
      const ageNum = parseInt(form.age, 10);
      if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
        newErrors.age = 'Age must be between 1 and 120';
      }
    }

    if (!form.mobile) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^[0-9]{10}$/.test(form.mobile)) {
      newErrors.mobile = 'Mobile number must be exactly 10 digits';
    }

    const validateEyeFields = (rowKey: 'autoRefRe' | 'autoRefLe' | 'pgpRe' | 'pgpLe', isRequired: boolean) => {
      const data = rxForm[rowKey];
      const hasAnyValue = Object.values(data).some((v) => v !== '');

      if (isRequired || hasAnyValue) {
        // Validate SPH
        if (!data.sph) {
          newErrors[`${rowKey}.sph`] = 'SPH is required';
        } else {
          const sphVal = parseFloat(data.sph);
          if (isNaN(sphVal) || sphVal < -30 || sphVal > 30) {
            newErrors[`${rowKey}.sph`] = 'SPH must be between -30.00 and +30.00';
          }
        }

        // Validate CYL
        if (!data.cyl) {
          newErrors[`${rowKey}.cyl`] = 'CYL is required';
        } else {
          const cylVal = parseFloat(data.cyl);
          if (isNaN(cylVal) || cylVal < -15 || cylVal > 15) {
            newErrors[`${rowKey}.cyl`] = 'CYL must be between -15.00 and +15.00';
          }
        }

        // Validate AXIS
        if (!data.axis) {
          newErrors[`${rowKey}.axis`] = 'AXIS is required';
        } else {
          const axisVal = parseInt(data.axis, 10);
          if (isNaN(axisVal) || axisVal < 0 || axisVal > 180) {
            newErrors[`${rowKey}.axis`] = 'AXIS must be an integer between 0 and 180';
          }
        }

        // Validate PD
        if (!data.pd) {
          newErrors[`${rowKey}.pd`] = 'PD is required';
        }

        // Validate PRISM (Optional)
        if (data.prism) {
          const prismVal = parseFloat(data.prism);
          if (isNaN(prismVal) || prismVal < 0 || prismVal > 20) {
            newErrors[`${rowKey}.prism`] = 'PRISM must be between 0 and 20';
          }
        }

        // Validate ADD (Optional)
        if (data.add) {
          const addVal = parseFloat(data.add);
          if (isNaN(addVal) || addVal < 0 || addVal > 4) {
            newErrors[`${rowKey}.add`] = 'ADD must be between 0.00 and 4.00';
          }
        }
      }
    };

    validateEyeFields('autoRefRe', true);
    validateEyeFields('autoRefLe', true);
    validateEyeFields('pgpRe', false);
    validateEyeFields('pgpLe', false);

    if (!form.preferredLanguage) {
      newErrors.preferredLanguage = 'Preferred Language 1 is required';
    }

    if (form.preferredLanguage2 && form.preferredLanguage2 !== 'None' && form.preferredLanguage === form.preferredLanguage2) {
      newErrors.preferredLanguage2 = 'Preferred Language 2 cannot be the same as Preferred Language 1';
    }

    setErrors(newErrors);
    return newErrors;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      toast({ title: 'Validation Error', description: 'Please correct the errors in the form before submitting.', type: 'error' });
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
        optemFeedback: '',
        status: form.status,
        activeProfile: form.activeProfile,
        lastUpdatedOn: timestamp,
        rxData: rxForm,
      };

      try {
        const created = await dispatch(createCustomerAction(newCustomer));
        setSelectedCustomerId(created.id);
        onBack();
      } catch (e) {
        const err = e as Error;
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
      } catch (e) {
        const err = e as Error;
        toast({ title: 'Error Updating Patient', description: err.message || 'Failed to connect to backend database.', type: 'error' });
      }
    }
  };



  return (
    <main className="flex-1 px-8 py-8 space-y-6 w-full max-w-[1440px] mx-auto animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md animate-pulse">
            <UserCircle className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {isAddingNew ? 'New Enrollment' : 'Edit Patient Profile'}
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
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
          className="rounded-xl px-4 h-10 border-border text-muted-foreground text-xs font-bold bg-card hover:bg-muted flex items-center gap-1.5 shadow-sm transition-all active:scale-98"
        >
          <ChevronLeft size={16} />
          Back
        </Button>
      </div>

      <Card className="bg-card rounded-2xl border border-border shadow-lg p-8">
        <form onSubmit={handleFormSubmit} className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Customer Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-6 space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Name *</label>
                <Input
                  type="text"
                  value={form.name}
                  onChange={(e) => {
                    const cleanVal = e.target.value.replace(/[^A-Za-z\s]/g, '').slice(0, 50);
                    setField('name')(cleanVal);
                  }}
                  placeholder="Enter full name"
                  icon={User}
                  className={cn(errors.name && 'border-red-500 focus-visible:ring-red-500')}
                  required
                />
                {errors.name && (
                  <p className="text-red-500 text-[10px] font-semibold">{errors.name}</p>
                )}
              </div>
              <div className="md:col-span-3 space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Age *</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={form.age}
                  onChange={(e) => {
                    const cleanVal = e.target.value.replace(/\D/g, '');
                    const ageNum = parseInt(cleanVal, 10);
                    if (cleanVal && !isNaN(ageNum) && ageNum > 120) {
                      return;
                    }
                    setField('age')(cleanVal.slice(0, 3));
                  }}
                  placeholder="Age"
                  className={cn(errors.age && 'border-red-500 focus-visible:ring-red-500')}
                  required
                />
                {errors.age && (
                  <p className="text-red-500 text-[10px] font-semibold">{errors.age}</p>
                )}
              </div>
              <div className="md:col-span-3 space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Gender *</label>
                <Select value={form.gender} onChange={(e) => setField('gender')(e.target.value)} options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Mobile Number *</label>
                <Input
                  type="tel"
                  value={form.mobile}
                  onChange={(e) => setField('mobile')(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Enter mobile number"
                  icon={Phone}
                  className={cn(errors.mobile && 'border-red-500 focus-visible:ring-red-500')}
                  required
                />
                {errors.mobile && (
                  <p className="text-red-500 text-[10px] font-semibold">{errors.mobile}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Customer Type *</label>
                <Select value={form.customerType} onChange={(e) => setField('customerType')(e.target.value)} options={[{ value: 'New', label: 'New' }, { value: 'Existing', label: 'Existing' }, { value: 'VIP', label: 'VIP' }]} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Store Name</label>
                <Input type="text" value={form.storeName} disabled className="bg-muted border-0 outline-none text-muted-foreground font-medium cursor-not-allowed" placeholder="Store Name" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Preferred Language 1 *</label>
                <Select
                  value={form.preferredLanguage}
                  onChange={(e) => setField('preferredLanguage')(e.target.value)}
                  className={cn(errors.preferredLanguage && 'border-red-500 focus:ring-red-500')}
                  options={LANGUAGES.map((lang) => ({ value: lang, label: lang }))}
                />
                {errors.preferredLanguage && (
                  <p className="text-red-500 text-[10px] font-semibold">{errors.preferredLanguage}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Preferred Language 2</label>
                <Select
                  value={form.preferredLanguage2}
                  onChange={(e) => setField('preferredLanguage2')(e.target.value)}
                  className={cn(errors.preferredLanguage2 && 'border-red-500 focus:ring-red-500')}
                  options={[
                    { value: 'None', label: 'None' },
                    ...LANGUAGES.filter((lang) => lang !== form.preferredLanguage).map((lang) => ({ value: lang, label: lang })),
                  ]}
                />
                {errors.preferredLanguage2 && (
                  <p className="text-red-500 text-[10px] font-semibold">{errors.preferredLanguage2}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-400 dark:border-zinc-700 rounded-lg shadow-sm">
              <Table className="w-full border-collapse text-center text-xs">
                <TableHeader className="[&_tr]:border-b border-slate-400 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800">
                  <TableRow className="border-b border-slate-400 dark:border-zinc-700 hover:bg-slate-100/50 dark:hover:bg-zinc-800/50">
                    <TableHead colSpan={9} className="py-2.5 font-extrabold text-sm text-slate-900 dark:text-zinc-100 text-center uppercase tracking-wider bg-slate-100 dark:bg-zinc-800 animate-none border-b border-slate-400 dark:border-zinc-700">Store Login</TableHead>
                  </TableRow>
                  <TableRow className="bg-slate-100/50 dark:bg-zinc-800/50 border-b border-slate-400 dark:border-zinc-700 hover:bg-slate-100/50 dark:hover:bg-zinc-800/50">
                    <TableHead colSpan={2} className="border-r border-slate-400 dark:border-zinc-700 py-1 text-center font-bold text-blue-600 dark:text-blue-400 text-sm"></TableHead>
                    <TableHead className="border-r border-slate-400 dark:border-zinc-700 py-1 text-center font-bold text-blue-600 dark:text-blue-400 text-sm">*</TableHead>
                    <TableHead className="border-r border-slate-400 dark:border-zinc-700 py-1 text-center font-bold text-blue-600 dark:text-blue-400 text-sm">*</TableHead>
                    <TableHead className="border-r border-slate-400 dark:border-zinc-700 py-1 text-center font-bold text-blue-600 dark:text-blue-400 text-sm">*</TableHead>
                    <TableHead className="border-r border-slate-400 dark:border-zinc-700 py-1 text-center font-bold text-blue-600 dark:text-blue-400 text-sm">*</TableHead>
                    <TableHead className="border-r border-slate-400 dark:border-zinc-700 py-1 text-center font-bold text-blue-600 dark:text-blue-400 text-sm"></TableHead>
                    <TableHead className="border-r border-slate-400 dark:border-zinc-700 py-1 text-center font-bold text-blue-600 dark:text-blue-400 text-sm"></TableHead>
                    <TableHead className="py-1 text-center font-bold text-blue-600 dark:text-blue-400 text-sm"></TableHead>
                  </TableRow>
                  <TableRow className="bg-slate-100/70 dark:bg-zinc-800/70 border-b border-slate-400 dark:border-zinc-700 hover:bg-slate-100/50 dark:hover:bg-zinc-800/50">
                    <TableHead colSpan={2} className="border-r border-slate-400 dark:border-zinc-700 px-3 py-2 font-black text-xs text-[#1a2b6e] dark:text-blue-400 text-center uppercase tracking-wider whitespace-nowrap">R X</TableHead>
                     {rxHeaders.map((h) => (
                       <TableHead key={h} className="border-r border-slate-400 dark:border-zinc-700 px-3 py-2 font-black text-xs text-center text-[#1a2b6e] dark:text-blue-400 last:border-r-0">{h}</TableHead>
                     ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(['autoRefRe', 'autoRefLe', 'pgpRe', 'pgpLe'] as const).map((row, rowIdx) => (
                    <TableRow key={row} className={rowIdx < 3 ? 'border-b border-slate-400 dark:border-zinc-700' : 'border-0'}>
                      {rowIdx % 2 === 0 && (
                        <TableCell rowSpan={2} className="border-r border-b border-slate-400 dark:border-zinc-700 font-black text-xs text-[#1a2b6e] dark:text-blue-400 bg-slate-50/50 dark:bg-zinc-900/50 px-3 py-4 w-[100px] text-center animate-none">
                          {rowIdx < 2 ? 'Auto Ref' : 'PGP'}
                        </TableCell>
                      )}
                      <TableCell className="border-r border-b border-slate-400 dark:border-zinc-700 font-black text-xs text-[#1a2b6e] dark:text-blue-400 bg-slate-50/50 dark:bg-zinc-900/50 px-3 py-3 w-[60px] whitespace-nowrap text-center animate-none">
                        {rowIdx % 2 === 0 ? 'R E' : 'L E'}
                      </TableCell>
                      {rxFields.map((field, idx) => {
                        const errorKey = `${row}.${field}`;
                        const hasError = !!errors[errorKey];
                        return (
                          <TableCell
                            key={field}
                            className={cn(
                              rowIdx < 3 ? 'border-b border-slate-400 dark:border-zinc-700' : '',
                              'p-0',
                              idx < 6 ? 'border-r border-slate-400 dark:border-zinc-700' : '',
                              hasError && 'bg-red-50 dark:bg-red-950/20'
                            )}
                          >
                            <input
                              type="text"
                              value={rxForm[row][field] || ''}
                              onChange={(e) => setRxField(row, field, e.target.value)}
                              className={cn(
                                'w-full h-full text-center bg-transparent border-0 outline-none px-3 py-2.5 text-xs text-foreground font-medium',
                                hasError
                                  ? 'focus:ring-1 focus:ring-red-500 placeholder:text-red-300 text-red-600 dark:text-red-400 font-bold'
                                  : 'focus:ring-1 focus:ring-blue-500'
                              )}
                              placeholder={hasError ? 'Req' : ''}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {Object.keys(errors).some((k) => k.includes('.')) && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-400 space-y-1.5 animate-in fade-in duration-200">
                <div className="font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                  Prescription Validation Errors:
                </div>
                <ul className="list-disc pl-4 space-y-1">
                  {Object.entries(errors)
                    .filter(([key]) => key.includes('.'))
                    .map(([key, msg]) => {
                      const [row, field] = key.split('.') as [string, string];
                      const rowLabel = row === 'autoRefRe' ? 'Auto Ref R E' :
                                       row === 'autoRefLe' ? 'Auto Ref L E' :
                                       row === 'pgpRe' ? 'PGP R E' : 'PGP L E';
                      return (
                        <li key={key} className="font-medium">
                          <span className="font-bold">{rowLabel}</span> ({field.toUpperCase()}): {msg}
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}
          </div>

          {!isAddingNew && (
            <div className="space-y-4">
              <div className="overflow-x-auto border border-slate-400 dark:border-zinc-700 rounded-lg shadow-sm">
                <Table className="w-full border-collapse text-center text-xs">
                  <TableHeader className="[&_tr]:border-b border-slate-400 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800">
                    <TableRow className="border-b border-slate-400 dark:border-zinc-700 hover:bg-slate-100/50 dark:hover:bg-zinc-800/50">
                      <TableHead colSpan={8} className="py-2.5 font-extrabold text-sm text-slate-900 dark:text-zinc-100 text-center uppercase tracking-wider border-b border-slate-400 dark:border-zinc-700">Optem Login</TableHead>
                    </TableRow>
                    <TableRow className="bg-slate-100/70 dark:bg-zinc-800/70 border-b border-slate-400 dark:border-zinc-700 hover:bg-slate-100/50 dark:hover:bg-zinc-800/50">
                      <TableHead className="border-r border-slate-400 dark:border-zinc-700 px-3 py-2 font-black text-xs text-[#1a2b6e] dark:text-blue-400 text-center uppercase tracking-wider whitespace-nowrap">R X</TableHead>
                       {optemHeaders.map((h) => (
                         <TableHead key={h} className="border-r border-slate-400 dark:border-zinc-700 px-3 py-2 font-black text-xs text-center text-[#1a2b6e] dark:text-blue-400 last:border-r-0">{h}</TableHead>
                       ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(['re', 'le'] as const).map((eye, idx) => (
                      <TableRow key={eye} className={idx === 0 ? 'border-b border-slate-400 dark:border-zinc-700' : 'border-0'}>
                        <TableCell className="border-r border-slate-400 dark:border-zinc-700 font-black text-xs text-[#1a2b6e] dark:text-blue-400 bg-slate-50/50 dark:bg-zinc-900/50 py-3 whitespace-nowrap text-center animate-none">
                          {eye === 're' ? 'R E' : 'L E'}
                        </TableCell>
                        {optemFields.map((field, fIdx) => (
                          <TableCell key={field} className={`${idx === 0 ? 'border-b border-slate-400 dark:border-zinc-700' : ''} p-0 ${fIdx < 6 ? 'border-r border-slate-400 dark:border-zinc-700' : ''}`}>
                            <input
                              type="text"
                              value={optemRxForm[eye][field] || ''}
                              disabled
                              className="w-full h-full text-center bg-slate-50 dark:bg-zinc-900 border-0 outline-none px-3 py-2.5 text-xs text-muted-foreground font-medium cursor-not-allowed"
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
            <label className="text-xs font-bold text-muted-foreground">Store Action / Feedback</label>
            <RichTextEditor
              value={form.storeFeedback}
              onChange={setField('storeFeedback')}
              placeholder="Enter clinical assessment details or feedback comments..."
            />
          </div>

          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6"></div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Button type="button" variant="outline" onClick={onBack} className="rounded-xl h-10 px-5 font-bold text-xs border-border text-muted-foreground hover:bg-muted shadow-sm">
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl h-10 px-6 font-bold text-xs bg-[#1a2b6e] hover:bg-[#152260] dark:bg-blue-700 dark:hover:bg-blue-800 text-white shadow-md active:scale-98 transition-all">
                {isAddingNew ? 'Create' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </main>
  );
}
