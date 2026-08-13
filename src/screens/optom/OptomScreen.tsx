import { type ColumnDef, useTable } from '@tanstack/react-table';
import { Bell } from 'lucide-react';
import * as React from 'react';

import type {
  CollisionModalData,
  ColumnOption,
  Customer,
  OptomUserRow,
  SSEEventDetail,
  StatusTab,
} from '../../types';

import { fetchCustomersAction, updateCustomerAction } from '../../Actions/customerActions';
import { fetchUsersAction } from '../../Actions/userActions';
import { AppLayout } from '../../components/layout/AppLayout';
import { dataGridFeatures, type DataGridFeatures } from '../../components/reui/data-grid/data-grid';
import { CollisionModal } from '../../components/shared/CollisionModal';
import { Button } from '../../components/ui/button';
import { usePagination } from '../../hooks/usePagination';
import { PAGINATION } from '../../options/Option';
import { useAppDispatch, useAppSelector } from '../../store';
import { type DateFilterRange, filterCustomersByDate } from '../../utils/dateFilter';
import { renderCallDuration, WaitingCell } from '../store/components/cells';
import { OptomActionsCell } from './components/OptomActionsCell';
import { OptomCard } from './components/OptomCard';
import { OptomPatientDetails } from './OptomPatientDetails';

const OPTOM_TABLE_COLUMNS: ColumnOption[] = [
  { id: 'id', label: 'ID' },
  { id: 'storeName', label: 'Store Name' },
  { id: 'timeStarted', label: 'Waiting Time' },
  { id: 'callDuration', label: 'Call Duration' },
  { id: 'name', isMandatory: true, label: 'Patient Name' },
  { id: 'age', label: 'Age' },
  { id: 'prefLang1', label: 'Pref. Lang 1' },
  { id: 'prefLang2', label: 'Pref. Lang 2' },
  { id: 'actions', isMandatory: true, label: 'Actions' },
];

export function OptomScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const customers = useAppSelector((state) => state.customers.customers);
  const users = useAppSelector((state) => state.users.users);
  const dispatch = useAppDispatch();

  // ── Local UI State ──────────────────────────────────────────────────
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<null | string>('#0484');
  const [statusTab, setStatusTab] = React.useState<StatusTab>('all');
  const [dateRange, setDateRange] = React.useState<DateFilterRange>('all');
  const [isEditing, setIsEditing] = React.useState(false);
  const [pageSize, setPageSize] = React.useState<number>(PAGINATION.OPTOM_PAGE_SIZE);
  const [isNarrowScreen, setIsNarrowScreen] = React.useState(false);

  const [columnVisibility, setColumnVisibility] = React.useState<Record<string, boolean>>({});
  const [collisionModalData, setCollisionModalData] = React.useState<CollisionModalData | null>(null);

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

  // ── Call Timeout Checks ─────────────────────────────────────────────
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

  // ── Derived State & Memos ───────────────────────────────────────────
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
    () => filterCustomersByDate(customers, dateRange),
    [customers, dateRange]
  );

  const tabCounts = React.useMemo(
    () => ({
      all: dateFilteredCustomers.length,
      completed: dateFilteredCustomers.filter((c) => c.status === 'Completed' || c.status === 'Closed')
        .length,
      inProgress: dateFilteredCustomers.filter((c) => c.status === 'Initiated' || c.status === 'Accepted')
        .length,
      pending: dateFilteredCustomers.filter((c) => c.status === 'Created').length,
    }),
    [dateFilteredCustomers]
  );

  const filteredRequests = React.useMemo(
    () =>
      dateFilteredCustomers.filter((c) => {
        if (statusTab === 'Pending' && c.status !== 'Created') {
          return false;
        }

        if (statusTab === 'InProgress' && !(c.status === 'Initiated' || c.status === 'Accepted')) {
          return false;
        }

        if (statusTab === 'Completed' && !(c.status === 'Completed' || c.status === 'Closed')) {
          return false;
        }

        return true;
      }),
    [dateFilteredCustomers, statusTab]
  );

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

  // ── Pagination ──────────────────────────────────────────────────────
  const {
    currentPage,
    nextPage,
    paginatedItems: paginatedRequests,
    prevPage,
    resetPage,
    totalItems,
    totalPages,
  } = usePagination(filteredRequests, pageSize);

  // ── Column Control Handlers ─────────────────────────────────────────
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
      OPTOM_TABLE_COLUMNS.filter((col) => col.isMandatory || columnVisibility[col.id] !== false).map(
        (col) => col.id
      ),
    [columnVisibility]
  );

  // ── DataGrid Column Definitions ─────────────────────────────────────
  const requestColumns = React.useMemo<ColumnDef<DataGridFeatures, Customer>[]>(
    () => [
      {
        accessorKey: 'id',
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{row.original.id}</span>
        ),
        enableSorting: false,
        header: () => (
          <span className="whitespace-nowrap text-xs font-bold uppercase text-muted-foreground">ID</span>
        ),
        id: 'id',
        meta: { cellClassName: 'py-3', headerClassName: 'w-[80px]' },
        size: 80,
      },
      {
        accessorKey: 'storeName',
        cell: ({ row }) => (
          <span className="text-xs font-medium text-foreground">{row.original.storeName || '—'}</span>
        ),
        enableSorting: false,
        header: () => (
          <span className="whitespace-nowrap text-xs font-bold uppercase text-muted-foreground">
            Store Name
          </span>
        ),
        id: 'storeName',
        meta: { cellClassName: 'py-3', headerClassName: 'min-w-[130px]' },
        size: 130,
      },
      {
        cell: ({ row }) => <WaitingCell cust={row.original} />,
        enableSorting: false,
        header: () => (
          <span className="whitespace-nowrap text-xs font-bold uppercase text-muted-foreground">
            Waiting Time
          </span>
        ),
        id: 'timeStarted',
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
        meta: { cellClassName: 'py-3', headerClassName: 'min-w-[120px]' },
        size: 120,
      },
      {
        accessorKey: 'name',
        cell: ({ row }) => <span className="text-xs font-semibold text-foreground">{row.original.name}</span>,
        enableSorting: false,
        header: () => (
          <span className="whitespace-nowrap text-xs font-bold uppercase text-muted-foreground">
            Patient Name
          </span>
        ),
        id: 'name',
        meta: { cellClassName: 'py-3', headerClassName: 'min-w-[150px]' },
        size: 150,
      },
      {
        accessorKey: 'age',
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.age}</span>,
        enableSorting: false,
        header: () => (
          <span className="whitespace-nowrap text-xs font-bold uppercase text-muted-foreground">Age</span>
        ),
        id: 'age',
        meta: { cellClassName: 'py-3', headerClassName: 'w-[60px]' },
        size: 60,
      },
      {
        accessorKey: 'preferredLanguage',
        cell: ({ row }) => (
          <span className="inline-flex rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {row.original.preferredLanguage}
          </span>
        ),
        enableSorting: false,
        header: () => (
          <span className="whitespace-nowrap text-xs font-bold uppercase text-muted-foreground">
            Pref. Lang 1
          </span>
        ),
        id: 'prefLang1',
        meta: { cellClassName: 'py-3', headerClassName: 'min-w-[120px]' },
        size: 120,
      },
      {
        accessorKey: 'preferredLanguage2',
        cell: ({ row }) =>
          row.original.preferredLanguage2 && row.original.preferredLanguage2 !== 'None' ? (
            <span className="inline-flex rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
              {row.original.preferredLanguage2}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground">—</span>
          ),
        enableSorting: false,
        header: () => (
          <span className="whitespace-nowrap text-xs font-bold uppercase text-muted-foreground">
            Pref. Lang 2
          </span>
        ),
        id: 'prefLang2',
        meta: { cellClassName: 'py-3', headerClassName: 'min-w-[120px]' },
        size: 120,
      },
      {
        cell: ({ row }) => (
          <OptomActionsCell
            activeCallTakenByMe={activeCallTakenByMe}
            onSelectCustomer={setSelectedCustomerId}
            onSetCollision={setCollisionModalData}
            onSetEditing={setIsEditing}
            req={row.original}
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
        meta: { cellClassName: 'text-right py-3 pr-4', headerClassName: 'min-w-[100px] text-right pr-4' },
        size: 100,
      },
    ],
    [user, activeCallTakenByMe]
  );

  const requestsTable = useTable({
    columns: requestColumns,
    data: paginatedRequests,
    features: dataGridFeatures,
    getRowId: (row: Customer) => row.id,
    onColumnVisibilityChange: () => undefined,
    onPaginationChange: () => undefined,
    pageCount: 1,
    state: {
      columnVisibility: {
        ...columnVisibility,
        prefLang2: columnVisibility.prefLang2 ?? !isNarrowScreen,
      },
      pagination: { pageIndex: 0, pageSize: Math.max(paginatedRequests.length, 1) },
    },
  });

  if (!user) {
    return null;
  }

  return (
    <AppLayout
      consoleLabel="Optom Console"
      onSelectCustomer={(id) => {
        setSelectedCustomerId(id);
        setIsEditing(true);
      }}
    >
      {isEditing ? (
        <OptomPatientDetails onBack={() => setIsEditing(false)} selectedCustomer={selectedCustomer} />
      ) : (
        <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6 md:px-8">
          {/* ── Page Header ── */}
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-[28px] font-semibold leading-tight text-foreground">
                Optom Consultation Console
              </h1>
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
            </div>
          </div>

          {/* ── Row 1: Metrics (left) + Optom Users table (right) ── */}
          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            <OptomCard tabCounts={tabCounts} variant="metrics" />
            <OptomCard data={optomUsersWithStatus} variant="optom-users" />
          </div>

          {/* ── Row 2: Incoming Requests table ── */}
          <OptomCard
            columns={OPTOM_TABLE_COLUMNS}
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
            onStatusTabChange={(tab) => {
              setStatusTab(tab);
              resetPage();
            }}
            onToggleColumn={handleToggleColumn}
            pageSize={pageSize}
            requestsTable={requestsTable}
            statusTab={statusTab}
            tabCounts={tabCounts}
            totalItems={totalItems}
            totalPages={totalPages}
            variant="incoming-requests"
            visibleColumns={visibleColumnIds}
          />
        </main>
      )}

      {collisionModalData && (
        <CollisionModal
          onCancel={() => setCollisionModalData(null)}
          onViewData={() => {
            setSelectedCustomerId(collisionModalData.id);
            setIsEditing(true);
            setCollisionModalData(null);
          }}
          takenBy={collisionModalData.takenBy}
        />
      )}
    </AppLayout>
  );
}
