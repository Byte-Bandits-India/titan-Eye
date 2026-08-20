import type { Customer, ManagedUser, OptometristUserAvailability, OptometristUserRow } from '../types';

const OFFLINE_AVAIL: OptometristUserAvailability = {
  badgeClass:
    'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  dotClass: 'bg-slate-400',
  ping: false,
  statusLabel: 'Offline',
};

const AVAILABLE_AVAIL: OptometristUserAvailability = {
  badgeClass:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  dotClass: 'bg-emerald-500',
  ping: true,
  statusLabel: 'Available',
};

const ONLINE_AVAIL: OptometristUserAvailability = {
  ...AVAILABLE_AVAIL,
  statusLabel: 'Online',
};

function findActiveCall(user: ManagedUser, customers: Customer[]): Customer | null {
  const nameLower = user.name.toLowerCase();
  const emailLower = user.email.toLowerCase();

  return (
    customers.find((c) => {
      const isCallActiveState = c.status === 'Initiated' || c.status === 'Accepted';

      if (!isCallActiveState || !c.callTakenBy) {
        return false;
      }

      const takenByLower = c.callTakenBy.toLowerCase();

      return takenByLower === nameLower || takenByLower === emailLower;
    }) ?? null
  );
}

export function computeOptometristAvailability(users: ManagedUser[], customers: Customer[]): OptometristUserRow[] {
  return users
    .filter((u) => u.role === 'optometrist')
    .map((user) => {
      if (user.status === 'inactive' || !(user.isLoggedIn ?? false)) {
        return { ...user, activeCall: null, avail: OFFLINE_AVAIL };
      }

      const activeCall = findActiveCall(user, customers);

      if (activeCall) {
        return {
          ...user,
          activeCall,
          avail: {
            badgeClass:
              'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800',
            dotClass: 'bg-amber-500',
            ping: true,
            statusLabel: `In call (${activeCall.storeName || 'Store'})`,
          },
        };
      }

      return { ...user, activeCall: null, avail: AVAILABLE_AVAIL };
    });
}

export function computeStoreAvailability(users: ManagedUser[]): OptometristUserRow[] {
  return users
    .filter((u) => u.role === 'store')
    .map((user) => {
      const isOnline = user.status !== 'inactive' && (user.isLoggedIn ?? false);

      return {
        ...user,
        activeCall: null,
        avail: isOnline ? ONLINE_AVAIL : OFFLINE_AVAIL,
      };
    });
}
