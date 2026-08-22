import { AxiosError } from 'axios';
import {
  ClipboardList,
  FilmIcon,
  History,
  LogOut,
  Mail,
  Maximize2,
  MessageSquare,
  Minimize2,
  Monitor,
  MonitorPlay,
  Search,
  UserPlus,
  Wifi,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { HeaderProps } from '../../types';

import { logoutAction } from '../../Actions/authActions';
import { useFullscreen } from '../../hooks/useFullscreen';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useAppDispatch, useAppSelector } from '../../store';
import { apiClient } from '../../Util/apiClient';
import { openTeamViewer } from '../../Util/teamViewer';
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
import { useToast } from '../ui/toast';

export function Header({
  activeTab,
  consoleLabel,
  onSearchChange,
  searchPlaceholder,
  searchValue,
  setActiveTab,
}: HeaderProps) {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { speed, statusColor, statusLabel, wifiIconColor } = useNetworkStatus();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [photoUrl, setPhotoUrl] = useState<null | string>(null);

  const handleLogout = () => {
    dispatch(logoutAction());
  };

  const handleOpenTeamViewer = () => {
    toast({ description: 'Opening TeamViewer connection...', title: 'TeamViewer', type: 'info' });
    openTeamViewer();
  };

  const handleOpenTvMode = () => {
    navigate('/store/tvmode');
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    let objectUrl: null | string = null;
    let cancelled = false;

    apiClient
      .get('/me/photo', { responseType: 'blob' })
      .then((res) => {
        if (cancelled) {
          return;
        }

        const blob = res.data as Blob;

        if (res.status === 204 || blob.size === 0) {
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setPhotoUrl(objectUrl);
      })
      .catch((err: AxiosError) => {
        if (err.response?.status === 404) {
          return;
        }

        console.error('Failed to load profile photo:', err.message);
      });

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [user, user?.email]);

  if (!user) {
    return null;
  }

  const roleBadge =
    user.role === 'admin'
      ? 'bg-purple-100 text-purple-700 border-purple-200'
      : user.role === 'optometrist'
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
          className="group flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-transparent p-1 transition-all hover:border-slate-200 hover:bg-slate-50 focus:outline-none sm:px-2.5 sm:py-1.5"
          title="Profile"
        >
          <div className="relative">
            <Avatar
              className={`${avatarSize} shadow-sm ring-2 ring-white transition-all group-hover:ring-blue-200`}
            >
              {photoUrl && <AvatarImage alt={user.name} src={photoUrl} />}
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-medium text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 p-2">
        <div className="mb-1 rounded-lg border border-slate-100 bg-gradient-to-br from-slate-50 to-blue-50 px-3 py-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 flex-shrink-0 shadow-md">
              {photoUrl && <AvatarImage alt={user.name} src={photoUrl} />}
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-base font-medium text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-gray-900">{user.name}</div>
              <div
                className={`mt-0.5 inline-block rounded-full border px-1.5 py-0.5 text-[10px] font-medium capitalize ${roleBadge}`}
              >
                {user.role}
              </div>
            </div>
          </div>
        </div>

        <DropdownMenuLabel className="px-2 pb-1 pt-2 text-[10px] font-medium tracking-widest text-slate-400">
          Login Details
        </DropdownMenuLabel>

        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50">
            <Mail className="text-blue-600" size={13} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-medium text-slate-400">Email</div>
            <div className="truncate text-sm font-medium text-gray-800">{user.email}</div>
          </div>
        </div>

        <DropdownMenuSeparator className="my-2" />

        <DropdownMenuItem
          className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2.5 font-medium text-red-600 transition-colors hover:bg-red-50 focus:bg-red-50 focus:text-red-700"
          onClick={handleLogout}
        >
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-red-100 bg-red-50">
            <LogOut className="text-red-500" size={13} />
          </div>
          <span className="text-sm">Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <header className="shadow-xs sticky top-0 z-40 min-h-[48px] border-b border-gray-200 bg-white px-3 py-1.5 sm:px-6 sm:py-2">
      <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-2.5 sm:gap-3 xl:flex-nowrap">
        <div className="order-1 flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
          <img
            alt="Titan Eye Logo"
            className="w-24 shrink-0 object-contain sm:w-28 md:w-32"
            src="/images/logo-black.png"
          />
          {consoleLabel && (
            <div className="flex max-w-[120px] shrink-0 items-center truncate rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 sm:max-w-none sm:px-2.5 sm:text-sm">
              {consoleLabel}
            </div>
          )}
        </div>

        {activeTab && setActiveTab && (
          <div className="order-2 hidden items-center gap-2 overflow-x-auto py-0.5 [ms-overflow-style:none] [scrollbar-width:none] md:gap-3 xl:flex [&::-webkit-scrollbar]:hidden">
            <button
              className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                activeTab === 'customers'
                  ? 'bg-slate-100 font-medium text-[#1a2b6e]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
              onClick={() => setActiveTab('customers')}
            >
              <ClipboardList
                className={activeTab === 'customers' ? 'text-[#1a2b6e]' : 'text-slate-400'}
                size={16}
              />
              <span className="whitespace-nowrap">Dashboard</span>
            </button>
            <button
              className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                activeTab === 'users'
                  ? 'bg-slate-100 font-medium text-[#1a2b6e]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
              onClick={() => setActiveTab('users')}
            >
              <UserPlus className={activeTab === 'users' ? 'text-[#1a2b6e]' : 'text-slate-400'} size={16} />
              <span className="whitespace-nowrap">User Record</span>
            </button>
            <button
              className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                activeTab === 'feedback'
                  ? 'bg-slate-100 font-medium text-[#1a2b6e]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
              onClick={() => setActiveTab('feedback')}
            >
              <MessageSquare
                className={activeTab === 'feedback' ? 'text-[#1a2b6e]' : 'text-slate-400'}
                size={16}
              />
              <span className="whitespace-nowrap">Feedback</span>
            </button>
            <button
              className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                activeTab === 'auditLogs'
                  ? 'bg-slate-100 font-medium text-[#1a2b6e]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
              onClick={() => setActiveTab('auditLogs')}
            >
              <History
                className={activeTab === 'auditLogs' ? 'text-[#1a2b6e]' : 'text-slate-400'}
                size={16}
              />
              <span className="whitespace-nowrap">Audit Logs</span>
            </button>
            <button
              className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                activeTab === 'videos'
                  ? 'bg-slate-100 font-medium text-[#1a2b6e]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
              onClick={() => setActiveTab('videos')}
            >
              <FilmIcon className={activeTab === 'videos' ? 'text-[#1a2b6e]' : 'text-slate-400'} size={16} />
              <span className="whitespace-nowrap">Videos</span>
            </button>
          </div>
        )}

        {onSearchChange && (
          <div className="order-2 w-full shrink-0 xl:order-2 xl:w-64">
            <Input
              className="h-9 border-gray-200 bg-slate-50"
              icon={Search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder ?? 'Search...'}
              type="text"
              value={searchValue ?? ''}
            />
          </div>
        )}

        <div className="order-2 ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3 xl:order-3 xl:ml-0">
          <Wifi
            className={`hidden sm:inline ${wifiIconColor} shrink-0 animate-pulse transition-colors duration-300`}
            size={14}
          />
          <span className="hidden text-sm font-medium text-gray-700 transition-all duration-300 sm:inline">
            {speed}
          </span>
          <span
            className={`hidden sm:inline ${statusColor} rounded-sm px-1.5 py-0.5 text-[9px] font-medium transition-colors duration-300 sm:text-[10px]`}
          >
            {statusLabel}
          </span>

          {user.role === 'store' && (
            <button
              className="flex cursor-pointer items-center gap-1.5 rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-cyan-700"
              onClick={handleOpenTvMode}
              title="Open the TV call screen"
              type="button"
            >
              <MonitorPlay className="shrink-0" size={14} />
              <span className="hidden sm:inline">TV Mode</span>
            </button>
          )}

          {user.role === 'optometrist' && (
            <button
              className="flex cursor-pointer items-center gap-1.5 rounded-md bg-[#4f46e5] px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#4338ca]"
              onClick={handleOpenTeamViewer}
              title="Open TeamViewer Remote Control"
              type="button"
            >
              <Monitor className="shrink-0" size={14} />
              <span className="hidden sm:inline">TeamViewer</span>
            </button>
          )}

          <button
            className="hidden cursor-pointer rounded-lg p-1.5 text-gray-400 transition-all hover:bg-slate-50 hover:text-gray-600 sm:inline-flex sm:p-2"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {renderProfileDropdown('w-7 h-7 sm:w-8 sm:h-8')}
        </div>

        {activeTab && setActiveTab && (
          <div className="order-3 flex w-full max-w-full items-center gap-1.5 overflow-x-auto border-t border-slate-100 pt-2 [ms-overflow-style:none] [scrollbar-width:none] sm:gap-2 xl:hidden [&::-webkit-scrollbar]:hidden">
            <button
              className={`flex min-w-0 flex-1 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-medium transition-all sm:gap-2 sm:px-3.5 sm:py-2 sm:text-sm ${
                activeTab === 'customers'
                  ? 'shadow-2xs border border-slate-200/80 bg-slate-100 font-medium text-[#1a2b6e]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
              onClick={() => setActiveTab('customers')}
            >
              <ClipboardList
                className={`shrink-0 ${activeTab === 'customers' ? 'text-[#1a2b6e]' : 'text-slate-400'}`}
                size={15}
              />
              <span className="truncate whitespace-nowrap font-medium">
                <span className="inline sm:hidden">Customers</span>
                <span className="hidden sm:inline">Dashboard</span>
              </span>
            </button>
            <button
              className={`flex min-w-0 flex-1 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-medium transition-all sm:gap-2 sm:px-3.5 sm:py-2 sm:text-sm ${
                activeTab === 'users'
                  ? 'shadow-2xs border border-slate-200/80 bg-slate-100 font-medium text-[#1a2b6e]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
              onClick={() => setActiveTab('users')}
            >
              <UserPlus
                className={`shrink-0 ${activeTab === 'users' ? 'text-[#1a2b6e]' : 'text-slate-400'}`}
                size={15}
              />
              <span className="truncate whitespace-nowrap font-medium">
                <span className="inline sm:hidden">Users</span>
                <span className="hidden sm:inline">User Record</span>
              </span>
            </button>
            <button
              className={`flex min-w-0 flex-1 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-medium transition-all sm:gap-2 sm:px-3.5 sm:py-2 sm:text-sm ${
                activeTab === 'feedback'
                  ? 'shadow-2xs border border-slate-200/80 bg-slate-100 font-medium text-[#1a2b6e]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
              onClick={() => setActiveTab('feedback')}
            >
              <MessageSquare
                className={`shrink-0 ${activeTab === 'feedback' ? 'text-[#1a2b6e]' : 'text-slate-400'}`}
                size={15}
              />
              <span className="truncate whitespace-nowrap font-medium">
                <span className="inline sm:hidden">Feedback</span>
                <span className="hidden sm:inline">Customer Feedback</span>
              </span>
            </button>
            <button
              className={`flex min-w-0 flex-1 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-medium transition-all sm:gap-2 sm:px-3.5 sm:py-2 sm:text-sm ${
                activeTab === 'auditLogs'
                  ? 'shadow-2xs border border-slate-200/80 bg-slate-100 font-medium text-[#1a2b6e]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
              onClick={() => setActiveTab('auditLogs')}
            >
              <History
                className={`shrink-0 ${activeTab === 'auditLogs' ? 'text-[#1a2b6e]' : 'text-slate-400'}`}
                size={15}
              />
              <span className="truncate whitespace-nowrap font-medium">
                <span className="inline sm:hidden">Audit</span>
                <span className="hidden sm:inline">Audit Logs</span>
              </span>
            </button>
            <button
              className={`flex min-w-0 flex-1 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-medium transition-all sm:gap-2 sm:px-3.5 sm:py-2 sm:text-sm ${
                activeTab === 'videos'
                  ? 'shadow-2xs border border-slate-200/80 bg-slate-100 font-medium text-[#1a2b6e]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
              onClick={() => setActiveTab('videos')}
            >
              <FilmIcon
                className={`shrink-0 ${activeTab === 'videos' ? 'text-[#1a2b6e]' : 'text-slate-400'}`}
                size={15}
              />
              <span className="truncate whitespace-nowrap font-medium">Videos</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
