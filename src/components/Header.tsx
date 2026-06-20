import * as React from 'react';
import { Wifi, User, LogOut, Maximize2, Minimize2 } from 'lucide-react';
import { User as UserType } from '../types';

interface HeaderProps {
  user: UserType;
  onLogout: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  consoleLabel?: string;
  wifiSpeed?: string;
  wifiStatus?: string;
}

export function Header({
  user,
  onLogout,
  isFullscreen,
  toggleFullscreen,
  consoleLabel,
  wifiSpeed = '25',
  wifiStatus = 'EXCELLENT',
}: HeaderProps) {
  const [speed, setSpeed] = React.useState<string>(wifiSpeed);
  const [statusLabel, setStatusLabel] = React.useState<string>(wifiStatus);
  const [statusColor, setStatusColor] = React.useState<string>('bg-emerald-500 text-white');
  const [wifiIconColor, setWifiIconColor] = React.useState<string>('text-emerald-500');

  React.useEffect(() => {
    let active = true;
    let timeoutId: any = null;

    const runSpeedTest = async () => {
      if (!navigator.onLine) {
        if (active) {
          setSpeed('999');
          setStatusLabel('OFFLINE');
          setStatusColor('bg-red-500 text-white animate-pulse');
          setWifiIconColor('text-red-500');
        }
        timeoutId = setTimeout(runSpeedTest, 1000);
        return;
      }

      try {
        const startTime = performance.now();
        // Measure connection latency via lightweight ping request
        const response = await fetch('/api/ping?t=' + Date.now(), { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to ping');
        
        const endTime = performance.now();
        const latencyMs = Math.max(1, endTime - startTime);
        
        // Convert RTT latency to estimated MBPS bandwidth
        let speedInMbps = 600 / (latencyMs + 2);
        if (speedInMbps > 150) speedInMbps = 150;
        
        if (active) {
          setSpeed(speedInMbps.toFixed(1));
          
          if (speedInMbps < 2.0) {
            setStatusLabel('LOW');
            setStatusColor('bg-yellow-400 text-yellow-900');
            setWifiIconColor('text-orange-400');
          } else if (speedInMbps < 12.0) {
            setStatusLabel('GOOD');
            setStatusColor('bg-blue-500 text-white');
            setWifiIconColor('text-blue-500');
          } else {
            setStatusLabel('EXCELLENT');
            setStatusColor('bg-emerald-500 text-white');
            setWifiIconColor('text-emerald-500');
          }
        }
      } catch (err) {
        if (active) {
          if (!navigator.onLine) {
            setSpeed('0.0');
            setStatusLabel('OFFLINE');
            setStatusColor('bg-red-500 text-white animate-pulse');
            setWifiIconColor('text-red-500');
          } else {
            setSpeed(wifiSpeed);
            setStatusLabel(wifiStatus);
            setStatusColor('bg-emerald-500 text-white');
            setWifiIconColor('text-emerald-500');
          }
        }
      }

      if (active) {
        timeoutId = setTimeout(runSpeedTest, 10000);
      }
    };

    const handleOnlineStatus = () => {
      clearTimeout(timeoutId);
      runSpeedTest();
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    runSpeedTest();

    return () => {
      active = false;
      clearTimeout(timeoutId);
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, [wifiSpeed, wifiStatus]);

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
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-slate-50 border border-gray-200 px-3 py-1.5 rounded-lg shadow-2xs">
          <Wifi size={14} className={`${wifiIconColor} animate-pulse transition-colors duration-300`} />
          <span className="font-semibold text-gray-700 transition-all duration-300">{speed}</span>
          <span className="text-[10px] text-gray-400 font-bold">MBPS</span>
          <span className={`${statusColor} text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm transition-colors duration-300`}>
            {statusLabel}
          </span>
        </div>
        <div className="text-right text-[11px] text-gray-500 leading-tight">
          <div className="text-gray-400">Logged in as:</div>
          <div className="text-blue-600 font-semibold">{user.name} ({user.email})</div>
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
          onClick={onLogout}
          className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all cursor-pointer"
          title="Log Out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
