import { Stethoscope, Store, UserPlus } from 'lucide-react';
import * as React from 'react';

import type {
  AdminTab,
  AuditLog,
  CustomerStatusTab,
  ManagedUser,
  ManagedVideo,
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
import { useNotificationLog } from '../../components/ui/notificationLog';
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
import { computeOptometristAvailability, computeStoreAvailability } from '../../utils/optometristAvailability';
import { AdminCard } from './components/AdminCard';
import {
  DEFAULT_AUDIT_LOG_COLUMNS,
  DEFAULT_CUSTOMER_COLUMNS,
  DEFAULT_FEEDBACK_COLUMNS,
  DEFAULT_USER_COLUMNS,
  getRoleBasedUserId,
} from './components/adminUtils';
import { UserFormDrawer } from './components/UserFormDrawer';
import { VideoDirectoryBody } from './components/VideoDirectoryBody';
import { VideoUploadDialog } from './components/VideoUploadDialog';

export function AdminScreen() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const users = useAppSelector((state) => state.users.users);
  const customers = useAppSelector((state) => state.customers.customers);
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { addLogNotification } = useNotificationLog();

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
      completed: dateFilteredCustomers.filter(
        (c) =>
          c.status === 'Completed' ||
          c.status === 'Test Completed' ||
          c.status === 'Closed' ||
          c.status === 'Cancelled'
      ).length,
      inProgress: dateFilteredCustomers.filter(
        (c) => c.status === 'Accepted' || c.status === 'Testing'
      ).length,
      pending: dateFilteredCustomers.filter(
        (c) =>
          c.status === 'Created' ||
          c.status === 'Queued' ||
          c.status === 'Initiated' ||
          c.status === 'Drop'
      ).length,
    }),
    [dateFilteredCustomers]
  );

  const filteredCustomers = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return dateFilteredCustomers.filter((c) => {
      if (
        customerStatusTab === 'Pending' &&
        !(
          c.status === 'Created' ||
          c.status === 'Queued' ||
          c.status === 'Initiated' ||
          c.status === 'Drop'
        )
      ) {
        return false;
      }

      if (
        customerStatusTab === 'InProgress' &&
        !(c.status === 'Accepted' || c.status === 'Testing')
      ) {
        return false;
      }

      if (
        customerStatusTab === 'Completed' &&
        !(
          c.status === 'Completed' ||
          c.status === 'Test Completed' ||
          c.status === 'Closed' ||
          c.status === 'Cancelled'
        )
      ) {
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
        description: (err instanceof Error ? err : new Error(String(err))).message,
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

  const [videos, setVideos] = React.useState<ManagedVideo[]>([]);
  const [tvModeVideoId, setTvModeVideoId] = React.useState<null | number>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = React.useState(false);

  const fetchVideos = React.useCallback(async () => {
    try {
      const [videosRes, tvModeRes] = await Promise.all([
        apiClient.get<ManagedVideo[]>('/videos'),
        apiClient.get<{ video: ManagedVideo | null }>('/videos/tvmode-active'),
      ]);
      setVideos(Array.isArray(videosRes.data) ? videosRes.data : []);
      setTvModeVideoId(tvModeRes.data.video?.id ?? null);
    } catch (err) {
      toast({
        description: (err instanceof Error ? err : new Error(String(err))).message,
        title: 'Failed to fetch videos',
        type: 'error',
      });
    }
  }, [toast]);

  React.useEffect(() => {
    if (activeTab === 'videos') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchVideos();
    }
  }, [activeTab, fetchVideos]);

  const handleUploadVideoFile = async (file: File, title: string) => {
    setIsUploadingVideo(true);

    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('title', title);

      const res = await apiClient.post<ManagedVideo>('/videos', formData);
      setVideos((prev) => [res.data, ...prev]);
      setIsUploadDialogOpen(false);
      toast({ description: `${title} has been uploaded.`, title: 'Video Uploaded', type: 'success' });
    } catch (err) {
      toast({
        description: (err instanceof Error ? err : new Error(String(err))).message,
        title: 'Failed to upload video',
        type: 'error',
      });
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleDeleteVideo = async (video: ManagedVideo) => {
    if (!window.confirm(`Delete "${video.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      await apiClient.delete(`/videos/${video.id}`);
      setVideos((prev) => prev.filter((v) => v.id !== video.id));

      if (tvModeVideoId === video.id) {
        setTvModeVideoId(null);
      }

      toast({ description: `${video.title} has been removed.`, title: 'Video Deleted', type: 'success' });
    } catch (err) {
      toast({
        description: (err instanceof Error ? err : new Error(String(err))).message,
        title: 'Failed to delete video',
        type: 'error',
      });
    }
  };

  const handleSetTvModeVideo = async (video: ManagedVideo) => {
    try {
      await apiClient.put('/videos/tvmode-active', { videoId: video.id });
      setTvModeVideoId(video.id);
      toast({
        description: `${video.title} will now play in TV Mode.`,
        title: 'TV Mode Video Updated',
        type: 'success',
      });
    } catch (err) {
      toast({
        description: (err instanceof Error ? err : new Error(String(err))).message,
        title: 'Failed to set TV Mode video',
        type: 'error',
      });
    }
  };

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
    () => computeOptometristAvailability(users, customers),
    [users, customers]
  );

  const storeUsersWithStatus = React.useMemo<OptometristUserRow[]>(() => computeStoreAvailability(users), [users]);

  const totalOptometrists = React.useMemo(
    () => users.filter((u) => u.role === 'optometrist').length,
    [users]
  );
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
      const err = e instanceof Error ? e : new Error(String(e));
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
      const err = e instanceof Error ? e : new Error(String(e));
      toast({
        description: err.message,
        title: 'Failed to Delete User',
        type: 'error',
      });
    }
  };

  const availableOptometristDoctors = React.useMemo(
    () => computeOptometristAvailability(users, customers).filter((u) => u.avail.statusLabel === 'Available'),
    [users, customers]
  );
  const prevAvailableCountRef = React.useRef<number>(0);
  const isInitialFetchRef = React.useRef(true);

  React.useEffect(() => {
    const currentCount = availableOptometristDoctors.length;
    const prevCount = prevAvailableCountRef.current;

    if (isInitialFetchRef.current) {
      if (users.length > 0) {
        isInitialFetchRef.current = false;
        prevAvailableCountRef.current = currentCount;
      }

      return;
    }

    if (currentCount > 0 && prevCount === 0) {
      const names = availableOptometristDoctors.map((d) => d.name).join(', ');
      addLogNotification({
        description: `${names} ${availableOptometristDoctors.length > 1 ? 'are' : 'is'} online and available for testing.`,
        title: 'Optometrists Online',
        type: 'optometrist_available',
      });
    }

    prevAvailableCountRef.current = currentCount;
  }, [availableOptometristDoctors, addLogNotification, users.length]);

  const handleSelectCustomerFromNotification = (customerId: string) => {
    const cust = customers.find((c) => c.id === customerId);

    if (cust?.patientFeedback) {
      setActiveTab('feedback');
      setSearchTerm(cust.name || cust.id);
    } else {
      setActiveTab('customers');
      setSearchTerm(customerId);
    }
  };

  return (
    <AppLayout
      activeTab={activeTab}
      consoleLabel="Admin Console"
      onSelectCustomer={handleSelectCustomerFromNotification}
      setActiveTab={setActiveTab}
    >
      <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-6 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-semibold leading-tight text-foreground">
              {activeTab === 'customers'
                ? 'Customer Directory'
                : activeTab === 'users'
                  ? 'User Directory'
                  : activeTab === 'feedback'
                    ? 'Customer & Store Feedback'
                    : activeTab === 'videos'
                      ? 'Video Library'
                      : 'System Audit Logs'}
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm font-normal text-muted-foreground">
              {activeTab === 'customers'
                ? 'Search and view registered customer transactions'
                : activeTab === 'users'
                  ? 'Search, filter, and manage system access'
                  : activeTab === 'feedback'
                    ? 'View store action notes, optometrist assessments, and direct patient feedback'
                    : activeTab === 'videos'
                      ? 'Upload and manage videos available in the admin console'
                      : 'Track all activity across Store, Optometrist, and Admin roles'}
            </p>
          </div>
          {activeTab === 'users' && (
            <div className="flex shrink-0 items-center gap-2">
              <Button
                className="active:scale-98 h-10 gap-2 px-4 text-xs font-medium shadow-sm transition-all"
                onClick={handleAddNewClick}
                variant="gradient"
              >
                <UserPlus size={14} />
                Add User
              </Button>
            </div>
          )}
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
        ) : activeTab === 'videos' ? null : (
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
        ) : activeTab === 'videos' ? (
          <VideoDirectoryBody
            onDelete={handleDeleteVideo}
            onSetTvModeVideo={handleSetTvModeVideo}
            onUploadClick={() => setIsUploadDialogOpen(true)}
            tvModeVideoId={tvModeVideoId}
            videos={videos}
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

      <VideoUploadDialog
        isUploading={isUploadingVideo}
        onOpenChange={setIsUploadDialogOpen}
        onUploadFile={handleUploadVideoFile}
        open={isUploadDialogOpen}
      />
    </AppLayout>
  );
}
