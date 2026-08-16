import { Bell, Stethoscope, Store, UserPlus } from 'lucide-react';
import * as React from 'react';

import type {
  AdminTab,
  AuditLog,
  CustomerStatusTab,
  ManagedUser,
  OptometristUserRow,
  UserFormData,
} from '../../types';

import { fetchCustomersAction } from '../../Actions/customerActions';
import {
  createUserAction,
  deleteUserAction,
  fetchUsersAction,
  toggleUserStatusAction,
  updateUserAction,
} from '../../Actions/userActions';
import { AppLayout } from '../../components/layout/AppLayout';
import { MetricCard } from '../../components/shared/MetricCard';
import { Button } from '../../components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { useToast } from '../../components/ui/toast';
import { usePagination } from '../../hooks/usePagination';
import { useAppDispatch, useAppSelector } from '../../store';
import { apiClient } from '../../Util/apiClient';
import {
  type DateFilterRange,
  filterAuditLogsByDate,
  filterCustomersByDate,
  filterUsersByDate,
} from '../../utils/dateFilter';
import { AdminCard } from './components/AdminCard';
import {
  DEFAULT_AUDIT_LOG_COLUMNS,
  DEFAULT_CUSTOMER_COLUMNS,
  DEFAULT_FEEDBACK_COLUMNS,
  DEFAULT_USER_COLUMNS,
  getRoleBasedUserId,
} from './components/adminUtils';
import { UserFormDrawer } from './components/UserFormDrawer';

export function AdminScreen() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const users = useAppSelector((state) => state.users.users);
  const customers = useAppSelector((state) => state.customers.customers);
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = React.useState<AdminTab>('customers');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingEmail, setEditingEmail] = React.useState<null | string>(null);

  const [auditLogs, setAuditLogs] = React.useState<AuditLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<DateFilterRange>('all');

  const dateFilteredCustomers = React.useMemo(
    () => filterCustomersByDate(customers, dateRange),
    [customers, dateRange]
  );

  const [userPageSize, setUserPageSize] = React.useState<number>(10);
  const [customerPageSize, setCustomerPageSize] = React.useState<number>(10);
  const [feedbackPageSize, setFeedbackPageSize] = React.useState<number>(10);
  const [auditLogPageSize, setAuditLogPageSize] = React.useState<number>(10);

  const [visibleUserCols, setVisibleUserCols] = React.useState<string[]>(DEFAULT_USER_COLUMNS);
  const [visibleCustomerCols, setVisibleCustomerCols] = React.useState<string[]>(DEFAULT_CUSTOMER_COLUMNS);
  const [visibleFeedbackCols, setVisibleFeedbackCols] = React.useState<string[]>(DEFAULT_FEEDBACK_COLUMNS);
  const [visibleAuditCols, setVisibleAuditCols] = React.useState<string[]>(DEFAULT_AUDIT_LOG_COLUMNS);

  const handleToggleUserCol = (id: string) => {
    setVisibleUserCols((prev) => (prev.includes(id) ? prev.filter((col) => col !== id) : [...prev, id]));
  };

  const handleToggleCustomerCol = (id: string) => {
    setVisibleCustomerCols((prev) => (prev.includes(id) ? prev.filter((col) => col !== id) : [...prev, id]));
  };

  const handleToggleFeedbackCol = (id: string) => {
    setVisibleFeedbackCols((prev) => (prev.includes(id) ? prev.filter((col) => col !== id) : [...prev, id]));
  };

  const handleToggleAuditCol = (id: string) => {
    setVisibleAuditCols((prev) => (prev.includes(id) ? prev.filter((col) => col !== id) : [...prev, id]));
  };

  React.useEffect(() => {
    dispatch(fetchUsersAction());
    dispatch(fetchCustomersAction());
  }, [dispatch]);

  const [prevActiveTab, setPrevActiveTab] = React.useState(activeTab);

  if (activeTab !== prevActiveTab) {
    setPrevActiveTab(activeTab);
    setSearchTerm('');
  }

  const dateFilteredUsers = React.useMemo(() => filterUsersByDate(users, dateRange), [users, dateRange]);

  const filteredUsers = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return dateFilteredUsers;
    }

    return dateFilteredUsers.filter((u) => {
      const userId = getRoleBasedUserId(u, users).toLowerCase();
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const role = (u.role || '').toLowerCase();
      const mobile = (u.mobile || '').toLowerCase();
      const storeName = (u.storeName || '').toLowerCase();
      const status = (u.status || '').toLowerCase();
      const lastLoginStr = u.lastLogin ? new Date(u.lastLogin).toLocaleString().toLowerCase() : 'never';

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
  }, [searchTerm, dateRange, userPageSize, filteredUsers.length, userResetPage]);

  const [customerStatusTab, setCustomerStatusTab] = React.useState<CustomerStatusTab>('all');

  const customerTabCounts = React.useMemo(
    () => ({
      all: dateFilteredCustomers.length,
      completed: dateFilteredCustomers.filter((c) => c.status === 'Completed' || c.status === 'Closed')
        .length,
      inProgress: dateFilteredCustomers.filter((c) => c.status === 'Accepted').length,
      pending: dateFilteredCustomers.filter(
        (c) => c.status === 'Created' || c.status === 'Initiated' || c.status === 'Drop'
      ).length,
    }),
    [dateFilteredCustomers]
  );

  const filteredCustomers = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return dateFilteredCustomers.filter((c) => {
      if (
        customerStatusTab === 'Pending' &&
        !(c.status === 'Created' || c.status === 'Initiated' || c.status === 'Drop')
      ) {
        return false;
      }

      if (customerStatusTab === 'InProgress' && c.status !== 'Accepted') {
        return false;
      }

      if (customerStatusTab === 'Completed' && !(c.status === 'Completed' || c.status === 'Closed')) {
        return false;
      }

      if (!term) {
        return true;
      }

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

  const filteredFeedbackCustomers = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return dateFilteredCustomers.filter((c) => {
      const hasPatientFeedback = Boolean(c.patientFeedback && c.patientFeedback.trim());

      if (!hasPatientFeedback) {
        return false;
      }

      if (!term) {
        return true;
      }

      return (
        c.name.toLowerCase().includes(term) ||
        c.id.toLowerCase().includes(term) ||
        (c.storeName && c.storeName.toLowerCase().includes(term)) ||
        (c.storeContactEmail && c.storeContactEmail.toLowerCase().includes(term)) ||
        (c.callTakenBy && c.callTakenBy.toLowerCase().includes(term)) ||
        (c.patientFeedback && c.patientFeedback.toLowerCase().includes(term))
      );
    });
  }, [dateFilteredCustomers, searchTerm]);

  const {
    currentPage: feedbackCurrentPage,
    nextPage: feedbackNextPage,
    paginatedItems: paginatedFeedbackCustomers,
    prevPage: feedbackPrevPage,
    resetPage: feedbackResetPage,
    totalItems: feedbackTotalItems,
    totalPages: feedbackTotalPages,
  } = usePagination(filteredFeedbackCustomers, feedbackPageSize);

  const fetchAuditLogs = React.useCallback(async () => {
    setIsLoadingLogs(true);

    try {
      const res = await apiClient.get<AuditLog[]>('/customers/audit-logs');
      setAuditLogs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast({
        description: (err as Error).message,
        title: 'Failed to fetch audit logs',
        type: 'error',
      });
    } finally {
      setIsLoadingLogs(false);
    }
  }, [toast]);

  React.useEffect(() => {
    if (activeTab === 'auditLogs') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchAuditLogs();
    }

    const handleSseEvent = () => {
      if (activeTab === 'auditLogs') {
        fetchAuditLogs();
      }
    };

    window.addEventListener('titan:sse_event', handleSseEvent);

    return () => window.removeEventListener('titan:sse_event', handleSseEvent);
  }, [activeTab, fetchAuditLogs]);

  const dateFilteredAuditLogs = React.useMemo(
    () => filterAuditLogsByDate(auditLogs, dateRange),
    [auditLogs, dateRange]
  );

  const filteredAuditLogs = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return dateFilteredAuditLogs;
    }

    return dateFilteredAuditLogs.filter(
      (log) =>
        (log.customerId && log.customerId.toLowerCase().includes(term)) ||
        (log.customerName && log.customerName.toLowerCase().includes(term)) ||
        (log.storeName && log.storeName.toLowerCase().includes(term)) ||
        (log.status && log.status.toLowerCase().includes(term)) ||
        (log.callTakenBy && log.callTakenBy.toLowerCase().includes(term))
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
    if (activeTab === 'auditLogs') {
      auditLogResetPage();
    }
  }, [searchTerm, dateRange, activeTab, auditLogResetPage]);

  React.useEffect(() => {
    customerResetPage();
  }, [searchTerm, dateRange, customerResetPage]);

  const optometristUsersWithStatus = React.useMemo<OptometristUserRow[]>(
    () =>
      users
        .filter((u) => u.role === 'optometrist')
        .map((optometristUser) => {
          if (optometristUser.status === 'inactive' || !(optometristUser.isLoggedIn ?? false)) {
            return {
              ...optometristUser,
              activeCall: null,
              avail: {
                badgeClass:
                  'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400 border-slate-200 dark:border-slate-700',
                dotClass: 'bg-slate-400',
                ping: false,
                statusLabel: 'Offline',
              },
            };
          }

          const optometristNameLower = optometristUser.name.toLowerCase();
          const optometristEmailLower = optometristUser.email.toLowerCase();

          const activeCall = customers.find((c) => {
            const isCallActiveState = c.status === 'Initiated' || c.status === 'Accepted';

            if (!isCallActiveState || !c.callTakenBy) {
              return false;
            }

            const takenByLower = c.callTakenBy.toLowerCase();

            return takenByLower === optometristNameLower || takenByLower === optometristEmailLower;
          });

          if (activeCall) {
            return {
              ...optometristUser,
              activeCall,
              avail: {
                badgeClass:
                  'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
                dotClass: 'bg-amber-500',
                ping: false,
                statusLabel: `In call (${activeCall.storeName || 'Store'})`,
              },
            };
          }

          return {
            ...optometristUser,
            activeCall: null,
            avail: {
              badgeClass:
                'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
              dotClass: 'bg-emerald-500',
              ping: true,
              statusLabel: 'Available',
            },
          };
        }),
    [users, customers]
  );

  const storeUsersWithStatus = React.useMemo<OptometristUserRow[]>(
    () =>
      users
        .filter((u) => u.role === 'store')
        .map((storeUser) => {
          const isOnline = storeUser.status !== 'inactive' && (storeUser.isLoggedIn ?? false);

          return {
            ...storeUser,
            activeCall: null,
            avail: isOnline
              ? {
                  badgeClass:
                    'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
                  dotClass: 'bg-emerald-500',
                  ping: true,
                  statusLabel: 'Online',
                }
              : {
                  badgeClass:
                    'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400 border-slate-200 dark:border-slate-700',
                  dotClass: 'bg-slate-400',
                  ping: false,
                  statusLabel: 'Offline',
                },
          };
        }),
    [users]
  );

  const totalOptometrists = React.useMemo(() => users.filter((u) => u.role === 'optometrist').length, [users]);
  const totalStores = React.useMemo(() => users.filter((u) => u.role === 'store').length, [users]);

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingEmail(null);
  };

  const handleAddNewClick = () => {
    setEditingEmail(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (u: ManagedUser) => {
    setEditingEmail(u.email);
    setIsFormOpen(true);
  };

  const handleSubmitUser = async (formData: UserFormData, isEdit: boolean) => {
    if (isEdit && editingEmail) {
      await dispatch(
        updateUserAction(editingEmail, {
          city: formData.role === 'store' ? formData.city || undefined : undefined,
          languages: formData.role === 'optometrist' ? formData.languages : undefined,
          location: formData.role === 'store' ? formData.location || undefined : undefined,
          mobile: formData.role !== 'admin' ? formData.mobile || undefined : undefined,
          name: formData.role === 'optometrist' ? formData.name || undefined : undefined,
          password: formData.password || undefined,
          role: formData.role,
          storeName: formData.role === 'store' ? formData.storeName || undefined : undefined,
        })
      );
      toast({
        description: `${formData.email} has been saved.`,
        title: 'User Updated',
        type: 'success',
      });
    } else {
      await dispatch(
        createUserAction({
          city: formData.role === 'store' ? formData.city || undefined : undefined,
          email: formData.email,
          languages: formData.role === 'optometrist' ? formData.languages : undefined,
          location: formData.role === 'store' ? formData.location || undefined : undefined,
          mobile: formData.role !== 'admin' ? formData.mobile || undefined : undefined,
          name: formData.role === 'optometrist' ? formData.name || undefined : undefined,
          password: formData.password,
          role: formData.role,
          storeName: formData.role === 'store' ? formData.storeName || undefined : undefined,
        })
      );
      toast({
        description: `${formData.email} has been added.`,
        title: 'User Created',
        type: 'success',
      });
    }

    closeForm();
  };

  const handleToggleStatus = async (email: string, currentStatus: 'active' | 'inactive') => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';

    try {
      await dispatch(toggleUserStatusAction(email, nextStatus));
    } catch (e) {
      const err = e as Error;
      toast({
        description: err.message,
        title: 'Failed to Update Status',
        type: 'error',
      });
    }
  };

  const handleDeleteUser = async (u: ManagedUser) => {
    if (!window.confirm(`Delete ${u.name || u.email}? This cannot be undone.`)) {
      return;
    }

    try {
      await dispatch(deleteUserAction(u.email));
      toast({
        description: `${u.name || u.email} has been removed.`,
        title: 'User Deleted',
        type: 'success',
      });

      if (editingEmail === u.email) {
        closeForm();
      }
    } catch (e) {
      const err = e as Error;
      toast({
        description: err.message,
        title: 'Failed to Delete User',
        type: 'error',
      });
    }
  };

  return (
    <AppLayout activeTab={activeTab} consoleLabel="Admin Console" setActiveTab={setActiveTab}>
      <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-6 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-lg font-bold text-foreground sm:text-xl">
              {activeTab === 'customers'
                ? 'Customer Directory'
                : activeTab === 'users'
                  ? 'User Directory'
                  : activeTab === 'feedback'
                    ? 'Customer & Store Feedback'
                    : 'System Audit Logs'}
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {activeTab === 'customers'
                ? 'Search and view registered customer transactions'
                : activeTab === 'users'
                  ? 'Search, filter, and manage system access'
                  : activeTab === 'feedback'
                    ? 'View store action notes, optometrist assessments, and direct patient feedback'
                    : 'Track all activity across Store, Optometrist, and Admin roles'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              className="h-10 gap-2 px-4 text-xs font-medium"
              onClick={() => window.dispatchEvent(new CustomEvent('titan:open_notifications'))}
              variant="outline"
            >
              <Bell size={14} />
              View Notification
            </Button>
            {activeTab === 'users' && (
              <Button
                className="active:scale-98 h-10 gap-2 px-4 text-xs font-medium shadow-sm transition-all"
                onClick={handleAddNewClick}
                variant="gradient"
              >
                <UserPlus size={14} />
                Add User
              </Button>
            )}
          </div>
        </div>

        {/* Layout Row 1: Metrics Grid (left) + Optometrist Users Card (right) stretched to same height */}
        {activeTab === 'users' ? (
          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
            <div className="grid grid-rows-2 gap-4">
              <MetricCard
                icon={Store}
                iconGradient="from-blue-500 to-blue-800"
                label="Total Stores"
                unitPlural="Stores"
                unitSingular="Store"
                value={totalStores}
              />
              <MetricCard
                icon={Stethoscope}
                iconGradient="from-teal-500 to-teal-800"
                label="Total Optometrists"
                unitPlural="Optometrists"
                unitSingular="Optometrist"
                value={totalOptometrists}
              />
            </div>
            <AdminCard className="lg:col-span-2" data={storeUsersWithStatus} variant="store-users" />
          </div>
        ) : (
          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            <AdminCard tabCounts={customerTabCounts} variant="metrics" />
            <AdminCard data={optometristUsersWithStatus} variant="optometrist-users" />
          </div>
        )}

        {/* Layout Row 2: Selected Directory Table View */}
        {activeTab === 'users' ? (
          <AdminCard
            currentPage={userCurrentPage}
            currentUser={currentUser}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onDelete={handleDeleteUser}
            onEdit={handleEditClick}
            onNextPage={userNextPage}
            onPageSizeChange={(size) => {
              setUserPageSize(size);
              userResetPage();
            }}
            onPrevPage={userPrevPage}
            onResetColumns={() => setVisibleUserCols(DEFAULT_USER_COLUMNS)}
            onSearchChange={setSearchTerm}
            onToggleColumn={handleToggleUserCol}
            onToggleStatus={handleToggleStatus}
            pageSize={userPageSize}
            paginatedUsers={paginatedUsers}
            searchTerm={searchTerm}
            totalItems={userTotalItems}
            totalPages={userTotalPages}
            users={users}
            variant="user-management"
            visibleColumns={visibleUserCols}
          />
        ) : activeTab === 'customers' ? (
          <AdminCard
            currentPage={customerCurrentPage}
            customerStatusTab={customerStatusTab}
            dateRange={dateRange}
            filteredCustomers={filteredCustomers}
            onDateRangeChange={setDateRange}
            onNextPage={customerNextPage}
            onPageSizeChange={(size) => {
              setCustomerPageSize(size);
              customerResetPage();
            }}
            onPrevPage={customerPrevPage}
            onResetColumns={() => setVisibleCustomerCols(DEFAULT_CUSTOMER_COLUMNS)}
            onSearchChange={setSearchTerm}
            onStatusTabChange={(tab) => {
              setCustomerStatusTab(tab);
              customerResetPage();
            }}
            onToggleColumn={handleToggleCustomerCol}
            pageSize={customerPageSize}
            paginatedCustomers={paginatedCustomers}
            searchTerm={searchTerm}
            tabCounts={customerTabCounts}
            totalItems={customerTotalItems}
            totalPages={customerTotalPages}
            variant="customer-records"
            visibleColumns={visibleCustomerCols}
          />
        ) : activeTab === 'feedback' ? (
          <AdminCard
            currentPage={feedbackCurrentPage}
            dateRange={dateRange}
            filteredCustomers={filteredFeedbackCustomers}
            onDateRangeChange={setDateRange}
            onNextPage={feedbackNextPage}
            onPageSizeChange={(size) => {
              setFeedbackPageSize(size);
              feedbackResetPage();
            }}
            onPrevPage={feedbackPrevPage}
            onResetColumns={() => setVisibleFeedbackCols(DEFAULT_FEEDBACK_COLUMNS)}
            onSearchChange={setSearchTerm}
            onToggleColumn={handleToggleFeedbackCol}
            pageSize={feedbackPageSize}
            paginatedCustomers={paginatedFeedbackCustomers}
            searchTerm={searchTerm}
            totalItems={feedbackTotalItems}
            totalPages={feedbackTotalPages}
            variant="feedback"
            visibleColumns={visibleFeedbackCols}
          />
        ) : (
          <AdminCard
            currentPage={auditLogCurrentPage}
            dateRange={dateRange}
            isLoadingLogs={isLoadingLogs}
            onDateRangeChange={setDateRange}
            onNextPage={auditLogNextPage}
            onPageSizeChange={(size) => {
              setAuditLogPageSize(size);
              auditLogResetPage();
            }}
            onPrevPage={auditLogPrevPage}
            onResetColumns={() => setVisibleAuditCols(DEFAULT_AUDIT_LOG_COLUMNS)}
            onSearchChange={setSearchTerm}
            onToggleColumn={handleToggleAuditCol}
            pageSize={auditLogPageSize}
            paginatedAuditLogs={paginatedAuditLogs}
            searchTerm={searchTerm}
            totalItems={auditLogTotalItems}
            totalPages={auditLogTotalPages}
            variant="audit-logs"
            visibleColumns={visibleAuditCols}
          />
        )}
      </main>

      <Sheet
        onOpenChange={(open) => {
          if (!open) {
            closeForm();
          }
        }}
        open={isFormOpen}
      >
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{editingEmail ? 'Edit User Account' : 'Create New User Account'}</SheetTitle>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {editingEmail
                ? `Update details and credentials for ${editingEmail}.`
                : 'Fill in the information below to create a new user account with system role permissions.'}
            </p>
          </SheetHeader>
          <UserFormDrawer editingEmail={editingEmail} onSubmitUser={handleSubmitUser} />
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
