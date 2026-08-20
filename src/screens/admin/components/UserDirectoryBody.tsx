import { Pencil, Trash2 } from 'lucide-react';
import * as React from 'react';

import type { ManagedUser, User } from '../../../types';

import { PaginationBar } from '../../../components/shared/PaginationBar';
import { RoleIdBadge } from '../../../components/shared/RoleIdBadge';
import { DataTable, type DataTableColumn } from '../../../components/shared/table/DataTable';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Switch } from '../../../components/ui/switch';
import { getRoleBasedUserId } from './adminUtils';

interface UserDirectoryBodyProps {
  currentPage: number;
  currentUser: ManagedUser | null | User;
  onDelete: (u: ManagedUser) => void;
  onEdit: (u: ManagedUser) => void;
  onNextPage: () => void;
  onPageSizeChange: (size: number) => void;
  onPrevPage: () => void;
  onToggleStatus: (email: string, currentStatus: 'active' | 'inactive') => void;
  pageSize: number;
  paginatedUsers: ManagedUser[];
  totalItems: number;
  totalPages: number;
  users: ManagedUser[];
  visibleColumns: string[];
}

export function UserDirectoryBody({
  currentPage,
  currentUser,
  onDelete,
  onEdit,
  onNextPage,
  onPageSizeChange,
  onPrevPage,
  onToggleStatus,
  pageSize,
  paginatedUsers,
  totalItems,
  totalPages,
  users,
  visibleColumns,
}: UserDirectoryBodyProps) {
  const columns = React.useMemo<DataTableColumn<ManagedUser>[]>(
    () => [
      {
        cellClassName: 'whitespace-nowrap font-mono text-xs font-normal',
        headerClassName: 'w-[120px] whitespace-nowrap text-sm font-medium text-muted-foreground',
        id: 'userId',
        label: 'User ID',
        render: (u) => <RoleIdBadge role={u.role}>{getRoleBasedUserId(u, users)}</RoleIdBadge>,
      },
      {
        cellClassName: 'whitespace-nowrap font-normal text-foreground',
        id: 'name',
        label: 'User Name',
        render: (u) => u.name,
      },
      {
        cellClassName: 'whitespace-nowrap text-muted-foreground',
        id: 'email',
        label: 'Email',
        render: (u) => u.email,
      },
      {
        cellClassName: 'whitespace-nowrap',
        id: 'role',
        label: 'Type',
        render: (u) => <Badge variant={u.role}>{u.role.toUpperCase()}</Badge>,
      },
      {
        cellClassName: 'whitespace-nowrap text-muted-foreground',
        id: 'mobile',
        label: 'Mobile',
        render: (u) => u.mobile || '—',
      },
      {
        cellClassName: 'whitespace-nowrap text-[#64748b] dark:text-zinc-400',
        id: 'lastLogin',
        label: 'Last Login',
        render: (u) => (u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'),
      },
      {
        cellClassName: 'whitespace-nowrap',
        id: 'status',
        label: 'Status',
        render: (u) => (
          <div className="flex items-center gap-2">
            <Switch checked={u.status === 'active'} onCheckedChange={() => onToggleStatus(u.email, u.status)} />
            <Badge variant={u.status}>{u.status.toUpperCase()}</Badge>
          </div>
        ),
      },
      {
        cellClassName: 'whitespace-nowrap pr-4 text-right',
        headerClassName: 'whitespace-nowrap pr-4 text-right text-sm font-medium text-muted-foreground',
        id: 'actions',
        label: 'Actions',
        render: (u) => (
          <div className="flex items-center justify-end gap-1">
            <Button onClick={() => onEdit(u)} size="icon" title="Edit user" variant="ghost">
              <Pencil size={14} />
            </Button>
            <Button
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950"
              disabled={currentUser?.email === u.email}
              onClick={() => onDelete(u)}
              size="icon"
              title={currentUser?.email === u.email ? "You can't delete your own account" : 'Delete user'}
              variant="ghost"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ),
      },
    ],
    [currentUser, onDelete, onEdit, onToggleStatus, users]
  );

  return (
    <>
      <DataTable
        columns={columns}
        emptyMessage="No users found."
        getRowKey={(u) => u.email}
        rows={paginatedUsers}
        visibleColumns={visibleColumns}
      />
      <PaginationBar
        currentPage={currentPage}
        itemsPerPage={pageSize}
        onItemsPerPageChange={onPageSizeChange}
        onNext={onNextPage}
        onPrev={onPrevPage}
        totalItems={totalItems}
        totalPages={totalPages}
      />
    </>
  );
}
