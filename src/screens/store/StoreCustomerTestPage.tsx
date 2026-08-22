import { CheckIcon, ChevronLeft, Phone, Trash2, User } from 'lucide-react';
import * as React from 'react';

import type { Customer, OptometristRxValues, RxValues, StoreCustomerTestPageProps } from '../../types';

import {
  createCustomerAction,
  deleteCustomerAction,
  dropCustomerAction,
  initiateCallAction,
  updateCustomerAction,
} from '../../Actions/customerActions';
import { BackButton } from '../../components/shared/BackButton';
import { CardFrame } from '../../components/shared/CardFrame';
import { CustomerFeedbackImageBox } from '../../components/shared/CustomerFeedbackImageBox';
import { RxScrollPicker } from '../../components/shared/RxScrollPicker';
import { CancelRequestDialog } from './components/CancelRequestDialog';
import { DeleteCustomerDialog } from './components/DeleteCustomerDialog';
import {
  Stepper,
  StepperContent,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '../../components/reui/stepper';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { LegacySelect as Select } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { useToast } from '../../components/ui/toast';
import { cn } from '../../lib/utils';
import {
  ADD_OPTIONS,
  ADD_REGEX,
  AGE_REGEX,
  AXIS_OPTIONS,
  AXIS_REGEX,
  BASE_OPTIONS,
  CUSTOMER_MOBILE_REGEX,
  CUSTOMER_NAME_REGEX,
  CYL_OPTIONS,
  CYL_REGEX,
  emptyOptometristRxValues,
  emptyRxValues,
  LANGUAGES,
  optometristFields,
  optometristHeaders,
  PD_OPTIONS,
  PD_REGEX,
  POWER_OPTIONS,
  PRISM_OPTIONS,
  PRISM_REGEX,
  rxFields,
  rxHeaders,
  SPH_REGEX,
} from '../../options/Option';
import { useAppDispatch, useAppSelector } from '../../store';

function useRenderLog(label: string) {
  const renderCount = React.useRef(0);
  const lastTime = React.useRef<null | number>(null);

  React.useEffect(() => {
    renderCount.current += 1;

    const now = performance.now();
    const delta = lastTime.current === null ? 0 : now - lastTime.current;
    lastTime.current = now;

    console.log(
      `[render] ${label} #${renderCount.current} at ${now.toFixed(1)}ms (+${delta.toFixed(1)}ms since last)`
    );
  });
}

type RxRow = 'autoRefLe' | 'autoRefRe' | 'pgpLe' | 'pgpRe';
type CustomerForm = {
  activeProfile: boolean;
  age: string;
  customerType: string;
  gender: string;
  mobile: string;
  name: string;
  preferredLanguage: string;
  preferredLanguage2: string;
  status: Customer['status'];
  storeName: string;
};
type RxFormState = { autoRefLe: RxValues; autoRefRe: RxValues; pgpLe: RxValues; pgpRe: RxValues };
type OptometristRxFormState = { le: OptometristRxValues; re: OptometristRxValues };

type CustomerDetailsFieldsProps = {
  errors: Record<string, string>;
  form: CustomerForm;
  setField: (key: string) => (val: string) => void;
};

function CustomerDetailsFieldsComponent({ errors, form, setField }: CustomerDetailsFieldsProps) {
  useRenderLog('CustomerDetailsFields');

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
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
          className={cn('rounded-none', errors.gender && 'border-red-500 focus:ring-red-500')}
          onChange={(e) => setField('gender')(e.target.value)}
          options={[
            { label: 'Select Gender', value: '' },
            { label: 'Male', value: 'Male' },
            { label: 'Female', value: 'Female' },
            { label: 'Other', value: 'Other' },
          ]}
          value={form.gender}
        />
        {errors.gender && <p className="text-sm font-medium text-red-500">{errors.gender}</p>}
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
  );
}

const CustomerDetailsFields = React.memo(CustomerDetailsFieldsComponent);

type ObjectiveRxContentProps = {
  customerId: string;
  hasImage1: boolean;
  hasImage2: boolean;
  optometristRxForm: OptometristRxFormState;
  rxErrors: Record<string, boolean>;
  rxForm: RxFormState;
  setRxField: (row: RxRow, field: keyof RxValues, val: string) => void;
  setStoreFeedback: (val: string) => void;
  storeFeedback: string;
};

type RxSubTableProps = {
  label: React.ReactNode;
  mandatoryHeaders?: readonly string[];
  rows: readonly [RxRow, RxRow];
  rxErrors: Record<string, boolean>;
  rxForm: RxFormState;
  setRxField: (row: RxRow, field: keyof RxValues, val: string) => void;
};

function RxSubTable({ label, mandatoryHeaders = [], rows, rxErrors, rxForm, setRxField }: RxSubTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-300 dark:border-zinc-700">
      <p className="border-b border-slate-300 bg-slate-50/70 px-3 py-1.5 text-left text-sm font-bold text-slate-700 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300">
        {label}
      </p>
      <Table className="w-full min-w-[560px] table-fixed border-collapse text-center text-sm">
        <colgroup>
          <col className="w-[60px]" />
          {rxHeaders.map((h) => (
            <col key={h} />
          ))}
        </colgroup>
        <TableHeader className="border-slate-400 bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 [&_tr]:border-b">
          <TableRow className="border-b border-slate-400 hover:bg-slate-100/50 dark:border-zinc-700 dark:hover:bg-zinc-800/50">
            <TableHead className="border-r border-slate-400 px-3 py-2 dark:border-zinc-700" />
            {rxHeaders.map((h) => (
              <TableHead
                className="border-r border-slate-400 px-3 py-2 text-center text-sm font-medium text-[#1a2b6e] last:border-r-0 dark:border-zinc-700 dark:text-blue-400"
                key={h}
              >
                {h}
                {mandatoryHeaders.includes(h) && <span className="text-red-500"> *</span>}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIdx) => (
            <TableRow
              className={rowIdx === 0 ? 'border-b border-slate-400 dark:border-zinc-700' : 'border-0'}
              key={row}
            >
              <TableCell className="w-[60px] animate-none whitespace-nowrap border-r border-slate-400 bg-slate-50/50 px-3 py-3 text-center text-sm font-medium text-[#1a2b6e] dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-blue-400">
                {rowIdx === 0 ? 'R E' : 'L E'}
              </TableCell>
              {rxFields.map((field, idx) => {
                const errKey = `${row}.${field}`;
                const hasErr = !!rxErrors[errKey];

                let optionsList: string[] = [];

                if (field === 'sph') {
                  optionsList = POWER_OPTIONS;
                } else if (field === 'cyl') {
                  optionsList = CYL_OPTIONS;
                } else if (field === 'add') {
                  optionsList = ADD_OPTIONS;
                } else if (field === 'axis') {
                  optionsList = AXIS_OPTIONS;
                } else if (field === 'pd') {
                  optionsList = PD_OPTIONS;
                } else if (field === 'prism') {
                  optionsList = PRISM_OPTIONS;
                } else if (field === 'base') {
                  optionsList = BASE_OPTIONS;
                }

                return (
                  <TableCell
                    className={cn(
                      rowIdx === 0 ? 'border-b border-slate-400 dark:border-zinc-700' : '',
                      'group relative p-0',
                      idx < 6 ? 'border-r border-slate-400 dark:border-zinc-700' : ''
                    )}
                    key={field}
                  >
                    <RxScrollPicker
                      defaultValue={
                        (row === 'autoRefRe' || row === 'autoRefLe') &&
                        (field === 'sph' || field === 'cyl' || field === 'axis' || field === 'pd')
                          ? '____'
                          : field === 'prism' || field === 'base'
                            ? '0'
                            : '0.00'
                      }
                      hasError={hasErr}
                      onChange={(val) => setRxField(row, field, val)}
                      options={optionsList}
                      value={rxForm[row][field] || ''}
                    />
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ObjectiveRxContentComponent({
  customerId,
  hasImage1,
  hasImage2,
  optometristRxForm,
  rxErrors,
  rxForm,
  setRxField,
  setStoreFeedback,
  storeFeedback,
}: ObjectiveRxContentProps) {
  useRenderLog('ObjectiveRxContent');

  return (
    <div className="space-y-4">
      <div className="shadow-xs w-full overflow-hidden rounded-lg border border-slate-300 dark:border-zinc-700">
        <p className="border-b border-slate-400 bg-slate-100 py-2.5 text-center text-sm font-medium text-slate-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
          Objective prescription
        </p>

        <div className="space-y-4 overflow-x-auto p-3">
          <RxSubTable
            label="Auto ref"
            mandatoryHeaders={['Sph', 'Cyl', 'Axis', 'PD']}
            rows={['autoRefRe', 'autoRefLe']}
            rxErrors={rxErrors}
            rxForm={rxForm}
            setRxField={setRxField}
          />
          <RxSubTable
            label="PGP, Old RX, Outside RX"
            rows={['pgpRe', 'pgpLe']}
            rxErrors={rxErrors}
            rxForm={rxForm}
            setRxField={setRxField}
          />
        </div>
      </div>

      <div className="shadow-xs overflow-x-auto rounded-lg border border-slate-300 dark:border-zinc-700">
        <Table className="w-full min-w-[550px] table-fixed border-collapse text-center text-sm">
          <TableHeader className="border-slate-400 bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 [&_tr]:border-b">
            <TableRow className="border-b border-slate-400 hover:bg-slate-100/50 dark:border-zinc-700 dark:hover:bg-zinc-800/50">
              <TableHead
                className="border-b border-slate-400 py-2.5 text-center text-sm font-medium text-slate-900 dark:border-zinc-700 dark:text-zinc-100"
                colSpan={8}
              >
                Subjective/Final
              </TableHead>
            </TableRow>
            <TableRow className="border-b border-slate-400 bg-slate-100/70 hover:bg-slate-100/50 dark:border-zinc-700 dark:bg-zinc-800/70 dark:hover:bg-zinc-800/50">
              <TableHead className="w-[70px] whitespace-nowrap border-r border-slate-400 px-3 py-2 text-center text-sm font-medium text-[#1a2b6e] dark:border-zinc-700 dark:text-blue-400">
                R X
              </TableHead>
              {optometristHeaders.map((h) => (
                <TableHead
                  className="border-r border-slate-400 px-3 py-2 text-center text-sm font-medium text-[#1a2b6e] last:border-r-0 dark:border-zinc-700 dark:text-blue-400"
                  key={h}
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(['re', 'le'] as const).map((eye, idx) => (
              <TableRow
                className={idx === 0 ? 'border-b border-slate-400 dark:border-zinc-700' : 'border-0'}
                key={eye}
              >
                <TableCell className="w-[70px] animate-none whitespace-nowrap border-r border-slate-400 bg-slate-50/50 py-3 text-center text-sm font-medium text-[#1a2b6e] dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-blue-400">
                  {eye === 're' ? 'R E' : 'L E'}
                </TableCell>
                {optometristFields.map((field, fIdx) => (
                  <TableCell
                    className={`${idx === 0 ? 'border-b border-slate-400 dark:border-zinc-700' : ''} p-0 ${fIdx < 6 ? 'border-r border-slate-400 dark:border-zinc-700' : ''}`}
                    key={field}
                  >
                    <input
                      className="h-full w-full cursor-not-allowed border-0 bg-slate-50 px-3 py-2.5 text-center text-sm font-medium text-muted-foreground outline-none dark:bg-zinc-900"
                      disabled
                      type="text"
                      value={optometristRxForm[eye][field] || ''}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
        <div className="space-y-1.5 sm:col-span-3">
          <label className="text-[14px] font-medium text-foreground">Store Action / Feedback</label>
          <textarea
            className="h-[176px] w-full resize-none rounded-md border border-input bg-background p-3 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(e) => setStoreFeedback(e.target.value)}
            placeholder="Enter store action, clinical notes, or remarks..."
            value={storeFeedback}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-1">
          <label className="text-[14px] font-medium text-foreground">Attachment 1</label>
          <CustomerFeedbackImageBox customerId={customerId} hasImage={hasImage1} slot={1} />
        </div>

        <div className="space-y-1.5 sm:col-span-1">
          <label className="text-[14px] font-medium text-foreground">Attachment 2</label>
          <CustomerFeedbackImageBox customerId={customerId} hasImage={hasImage2} slot={2} />
        </div>
      </div>
    </div>
  );
}

const ObjectiveRxContent = React.memo(ObjectiveRxContentComponent);

export function StoreCustomerTestPage({
  onBack,
  selectedCustomer,
  setSelectedCustomerId,
}: StoreCustomerTestPageProps) {
  useRenderLog('StoreCustomerTestPage');

  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const user = useAppSelector((state) => state.auth.user);
  const customers = useAppSelector((state) => state.customers.customers);

  const buildFormState = React.useCallback(
    (customer: Customer | null): CustomerForm => ({
      activeProfile: customer?.activeProfile || false,
      age: customer?.age || '',
      customerType: customer?.customerType || 'New',
      gender: customer?.gender || '',
      mobile: customer?.mobile || '',
      name: customer?.name || '',
      preferredLanguage: customer?.preferredLanguage || 'English',
      preferredLanguage2: customer?.preferredLanguage2 || 'None',
      status: customer?.status || 'Created',
      storeName: customer?.storeName || user?.name || '',
    }),
    [user]
  );

  const [form, setForm] = React.useState(() => buildFormState(selectedCustomer));
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [storeFeedback, setStoreFeedback] = React.useState(() => selectedCustomer?.storeFeedback || '');
  const [rxErrors, setRxErrors] = React.useState<Record<string, boolean>>({});
  const [rxForm, setRxForm] = React.useState<RxFormState>(
    () =>
      selectedCustomer?.rxData || {
        autoRefLe: { ...emptyRxValues },
        autoRefRe: { ...emptyRxValues },
        pgpLe: { ...emptyRxValues },
        pgpRe: { ...emptyRxValues },
      }
  );
  const [optometristRxForm, setOptometristRxForm] = React.useState<OptometristRxFormState>(() => {
    const optometristRx = selectedCustomer?.optometristRxData;

    return optometristRx
      ? { le: { ...optometristRx.le }, re: { ...optometristRx.re } }
      : { le: { ...emptyOptometristRxValues }, re: { ...emptyOptometristRxValues } };
  });

  const [isSaving, setIsSaving] = React.useState(false);
  const [isRequesting, setIsRequesting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isCancellingRequest, setIsCancellingRequest] = React.useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [activeStep, setActiveStep] = React.useState(1);

  const hasPendingRequest = selectedCustomer?.status === 'Initiated' || selectedCustomer?.status === 'Queued';
  const hasActiveRequest =
    hasPendingRequest || selectedCustomer?.status === 'Accepted' || selectedCustomer?.status === 'Testing';

  const [prevCustomerId, setPrevCustomerId] = React.useState(selectedCustomer?.id);

  if (selectedCustomer?.id !== prevCustomerId) {
    setPrevCustomerId(selectedCustomer?.id);
    setForm(buildFormState(selectedCustomer));
    setStoreFeedback(selectedCustomer?.storeFeedback || '');
    setRxForm(
      selectedCustomer?.rxData || {
        autoRefLe: { ...emptyRxValues },
        autoRefRe: { ...emptyRxValues },
        pgpLe: { ...emptyRxValues },
        pgpRe: { ...emptyRxValues },
      }
    );
    const optometristRx = selectedCustomer?.optometristRxData;

    setOptometristRxForm(
      optometristRx
        ? { le: { ...optometristRx.le }, re: { ...optometristRx.re } }
        : { le: { ...emptyOptometristRxValues }, re: { ...emptyOptometristRxValues } }
    );
  }

  const setField = React.useCallback(
    (key: string) => (val: string) => {
      setForm((f) => ({ ...f, [key]: val }));
      setErrors((prev) => {
        if (!prev[key]) {
          return prev;
        }

        const next = { ...prev };
        delete next[key];

        return next;
      });
    },
    []
  );

  const setRxField = React.useCallback((row: RxRow, field: keyof RxValues, val: string) => {
    const cleanVal = field === 'base' ? val : val.replace(/[a-zA-Z]/g, '');
    setRxForm((prev) => ({
      ...prev,
      [row]: { ...prev[row], [field]: cleanVal },
    }));

    const key = `${row}.${field}`;

    setRxErrors((prev) => {
      if (!prev[key]) {
        return prev;
      }

      const next = { ...prev };
      delete next[key];

      return next;
    });
  }, []);

  const getCustomerValidationErrors = (): Record<string, string> => {
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
    } else if (!CUSTOMER_MOBILE_REGEX.test(form.mobile.trim())) {
      newErrors.mobile = 'Mobile number must be a valid 10-digit number (starting with 6-9)';
    }

    if (!form.gender) {
      newErrors.gender = 'Gender is required';
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

  const validatePrescriptionFormat = (): boolean => {
    const validationErrors: Record<string, boolean> = {};
    const rows: RxRow[] = ['autoRefRe', 'autoRefLe', 'pgpRe', 'pgpLe'];

    for (const row of rows) {
      const data = rxForm[row];

      if (data.sph && !SPH_REGEX.test(data.sph)) {
        validationErrors[`${row}.sph`] = true;
      }

      if (data.cyl && !CYL_REGEX.test(data.cyl)) {
        validationErrors[`${row}.cyl`] = true;
      }

      if (data.axis && !AXIS_REGEX.test(data.axis)) {
        validationErrors[`${row}.axis`] = true;
      }

      if (data.pd && !PD_REGEX.test(data.pd)) {
        validationErrors[`${row}.pd`] = true;
      }

      if (data.prism && !PRISM_REGEX.test(data.prism)) {
        validationErrors[`${row}.prism`] = true;
      }

      if (data.add && !ADD_REGEX.test(data.add)) {
        validationErrors[`${row}.add`] = true;
      }
    }

    setRxErrors(validationErrors);

    return Object.keys(validationErrors).length === 0;
  };

  const getMissingMandatoryFieldsForRequest = (): string[] => {
    const missing: string[] = [];

    if (!form.name.trim()) {
      missing.push('Name');
    }

    if (!form.age.trim()) {
      missing.push('Age');
    }

    if (!form.mobile.trim()) {
      missing.push('Mobile Number');
    }

    if (!form.preferredLanguage.trim()) {
      missing.push('Preferred Language 1');
    }

    return missing;
  };

  const getMissingMandatoryRxFieldsForRequest = (): { keys: string[]; labels: string[] } => {
    const fieldLabels: { field: 'axis' | 'cyl' | 'pd' | 'sph'; label: string }[] = [
      { field: 'sph', label: 'Sph' },
      { field: 'cyl', label: 'Cyl' },
      { field: 'axis', label: 'Axis' },
      { field: 'pd', label: 'PD' },
    ];
    const rowGroups: { eyeLabel: string; groupLabel: string; row: RxRow }[] = [
      { eyeLabel: 'RE', groupLabel: 'Auto Ref', row: 'autoRefRe' },
      { eyeLabel: 'LE', groupLabel: 'Auto Ref', row: 'autoRefLe' },
    ];
    const keys: string[] = [];
    const labels: string[] = [];

    rowGroups.forEach(({ eyeLabel, groupLabel, row }) => {
      const data = rxForm[row];

      fieldLabels.forEach(({ field, label }) => {
        if (!data[field]) {
          keys.push(`${row}.${field}`);
          labels.push(`${groupLabel} ${eyeLabel} ${label}`);
        }
      });
    });

    return { keys, labels };
  };

  const buildTimestamp = (): string =>
    new Date().toLocaleString('en-US', {
      day: 'numeric',
      hour: 'numeric',
      hour12: true,
      minute: '2-digit',
      month: 'short',
      second: '2-digit',
      year: 'numeric',
    });

  const persistCustomer = async (): Promise<string> => {
    const timestamp = buildTimestamp();

    if (selectedCustomer) {
      const updatedCustomer: Customer = {
        ...selectedCustomer,
        activeProfile: form.activeProfile,
        age: form.age,
        customerType: form.customerType,
        gender: form.gender,
        lastUpdatedOn: timestamp,
        mobile: form.mobile,
        name: form.name,
        optometristRxData: optometristRxForm,
        preferredLanguage: form.preferredLanguage,
        preferredLanguage2: form.preferredLanguage2,
        rxData: rxForm,
        status: form.status,
        storeFeedback,
        storeName: form.storeName,
      };

      await dispatch(updateCustomerAction(selectedCustomer.id, updatedCustomer));

      return selectedCustomer.id;
    }

    const numericIds = customers.map((c) => parseInt(c.id.replace('#', ''), 10)).filter((n) => !isNaN(n));
    const nextNum = Math.max(...numericIds, 0) + 1;
    const newId = `#${String(nextNum).padStart(4, '0')}`;

    const newCustomer: Customer = {
      activeProfile: true,
      age: form.age,
      customerType: form.customerType,
      gender: form.gender,
      id: newId,
      lastUpdatedOn: timestamp,
      mobile: form.mobile,
      name: form.name,
      optometristFeedback: '',
      optometristRxData: optometristRxForm,
      preferredLanguage: form.preferredLanguage,
      preferredLanguage2: form.preferredLanguage2,
      rxData: rxForm,
      status: form.status,
      storeFeedback,
      storeName: form.storeName || user?.name || '',
    };

    const created = await dispatch(createCustomerAction(newCustomer));
    setSelectedCustomerId(created.id);

    return created.id;
  };

  const handleNext = async () => {
    const customerErrors = getCustomerValidationErrors();
    setErrors(customerErrors);

    if (Object.keys(customerErrors).length > 0) {
      toast({
        description: 'Please correct the errors in the form before continuing.',
        title: 'Validation Error',
        type: 'error',
      });

      return;
    }

    if (!selectedCustomer) {
      setIsSaving(true);

      try {
        await persistCustomer();
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        toast({
          description: err.message || 'Failed to connect to backend database.',
          title: 'Error Saving Details',
          type: 'error',
        });

        return;
      } finally {
        setIsSaving(false);
      }
    }

    setActiveStep(2);
  };

  const handleSave = async () => {
    const customerErrors = getCustomerValidationErrors();
    setErrors(customerErrors);

    if (Object.keys(customerErrors).length > 0) {
      toast({
        description: 'Please correct the errors in the form before submitting.',
        title: 'Validation Error',
        type: 'error',
      });

      return;
    }

    if (!validatePrescriptionFormat()) {
      toast({
        description: 'Some prescription fields contain invalid values. Please fix them before saving.',
        title: 'Validation Error',
        type: 'error',
      });

      return;
    }

    setIsSaving(true);

    try {
      await persistCustomer();
      toast({
        description: `Details for ${form.name} have been saved.`,
        title: 'Details Saved',
        type: 'success',
      });
      onBack();
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({
        description: err.message || 'Failed to connect to backend database.',
        title: 'Error Saving Details',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndRequest = async () => {
    const missingFields = getMissingMandatoryFieldsForRequest();
    const customerErrors = getCustomerValidationErrors();
    setErrors(customerErrors);

    const { keys: missingRxKeys, labels: missingRxLabels } = getMissingMandatoryRxFieldsForRequest();
    const allMissingFields = [...missingFields, ...missingRxLabels];

    if (allMissingFields.length > 0) {
      setRxErrors((prev) => {
        const next = { ...prev };

        missingRxKeys.forEach((key) => {
          next[key] = true;
        });

        return next;
      });
      toast({
        description: `Please fill the following required fields to request an Optometrist: ${allMissingFields.join(', ')}.`,
        title: 'Missing Required Fields',
        type: 'error',
      });

      return;
    }

    if (Object.keys(customerErrors).length > 0) {
      toast({
        description: 'Please correct the errors in the form before submitting.',
        title: 'Validation Error',
        type: 'error',
      });

      return;
    }

    if (!validatePrescriptionFormat()) {
      toast({
        description: 'Some prescription fields contain invalid values. Please fix them before saving.',
        title: 'Validation Error',
        type: 'error',
      });

      return;
    }

    setIsRequesting(true);

    try {
      const customerId = await persistCustomer();
      await dispatch(initiateCallAction(customerId));
      toast({
        description: 'Your request has been sent to the available Optometrist doctor.',
        title: 'Optometrist Requested',
        type: 'success',
      });
      onBack();
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));

      if (err.message?.includes('No Optometrists are currently available')) {
        toast({
          description: 'All Optometrists are currently busy.',
          title: 'Optometrist Unavailable',
          type: 'error',
        });
      } else if (err.message?.includes('already has a pending Optometrist request')) {
        toast({ description: err.message, title: 'Request Already Pending', type: 'error' });
      } else if (err.message?.includes('409') || err.message?.includes('already taken')) {
        toast({
          description: err.message || 'This call is already taken by another agent.',
          title: 'Call Collision',
          type: 'error',
        });
      } else {
        toast({
          description: err.message || 'Failed to save details and request an Optometrist.',
          title: 'System Error',
          type: 'error',
        });
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCustomer) {
      return;
    }

    setIsDeleting(true);

    try {
      await dispatch(deleteCustomerAction(selectedCustomer.id));
      toast({
        description: `${selectedCustomer.name}'s details have been deleted.`,
        title: 'Customer Deleted',
        type: 'success',
      });
      setIsDeleteDialogOpen(false);
      onBack();
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({
        description: err.message || 'Failed to delete customer.',
        title: 'Error Deleting Customer',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmCancelRequest = async (reason: string) => {
    if (!selectedCustomer) {
      return;
    }

    setIsCancellingRequest(true);

    try {
      await dispatch(dropCustomerAction(selectedCustomer.id, reason));
      toast({
        description: `The request for ${selectedCustomer.name} has been cancelled.`,
        title: 'Request Cancelled',
        type: 'info',
      });
      setIsCancelDialogOpen(false);
      onBack();
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({
        description: err.message || 'Failed to cancel the request.',
        title: 'System Error',
        type: 'error',
      });
    } finally {
      setIsCancellingRequest(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-4 px-3 py-4 duration-200 animate-in fade-in sm:space-y-6 sm:px-6 sm:py-8 md:px-8">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center"></div>

      <CardFrame className="p-3 sm:p-6 md:p-8">
        <Stepper
          indicators={{ completed: <CheckIcon className="size-4" /> }}
          onValueChange={setActiveStep}
          value={activeStep}
        >
          <StepperNav className="mx-auto mb-8 flex data-[orientation=horizontal]:w-fit">
            <StepperItem className="not-last:flex-none items-start" step={1}>
              <StepperTrigger className="flex-col gap-2">
                <StepperIndicator className="size-8 border-2 border-transparent bg-muted text-sm font-semibold text-muted-foreground data-[state=active]:border-foreground data-[state=completed]:border-transparent data-[state=active]:bg-background data-[state=completed]:bg-foreground data-[state=active]:text-foreground data-[state=completed]:text-background">
                  1
                </StepperIndicator>
                <div className="flex flex-col items-center gap-0.5 text-center">
                  <StepperTitle className="text-sm font-semibold data-[state=inactive]:font-medium data-[state=inactive]:text-muted-foreground">
                    Customer Details
                  </StepperTitle>
                  <StepperDescription className="whitespace-nowrap text-sm">
                    Enter customer information
                  </StepperDescription>
                </div>
              </StepperTrigger>
              <StepperSeparator className="mx-1.5 mb-0.5 mt-[15px] h-0.5 w-10 shrink-0 grow-0 basis-auto self-start bg-muted group-data-[state=completed]/step:bg-foreground sm:w-16" />
            </StepperItem>
            <StepperItem className="not-last:flex-none items-start" step={2}>
              <StepperTrigger className="flex-col gap-2">
                <StepperIndicator className="size-8 border-2 border-transparent bg-muted text-sm font-semibold text-muted-foreground data-[state=active]:border-foreground data-[state=completed]:border-transparent data-[state=active]:bg-background data-[state=completed]:bg-foreground data-[state=active]:text-foreground data-[state=completed]:text-background">
                  2
                </StepperIndicator>
                <div className="flex flex-col items-center gap-0.5 text-center">
                  <StepperTitle className="text-sm font-semibold data-[state=inactive]:font-medium data-[state=inactive]:text-muted-foreground">
                    Objective Rx
                  </StepperTitle>
                  <StepperDescription className="whitespace-nowrap text-sm">
                    Record objective prescription
                  </StepperDescription>
                </div>
              </StepperTrigger>
            </StepperItem>
          </StepperNav>

          <StepperPanel>
            <StepperContent className="space-y-6 sm:space-y-8" value={1}>
              <CustomerDetailsFields errors={errors} form={form} setField={setField} />

              <div className="grid grid-cols-1 items-center gap-3 border-t border-border pt-4 sm:grid-cols-3">
                <div className="flex justify-center sm:justify-start">
                  <BackButton onClick={onBack} />
                </div>

                <div className="flex flex-col-reverse items-center justify-center gap-3 sm:flex-row">
                  {hasPendingRequest ? (
                    <Button
                      className="active:scale-98 h-10 w-full cursor-pointer px-5 text-sm font-medium shadow-sm transition-all sm:w-auto"
                      onClick={() => setIsCancelDialogOpen(true)}
                      type="button"
                      variant="secondary"
                    >
                      Cancel Request
                    </Button>
                  ) : (
                    <Button
                      className="active:scale-98 h-10 w-full cursor-pointer gap-2 px-5 text-sm font-medium shadow-sm transition-all sm:w-auto"
                      disabled={!selectedCustomer || isDeleting || hasActiveRequest}
                      onClick={() => setIsDeleteDialogOpen(true)}
                      type="button"
                      variant="destructive"
                    >
                      <Trash2 size={14} />
                      {isDeleting ? 'Deleting…' : 'Delete'}
                    </Button>
                  )}
                  <Button
                    className="active:scale-98 h-10 w-full cursor-pointer px-5 text-sm font-medium shadow-md transition-all sm:w-auto"
                    disabled={isSaving || isRequesting}
                    onClick={handleSave}
                    type="button"
                    variant="secondary"
                  >
                    {isSaving ? 'Saving…' : 'Save'}
                  </Button>
                </div>

                <div className="flex justify-center sm:justify-end">
                  <Button
                    className="active:scale-98 h-10 w-full cursor-pointer px-5 text-sm font-medium shadow-md transition-all sm:w-auto"
                    disabled={isSaving || isRequesting}
                    onClick={handleNext}
                    type="button"
                    variant="primary"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </StepperContent>

            <StepperContent className="space-y-6 sm:space-y-8" forceMount value={2}>
              <ObjectiveRxContent
                customerId={selectedCustomer?.id ?? ''}
                hasImage1={!!selectedCustomer?.storeFeedbackImage1}
                hasImage2={!!selectedCustomer?.storeFeedbackImage2}
                optometristRxForm={optometristRxForm}
                rxErrors={rxErrors}
                rxForm={rxForm}
                setRxField={setRxField}
                setStoreFeedback={setStoreFeedback}
                storeFeedback={storeFeedback}
              />

              <div className="grid grid-cols-1 items-center gap-3 border-t border-border pt-4 sm:grid-cols-3">
                <div className="flex justify-center sm:justify-start">
                  <BackButton onClick={onBack} />
                </div>

                <div className="flex justify-center">
                  {hasPendingRequest && (
                    <Button
                      className="active:scale-98 h-10 w-full cursor-pointer px-5 text-sm font-medium shadow-sm transition-all sm:w-auto"
                      onClick={() => setIsCancelDialogOpen(true)}
                      type="button"
                      variant="secondary"
                    >
                      Cancel Request
                    </Button>
                  )}
                </div>

                <div className="flex flex-col-reverse items-center justify-center gap-3 sm:flex-row sm:justify-end">
                  <Button
                    className="active:scale-98 h-10 w-full cursor-pointer px-5 text-sm font-medium shadow-sm transition-all sm:w-auto"
                    onClick={() => setActiveStep(1)}
                    type="button"
                    variant="secondary"
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </Button>
                  <Button
                    className="active:scale-98 h-10 w-full cursor-pointer px-5 text-sm font-medium shadow-md transition-all sm:w-auto"
                    disabled={isSaving || isRequesting}
                    onClick={handleSaveAndRequest}
                    type="button"
                    variant="primary"
                  >
                    {isRequesting ? 'Requesting…' : 'Save and Request'}
                  </Button>
                </div>
              </div>
            </StepperContent>
          </StepperPanel>
        </Stepper>

        <CancelRequestDialog
          customer={isCancelDialogOpen ? selectedCustomer : null}
          isSubmitting={isCancellingRequest}
          onConfirm={handleConfirmCancelRequest}
          onOpenChange={(open) => setIsCancelDialogOpen(open)}
        />

        <DeleteCustomerDialog
          customer={isDeleteDialogOpen ? selectedCustomer : null}
          isSubmitting={isDeleting}
          onConfirm={handleDelete}
          onOpenChange={(open) => setIsDeleteDialogOpen(open)}
        />
      </CardFrame>
    </main>
  );
}
