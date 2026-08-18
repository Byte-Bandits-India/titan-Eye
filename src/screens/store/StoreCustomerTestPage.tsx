import { CheckIcon, ChevronLeft, ClipboardPlus, Phone, User } from 'lucide-react';
import * as React from 'react';

import type { Customer, OptometristRxValues, RxValues, StoreCustomerTestPageProps } from '../../types';

import { initiateCallAction, updateCustomerAction } from '../../Actions/customerActions';
import { CardFrame } from '../../components/shared/CardFrame';
import { CustomerFeedbackImageBox } from '../../components/shared/CustomerFeedbackImageBox';
import { RxScrollPicker } from '../../components/shared/RxScrollPicker';
import {
  Stepper,
  StepperContent,
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
  CUSTOMER_NAME_REGEX,
  CYL_OPTIONS,
  CYL_REGEX,
  emptyOptometristRxValues,
  emptyRxValues,
  LANGUAGES,
  MOBILE_REGEX,
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
import { useAppDispatch } from '../../store';

// TEMP DEBUG: logs every commit of the tagged component with a timestamp and the
// gap since its previous commit, so we can see in the console which component is
// re-rendering too often and how far apart those renders land. Remove once diagnosed.
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

const RX_MANDATORY_FIELDS: { field: keyof RxValues; label: string; row: RxRow }[] = [
  { field: 'sph', label: 'Auto Ref (R E) - SPH', row: 'autoRefRe' },
  { field: 'cyl', label: 'Auto Ref (R E) - CYL', row: 'autoRefRe' },
  { field: 'axis', label: 'Auto Ref (R E) - Axis', row: 'autoRefRe' },
  { field: 'pd', label: 'Auto Ref (R E) - PD', row: 'autoRefRe' },
  { field: 'sph', label: 'Auto Ref (L E) - SPH', row: 'autoRefLe' },
  { field: 'cyl', label: 'Auto Ref (L E) - CYL', row: 'autoRefLe' },
  { field: 'axis', label: 'Auto Ref (L E) - Axis', row: 'autoRefLe' },
  { field: 'pd', label: 'Auto Ref (L E) - PD', row: 'autoRefLe' },
];

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
      <div className="shadow-xs w-full overflow-x-auto rounded-lg border border-slate-300 dark:border-zinc-700">
        <Table className="w-full min-w-[650px] table-fixed border-collapse text-center text-xs">
          <colgroup>
            <col className="w-[100px]" />
            <col className="w-[60px]" />
            {rxHeaders.map((h) => (
              <col key={h} />
            ))}
          </colgroup>
          <TableHeader className="border-slate-400 bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 [&_tr]:border-b">
            <TableRow className="border-b border-slate-400 hover:bg-slate-100/50 dark:border-zinc-700 dark:hover:bg-zinc-800/50">
              <TableHead
                className="border-b border-slate-400 py-2.5 text-center text-sm font-medium uppercase tracking-wider text-slate-900 dark:border-zinc-700 dark:text-zinc-100"
                colSpan={9}
              >
                Objective prescription
              </TableHead>
            </TableRow>
            <TableRow className="border-b border-slate-400 bg-slate-100/50 hover:bg-slate-100/50 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:bg-zinc-800/50">
              <TableHead
                className="border-r border-slate-400 py-1 text-center text-sm font-medium text-blue-600 dark:border-zinc-700 dark:text-blue-400"
                colSpan={2}
              ></TableHead>
              <TableHead className="border-r border-slate-400 py-1 text-center text-sm font-medium text-blue-600 dark:border-zinc-700 dark:text-blue-400">
                *
              </TableHead>
              <TableHead className="border-r border-slate-400 py-1 text-center text-sm font-medium text-blue-600 dark:border-zinc-700 dark:text-blue-400">
                *
              </TableHead>
              <TableHead className="border-r border-slate-400 py-1 text-center text-sm font-medium text-blue-600 dark:border-zinc-700 dark:text-blue-400">
                *
              </TableHead>
              <TableHead className="border-r border-slate-400 py-1 text-center text-sm font-medium text-blue-600 dark:border-zinc-700 dark:text-blue-400">
                *
              </TableHead>
              <TableHead className="border-r border-slate-400 py-1 text-center text-sm font-medium text-blue-600 dark:border-zinc-700 dark:text-blue-400"></TableHead>
              <TableHead className="border-r border-slate-400 py-1 text-center text-sm font-medium text-blue-600 dark:border-zinc-700 dark:text-blue-400"></TableHead>
              <TableHead className="py-1 text-center text-sm font-medium text-blue-600 dark:text-blue-400"></TableHead>
            </TableRow>
            <TableRow className="border-b border-slate-400 bg-slate-100/70 hover:bg-slate-100/50 dark:border-zinc-700 dark:bg-zinc-800/70 dark:hover:bg-zinc-800/50">
              <TableHead
                className="whitespace-nowrap border-r border-slate-400 px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-[#1a2b6e] dark:border-zinc-700 dark:text-blue-400"
                colSpan={2}
              >
                R X
              </TableHead>
              {rxHeaders.map((h) => (
                <TableHead
                  className="border-r border-slate-400 px-3 py-2 text-center text-xs font-medium text-[#1a2b6e] last:border-r-0 dark:border-zinc-700 dark:text-blue-400"
                  key={h}
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(['autoRefRe', 'autoRefLe', 'pgpRe', 'pgpLe'] as const).map((row, rowIdx) => (
              <TableRow
                className={rowIdx < 3 ? 'border-b border-slate-400 dark:border-zinc-700' : 'border-0'}
                key={row}
              >
                {rowIdx % 2 === 0 && (
                  <TableCell
                    className="w-[100px] animate-none border-b border-r border-slate-400 bg-slate-50/50 px-3 py-4 text-center text-xs font-medium text-[#1a2b6e] dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-blue-400"
                    rowSpan={2}
                  >
                    {rowIdx < 2 ? (
                      'Auto Ref'
                    ) : (
                      <>
                        PGP
                        <br />
                        Old RX
                        <br />
                        Outside RX
                      </>
                    )}
                  </TableCell>
                )}
                <TableCell className="w-[60px] animate-none whitespace-nowrap border-b border-r border-slate-400 bg-slate-50/50 px-3 py-3 text-center text-xs font-medium text-[#1a2b6e] dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-blue-400">
                  {rowIdx % 2 === 0 ? 'R E' : 'L E'}
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
                        rowIdx < 3 ? 'border-b border-slate-400 dark:border-zinc-700' : '',
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

      <div className="shadow-xs overflow-x-auto rounded-lg border border-slate-300 dark:border-zinc-700">
        <Table className="w-full min-w-[550px] table-fixed border-collapse text-center text-xs">
          <TableHeader className="border-slate-400 bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 [&_tr]:border-b">
            <TableRow className="border-b border-slate-400 hover:bg-slate-100/50 dark:border-zinc-700 dark:hover:bg-zinc-800/50">
              <TableHead
                className="border-b border-slate-400 py-2.5 text-center text-sm font-medium uppercase tracking-wider text-slate-900 dark:border-zinc-700 dark:text-zinc-100"
                colSpan={8}
              >
                Subjective/Final
              </TableHead>
            </TableRow>
            <TableRow className="border-b border-slate-400 bg-slate-100/70 hover:bg-slate-100/50 dark:border-zinc-700 dark:bg-zinc-800/70 dark:hover:bg-zinc-800/50">
              <TableHead className="w-[70px] whitespace-nowrap border-r border-slate-400 px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-[#1a2b6e] dark:border-zinc-700 dark:text-blue-400">
                R X
              </TableHead>
              {optometristHeaders.map((h) => (
                <TableHead
                  className="border-r border-slate-400 px-3 py-2 text-center text-xs font-medium text-[#1a2b6e] last:border-r-0 dark:border-zinc-700 dark:text-blue-400"
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
                <TableCell className="w-[70px] animate-none whitespace-nowrap border-r border-slate-400 bg-slate-50/50 py-3 text-center text-xs font-medium text-[#1a2b6e] dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-blue-400">
                  {eye === 're' ? 'R E' : 'L E'}
                </TableCell>
                {optometristFields.map((field, fIdx) => (
                  <TableCell
                    className={`${idx === 0 ? 'border-b border-slate-400 dark:border-zinc-700' : ''} p-0 ${fIdx < 6 ? 'border-r border-slate-400 dark:border-zinc-700' : ''}`}
                    key={field}
                  >
                    <input
                      className="h-full w-full cursor-not-allowed border-0 bg-slate-50 px-3 py-2.5 text-center text-xs font-medium text-muted-foreground outline-none dark:bg-zinc-900"
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
          <label className="text-[14px] font-medium uppercase tracking-wider text-foreground">
            Store Action / Feedback
          </label>
          <textarea
            className="h-[176px] w-full resize-none rounded-md border border-input bg-background p-3 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(e) => setStoreFeedback(e.target.value)}
            placeholder="Enter store action, clinical notes, or remarks..."
            value={storeFeedback}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-1">
          <label className="text-[14px] font-medium uppercase tracking-wider text-foreground">
            Attachment 1
          </label>
          <CustomerFeedbackImageBox customerId={customerId} hasImage={hasImage1} slot={1} />
        </div>

        <div className="space-y-1.5 sm:col-span-1">
          <label className="text-[14px] font-medium uppercase tracking-wider text-foreground">
            Attachment 2
          </label>
          <CustomerFeedbackImageBox customerId={customerId} hasImage={hasImage2} slot={2} />
        </div>
      </div>
    </div>
  );
}

const ObjectiveRxContent = React.memo(ObjectiveRxContentComponent);

export function StoreCustomerTestPage({ onBack, selectedCustomer }: StoreCustomerTestPageProps) {
  useRenderLog('StoreCustomerTestPage');

  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const buildFormState = React.useCallback(
    (customer: Customer | null): CustomerForm => ({
      activeProfile: customer?.activeProfile || false,
      age: customer?.age || '',
      customerType: customer?.customerType || 'New',
      gender: customer?.gender || 'Male',
      mobile: customer?.mobile || '',
      name: customer?.name || '',
      preferredLanguage: customer?.preferredLanguage || 'English',
      preferredLanguage2: customer?.preferredLanguage2 || 'None',
      status: customer?.status || 'Created',
      storeName: customer?.storeName || '',
    }),
    []
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
  const [activeStep, setActiveStep] = React.useState(1);

  const [prevSelectedCustomer, setPrevSelectedCustomer] = React.useState(selectedCustomer);

  if (selectedCustomer !== prevSelectedCustomer) {
    setPrevSelectedCustomer(selectedCustomer);
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

    RX_MANDATORY_FIELDS.forEach(({ field, label, row }) => {
      if (!rxForm[row][field]?.trim()) {
        missing.push(label);
      }
    });

    return missing;
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

  const persistCustomer = async (): Promise<void> => {
    if (!selectedCustomer) {
      return;
    }

    const updatedCustomer: Customer = {
      ...selectedCustomer,
      activeProfile: form.activeProfile,
      age: form.age,
      customerType: form.customerType,
      gender: form.gender,
      lastUpdatedOn: buildTimestamp(),
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
  };

  const handleNext = () => {
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

    setActiveStep(2);
  };

  const handleSave = async () => {
    if (!selectedCustomer) {
      return;
    }

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
    if (!selectedCustomer) {
      return;
    }

    const missingFields = getMissingMandatoryFieldsForRequest();
    const customerErrors = getCustomerValidationErrors();
    setErrors(customerErrors);

    if (missingFields.length > 0) {
      toast({
        description: `Please fill the following required fields to request an Optometrist: ${missingFields.join(', ')}.`,
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
      await persistCustomer();
      await dispatch(initiateCallAction(selectedCustomer.id));
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

  return (
    <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-4 px-3 py-4 duration-200 animate-in fade-in sm:space-y-6 sm:px-6 sm:py-8 md:px-8">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-md">
            <ClipboardPlus className="text-white" size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-foreground sm:text-xl">Create Test</h1>
            <p className="truncate text-xs font-medium text-muted-foreground">
              Patient: <span className="font-medium text-foreground">{selectedCustomer?.name}</span> (
              {selectedCustomer?.id}) — {selectedCustomer?.storeName}
            </p>
          </div>
        </div>

        <Button
          className="active:scale-98 flex h-9 shrink-0 cursor-pointer items-center gap-1.5 self-start rounded-[50px] border-border bg-card px-4 text-xs font-medium text-muted-foreground shadow-sm transition-all hover:bg-muted sm:h-10 sm:self-auto"
          onClick={onBack}
          type="button"
          variant="outline"
        >
          <ChevronLeft size={16} />
          Back
        </Button>
      </div>

      <CardFrame className="p-3 sm:p-6 md:p-8">
        <Stepper
          indicators={{ completed: <CheckIcon className="size-3.5" /> }}
          onValueChange={setActiveStep}
          value={activeStep}
        >
          <StepperNav className="mb-6">
            <StepperItem step={1}>
              <StepperTrigger>
                <StepperIndicator className="size-6 border-2 border-muted data-[state=active]:border-primary data-[state=completed]:border-blue-600 data-[state=active]:bg-primary data-[state=completed]:bg-blue-600 data-[state=active]:text-primary-foreground data-[state=completed]:text-white">
                  1
                </StepperIndicator>
                <StepperTitle>Customer Details</StepperTitle>
              </StepperTrigger>
              <StepperSeparator className="group-data-[state=completed]/step:bg-blue-600" />
            </StepperItem>
            <StepperItem step={2}>
              <StepperTrigger>
                <StepperIndicator className="size-6 border-2 border-muted data-[state=active]:border-primary data-[state=completed]:border-blue-600 data-[state=active]:bg-primary data-[state=completed]:bg-blue-600 data-[state=active]:text-primary-foreground data-[state=completed]:text-white">
                  2
                </StepperIndicator>
                <StepperTitle>Objective Rx</StepperTitle>
              </StepperTrigger>
            </StepperItem>
          </StepperNav>

          <StepperPanel>
            <StepperContent className="space-y-6 sm:space-y-8" value={1}>
              <CustomerDetailsFields errors={errors} form={form} setField={setField} />

              <div className="flex flex-col-reverse items-center justify-end gap-3 border-t border-border pt-4 sm:flex-row">
                <Button
                  className="active:scale-98 h-10 w-full cursor-pointer rounded-[50px] px-5 text-xs font-medium shadow-md transition-all sm:w-auto"
                  disabled={isSaving || isRequesting}
                  onClick={handleSave}
                  type="button"
                  variant="outline"
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </Button>
                <Button
                  className="active:scale-98 h-10 w-full cursor-pointer rounded-[50px] px-6 text-xs font-medium shadow-md transition-all sm:w-auto"
                  disabled={isSaving || isRequesting}
                  onClick={handleNext}
                  type="button"
                  variant="gradient"
                >
                  Next
                </Button>
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

              <div className="flex flex-col-reverse items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row">
                <Button
                  className="active:scale-98 h-10 w-full cursor-pointer rounded-[50px] px-5 text-xs font-medium shadow-sm transition-all sm:w-auto"
                  onClick={() => setActiveStep(1)}
                  type="button"
                  variant="outline"
                >
                  <ChevronLeft size={16} />
                  Previous
                </Button>

                <div className="flex w-full flex-col-reverse items-center gap-3 sm:w-auto sm:flex-row">
                  <Button
                    className="active:scale-98 h-10 w-full cursor-pointer rounded-[50px] px-5 text-xs font-medium shadow-md transition-all sm:w-auto"
                    disabled={isSaving || isRequesting}
                    onClick={handleSave}
                    type="button"
                    variant="outline"
                  >
                    {isSaving ? 'Saving…' : 'Save'}
                  </Button>
                  <Button
                    className="active:scale-98 h-10 w-full cursor-pointer rounded-[50px] px-6 text-xs font-medium shadow-md transition-all sm:w-auto"
                    disabled={isSaving || isRequesting}
                    onClick={handleSaveAndRequest}
                    type="button"
                    variant="gradient"
                  >
                    {isRequesting ? 'Requesting…' : 'Save and Request Optom'}
                  </Button>
                </div>
              </div>
            </StepperContent>
          </StepperPanel>
        </Stepper>
      </CardFrame>
    </main>
  );
}
