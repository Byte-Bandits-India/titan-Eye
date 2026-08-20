import { type ColumnDef, useTable } from '@tanstack/react-table';
import { Plus, TrendingUp } from 'lucide-react';
import * as React from 'react';

import type { ColumnOption, Customer, OptometristUserRow, SSEEventDetail, StatusTab } from '../../types';

import {
  completeCallAction,
  dropCustomerAction,
  fetchCustomersAction,
  updateCustomerAction,
} from '../../Actions/customerActions';
import { fetchUsersAction } from '../../Actions/userActions';
import { AppLayout } from '../../components/layout/AppLayout';
import { dataGridFeatures, type DataGridFeatures } from '../../components/reui/data-grid/data-grid';
import { BackButton } from '../../components/shared/BackButton';
import { CompleteCallModal } from '../../components/shared/CompleteCallModal';
import { Button } from '../../components/ui/button';
import { useNotificationLog } from '../../components/ui/notificationLog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useToast } from '../../components/ui/toast';
import { usePagination } from '../../hooks/usePagination';
import { PAGINATION } from '../../options/Option';
import { useAppDispatch, useAppSelector } from '../../store';
import { type DateFilterRange, filterCustomersByDate } from '../../utils/dateFilter';
import { computeOptometristAvailability } from '../../utils/optometristAvailability';
import { renderCallDuration, WaitingCell } from './components/cells';
import { ConversionStatusBadge, CustomerActionsCell } from './components/CustomerActionsCell';
import { CancelRequestDialog } from './components/CancelRequestDialog';
import { parseTimestamp } from './components/formatters';
import { StoreCard } from './components/StoreCard';
import { StoreCustomerTestPage } from './StoreCustomerTestPage';
import { StorePatientDetails } from './StorePatientDetails';
import { StoreRxDetails } from './StoreRxDetails';
import { StoreUpdateStatusPage } from './StoreUpdateStatusPage';

export function StoreScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const customers = useAppSelector((state) => state.customers.customers);
  const users = useAppSelector((state) => state.users.users);
  const dispatch = useAppDispatch();
  const [statusTab, setStatusTab] = React.useState<StatusTab>('Pending');
  const [customerSearchTerm, setCustomerSearchTerm] = React.useState('');
  const [customerDateRange, setCustomerDateRange] = React.useState<DateFilterRange>('all');
  const [isNarrowScreen, setIsNarrowScreen] = React.useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<null | string>('#0492');
  const [isAddingNew, setIsAddingNew] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isEditingRx, setIsEditingRx] = React.useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);
  const [isCreatingTest, setIsCreatingTest] = React.useState(false);
  const [isViewingSalesConversion, setIsViewingSalesConversion] = React.useState(false);
  const [pageSize, setPageSize] = React.useState<number>(PAGINATION.STORE_PAGE_SIZE);
  const [completingCallId, setCompletingCallId] = React.useState<null | string>(null);
  const [completeCallModalData, setCompleteCallModalData] = React.useState<null | {
    customerName: string;
    feedbackUrl: string;
  }>(null);

  const { toast } = useToast();
  const { addLogNotification } = useNotificationLog();

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 950px)');
    const handleChange = () => setIsNarrowScreen(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  React.useEffect(() => {
    dispatch(fetchCustomersAction());
    dispatch(fetchUsersAction());

    const handleSseEvent = (e: Event) => {
      const customEv = e as CustomEvent<SSEEventDetail>;
      const type = customEv.detail?.type;

      if (
        type === 'CUSTOMER_CREATED' ||
        type === 'CUSTOMER_UPDATED' ||
        type === 'USER_CREATED' ||
        type === 'USER_UPDATED' ||
        type === 'USER_DELETED' ||
        type === 'USER_STATUS_CHANGE' ||
        type === 'ADMIN_LOG_CREATED'
      ) {
        dispatch(fetchCustomersAction());
        dispatch(fetchUsersAction());
      }
    };

    window.addEventListener('titan:sse_event', handleSseEvent);

    return () => window.removeEventListener('titan:sse_event', handleSseEvent);
  }, [dispatch]);

  const handleCloseCall = React.useCallback(
    async (customerId: string) => {
      try {
        const customer = customers.find((c) => c.id === customerId);

        if (customer && customer.status === 'Initiated') {
          const timestamp = new Date().toLocaleString('en-US', {
            day: 'numeric',
            hour: 'numeric',
            hour12: true,
            minute: 'numeric',
            month: 'short',
            second: 'numeric',
            year: 'numeric',
          });
          await dispatch(
            updateCustomerAction(customerId, {
              ...customer,
              callActive: false,
              callTakenBy: null,
              lastUpdatedOn: timestamp,
              status: 'Closed',
            })
          );
        }
      } catch (e) {
        console.error('Failed to close call:', e);
      }
    },
    [customers, dispatch]
  );

  React.useEffect(() => {
    const checkTimeout = () => {
      const now = Date.now();
      customers.forEach((cust) => {
        if (cust.status === 'Initiated' && (cust.callStartTime || cust.lastUpdatedOn)) {
          const startTimeStr = cust.callStartTime || cust.lastUpdatedOn;
          let startMs = parseInt(startTimeStr!, 10);

          if (isNaN(startMs) || String(startMs).length < 10) {
            startMs = new Date(startTimeStr!).getTime();
          }

          if (!isNaN(startMs) && now - startMs >= 3540000) {
            handleCloseCall(cust.id);
          }
        }
      });
    };

    checkTimeout();
    const interval = setInterval(checkTimeout, 5000);

    return () => clearInterval(interval);
  }, [customers, handleCloseCall]);

  const selectedCustomer = React.useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

  const hasActiveRequest = React.useMemo(
    () => customers.some((c) => c.status === 'Initiated' || c.status === 'Accepted'),
    [customers]
  );

  const tabCounts = React.useMemo(
    () => ({
      all: customers.length,
      completed: customers.filter((c) => c.status === 'Completed').length,
      inProgress: customers.filter((c) => c.status === 'Accepted').length,
      pending: customers.filter(
        (c) => c.status === 'Created' || c.status === 'Initiated' || c.status === 'Drop'
      ).length,
    }),
    [customers]
  );

  const filteredCustomers = React.useMemo(() => {
    const byStatus = customers.filter((c) => {
      if (
        statusTab === 'Pending' &&
        !(c.status === 'Created' || c.status === 'Initiated' || c.status === 'Drop')
      ) {
        return false;
      }

      if (statusTab === 'InProgress' && c.status !== 'Accepted') {
        return false;
      }

      if (statusTab === 'Completed' && c.status !== 'Completed') {
        return false;
      }

      return true;
    });

    const byDate = filterCustomersByDate(byStatus, customerDateRange);
    const search = customerSearchTerm.trim().toLowerCase();

    let list = byDate;

    if (search) {
      list = byDate.filter(
        (c) =>
          c.id.toLowerCase().includes(search) ||
          c.name.toLowerCase().includes(search) ||
          c.mobile.toLowerCase().includes(search)
      );
    }

    if (statusTab === 'Pending') {
      return [...list].sort((a, b) => {
        const timeA = parseTimestamp(a.createdOn || a.callStartTime || a.lastUpdatedOn);
        const timeB = parseTimestamp(b.createdOn || b.callStartTime || b.lastUpdatedOn);

        return timeA - timeB;
      });
    }

    return list;
  }, [customers, statusTab, customerDateRange, customerSearchTerm]);

  const optometristUsersWithStatus = React.useMemo<OptometristUserRow[]>(
    () => computeOptometristAvailability(users, customers),
    [users, customers]
  );

  const availableOptometristDoctors = React.useMemo(
    () => optometristUsersWithStatus.filter((u) => u.avail.statusLabel === 'Available'),
    [optometristUsersWithStatus]
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
        description: `${names} ${availableOptometristDoctors.length > 1 ? 'are' : 'is'} online and ready for Testing.`,
        title: 'Optometrist Available',
        type: 'optometrist_available',
      });
    }

    prevAvailableCountRef.current = currentCount;
  }, [availableOptometristDoctors, addLogNotification, users.length]);

  const STORE_CUSTOMER_COLUMNS = React.useMemo<ColumnOption[]>(
    () => [
      { id: 'id', isMandatory: true, label: 'Customer ID' },
      { id: 'name', isMandatory: true, label: 'Name' },
      { id: 'language', isMandatory: false, label: 'Lang' },
      { id: 'waiting', isMandatory: false, label: 'Waiting' },
      { id: 'callDuration', isMandatory: false, label: 'Call Duration' },
      ...(statusTab !== 'Pending' ? [{ id: 'optometrist', isMandatory: false, label: 'Optometrist' }] : []),
      ...(statusTab === 'Pending' ? [{ id: 'position', isMandatory: true, label: 'Queue' }] : []),
      ...(statusTab === 'all' ? [{ id: 'status', isMandatory: true, label: 'Status' }] : []),
      { id: 'actions', isMandatory: true, label: 'Actions' },
    ],
    [statusTab]
  );

  const [columnVisibility, setColumnVisibility] = React.useState<Record<string, boolean>>({});

  const handleToggleColumn = React.useCallback((columnId: string) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [columnId]: prev[columnId] === false ? true : false,
    }));
  }, []);

  const handleResetColumns = React.useCallback(() => {
    setColumnVisibility({});
  }, []);

  const visibleColumnIds = React.useMemo(
    () =>
      STORE_CUSTOMER_COLUMNS.filter((col) => col.isMandatory || columnVisibility?.[col.id] !== false).map(
        (col) => col.id
      ),
    [STORE_CUSTOMER_COLUMNS, columnVisibility]
  );

  const {
    currentPage,
    nextPage,
    paginatedItems: paginatedCustomers,
    prevPage,
    resetPage,
    totalItems,
    totalPages,
  } = usePagination(filteredCustomers, pageSize);

  const [cancelRequestTarget, setCancelRequestTarget] = React.useState<Customer | null>(null);
  const [isCancellingRequest, setIsCancellingRequest] = React.useState(false);

  const handleOpenCancelDialog = (customerId: string) => {
    setCancelRequestTarget(customers.find((c) => c.id === customerId) ?? null);
  };

  const handleConfirmCancelRequest = async (reason: string) => {
    if (!cancelRequestTarget) {
      return;
    }

    setIsCancellingRequest(true);

    try {
      await dispatch(dropCustomerAction(cancelRequestTarget.id, reason));
      toast({
        description: `The request for ${cancelRequestTarget.name} has been cancelled.`,
        title: 'Request Cancelled',
        type: 'info',
      });
      setCancelRequestTarget(null);
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

  const handleCompleteCall = async (customerId: string, customerName: string) => {
    setCompletingCallId(customerId);

    try {
      const result = await dispatch(completeCallAction(customerId));
      setCompleteCallModalData({
        customerName,
        feedbackUrl: `${window.location.origin}/feedback/${result.token}`,
      });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({
        description: err.message || 'Failed to mark the call as completed.',
        title: 'System Error',
        type: 'error',
      });
    } finally {
      setCompletingCallId(null);
    }
  };

  const handleAddNewClick = () => {
    setIsAddingNew(true);
    setIsEditing(false);
    setIsEditingRx(false);
    setIsCreatingTest(false);
    setIsViewingSalesConversion(false);
    setIsUpdatingStatus(false);
    setSelectedCustomerId(null);
    setStatusTab('Pending');
    resetPage();
  };

  const handleSelectCustomer = (id: string) => {
    setIsAddingNew(false);
    setIsEditing(false);
    setIsEditingRx(false);
    setIsCreatingTest(false);
    setIsViewingSalesConversion(false);
    setIsUpdatingStatus(false);
    setSelectedCustomerId(id);
  };

  const handleOpenUpdateStatus = (id: string) => {
    setIsAddingNew(false);
    setIsEditing(false);
    setIsEditingRx(false);
    setIsCreatingTest(false);
    setSelectedCustomerId(id);
    setIsUpdatingStatus(true);
  };

  const handleOpenRxFromNotification = (id: string) => {
    setIsAddingNew(false);
    setIsEditing(false);
    setIsUpdatingStatus(false);
    setIsCreatingTest(false);
    setIsViewingSalesConversion(false);
    setSelectedCustomerId(id);
    setIsEditingRx(true);
  };

  const handleOpenCreateTest = (id: string) => {
    setIsAddingNew(false);
    setIsEditing(false);
    setIsEditingRx(false);
    setIsUpdatingStatus(false);
    setIsViewingSalesConversion(false);
    setSelectedCustomerId(id);
    setIsCreatingTest(true);
  };

  const handleOpenSalesConversion = () => {
    setIsAddingNew(false);
    setIsEditing(false);
    setIsEditingRx(false);
    setIsCreatingTest(false);
    setIsUpdatingStatus(false);
    setStatusTab('all');
    resetPage();
    setIsViewingSalesConversion(true);
  };

  const customerColumns = React.useMemo<ColumnDef<DataGridFeatures, Customer>[]>(
    () => [
      {
        accessorKey: 'id',
        cell: ({ row }) => (
          <span className="text-sm font-normal text-blue-600 dark:text-blue-400">{row.original.id}</span>
        ),
        enableSorting: false,
        header: () => (
          <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">Customer ID</span>
        ),
        id: 'id',
        meta: { cellClassName: 'py-3' },
        size: 100,
      },
      {
        accessorKey: 'name',
        cell: ({ row }) => <span className="text-sm font-normal text-foreground">{row.original.name}</span>,
        enableSorting: false,
        header: () => (
          <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">Name</span>
        ),
        id: 'name',
        meta: { cellClassName: 'py-3' },
        size: 150,
      },
      {
        cell: ({ row }) => {
          const languages = [row.original.preferredLanguage, row.original.preferredLanguage2].filter(
            (lang): lang is string => Boolean(lang) && lang !== 'None'
          );

          return (
            <div className="flex flex-wrap gap-1">
              {languages.length > 0 ? (
                languages.map((lang) => (
                  <span className="text-sm font-medium text-foreground" key={lang}>
                    {lang}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
          );
        },
        enableHiding: true,
        enableSorting: false,
        header: () => (
          <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">
            Preferred Languages
          </span>
        ),
        id: 'language',
        meta: { cellClassName: 'py-3' },
        size: 180,
      },
      {
        cell: ({ row }) => <WaitingCell cust={row.original} />,
        enableSorting: false,
        header: () => (
          <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">Waiting</span>
        ),
        id: 'waiting',
        meta: { cellClassName: 'py-3' },
        size: 120,
      },
      {
        accessorKey: 'callDuration',
        cell: ({ row }) => renderCallDuration(row.original),
        enableSorting: false,
        header: () => (
          <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">Call Duration</span>
        ),
        id: 'callDuration',
        meta: { cellClassName: 'py-3' },
        size: 130,
      },
      ...(statusTab !== 'Pending'
        ? [
            {
              cell: ({ row }: { row: { original: Customer } }) =>
                row.original.callTakenBy ? (
                  <span className="text-sm font-normal text-foreground">{row.original.callTakenBy}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                ),
              enableSorting: false,
              header: () => (
                <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">
                  Optometrist
                </span>
              ),
              id: 'optometrist',
              meta: { cellClassName: 'py-3' },
              size: 150,
            } satisfies ColumnDef<DataGridFeatures, Customer>,
          ]
        : []),
      ...(statusTab === 'Pending'
        ? [
            {
              cell: ({ row }: { row: { original: Customer } }) => {
                const pos = row.original.queuePosition;

                return pos ? (
                  <span className="inline-flex rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-sm font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
                    {pos}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                );
              },
              enableSorting: false,
              header: () => (
                <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">Queue</span>
              ),
              id: 'position',
              meta: { cellClassName: 'py-3' },
              size: 110,
            } satisfies ColumnDef<DataGridFeatures, Customer>,
          ]
        : []),
      ...(statusTab === 'all'
        ? [
            {
              cell: ({ row }: { row: { original: Customer } }) => (
                <ConversionStatusBadge status={row.original.status} />
              ),
              enableSorting: false,
              header: () => (
                <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">Status</span>
              ),
              id: 'status',
              meta: { cellClassName: 'py-3' },
              size: 130,
            } satisfies ColumnDef<DataGridFeatures, Customer>,
          ]
        : []),
      {
        cell: ({ row }) => (
          <CustomerActionsCell
            completingCallId={completingCallId}
            cust={row.original}
            disableRequest={hasActiveRequest}
            onCancelCall={handleOpenCancelDialog}
            onCompleteCall={handleCompleteCall}
            onCreateTest={handleOpenCreateTest}
            onSelectCustomer={handleSelectCustomer}
            onSetEditing={setIsEditing}
            onSetEditingRx={setIsEditingRx}
            onUpdateStatus={handleOpenUpdateStatus}
            statusTab={statusTab}
            user={user}
          />
        ),
        enableSorting: false,
        header: () => (
          <span className="block whitespace-nowrap pr-4 text-right text-sm font-medium text-muted-foreground">
            Actions
          </span>
        ),
        id: 'actions',
        meta: { cellClassName: 'py-3 pr-4' },
        size: 240,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [completingCallId, user, statusTab, hasActiveRequest]
  );

  const customersTable = useTable({
    columns: customerColumns,
    data: paginatedCustomers,
    features: dataGridFeatures,
    getRowId: (row: Customer) => row.id,
    onColumnVisibilityChange: () => undefined,
    onPaginationChange: () => undefined,
    pageCount: 1,
    state: {
      columnVisibility: {
        ...columnVisibility,
        language: columnVisibility.language ?? !isNarrowScreen,
      },
      pagination: { pageIndex: 0, pageSize: Math.max(paginatedCustomers.length, 1) },
    },
  });

  if (!user) {
    return null;
  }

  const renderRecentCustomersCard = (hideStatusTabs?: boolean) => (
    <StoreCard
      columns={STORE_CUSTOMER_COLUMNS}
      currentPage={currentPage}
      customersTable={customersTable}
      data={paginatedCustomers}
      dateRange={customerDateRange}
      hideStatusTabs={hideStatusTabs}
      onDateRangeChange={setCustomerDateRange}
      onNextPage={nextPage}
      onPageSizeChange={(newSize) => {
        setPageSize(newSize);
        resetPage();
      }}
      onPrevPage={prevPage}
      onResetColumns={handleResetColumns}
      onSearchChange={setCustomerSearchTerm}
      onStatusTabChange={(tab) => {
        setStatusTab(tab);
        resetPage();
      }}
      onToggleColumn={handleToggleColumn}
      pageSize={pageSize}
      searchValue={customerSearchTerm}
      statusTab={statusTab}
      tabCounts={tabCounts}
      totalItems={totalItems}
      totalPages={totalPages}
      variant="recent-customers"
      visibleColumns={visibleColumnIds}
    />
  );

  return (
    <AppLayout onSelectCustomer={handleOpenRxFromNotification}>
      {isCreatingTest ? (
        <StoreCustomerTestPage onBack={() => setIsCreatingTest(false)} selectedCustomer={selectedCustomer} />
      ) : isEditingRx ? (
        <StoreRxDetails onBack={() => setIsEditingRx(false)} selectedCustomer={selectedCustomer} />
      ) : isUpdatingStatus ? (
        <StoreUpdateStatusPage
          onBack={() => setIsUpdatingStatus(false)}
          selectedCustomer={selectedCustomer}
        />
      ) : isViewingSalesConversion ? (
        <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-4 px-3 py-4 duration-200 animate-in fade-in sm:space-y-6 sm:px-6 sm:py-8 md:px-8">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-md">
                <TrendingUp className="text-white" size={20} />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold text-foreground sm:text-xl">Sales Conversion</h1>
                <p className="truncate text-xs font-medium text-muted-foreground">
                  All recent customers for {user.name}
                </p>
              </div>
            </div>

            <BackButton onClick={() => setIsViewingSalesConversion(false)} />
          </div>

          {renderRecentCustomersCard(true)}
        </main>
      ) : (
        <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6 md:px-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-[28px] font-semibold leading-tight text-foreground">Store Overview</h1>
              <p className="mt-0.5 text-sm font-normal text-muted-foreground">{user.name}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                className="h-10 gap-2 px-4 py-4 text-sm font-medium"
                onClick={handleOpenSalesConversion}
                variant="outline"
              >
                <TrendingUp size={16} />
                Sales Conversion
              </Button>
              <Button
                className="h-10 gap-2 px-4 text-sm font-medium text-white shadow-sm"
                onClick={handleAddNewClick}
                variant="gradient"
              >
                <Plus size={14} />
                Create customer
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            <StoreCard tabCounts={tabCounts} variant="metrics" />
            <StoreCard data={optometristUsersWithStatus} variant="optometrist-users" />
          </div>

          {renderRecentCustomersCard()}
        </main>
      )}

      {completeCallModalData && (
        <CompleteCallModal
          customerName={completeCallModalData.customerName}
          feedbackUrl={completeCallModalData.feedbackUrl}
          onClose={() => setCompleteCallModalData(null)}
        />
      )}

      <CancelRequestDialog
        customer={cancelRequestTarget}
        isSubmitting={isCancellingRequest}
        onConfirm={handleConfirmCancelRequest}
        onOpenChange={(open) => !open && setCancelRequestTarget(null)}
      />

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setIsAddingNew(false);
            setIsEditing(false);
          }
        }}
        open={isAddingNew || isEditing}
      >
        <DialogContent
          className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-xl p-0 sm:max-w-3xl"
          overlayClassName="bg-black/60"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>
              {isEditing ? 'Edit Customer Details' : 'Customer Details'} - {user.name}
            </DialogTitle>
          </DialogHeader>
          <StorePatientDetails
            isAddingNew={isAddingNew}
            layout="sheet"
            onBack={() => {
              if (isAddingNew) {
                setStatusTab('Pending');
                resetPage();
              }

              setIsAddingNew(false);
              setIsEditing(false);
            }}
            selectedCustomer={isEditing ? selectedCustomer : null}
            setSelectedCustomerId={setSelectedCustomerId}
          />
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
