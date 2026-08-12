import { AxiosError } from 'axios';
import { ClipboardList, History, LogOut, Mail, Maximize2, Minimize2, Search, UserPlus, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { HeaderProps } from '../../types';

import { logoutAction } from '../../Actions/authActions';
import { useFullscreen } from '../../hooks/useFullscreen';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useAppDispatch, useAppSelector } from '../../store';
import { apiClient } from '../../Util/apiClient';
import { NotificationPopover } from '../shared/NotificationPopover';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Input } from '../ui/input';

export function Header({ activeTab, consoleLabel, onSearchChange, onSelectCustomer, searchPlaceholder, searchValue, setActiveTab }: HeaderProps) {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const { speed, statusColor, statusLabel, wifiIconColor } = useNetworkStatus();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [photoUrl, setPhotoUrl] = useState<null | string>(null);

  const handleLogout = () => {
    dispatch(logoutAction());
  };

  useEffect(() => {
    if (!user) {return;}

    let objectUrl: null | string = null;
    let cancelled = false;

    apiClient
      .get('/me/photo', { responseType: 'blob' })
      .then((res) => {
        if (cancelled) {return;}

        const blob = res.data as Blob;

        if (res.status === 204 || blob.size === 0) {return;}

        objectUrl = URL.createObjectURL(blob);
        setPhotoUrl(objectUrl);
      })
      .catch((err: AxiosError) => {
        if (err.response?.status === 404) {return;}

        console.error('Failed to load profile photo:', err.message);
      });

    return () => {
      cancelled = true;

      if (objectUrl) {URL.revokeObjectURL(objectUrl);}
    };
  }, [user, user?.email]);

  if (!user) {return null;}

  const roleBadge = user.role === 'admin'
    ? 'bg-purple-100 text-purple-700 border-purple-200'
    : user.role === 'optom'
    ? 'bg-blue-100 text-blue-700 border-blue-200'
    : 'bg-emerald-100 text-emerald-700 border-emerald-200';

  const initials = user.name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const renderProfileDropdown = (avatarSize = 'w-8 h-8') => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all cursor-pointer group focus:outline-none shrink-0"
          title="Profile"
        >
          <div className="relative">
            <Avatar className={`${avatarSize} ring-2 ring-white group-hover:ring-blue-200 transition-all shadow-sm`}>
              {photoUrl && <AvatarImage alt={user.name} src={photoUrl} />}
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 p-2">
        <div className="px-3 py-3 mb-1 rounded-lg bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-100">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 shadow-md flex-shrink-0">
              {photoUrl && <AvatarImage alt={user.name} src={photoUrl} />}
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-base font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="font-bold text-sm text-gray-900 truncate">{user.name}</div>
              <div className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border capitalize inline-block mt-0.5 ${roleBadge}`}>
                {user.role}
              </div>
            </div>
          </div>
        </div>

        <DropdownMenuLabel className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-2 pt-2 pb-1">
          Login Details
        </DropdownMenuLabel>

        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors">
          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
            <Mail className="text-blue-600" size={13} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 font-semibold">Email</div>
            <div className="text-xs font-semibold text-gray-800 truncate">{user.email}</div>
          </div>
        </div>

        <DropdownMenuSeparator className="my-2" />

        <DropdownMenuItem
          className="flex items-center gap-2.5 px-2 py-2.5 rounded-lg text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-700 font-semibold cursor-pointer transition-colors"
          onClick={handleLogout}
        >
          <div className="w-7 h-7 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
            <LogOut className="text-red-500" size={13} />
          </div>
          <span className="text-sm">Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-1.5 sm:py-2 shadow-xs min-h-[48px] sticky top-0 z-40">
      <div className="flex flex-wrap xl:flex-nowrap items-center justify-between gap-2.5 sm:gap-3 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center gap-1.5 sm:gap-2 select-none shrink-0 min-w-0 order-1">
          <img alt="Titan Eye Logo" className="w-24 sm:w-28 md:w-32 object-contain shrink-0" src="/logo.png" />
          {consoleLabel && (
            <div className="flex items-center text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 bg-slate-100 rounded-full text-slate-600 border border-slate-200 shrink-0 truncate max-w-[120px] sm:max-w-none">
              {consoleLabel}
            </div>
          )}
        </div>

        {activeTab && setActiveTab && (
          <div className="hidden xl:flex items-center gap-2 md:gap-3 overflow-x-auto [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5 order-2">
            <button
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer shrink-0 ${
                activeTab === 'customers'
                  ? 'text-[#1a2b6e] bg-slate-100 font-bold'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
              onClick={() => setActiveTab('customers')}
            >
              <ClipboardList className={activeTab === 'customers' ? 'text-[#1a2b6e]' : 'text-slate-400'} size={16} />
              <span className="whitespace-nowrap">Customers Record</span>
            </button>
            <button
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer shrink-0 ${
                activeTab === 'users'
                  ? 'text-[#1a2b6e] bg-slate-100 font-bold'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
              onClick={() => setActiveTab('users')}
            >
              <UserPlus className={activeTab === 'users' ? 'text-[#1a2b6e]' : 'text-slate-400'} size={16} />
              <span className="whitespace-nowrap">Users Record</span>
            </button>
            <button
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer shrink-0 ${
                activeTab === 'auditLogs'
                  ? 'text-[#1a2b6e] bg-slate-100 font-bold'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
              onClick={() => setActiveTab('auditLogs')}
            >
              <History className={activeTab === 'auditLogs' ? 'text-[#1a2b6e]' : 'text-slate-400'} size={16} />
              <span className="whitespace-nowrap">Audit Logs</span>
            </button>
          </div>
        )}

        {onSearchChange && (
          <div className="order-2 xl:order-2 w-full xl:w-64 shrink-0">
            <Input
              className="h-9 bg-slate-50 border-gray-200"
              icon={Search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder ?? 'Search...'}
              type="text"
              value={searchValue ?? ''}
            />
          </div>
        )}

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 order-2 xl:order-3 ml-auto xl:ml-0">
          <Wifi
            className={`hidden sm:inline ${wifiIconColor} animate-pulse transition-colors duration-300 shrink-0`}
            size={14}
          />
          <span className="hidden sm:inline text-xs font-semibold text-gray-700 transition-all duration-300">{speed}</span>
          <span className={`hidden sm:inline ${statusColor} text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm transition-colors duration-300`}>
            {statusLabel}
          </span>

          {user.role !== 'store' && (
            <NotificationPopover onSelectCustomer={onSelectCustomer} />
          )}

          <button
            className="text-gray-400 hover:text-gray-600 hover:bg-slate-50 p-1.5 sm:p-2 rounded-lg transition-all hidden sm:inline-flex cursor-pointer"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {renderProfileDropdown('w-7 h-7 sm:w-8 sm:h-8')}
        </div>

        {activeTab && setActiveTab && (
          <div className="flex xl:hidden items-center gap-1.5 sm:gap-2 overflow-x-auto w-full max-w-full [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pt-2 border-t border-slate-100 order-3 w-full">
            <button
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0 flex-1 justify-center min-w-0 ${
                activeTab === 'customers'
                  ? 'text-[#1a2b6e] bg-slate-100 font-bold shadow-2xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
              onClick={() => setActiveTab('customers')}
            >
              <ClipboardList className={`shrink-0 ${activeTab === 'customers' ? 'text-[#1a2b6e]' : 'text-slate-400'}`} size={15} />
              <span className="whitespace-nowrap font-bold truncate">
                <span className="inline sm:hidden">Customers</span>
                <span className="hidden sm:inline">Customers Record</span>
              </span>
            </button>
            <button
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0 flex-1 justify-center min-w-0 ${
                activeTab === 'users'
                  ? 'text-[#1a2b6e] bg-slate-100 font-bold shadow-2xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
              onClick={() => setActiveTab('users')}
            >
              <UserPlus className={`shrink-0 ${activeTab === 'users' ? 'text-[#1a2b6e]' : 'text-slate-400'}`} size={15} />
              <span className="whitespace-nowrap font-bold truncate">
                <span className="inline sm:hidden">Users</span>
                <span className="hidden sm:inline">Users Record</span>
              </span>
            </button>
            <button
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0 flex-1 justify-center min-w-0 ${
                activeTab === 'auditLogs'
                  ? 'text-[#1a2b6e] bg-slate-100 font-bold shadow-2xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
              onClick={() => setActiveTab('auditLogs')}
            >
              <History className={`shrink-0 ${activeTab === 'auditLogs' ? 'text-[#1a2b6e]' : 'text-slate-400'}`} size={15} />
              <span className="whitespace-nowrap font-bold truncate">
                <span className="inline sm:hidden">Audit</span>
                <span className="hidden sm:inline">Audit Logs</span>
              </span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
