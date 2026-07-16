import { Wifi, User, LogOut, Maximize2, Minimize2, UserPlus, ClipboardList } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { logoutAction } from '../../Actions/authActions';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useFullscreen } from '../../hooks/useFullscreen';
import type { HeaderProps } from '../../types';

export function Header({ consoleLabel, activeTab, setActiveTab }: HeaderProps) {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const { speed, statusLabel, statusColor, wifiIconColor } = useNetworkStatus();
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  const handleLogout = () => {
    dispatch(logoutAction());
  };

  if (!user) return null;

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-8">
        <div className="flex items-center select-none">
          <img src="/logo.png" alt="Titan Eye Logo" className="w-28 sm:w-32" />
        </div>
        {consoleLabel && (
          <div className="hidden sm:flex items-center text-xs font-semibold px-3 py-1 bg-slate-100 rounded-full text-slate-600 border border-slate-200">
            {consoleLabel}
          </div>
        )}
        {activeTab && setActiveTab && (
          <div className="flex items-center gap-6 ml-4">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'text-[#1a2b6e] bg-slate-100'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <UserPlus size={18} className={activeTab === 'users' ? 'text-[#1a2b6e]' : 'text-slate-400'} />
              <span>Users Record</span>
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'customers'
                  ? 'text-[#1a2b6e] bg-slate-100'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ClipboardList size={18} className={activeTab === 'customers' ? 'text-[#1a2b6e]' : 'text-slate-400'} />
              <span>Customers Record</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-slate-50 border border-gray-200 px-3 py-1.5 rounded-lg shadow-2xs">
          <Wifi
            size={14}
            className={`${wifiIconColor} animate-pulse transition-colors duration-300`}
          />
          <span className="font-semibold text-gray-700 transition-all duration-300">
            {speed}
          </span>
          <span className="text-[10px] text-gray-400 font-bold">MBPS</span>
          <span
            className={`${statusColor} text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm transition-colors duration-300`}
          >
            {statusLabel}
          </span>
        </div>
        <div className="text-right text-[11px] text-gray-500 leading-tight">
          <div className="text-gray-400">Logged in as:</div>
          <div className="text-blue-600 font-semibold">
            {user.name} ({user.email})
          </div>
        </div>
        <div className="relative w-8 h-8 rounded-full bg-slate-100 border border-blue-200 flex items-center justify-center shadow-xs">
          <User size={16} className="text-blue-600" />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
        </div>
        <button
          onClick={toggleFullscreen}
          className="text-gray-400 hover:text-gray-600 hover:bg-slate-50 p-2 rounded-lg transition-all hidden sm:inline-block cursor-pointer"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
        <button
          onClick={handleLogout}
          className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all cursor-pointer"
          title="Log Out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
