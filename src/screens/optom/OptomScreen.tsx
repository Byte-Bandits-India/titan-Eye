import { RefreshCw } from 'lucide-react';
import * as React from 'react';

import type { ColumnOption, Customer } from '../../types';

import { fetchCustomersAction, updateCustomerAction } from '../../Actions/customerActions';
import { fetchUsersAction } from '../../Actions/userActions';
import { AppLayout } from '../../components/layout/AppLayout';
import { CollisionModal } from '../../components/shared/CollisionModal';
import { ColumnVisibilityDropdown } from '../../components/shared/ColumnVisibilityDropdown';
import { DateFilter } from '../../components/shared/DateFilter';
import { OptomUsersPanel } from '../../components/shared/OptomUsersPanel';
import { PaginationBar } from '../../components/shared/PaginationBar';
import { StatsGrid } from '../../components/shared/StatsGrid';
import { Button } from '../../components/ui/button';
import { CallTimer } from '../../components/ui/CallTimer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { useToast } from '../../components/ui/toast';
import { usePagination } from '../../hooks/usePagination';
import { PAGINATION } from '../../options/Option';
import { useAppDispatch, useAppSelector } from '../../store';
import { type DateFilterRange, filterCustomersByDate } from '../../utils/dateFilter';
import { OptomPatientDetails } from './OptomPatientDetails';

const OPTOM_TABLE_COLUMNS: ColumnOption[] = [
  { id: 'id', label: 'ID' },
  { id: 'storeName', label: 'Store Name' },
  { id: 'timeStarted', label: 'Time Started' },
  { id: 'callDuration', label: 'Call Duration' },
  { id: 'name', isMandatory: true, label: 'Patient Name' },
  { id: 'age', label: 'Age' },
  { id: 'prefLang1', label: 'Pref. Lang 1' },
  { id: 'prefLang2', label: 'Pref. Lang 2' },
  { id: 'actions', isMandatory: true, label: 'Actions' },
];
const DEFAULT_OPTOM_COLUMNS = ['id', 'storeName', 'callDuration', 'name', 'prefLang1', 'actions'];

export function OptomScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const customers = useAppSelector((state) => state.customers.customers);
  const users = useAppSelector((state) => state.users.users);
  const dispatch = useAppDispatch();

  const [selectedCustomerId, setSelectedCustomerId] = React.useState<null | string>('#0484');
  const [statusTab, setStatusTab] = React.useState<'all' | 'Completed' | 'InProgress' | 'Pending'>('all');
  const [dateRange, setDateRange] = React.useState<DateFilterRange>('all');
  const [isEditing, setIsEditing] = React.useState(false);

  const dateFilteredCustomers = React.useMemo(() => filterCustomersByDate(customers, dateRange), [customers, dateRange]);

  const [isSyncing, setIsSyncing] = React.useState(false);
  const [pageSize, setPageSize] = React.useState<number>(PAGINATION.OPTOM_PAGE_SIZE);
  const [collisionModalData, setCollisionModalData] = React.useState<null | {
    id: string;
    name: string;
    takenBy: string;
  }>(null);
  const { toast } = useToast();

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

  const handleCloseCall = React.useCallback(async (customerId: string) => {
    try {
      const customer = customers.find(c => c.id === customerId);

      if (customer && customer.status === 'Initiated') {
        const timestamp = new Date().toLocaleString('en-US', {
          day: 'numeric', hour: 'numeric', hour12: true,
          minute: 'numeric', month: 'short', second: 'numeric', year: 'numeric',
        });
        await dispatch(updateCustomerAction(customerId, {
          ...customer,
          callActive: false,
          callTakenBy: null,
          lastUpdatedOn: timestamp,
          status: 'Closed'
        }));
      }
    } catch (e) {
      console.error('Failed to close call:', e);
    }
  }, [customers, dispatch]);

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

          if (!isNaN(startMs) && (now - startMs) >= 3540000) {
            handleCloseCall(cust.id);
          }
        }
      });
    };

    checkTimeout();
    const interval = setInterval(checkTimeout, 5000);

    return () => clearInterval(interval);
  }, [customers, handleCloseCall]);

  const isTakenByAnotherDoctor = React.useCallback(
    (req: Customer) => {
      if (!req.callActive || !req.callTakenBy) {return false;}

      if (req.callTakenBy === user?.name || req.callTakenBy === user?.email) {return false;}

      const takenByLower = req.callTakenBy.toLowerCase();

      if (takenByLower.startsWith('dr.')) {return true;}

      return users.some(
        (u) =>
          u.role === 'optom' &&
          (u.name.toLowerCase() === takenByLower || u.email.toLowerCase() === takenByLower)
      );
    },
    [user, users]
  );

  const activeCallTakenByMe = React.useMemo(() => {
    if (!user) {return null;}

    const userNameLower = user.name.toLowerCase();
    const userEmailLower = user.email.toLowerCase();

    return customers.find((c) => {
      if (!c.callActive || !c.callTakenBy) {return false;}

      const takenByLower = c.callTakenBy.toLowerCase();

      return takenByLower === userNameLower || takenByLower === userEmailLower;
    });
  }, [user, customers]);

  const selectedCustomer = React.useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  // A 'Created' customer that already has a callStartTime was requested at
  // least once and released back to the queue after every Optom ignored or
  // timed out - it should keep showing up as a request, not disappear as if
  // it had never been called. A 'Created' customer with no callStartTime is a
  // fresh registration the store hasn't requested yet, so that one stays out.
  const wasRequested = React.useCallback(
    (c: Customer) => c.status !== 'Created' || Boolean(c.callStartTime),
    [],
  );

  const tabCounts = React.useMemo(() => {
    const reqs = dateFilteredCustomers.filter(wasRequested);

    return {
      all: reqs.length,
      completed: reqs.filter((c) => c.status === 'Completed' || c.status === 'Closed').length,
      inProgress: reqs.filter((c) => c.status === 'Initiated' || c.status === 'Accepted').length,
      pending: dateFilteredCustomers.filter((c) => c.status === 'Created' && wasRequested(c)).length,
    };
  }, [dateFilteredCustomers, wasRequested]);

  const incomingRequests = React.useMemo(
    () => dateFilteredCustomers.filter((c) => {
      if (statusTab === 'Pending') {return c.status === 'Created' && wasRequested(c);}

      if (statusTab === 'InProgress') {return c.status === 'Initiated' || c.status === 'Accepted';}

      if (statusTab === 'Completed') {return c.status === 'Completed' || c.status === 'Closed';}

      return wasRequested(c);
    }),
    [dateFilteredCustomers, statusTab, wasRequested],
  );

  const [visibleColumns, setVisibleColumns] = React.useState<string[]>(DEFAULT_OPTOM_COLUMNS);

  const handleToggleColumn = (id: string) => {
    setVisibleColumns((prev) =>
      prev.includes(id) ? prev.filter((col) => col !== id) : [...prev, id]
    );
  };

  const {
    currentPage,
    nextPage,
    paginatedItems: paginatedRequests,
    prevPage,
    resetPage,
    totalItems,
    totalPages,
  } = usePagination(incomingRequests, pageSize);

  const handlePageSizeChange = React.useCallback((newSize: number) => {
    setPageSize(newSize);
    resetPage();
  }, [resetPage]);

  const handleResetSync = () => {
    setIsSyncing(true);
    dispatch(fetchCustomersAction()).then(() => {
      setIsSyncing(false);
      toast({
        description: 'Dashboard feed has been successfully updated.',
        title: 'Feed Synced',
        type: 'success',
      });
    }).catch(() => {
      setIsSyncing(false);
    });
  };

  if (!user) {return null;}

  return (
    <AppLayout
      consoleLabel="Optom Console"
      onSelectCustomer={(id) => {
        setSelectedCustomerId(id);
        setIsEditing(true);
      }}
    >
      {isEditing ? (
        <OptomPatientDetails
          onBack={() => setIsEditing(false)}
          selectedCustomer={selectedCustomer}
        />
      ) : (
        <main className="flex-1 px-3 sm:px-6 md:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 w-full max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-foreground">Optom Consultation Console</h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-muted-foreground">Manage live tele-consultations and patient prescriptions</p>
            </div>
          </div>

          <StatsGrid customers={dateFilteredCustomers} />

          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-1 min-w-0 w-full bg-white dark:bg-card min-h-[450px] rounded-xl border border-gray-200 dark:border-border shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-gray-100 dark:border-border flex flex-col gap-3 bg-slate-50/50 dark:bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-xs sm:text-sm font-bold text-gray-800 dark:text-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
                      Incoming Requests
                    </div>
                    <div className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-extrabold rounded-md">
                      LIVE
                    </div>
                  </div>

                  <Button
                    className="w-7 h-7 cursor-pointer"
                    onClick={handleResetSync}
                    size="icon"
                    title="Force Refresh Feed"
                    variant="ghost"
                  >
                    <RefreshCw
                      className={`text-gray-400 ${isSyncing ? 'animate-spin' : ''}`}
                      size={12}
                    />
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto w-full sm:w-auto max-w-full [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <button
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                        statusTab === 'all' ? 'bg-white dark:bg-card text-gray-900 dark:text-foreground shadow-sm' : 'text-gray-500 dark:text-muted-foreground hover:text-gray-800'
                      }`}
                      onClick={() => { setStatusTab('all'); resetPage(); }}
                      type="button"
                    >
                      <span>All</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-200 dark:bg-muted text-gray-700 dark:text-muted-foreground font-semibold">{tabCounts.all}</span>
                    </button>
                    <button
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                        statusTab === 'Pending' ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 shadow-sm border border-slate-300 dark:border-slate-700' : 'text-gray-500 dark:text-muted-foreground hover:text-gray-800'
                      }`}
                      onClick={() => { setStatusTab('Pending'); resetPage(); }}
                      type="button"
                    >
                      <span>Pending</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 font-semibold">{tabCounts.pending}</span>
                    </button>
                    <button
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                        statusTab === 'InProgress' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 shadow-sm border border-indigo-200 dark:border-indigo-800' : 'text-gray-500 dark:text-muted-foreground hover:text-gray-800'
                      }`}
                      onClick={() => { setStatusTab('InProgress'); resetPage(); }}
                      type="button"
                    >
                      <span>In Progress</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 font-semibold">{tabCounts.inProgress}</span>
                    </button>
                    <button
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                        statusTab === 'Completed' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-sm border border-emerald-200 dark:border-emerald-800' : 'text-gray-500 dark:text-muted-foreground hover:text-gray-800'
                      }`}
                      onClick={() => { setStatusTab('Completed'); resetPage(); }}
                      type="button"
                    >
                      <span>Completed</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 font-semibold">{tabCounts.completed}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <DateFilter onChange={setDateRange} value={dateRange} />
                    <ColumnVisibilityDropdown
                      columns={OPTOM_TABLE_COLUMNS}
                      onResetColumns={() => setVisibleColumns(DEFAULT_OPTOM_COLUMNS)}
                      onToggleColumn={handleToggleColumn}
                      visibleColumns={visibleColumns}
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 w-full overflow-x-auto">
                <Table className="min-w-[900px]">
                  <TableHeader>
                    <TableRow>
                      {visibleColumns.includes('id') && (
                        <TableHead className="w-[80px] font-bold text-xs uppercase text-gray-400 whitespace-nowrap">
                          ID
                        </TableHead>
                      )}
                      {visibleColumns.includes('storeName') && (
                        <TableHead className="min-w-[130px] font-bold text-xs uppercase text-gray-400 whitespace-nowrap">
                          Store Name
                        </TableHead>
                      )}
                      {visibleColumns.includes('timeStarted') && (
                        <TableHead className="min-w-[120px] font-bold text-xs uppercase text-gray-400 whitespace-nowrap">
                          Time Started
                        </TableHead>
                      )}
                      {visibleColumns.includes('callDuration') && (
                        <TableHead className="min-w-[120px] font-bold text-xs uppercase text-gray-400 whitespace-nowrap">
                          Call Duration
                        </TableHead>
                      )}
                      {visibleColumns.includes('name') && (
                        <TableHead className="min-w-[150px] font-bold text-xs uppercase text-gray-400 whitespace-nowrap">
                          Patient Name
                        </TableHead>
                      )}
                      {visibleColumns.includes('age') && (
                        <TableHead className="min-w-[60px] font-bold text-xs uppercase text-gray-400 whitespace-nowrap">
                          Age
                        </TableHead>
                      )}
                      {visibleColumns.includes('prefLang1') && (
                        <TableHead className="min-w-[120px] font-bold text-xs uppercase text-gray-400 whitespace-nowrap">
                          Pref. Lang 1
                        </TableHead>
                      )}
                      {visibleColumns.includes('prefLang2') && (
                        <TableHead className="min-w-[120px] font-bold text-xs uppercase text-gray-400 whitespace-nowrap">
                          Pref. Lang 2
                        </TableHead>
                      )}
                      {visibleColumns.includes('actions') && (
                        <TableHead className="w-[80px] text-right whitespace-nowrap"></TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRequests.length === 0 ? (
                      <TableRow>
                        <TableCell className="text-center py-8 text-gray-400" colSpan={visibleColumns.length}>
                          No pending requests in queue.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRequests.map((req) => (
                        <TableRow
                          className={`transition-colors ${
                            selectedCustomerId === req.id
                              ? 'bg-blue-50/50 hover:bg-blue-50/70'
                              : 'hover:bg-slate-50/50'
                          }`}
                          key={req.id}
                        >
                          {visibleColumns.includes('id') && (
                            <TableCell className="font-semibold text-blue-600 text-xs py-3">
                              {req.id}
                            </TableCell>
                          )}
                          {visibleColumns.includes('storeName') && (
                            <TableCell className="text-gray-600 text-xs py-3">
                              {req.storeName || '—'}
                            </TableCell>
                          )}
                          {visibleColumns.includes('timeStarted') && (
                            <TableCell className="text-gray-600 text-xs py-3">
                              {renderTimeStarted(req)}
                            </TableCell>
                          )}
                          {visibleColumns.includes('callDuration') && (
                            <TableCell className="text-gray-600 text-xs py-3">
                              {renderCallDuration(req)}
                            </TableCell>
                          )}
                          {visibleColumns.includes('name') && (
                            <TableCell className="font-semibold text-gray-800 text-xs py-3">
                              {req.name}
                            </TableCell>
                          )}
                          {visibleColumns.includes('age') && (
                            <TableCell className="text-gray-600 text-xs py-3">{req.age}</TableCell>
                          )}
                          {visibleColumns.includes('prefLang1') && (
                            <TableCell className="py-3">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold rounded">
                                {req.preferredLanguage}
                              </span>
                            </TableCell>
                          )}
                          {visibleColumns.includes('prefLang2') && (
                            <TableCell className="py-3">
                              {req.preferredLanguage2 && req.preferredLanguage2 !== 'None' ? (
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold rounded">
                                  {req.preferredLanguage2}
                                </span>
                              ) : (
                                <span className="text-gray-300 text-[10px]">—</span>
                              )}
                            </TableCell>
                          )}
                          {visibleColumns.includes('actions') && (
                            <TableCell className="py-3 text-right">
                              <Button
                                className="h-7 px-3 text-[10px] font-bold rounded-[50px] cursor-pointer"
                                onClick={() => {
                                  if (isTakenByAnotherDoctor(req)) {
                                    setCollisionModalData({
                                      id: req.id,
                                      name: req.name,
                                      takenBy: req.callTakenBy || 'another agent',
                                    });
                                  } else if (activeCallTakenByMe && activeCallTakenByMe.id !== req.id) {
                                    setCollisionModalData({
                                      id: req.id,
                                      name: req.name,
                                      takenBy: `you (${user.name} - active call #${activeCallTakenByMe.id} in progress)`,
                                    });
                                  } else {
                                    setSelectedCustomerId(req.id);
                                    setIsEditing(true);
                                  }
                                }}
                                size="sm"
                                variant="default"
                              >
                                View
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
                currentPage={currentPage}
                itemsPerPage={pageSize}
                onItemsPerPageChange={handlePageSizeChange}
                onNext={nextPage}
                onPrev={prevPage}
                totalItems={totalItems}
                totalPages={totalPages}
              />
            </div>

            <OptomUsersPanel />
          </div>
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

function formatSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) {return '00m:00s';}

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${String(mins).padStart(2, '0')}m:${String(secs).padStart(2, '0')}s`;
}

function parseTimestamp(val: null | number | string | undefined): number {
  if (!val) {return 0;}

  if (typeof val === 'number') {return val;}

  const num = parseInt(val, 10);

  if (!isNaN(num) && String(num).length >= 10) {return num;}

  const dateMs = new Date(val).getTime();

  return isNaN(dateMs) ? 0 : dateMs;
}

function renderCallDuration(req: Customer) {
  if (req.callActive && req.optomCallStartTime) {
    const startMs = parseTimestamp(req.callStartTime);
    const optomMs = parseTimestamp(req.optomCallStartTime);
    const waitSecs = (startMs > 0 && optomMs >= startMs) ? Math.floor((optomMs - startMs) / 1000) : 0;
    const maxCallSecs = Math.max(0, 3540 - waitSecs);

    return <CallTimer active={true} maxDurationSeconds={maxCallSecs} startTime={req.optomCallStartTime} />;
  }

  if (req.callDuration && req.callDuration > 0) {
    return <span className="font-mono font-bold text-gray-800">{formatSeconds(req.callDuration)}</span>;
  }

  return <span className="text-gray-400">—</span>;
}

function renderTimeStarted(req: Customer) {
  if (req.status === 'Closed') {
    return <span className="font-mono text-gray-700 font-bold">59m:00s</span>;
  }

  const isWaitingForOptom = req.status === 'Initiated' && !req.optomCallStartTime && req.callActive;

  if (isWaitingForOptom && req.callStartTime) {
    const startMs = parseTimestamp(req.callStartTime);

    if (startMs > 0 && (Date.now() - startMs) >= 3540000) {
      return <span className="font-mono text-gray-700 font-bold">59m:00s</span>;
    }

    return <CallTimer active={true} maxDurationSeconds={3540} startTime={req.callStartTime} />;
  }

  if (req.callStartTime && req.optomCallStartTime) {
    const startMs = parseTimestamp(req.callStartTime);
    const optomMs = parseTimestamp(req.optomCallStartTime);

    if (startMs > 0 && optomMs >= startMs) {
      const waitSecs = Math.floor((optomMs - startMs) / 1000);

      return <span className="font-mono text-gray-700 font-bold">{formatSeconds(Math.min(waitSecs, 3540))}</span>;
    }
  }

  if (req.callStartTime) {
    const startMs = parseTimestamp(req.callStartTime);

    if (startMs > 0) {
      const endMs = parseTimestamp(req.lastUpdatedOn) || Date.now();
      const waitSecs = endMs >= startMs ? Math.floor((endMs - startMs) / 1000) : 0;

      return <span className="font-mono text-gray-700 font-bold">{formatSeconds(Math.min(waitSecs, 3540))}</span>;
    }
  }

  if (req.callDuration && req.callDuration > 0) {
    return <span className="font-mono text-gray-700 font-bold">{formatSeconds(req.callDuration)}</span>;
  }

  return <span className="text-gray-400">—</span>;
}
