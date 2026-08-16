import * as React from 'react';

import { usePagination } from '../../hooks/usePagination';
import { PAGINATION } from '../../options/Option';
import { useAppSelector } from '../../store';
import { ScrollArea } from '../ui/scroll-area';
import { Table, TableBody, TableCell, TableRow } from '../ui/table';
import { OptometristAvatar } from './OptometristAvatar';
import { PaginationBar } from './PaginationBar';

export function OptometristUsersPanel() {
  const users = useAppSelector((state) => state.users.users);
  const customers = useAppSelector((state) => state.customers.customers);
  const [pageSize, setPageSize] = React.useState<number>(PAGINATION.STORE_PAGE_SIZE);

  const optometristUsersWithStatus = React.useMemo(() => {
    const list = users.filter((u) => u.role === 'optometrist');

    return list.map((optometristUser) => {
      if (optometristUser.status === 'inactive') {
        return {
          ...optometristUser,
          activeCall: null,
          avail: { dotClass: 'bg-rose-500', tooltip: 'Inactive' },
        };
      }

      const isOnline = optometristUser.isLoggedIn ?? false;

      if (!isOnline) {
        return {
          ...optometristUser,
          activeCall: null,
          avail: { dotClass: 'bg-slate-400', tooltip: 'Offline' },
        };
      }

      const optometristNameLower = optometristUser.name.toLowerCase();
      const optometristEmailLower = optometristUser.email.toLowerCase();

      const activeCall = customers.find((c) => {
        const isCallActiveState = c.status === 'Initiated' || c.status === 'Accepted';

        if (!isCallActiveState || !c.callTakenBy) {
          return false;
        }

        const takenByLower = c.callTakenBy.toLowerCase();

        return takenByLower === optometristNameLower || takenByLower === optometristEmailLower;
      });

      if (activeCall) {
        return {
          ...optometristUser,
          activeCall,
          avail: {
            dotClass: 'bg-amber-500',
            tooltip: `In a call with ${activeCall.name} (${activeCall.storeName || 'Store'})`,
          },
        };
      }

      return {
        ...optometristUser,
        activeCall: null,
        avail: { dotClass: 'bg-emerald-500', tooltip: 'Available' },
      };
    });
  }, [users, customers]);

  const {
    currentPage: optometristCurrentPage,
    nextPage: optometristNextPage,
    paginatedItems: paginatedOptometristUsers,
    prevPage: optometristPrevPage,
    resetPage: optometristResetPage,
    totalItems: optometristTotalItems,
    totalPages: optometristTotalPages,
  } = usePagination(optometristUsersWithStatus, pageSize);

  const handleOptometristPageSizeChange = React.useCallback(
    (newSize: number) => {
      setPageSize(newSize);
      optometristResetPage();
    },
    [optometristResetPage]
  );

  return (
    <div className="flex min-h-[400px] w-full shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:w-[330px]">
      <div className="bg-muted/30 flex items-center justify-between gap-2 border-b border-border px-5 py-3">
        <div className="truncate text-xs font-medium text-foreground sm:text-sm">
          Optometrist Users & Availability
        </div>
      </div>

      <ScrollArea className="min-h-0 w-full flex-1">
        <Table>
          <TableBody>
            {paginatedOptometristUsers.length === 0 ? (
              <TableRow>
                <TableCell className="py-8 text-center text-muted-foreground">
                  No Optometrist found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedOptometristUsers.map((u) => {
                const avail = u.avail;
                const activeCall = u.activeCall;

                return (
                  <TableRow className="hover:bg-muted/50 transition-colors" key={u.email}>
                    <TableCell className="py-3 text-xs font-medium text-foreground">
                      <div className="flex w-full items-center justify-between gap-2.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="relative shrink-0" title={avail.tooltip}>
                            <OptometristAvatar className="h-9 w-9" email={u.email} name={u.name} />
                            <span
                              className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${avail.dotClass}`}
                            />
                          </div>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-xs font-medium text-foreground">{u.name}</span>
                            <span className="truncate font-mono text-[10px] text-muted-foreground">
                              {u.email}
                            </span>
                          </div>
                        </div>

                        {activeCall ? (
                          <div className="flex min-w-0 max-w-[120px] shrink-0 flex-col items-end text-right">
                            <span className="truncate text-[11px] font-medium text-amber-600 dark:text-amber-400">
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
        currentPage={optometristCurrentPage}
        itemsPerPage={pageSize}
        onItemsPerPageChange={handleOptometristPageSizeChange}
        onNext={optometristNextPage}
        onPrev={optometristPrevPage}
        totalItems={optometristTotalItems}
        totalPages={optometristTotalPages}
      />
    </div>
  );
}
