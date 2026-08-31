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

export const UserDirectoryBody = React.memo(
  function UserDirectoryBody({
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
          cellClassName: 'whitespace-nowrap font-mono text-sm font-medium',
          headerClassName: 'w-[120px] whitespace-nowrap text-sm font-semibold   text-muted-foreground',
          id: 'userId',
          label: 'User ID',
          render: (u) => <RoleIdBadge role={u.role}>{getRoleBasedUserId(u, users)}</RoleIdBadge>,
        },
        {
          cellClassName: 'whitespace-nowrap text-sm sm:text-sm font-medium text-foreground',
          headerClassName: 'whitespace-nowrap text-sm font-semibold   text-muted-foreground',
          id: 'name',
          label: 'User Name',
          render: (u) => u.name,
        },
        {
          cellClassName: 'whitespace-nowrap text-sm text-muted-foreground',
          headerClassName: 'whitespace-nowrap text-sm font-semibold   text-muted-foreground',
          id: 'email',
          label: 'Email',
          render: (u) => u.email,
        },
        {
          cellClassName: 'whitespace-nowrap',
          headerClassName: 'whitespace-nowrap text-sm font-semibold   text-muted-foreground',
          id: 'role',
          label: 'Type',
          render: (u) => <Badge variant={u.role}>{u.role.toUpperCase()}</Badge>,
        },
        {
          cellClassName: 'whitespace-nowrap text-sm text-muted-foreground',
          headerClassName: 'whitespace-nowrap text-sm font-semibold   text-muted-foreground',
          id: 'mobile',
          label: 'Mobile',
          render: (u) => u.mobile || '—',
        },
        {
          cellClassName: 'whitespace-nowrap text-sm text-muted-foreground',
          headerClassName: 'whitespace-nowrap text-sm font-semibold   text-muted-foreground',
          id: 'lastLogin',
          label: 'Last Login',
          render: (u) => (u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'),
        },
        {
          cellClassName: 'whitespace-nowrap',
          headerClassName: 'whitespace-nowrap text-sm font-semibold   text-muted-foreground',
          id: 'status',
          label: 'Status',
          render: (u) => (
            <div className="flex items-center gap-2">
              <Switch
                checked={u.status === 'active'}
                onCheckedChange={() => onToggleStatus(u.email, u.status)}
              />
              <span
                className={`text-sm font-medium ${u.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}
              >
                {u.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
          ),
        },
        {
          cellClassName: 'whitespace-nowrap text-right',
          headerClassName: 'w-[100px] whitespace-nowrap text-right text-sm font-semibold   text-muted-foreground',
          id: 'actions',
          label: 'Actions',
          render: (u) => (
            <div className="flex items-center justify-end gap-1">
              <Button
                className="text-muted-foreground hover:text-foreground"
                onClick={() => onEdit(u)}
                size="icon-sm"
                title="Edit User"
                variant="ghost"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {currentUser?.email !== u.email && (
                <Button
                  className="text-muted-foreground hover:text-rose-600"
                  onClick={() => onDelete(u)}
                  size="icon-sm"
                  title="Delete User"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ),
        },
      ],
      [currentUser?.email, onDelete, onEdit, onToggleStatus, users]
    );

    return (
      <div className="flex flex-1 flex-col justify-between overflow-hidden">
        <div className="flex-1 overflow-x-auto">
          <DataTable
            columns={columns}
            emptyMessage="No users found."
            getRowKey={(u) => u.email}
            rows={paginatedUsers}
            visibleColumns={visibleColumns}
          />
        </div>

        <PaginationBar
          currentPage={currentPage}
          itemsPerPage={pageSize}
          onItemsPerPageChange={onPageSizeChange}
          onNext={onNextPage}
          onPrev={onPrevPage}
          totalItems={totalItems}
          totalPages={totalPages}
        />
      </div>
    );
  },
  (prev, next) =>
    prev.currentPage === next.currentPage &&
    prev.pageSize === next.pageSize &&
    prev.totalItems === next.totalItems &&
    prev.totalPages === next.totalPages &&
    prev.paginatedUsers === next.paginatedUsers &&
    prev.users === next.users &&
    prev.visibleColumns === next.visibleColumns &&
    prev.currentUser?.email === next.currentUser?.email
);
