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
import { LegacySelect as Select } from '../../components/ui/select';
import { useToast } from '../../components/ui/toast';
import { SheetBody, SheetFooter } from '../../components/ui/sheet';
import { useAppDispatch, useAppSelector } from '../../store';
import { createCustomerAction, updateCustomerAction } from '../../Actions/customerActions';
import type { Customer, CustomerStatus, RxValues, StorePatientDetailsProps } from '../../types';
import {
  NAME_REGEX,
  AGE_REGEX,
  MOBILE_REGEX,
} from '../../options/Option';
import { cn } from '../../lib/utils';

const emptyRxValues: RxValues = { sph: '', cyl: '', axis: '', pd: '', prism: '', base: '', add: '' };
const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Bengali', 'Gujarati'];

export function StorePatientDetails({
  isAddingNew,
  selectedCustomer,
  onBack,
  setSelectedCustomerId,
  layout = 'page',
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
    status: 'Created' as CustomerStatus,
    activeProfile: false,
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
        status: selectedCustomer.status,
        activeProfile: selectedCustomer.activeProfile || false,
      });
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
        status: 'Created',
        activeProfile: true,
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

  const getValidationErrors = () => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (!NAME_REGEX.test(form.name.trim())) {
      newErrors.name = 'Name must be between 3 and 50 characters and contain only letters and spaces';
    }

    if (!form.age) {
      newErrors.age = 'Age is required';
    } else if (!AGE_REGEX.test(form.age.trim())) {
      newErrors.age = 'Age must be a valid number between 1 and 120';
    }

    if (!form.mobile) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!MOBILE_REGEX.test(form.mobile.trim())) {
      newErrors.mobile = 'Mobile number must be a valid 10-digit number (starting with 6-9)';
    }

    if (!form.preferredLanguage) {
      newErrors.preferredLanguage = 'Preferred Language 1 is required';
    }

    if (form.preferredLanguage2 && form.preferredLanguage2 !== 'None' && form.preferredLanguage === form.preferredLanguage2) {
      newErrors.preferredLanguage2 = 'Preferred Language 2 cannot be the same as Preferred Language 1';
    }

    return newErrors;
  };

  const validate = () => {
    const newErrors = getValidationErrors();
    setErrors(newErrors);
    return newErrors;
  };

  const isFormValid = Object.keys(getValidationErrors()).length === 0;

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
        storeFeedback: '',
        optomFeedback: '',
        status: form.status,
        activeProfile: form.activeProfile,
        lastUpdatedOn: timestamp,
        rxData: {
          autoRefRe: { ...emptyRxValues },
          autoRefLe: { ...emptyRxValues },
          pgpRe: { ...emptyRxValues },
          pgpLe: { ...emptyRxValues },
        },
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
        status: form.status,
        activeProfile: form.activeProfile,
        lastUpdatedOn: timestamp,
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

  const fieldsMarkup = (
    <div className="space-y-4">
      <h2 className="font-bold text-foreground ">Customer Details</h2>

      <div className={cn('grid grid-cols-1 gap-4 sm:gap-2', layout === 'page' && 'sm:grid-cols-2 md:grid-cols-3')}>
        <div className="space-y-1.5">
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

        <div className="space-y-1.5">
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

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground">Gender *</label>
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
          <Select value={form.customerType} onChange={(e) => setField('customerType')(e.target.value)} options={[{ value: 'New', label: 'New' }, { value: 'Existing', label: 'Existing' }]} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground">Store Name</label>
          <Input type="text" value={form.storeName} disabled className="bg-muted border-0 outline-none text-muted-foreground font-medium cursor-not-allowed" placeholder="Store Name" />
        </div>
      </div>

      <div className={cn('grid grid-cols-1 gap-4 sm:gap-2', layout === 'page' && 'sm:grid-cols-2')}>
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
  );

  const sheetFieldsMarkup = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground">Customer Type *</label>
        <Select value={form.customerType} onChange={(e) => setField('customerType')(e.target.value)} options={[{ value: 'New', label: 'New' }, { value: 'Existing', label: 'Existing' }]} />
      </div>

      <div className="space-y-1.5">
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
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
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground">Gender *</label>
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

      <div className="grid grid-cols-2 gap-4">
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
  );

  if (layout === 'sheet') {
    return (
      <form onSubmit={handleFormSubmit} noValidate className="flex flex-col h-full">
        <SheetBody className="px-6 py-5">
          {sheetFieldsMarkup}
        </SheetBody>
        <SheetFooter className="sticky bottom-0 bg-card">
          <Button
            type="submit"
            disabled={!isFormValid}
            className="w-full rounded-md h-10 px-6 font-bold text-xs bg-[#1a2b6e] hover:bg-[#152260] dark:bg-blue-700 dark:hover:bg-blue-800 text-white shadow-md active:scale-98 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isAddingNew ? 'Create' : 'Save Changes'}
          </Button>
        </SheetFooter>
      </form>
    );
  }

  return (
    <main className="flex-1 px-3 sm:px-6 md:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 w-full max-w-[1440px] mx-auto animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md animate-pulse shrink-0">
            <UserCircle className="text-white" size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
              {isAddingNew ? 'New Enrollment' : 'Edit Patient Profile'}
            </h1>
            <p className="text-xs text-muted-foreground font-medium truncate">
              {isAddingNew
                ? 'Manage patient details.'
                : `ID: ${selectedCustomer?.id} • Manage patient details.`}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="rounded-[50px] px-4 h-9 sm:h-10 border-border text-muted-foreground text-xs font-bold bg-card hover:bg-muted flex items-center gap-1.5 shadow-sm transition-all active:scale-98 self-start sm:self-auto cursor-pointer"
        >
          <ChevronLeft size={16} />
          Back
        </Button>
      </div>

      <Card className="bg-card rounded-2xl border border-border shadow-lg p-4 sm:p-6 md:p-8">
        <form onSubmit={handleFormSubmit} noValidate className="space-y-6 sm:space-y-8">
          {fieldsMarkup}

          <div className="pt-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
            <div className="hidden sm:flex items-center gap-6"></div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Button type="button" variant="outline" onClick={onBack} className="flex-1 sm:flex-initial rounded-[50px] h-10 px-5 font-bold text-xs border-border text-muted-foreground hover:bg-muted shadow-sm cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" className="flex-1 sm:flex-initial rounded-[50px] h-10 px-6 font-bold text-xs bg-[#1a2b6e] hover:bg-[#152260] dark:bg-blue-700 dark:hover:bg-blue-800 text-white shadow-md active:scale-98 transition-all cursor-pointer">
                {isAddingNew ? 'Create' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </main>
  );
}
