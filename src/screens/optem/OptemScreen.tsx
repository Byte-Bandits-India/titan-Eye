import * as React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { useToast } from '../../components/ui/toast';
import { CallTimer } from '../../components/ui/CallTimer';
import { AppLayout } from '../../components/layout/AppLayout';
import { StatsGrid } from '../../components/shared/StatsGrid';
import { PaginationBar } from '../../components/shared/PaginationBar';
import { CollisionModal } from '../../components/shared/CollisionModal';
import { usePagination } from '../../hooks/usePagination';
import { useSSE } from '../../hooks/useSSE';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchCustomersAction } from '../../Actions/customerActions';
import { PAGINATION } from '../../options/Option';
import { OptemPatientDetails } from './OptemPatientDetails';

export function OptemScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const customers = useAppSelector((state) => state.customers.customers);
  const dispatch = useAppDispatch();

  useSSE();

  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>('#0484');
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [collisionModalData, setCollisionModalData] = React.useState<{
    id: string;
    name: string;
    takenBy: string;
  } | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    dispatch(fetchCustomersAction());
  }, [dispatch]);

  const selectedCustomer = React.useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  const incomingRequests = React.useMemo(
    () => customers.filter((c) => c.status !== 'Created'),
    [customers],
  );

  const {
    paginatedItems: paginatedRequests,
    currentPage,
    totalPages,
    totalItems,
    nextPage,
    prevPage,
  } = usePagination(incomingRequests, PAGINATION.OPTEM_PAGE_SIZE);

  const handleResetSync = () => {
    setIsSyncing(true);
    dispatch(fetchCustomersAction()).then(() => {
      setIsSyncing(false);
      toast({
        title: 'Feed Synced',
        description: 'Dashboard feed has been successfully updated.',
        type: 'success',
      });
    }).catch(() => {
      setIsSyncing(false);
    });
  };

  if (!user) return null;

  return (
    <AppLayout consoleLabel="Optem Console">
      {isEditing ? (
        <OptemPatientDetails
          selectedCustomer={selectedCustomer}
          onBack={() => setIsEditing(false)}
        />
      ) : (
        <main className="flex-1 px-8 py-6 space-y-6 w-full">
          <StatsGrid customers={customers} />

          <div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
                    Incoming Requests
                  </div>
                  <div className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold rounded-md">
                    LIVE
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 cursor-pointer"
                  onClick={handleResetSync}
                  title="Force Refresh Feed"
                >
                  <RefreshCw
                    size={12}
                    className={`text-gray-400 ${isSyncing ? 'animate-spin' : ''}`}
                  />
                </Button>
              </div>

              <div className="flex-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px] font-bold text-xs uppercase text-gray-400">
                        ID
                      </TableHead>
                      <TableHead className="font-bold text-xs uppercase text-gray-400">
                        Store Name
                      </TableHead>
                      <TableHead className="font-bold text-xs uppercase text-gray-400">
                        Time Started
                      </TableHead>
                      <TableHead className="font-bold text-xs uppercase text-gray-400">
                        Patient Name
                      </TableHead>
                      <TableHead className="font-bold text-xs uppercase text-gray-400">
                        Age
                      </TableHead>
                      <TableHead className="font-bold text-xs uppercase text-gray-400">
                        Pref. Lang 1
                      </TableHead>
                      <TableHead className="font-bold text-xs uppercase text-gray-400">
                        Pref. Lang 2
                      </TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                          No pending requests in queue.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRequests.map((req) => (
                        <TableRow
                          key={req.id}
                          className={`transition-colors ${
                            selectedCustomerId === req.id
                              ? 'bg-blue-50/50 hover:bg-blue-50/70'
                              : 'hover:bg-slate-50/50'
                          }`}
                        >
                          <TableCell className="font-semibold text-blue-600 text-xs py-3">
                            {req.id}
                          </TableCell>
                          <TableCell className="text-gray-600 text-xs py-3">
                            {req.storeName || '—'}
                          </TableCell>
                          <TableCell className="text-gray-600 text-xs py-3">
                            <CallTimer
                              startTime={req.callStartTime || req.lastUpdatedOn}
                              active={req.callActive || req.status === 'Initiated'}
                            />
                          </TableCell>
                          <TableCell className="font-semibold text-gray-800 text-xs py-3">
                            {req.name}
                          </TableCell>
                          <TableCell className="text-gray-600 text-xs py-3">{req.age}</TableCell>
                          <TableCell className="py-3">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold rounded">
                              {req.preferredLanguage}
                            </span>
                          </TableCell>
                          <TableCell className="py-3">
                            {req.preferredLanguage2 && req.preferredLanguage2 !== 'None' ? (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold rounded">
                                {req.preferredLanguage2}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-[10px]">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <Button
                              variant="default"
                              size="sm"
                              className="h-7 px-3 text-[10px] font-bold rounded-xl cursor-pointer"
                              onClick={() => {
                                if (
                                  req.callActive &&
                                  req.callTakenBy?.startsWith('Dr. ') &&
                                  req.callTakenBy !== user.name
                                ) {
                                  setCollisionModalData({
                                    id: req.id,
                                    name: req.name,
                                    takenBy: req.callTakenBy,
                                  });
                                } else {
                                  setSelectedCustomerId(req.id);
                                  setIsEditing(true);
                                }
                              }}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <PaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={PAGINATION.OPTEM_PAGE_SIZE}
                onPrev={prevPage}
                onNext={nextPage}
              />
            </div>
          </div>
        </main>
      )}

      {collisionModalData && (
        <CollisionModal
          takenBy={collisionModalData.takenBy}
          onCancel={() => setCollisionModalData(null)}
          onViewData={() => {
            setSelectedCustomerId(collisionModalData.id);
            setIsEditing(true);
            setCollisionModalData(null);
          }}
        />
      )}
    </AppLayout>
  );
}
