import {
  ArrowLeft,
  Download,
  Eye,
  EyeOff,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react";
import * as React from "react";

import type { AuditLog, ColumnOption, Customer, ManagedUser, UserRole } from "../../types";

import { fetchCustomersAction } from "../../Actions/customerActions";
import {
  createUserAction,
  deleteUserAction,
  fetchUsersAction,
  toggleUserStatusAction,
  updateUserAction,
} from "../../Actions/userActions";
import { AppLayout } from "../../components/layout/AppLayout";
import { ColumnVisibilityDropdown } from "../../components/shared/ColumnVisibilityDropdown";
import { DateFilter } from "../../components/shared/DateFilter";
import { OptomUsersPanel } from "../../components/shared/OptomUsersPanel";
import { PaginationBar } from "../../components/shared/PaginationBar";
import { StatsGrid } from "../../components/shared/StatsGrid";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { CallTimer } from "../../components/ui/CallTimer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { LegacySelect as Select } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useToast } from "../../components/ui/toast";
import { usePagination } from "../../hooks/usePagination";
import { cn } from "../../lib/utils";
import {
  EMAIL_REGEX,
  MOBILE_REGEX,
  NAME_REGEX,
  PASSWORD_REGEX,
} from "../../options/Option";
import { useAppDispatch, useAppSelector } from "../../store";
import { apiClient } from "../../Util/apiClient";
import {
  type DateFilterRange,
  filterAuditLogsByDate,
  filterCustomersByDate,
  filterUsersByDate,
} from "../../utils/dateFilter";
import {
  exportAllCustomersReport,
  exportSingleCustomerReport,
} from "../../utils/excelExport";

const USER_TABLE_COLUMNS: ColumnOption[] = [
  { id: "userId", label: "User ID" },
  { id: "name", isMandatory: true, label: "User Name" },
  { id: "email", label: "Email" },
  { id: "role", label: "Role" },
  { id: "mobile", label: "Mobile" },
  { id: "lastLogin", label: "Last Login" },
  { id: "status", label: "Status" },
  { id: "actions", isMandatory: true, label: "Actions" },
];
const DEFAULT_USER_COLUMNS = ["userId", "name", "email", "role", "status", "actions"];

const CUSTOMER_TABLE_COLUMNS: ColumnOption[] = [
  { id: "id", label: "ID" },
  { id: "name", isMandatory: true, label: "Patient Name" },
  { id: "storeName", label: "Store Name" },
  { id: "timeStarted", label: "Time Started" },
  { id: "callDuration", label: "Call Duration" },
  { id: "ageGender", label: "Age / Gender" },
  { id: "mobile", label: "Mobile" },
  { id: "status", label: "Status" },
  { id: "lastUpdated", label: "Last Updated" },
  { id: "report", isMandatory: true, label: "Report" },
];
const DEFAULT_CUSTOMER_COLUMNS = ["id", "name", "storeName", "callDuration", "status", "report"];

const AUDIT_LOG_TABLE_COLUMNS: ColumnOption[] = [
  { id: "id", isMandatory: true, label: "Log ID" },
  { id: "timestamp", label: "Timestamp" },
  { id: "customerName", label: "Patient Name" },
  { id: "customerId", label: "Patient ID" },
  { id: "storeName", label: "Store Name" },
  { id: "timeStarted", label: "Time Started" },
  { id: "callDuration", label: "Call Duration" },
  { id: "status", isMandatory: true, label: "Status" },
  { id: "performedBy", label: "Performed By" },
];
const DEFAULT_AUDIT_LOG_COLUMNS = ["id", "timestamp", "customerName", "storeName", "status", "performedBy"];

function formatSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) {return "00m:00s";}

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${String(mins).padStart(2, "0")}m:${String(secs).padStart(2, "0")}s`;
}

function getRoleBasedUserId(
  user: ManagedUser,
  allUsers: ManagedUser[],
): string {
  const sameRoleUsers = [...allUsers]
    .filter((u) => u.role === user.role)
    .sort((a, b) => a.email.localeCompare(b.email));

  const indexInRole =
    sameRoleUsers.findIndex((u) => u.email === user.email) + 1;
  const numStr = String(indexInRole > 0 ? indexInRole : 1).padStart(3, "0");

  switch (user.role.toLowerCase()) {
    case "admin":
      return `ADMIN-${numStr}`;
    case "optom":
      return `OPTOM-${numStr}`;
    case "store":
      return `STORE-${numStr}`;
    default:
      return `USER-${numStr}`;
  }
}

function parseTimestamp(val: null | number | string | undefined): number {
  if (!val) {return 0;}

  if (typeof val === "number") {return val;}

  const num = parseInt(val, 10);

  if (!isNaN(num) && String(num).length >= 10) {return num;}

  const dateMs = new Date(val).getTime();

  return isNaN(dateMs) ? 0 : dateMs;
}

function renderCallDuration(cust: Customer) {
  const optomCallStartTime = cust.optomCallStartTime;

  if (cust.callActive && optomCallStartTime) {
    const startMs = parseTimestamp(cust.callStartTime);
    const optomMs = parseTimestamp(optomCallStartTime);
    const waitSecs =
      startMs > 0 && optomMs >= startMs
        ? Math.floor((optomMs - startMs) / 1000)
        : 0;
    const maxCallSecs = Math.max(0, 3540 - waitSecs);

    return (
      <CallTimer
        active={true}
        maxDurationSeconds={maxCallSecs}
        startTime={optomCallStartTime}
      />
    );
  }

  if (cust.callDuration && cust.callDuration > 0) {
    return (
      <span className="font-mono font-bold text-foreground">
        {formatSeconds(cust.callDuration)}
      </span>
    );
  }

  return <span className="text-muted-foreground">—</span>;
}

function renderTimeStarted(cust: Customer) {
  if (cust.status === "Closed") {
    return <span className="font-mono text-foreground font-bold">59m:00s</span>;
  }

  const optomCallStartTime = cust.optomCallStartTime;
  const isWaitingForOptom =
    cust.status === "Initiated" && !optomCallStartTime && cust.callActive;

  if (isWaitingForOptom && cust.callStartTime) {
    const startMs = parseTimestamp(cust.callStartTime);

    if (startMs > 0 && Date.now() - startMs >= 3540000) {
      return (
        <span className="font-mono text-foreground font-bold">59m:00s</span>
      );
    }

    return (
      <CallTimer
        active={true}
        maxDurationSeconds={3540}
        startTime={cust.callStartTime}
      />
    );
  }

  if (cust.callStartTime && optomCallStartTime) {
    const startMs = parseTimestamp(cust.callStartTime);
    const optomMs = parseTimestamp(optomCallStartTime);

    if (startMs > 0 && optomMs >= startMs) {
      const waitSecs = Math.floor((optomMs - startMs) / 1000);

      return (
        <span className="font-mono text-foreground font-bold">
          {formatSeconds(Math.min(waitSecs, 3540))}
        </span>
      );
    }
  }

  if (cust.callStartTime) {
    const startMs = parseTimestamp(cust.callStartTime);

    if (startMs > 0) {
      const endMs = parseTimestamp(cust.lastUpdatedOn) || Date.now();
      const waitSecs =
        endMs >= startMs ? Math.floor((endMs - startMs) / 1000) : 0;

      return (
        <span className="font-mono text-foreground font-bold">
          {formatSeconds(Math.min(waitSecs, 3540))}
        </span>
      );
    }
  }

  if (cust.callDuration && cust.callDuration > 0) {
    return (
      <span className="font-mono text-foreground font-bold">
        {formatSeconds(cust.callDuration)}
      </span>
    );
  }

  return <span className="text-muted-foreground">—</span>;
}

const ROLE_OPTIONS = [
  { label: "Store", value: "store" },
  { label: "Optom", value: "optom" },
  { label: "Admin", value: "admin" },
];

const EMPTY_FORM = {
  email: "",
  mobile: "",
  name: "",
  password: "",
  role: "store" as UserRole,
  storeName: "",
};

export function AdminScreen() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const users = useAppSelector((state) => state.users.users);
  const customers = useAppSelector((state) => state.customers.customers);
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = React.useState<
    "auditLogs" | "customers" | "users"
  >("customers");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingEmail, setEditingEmail] = React.useState<null | string>(null);
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [submitting, setSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = React.useState(false);

  const [auditLogs, setAuditLogs] = React.useState<AuditLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);

  const [dateRange, setDateRange] = React.useState<DateFilterRange>("all");

  const dateFilteredCustomers = React.useMemo(() => filterCustomersByDate(customers, dateRange), [customers, dateRange]);

  const [userPageSize, setUserPageSize] = React.useState<number>(10);
  const [customerPageSize, setCustomerPageSize] = React.useState<number>(10);
  const [auditLogPageSize, setAuditLogPageSize] = React.useState<number>(10);

  const [visibleUserCols, setVisibleUserCols] = React.useState<string[]>(DEFAULT_USER_COLUMNS);
  const [visibleCustomerCols, setVisibleCustomerCols] = React.useState<string[]>(DEFAULT_CUSTOMER_COLUMNS);
  const [visibleAuditCols, setVisibleAuditCols] = React.useState<string[]>(DEFAULT_AUDIT_LOG_COLUMNS);

  const handleToggleUserCol = (id: string) => {
    setVisibleUserCols((prev) =>
      prev.includes(id) ? prev.filter((col) => col !== id) : [...prev, id]
    );
  };

  const handleToggleCustomerCol = (id: string) => {
    setVisibleCustomerCols((prev) =>
      prev.includes(id) ? prev.filter((col) => col !== id) : [...prev, id]
    );
  };

  const handleToggleAuditCol = (id: string) => {
    setVisibleAuditCols((prev) =>
      prev.includes(id) ? prev.filter((col) => col !== id) : [...prev, id]
    );
  };

  React.useEffect(() => {
    dispatch(fetchUsersAction());
    dispatch(fetchCustomersAction());
  }, [dispatch]);

  React.useEffect(() => {
    setSearchTerm("");
  }, [activeTab]);

  const dateFilteredUsers = React.useMemo(() => filterUsersByDate(users, dateRange), [users, dateRange]);

  const filteredUsers = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {return dateFilteredUsers;}

    return dateFilteredUsers.filter((u) => {
      const userId = getRoleBasedUserId(u, users).toLowerCase();
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const role = (u.role || "").toLowerCase();
      const mobile = (u.mobile || "").toLowerCase();
      const storeName = (u.storeName || "").toLowerCase();
      const status = (u.status || "").toLowerCase();
      const lastLoginStr = u.lastLogin
        ? new Date(u.lastLogin).toLocaleString().toLowerCase()
        : "never";

      const matchesRole = role.includes(term);

      return (
        userId.includes(term) ||
        name.includes(term) ||
        email.includes(term) ||
        matchesRole ||
        mobile.includes(term) ||
        storeName.includes(term) ||
        status.includes(term) ||
        lastLoginStr.includes(term)
      );
    });
  }, [dateFilteredUsers, searchTerm, users]);

  const {
    currentPage: userCurrentPage,
    nextPage: userNextPage,
    paginatedItems: paginatedUsers,
    prevPage: userPrevPage,
    resetPage: userResetPage,
    totalItems: userTotalItems,
    totalPages: userTotalPages,
  } = usePagination(filteredUsers, userPageSize);

  React.useEffect(() => {
    userResetPage();
  }, [
    searchTerm,
    dateRange,
    userPageSize,
    filteredUsers.length,
    userResetPage,
  ]);

  const [customerStatusTab, setCustomerStatusTab] = React.useState<
    "all" | "Completed" | "InProgress" | "Pending"
  >("all");

  const customerTabCounts = React.useMemo(() => ({
      all: dateFilteredCustomers.length,
      completed: dateFilteredCustomers.filter(
        (c) => c.status === "Completed" || c.status === "Closed"
      ).length,
      inProgress: dateFilteredCustomers.filter(
        (c) => c.status === "Initiated" || c.status === "Accepted"
      ).length,
      pending: dateFilteredCustomers.filter((c) => c.status === "Created").length,
    }), [dateFilteredCustomers]);

  const filteredCustomers = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return dateFilteredCustomers.filter((c) => {
      if (customerStatusTab === "Pending" && c.status !== "Created") {return false;}

      if (customerStatusTab === "InProgress" && !(c.status === "Initiated" || c.status === "Accepted")) {return false;}

      if (customerStatusTab === "Completed" && !(c.status === "Completed" || c.status === "Closed")) {return false;}

      if (!term) {return true;}

      return (
        c.name.toLowerCase().includes(term) ||
        c.id.toLowerCase().includes(term) ||
        c.mobile.includes(term) ||
        (c.storeName && c.storeName.toLowerCase().includes(term))
      );
    });
  }, [dateFilteredCustomers, customerStatusTab, searchTerm]);

  const {
    currentPage: customerCurrentPage,
    nextPage: customerNextPage,
    paginatedItems: paginatedCustomers,
    prevPage: customerPrevPage,
    resetPage: customerResetPage,
    totalItems: customerTotalItems,
    totalPages: customerTotalPages,
  } = usePagination(filteredCustomers, customerPageSize);

  const fetchAuditLogs = React.useCallback(async () => {
    setIsLoadingLogs(true);

    try {
      const res = await apiClient.get<AuditLog[]>("/customers/audit-logs");
      setAuditLogs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast({
        description: (err as Error).message,
        title: "Failed to fetch audit logs",
        type: "error",
      });
    } finally {
      setIsLoadingLogs(false);
    }
  }, [toast]);

  const handleResetSync = React.useCallback(async () => {
    setIsSyncing(true);
    setSearchTerm("");

    try {
      if (activeTab === "users") {
        await dispatch(fetchUsersAction());
      } else if (activeTab === "customers") {
        await dispatch(fetchCustomersAction());
      } else if (activeTab === "auditLogs") {
        await fetchAuditLogs();
      }

      toast({
        description: "Data feed has been successfully updated.",
        title: "Feed Synced",
        type: "success",
      });
    } catch (err) {
    } finally {
      setIsSyncing(false);
    }
  }, [activeTab, dispatch, fetchAuditLogs, toast]);

  React.useEffect(() => {
    if (activeTab === "auditLogs") {
      fetchAuditLogs();
    }

    const handleSseEvent = () => {
      if (activeTab === "auditLogs") {
        fetchAuditLogs();
      }
    };

    window.addEventListener("titan:sse_event", handleSseEvent);

    return () => window.removeEventListener("titan:sse_event", handleSseEvent);
  }, [activeTab, fetchAuditLogs]);

  const dateFilteredAuditLogs = React.useMemo(() => filterAuditLogsByDate(auditLogs, dateRange), [auditLogs, dateRange]);

  const filteredAuditLogs = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {return dateFilteredAuditLogs;}

    return dateFilteredAuditLogs.filter(
      (log) =>
        (log.customerId && log.customerId.toLowerCase().includes(term)) ||
        (log.customerName && log.customerName.toLowerCase().includes(term)) ||
        (log.storeName && log.storeName.toLowerCase().includes(term)) ||
        (log.status && log.status.toLowerCase().includes(term)) ||
        (log.callTakenBy && log.callTakenBy.toLowerCase().includes(term)),
    );
  }, [dateFilteredAuditLogs, searchTerm]);

  const {
    currentPage: auditLogCurrentPage,
    nextPage: auditLogNextPage,
    paginatedItems: paginatedAuditLogs,
    prevPage: auditLogPrevPage,
    resetPage: auditLogResetPage,
    totalItems: auditLogTotalItems,
    totalPages: auditLogTotalPages,
  } = usePagination(filteredAuditLogs, auditLogPageSize);

  React.useEffect(() => {
    if (activeTab === "auditLogs") {
      auditLogResetPage();
    }
  }, [searchTerm, dateRange, activeTab, auditLogResetPage]);

  React.useEffect(() => {
    customerResetPage();
  }, [searchTerm, dateRange, customerResetPage]);

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingEmail(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setShowPassword(false);
  };

  const handleAddNewClick = () => {
    if (isFormOpen && !editingEmail) {
      closeForm();
    } else {
      setEditingEmail(null);
      setForm(EMPTY_FORM);
      setErrors({});
      setShowPassword(false);
      setIsFormOpen(true);
    }
  };

  const handleEditClick = (u: ManagedUser) => {
    setEditingEmail(u.email);
    setForm({
      email: u.email,
      mobile: u.mobile || "",
      name: u.name,
      password: "",
      role: u.role,
      storeName: u.storeName || "",
    });
    setErrors({});
    setShowPassword(false);
    setIsFormOpen(true);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = "Full name is required";
    } else if (!NAME_REGEX.test(form.name.trim())) {
      newErrors.name =
        "Name must be between 3 and 50 characters and contain only letters and spaces";
    }

    if (!editingEmail) {
      if (!form.email.trim()) {
        newErrors.email = "Email is required";
      } else if (!EMAIL_REGEX.test(form.email.trim())) {
        newErrors.email = "Please enter a valid email address";
      }
    }

    if (!editingEmail) {
      if (!form.password) {
        newErrors.password = "Password is required";
      } else if (!PASSWORD_REGEX.test(form.password)) {
        newErrors.password = "Password must be between 6 and 50 characters";
      }
    } else {
      if (form.password && !PASSWORD_REGEX.test(form.password)) {
        newErrors.password = "Password must be between 6 and 50 characters";
      }
    }

    if (form.mobile && !MOBILE_REGEX.test(form.mobile.trim())) {
      newErrors.mobile =
        "Mobile number must be a valid 10-digit number (starting with 6-9)";
    }

    if (form.role === "store" && !form.storeName.trim()) {
      newErrors.storeName = "Store name is required";
    }

    setErrors(newErrors);

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate();

    if (Object.keys(newErrors).length > 0) {
      toast({
        description: "Please correct the errors in the form before submitting.",
        title: "Validation Error",
        type: "error",
      });

      return;
    }

    setSubmitting(true);

    try {
      if (editingEmail) {
        await dispatch(
          updateUserAction(editingEmail, {
            mobile: form.mobile || undefined,
            name: form.name,
            password: form.password || undefined,
            role: form.role,
            storeName:
              form.role === "store" ? form.storeName || undefined : undefined,
          }),
        );
        toast({
          description: `${form.name} has been saved.`,
          title: "User Updated",
          type: "success",
        });
      } else {
        await dispatch(
          createUserAction({
            email: form.email,
            mobile: form.mobile || undefined,
            name: form.name,
            password: form.password,
            role: form.role,
            storeName:
              form.role === "store" ? form.storeName || undefined : undefined,
          }),
        );
        toast({
          description: `${form.name} has been added.`,
          title: "User Created",
          type: "success",
        });
      }

      closeForm();
    } catch (e) {
      const err = e as Error;
      toast({
        description: err.message,
        title: editingEmail ? "Failed to Update User" : "Failed to Create User",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (
    email: string,
    currentStatus: "active" | "inactive",
  ) => {
    const nextStatus = currentStatus === "active" ? "inactive" : "active";

    try {
      await dispatch(toggleUserStatusAction(email, nextStatus));
    } catch (e) {
      const err = e as Error;
      toast({
        description: err.message,
        title: "Failed to Update Status",
        type: "error",
      });
    }
  };

  const handleDelete = async (u: ManagedUser) => {
    if (!window.confirm(`Delete ${u.name || u.email}? This cannot be undone.`))
      {return;}

    try {
      await dispatch(deleteUserAction(u.email));
      toast({
        description: `${u.name || u.email} has been removed.`,
        title: "User Deleted",
        type: "success",
      });

      if (editingEmail === u.email) {closeForm();}
    } catch (e) {
      const err = e as Error;
      toast({
        description: err.message,
        title: "Failed to Delete User",
        type: "error",
      });
    }
  };

  if (activeTab === "users" && isFormOpen) {
    return (
      <AppLayout
        activeTab={activeTab}
        consoleLabel="Admin Console"
        setActiveTab={setActiveTab}
      >
        <main className="flex-1 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 w-full max-w-[1400px] mx-auto">
          <div>
            <Button
              className="gap-2 rounded-xl border-border text-foreground hover:bg-accent cursor-pointer transition-all active:scale-95"
              onClick={closeForm}
              variant="outline"
            >
              <ArrowLeft size={16} />
              <span>Back to User Directory</span>
            </Button>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {editingEmail ? "Edit User Account" : "Create New User Account"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {editingEmail
                ? `Update details and credentials for ${form.email}.`
                : "Fill in the information below to create a new user account with system role permissions."}
            </p>
          </div>

          <Card className="shadow-md border-border bg-card rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/30 px-4 sm:px-6 py-4">
              <CardTitle className="text-base font-bold text-foreground">
                User Credentials & Profile
              </CardTitle>
              <CardDescription className="text-xs">
                All fields marked with{" "}
                <span className="text-rose-500 font-bold">*</span> are required.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <form className="space-y-6" noValidate onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      className={cn(
                        "h-11 rounded-xl bg-background border-border",
                        errors.name &&
                          "border-rose-500 focus-visible:ring-rose-500",
                      )}
                      onChange={(e) => {
                        setForm({ ...form, name: e.target.value });

                        if (errors.name)
                          {setErrors((prev) => {
                            const next = { ...prev };
                            delete next.name;

                            return next;
                          });}
                      }}
                      placeholder="e.g. John Doe"
                      value={form.name}
                    />
                    {errors.name && (
                      <p className="text-rose-500 text-[11px] font-semibold">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      className={cn(
                        "h-11 rounded-xl bg-background border-border",
                        errors.email &&
                          "border-rose-500 focus-visible:ring-rose-500",
                      )}
                      disabled={!!editingEmail}
                      onChange={(e) => {
                        setForm({ ...form, email: e.target.value });

                        if (errors.email)
                          {setErrors((prev) => {
                            const next = { ...prev };
                            delete next.email;

                            return next;
                          });}
                      }}
                      placeholder="e.g. user@example.com"
                      type="email"
                      value={form.email}
                    />
                    {errors.email && (
                      <p className="text-rose-500 text-[11px] font-semibold">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Password{" "}
                      {!editingEmail && (
                        <span className="text-rose-500">*</span>
                      )}
                    </label>
                    <div className="relative">
                      <Input
                        className={cn(
                          "h-11 rounded-xl bg-background border-border pr-10",
                          errors.password &&
                            "border-rose-500 focus-visible:ring-rose-500",
                        )}
                        onChange={(e) => {
                          setForm({ ...form, password: e.target.value });

                          if (errors.password)
                            {setErrors((prev) => {
                              const next = { ...prev };
                              delete next.password;

                              return next;
                            });}
                        }}
                        placeholder={
                          editingEmail
                            ? "New password (leave blank to keep current)"
                            : "Password (min 6 characters)"
                        }
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                      />
                      <button
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        onClick={() => setShowPassword(!showPassword)}
                        type="button"
                      >
                        {showPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-rose-500 text-[11px] font-semibold">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                      User Role <span className="text-rose-500">*</span>
                    </label>
                    <Select
                      disabled={!!editingEmail}
                      onChange={(e) => {
                        const nextRole = e.target.value as UserRole;
                        setForm((prev) => {
                          const next = { ...prev, role: nextRole };

                          if (nextRole !== "store") {
                            next.storeName = "";
                          }

                          return next;
                        });

                        if (errors.storeName)
                          {setErrors((prev) => {
                            const next = { ...prev };
                            delete next.storeName;

                            return next;
                          });}
                      }}
                      options={ROLE_OPTIONS}
                      value={form.role}
                    />
                    {editingEmail && (
                      <p className="text-[11px] text-muted-foreground font-medium italic">
                        User role cannot be changed once created.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Mobile Number
                    </label>
                    <Input
                      className={cn(
                        "h-11 rounded-xl bg-background border-border",
                        errors.mobile &&
                          "border-rose-500 focus-visible:ring-rose-500",
                      )}
                      onChange={(e) => {
                        const val = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 10);
                        setForm({ ...form, mobile: val });

                        if (errors.mobile)
                          {setErrors((prev) => {
                            const next = { ...prev };
                            delete next.mobile;

                            return next;
                          });}
                      }}
                      placeholder="10-digit mobile number (optional)"
                      value={form.mobile}
                    />
                    {errors.mobile && (
                      <p className="text-rose-500 text-[11px] font-semibold">
                        {errors.mobile}
                      </p>
                    )}
                  </div>

                  {form.role === "store" && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Store Name <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        className={cn(
                          "h-11 rounded-xl bg-background border-border",
                          errors.storeName &&
                            "border-rose-500 focus-visible:ring-rose-500",
                        )}
                        onChange={(e) => {
                          setForm({ ...form, storeName: e.target.value });

                          if (errors.storeName)
                            {setErrors((prev) => {
                              const next = { ...prev };
                              delete next.storeName;

                              return next;
                            });}
                        }}
                        placeholder="e.g. Apollo Store #104"
                        value={form.storeName}
                      />
                      {errors.storeName && (
                        <p className="text-rose-500 text-[11px] font-semibold">
                          {errors.storeName}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
                  <Button
                    className="h-10 px-5 rounded-[50px] font-semibold border-border cursor-pointer transition-all active:scale-95"
                    onClick={closeForm}
                    type="button"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="h-10 px-6 rounded-[50px] font-bold bg-[#1a2b6e] hover:bg-[#152260] dark:bg-blue-700 dark:hover:bg-blue-800 text-white shadow-sm cursor-pointer transition-all active:scale-98"
                    disabled={submitting}
                    type="submit"
                  >
                    {submitting
                      ? "Saving..."
                      : editingEmail
                        ? "Save Changes"
                        : "Create User"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      activeTab={activeTab}
      consoleLabel="Admin Console"
      setActiveTab={setActiveTab}
    >
      <main className="flex-1 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 w-full max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground">
              {activeTab === "customers"
                ? "Customer Directory"
                : activeTab === "users"
                  ? "User Directory"
                  : "System Audit Logs"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {activeTab === "customers"
                ? "Search and view registered customer transactions"
                : activeTab === "users"
                  ? "Search, filter, and manage system access"
                  : "Track all activity across Store, Optom, and Admin roles"}
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground tracking-wider self-end sm:self-auto">
            <span>SYNCED LIVE</span>
            <button
              className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-800 shadow-sm cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSyncing}
              onClick={handleResetSync}
              title="Force Sync Live"
            >
              <RefreshCw
                className={isSyncing ? "animate-spin" : ""}
                size={12}
              />
            </button>
          </div>
        </div>

        <StatsGrid customers={dateFilteredCustomers} />

        {activeTab === "users" ? (
          <>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="w-full sm:max-w-xl flex flex-wrap sm:flex-nowrap items-center gap-2">
                <Input
                  className="bg-card border-border flex-1 min-w-[200px]"
                  icon={Search}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by User ID, name, email, role, mobile, or store..."
                  type="text"
                  value={searchTerm}
                />
                <DateFilter onChange={setDateRange} value={dateRange} />
                <ColumnVisibilityDropdown
                  columns={USER_TABLE_COLUMNS}
                  onResetColumns={() => setVisibleUserCols(DEFAULT_USER_COLUMNS)}
                  onToggleColumn={handleToggleUserCol}
                  visibleColumns={visibleUserCols}
                />
              </div>
              <Button
                className="rounded-[50px] gap-2 h-10 bg-[#1a2b6e] hover:bg-[#152260] dark:bg-blue-700 dark:hover:bg-blue-800 text-white font-bold text-xs px-5 w-full sm:w-auto shadow-sm transition-all active:scale-98 cursor-pointer shrink-0"
                onClick={handleAddNewClick}
              >
                <UserPlus size={16} />
                <span>Add User</span>
              </Button>
            </div>

            <div className="flex flex-col xl:flex-row gap-6 items-start">
              <div className="flex-1 min-w-0 w-full bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto w-full [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {visibleUserCols.includes("userId") && (
                          <TableHead className="w-[120px] font-bold text-xs uppercase text-muted-foreground whitespace-nowrap">
                            User ID
                          </TableHead>
                        )}
                        {visibleUserCols.includes("name") && (
                          <TableHead className="font-bold text-xs uppercase text-muted-foreground whitespace-nowrap">
                            User Name
                          </TableHead>
                        )}
                        {visibleUserCols.includes("email") && (
                          <TableHead className="font-bold text-xs uppercase text-muted-foreground whitespace-nowrap">
                            Email
                          </TableHead>
                        )}
                        {visibleUserCols.includes("role") && (
                          <TableHead className="font-bold text-xs uppercase text-muted-foreground whitespace-nowrap">
                            Role
                          </TableHead>
                        )}
                        {visibleUserCols.includes("mobile") && (
                          <TableHead className="font-bold text-xs uppercase text-muted-foreground whitespace-nowrap">
                            Mobile
                          </TableHead>
                        )}
                        {visibleUserCols.includes("lastLogin") && (
                          <TableHead className="font-bold text-xs uppercase text-muted-foreground whitespace-nowrap">
                            Last Login
                          </TableHead>
                        )}
                        {visibleUserCols.includes("status") && (
                          <TableHead className="font-bold text-xs uppercase text-muted-foreground whitespace-nowrap">
                            Status
                          </TableHead>
                        )}
                        {visibleUserCols.includes("actions") && (
                          <TableHead className="font-bold text-xs uppercase text-muted-foreground text-right pr-4 whitespace-nowrap">
                            Actions
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedUsers.length === 0 ? (
                        <TableRow>
                          <TableCell
                            className="text-center py-8 text-muted-foreground"
                            colSpan={visibleUserCols.length}
                          >
                            No users found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedUsers.map((u) => (
                          <TableRow key={u.email}>
                            {visibleUserCols.includes("userId") && (
                              <TableCell className="font-mono font-bold text-xs whitespace-nowrap">
                                <span
                                  className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-mono font-extrabold border",
                                    u.role === "admin"
                                      ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                      : u.role === "optom"
                                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
                                  )}
                                >
                                  {getRoleBasedUserId(u, users)}
                                </span>
                              </TableCell>
                            )}
                            {visibleUserCols.includes("name") && (
                              <TableCell className="font-semibold text-foreground whitespace-nowrap">
                                {u.name}
                              </TableCell>
                            )}
                            {visibleUserCols.includes("email") && (
                              <TableCell className="text-muted-foreground whitespace-nowrap">
                                {u.email}
                              </TableCell>
                            )}
                            {visibleUserCols.includes("role") && (
                              <TableCell className="whitespace-nowrap">
                                <Badge variant={u.role}>
                                  {u.role.toUpperCase()}
                                </Badge>
                              </TableCell>
                            )}
                            {visibleUserCols.includes("mobile") && (
                              <TableCell className="text-muted-foreground whitespace-nowrap">
                                {u.mobile || "—"}
                              </TableCell>
                            )}
                            {visibleUserCols.includes("lastLogin") && (
                              <TableCell className="text-[#64748b] dark:text-zinc-400 whitespace-nowrap">
                                {u.lastLogin
                                  ? new Date(u.lastLogin).toLocaleString()
                                  : "Never"}
                              </TableCell>
                            )}
                            {visibleUserCols.includes("status") && (
                              <TableCell className="whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={u.status === "active"}
                                    onCheckedChange={() =>
                                      handleToggleStatus(u.email, u.status)
                                    }
                                  />
                                  <Badge variant={u.status}>
                                    {u.status.toUpperCase()}
                                  </Badge>
                                </div>
                              </TableCell>
                            )}
                            {visibleUserCols.includes("actions") && (
                              <TableCell className="text-right pr-4 whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    onClick={() => handleEditClick(u)}
                                    size="icon"
                                    title="Edit user"
                                    variant="ghost"
                                  >
                                    <Pencil size={14} />
                                  </Button>
                                  <Button
                                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950"
                                    disabled={currentUser?.email === u.email}
                                    onClick={() => handleDelete(u)}
                                    size="icon"
                                    title={
                                      currentUser?.email === u.email
                                        ? "You can't delete your own account"
                                        : "Delete user"
                                    }
                                    variant="ghost"
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <PaginationBar
                  currentPage={userCurrentPage}
                  itemsPerPage={userPageSize}
                  onItemsPerPageChange={(size) => {
                    setUserPageSize(size);
                    userResetPage();
                  }}
                  onNext={userNextPage}
                  onPrev={userPrevPage}
                  totalItems={userTotalItems}
                  totalPages={userTotalPages}
                />
              </div>
            </div>
          </>
        ) : activeTab === "customers" ? (
          <>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="w-full sm:max-w-xl flex flex-wrap sm:flex-nowrap items-center gap-2">
                <Input
                  className="bg-card border-border flex-1 min-w-[200px]"
                  icon={Search}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search patients by name, ID or mobile..."
                  type="text"
                  value={searchTerm}
                />
                <DateFilter onChange={setDateRange} value={dateRange} />
                <ColumnVisibilityDropdown
                  columns={CUSTOMER_TABLE_COLUMNS}
                  onResetColumns={() => setVisibleCustomerCols(DEFAULT_CUSTOMER_COLUMNS)}
                  onToggleColumn={handleToggleCustomerCol}
                  visibleColumns={visibleCustomerCols}
                />
              </div>
              <Button
                className="h-10 px-5 rounded-[50px] bg-[#1a2b6e] hover:bg-[#152260] dark:bg-blue-700 dark:hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm border-0 cursor-pointer transition-all active:scale-98 w-full sm:w-auto justify-center shrink-0"
                onClick={() => exportAllCustomersReport(filteredCustomers)}
                title="Download full Excel report for all patients"
              >
                <Download size={14} />
                <span>Export All Excel Reports</span>
              </Button>
            </div>

            {/* Status Tabs for Customer Directory */}
            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl self-start overflow-x-auto max-w-full [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                  customerStatusTab === "all"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => {
                  setCustomerStatusTab("all");
                  customerResetPage();
                }}
                type="button"
              >
                <span>All</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted text-muted-foreground font-semibold">
                  {customerTabCounts.all}
                </span>
              </button>
              <button
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                  customerStatusTab === "Pending"
                    ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 shadow-sm border border-slate-300 dark:border-slate-700"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => {
                  setCustomerStatusTab("Pending");
                  customerResetPage();
                }}
                type="button"
              >
                <span>Pending</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted text-muted-foreground font-semibold">
                  {customerTabCounts.pending}
                </span>
              </button>
              <button
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                  customerStatusTab === "InProgress"
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 shadow-sm border border-indigo-200 dark:border-indigo-800"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => {
                  setCustomerStatusTab("InProgress");
                  customerResetPage();
                }}
                type="button"
              >
                <span>In Progress</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 font-semibold">
                  {customerTabCounts.inProgress}
                </span>
              </button>
              <button
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                  customerStatusTab === "Completed"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-sm border border-emerald-200 dark:border-emerald-800"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => {
                  setCustomerStatusTab("Completed");
                  customerResetPage();
                }}
                type="button"
              >
                <span>Completed</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 font-semibold">
                  {customerTabCounts.completed}
                </span>
              </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
              <div className="flex-1 min-w-0 w-full bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto w-full [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {visibleCustomerCols.includes("id") && (
                          <TableHead className="w-[80px] font-bold text-xs uppercase text-muted-foreground whitespace-nowrap">
                            ID
                          </TableHead>
                        )}
                        {visibleCustomerCols.includes("name") && (
                          <TableHead className="font-bold text-xs uppercase text-muted-foreground whitespace-nowrap">
                            Patient Name
                          </TableHead>
                        )}
                        {visibleCustomerCols.includes("storeName") && (
                          <TableHead className="font-bold text-xs uppercase text-muted-foreground whitespace-nowrap">
                            Store Name
                          </TableHead>
                        )}
                        {visibleCustomerCols.includes("timeStarted") && (
                          <TableHead className="font-bold text-xs uppercase text-muted-foreground whitespace-nowrap">
                            Time Started
                          </TableHead>
                        )}
                        {visibleCustomerCols.includes("callDuration") && (
                          <TableHead className="font-bold text-xs uppercase text-muted-foreground whitespace-nowrap">
                            Call Duration
                          </TableHead>
                        )}
                        {visibleCustomerCols.includes("ageGender") && (
                          <TableHead className="font-bold text-xs uppercase text-muted-foreground whitespace-nowrap">
                            Age / Gender
                          </TableHead>
                        )}
                        {visibleCustomerCols.includes("mobile") && (
                          <TableHead className="font-bold text-xs uppercase text-muted-foreground whitespace-nowrap">
                            Mobile
                          </TableHead>
                        )}
                        {visibleCustomerCols.includes("status") && (
                          <TableHead className="font-bold text-xs uppercase text-muted-foreground whitespace-nowrap">
                            Status
                          </TableHead>
                        )}
                        {visibleCustomerCols.includes("lastUpdated") && (
                          <TableHead className="font-bold text-xs uppercase text-muted-foreground whitespace-nowrap">
                            Last Updated
                          </TableHead>
                        )}
                        {visibleCustomerCols.includes("report") && (
                          <TableHead className="font-bold text-xs uppercase text-muted-foreground text-center whitespace-nowrap">
                            Report
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCustomers.length === 0 ? (
                        <TableRow>
                          <TableCell
                            className="text-center py-8 text-muted-foreground"
                            colSpan={visibleCustomerCols.length}
                          >
                            No customers found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedCustomers.map((cust) => (
                          <TableRow key={cust.id}>
                            {visibleCustomerCols.includes("id") && (
                              <TableCell className="font-semibold text-blue-600 dark:text-blue-400 text-xs py-3 whitespace-nowrap">
                                {cust.id}
                              </TableCell>
                            )}
                            {visibleCustomerCols.includes("name") && (
                              <TableCell className="font-semibold text-foreground text-xs py-3 whitespace-nowrap">
                                {cust.name}
                              </TableCell>
                            )}
                            {visibleCustomerCols.includes("storeName") && (
                              <TableCell className="text-muted-foreground text-xs py-3 whitespace-nowrap">
                                {cust.storeName || "—"}
                              </TableCell>
                            )}
                            {visibleCustomerCols.includes("timeStarted") && (
                              <TableCell className="text-muted-foreground text-xs py-3 whitespace-nowrap">
                                {renderTimeStarted(cust)}
                              </TableCell>
                            )}
                            {visibleCustomerCols.includes("callDuration") && (
                              <TableCell className="text-muted-foreground text-xs py-3 whitespace-nowrap">
                                {renderCallDuration(cust)}
                              </TableCell>
                            )}
                            {visibleCustomerCols.includes("ageGender") && (
                              <TableCell className="text-muted-foreground text-xs py-3 whitespace-nowrap">
                                {cust.age} / {cust.gender}
                              </TableCell>
                            )}
                            {visibleCustomerCols.includes("mobile") && (
                              <TableCell className="text-muted-foreground text-xs py-3 whitespace-nowrap">
                                {cust.mobile || "—"}
                              </TableCell>
                            )}
                            {visibleCustomerCols.includes("status") && (
                              <TableCell className="py-3 whitespace-nowrap">
                                <Badge variant={cust.status}>
                                  {cust.status.toUpperCase()}
                                </Badge>
                              </TableCell>
                            )}
                            {visibleCustomerCols.includes("lastUpdated") && (
                              <TableCell className="text-muted-foreground text-xs py-3 whitespace-nowrap">
                                {cust.lastUpdatedOn || "—"}
                              </TableCell>
                            )}
                            {visibleCustomerCols.includes("report") && (
                              <TableCell className="py-3 text-center whitespace-nowrap">
                                <Button
                                  className="h-7 px-2.5 text-[11px] font-bold gap-1 text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50 border-blue-200 dark:border-blue-800 rounded-[50px] cursor-pointer transition-all active:scale-95"
                                  onClick={() => exportSingleCustomerReport(cust)}
                                  size="sm"
                                  title={`Download ${cust.name} Excel Report`}
                                  variant="outline"
                                >
                                  <Download size={12} />
                                  <span>Export</span>
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <PaginationBar
                  currentPage={customerCurrentPage}
                  itemsPerPage={customerPageSize}
                  onItemsPerPageChange={(size) => {
                    setCustomerPageSize(size);
                    customerResetPage();
                  }}
                  onNext={customerNextPage}
                  onPrev={customerPrevPage}
                  totalItems={customerTotalItems}
                  totalPages={customerTotalPages}
                />
              </div>

              <OptomUsersPanel />
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="w-full sm:max-w-xl flex flex-wrap sm:flex-nowrap items-center gap-2">
                <Input
                  className="bg-card border-border flex-1 min-w-[200px]"
                  icon={Search}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search logs by patient name, ID, status, or actor..."
                  type="text"
                  value={searchTerm}
                />
                <DateFilter onChange={setDateRange} value={dateRange} />
                <ColumnVisibilityDropdown
                  columns={AUDIT_LOG_TABLE_COLUMNS}
                  onResetColumns={() => setVisibleAuditCols(DEFAULT_AUDIT_LOG_COLUMNS)}
                  onToggleColumn={handleToggleAuditCol}
                  visibleColumns={visibleAuditCols}
                />
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
              <div className="overflow-x-auto w-full [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {visibleAuditCols.includes("id") && (
                        <TableHead className="w-[110px] font-bold text-xs uppercase text-muted-foreground whitespace-nowrap">
                          Log ID
                        </TableHead>
                      )}
                      {visibleAuditCols.includes("timestamp") && (
                        <TableHead className="font-bold text-xs uppercase text-muted-foreground whitespace-nowrap">
                          Timestamp
                        </TableHead>
                      )}
                      {visibleAuditCols.includes("customerName") && (
                        <TableHead className="font-bold text-xs uppercase text-muted-foreground whitespace-nowrap">
                          Patient Name
                        </TableHead>
                      )}
                      {visibleAuditCols.includes("customerId") && (
                        <TableHead className="font-bold text-xs uppercase text-muted-foreground whitespace-nowrap">
                          Patient ID
                        </TableHead>
                      )}
                      {visibleAuditCols.includes("storeName") && (
                        <TableHead className="font-bold text-xs uppercase text-muted-foreground whitespace-nowrap">
                          Store Name
                        </TableHead>
                      )}
                      {visibleAuditCols.includes("timeStarted") && (
                        <TableHead className="font-bold text-xs uppercase text-muted-foreground whitespace-nowrap">
                          Time Started
                        </TableHead>
                      )}
                      {visibleAuditCols.includes("callDuration") && (
                        <TableHead className="font-bold text-xs uppercase text-muted-foreground whitespace-nowrap">
                          Call Duration
                        </TableHead>
                      )}
                      {visibleAuditCols.includes("status") && (
                        <TableHead className="font-bold text-xs uppercase text-muted-foreground whitespace-nowrap">
                          Status
                        </TableHead>
                      )}
                      {visibleAuditCols.includes("performedBy") && (
                        <TableHead className="font-bold text-xs uppercase text-muted-foreground whitespace-nowrap">
                          Performed By
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAuditLogs.length === 0 ? (
                      <TableRow>
                        <TableCell
                          className="text-center py-8 text-muted-foreground"
                          colSpan={visibleAuditCols.length}
                        >
                          {isLoadingLogs
                            ? "Loading audit logs..."
                            : "No audit logs found."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedAuditLogs.map((log) => (
                        <TableRow key={log.id}>
                          {visibleAuditCols.includes("id") && (
                            <TableCell className="font-mono font-bold text-xs py-3 whitespace-nowrap">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-mono font-extrabold border",
                                  log.role === "admin" ||
                                    String(log.id).startsWith("ADM")
                                    ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                    : log.role === "optom" ||
                                        String(log.id).startsWith("OPT")
                                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                      : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
                                )}
                              >
                                {log.id}
                              </span>
                            </TableCell>
                          )}
                          {visibleAuditCols.includes("timestamp") && (
                            <TableCell className="text-xs py-3 font-medium text-foreground whitespace-nowrap">
                              {log.lastUpdatedOn || "—"}
                            </TableCell>
                          )}
                          {visibleAuditCols.includes("customerName") && (
                            <TableCell className="text-xs py-3 font-semibold text-foreground whitespace-nowrap">
                              {log.customerName || "N/A"}
                            </TableCell>
                          )}
                          {visibleAuditCols.includes("customerId") && (
                            <TableCell className="text-xs py-3 font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                              {log.customerId}
                            </TableCell>
                          )}
                          {visibleAuditCols.includes("storeName") && (
                            <TableCell className="text-muted-foreground text-xs py-3 whitespace-nowrap">
                              {log.storeName || "—"}
                            </TableCell>
                          )}
                          {visibleAuditCols.includes("timeStarted") && (
                            <TableCell className="text-muted-foreground text-xs py-3 whitespace-nowrap">
                              {renderTimeStarted(log as any)}
                            </TableCell>
                          )}
                          {visibleAuditCols.includes("callDuration") && (
                            <TableCell className="text-muted-foreground text-xs py-3 whitespace-nowrap">
                              {formatSeconds(log.callDuration || 0)}
                            </TableCell>
                          )}
                          {visibleAuditCols.includes("status") && (
                            <TableCell className="py-3 whitespace-nowrap">
                              <Badge
                                className="whitespace-nowrap"
                                variant={log.status as any}
                              >
                                {log.status?.replace("_", " ") || "UPDATED"}
                              </Badge>
                            </TableCell>
                          )}
                          {visibleAuditCols.includes("performedBy") && (
                            <TableCell className="text-xs py-3 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground text-xs truncate">
                                  {log.callTakenBy || "System / Store"}
                                </span>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <PaginationBar
                currentPage={auditLogCurrentPage}
                itemsPerPage={auditLogPageSize}
                onItemsPerPageChange={(size) => {
                  setAuditLogPageSize(size);
                  auditLogResetPage();
                }}
                onNext={auditLogNextPage}
                onPrev={auditLogPrevPage}
                totalItems={auditLogTotalItems}
                totalPages={auditLogTotalPages}
              />
            </div>
          </>
        )}
      </main>
    </AppLayout>
  );
}
