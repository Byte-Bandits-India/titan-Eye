import * as React from 'react';

import type { AdminTab, CustomerStatusTab, ManagedVideo, OptometristUserRow } from '../../types';

import { fetchCustomersAction } from '../../Actions/customerActions';
import { fetchUsersAction } from '../../Actions/userActions';
import { AppLayout } from '../../components/layout/AppLayout';
import { useNotificationLog } from '../../components/ui/notificationLog';
import { useToast } from '../../components/ui/toast';
import { usePagination } from '../../hooks/usePagination';
import { useAppDispatch, useAppSelector } from '../../store';
import { apiClient } from '../../Util/apiClient';
import { type DateFilterRange, filterCustomersByDate } from '../../utils/dateFilter';
import { computeOptometristAvailability } from '../../utils/optometristAvailability';
import { AdminCard } from './components/AdminCard';
import { DEFAULT_CUSTOMER_COLUMNS, DEFAULT_FEEDBACK_COLUMNS } from './components/adminUtils';
import { VideoDirectoryBody } from './components/VideoDirectoryBody';
import { VideoUploadDialog } from './components/VideoUploadDialog';

export function AdminScreen() {
  const users = useAppSelector((state) => state.users.users);
  const customers = useAppSelector((state) => state.customers.customers);
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { addLogNotification } = useNotificationLog();

  const [activeTab, setActiveTab] = React.useState<AdminTab>('customers');
  const [searchTerm, setSearchTerm] = React.useState('');

  const [dateRange, setDateRange] = React.useState<DateFilterRange>('all');

  const dateFilteredCustomers = React.useMemo(
    () => filterCustomersByDate(customers, dateRange),
    [customers, dateRange]
  );

  const [customerPageSize, setCustomerPageSize] = React.useState<number>(10);
  const [feedbackPageSize, setFeedbackPageSize] = React.useState<number>(10);

  const [visibleCustomerCols, setVisibleCustomerCols] = React.useState<string[]>(DEFAULT_CUSTOMER_COLUMNS);
  const [visibleFeedbackCols, setVisibleFeedbackCols] = React.useState<string[]>(DEFAULT_FEEDBACK_COLUMNS);

  const handleToggleCustomerCol = (id: string) => {
    setVisibleCustomerCols((prev) => (prev.includes(id) ? prev.filter((col) => col !== id) : [...prev, id]));
  };

  const handleToggleFeedbackCol = (id: string) => {
    setVisibleFeedbackCols((prev) => (prev.includes(id) ? prev.filter((col) => col !== id) : [...prev, id]));
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
      inProgress: dateFilteredCustomers.filter((c) => c.status === 'Accepted' || c.status === 'Testing')
        .length,
      pending: dateFilteredCustomers.filter(
        (c) =>
          c.status === 'Created' || c.status === 'Queued' || c.status === 'Initiated' || c.status === 'Drop'
      ).length,
    }),
    [dateFilteredCustomers]
  );

  const filteredCustomers = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return dateFilteredCustomers.filter((c) => {
      if (
        customerStatusTab === 'Pending' &&
        !(c.status === 'Created' || c.status === 'Queued' || c.status === 'Initiated' || c.status === 'Drop')
      ) {
        return false;
      }

      if (customerStatusTab === 'InProgress' && !(c.status === 'Accepted' || c.status === 'Testing')) {
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

  React.useEffect(() => {
    customerResetPage();
  }, [searchTerm, dateRange, customerResetPage]);

  const optometristUsersWithStatus = React.useMemo<OptometristUserRow[]>(
    () => computeOptometristAvailability(users, customers),
    [users, customers]
  );

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
            <h1 className="text-2xl font-semibold leading-tight text-foreground sm:text-[28px]">
              {activeTab === 'customers'
                ? 'Customer Directory'
                : activeTab === 'feedback'
                  ? 'Customer & Store Feedback'
                  : 'Video Library'}
            </h1>
            <p className="mt-0.5 text-sm font-normal text-muted-foreground sm:text-sm">
              {activeTab === 'customers'
                ? 'Search and view registered customer transactions'
                : activeTab === 'feedback'
                  ? 'View store action notes, optometrist assessments, and direct patient feedback'
                  : 'Upload and manage videos available in the admin console'}
            </p>
          </div>
        </div>

        {/* Layout Row 1: Metrics Grid (left) + Optometrist Users Card (right) stretched to same height */}
        {activeTab === 'videos' ? null : (
          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            <AdminCard tabCounts={customerTabCounts} variant="metrics" />
            <AdminCard data={optometristUsersWithStatus} variant="optometrist-users" />
          </div>
        )}

        {/* Layout Row 2: Selected Directory Table View */}
        {activeTab === 'customers' ? (
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
          <VideoDirectoryBody
            onDelete={handleDeleteVideo}
            onSetTvModeVideo={handleSetTvModeVideo}
            onUploadClick={() => setIsUploadDialogOpen(true)}
            tvModeVideoId={tvModeVideoId}
            videos={videos}
          />
        )}
      </main>

      <VideoUploadDialog
        isUploading={isUploadingVideo}
        onOpenChange={setIsUploadDialogOpen}
        onUploadFile={handleUploadVideoFile}
        open={isUploadDialogOpen}
      />
    </AppLayout>
  );
}
