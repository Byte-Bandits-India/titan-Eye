import { Pencil, Trash2 } from 'lucide-react';

import type { ManagedUser, User } from '../../../types';

import { PaginationBar } from '../../../components/shared/PaginationBar';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Switch } from '../../../components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { cn } from '../../../lib/utils';
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
  return (
    <>
      <div className="min-h-0 w-full flex-1 overflow-auto [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              {visibleColumns.includes('userId') && (
                <TableHead className="w-[120px] whitespace-nowrap text-sm font-medium text-muted-foreground">
                  User ID
                </TableHead>
              )}
              {visibleColumns.includes('name') && (
                <TableHead className="whitespace-nowrap text-sm font-medium text-muted-foreground">
                  User Name
                </TableHead>
              )}
              {visibleColumns.includes('email') && (
                <TableHead className="whitespace-nowrap text-sm font-medium text-muted-foreground">
                  Email
                </TableHead>
              )}
              {visibleColumns.includes('role') && (
                <TableHead className="whitespace-nowrap text-sm font-medium text-muted-foreground">
                  Type
                </TableHead>
              )}
              {visibleColumns.includes('mobile') && (
                <TableHead className="whitespace-nowrap text-sm font-medium text-muted-foreground">
                  Mobile
                </TableHead>
              )}
              {visibleColumns.includes('lastLogin') && (
                <TableHead className="whitespace-nowrap text-sm font-medium text-muted-foreground">
                  Last Login
                </TableHead>
              )}
              {visibleColumns.includes('status') && (
                <TableHead className="whitespace-nowrap text-sm font-medium text-muted-foreground">
                  Status
                </TableHead>
              )}
              {visibleColumns.includes('actions') && (
                <TableHead className="whitespace-nowrap pr-4 text-right text-sm font-medium text-muted-foreground">
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.length === 0 ? (
              <TableRow>
                <TableCell className="py-8 text-center text-muted-foreground" colSpan={visibleColumns.length}>
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedUsers.map((u) => (
                <TableRow key={u.email}>
                  {visibleColumns.includes('userId') && (
                    <TableCell className="whitespace-nowrap font-mono text-xs font-normal">
                      <span
                        className={cn(
                          'rounded border px-2 py-0.5 font-mono text-[10px] font-normal',
                          u.role === 'admin'
                            ? 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
                            : u.role === 'optometrist'
                              ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                        )}
                      >
                        {getRoleBasedUserId(u, users)}
                      </span>
                    </TableCell>
                  )}
                  {visibleColumns.includes('name') && (
                    <TableCell className="whitespace-nowrap font-normal text-foreground">{u.name}</TableCell>
                  )}
                  {visibleColumns.includes('email') && (
                    <TableCell className="whitespace-nowrap text-muted-foreground">{u.email}</TableCell>
                  )}
                  {visibleColumns.includes('role') && (
                    <TableCell className="whitespace-nowrap">
                      <Badge variant={u.role}>{u.role.toUpperCase()}</Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes('mobile') && (
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {u.mobile || '—'}
                    </TableCell>
                  )}
                  {visibleColumns.includes('lastLogin') && (
                    <TableCell className="whitespace-nowrap text-[#64748b] dark:text-zinc-400">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                    </TableCell>
                  )}
                  {visibleColumns.includes('status') && (
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={u.status === 'active'}
                          onCheckedChange={() => onToggleStatus(u.email, u.status)}
                        />
                        <Badge variant={u.status}>{u.status.toUpperCase()}</Badge>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes('actions') && (
                    <TableCell className="whitespace-nowrap pr-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button onClick={() => onEdit(u)} size="icon" title="Edit user" variant="ghost">
                          <Pencil size={14} />
                        </Button>
                        <Button
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950"
                          disabled={currentUser?.email === u.email}
                          onClick={() => onDelete(u)}
                          size="icon"
                          title={
                            currentUser?.email === u.email
                              ? "You can't delete your own account"
                              : 'Delete user'
                          }
                          variant="ghost"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
    </>
  );
}
