import ReactDOM from "react-dom";
import * as React from "react";
import { ChevronLeft, FileText, ChevronDown } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui/table";
import { RichTextEditor } from "../../components/ui/RichTextEditor";
import { useToast } from "../../components/ui/toast";
import { useAppDispatch } from "../../store";
import { updateCustomerAction } from "../../Actions/customerActions";
import type {
  Customer,
  RxValues,
  OptomRxValues,
  StoreRxDetailsProps,
} from "../../types";
import {
  rxFields,
  optomFields,
  rxHeaders,
  optomHeaders,
  SPH_REGEX,
  CYL_REGEX,
  AXIS_REGEX,
  PD_REGEX,
  PRISM_REGEX,
  ADD_REGEX,
  POWER_OPTIONS,
  CYL_OPTIONS,
  ADD_OPTIONS,
  AXIS_OPTIONS,
  PD_OPTIONS,
  PRISM_OPTIONS,
  BASE_OPTIONS,
} from "../../options/Option";
import { ScrollArea } from "../../components/ui/scroll-area";
import { cn } from "../../lib/utils";

const emptyRxValues: RxValues = {
  sph: "",
  cyl: "",
  axis: "",
  pd: "",
  prism: "",
  base: "",
  add: "",
};
const emptyOptomRxValues: OptomRxValues = {
  sph: "",
  cyl: "",
  axis: "",
  prism: "",
  base: "",
  va: "",
  add: "",
};

interface RxScrollPickerProps {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  hasError?: boolean;
  defaultValue?: string;
}

function RxScrollPicker({
  options,
  value,
  onChange,
  hasError,
  defaultValue = "0.00",
}: RxScrollPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [cardPos, setCardPos] = React.useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const ITEM_H = 32;

  const displayValue = value || defaultValue;

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCardPos({
        top: rect.bottom + 4,
        left: rect.left + rect.width / 2,
      });
    }
    setOpen((o) => !o);
  };

  React.useEffect(() => {
    if (!open || !listRef.current) return;
    const target = displayValue;
    const idx = options.indexOf(target);
    if (idx !== -1) {
      listRef.current.scrollTop = Math.max(0, idx * ITEM_H - ITEM_H * 3);
    }
  }, [open, options, displayValue]);

  React.useEffect(() => {
    if (!open) return;
    const update = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setCardPos({ top: rect.bottom + 4, left: rect.left + rect.width / 2 });
      }
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  const handleSelect = (opt: string) => {
    onChange(opt);
    setOpen(false);
  };

  const dropdownPortal = open
    ? ReactDOM.createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed z-[9999]"
            style={{
              top: cardPos.top,
              left: cardPos.left,
              transform: "translateX(-50%)",
            }}
          >
            <Card className="w-36 rounded-xl border border-border shadow-2xl overflow-hidden bg-card p-0">
              <div className="bg-slate-100 dark:bg-zinc-800 border-b border-border py-1.5 flex items-center justify-center gap-1 text-[10px] font-extrabold text-foreground uppercase tracking-widest">
                <span>Minus ( − )</span>
              </div>
              <ScrollArea className="h-56 w-full">
                <div ref={listRef} className="flex flex-col overflow-auto h-56">
                  {options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleSelect(opt)}
                      className={cn(
                        "w-full text-center font-mono text-xs py-2 px-3 transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer text-foreground",
                        opt === displayValue &&
                          "bg-blue-500 text-white font-black",
                        (opt === "0.00" || opt === "0") &&
                          opt !== displayValue &&
                          "bg-slate-100 dark:bg-zinc-800 font-black border-y border-slate-300 dark:border-zinc-600",
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </ScrollArea>
              <div className="bg-slate-100 dark:bg-zinc-800 border-t border-border py-1.5 flex items-center justify-center gap-1 text-[10px] font-extrabold text-foreground uppercase tracking-widest">
                <span>Plus ( + )</span>
              </div>
            </Card>
          </div>
        </>,
        document.body,
      )
    : null;

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full group">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={cn(
          "w-full h-9 flex items-center justify-center font-mono text-xs font-semibold text-foreground transition-colors",
          "hover:bg-slate-100/60 dark:hover:bg-zinc-800/60 focus:outline-none focus:ring-1 focus:ring-blue-500",
          hasError && "bg-rose-50 text-rose-600 font-bold",
          !value && !hasError && "text-foreground font-semibold",
        )}
      >
        <span>{displayValue}</span>
        <ChevronDown size={10} className="ml-1 opacity-40" />
      </button>
      {dropdownPortal}
    </div>
  );
}

export function StoreRxDetails({
  selectedCustomer,
  onBack,
}: StoreRxDetailsProps) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const [storeFeedback, setStoreFeedback] = React.useState("");
  const [rxErrors, setRxErrors] = React.useState<Record<string, boolean>>({});

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
    if (selectedCustomer) {
      setStoreFeedback(selectedCustomer.storeFeedback || "");
      setRxForm(
        selectedCustomer.rxData || {
          autoRefRe: { ...emptyRxValues },
          autoRefLe: { ...emptyRxValues },
          pgpRe: { ...emptyRxValues },
          pgpLe: { ...emptyRxValues },
        },
      );
      const optomRx = selectedCustomer.optomRxData;
      if (optomRx) {
        setOptomRxForm({
          re: { ...optomRx.re },
          le: { ...optomRx.le },
        });
      } else {
        setOptomRxForm({
          re: { ...emptyOptomRxValues },
          le: { ...emptyOptomRxValues },
        });
      }
    }
  }, [selectedCustomer]);

  const setRxField = (
    row: "autoRefRe" | "autoRefLe" | "pgpRe" | "pgpLe",
    field: keyof RxValues,
    val: string,
  ) => {
    const cleanVal = field === "base" ? val : val.replace(/[a-zA-Z]/g, "");
    setRxForm((prev) => ({
      ...prev,
      [row]: { ...prev[row], [field]: cleanVal },
    }));

    const key = `${row}.${field}`;
    if (rxErrors[key]) {
      setRxErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validatePrescriptionFields = (): boolean => {
    const errors: Record<string, boolean> = {};
    const rows: ("autoRefRe" | "autoRefLe" | "pgpRe" | "pgpLe")[] = [
      "autoRefRe",
      "autoRefLe",
      "pgpRe",
      "pgpLe",
    ];

    for (const row of rows) {
      const data = rxForm[row];
      if (data.sph && !SPH_REGEX.test(data.sph)) errors[`${row}.sph`] = true;
      if (data.cyl && !CYL_REGEX.test(data.cyl)) errors[`${row}.cyl`] = true;
      if (data.axis && !AXIS_REGEX.test(data.axis))
        errors[`${row}.axis`] = true;
      if (data.pd && !PD_REGEX.test(data.pd)) errors[`${row}.pd`] = true;
      if (data.prism && !PRISM_REGEX.test(data.prism))
        errors[`${row}.prism`] = true;
      if (data.add && !ADD_REGEX.test(data.add)) errors[`${row}.add`] = true;
    }

    setRxErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const buildTimestamp = (): string =>
    new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

  const handleSaveRx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    if (!validatePrescriptionFields()) {
      toast({
        title: "Validation Error",
        description:
          "Some prescription fields contain invalid values. Please fix them before saving.",
        type: "error",
      });
      return;
    }

    const updatedCustomer: Customer = {
      ...selectedCustomer,
      storeFeedback,
      rxData: rxForm,
      optomRxData: optomRxForm,
      lastUpdatedOn: buildTimestamp(),
    };

    try {
      await dispatch(
        updateCustomerAction(selectedCustomer.id, updatedCustomer),
      );
      toast({
        title: "Rx Data Saved",
        description: "Prescription details updated successfully.",
        type: "success",
      });
      onBack();
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Error Saving Rx",
        description: error.message || "Failed to update prescription data.",
        type: "error",
      });
    }
  };

  return (
    <main className="flex-1 px-3 sm:px-6 md:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 w-full max-w-[1400px] mx-auto animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-[#1a2b6e] dark:bg-blue-700 rounded-xl flex items-center justify-center shadow-md shrink-0">
            <FileText className="text-white" size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
              Prescription (RX) Management
            </h1>
            <p className="text-xs text-muted-foreground font-medium truncate">
              Patient:{" "}
              <span className="font-bold text-foreground">
                {selectedCustomer?.name}
              </span>{" "}
              ({selectedCustomer?.id}) — {selectedCustomer?.storeName}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="rounded-[50px] px-4 h-9 sm:h-10 border-border text-muted-foreground text-xs font-bold bg-card hover:bg-muted flex items-center gap-1.5 shadow-sm transition-all active:scale-98 self-start sm:self-auto cursor-pointer shrink-0"
        >
          <ChevronLeft size={16} />
          Back
        </Button>
      </div>

      <Card className="bg-card rounded-2xl border border-border shadow-lg p-3 sm:p-6 md:p-8">
        <form onSubmit={handleSaveRx} className="space-y-6 sm:space-y-8">
          <div className="space-y-4">
            <div className="w-full overflow-x-auto rounded-lg border border-slate-300 dark:border-zinc-700 shadow-xs">
              <Table className="w-full min-w-[650px] border-collapse text-center text-xs">
                <TableHeader className="[&_tr]:border-b border-slate-400 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800">
                  <TableRow className="border-b border-slate-400 dark:border-zinc-700 hover:bg-slate-100/50 dark:hover:bg-zinc-800/50">
                    <TableHead
                      colSpan={9}
                      className="py-2.5 font-extrabold text-sm text-slate-900 dark:text-zinc-100 text-center uppercase tracking-wider border-b border-slate-400 dark:border-zinc-700"
                    >
                      Store Login
                    </TableHead>
                  </TableRow>
                  <TableRow className="bg-slate-100/50 dark:bg-zinc-800/50 border-b border-slate-400 dark:border-zinc-700 hover:bg-slate-100/50 dark:hover:bg-zinc-800/50">
                    <TableHead
                      colSpan={2}
                      className="border-r border-slate-400 dark:border-zinc-700 py-1 text-center font-bold text-blue-600 dark:text-blue-400 text-sm"
                    ></TableHead>
                    <TableHead className="border-r border-slate-400 dark:border-zinc-700 py-1 text-center font-bold text-blue-600 dark:text-blue-400 text-sm">
                      *
                    </TableHead>
                    <TableHead className="border-r border-slate-400 dark:border-zinc-700 py-1 text-center font-bold text-blue-600 dark:text-blue-400 text-sm">
                      *
                    </TableHead>
                    <TableHead className="border-r border-slate-400 dark:border-zinc-700 py-1 text-center font-bold text-blue-600 dark:text-blue-400 text-sm">
                      *
                    </TableHead>
                    <TableHead className="border-r border-slate-400 dark:border-zinc-700 py-1 text-center font-bold text-blue-600 dark:text-blue-400 text-sm"></TableHead>
                    <TableHead className="border-r border-slate-400 dark:border-zinc-700 py-1 text-center font-bold text-blue-600 dark:text-blue-400 text-sm"></TableHead>
                    <TableHead className="border-r border-slate-400 dark:border-zinc-700 py-1 text-center font-bold text-blue-600 dark:text-blue-400 text-sm"></TableHead>
                    <TableHead className="py-1 text-center font-bold text-blue-600 dark:text-blue-400 text-sm"></TableHead>
                  </TableRow>
                  <TableRow className="bg-slate-100/70 dark:bg-zinc-800/70 border-b border-slate-400 dark:border-zinc-700 hover:bg-slate-100/50 dark:hover:bg-zinc-800/50">
                    <TableHead
                      colSpan={2}
                      className="border-r border-slate-400 dark:border-zinc-700 px-3 py-2 font-black text-xs text-[#1a2b6e] dark:text-blue-400 text-center uppercase tracking-wider whitespace-nowrap"
                    >
                      R X
                    </TableHead>
                    {rxHeaders.map((h) => (
                      <TableHead
                        key={h}
                        className="border-r border-slate-400 dark:border-zinc-700 px-3 py-2 font-black text-xs text-center text-[#1a2b6e] dark:text-blue-400 last:border-r-0"
                      >
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(["autoRefRe", "autoRefLe", "pgpRe", "pgpLe"] as const).map(
                    (row, rowIdx) => (
                      <TableRow
                        key={row}
                        className={
                          rowIdx < 3
                            ? "border-b border-slate-400 dark:border-zinc-700"
                            : "border-0"
                        }
                      >
                        {rowIdx % 2 === 0 && (
                          <TableCell
                            rowSpan={2}
                            className="border-r border-b border-slate-400 dark:border-zinc-700 font-black text-xs text-[#1a2b6e] dark:text-blue-400 bg-slate-50/50 dark:bg-zinc-900/50 px-3 py-4 w-[100px] text-center animate-none"
                          >
                            {rowIdx < 2 ? "Auto Ref" : "PGP"}
                          </TableCell>
                        )}
                        <TableCell className="border-r border-b border-slate-400 dark:border-zinc-700 font-black text-xs text-[#1a2b6e] dark:text-blue-400 bg-slate-50/50 dark:bg-zinc-900/50 px-3 py-3 w-[60px] whitespace-nowrap text-center animate-none">
                          {rowIdx % 2 === 0 ? "R E" : "L E"}
                        </TableCell>
                        {rxFields.map((field, idx) => {
                          const errKey = `${row}.${field}`;
                          const hasErr = !!rxErrors[errKey];

                          let optionsList: string[] = [];
                          if (field === "sph") {
                            optionsList = POWER_OPTIONS;
                          } else if (field === "cyl") {
                            optionsList = CYL_OPTIONS;
                          } else if (field === "add") {
                            optionsList = ADD_OPTIONS;
                          } else if (field === "axis") {
                            optionsList = AXIS_OPTIONS;
                          } else if (field === "pd") {
                            optionsList = PD_OPTIONS;
                          } else if (field === "prism") {
                            optionsList = PRISM_OPTIONS;
                          } else if (field === "base") {
                            optionsList = BASE_OPTIONS;
                          }

                          return (
                            <TableCell
                              key={field}
                              className={cn(
                                rowIdx < 3
                                  ? "border-b border-slate-400 dark:border-zinc-700"
                                  : "",
                                "p-0 relative group",
                                idx < 6
                                  ? "border-r border-slate-400 dark:border-zinc-700"
                                  : "",
                              )}
                            >
                              <RxScrollPicker
                                options={optionsList}
                                value={rxForm[row][field] || ""}
                                defaultValue={
                                  (field as string) === "axis" ||
                                  (field as string) === "prism" ||
                                  (field as string) === "base"
                                    ? "0"
                                    : "0.00"
                                }
                                onChange={(val) => setRxField(row, field, val)}
                                hasError={hasErr}
                              />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ),
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-300 dark:border-zinc-700 rounded-lg shadow-xs">
              <Table className="w-full min-w-[550px] border-collapse text-center text-xs">
                <TableHeader className="[&_tr]:border-b border-slate-400 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800">
                  <TableRow className="border-b border-slate-400 dark:border-zinc-700 hover:bg-slate-100/50 dark:hover:bg-zinc-800/50">
                    <TableHead
                      colSpan={8}
                      className="py-2.5 font-extrabold text-sm text-slate-900 dark:text-zinc-100 text-center uppercase tracking-wider border-b border-slate-400 dark:border-zinc-700"
                    >
                      Optom Login
                    </TableHead>
                  </TableRow>
                  <TableRow className="bg-slate-100/70 dark:bg-zinc-800/70 border-b border-slate-400 dark:border-zinc-700 hover:bg-slate-100/50 dark:hover:bg-zinc-800/50">
                    <TableHead className="border-r border-slate-400 dark:border-zinc-700 px-3 py-2 font-black text-xs text-[#1a2b6e] dark:text-blue-400 text-center uppercase tracking-wider whitespace-nowrap">
                      R X
                    </TableHead>
                    {optomHeaders.map((h) => (
                      <TableHead
                        key={h}
                        className="border-r border-slate-400 dark:border-zinc-700 px-3 py-2 font-black text-xs text-center text-[#1a2b6e] dark:text-blue-400 last:border-r-0"
                      >
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(["re", "le"] as const).map((eye, idx) => (
                    <TableRow
                      key={eye}
                      className={
                        idx === 0
                          ? "border-b border-slate-400 dark:border-zinc-700"
                          : "border-0"
                      }
                    >
                      <TableCell className="border-r border-slate-400 dark:border-zinc-700 font-black text-xs text-[#1a2b6e] dark:text-blue-400 bg-slate-50/50 dark:bg-zinc-900/50 py-3 whitespace-nowrap text-center animate-none">
                        {eye === "re" ? "R E" : "L E"}
                      </TableCell>
                      {optomFields.map((field, fIdx) => (
                        <TableCell
                          key={field}
                          className={`${idx === 0 ? "border-b border-slate-400 dark:border-zinc-700" : ""} p-0 ${fIdx < 6 ? "border-r border-slate-400 dark:border-zinc-700" : ""}`}
                        >
                          <input
                            type="text"
                            value={optomRxForm[eye][field] || ""}
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

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider">
              Store Action / Feedback
            </label>
            <RichTextEditor
              value={storeFeedback}
              onChange={setStoreFeedback}
              placeholder="Enter store action, clinical notes, or remarks..."
            />
          </div>

          <div className="pt-4 border-t border-border flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="w-full sm:w-auto rounded-[50px] h-10 px-5 font-bold text-xs border-border text-muted-foreground hover:bg-muted shadow-sm cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto rounded-[50px] h-10 px-6 font-bold text-xs bg-[#1a2b6e] hover:bg-[#152260] dark:bg-blue-700 dark:hover:bg-blue-800 text-white shadow-md active:scale-98 transition-all cursor-pointer"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
