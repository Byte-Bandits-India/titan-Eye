import { Phone, User } from 'lucide-react';
import * as React from 'react';

import type { Customer, CustomerStatus, StorePatientDetailsProps } from '../../types';

import { createCustomerAction, updateCustomerAction } from '../../Actions/customerActions';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { LegacySelect as Select } from '../../components/ui/select';
import { SheetBody, SheetFooter } from '../../components/ui/sheet';
import { useToast } from '../../components/ui/toast';
import { cn } from '../../lib/utils';
import { AGE_REGEX, CUSTOMER_NAME_REGEX, emptyRxValues, LANGUAGES, MOBILE_REGEX } from '../../options/Option';
import { useAppDispatch, useAppSelector } from '../../store';

export function StorePatientDetails({
  isAddingNew,
  onBack,
  selectedCustomer,
  setSelectedCustomerId,
}: StorePatientDetailsProps) {
  const user = useAppSelector((state) => state.auth.user);
  const customers = useAppSelector((state) => state.customers.customers);
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const buildFormState = React.useCallback(
    (customer: Customer | null, addingNew: boolean) => {
      if (customer && !addingNew) {
        return {
          activeProfile: customer.activeProfile || false,
          age: customer.age || '',
          customerType: customer.customerType || 'New',
          gender: customer.gender || 'Male',
          mobile: customer.mobile || '',
          name: customer.name || '',
          preferredLanguage: customer.preferredLanguage || 'English',
          preferredLanguage2: customer.preferredLanguage2 || 'None',
          status: customer.status,
          storeName: customer.storeName || user?.name || '',
        };
      }

      return {
        activeProfile: addingNew,
        age: '',
        customerType: 'New',
        gender: 'Male',
        mobile: '',
        name: '',
        preferredLanguage: 'English',
        preferredLanguage2: 'None',
        status: 'Created' as CustomerStatus,
        storeName: user?.name || '',
      };
    },
    [user]
  );

  const [form, setForm] = React.useState(() => buildFormState(selectedCustomer, isAddingNew));

  const [prevCustomerId, setPrevCustomerId] = React.useState(selectedCustomer?.id);
  const [prevIsAddingNew, setPrevIsAddingNew] = React.useState(isAddingNew);

  if (selectedCustomer?.id !== prevCustomerId || isAddingNew !== prevIsAddingNew) {
    setPrevCustomerId(selectedCustomer?.id);
    setPrevIsAddingNew(isAddingNew);
    setForm(buildFormState(selectedCustomer, isAddingNew));
  }

  const setField = (key: string) => (val: boolean | string) => {
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
    } else if (!CUSTOMER_NAME_REGEX.test(form.name.trim())) {
      newErrors.name = 'Name must be between 3 and 20 characters and contain only letters and spaces';
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

    if (
      form.preferredLanguage2 &&
      form.preferredLanguage2 !== 'None' &&
      form.preferredLanguage === form.preferredLanguage2
    ) {
      newErrors.preferredLanguage2 = 'Preferred Language 2 cannot be the same as Preferred Language 1';
    }

    return newErrors;
  };

  const validate = () => {
    const newErrors = getValidationErrors();
    setErrors(newErrors);

    return newErrors;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = validate();

    if (Object.keys(newErrors).length > 0) {
      toast({
        description: 'Please correct the errors in the form before submitting.',
        title: 'Validation Error',
        type: 'error',
      });

      return;
    }

    const timestamp = new Date().toLocaleString('en-US', {
      day: 'numeric',
      hour: 'numeric',
      hour12: true,
      minute: 'numeric',
      month: 'short',
      second: 'numeric',
      year: 'numeric',
    });

    if (isAddingNew) {
      const numericIds = customers.map((c) => parseInt(c.id.replace('#', ''), 10)).filter((n) => !isNaN(n));
      const nextNum = Math.max(...numericIds, 0) + 1;
      const newId = `#${String(nextNum).padStart(4, '0')}`;

      const newCustomer: Customer = {
        activeProfile: form.activeProfile,
        age: form.age,
        customerType: form.customerType,
        gender: form.gender,
        id: newId,
        lastUpdatedOn: timestamp,
        mobile: form.mobile,
        name: form.name,
        optometristFeedback: '',
        preferredLanguage: form.preferredLanguage,
        preferredLanguage2: form.preferredLanguage2,
        rxData: {
          autoRefLe: { ...emptyRxValues },
          autoRefRe: { ...emptyRxValues },
          pgpLe: { ...emptyRxValues },
          pgpRe: { ...emptyRxValues },
        },
        status: form.status,
        storeFeedback: '',
        storeName: form.storeName,
      };

      try {
        const created = await dispatch(createCustomerAction(newCustomer));
        setSelectedCustomerId(created.id);
        onBack();
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        toast({
          description: err.message || 'Failed to connect to backend database.',
          title: 'Error Saving Patient',
          type: 'error',
        });
      }
    } else {
      if (!selectedCustomer) {
        return;
      }

      const updatedCustomer: Customer = {
        ...selectedCustomer,
        activeProfile: form.activeProfile,
        age: form.age,
        customerType: form.customerType,
        gender: form.gender,
        lastUpdatedOn: timestamp,
        mobile: form.mobile,
        name: form.name,
        preferredLanguage: form.preferredLanguage,
        preferredLanguage2: form.preferredLanguage2,
        status: form.status,
        storeName: form.storeName,
      };

      try {
        await dispatch(updateCustomerAction(selectedCustomer.id, updatedCustomer));
        onBack();
        toast({
          description: `Patient details for ${form.name} have been updated.`,
          title: 'Profile Updated',
          type: 'success',
        });
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        toast({
          description: err.message || 'Failed to connect to backend database.',
          title: 'Error Updating Patient',
          type: 'error',
        });
      }
    }
  };

  const sheetFieldsMarkup = (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
          1
        </span>
        <h3 className="text-sm font-semibold text-foreground">Customer Information</h3>
      </div>
      <div className="border-b border-border" />
      <div className="grid grid-cols-3 gap-x-6 gap-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Customer Number *</label>
          <Input
            className={cn('rounded-none', errors.mobile && 'border-red-500 focus-visible:ring-red-500')}
            icon={Phone}
            onChange={(e) => setField('mobile')(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="Enter mobile number"
            required
            type="tel"
            value={form.mobile}
          />
          {errors.mobile && <p className="text-sm font-medium text-red-500">{errors.mobile}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Name *</label>
          <Input
            className={cn('rounded-none', errors.name && 'border-red-500 focus-visible:ring-red-500')}
            icon={User}
            onChange={(e) => {
              const cleanVal = e.target.value.replace(/[^A-Za-z\s]/g, '').slice(0, 20);
              setField('name')(cleanVal);
            }}
            placeholder="Enter full name"
            required
            type="text"
            value={form.name}
          />
          {errors.name && <p className="text-sm font-medium text-red-500">{errors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Age *</label>
          <Input
            className={cn('rounded-none', errors.age && 'border-red-500 focus-visible:ring-red-500')}
            inputMode="numeric"
            onChange={(e) => {
              const cleanVal = e.target.value.replace(/\D/g, '');
              const ageNum = parseInt(cleanVal, 10);

              if (cleanVal && !isNaN(ageNum) && ageNum > 120) {
                return;
              }

              setField('age')(cleanVal.slice(0, 3));
            }}
            placeholder="Age"
            required
            type="text"
            value={form.age}
          />
          {errors.age && <p className="text-sm font-medium text-red-500">{errors.age}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Gender *</label>
          <Select
            className="rounded-none"
            onChange={(e) => setField('gender')(e.target.value)}
            options={[
              { label: 'Male', value: 'Male' },
              { label: 'Female', value: 'Female' },
              { label: 'Other', value: 'Other' },
            ]}
            value={form.gender}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Preferred Language 1 *</label>
          <Select
            className={cn('rounded-none', errors.preferredLanguage && 'border-red-500 focus:ring-red-500')}
            onChange={(e) => setField('preferredLanguage')(e.target.value)}
            options={LANGUAGES.map((lang) => ({ label: lang, value: lang }))}
            value={form.preferredLanguage}
          />
          {errors.preferredLanguage && (
            <p className="text-sm font-medium text-red-500">{errors.preferredLanguage}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Preferred Language 2</label>
          <Select
            className={cn('rounded-none', errors.preferredLanguage2 && 'border-red-500 focus:ring-red-500')}
            onChange={(e) => setField('preferredLanguage2')(e.target.value)}
            options={[
              { label: 'None', value: 'None' },
              ...LANGUAGES.filter((lang) => lang !== form.preferredLanguage).map((lang) => ({
                label: lang,
                value: lang,
              })),
            ]}
            value={form.preferredLanguage2}
          />
          {errors.preferredLanguage2 && (
            <p className="text-sm font-medium text-red-500">{errors.preferredLanguage2}</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <form className="flex max-h-[80vh] flex-col overflow-hidden" noValidate onSubmit={handleFormSubmit}>
      <SheetBody className="px-6 py-5">{sheetFieldsMarkup}</SheetBody>
      <SheetFooter className="sticky bottom-0 justify-center bg-card">
        <Button
          className="active:scale-98 h-10 w-48 cursor-pointer rounded-md px-6 text-sm font-medium shadow-md transition-all"
          type="submit"
          variant="gradient"
        >
          {isAddingNew ? 'Create' : 'Save Changes'}
        </Button>
      </SheetFooter>
    </form>
  );
}
