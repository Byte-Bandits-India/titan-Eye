import * as React from 'react';
import {
  Users2,
  RefreshCw,
  FlaskConical,
  Clock,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { useToast } from './ui/toast';
import { Customer, User as UserType } from '../types';
import { OptemPatientDetails } from './OptemPatientDetails';
import { Header } from './Header';
import { CallTimer } from './ui/CallTimer';

interface OptemScreenProps {
  user: UserType;
  onLogout: () => void;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

export function OptemScreen({ user, onLogout, customers, setCustomers }: OptemScreenProps) {
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>('#0484');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const itemsPerPage = 6;
  const { toast } = useToast();

  const [isEditing, setIsEditing] = React.useState(false);
  const [collisionModalData, setCollisionModalData] = React.useState<{ id: string; name: string; takenBy: string } | null>(null);

  // Derive selected customer
  const selectedCustomer = React.useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);



  // Stats derivation
  const stats = React.useMemo(() => {
    // Large counts matching screenshot:
    // Active Tests: 477, Pending Review: 455, Completed: 6, Today's Patients: 1
    // We add dynamic adjustments based on local mock edits:
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

  // Filter incoming requests (usually Initiated/Pending, or let's show all for the live feed)
  const incomingRequests = React.useMemo(() => {
    // Optem prioritizes incoming requests that need review (Initiated, Pending, Accepted)
    return customers;
  }, [customers]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(incomingRequests.length / itemsPerPage));
  const paginatedRequests = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return incomingRequests.slice(start, start + itemsPerPage);
  }, [incomingRequests, currentPage]);

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

  const handleResetSync = () => {
    setIsSyncing(true);
    setCurrentPage(1);
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
        consoleLabel="Optem Console"
        wifiSpeed="0.9"
        wifiStatus="LOW"
      />

      {isEditing ? (
        <OptemPatientDetails
          selectedCustomer={selectedCustomer}
          onBack={() => setIsEditing(false)}
          setCustomers={setCustomers}
          toast={toast}
        />
      ) : (
        /* Main Layout Content */
        <main className="flex-1 px-8 py-6 space-y-6 w-full">
          {/* Top Cards Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Active Tests */}
            <Card className="p-4 border-[1.5px] border-blue-400/70 bg-white shadow-[0_2px_12px_rgba(59,130,246,0.08)] hover:shadow-[0_4px_20px_rgba(59,130,246,0.15)] transition-all duration-300 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 shrink-0">
                <FlaskConical size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Active Tests</span>
                <span className="text-2xl font-black text-gray-900 leading-none mt-1">{stats.active}</span>
              </div>
            </Card>

            {/* Card 2: Pending Review */}
            <Card className="p-4 border-[1.5px] border-orange-400/70 bg-white shadow-[0_2px_12px_rgba(249,115,22,0.08)] hover:shadow-[0_4px_20px_rgba(249,115,22,0.15)] transition-all duration-300 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shrink-0">
                <Clock size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Pending Review</span>
                <span className="text-2xl font-black text-gray-900 leading-none mt-1">{stats.pending}</span>
              </div>
            </Card>

            {/* Card 3: Completed */}
            <Card className="p-4 border-[1.5px] border-green-400/70 bg-white shadow-[0_2px_12px_rgba(34,197,94,0.08)] hover:shadow-[0_4px_20px_rgba(34,197,94,0.15)] transition-all duration-300 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center text-green-500 shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Completed</span>
                <span className="text-2xl font-black text-gray-900 leading-none mt-1">{stats.completed}</span>
              </div>
            </Card>

            {/* Card 4: Today's Patients */}
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

          {/* Split Grid */}
          <div>
            {/* Left Table Panel */}
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
                  <RefreshCw size={12} className={`text-gray-400 ${isSyncing ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              <div className="flex-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px] font-bold text-xs uppercase text-gray-400">ID</TableHead>
                      <TableHead className="font-bold text-xs uppercase text-gray-400">Store Name</TableHead>
                      <TableHead className="font-bold text-xs uppercase text-gray-400">Time Started</TableHead>
                      <TableHead className="font-bold text-xs uppercase text-gray-400">Patient Name</TableHead>
                      <TableHead className="font-bold text-xs uppercase text-gray-400">Age</TableHead>
                      <TableHead className="font-bold text-xs uppercase text-gray-400">Pref. Lang 1</TableHead>
                      <TableHead className="font-bold text-xs uppercase text-gray-400">Pref. Lang 2</TableHead>
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
                          <TableCell className="font-semibold text-blue-600 text-xs py-3">{req.id}</TableCell>
                          <TableCell className="text-gray-600 text-xs py-3">{req.storeName || '—'}</TableCell>
                          <TableCell className="text-gray-600 text-xs py-3">
                            <CallTimer startTime={req.callStartTime || req.lastUpdatedOn} active={req.callActive || req.status === 'Initiated'} />
                          </TableCell>
                          <TableCell className="font-semibold text-gray-800 text-xs py-3">{req.name}</TableCell>
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
                              variant={selectedCustomerId === req.id ? 'default' : 'outline'}
                              size="sm"
                              className="h-7 px-3 text-[10px] font-bold rounded-xl cursor-pointer"
                              onClick={() => {
                                if (req.callActive && req.callTakenBy && req.callTakenBy !== user.name) {
                                  setCollisionModalData({ id: req.id, name: req.name, takenBy: req.callTakenBy });
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

              {/* Pagination */}
              <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-slate-50/50">
                <span className="font-medium">Items per page: {itemsPerPage}</span>
                <div className="flex items-center gap-4">
                  <span>
                    {incomingRequests.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
                    {Math.min(currentPage * itemsPerPage, incomingRequests.length)} of {incomingRequests.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="w-7 h-7 p-0 border-gray-200 cursor-pointer"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={14} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="w-7 h-7 p-0 border-gray-200 cursor-pointer"
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

      {/* Footer */}
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
                  setSelectedCustomerId(collisionModalData.id);
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
