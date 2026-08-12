import { type ColumnDef, useTable } from '@tanstack/react-table';
import {
  Bell,
  CheckCircle2,
  Clock,
  FileText,
  FlaskConical,
  MoreHorizontal,
  Plus,
  Search,
  Stethoscope,
  UserPen,
  Users2,
  Video,
} from 'lucide-react';
import * as React from 'react';
import { useCountUp } from 'react-countup';

import type { Customer, ManagedUser } from '../../types';

import {
  fetchCustomersAction,
  initiateCallAction,
  updateCustomerAction,
} from '../../Actions/customerActions';
import { fetchUsersAction } from '../../Actions/userActions';
import { AppLayout } from '../../components/layout/AppLayout';
import { DataGrid, dataGridFeatures, type DataGridFeatures } from '../../components/reui/data-grid/data-grid';
import { DataGridScrollArea } from '../../components/reui/data-grid/data-grid-scroll-area';
import { DataGridTable } from '../../components/reui/data-grid/data-grid-table';
import { CollisionModal } from '../../components/shared/CollisionModal';
import { NotificationPopover } from '../../components/shared/NotificationPopover';
import { OptomAvatar } from '../../components/shared/OptomAvatar';
import { Button } from '../../components/ui/button';
import { CallTimer } from '../../components/ui/CallTimer';
import { Input } from '../../components/ui/input';
import { useNotificationLog } from '../../components/ui/notificationLog';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useToast } from '../../components/ui/toast';
import { usePagination } from '../../hooks/usePagination';
import { cn } from '../../lib/utils';
import { PAGINATION } from '../../options/Option';
import { useAppDispatch, useAppSelector } from '../../store';
import { DATE_FILTER_OPTIONS, type DateFilterRange, filterCustomersByDate } from '../../utils/dateFilter';
import { StorePatientDetails } from './StorePatientDetails';
import { StoreRxDetails } from './StoreRxDetails';

type OptomUserRow = ManagedUser & {
  activeCall: Customer | null;
  avail: {
    badgeClass: string;
    dotClass: string;
    ping: boolean;
    statusLabel: string;
  };
};

export function StoreScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const customers = useAppSelector((state) => state.customers.customers);
  const users = useAppSelector((state) => state.users.users);
  const dispatch = useAppDispatch();
  const [statusTab, setStatusTab] = React.useState<'all' | 'Completed' | 'InProgress' | 'Pending'>('all');
  const [customerSearchTerm, setCustomerSearchTerm] = React.useState('');
  const [customerDateRange, setCustomerDateRange] = React.useState<DateFilterRange>('all');
  const [now, setNow] = React.useState<number>(Date.now());
  const [isNarrowScreen, setIsNarrowScreen] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 950px)');
    const handleChange = () => setIsNarrowScreen(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(timer);
  }, []);
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<null | string>('#0492');
  const [isAddingNew, setIsAddingNew] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isEditingRx, setIsEditingRx] = React.useState(false);
  const [pageSize, setPageSize] = React.useState<number>(PAGINATION.STORE_PAGE_SIZE);
  const [loadingCallId, setLoadingCallId] = React.useState<null | string>(null);

  const [collisionModalData, setCollisionModalData] = React.useState<null | {
    id: string;
    name: string;
    takenBy: string;
    targetView?: 'info' | 'rx';
  }>(null);
  const { toast } = useToast();
  const { addLogNotification } = useNotificationLog();

  React.useEffect(() => {
    dispatch(fetchCustomersAction());
    dispatch(fetchUsersAction());

    const handleSseEvent = (e: Event) => {
      const customEv = e as CustomEvent<{ data: unknown; type: string; }>;
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

    return () => {
      window.removeEventListener('titan:sse_event', handleSseEvent);
    };
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

  const tabCounts = React.useMemo(() => ({
      all: customers.length,
      completed: customers.filter((c) => c.status === 'Completed' || c.status === 'Closed').length,
      inProgress: customers.filter((c) => c.status === 'Initiated' || c.status === 'Accepted').length,
      pending: customers.filter((c) => c.status === 'Created').length,
    }), [customers]);

  const storeMetricCards = [
    {
      icon: Clock,
      iconGradient: 'from-[#EF427F] to-[#892649]',
      label: 'Customer Queue',
      value: tabCounts.pending,
    },
    {
      icon: FlaskConical,
      iconGradient: 'from-indigo-500 to-indigo-800',
      label: 'Testing',
      value: tabCounts.inProgress,
    },
    {
      icon: CheckCircle2,
      iconGradient: 'from-orange-500 to-orange-800',
      label: 'Completed',
      value: tabCounts.completed,
    },
    {
      icon: Users2,
      iconGradient: 'from-green-500 to-green-800',
      label: 'Total customers',
      value: tabCounts.all,
    },
  ] as const;

  const filteredCustomers = React.useMemo(() => {
    const byStatus = customers.filter((c) => {
      if (statusTab === 'Pending' && c.status !== 'Created') {return false;}

      if (statusTab === 'InProgress' && !(c.status === 'Initiated' || c.status === 'Accepted')) {return false;}

      if (statusTab === 'Completed' && !(c.status === 'Completed' || c.status === 'Closed')) {return false;}

      return true;
    });

    const byDate = filterCustomersByDate(byStatus, customerDateRange);

    const search = customerSearchTerm.trim().toLowerCase();

    if (!search) {return byDate;}

    return byDate.filter(
      (c) =>
        c.id.toLowerCase().includes(search) ||
        c.name.toLowerCase().includes(search) ||
        c.mobile.toLowerCase().includes(search)
    );
  }, [customers, statusTab, customerDateRange, customerSearchTerm]);

  const optomUsersWithStatus = React.useMemo(() => {
    const list = users.filter((u) => u.role === 'optom');

    return list.map((optomUser) => {
      if (optomUser.status === 'inactive') {
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

      const isOnline = optomUser.isLoggedIn ?? false;

      if (!isOnline) {
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

        if (!isCallActiveState || !c.callTakenBy) {return false;}

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
    });
  }, [users, customers]);

  const availableOptomDoctors = React.useMemo(() => optomUsersWithStatus.filter((u) => u.avail.statusLabel === 'Available'), [optomUsersWithStatus]);

  const prevAvailableCountRef = React.useRef<number>(0);

  React.useEffect(() => {
    const currentCount = availableOptomDoctors.length;
    const prevCount = prevAvailableCountRef.current;

    if (currentCount > 0 && prevCount === 0) {
      const names = availableOptomDoctors.map((d) => d.name).join(', ');
      addLogNotification({
        description: `${names} ${availableOptomDoctors.length > 1 ? 'are' : 'is'} online and ready for incoming calls.`,
        title: 'Optom Doctor Available',
        type: 'optom_available',
      });
    }

    prevAvailableCountRef.current = currentCount;
  }, [availableOptomDoctors, addLogNotification]);

  const {
    currentPage,
    nextPage,
    paginatedItems: paginatedCustomers,
    prevPage,
    resetPage,
    totalItems,
    totalPages,
  } = usePagination(filteredCustomers, pageSize);

  const handlePageSizeChange = React.useCallback(
    (newSize: number) => {
      setPageSize(newSize);
      resetPage();
    },
    [resetPage]
  );

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

      if (err.message && err.message.includes('No Optom doctors are currently available')) {
        toast({
          description: 'All Optom doctors are currently busy. Please try again in a few minutes.',
          title: 'Optom Unavailable',
          type: 'error',
        });
      } else if (err.message && err.message.includes('already has a pending Optom request')) {
        toast({
          description: err.message,
          title: 'Request Already Pending',
          type: 'error',
        });
      } else if (err.message && (err.message.includes('409') || err.message.includes('already taken'))) {
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

  const handleAddNewClick = () => {
    setIsAddingNew(true);
    setIsEditing(false);
    setIsEditingRx(false);
    setSelectedCustomerId(null);
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
          <span className="whitespace-nowrap text-xs font-bold uppercase text-muted-foreground">Customer ID</span>
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
          <span className="whitespace-nowrap text-xs font-bold uppercase text-muted-foreground">Language</span>
        ),
        id: 'language',
        meta: { cellClassName: 'py-3', headerClassName: 'min-w-[110px]' },
        size: 110,
      },
      {
        cell: ({ row }) => renderWaitingDuration(row.original, now),
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
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{renderCallDuration(row.original)}</span>
        ),
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
        cell: ({ row }) => {
          const cust = row.original;

          return (
            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
              {(() => {
                if (cust.status === 'Accepted') {
                  return (
                    <Button
                      className="flex h-8 cursor-not-allowed items-center gap-1.5 rounded-xs border-0 bg-muted px-4 text-xs font-bold text-muted-foreground opacity-100"
                      disabled
                      title="Call Initiated"
                    >
                      Call Initiated
                    </Button>
                  );
                }

                if (cust.status === 'Initiated') {
                  return (
                    <Button
                      className="flex h-8 cursor-not-allowed items-center gap-1.5 rounded-xs border-0 bg-muted px-4 text-xs font-bold text-muted-foreground opacity-100"
                      disabled
                      title="Waiting for an Optom doctor to respond — automatically retried with the next available Optom"
                    >
                      Requesting Optom…
                    </Button>
                  );
                }

                return (
                  <Button
                    className="flex h-8 cursor-pointer items-center gap-1.5 rounded-xs border-0 bg-[#4f46e5] px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#4338ca] active:scale-95 dark:bg-indigo-600 dark:hover:bg-indigo-700"
                    disabled={loadingCallId === cust.id}
                    onClick={() => handleInitiateCall(cust.id)}
                    title="Request an Optom doctor for this call"
                  >
                    {loadingCallId === cust.id ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Video size={14} />
                    )}
                    Request Optom
                  </Button>
                );
              })()}

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xs border-border p-0 shadow-sm transition-all hover:bg-muted active:scale-95"
                    size="icon"
                    title="Actions Menu"
                    variant="outline"
                  >
                    <MoreHorizontal className="text-muted-foreground" size={16} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="z-50 w-48 space-y-1 rounded-xl border border-border bg-card p-1.5 shadow-xl"
                  sideOffset={6}
                >
                  <button
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                    onClick={() => {
                      if (cust.callActive && cust.storeName !== user?.name) {
                        setCollisionModalData({
                          id: cust.id,
                          name: cust.name,
                          takenBy: cust.callTakenBy || 'another agent',
                          targetView: 'info',
                        });
                      } else {
                        handleSelectCustomer(cust.id);
                        setIsEditing(true);
                        setIsEditingRx(false);
                      }
                    }}
                    type="button"
                  >
                    <UserPen className="shrink-0 text-blue-600 dark:text-blue-400" size={14} />
                    <span>Edit Customer</span>
                  </button>

                  <button
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                    onClick={() => {
                      if (cust.callActive && cust.storeName !== user?.name) {
                        setCollisionModalData({
                          id: cust.id,
                          name: cust.name,
                          takenBy: cust.callTakenBy || 'another agent',
                          targetView: 'rx',
                        });
                      } else {
                        handleSelectCustomer(cust.id);
                        setIsEditingRx(true);
                        setIsEditing(false);
                      }
                    }}
                    type="button"
                  >
                    <FileText className="shrink-0 text-emerald-600 dark:text-emerald-400" size={14} />
                    <span>Store Rx</span>
                  </button>
                </PopoverContent>
              </Popover>
            </div>
          );
        },
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
    [now, loadingCallId, user]
  );

  const customersTable = useTable({
    columns: customerColumns,
    data: paginatedCustomers,
    features: dataGridFeatures,
    getRowId: (row: Customer) => row.id,
    onColumnVisibilityChange: () => {},
    onPaginationChange: () => {},
    pageCount: 1,
    state: {
      columnVisibility: { language: !isNarrowScreen },
      pagination: { pageIndex: 0, pageSize: Math.max(paginatedCustomers.length, 1) },
    },
  });

  const optomColumns = React.useMemo<ColumnDef<DataGridFeatures, OptomUserRow>[]>(
    () => [
      {
        accessorKey: 'name',
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <OptomAvatar className="h-8 w-8" email={row.original.email} name={row.original.name} />
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-foreground">{row.original.name}</div>
              <div className="truncate text-[10px] text-muted-foreground">{row.original.email}</div>
            </div>
          </div>
        ),
        enableSorting: false,
        header: () => (
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Optom</span>
        ),
        id: 'name',
        meta: { cellClassName: 'py-3' },
        size: 220,
      },
      {
        cell: ({ row }) =>
          row.original.activeCall ? (
            renderCallDuration(row.original.activeCall)
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        enableSorting: false,
        header: () => (
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Call Duration</span>
        ),
        id: 'callDuration',
        meta: { cellClassName: 'whitespace-nowrap py-3 text-xs text-muted-foreground' },
        size: 150,
      },
      {
        cell: ({ row }) => (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold',
              row.original.avail.badgeClass
            )}
          >
            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', row.original.avail.dotClass)} />
            {row.original.avail.statusLabel}
          </span>
        ),
        enableSorting: false,
        header: () => (
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Status</span>
        ),
        id: 'status',
        meta: { cellClassName: 'py-3' },
        size: 130,
      },
    ],
    []
  );

  const optomTable = useTable({
    columns: optomColumns,
    data: optomUsersWithStatus,
    features: dataGridFeatures,
    getRowId: (row: OptomUserRow) => row.email,
    onPaginationChange: () => {},
    pageCount: 1,
    state: {
      pagination: { pageIndex: 0, pageSize: Math.max(optomUsersWithStatus.length, 1) },
    },
  });

  if (!user) {return null;}

  return (
    <AppLayout>
      {isEditing ? (
        <StorePatientDetails
          isAddingNew={false}
          onBack={() => {
            setIsEditing(false);
          }}
          selectedCustomer={selectedCustomer}
          setSelectedCustomerId={setSelectedCustomerId}
        />
      ) : isEditingRx ? (
        <StoreRxDetails
          onBack={() => {
            setIsEditingRx(false);
          }}
          selectedCustomer={selectedCustomer}
        />
      ) : (
        <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6 md:px-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-[28px] font-semibold leading-tight text-foreground">Store Overview</h1>
              <p className="mt-0.5 text-sm font-normal text-muted-foreground">{user.name}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <NotificationPopover
                onSelectCustomer={handleSelectCustomer}
                trigger={
                  <Button className="h-10 gap-2 px-4 text-xs font-bold" variant="outline">
                    <Bell size={14} />
                    View Notification
                  </Button>
                }
                variant="drawer"
              />
              <Button
                className="h-10 gap-2 bg-gradient-to-br from-blue-500 to-blue-700 px-4 text-sm font-semibold text-white shadow-sm hover:from-blue-600 hover:to-blue-800"
                onClick={handleAddNewClick}
              >
                <Plus size={14} />
                Create customer
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            <div className="grid grid-cols-2 gap-4">
              {storeMetricCards.map((card) => {
                const Icon = card.icon;

                return (
                  <div
                    className="overflow-hidden rounded-md border border-[#c2c2c2] bg-card shadow-sm"
                    key={card.label}
                  >
                    <div className="flex items-center gap-2.5 border-b border-[#e5e5e5] bg-[#F7F7F7] px-4 py-2.5">
                      <div
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-gradient-to-br text-white',
                          card.iconGradient
                        )}
                      >
                        <Icon size={13} />
                      </div>
                      <span className="truncate text-sm font-bold text-black">{card.label}</span>
                    </div>
                    <div className="flex items-baseline gap-2 px-8 py-5">
                      <MetricCountUp
                        className="text-[42px] font-bold leading-none text-foreground"
                        value={card.value}
                      />
                      <span className="text-sm font-normal text-muted-foreground">
                        {card.value === 1 ? 'Customer' : 'Customers'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col overflow-hidden rounded-md border border-[#c2c2c2] bg-card shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-[#e5e5e5] bg-[#F7F7F7] px-4 py-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Stethoscope size={13} />
                </div>
                <span className="text-sm font-bold text-black">Optom Users</span>
              </div>
              <div className="flex-1 overflow-x-auto">
                <DataGrid
                  emptyMessage="No Optom users found."
                  recordCount={optomUsersWithStatus.length}
                  table={optomTable}
                  tableLayout={{
                    dense: false,
                    headerBorder: true,
                    rowBorder: true,
                  }}
                >
                  <DataGridScrollArea>
                    <DataGridTable />
                  </DataGridScrollArea>
                </DataGrid>
              </div>
            </div>
          </div>

          <div className="flex flex-col !mt-4 overflow-hidden rounded-md border border-[#c2c2c2] bg-card shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#e5e5e5] bg-[#F7F7F7] px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Stethoscope size={13} />
                  </div>
                  <span className="text-sm font-bold text-black">Recent Customers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    className="h-9 w-56 bg-card border-border"
                    icon={Search}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    placeholder="Search customers..."
                    value={customerSearchTerm}
                  />
                  <Select
                    onValueChange={(val) => setCustomerDateRange(val as DateFilterRange)}
                    value={customerDateRange}
                  >
                    <SelectTrigger className="h-9 gap-2 rounded-md border border-border bg-card px-4 text-xs font-bold text-foreground shadow-sm hover:bg-muted">
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {DATE_FILTER_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Tabs
                className="px-4 pt-3 pb-3"
                onValueChange={(value) => {
                  setStatusTab(value as 'all' | 'Completed' | 'InProgress' | 'Pending');
                  resetPage();
                }}
                value={statusTab}
              >
                <TabsList variant="line">
                  <TabsTrigger
                    className="flex-none gap-2 text-muted-foreground underline-offset-4 data-[state=active]:font-bold data-[state=active]:text-foreground data-[state=active]:underline"
                    value="Pending"
                  >
                    Queue
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {tabCounts.pending}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    className="flex-none gap-2 text-muted-foreground underline-offset-4 data-[state=active]:font-bold data-[state=active]:text-foreground data-[state=active]:underline"
                    value="InProgress"
                  >
                    Testing
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {tabCounts.inProgress}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    className="flex-none gap-2 text-muted-foreground underline-offset-4 data-[state=active]:font-bold data-[state=active]:text-foreground data-[state=active]:underline"
                    value="Completed"
                  >
                    Completed
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {tabCounts.completed}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    className="flex-none gap-2 text-muted-foreground underline-offset-4 data-[state=active]:font-bold data-[state=active]:text-foreground data-[state=active]:underline"
                    value="all"
                  >
                    All
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {tabCounts.all}
                    </span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex-1 overflow-x-auto">
                <DataGrid
                  emptyMessage="No transactions found."
                  recordCount={paginatedCustomers.length}
                  table={customersTable}
                  tableLayout={{
                    dense: false,
                    headerBackground: true,
                    headerBorder: true,
                    rowBorder: true,
                    width: 'auto',
                  }}
                >
                  <DataGridScrollArea>
                    <DataGridTable />
                  </DataGridScrollArea>
                </DataGrid>
              </div>
            </div>
        </main>
      )}

      {collisionModalData && (
        <CollisionModal
          onCancel={() => setCollisionModalData(null)}
          onViewData={() => {
            handleSelectCustomer(collisionModalData.id);

            if (collisionModalData.targetView === 'rx') {
              setIsEditingRx(true);
              setIsEditing(false);
            } else {
              setIsEditing(true);
              setIsEditingRx(false);
            }

            setCollisionModalData(null);
          }}
          takenBy={collisionModalData.takenBy}
        />
      )}

      <Sheet
        onOpenChange={(open) => {
          if (!open) {setIsAddingNew(false);}
        }}
        open={isAddingNew}
      >
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Customer Details - {user.name}</SheetTitle>
            <p className="mt-1.5 text-sm text-[#696969]">
              Please provide the customer&apos;s details to create an accurate profile and ensure their
              information is available for future visits and service.
            </p>
          </SheetHeader>
          <StorePatientDetails
            isAddingNew
            layout="sheet"
            onBack={() => setIsAddingNew(false)}
            selectedCustomer={null}
            setSelectedCustomerId={setSelectedCustomerId}
          />
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

function formatDurationLong(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {return `${days}d ${hours}h`;}

  if (hours > 0) {return `${hours}h ${minutes}m`;}

  if (minutes > 0) {return `${minutes}m ${seconds}s`;}

  return `${seconds}s`;
}

function formatSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) {return '00m:00s';}

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${String(mins).padStart(2, '0')}m:${String(secs).padStart(2, '0')}s`;
}

function MetricCountUp({ className, value }: { className?: string; value: number; }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  useCountUp({ duration: 1, end: value, ref: ref as React.RefObject<HTMLElement> });

  return <span className={className} ref={ref} />;
}

function parseTimestamp(val: null | number | string | undefined): number {
  if (!val) {return 0;}

  if (typeof val === 'number') {return val;}

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
    const waitSecs = startMs > 0 && optomMs >= startMs ? Math.floor((optomMs - startMs) / 1000) : 0;
    const maxCallSecs = Math.max(0, 3540 - waitSecs);

    return <CallTimer active={true} maxDurationSeconds={maxCallSecs} startTime={optomCallStartTime} />;
  }

  if (cust.callDuration && cust.callDuration > 0) {
    return <span className="font-mono font-bold text-foreground">{formatSeconds(cust.callDuration)}</span>;
  }

  return <span className="text-muted-foreground">—</span>;
}

const MAX_WAITING_MS = 59 * 60 * 1000;

function renderWaitingDuration(cust: Customer, now: number) {
  const startMs = parseTimestamp(cust.createdOn);

  if (!startMs) {return <span className="text-muted-foreground">—</span>;}

  const endMs = cust.optomCallStartTime ? parseTimestamp(cust.optomCallStartTime) || now : now;
  const elapsedMs = Math.min(endMs - startMs, MAX_WAITING_MS);

  return <span className="font-mono text-xs text-foreground">{formatDurationLong(elapsedMs)}</span>;
}
