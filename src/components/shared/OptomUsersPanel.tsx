import * as React from 'react';

import { usePagination } from '../../hooks/usePagination';
import { PAGINATION } from '../../options/Option';
import { useAppSelector } from '../../store';
import { ScrollArea } from '../ui/scroll-area';
import { Table, TableBody, TableCell, TableRow } from '../ui/table';
import { OptomAvatar } from './OptomAvatar';
import { PaginationBar } from './PaginationBar';

export function OptomUsersPanel() {
  const users = useAppSelector((state) => state.users.users);
  const customers = useAppSelector((state) => state.customers.customers);
  const [pageSize, setPageSize] = React.useState<number>(PAGINATION.STORE_PAGE_SIZE);

  const optomUsersWithStatus = React.useMemo(() => {
    const list = users.filter((u) => u.role === 'optom');

    return list.map((optomUser) => {
      if (optomUser.status === 'inactive') {
        return {
          ...optomUser,
          activeCall: null,
          avail: { dotClass: 'bg-rose-500', tooltip: 'Inactive' },
        };
      }

      const isOnline = optomUser.isLoggedIn ?? false;

      if (!isOnline) {
        return {
          ...optomUser,
          activeCall: null,
          avail: { dotClass: 'bg-slate-400', tooltip: 'Offline' },
        };
      }

      const optomNameLower = optomUser.name.toLowerCase();
      const optomEmailLower = optomUser.email.toLowerCase();

      const activeCall = customers.find((c) => {
        const isCallActiveState = c.status === 'Initiated' || c.status === 'Accepted';

        if (!isCallActiveState || !c.callTakenBy) {
          return false;
        }

        const takenByLower = c.callTakenBy.toLowerCase();

        return takenByLower === optomNameLower || takenByLower === optomEmailLower;
      });

      if (activeCall) {
        return {
          ...optomUser,
          activeCall,
          avail: {
            dotClass: 'bg-amber-500',
            tooltip: `In a call with ${activeCall.name} (${activeCall.storeName || 'Store'})`,
          },
        };
      }

      return {
        ...optomUser,
        activeCall: null,
        avail: { dotClass: 'bg-emerald-500', tooltip: 'Available' },
      };
    });
  }, [users, customers]);

  const {
    currentPage: optomCurrentPage,
    nextPage: optomNextPage,
    paginatedItems: paginatedOptomUsers,
    prevPage: optomPrevPage,
    resetPage: optomResetPage,
    totalItems: optomTotalItems,
    totalPages: optomTotalPages,
  } = usePagination(optomUsersWithStatus, pageSize);

  const handleOptomPageSizeChange = React.useCallback(
    (newSize: number) => {
      setPageSize(newSize);
      optomResetPage();
    },
    [optomResetPage]
  );

  return (
    <div className="flex min-h-[400px] w-full shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:w-[330px]">
      <div className="bg-muted/30 flex items-center justify-between gap-2 border-b border-border px-5 py-3">
        <div className="truncate text-xs font-bold text-foreground sm:text-sm">
          Optom Users & Availability
        </div>
      </div>

      <ScrollArea className="min-h-0 w-full flex-1">
        <Table>
          <TableBody>
            {paginatedOptomUsers.length === 0 ? (
              <TableRow>
                <TableCell className="py-8 text-center text-muted-foreground">
                  No Optom users found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedOptomUsers.map((u) => {
                const avail = u.avail;
                const activeCall = u.activeCall;

                return (
                  <TableRow className="hover:bg-muted/50 transition-colors" key={u.email}>
                    <TableCell className="py-3 text-xs font-semibold text-foreground">
                      <div className="flex w-full items-center justify-between gap-2.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="relative shrink-0" title={avail.tooltip}>
                            <OptomAvatar className="h-9 w-9" email={u.email} name={u.name} />
                            <span
                              className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${avail.dotClass}`}
                            />
                          </div>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-xs font-semibold text-foreground">{u.name}</span>
                            <span className="truncate font-mono text-[10px] text-muted-foreground">
                              {u.email}
                            </span>
                          </div>
                        </div>

                        {activeCall ? (
                          <div className="flex min-w-0 max-w-[120px] shrink-0 flex-col items-end text-right">
                            <span className="truncate text-[11px] font-bold text-amber-600 dark:text-amber-400">
                              {activeCall.name}
                            </span>
                            <span className="truncate text-[10px] text-muted-foreground">
                              {activeCall.storeName || activeCall.id}
                            </span>
                          </div>
                        ) : (
                          <span className="shrink-0 text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      <PaginationBar
        currentPage={optomCurrentPage}
        itemsPerPage={pageSize}
        onItemsPerPageChange={handleOptomPageSizeChange}
        onNext={optomNextPage}
        onPrev={optomPrevPage}
        totalItems={optomTotalItems}
        totalPages={optomTotalPages}
      />
    </div>
  );
}
