import * as React from 'react';
import { Search, UserPlus, X, Pencil, Trash2, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Select } from '../../components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { useToast } from '../../components/ui/toast';
import { AppLayout } from '../../components/layout/AppLayout';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchUsersAction,
  createUserAction,
  updateUserAction,
  deleteUserAction,
  toggleUserStatusAction,
} from '../../Actions/userActions';
import { fetchCustomersAction } from '../../Actions/customerActions';
import { usePagination } from '../../hooks/usePagination';
import { PaginationBar } from '../../components/shared/PaginationBar';
import { cn } from '../../lib/utils';
import { NAME_REGEX, EMAIL_REGEX, MOBILE_REGEX, PASSWORD_REGEX } from '../../options/Option';
import { apiClient } from '../../Util/apiClient';
import type { ManagedUser, UserRole, AuditLog } from '../../types';

const ROLE_OPTIONS = [
  { value: 'store', label: 'Store' },
  { value: 'optum', label: 'Optum' },
  { value: 'admin', label: 'Admin' },
];

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'store' as UserRole,
  mobile: '',
  storeName: '',
};

export function AdminScreen() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const users = useAppSelector((state) => state.users.users);
  const customers = useAppSelector((state) => state.customers.customers);
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = React.useState<'users' | 'customers' | 'auditLogs'>('users');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingEmail, setEditingEmail] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [submitting, setSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = React.useState(false);

  const [auditLogs, setAuditLogs] = React.useState<AuditLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);

  const [userPageSize, setUserPageSize] = React.useState<number>(10);
  const [customerPageSize, setCustomerPageSize] = React.useState<number>(10);
  const [auditLogPageSize, setAuditLogPageSize] = React.useState<number>(10);

  React.useEffect(() => {
    dispatch(fetchUsersAction());
    dispatch(fetchCustomersAction());
  }, [dispatch]);

  React.useEffect(() => {
    setSearchTerm('');
  }, [activeTab]);

  const filteredUsers = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) =>
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  const {
    paginatedItems: paginatedUsers,
    currentPage: userCurrentPage,
    totalPages: userTotalPages,
    totalItems: userTotalItems,
    nextPage: userNextPage,
    prevPage: userPrevPage,
    resetPage: userResetPage,
  } = usePagination(filteredUsers, userPageSize);

  React.useEffect(() => {
    userResetPage();
  }, [searchTerm, userResetPage]);

  const filteredCustomers = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((c) =>
      c.name.toLowerCase().includes(term) ||
      c.id.toLowerCase().includes(term) ||
      c.mobile.includes(term) ||
      (c.storeName && c.storeName.toLowerCase().includes(term))
    );
  }, [customers, searchTerm]);

  const {
    paginatedItems: paginatedCustomers,
    currentPage: customerCurrentPage,
    totalPages: customerTotalPages,
    totalItems: customerTotalItems,
    nextPage: customerNextPage,
    prevPage: customerPrevPage,
    resetPage: customerResetPage,
  } = usePagination(filteredCustomers, customerPageSize);

  const fetchAuditLogs = React.useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const res = await apiClient.get<AuditLog[]>('/customers/audit-logs');
      setAuditLogs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast({ title: 'Failed to fetch audit logs', description: (err as Error).message, type: 'error' });
    } finally {
      setIsLoadingLogs(false);
    }
  }, [toast]);

  const handleResetSync = React.useCallback(async () => {
    setIsSyncing(true);
    setSearchTerm('');
    try {
      if (activeTab === 'users') {
        await dispatch(fetchUsersAction());
      } else if (activeTab === 'customers') {
        await dispatch(fetchCustomersAction());
      } else if (activeTab === 'auditLogs') {
        await fetchAuditLogs();
      }
      toast({
        title: 'Feed Synced',
        description: 'Data feed has been successfully updated.',
        type: 'success',
      });
    } catch (err) {
      // Handled in action
    } finally {
      setIsSyncing(false);
    }
  }, [activeTab, dispatch, fetchAuditLogs, toast]);

  React.useEffect(() => {
    if (activeTab === 'auditLogs') {
      fetchAuditLogs();
    }

    const handleSseEvent = () => {
      if (activeTab === 'auditLogs') {
        fetchAuditLogs();
      }
    };
    window.addEventListener('titan:sse_event', handleSseEvent);
    return () => window.removeEventListener('titan:sse_event', handleSseEvent);
  }, [activeTab, fetchAuditLogs]);

  const filteredAuditLogs = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return auditLogs;
    return auditLogs.filter((log) =>
      (log.customerId && log.customerId.toLowerCase().includes(term)) ||
      (log.customerName && log.customerName.toLowerCase().includes(term)) ||
      (log.storeName && log.storeName.toLowerCase().includes(term)) ||
      (log.status && log.status.toLowerCase().includes(term)) ||
      (log.callTakenBy && log.callTakenBy.toLowerCase().includes(term))
    );
  }, [auditLogs, searchTerm]);

  const {
    paginatedItems: paginatedAuditLogs,
    currentPage: auditLogCurrentPage,
    totalPages: auditLogTotalPages,
    totalItems: auditLogTotalItems,
    nextPage: auditLogNextPage,
    prevPage: auditLogPrevPage,
    resetPage: auditLogResetPage,
  } = usePagination(filteredAuditLogs, auditLogPageSize);

  React.useEffect(() => {
    if (activeTab === 'auditLogs') {
      auditLogResetPage();
    }
  }, [searchTerm, activeTab, auditLogResetPage]);

  React.useEffect(() => {
    customerResetPage();
  }, [searchTerm, customerResetPage]);

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
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      mobile: u.mobile || '',
      storeName: u.storeName || '',
    });
    setErrors({});
    setShowPassword(false);
    setIsFormOpen(true);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (!NAME_REGEX.test(form.name.trim())) {
      newErrors.name = 'Name must be between 3 and 50 characters and contain only letters and spaces';
    }

    if (!editingEmail) {
      if (!form.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!EMAIL_REGEX.test(form.email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (!editingEmail) {
      if (!form.password) {
        newErrors.password = 'Password is required';
      } else if (!PASSWORD_REGEX.test(form.password)) {
        newErrors.password = 'Password must be between 6 and 50 characters';
      }
    } else {
      if (form.password && !PASSWORD_REGEX.test(form.password)) {
        newErrors.password = 'Password must be between 6 and 50 characters';
      }
    }

    if (form.mobile && !MOBILE_REGEX.test(form.mobile.trim())) {
      newErrors.mobile = 'Mobile number must be a valid 10-digit number (starting with 6-9)';
    }

    if (form.role === 'store' && !form.storeName.trim()) {
      newErrors.storeName = 'Store name is required';
    }

    setErrors(newErrors);
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      toast({ title: 'Validation Error', description: 'Please correct the errors in the form before submitting.', type: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      if (editingEmail) {
        await dispatch(updateUserAction(editingEmail, {
          name: form.name,
          password: form.password || undefined,
          role: form.role,
          mobile: form.mobile || undefined,
          storeName: form.role === 'store' ? form.storeName || undefined : undefined,
        }));
        toast({ title: 'User Updated', description: `${form.name} has been saved.`, type: 'success' });
      } else {
        await dispatch(createUserAction({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          mobile: form.mobile || undefined,
          storeName: form.role === 'store' ? form.storeName || undefined : undefined,
        }));
        toast({ title: 'User Created', description: `${form.name} has been added.`, type: 'success' });
      }
      closeForm();
    } catch (e) {
      const err = e as Error;
      toast({ title: editingEmail ? 'Failed to Update User' : 'Failed to Create User', description: err.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (email: string, currentStatus: 'active' | 'inactive') => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await dispatch(toggleUserStatusAction(email, nextStatus));
    } catch (e) {
      const err = e as Error;
      toast({ title: 'Failed to Update Status', description: err.message, type: 'error' });
    }
  };

  const handleDelete = async (u: ManagedUser) => {
    if (!window.confirm(`Delete ${u.name || u.email}? This cannot be undone.`)) return;
    try {
      await dispatch(deleteUserAction(u.email));
      toast({ title: 'User Deleted', description: `${u.name || u.email} has been removed.`, type: 'success' });
      if (editingEmail === u.email) closeForm();
    } catch (e) {
      const err = e as Error;
      toast({ title: 'Failed to Delete User', description: err.message, type: 'error' });
    }
  };

  return (
    <AppLayout consoleLabel="Admin Console" activeTab={activeTab} setActiveTab={setActiveTab}>
      <main className="flex-1 px-8 py-6 space-y-6 w-full max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {activeTab === 'users' ? 'User Directory' : activeTab === 'customers' ? 'Customer Directory' : 'System Audit Logs'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {activeTab === 'users'
                ? 'Search, filter, and manage system access'
                : activeTab === 'customers'
                ? 'Search and view registered customer transactions'
                : 'Track all activity across Store, Optum, and Admin roles'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground tracking-wider">
            <span>SYNCED LIVE</span>
            <button
              onClick={handleResetSync}
              disabled={isSyncing}
              className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-800 shadow-sm cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Force Sync Live"
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {activeTab === 'users' ? (
          <>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="w-full sm:max-w-md">
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, or role..."
                  icon={Search}
                  className="bg-card border-border"
                />
              </div>
              <Button
                onClick={handleAddNewClick}
                className="rounded-xl gap-2 h-10 bg-[#1a2b6e] hover:bg-[#152260] dark:bg-blue-700 dark:hover:bg-blue-800 text-white font-bold text-xs px-5 w-full sm:w-auto shadow-sm transition-all active:scale-98"
              >
                {isFormOpen && !editingEmail ? <X size={16} /> : <UserPlus size={16} />}
                {isFormOpen && !editingEmail ? 'Cancel' : 'Add User'}
              </Button>
            </div>

            {isFormOpen && (
              <Card>
                <CardHeader>
                  <CardTitle>{editingEmail ? 'Edit User' : 'New User'}</CardTitle>
                  <CardDescription>
                    {editingEmail ? `Update details for ${form.email}.` : 'Create a store, optum, or admin account.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Input
                        placeholder="Full name"
                        value={form.name}
                        onChange={(e) => {
                          setForm({ ...form, name: e.target.value });
                          if (errors.name) setErrors((prev) => { const next = { ...prev }; delete next.name; return next; });
                        }}
                        className={cn(errors.name && 'border-red-500 focus-visible:ring-red-500')}
                      />
                      {errors.name && (
                        <p className="text-red-500 text-[10px] font-semibold">{errors.name}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Input
                        type="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={(e) => {
                          setForm({ ...form, email: e.target.value });
                          if (errors.email) setErrors((prev) => { const next = { ...prev }; delete next.email; return next; });
                        }}
                        disabled={!!editingEmail}
                        className={cn(errors.email && 'border-red-500 focus-visible:ring-red-500')}
                      />
                      {errors.email && (
                        <p className="text-red-500 text-[10px] font-semibold">{errors.email}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder={editingEmail ? 'New password (leave blank to keep current)' : 'Password (min 6 characters)'}
                          value={form.password}
                          onChange={(e) => {
                            setForm({ ...form, password: e.target.value });
                            if (errors.password) setErrors((prev) => { const next = { ...prev }; delete next.password; return next; });
                          }}
                          className={cn("pr-10", errors.password && 'border-red-500 focus-visible:ring-red-500')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="text-red-500 text-[10px] font-semibold">{errors.password}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Select
                        options={ROLE_OPTIONS}
                        value={form.role}
                        onChange={(e) => {
                          const nextRole = e.target.value as UserRole;
                          setForm((prev) => {
                            const next = { ...prev, role: nextRole };
                            if (nextRole !== 'store') {
                              next.storeName = '';
                            }
                            return next;
                          });
                          if (errors.storeName) setErrors((prev) => { const next = { ...prev }; delete next.storeName; return next; });
                        }}
                      />
                    </div>

                    <div className="space-y-1">
                      <Input
                        placeholder="Mobile number (optional)"
                        value={form.mobile}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setForm({ ...form, mobile: val });
                          if (errors.mobile) setErrors((prev) => { const next = { ...prev }; delete next.mobile; return next; });
                        }}
                        className={cn(errors.mobile && 'border-red-500 focus-visible:ring-red-500')}
                      />
                      {errors.mobile && (
                        <p className="text-red-500 text-[10px] font-semibold">{errors.mobile}</p>
                      )}
                    </div>

                    {form.role === 'store' && (
                      <div className="space-y-1">
                        <Input
                          placeholder="Store name"
                          value={form.storeName}
                          onChange={(e) => {
                            setForm({ ...form, storeName: e.target.value });
                            if (errors.storeName) setErrors((prev) => { const next = { ...prev }; delete next.storeName; return next; });
                          }}
                          className={cn(errors.storeName && 'border-red-500 focus-visible:ring-red-500')}
                        />
                        {errors.storeName && (
                          <p className="text-red-500 text-[10px] font-semibold">{errors.storeName}</p>
                        )}
                      </div>
                    )}

                    <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={closeForm}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={submitting}>
                        {submitting ? 'Saving...' : editingEmail ? 'Save Changes' : 'Create User'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px] font-bold text-xs uppercase text-muted-foreground">#</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground">User Name</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground">Email</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground">Role</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground">Mobile</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground">Last Login</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground">Status</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No users found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedUsers.map((u, idx) => (
                      <TableRow key={u.email}>
                        <TableCell className="text-muted-foreground">
                          {(userCurrentPage - 1) * userPageSize + idx + 1}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">{u.name}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={u.role}>{u.role.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{u.mobile || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={u.status === 'active'}
                              onCheckedChange={() => handleToggleStatus(u.email, u.status)}
                            />
                            <Badge variant={u.status}>{u.status.toUpperCase()}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClick(u)}
                              title="Edit user"
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(u)}
                              disabled={currentUser?.email === u.email}
                              title={currentUser?.email === u.email ? "You can't delete your own account" : 'Delete user'}
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <PaginationBar
                currentPage={userCurrentPage}
                totalPages={userTotalPages}
                totalItems={userTotalItems}
                itemsPerPage={userPageSize}
                onPrev={userPrevPage}
                onNext={userNextPage}
                onItemsPerPageChange={(size) => {
                  setUserPageSize(size);
                  userResetPage();
                }}
              />
            </div>
          </>
        ) : activeTab === 'customers' ? (
          <>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="w-full sm:max-w-md">
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search patients by name, ID or mobile..."
                  icon={Search}
                  className="bg-card border-border"
                />
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px] font-bold text-xs uppercase text-muted-foreground">ID</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground">Patient Name</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground">Age / Gender</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground">Mobile</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground">Store Name</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground">Language</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground">Status</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground">Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No customers found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCustomers.map((cust) => (
                      <TableRow key={cust.id}>
                        <TableCell className="font-semibold text-blue-600 dark:text-blue-400 text-xs py-3">{cust.id}</TableCell>
                        <TableCell className="font-semibold text-foreground text-xs py-3">{cust.name}</TableCell>
                        <TableCell className="text-muted-foreground text-xs py-3">{cust.age} / {cust.gender}</TableCell>
                        <TableCell className="text-muted-foreground text-xs py-3">{cust.mobile || '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-xs py-3">{cust.storeName || '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-xs py-3">
                          {cust.preferredLanguage}
                          {cust.preferredLanguage2 ? ` / ${cust.preferredLanguage2}` : ''}
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant={cust.status}>{cust.status.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs py-3">{cust.lastUpdatedOn || '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <PaginationBar
                currentPage={customerCurrentPage}
                totalPages={customerTotalPages}
                totalItems={customerTotalItems}
                itemsPerPage={customerPageSize}
                onPrev={customerPrevPage}
                onNext={customerNextPage}
                onItemsPerPageChange={(size) => {
                  setCustomerPageSize(size);
                  customerResetPage();
                }}
              />
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="w-full sm:max-w-md">
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search logs by patient name, ID, status, or actor..."
                  icon={Search}
                  className="bg-card border-border"
                />
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px] font-bold text-xs uppercase text-muted-foreground">Log ID</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground">Timestamp</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground">Patient ID / Name</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground">Store Name</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground">Status Transition</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground">Call Duration</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground">Activity Performed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAuditLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {isLoadingLogs ? 'Loading audit logs...' : 'No audit logs found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedAuditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-semibold text-xs py-3 text-muted-foreground">#{log.id}</TableCell>
                        <TableCell className="text-xs py-3 font-medium text-foreground">{log.lastUpdatedOn || '—'}</TableCell>
                        <TableCell className="text-xs py-3 font-semibold text-blue-600 dark:text-blue-400">
                          {log.customerId} {log.customerName && log.customerName !== 'N/A' ? `(${log.customerName})` : ''}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs py-3">{log.storeName || '—'}</TableCell>
                        <TableCell className="py-3">
                          <Badge variant={log.status}>{log.status?.toUpperCase() || 'UPDATED'}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs py-3">
                          {log.callDuration ? `${Math.floor(log.callDuration / 60)}m ${log.callDuration % 60}s` : '—'}
                        </TableCell>
                        <TableCell className="text-xs py-3 font-semibold text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {log.callTakenBy || 'Store / System'}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <PaginationBar
                currentPage={auditLogCurrentPage}
                totalPages={auditLogTotalPages}
                totalItems={auditLogTotalItems}
                itemsPerPage={auditLogPageSize}
                onPrev={auditLogPrevPage}
                onNext={auditLogNextPage}
                onItemsPerPageChange={(size) => {
                  setAuditLogPageSize(size);
                  auditLogResetPage();
                }}
              />
            </div>
          </>
        )}
      </main>
    </AppLayout>
  );
}
