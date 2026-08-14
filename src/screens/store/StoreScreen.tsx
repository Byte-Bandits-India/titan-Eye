import { type ColumnDef, useTable } from '@tanstack/react-table';
import { Bell, Plus } from 'lucide-react';
import * as React from 'react';

import type { ColumnOption, Customer, OptomUserRow, SSEEventDetail, StatusTab } from '../../types';

import {
  cancelCallAction,
  completeCallAction,
  fetchCustomersAction,
  initiateCallAction,
  updateCustomerAction,
} from '../../Actions/customerActions';
import { fetchUsersAction } from '../../Actions/userActions';
import { AppLayout } from '../../components/layout/AppLayout';
import { dataGridFeatures, type DataGridFeatures } from '../../components/reui/data-grid/data-grid';
import { CompleteCallModal } from '../../components/shared/CompleteCallModal';
import { Button } from '../../components/ui/button';
import { useNotificationLog } from '../../components/ui/notificationLog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { useToast } from '../../components/ui/toast';
import { usePagination } from '../../hooks/usePagination';
import { PAGINATION } from '../../options/Option';
import { useAppDispatch, useAppSelector } from '../../store';
import { type DateFilterRange, filterCustomersByDate } from '../../utils/dateFilter';
import { renderCallDuration, WaitingCell } from './components/cells';
import { CustomerActionsCell } from './components/CustomerActionsCell';
import { parseTimestamp } from './components/formatters';
import { StoreCard } from './components/StoreCard';
import { StorePatientDetails } from './StorePatientDetails';
import { StoreRxDetails } from './StoreRxDetails';

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
  const [pageSize, setPageSize] = React.useState<number>(PAGINATION.STORE_PAGE_SIZE);
  const [loadingCallId, setLoadingCallId] = React.useState<null | string>(null);
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

  const optomUsersWithStatus = React.useMemo<OptomUserRow[]>(
    () =>
      users
        .filter((u) => u.role === 'optom')
        .map((optomUser) => {
          if (optomUser.status === 'inactive' || !(optomUser.isLoggedIn ?? false)) {
            return {
              ...optomUser,
              activeCall: null as Customer | null,
              avail: {
                badgeClass:
                  'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400 border-slate-200 dark:border-slate-700',
                dotClass: 'bg-slate-400',
                ping: false,
                statusLabel: 'Offline',
              },
            };
          }

          const optomNameLower = optomUser.name.toLowerCase();
          const optomEmailLower = optomUser.email.toLowerCase();

          const activeCall = customers.find((c) => {
            const isCallActiveState = c.status === 'Initiated' || c.status === 'Accepted';

            if (!isCallActiveState || !c.callTakenBy) {
              return false;
            }

            const takenByLower = c.callTakenBy.toLowerCase();

            return takenByLower === optomNameLower || takenByLower === optomEmailLower;
          });

          if (activeCall) {
            return {
              ...optomUser,
              activeCall,
              avail: {
                badgeClass:
                  'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800',
                dotClass: 'bg-amber-500',
                ping: true,
                statusLabel: 'In Call',
              },
            };
          }

          return {
            ...optomUser,
            activeCall: null as Customer | null,
            avail: {
              badgeClass:
                'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
              dotClass: 'bg-emerald-500',
              ping: true,
              statusLabel: 'Available',
            },
          };
        }),
    [users, customers]
  );

  const availableOptomDoctors = React.useMemo(
    () => optomUsersWithStatus.filter((u) => u.avail.statusLabel === 'Available'),
    [optomUsersWithStatus]
  );

  const prevAvailableCountRef = React.useRef<number>(0);
  const isInitialFetchRef = React.useRef(true);

  React.useEffect(() => {
    const currentCount = availableOptomDoctors.length;
    const prevCount = prevAvailableCountRef.current;

    if (isInitialFetchRef.current) {
      if (users.length > 0) {
        isInitialFetchRef.current = false;
        prevAvailableCountRef.current = currentCount;
      }

      return;
    }

    if (currentCount > 0 && prevCount === 0) {
      const names = availableOptomDoctors.map((d) => d.name).join(', ');
      addLogNotification({
        description: `${names} ${availableOptomDoctors.length > 1 ? 'are' : 'is'} online and ready for incoming calls.`,
        title: 'Optom Doctor Available',
        type: 'optom_available',
      });
    }

    prevAvailableCountRef.current = currentCount;
  }, [availableOptomDoctors, addLogNotification, users.length]);

  const STORE_CUSTOMER_COLUMNS = React.useMemo<ColumnOption[]>(
    () => [
      { id: 'id', isMandatory: true, label: 'Customer ID' },
      { id: 'name', isMandatory: true, label: 'Customer Name' },
      { id: 'language', isMandatory: false, label: 'Language' },
      { id: 'waiting', isMandatory: false, label: 'Waiting' },
      { id: 'callDuration', isMandatory: false, label: 'Call Duration' },
      { id: 'actions', isMandatory: true, label: 'Actions' },
    ],
    []
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
      STORE_CUSTOMER_COLUMNS.filter((col) => col.isMandatory || columnVisibility[col.id] !== false).map(
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

  const handleInitiateCall = async (customerId: string) => {
    setLoadingCallId(customerId);

    try {
      await dispatch(initiateCallAction(customerId));
      toast({
        description: 'Your request has been sent to the available Optom doctor.',
        title: 'Optom Requested',
        type: 'success',
      });
    } catch (e) {
      const err = e as Error;

      if (err.message?.includes('No Optom doctors are currently available')) {
        toast({
          description: 'All Optom doctors are currently busy. Please try again in a few minutes.',
          title: 'Optom Unavailable',
          type: 'error',
        });
      } else if (err.message?.includes('already has a pending Optom request')) {
        toast({ description: err.message, title: 'Request Already Pending', type: 'error' });
      } else if (err.message?.includes('409') || err.message?.includes('already taken')) {
        toast({
          description: err.message || 'This call is already taken by another agent.',
          title: 'Call Collision',
          type: 'error',
        });
      } else {
        toast({
          description: err.message || 'Failed to connect to the server to initiate call.',
          title: 'System Error',
          type: 'error',
        });
      }
    } finally {
      setLoadingCallId(null);
    }
  };

  const handleCancelCall = async (customerId: string) => {
    try {
      await dispatch(cancelCallAction(customerId));
      toast({
        description: 'Optom request has been cancelled.',
        title: 'Request Cancelled',
        type: 'info',
      });
    } catch (e) {
      const err = e as Error;
      toast({
        description: err.message || 'Failed to cancel Optom request.',
        title: 'System Error',
        type: 'error',
      });
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
      const err = e as Error;
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
    setSelectedCustomerId(null);
    setStatusTab('Pending');
    resetPage();
  };

  const handleSelectCustomer = (id: string) => {
    setIsAddingNew(false);
    setIsEditing(false);
    setIsEditingRx(false);
    setSelectedCustomerId(id);
  };

  const customerColumns = React.useMemo<ColumnDef<DataGridFeatures, Customer>[]>(
    () => [
      {
        accessorKey: 'id',
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{row.original.id}</span>
        ),
        enableSorting: false,
        header: () => (
          <span className="whitespace-nowrap text-xs font-bold uppercase text-muted-foreground">
            Customer ID
          </span>
        ),
        id: 'id',
        meta: { cellClassName: 'py-3', headerClassName: 'w-[100px]' },
        size: 100,
      },
      {
        accessorKey: 'name',
        cell: ({ row }) => <span className="text-xs font-semibold text-foreground">{row.original.name}</span>,
        enableSorting: false,
        header: () => (
          <span className="whitespace-nowrap text-xs font-bold uppercase text-muted-foreground">
            Customer Name
          </span>
        ),
        id: 'name',
        meta: { cellClassName: 'py-3', headerClassName: 'min-w-[150px]' },
        size: 150,
      },
      {
        accessorKey: 'preferredLanguage',
        cell: ({ row }) => (
          <span className="text-xs font-medium text-foreground">{row.original.preferredLanguage}</span>
        ),
        enableHiding: true,
        enableSorting: false,
        header: () => (
          <span className="whitespace-nowrap text-xs font-bold uppercase text-muted-foreground">
            Language
          </span>
        ),
        id: 'language',
        meta: { cellClassName: 'py-3', headerClassName: 'min-w-[110px]' },
        size: 110,
      },
      {
        cell: ({ row }) => <WaitingCell cust={row.original} />,
        enableSorting: false,
        header: () => (
          <span className="whitespace-nowrap text-xs font-bold uppercase text-muted-foreground">Waiting</span>
        ),
        id: 'waiting',
        meta: { cellClassName: 'py-3', headerClassName: 'min-w-[120px]' },
        size: 120,
      },
      {
        accessorKey: 'callDuration',
        cell: ({ row }) => renderCallDuration(row.original),
        enableSorting: false,
        header: () => (
          <span className="whitespace-nowrap text-xs font-bold uppercase text-muted-foreground">
            Call Duration
          </span>
        ),
        id: 'callDuration',
        meta: { cellClassName: 'py-3', headerClassName: 'min-w-[130px]' },
        size: 130,
      },
      {
        cell: ({ row }) => (
          <CustomerActionsCell
            completingCallId={completingCallId}
            cust={row.original}
            loadingCallId={loadingCallId}
            onCancelCall={handleCancelCall}
            onCompleteCall={handleCompleteCall}
            onInitiateCall={handleInitiateCall}
            onSelectCustomer={handleSelectCustomer}
            onSetEditing={setIsEditing}
            onSetEditingRx={setIsEditingRx}
            statusTab={statusTab}
            user={user}
          />
        ),
        enableSorting: false,
        header: () => (
          <span className="block whitespace-nowrap pr-4 text-right text-xs font-bold uppercase text-muted-foreground">
            Actions
          </span>
        ),
        id: 'actions',
        meta: { cellClassName: 'text-right py-3 pr-4', headerClassName: 'min-w-[240px] text-right pr-4' },
        size: 240,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadingCallId, completingCallId, user, statusTab]
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

  return (
    <AppLayout>
      {isEditingRx ? (
        <StoreRxDetails onBack={() => setIsEditingRx(false)} selectedCustomer={selectedCustomer} />
      ) : (
        <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6 md:px-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-[28px] font-semibold leading-tight text-foreground">Store Overview</h1>
              <p className="mt-0.5 text-sm font-normal text-muted-foreground">{user.name}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                className="h-10 gap-2 px-4 text-xs font-bold"
                onClick={() => window.dispatchEvent(new CustomEvent('titan:open_notifications'))}
                variant="outline"
              >
                <Bell size={14} />
                View Notification
              </Button>
              <Button
                className="h-10 gap-2 px-4 text-sm font-semibold text-white shadow-sm"
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
            <StoreCard data={optomUsersWithStatus} variant="optom-users" />
          </div>

          <StoreCard
            columns={STORE_CUSTOMER_COLUMNS}
            currentPage={currentPage}
            customersTable={customersTable}
            data={paginatedCustomers}
            dateRange={customerDateRange}
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
        </main>
      )}

      {completeCallModalData && (
        <CompleteCallModal
          customerName={completeCallModalData.customerName}
          feedbackUrl={completeCallModalData.feedbackUrl}
          onClose={() => setCompleteCallModalData(null)}
        />
      )}

      <Sheet
        onOpenChange={(open) => {
          if (!open) {
            setIsAddingNew(false);
            setIsEditing(false);
          }
        }}
        open={isAddingNew || isEditing}
      >
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>
              {isEditing ? 'Edit Customer Details' : 'Customer Details'} - {user.name}
            </SheetTitle>
            <p className="mt-1.5 text-sm text-foreground">
              Please provide the customer&apos;s details to create an accurate profile and ensure their
              information is available for future visits and service.
            </p>
          </SheetHeader>
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
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
