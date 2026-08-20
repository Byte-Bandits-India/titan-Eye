import type { ReactNode } from 'react';

import type { UserRole } from '../../types';

import { cn } from '../../lib/utils';

const ROLE_ID_BADGE_CLASSES: Record<UserRole, string> = {
  admin:
    'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300',
  optometrist:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  store:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
};

export type RoleIdBadgeProps = {
  children: ReactNode;
  role: UserRole;
};

export function RoleIdBadge({ children, role }: RoleIdBadgeProps) {
  return (
    <span className={cn('rounded border px-2 py-0.5 font-mono text-[10px] font-normal', ROLE_ID_BADGE_CLASSES[role])}>
      {children}
    </span>
  );
}
