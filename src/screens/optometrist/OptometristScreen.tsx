import { type ColumnDef, useTable } from '@tanstack/react-table';
import * as React from 'react';

import type { ColumnOption, Customer, OptometristUserRow, SSEEventDetail, StatusTab } from '../../types';

import { fetchCustomersAction, updateCustomerAction } from '../../Actions/customerActions';
import { fetchUsersAction } from '../../Actions/userActions';
import { AppLayout } from '../../components/layout/AppLayout';
import { dataGridFeatures, type DataGridFeatures } from '../../components/reui/data-grid/data-grid';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { useNotificationLog } from '../../components/ui/notificationLog';
import { usePagination } from '../../hooks/usePagination';
import { cn } from '../../lib/utils';
import { PAGINATION } from '../../options/Option';
import { useAppDispatch, useAppSelector } from '../../store';
import { type DateFilterRange, filterCustomersByDate } from '../../utils/dateFilter';
import { renderCallDuration, WaitingCell } from '../store/components/cells';
import { parseTimestamp } from '../store/components/formatters';
import { OptometristActionsCell } from './components/OptometristActionsCell';
import { OptometristCard } from './components/OptometristCard';
import { OptometristPatientDetails } from './OptometristPatientDetails';

const OPTOMETRIST_TABLE_COLUMNS: ColumnOption[] = [
  { id: 'id', label: 'ID' },
  { id: 'storeName', label: 'Store Code' },
  { id: 'timeStarted', label: 'Waiting Time' },
  { id: 'callDuration', label: 'Call Duration' },
  { id: 'name', isMandatory: true, label: 'Name' },
  { id: 'age', label: 'Age' },
  { id: 'prefLang', label: 'Preferred Languages' },
  { id: 'priority', isMandatory: true, label: 'Priority' },
  { id: 'optometrist', label: 'Optometrist' },
  { id: 'status', label: 'Status' },
  { id: 'actions', isMandatory: true, label: 'Action' },
];

const QUEUE_TAB_STATUSES: readonly Customer['status'][] = ['Created', 'Queued', 'Initiated', 'Drop'];

const getQueueStatusLabel = (status: Customer['status']): string => {
  if (status === 'Accepted' || status === 'Testing') {
    return 'Testing';
  }

  if (status === 'Test Completed') {
    return 'Test Completed';
  }

  if (status === 'Completed') {
    return 'Completed';
  }

  if (status === 'Closed' || status === 'Cancelled') {
    return 'Cancelled';
  }

  if (QUEUE_TAB_STATUSES.includes(status)) {
    return 'Queued';
  }

  return status;
};

export function OptometristScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const customers = useAppSelector((state) => state.customers.customers);
  const users = useAppSelector((state) => state.users.users);
  const dispatch = useAppDispatch();

  const [selectedCustomerId, setSelectedCustomerId] = React.useState<null | string>('#0484');
  const [statusTab, setStatusTab] = React.useState<StatusTab>('Pending');
  const [dateRange, setDateRange] = React.useState<DateFilterRange>('all');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isEditing, setIsEditing] = React.useState(false);
  const [pageSize, setPageSize] = React.useState<number>(PAGINATION.OPTOMETRIST_PAGE_SIZE);

  const { addLogNotification } = useNotificationLog();

  const [columnVisibility, setColumnVisibility] = React.useState<Record<string, boolean>>({});

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

  const activeCallTakenByMe = React.useMemo(() => {
    if (!user) {
      return null;
    }

    const userNameLower = user.name.toLowerCase();
    const userEmailLower = user.email.toLowerCase();

    return (
      customers.find((c) => {
        if (!c.callActive || !c.callTakenBy) {
          return false;
        }

        const takenByLower = c.callTakenBy.toLowerCase();

        return takenByLower === userNameLower || takenByLower === userEmailLower;
      }) ?? null
    );
  }, [customers, user]);

  const dateFilteredCustomers = React.useMemo(
    () =>
      filterCustomersByDate(
        customers.filter(
          (c) =>
            c.status !== 'Closed' && c.status !== 'Cancelled' && !(c.status === 'Created' && !c.callStartTime)
        ),
        dateRange
      ),
    [customers, dateRange]
  );

  const tabCounts = React.useMemo(
    () => ({
      all: dateFilteredCustomers.length,
      completed: dateFilteredCustomers.filter(
        (c) => c.status === 'Completed' || c.status === 'Test Completed'
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

  const pendingPriorityMap = React.useMemo(() => {
    const pending = dateFilteredCustomers.filter(
      (c) => c.status === 'Created' || c.status === 'Queued' || c.status === 'Initiated'
    );

    const priorityCustomers = [...pending.filter((c) => c.isPriority)].sort(
      (a, b) => parseTimestamp(a.lastUpdatedOn) - parseTimestamp(b.lastUpdatedOn)
    );

    const normalCustomers = [...pending.filter((c) => !c.isPriority)].sort((a, b) => {
      const timeA = parseTimestamp(a.createdOn || a.callStartTime || a.lastUpdatedOn);
      const timeB = parseTimestamp(b.createdOn || b.callStartTime || b.lastUpdatedOn);

      return timeA - timeB;
    });

    const map = new Map<string, { label: string; rank: number }>();

    priorityCustomers.forEach((c, idx) =>
      map.set(c.id, { label: `High Priority ${idx + 1}`, rank: idx + 1 })
    );
    normalCustomers.forEach((c, idx) =>
      map.set(c.id, { label: `Priority ${idx + 1}`, rank: priorityCustomers.length + idx + 1 })
    );

    return map;
  }, [dateFilteredCustomers]);

  const filteredRequests = React.useMemo(() => {
    const byStatus = dateFilteredCustomers.filter((c) => {
      if (
        statusTab === 'Pending' &&
        !(c.status === 'Created' || c.status === 'Queued' || c.status === 'Initiated' || c.status === 'Drop')
      ) {
        return false;
      }

      if (statusTab === 'InProgress' && !(c.status === 'Accepted' || c.status === 'Testing')) {
        return false;
      }

      if (statusTab === 'Completed' && !(c.status === 'Completed' || c.status === 'Test Completed')) {
        return false;
      }

      return true;
    });

    const search = searchTerm.trim().toLowerCase();

    let list = byStatus;

    if (search) {
      list = byStatus.filter(
        (c) =>
          c.id.toLowerCase().includes(search) ||
          c.name.toLowerCase().includes(search) ||
          (c.storeName ?? '').toLowerCase().includes(search) ||
          (c.mobile ?? '').toLowerCase().includes(search)
      );
    }

    if (statusTab === 'Pending') {
      return [...list].sort(
        (a, b) => (pendingPriorityMap.get(a.id)?.rank ?? 0) - (pendingPriorityMap.get(b.id)?.rank ?? 0)
      );
    }

    return list;
  }, [dateFilteredCustomers, statusTab, searchTerm, pendingPriorityMap]);

  const optometristUsersWithStatus = React.useMemo<OptometristUserRow[]>(
    () =>
      users
        .filter((u) => u.role === 'optometrist')
        .map((optometristUser) => {
          if (optometristUser.status === 'inactive' || !(optometristUser.isLoggedIn ?? false)) {
            return {
              ...optometristUser,
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

          const optometristNameLower = optometristUser.name.toLowerCase();
          const optometristEmailLower = optometristUser.email.toLowerCase();

          const activeCall = customers.find((c) => {
            const isCallActiveState =
              c.status === 'Initiated' ||
              c.status === 'Accepted' ||
              c.status === 'Queued' ||
              c.status === 'Testing';

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
                  'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800',
                dotClass: 'bg-amber-500',
                ping: true,
                statusLabel: 'In Call',
              },
            };
          }

          return {
            ...optometristUser,
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

  const availablePeerDoctors = React.useMemo(
    () =>
      optometristUsersWithStatus.filter(
        (u) =>
          u.avail.statusLabel === 'Available' && u.email.toLowerCase() !== (user?.email || '').toLowerCase()
      ),
    [optometristUsersWithStatus, user?.email]
  );

  const prevPeerCountRef = React.useRef<number>(0);
  const isInitialPeerFetchRef = React.useRef(true);

  React.useEffect(() => {
    const currentCount = availablePeerDoctors.length;
    const prevCount = prevPeerCountRef.current;

    if (isInitialPeerFetchRef.current) {
      if (users.length > 0) {
        isInitialPeerFetchRef.current = false;
        prevPeerCountRef.current = currentCount;
      }

      return;
    }

    if (currentCount > 0 && prevCount === 0) {
      const names = availablePeerDoctors.map((d) => d.name).join(', ');
      addLogNotification({
        description: `${names} ${availablePeerDoctors.length > 1 ? 'are' : 'is'} online and available.`,
        title: 'Optometrist Online',
        type: 'optometrist_available',
      });
    }

    prevPeerCountRef.current = currentCount;
  }, [availablePeerDoctors, addLogNotification, users.length]);

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
                    'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
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

  const {
    currentPage,
    nextPage,
    paginatedItems: paginatedRequests,
    prevPage,
    resetPage,
    totalItems,
    totalPages,
  } = usePagination(filteredRequests, pageSize);

  const handleToggleColumn = React.useCallback((columnId: string) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [columnId]: prev[columnId] === false ? true : false,
    }));
  }, []);

  const handleResetColumns = React.useCallback(() => {
    setColumnVisibility({});
  }, []);

  const currentTabColumns = React.useMemo(() => {
    if (statusTab === 'Pending') {
      return OPTOMETRIST_TABLE_COLUMNS.filter(
        (col) => col.id !== 'callDuration' && col.id !== 'optometrist' && col.id !== 'status'
      );
    }

    if (statusTab === 'all') {
      return OPTOMETRIST_TABLE_COLUMNS.filter((col) => col.id !== 'priority');
    }

    return OPTOMETRIST_TABLE_COLUMNS.filter((col) => col.id !== 'priority' && col.id !== 'status');
  }, [statusTab]);

  const visibleColumnIds = React.useMemo(
    () =>
      currentTabColumns
        .filter((col) => col.isMandatory || columnVisibility?.[col.id] !== false)
        .map((col) => col.id),
    [columnVisibility, currentTabColumns]
  );

  const requestColumns = React.useMemo<ColumnDef<DataGridFeatures, Customer>[]>(() => {
    const allColumns: ColumnDef<DataGridFeatures, Customer>[] = [
      {
        accessorKey: 'id',
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
            {row.original.id}
          </span>
        ),
        enableSorting: false,
        header: () => (
          <span className="whitespace-nowrap text-sm font-semibold text-muted-foreground">ID</span>
        ),
        id: 'id',
        meta: { cellClassName: 'py-3' },
        size: 80,
      },
      {
        accessorKey: 'storeName',
        cell: ({ row }) => (
          <span className="text-sm font-medium text-foreground sm:text-sm">
            {row.original.storeName || '—'}
          </span>
        ),
        enableSorting: false,
        header: () => (
          <span className="whitespace-nowrap text-sm font-semibold text-muted-foreground">Store Code</span>
        ),
        id: 'storeName',
        meta: { cellClassName: 'py-3' },
        size: 130,
      },
      {
        cell: ({ row }) => <WaitingCell cust={row.original} />,
        enableSorting: false,
        header: () => (
          <span className="whitespace-nowrap text-sm font-semibold text-muted-foreground">Waiting Time</span>
        ),
        id: 'timeStarted',
        meta: { cellClassName: 'py-3' },
        size: 120,
      },
      {
        accessorKey: 'callDuration',
        cell: ({ row }) => renderCallDuration(row.original),
        enableSorting: false,
        header: () => (
          <span className="whitespace-nowrap text-sm font-semibold text-muted-foreground">Call Duration</span>
        ),
        id: 'callDuration',
        meta: { cellClassName: 'py-3' },
        size: 120,
      },
      {
        accessorKey: 'age',
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.age}</span>,
        enableSorting: false,
        header: () => (
          <span className="whitespace-nowrap text-sm font-semibold text-muted-foreground">Age</span>
        ),
        id: 'age',
        meta: { cellClassName: 'py-3' },
        size: 60,
      },
      {
        accessorKey: 'name',
        cell: ({ row }) => {
          const initials = row.original.name
            .split(' ')
            .map((w) => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
          const titleCaseName = row.original.name.replace(/\b\w/g, (c) => c.toUpperCase());

          return (
            <div className="flex items-center gap-2.5">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-teal-100 text-sm font-semibold text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground sm:text-sm">{titleCaseName}</span>
            </div>
          );
        },
        enableSorting: false,
        header: () => (
          <span className="whitespace-nowrap text-sm font-semibold text-muted-foreground">Name</span>
        ),
        id: 'name',
        meta: { cellClassName: 'py-3' },
        size: 190,
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
                  <span
                    className="inline-flex rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    key={lang}
                  >
                    {lang}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
          );
        },
        enableSorting: false,
        header: () => (
          <span className="whitespace-nowrap text-sm font-semibold text-muted-foreground">
            Preferred Languages
          </span>
        ),
        id: 'prefLang',
        meta: { cellClassName: 'py-3' },
        size: 200,
      },
      {
        cell: ({ row }) => {
          const info = pendingPriorityMap.get(row.original.id);

          if (!info) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }

          return (
            <span
              className={cn(
                'inline-flex rounded-md border px-2.5 py-0.5 text-sm font-medium',
                row.original.isPriority
                  ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300'
                  : 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300'
              )}
            >
              {info.label}
            </span>
          );
        },
        enableSorting: false,
        header: () => (
          <span className="whitespace-nowrap text-sm font-semibold text-muted-foreground">Priority</span>
        ),
        id: 'priority',
        meta: { cellClassName: 'py-3' },
        size: 110,
      },
      {
        accessorKey: 'callTakenBy',
        cell: ({ row }) => (
          <span className="text-sm font-medium text-foreground sm:text-sm">
            {row.original.callTakenBy || '—'}
          </span>
        ),
        enableSorting: false,
        header: () => (
          <span className="whitespace-nowrap text-sm font-semibold text-muted-foreground">Optometrist</span>
        ),
        id: 'optometrist',
        meta: { cellClassName: 'py-3' },
        size: 150,
      },
      {
        accessorKey: 'status',
        cell: ({ row }) => {
          const label = getQueueStatusLabel(row.original.status);
          const badgeClass =
            label === 'Testing'
              ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
              : label === 'Completed'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';

          return (
            <span
              className={cn('inline-flex rounded-md border px-2.5 py-0.5 text-sm font-medium', badgeClass)}
            >
              {label}
            </span>
          );
        },
        enableSorting: false,
        header: () => (
          <span className="whitespace-nowrap text-sm font-semibold text-muted-foreground">Status</span>
        ),
        id: 'status',
        meta: { cellClassName: 'py-3' },
        size: 110,
      },
      {
        cell: ({ row }) => (
          <OptometristActionsCell
            activeCallTakenByMe={activeCallTakenByMe}
            onSelectCustomer={setSelectedCustomerId}
            onSetEditing={setIsEditing}
            req={row.original}
            user={user}
          />
        ),
        enableSorting: false,
        header: () => (
          <span className="block whitespace-nowrap pr-4 text-right text-sm font-semibold text-muted-foreground">
            Action
          </span>
        ),
        id: 'actions',
        meta: { cellClassName: 'text-right py-3 pr-4' },
        size: 100,
      },
    ];

    if (statusTab === 'Pending') {
      return allColumns.filter(
        (col) => col.id !== 'callDuration' && col.id !== 'optometrist' && col.id !== 'status'
      );
    }

    if (statusTab === 'all') {
      return allColumns.filter((col) => col.id !== 'priority');
    }

    return allColumns.filter((col) => col.id !== 'priority' && col.id !== 'status');
  }, [user, activeCallTakenByMe, pendingPriorityMap, statusTab]);

  const requestsTable = useTable({
    columns: requestColumns,
    data: paginatedRequests,
    features: dataGridFeatures,
    getRowId: (row: Customer) => row.id,
    onColumnVisibilityChange: () => undefined,
    onPaginationChange: () => undefined,
    pageCount: 1,
    state: {
      columnVisibility,
      pagination: { pageIndex: 0, pageSize: Math.max(paginatedRequests.length, 1) },
    },
  });

  if (!user) {
    return null;
  }

  return (
    <AppLayout
      onSelectCustomer={(id) => {
        setSelectedCustomerId(id);
        setIsEditing(true);
      }}
    >
      {isEditing ? (
        <OptometristPatientDetails
          activeCallTakenByMe={activeCallTakenByMe}
          onBack={() => setIsEditing(false)}
          readOnly={statusTab === 'all'}
          selectedCustomer={selectedCustomer}
        />
      ) : (
        <main className="font-pro mx-auto w-full max-w-[1400px] flex-1 space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6 md:px-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-[28px] font-semibold leading-tight text-foreground">Optometrist Console</h1>
              <p className="mt-0.5 text-sm font-normal text-muted-foreground">{user.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            <OptometristCard tabCounts={tabCounts} variant="metrics" />
            <OptometristCard
              data={optometristUsersWithStatus}
              storeData={storeUsersWithStatus}
              variant="optometrist-users"
            />
          </div>

          <OptometristCard
            columns={currentTabColumns}
            currentPage={currentPage}
            data={paginatedRequests}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onNextPage={nextPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              resetPage();
            }}
            onPrevPage={prevPage}
            onResetColumns={handleResetColumns}
            onSearchChange={setSearchTerm}
            onStatusTabChange={(tab) => {
              setStatusTab(tab);
              resetPage();
            }}
            onToggleColumn={handleToggleColumn}
            pageSize={pageSize}
            requestsTable={requestsTable}
            searchValue={searchTerm}
            statusTab={statusTab}
            tabCounts={tabCounts}
            totalItems={totalItems}
            totalPages={totalPages}
            variant="incoming-requests"
            visibleColumns={visibleColumnIds}
          />
        </main>
      )}
    </AppLayout>
  );
}
