import { Calendar, Hash, Phone, Stethoscope, User } from 'lucide-react';
import * as React from 'react';

import type { Customer, StoreUpdateStatusPageProps } from '../../types';

import { updateCustomerAction } from '../../Actions/customerActions';
import { BackButton } from '../../components/shared/BackButton';
import { CardFrame } from '../../components/shared/CardFrame';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { LegacySelect as Select } from '../../components/ui/select';
import { useToast } from '../../components/ui/toast';
import { useAppDispatch } from '../../store';
import { parseTimestamp } from './components/formatters';

const NON_CONVERSION_REASONS = [
  'Price is high',
  'Prescription not suitable',
  'Customer will buy later',
  'Product not available in store',
  'Customer not interested',
  'Already purchased elsewhere',
  'Need more time to decide',
  'Other (Please specify)',
];

const OTHER_REASON = 'Other (Please specify)';

function SummaryRow({
  Icon,
  label,
  value,
}: {
  Icon: React.ComponentType<{ className?: string; size?: number }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 text-[15px] text-foreground">
      <Icon className="shrink-0 text-[#4B5568]" size={18} />
      <span>
        <span className="text-[#4B5568]">{label} :</span> {value || '—'}
      </span>
    </div>
  );
}

function formatTestConductedOn(customer: Customer | null): string {
  if (!customer) {
    return '';
  }

  const raw = customer.optometristCallStartTime || customer.callStartTime || customer.lastUpdatedOn;
  const ms = parseTimestamp(raw);

  if (!ms) {
    return '';
  }

  return new Date(ms).toLocaleString('en-US', {
    day: 'numeric',
    hour: 'numeric',
    hour12: true,
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function StoreUpdateStatusPage({ onBack, selectedCustomer }: StoreUpdateStatusPageProps) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const buildFormState = React.useCallback(
    (customer: Customer | null) => ({
      conversionStatus: customer?.conversionStatus || '',
      nonConversionComment: customer?.nonConversionComment || '',
      nonConversionReason: customer?.nonConversionReason || '',
      orderDate: customer?.orderDate || '',
      salesOrderNumber: customer?.salesOrderNumber || '',
    }),
    []
  );

  const [form, setForm] = React.useState(() => buildFormState(selectedCustomer));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = React.useState(false);

  const [prevSelectedCustomer, setPrevSelectedCustomer] = React.useState(selectedCustomer);

  if (selectedCustomer !== prevSelectedCustomer) {
    setPrevSelectedCustomer(selectedCustomer);
    setForm(buildFormState(selectedCustomer));
    setErrors({});
  }

  const setField = (key: keyof typeof form) => (val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((prev) => {
      if (!prev[key]) {
        return prev;
      }

      const next = { ...prev };
      delete next[key];

      return next;
    });
  };

  const validate = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!form.conversionStatus) {
      newErrors.conversionStatus = 'Please select Converted or Not Converted';

      return newErrors;
    }

    if (form.conversionStatus === 'Converted') {
      if (!form.salesOrderNumber.trim()) {
        newErrors.salesOrderNumber = 'Sales order number is required';
      }

      if (!form.orderDate.trim()) {
        newErrors.orderDate = 'Order date is required';
      }
    } else {
      if (!form.nonConversionReason) {
        newErrors.nonConversionReason = 'Please select a reason';
      } else if (form.nonConversionReason === OTHER_REASON && !form.nonConversionComment.trim()) {
        newErrors.nonConversionComment = 'Please enter a comment';
      }
    }

    return newErrors;
  };

  const handleSave = async () => {
    if (!selectedCustomer) {
      return;
    }

    const newErrors = validate();
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast({
        description: 'Please correct the errors in the form before submitting.',
        title: 'Validation Error',
        type: 'error',
      });

      return;
    }

    const isConverted = form.conversionStatus === 'Converted';

    const updatedCustomer: Customer = {
      ...selectedCustomer,
      conversionStatus: form.conversionStatus,
      nonConversionComment: isConverted
        ? null
        : form.nonConversionReason === OTHER_REASON
          ? form.nonConversionComment.trim()
          : null,
      nonConversionReason: isConverted ? null : form.nonConversionReason,
      orderDate: isConverted ? form.orderDate.trim() : null,
      salesOrderNumber: isConverted ? form.salesOrderNumber.trim() : null,
    };

    setIsSaving(true);

    try {
      await dispatch(updateCustomerAction(selectedCustomer.id, updatedCustomer));
      toast({
        description: `Sales conversion status updated for ${selectedCustomer.name}.`,
        title: 'Status Updated',
        type: 'success',
      });
      onBack();
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({
        description: err.message || 'Failed to update conversion status.',
        title: 'Error Updating Status',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-4 px-3 py-4 duration-200 animate-in fade-in sm:space-y-6 sm:px-6 sm:py-8 md:px-8">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-lg font-bold text-foreground sm:text-xl">Update Status</h1>

        <BackButton onClick={onBack} />
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
        <CardFrame className="h-full p-4 sm:p-6 md:p-8">
          <div className="space-y-3.5">
            <SummaryRow Icon={Hash} label="Customer ID" value={selectedCustomer?.id ?? ''} />
            <SummaryRow Icon={Phone} label="Number" value={selectedCustomer?.mobile ?? ''} />
            <SummaryRow Icon={User} label="Customer Name" value={selectedCustomer?.name ?? ''} />
            <SummaryRow Icon={Stethoscope} label="Optometrist" value={selectedCustomer?.callTakenBy ?? ''} />
            <SummaryRow
              Icon={Calendar}
              label="Test Conducted On"
              value={formatTestConductedOn(selectedCustomer)}
            />
          </div>
        </CardFrame>

        <CardFrame className="h-full space-y-4 p-4 sm:p-6 md:p-8">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Conversion Status *</label>
            <Select
              className="rounded-none"
              onChange={(e) => setField('conversionStatus')(e.target.value)}
              options={[
                { label: 'Select status', value: '' },
                { label: 'Converted', value: 'Converted' },
                { label: 'Not Converted', value: 'Not Converted' },
              ]}
              value={form.conversionStatus}
            />
            {errors.conversionStatus && (
              <p className="text-sm font-medium text-red-500">{errors.conversionStatus}</p>
            )}
          </div>

          {form.conversionStatus === 'Converted' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Sales Order Number *</label>
                <Input
                  onChange={(e) => setField('salesOrderNumber')(e.target.value)}
                  placeholder="Enter sales order number"
                  value={form.salesOrderNumber}
                />
                {errors.salesOrderNumber && (
                  <p className="text-sm font-medium text-red-500">{errors.salesOrderNumber}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Order Date *</label>
                <Input
                  onChange={(e) => setField('orderDate')(e.target.value)}
                  type="date"
                  value={form.orderDate}
                />
                {errors.orderDate && <p className="text-sm font-medium text-red-500">{errors.orderDate}</p>}
              </div>
            </div>
          )}

          {form.conversionStatus === 'Not Converted' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Reason *</label>
                <Select
                  className="rounded-none"
                  onChange={(e) => setField('nonConversionReason')(e.target.value)}
                  options={[
                    { label: 'Select a reason', value: '' },
                    ...NON_CONVERSION_REASONS.map((reason) => ({ label: reason, value: reason })),
                  ]}
                  value={form.nonConversionReason}
                />
                {errors.nonConversionReason && (
                  <p className="text-sm font-medium text-red-500">{errors.nonConversionReason}</p>
                )}
              </div>

              {form.nonConversionReason === OTHER_REASON && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Comments *</label>
                  <textarea
                    className="min-h-[90px] w-full rounded-md border border-input bg-background p-3 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    onChange={(e) => setField('nonConversionComment')(e.target.value)}
                    placeholder="Please specify the reason..."
                    value={form.nonConversionComment}
                  />
                  {errors.nonConversionComment && (
                    <p className="text-sm font-medium text-red-500">{errors.nonConversionComment}</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end border-t border-border pt-4">
            <Button
              className="active:scale-98 h-10 w-full cursor-pointer rounded-[50px] px-6 text-xs font-medium shadow-md transition-all sm:w-auto"
              disabled={isSaving}
              onClick={handleSave}
              type="button"
              variant="gradient"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </CardFrame>
      </div>
    </main>
  );
}
