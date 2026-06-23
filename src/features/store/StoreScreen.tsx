import * as React from 'react';
import {
  Search,
  RefreshCw,
  UserPlus,
  Video,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
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
import { fetchCustomersAction, initiateCallAction } from '../../Actions/customerActions';
import { PAGINATION } from '../../constants';
import { StorePatientDetails } from './StorePatientDetails';

export function StoreScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const customers = useAppSelector((state) => state.customers.customers);
  const dispatch = useAppDispatch();

  useSSE();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>('#0492');
  const [isAddingNew, setIsAddingNew] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [loadingCallId, setLoadingCallId] = React.useState<string | null>(null);
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

  const filteredCustomers = React.useMemo(() => {
    const matchText = searchTerm.trim().toLowerCase();
    if (!matchText) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(matchText) ||
        c.id.toLowerCase().includes(matchText) ||
        c.mobile.includes(matchText),
    );
  }, [customers, searchTerm]);

  const {
    paginatedItems: paginatedCustomers,
    currentPage,
    totalPages,
    totalItems,
    nextPage,
    prevPage,
    resetPage,
  } = usePagination(filteredCustomers, PAGINATION.STORE_PAGE_SIZE);

  React.useEffect(() => {
    resetPage();
  }, [searchTerm, resetPage]);

  const handleInitiateCall = async (customerId: string, customerName: string) => {
    setLoadingCallId(customerId);
    try {
      await dispatch(initiateCallAction(customerId));
      toast({
        title: 'Video Call',
        description: `Initiating video consultation with patient ${customerName}...`,
        type: 'success',
      });
    } catch (err: any) {
      if (err.message && err.message.includes('409')) {
        toast({
          title: 'Call Collision',
          description: err.message || 'This call is already taken by another agent.',
          type: 'error',
        });
      } else {
        toast({
          title: 'System Error',
          description: err.message || 'Failed to connect to the server to initiate call.',
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
    setSelectedCustomerId(null);
  };

  const handleSelectCustomer = (id: string) => {
    setIsAddingNew(false);
    setIsEditing(false);
    setSelectedCustomerId(id);
  };

  const handleResetSync = () => {
    setIsSyncing(true);
    setSearchTerm('');
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
    <AppLayout consoleLabel="Store Console">
      {isAddingNew || isEditing ? (
        <StorePatientDetails
          isAddingNew={isAddingNew}
          selectedCustomer={selectedCustomer}
          onBack={() => {
            setIsAddingNew(false);
            setIsEditing(false);
          }}
          setSelectedCustomerId={setSelectedCustomerId}
        />
      ) : (
        <main className="flex-1 px-8 py-6 space-y-6 w-full">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900">Store Overview</h1>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 tracking-wider">
              <span>SYNCED LIVE</span>
              <button
                onClick={handleResetSync}
                className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-300 shadow-3xs cursor-pointer transition-all"
                title="Force Sync Live"
              >
                <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <StatsGrid customers={customers} />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:max-w-md">
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search patients by name, ID or mobile..."
                icon={Search}
                className="bg-white border-gray-200"
              />
            </div>
            <Button
              onClick={handleAddNewClick}
              className="rounded-xl gap-2 h-10 bg-[#1a2b6e] hover:bg-[#152260] text-white font-bold text-xs px-5 w-full sm:w-auto shadow-sm transition-all active:scale-98"
            >
              <UserPlus size={16} />
              Add New Patient
            </Button>
          </div>

          <div>
            <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                <div className="text-sm font-bold text-gray-800">
                  Recent Customers & Transactions
                </div>
                <div className="text-[10px] text-gray-400 font-semibold uppercase">
                  Store: {user.name}
                </div>
              </div>

              <div className="flex-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px] font-bold text-xs uppercase text-gray-400">
                        ID
                      </TableHead>
                      <TableHead className="font-bold text-xs uppercase text-gray-400">
                        Patient Name
                      </TableHead>
                      <TableHead className="font-bold text-xs uppercase text-gray-400">
                        Status
                      </TableHead>
                      <TableHead className="font-bold text-xs uppercase text-gray-400">
                        Time Started
                      </TableHead>
                      <TableHead className="font-bold text-xs uppercase text-gray-400 text-center">
                        Initiate Call
                      </TableHead>
                      <TableHead className="font-bold text-xs uppercase text-gray-400 text-right pr-4">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                          No transactions found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedCustomers.map((cust) => (
                        <TableRow
                          key={cust.id}
                          className={`transition-colors ${
                            selectedCustomerId === cust.id && !isAddingNew
                              ? 'bg-blue-50/50 hover:bg-blue-50/70'
                              : 'hover:bg-slate-50/50'
                          }`}
                        >
                          <TableCell className="font-semibold text-blue-600 text-xs py-3">
                            {cust.id}
                          </TableCell>
                          <TableCell className="font-semibold text-gray-800 text-xs py-3">
                            {cust.name}
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge variant={cust.status}>{cust.status.toUpperCase()}</Badge>
                          </TableCell>
                          <TableCell className="text-gray-600 text-xs py-3">
                            <CallTimer
                               startTime={cust.callStartTime || cust.lastUpdatedOn}
                               active={cust.callActive || cust.status === 'Initiated'}
                            />
                          </TableCell>
                          <TableCell
                            className="py-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-center">
                              {cust.callActive ? (
                                <Button
                                  disabled
                                  className="h-8 px-4 bg-gray-200 text-gray-500 text-xs font-bold rounded-full flex items-center gap-1.5 cursor-not-allowed border-0 opacity-100"
                                  title="Call Initiated"
                                >
                                  Call Initiated
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => handleInitiateCall(cust.id, cust.name)}
                                  disabled={loadingCallId === cust.id}
                                  className="h-8 px-4 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold rounded-full flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm border-0"
                                  title="Initiate Call"
                                >
                                  {loadingCallId === cust.id ? (
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Video size={14} />
                                  )}
                                  Initiate Call
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell
                            className="text-right py-3 pr-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="default"
                              size="sm"
                              className="h-7 px-3 text-[10px] font-bold rounded-xl cursor-pointer"
                              onClick={() => {
                                if (cust.callActive && cust.storeName !== user.name) {
                                  setCollisionModalData({
                                    id: cust.id,
                                    name: cust.name,
                                    takenBy: cust.callTakenBy || 'another agent',
                                  });
                                } else {
                                  handleSelectCustomer(cust.id);
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
                itemsPerPage={PAGINATION.STORE_PAGE_SIZE}
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
            handleSelectCustomer(collisionModalData.id);
            setIsEditing(true);
            setCollisionModalData(null);
          }}
        />
      )}
    </AppLayout>
  );
}
