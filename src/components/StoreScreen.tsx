import * as React from 'react';
import {
  Search,
  RefreshCw,
  FlaskConical,
  Clock,
  CheckCircle2,
  Users2,
  UserPlus,
  ChevronRight,
  ChevronLeft,
  Video,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { useToast } from './ui/toast';
import { Customer, User as UserType } from '../types';
import { StorePatientDetails } from './StorePatientDetails';
import { Header } from './Header';
import { CallTimer } from './ui/CallTimer';

interface StoreScreenProps {
  user: UserType;
  onLogout: () => void;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

export function StoreScreen({ user, onLogout, customers, setCustomers }: StoreScreenProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>('#0492');
  const [isAddingNew, setIsAddingNew] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [loadingCallId, setLoadingCallId] = React.useState<string | null>(null);
  const [collisionModalData, setCollisionModalData] = React.useState<{ id: string; name: string; takenBy: string } | null>(null);
  const itemsPerPage = 8;
  const { toast } = useToast();

  const handleInitiateCall = async (customerId: string, customerName: string) => {
    const savedUser = localStorage.getItem('titan_user');
    const token = savedUser ? JSON.parse(savedUser).token : '';
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

    setLoadingCallId(customerId);
    try {
      const response = await fetch(`${apiBaseUrl}/customers/${encodeURIComponent(customerId)}/initiate-call`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.status === 409) {
        const errorData = await response.json();
        toast({
          title: 'Call Collision',
          description: errorData.error || 'This call is already taken by another agent.',
          type: 'error',
        });
        return;
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Session expired or unauthorized. Please log out and log in again.');
        }
        throw new Error('Failed to initiate call');
      }

      toast({
        title: 'Video Call',
        description: `Initiating video consultation with patient ${customerName}...`,
        type: 'success',
      });

    } catch (err: any) {
      console.error(err);
      toast({
        title: 'System Error',
        description: err.message || 'Failed to connect to the server to initiate call.',
        type: 'error',
      });
    } finally {
      setLoadingCallId(null);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const selectedCustomer = React.useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

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

  const stats = React.useMemo(() => {
    const active = customers.filter((c) => c.status === 'Created' || c.status === 'Initiated' || c.status === 'Accepted').length;
    const pending = customers.filter((c) => c.status === 'Created' || c.status === 'Initiated').length;
    const completed = customers.filter((c) => c.status === 'Completed').length;
    const todayStr = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const today = customers.filter(
      (c) => c.lastUpdatedOn?.includes(todayStr)
    ).length;

    return { active, pending, completed, today };
  }, [customers]);

  const filteredCustomers = React.useMemo(() => {
    return customers.filter((c) => {
      const matchText = searchTerm.trim().toLowerCase();
      if (!matchText) return true;
      return (
        c.name.toLowerCase().includes(matchText) ||
        c.id.toLowerCase().includes(matchText) ||
        c.mobile.includes(matchText)
      );
    });
  }, [customers, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / itemsPerPage));
  const paginatedCustomers = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(start, start + itemsPerPage);
  }, [filteredCustomers, currentPage]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleResetSync = () => {
    setIsSyncing(true);
    setSearchTerm('');
    setTimeout(() => {
      setIsSyncing(false);
      toast({
        title: 'Feed Synced',
        description: 'Dashboard feed has been successfully updated.',
        type: 'success',
      });
    }, 500);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#e8eaf0] min-h-screen">
      <Header
        user={user}
        onLogout={onLogout}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        consoleLabel="Store Console"
        wifiSpeed="1.1"
        wifiStatus="LOW"
      />

      {isAddingNew || isEditing ? (
        <StorePatientDetails
          user={user}
          isAddingNew={isAddingNew}
          selectedCustomer={selectedCustomer}
          onBack={() => {
            setIsAddingNew(false);
            setIsEditing(false);
          }}
          setCustomers={setCustomers}
          setSelectedCustomerId={setSelectedCustomerId}
          customers={customers}
          toast={toast}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 border-[1.5px] border-blue-400/70 bg-white shadow-[0_2px_12px_rgba(59,130,246,0.08)] hover:shadow-[0_4px_20px_rgba(59,130,246,0.15)] transition-all duration-300 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 shrink-0">
                <FlaskConical size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Active Tests</span>
                <span className="text-2xl font-black text-gray-900 leading-none mt-1">{stats.active}</span>
              </div>
            </Card>

            <Card className="p-4 border-[1.5px] border-orange-400/70 bg-white shadow-[0_2px_12px_rgba(249,115,22,0.08)] hover:shadow-[0_4px_20px_rgba(249,115,22,0.15)] transition-all duration-300 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shrink-0">
                <Clock size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Pending Review</span>
                <span className="text-2xl font-black text-gray-900 leading-none mt-1">{stats.pending}</span>
              </div>
            </Card>

            <Card className="p-4 border-[1.5px] border-green-400/70 bg-white shadow-[0_2px_12px_rgba(34,197,94,0.08)] hover:shadow-[0_4px_20px_rgba(34,197,94,0.15)] transition-all duration-300 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center text-green-500 shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Completed</span>
                <span className="text-2xl font-black text-gray-900 leading-none mt-1">{stats.completed}</span>
              </div>
            </Card>

            <Card className="p-4 border-[1.5px] border-teal-400/70 bg-white shadow-[0_2px_12px_rgba(20,184,166,0.08)] hover:shadow-[0_4px_20px_rgba(20,184,166,0.15)] transition-all duration-300 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-500 shrink-0">
                <Users2 size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Today's Patients</span>
                <span className="text-2xl font-black text-gray-900 leading-none mt-1">{stats.today}</span>
              </div>
            </Card>
          </div>

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
                <div className="text-sm font-bold text-gray-800">Recent Customers & Transactions</div>
                <div className="text-[10px] text-gray-400 font-semibold uppercase">Store: Meena</div>
              </div>

              <div className="flex-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px] font-bold text-xs uppercase text-gray-400">ID</TableHead>
                      <TableHead className="font-bold text-xs uppercase text-gray-400">Patient Name</TableHead>
                      <TableHead className="font-bold text-xs uppercase text-gray-400">Status</TableHead>
                      <TableHead className="font-bold text-xs uppercase text-gray-400">Time Started</TableHead>
                      <TableHead className="font-bold text-xs uppercase text-gray-400 text-center">Initiate Call</TableHead>
                      <TableHead className="font-bold text-xs uppercase text-gray-400 text-right pr-4">Actions</TableHead>
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
                          <TableCell className="font-semibold text-blue-600 text-xs py-3">{cust.id}</TableCell>
                          <TableCell className="font-semibold text-gray-800 text-xs py-3">{cust.name}</TableCell>
                          <TableCell className="py-3">
                            <Badge variant={cust.status}>{cust.status.toUpperCase()}</Badge>
                          </TableCell>
                          <TableCell className="text-gray-600 text-xs py-3">
                            <CallTimer startTime={cust.callStartTime || cust.lastUpdatedOn} active={cust.callActive || cust.status === 'Initiated'} />
                          </TableCell>
                          <TableCell className="py-3 text-center" onClick={(e) => e.stopPropagation()}>
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
                          <TableCell className="text-right py-3 pr-4" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant='default'
                              size="sm"
                              className="h-7 px-3 text-[10px] font-bold rounded-xl cursor-pointer"
                              onClick={() => {
                                if (cust.callActive && cust.storeName !== user.name) {
                                  setCollisionModalData({ id: cust.id, name: cust.name, takenBy: cust.callTakenBy || 'another agent' });
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

              <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-slate-50/50">
                <span className="font-medium">Items per page: {itemsPerPage}</span>
                <div className="flex items-center gap-4">
                  <span>
                    {filteredCustomers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
                    {Math.min(currentPage * itemsPerPage, filteredCustomers.length)} of {filteredCustomers.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="w-7 h-7 p-0 border-gray-200"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={14} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="w-7 h-7 p-0 border-gray-200"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      <footer className="bg-white border-t border-gray-200 px-8 py-4 mt-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-[10px] text-gray-400">
          <span>© 2026 Titan Company Limited. All Rights Reserved.</span>
          <span>
            Titan Company Limited, Veer Sandra, Electronic City, Bengaluru, Karnataka 560100
          </span>
          <span className="text-blue-600 font-bold hover:underline cursor-pointer">titan.co.in</span>
        </div>
      </footer>

      {collisionModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-base font-bold text-gray-900 mb-2">Call Already Taken</h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              This call is already taken by <strong className="text-gray-800">{collisionModalData.takenBy}</strong>. Do you want to view the data?
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-4 text-xs font-bold rounded-xl"
                onClick={() => setCollisionModalData(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 px-4 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  handleSelectCustomer(collisionModalData.id);
                  setIsEditing(true);
                  setCollisionModalData(null);
                }}
              >
                View Data
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
