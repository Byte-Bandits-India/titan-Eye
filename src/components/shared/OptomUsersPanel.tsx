import * as React from 'react';

import { usePagination } from '../../hooks/usePagination';
import { PAGINATION } from '../../options/Option';
import { useAppSelector } from '../../store';
import { Table, TableBody, TableCell, TableRow } from '../ui/table';
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
          avail: { dotClass: 'bg-rose-500', tooltip: 'Inactive' },
        };
      }

      const isOnline = optomUser.isLoggedIn ?? false;

      if (!isOnline) {
        return {
          ...optomUser,
          avail: { dotClass: 'bg-slate-400', tooltip: 'Offline' },
        };
      }

      const optomNameLower = optomUser.name.toLowerCase();
      const optomEmailLower = optomUser.email.toLowerCase();

      const activeCall = customers.find((c) => {
        const isCallActiveState = c.status === 'Initiated' || c.status === 'Accepted';

        if (!isCallActiveState || !c.callTakenBy) {return false;}

        const takenByLower = c.callTakenBy.toLowerCase();

        return (
          takenByLower === optomNameLower ||
          takenByLower === optomEmailLower
        );
      });

      if (activeCall) {
        return {
          ...optomUser,
          avail: { dotClass: 'bg-amber-500', tooltip: `In a call with ${activeCall.storeName || 'a store'}` },
        };
      }

      return {
        ...optomUser,
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

  const handleOptomPageSizeChange = React.useCallback((newSize: number) => {
    setPageSize(newSize);
    optomResetPage();
  }, [optomResetPage]);

  return (
    <div className="w-full lg:w-[330px] shrink-0 bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col min-h-[400px]">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-muted/30 gap-2">
        <div className="text-xs sm:text-sm font-bold text-foreground truncate">
          Optom Users & Availability
        </div>
      </div>

      <div className="flex-1">
        <Table>
          <TableBody>
            {paginatedOptomUsers.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-8 text-muted-foreground">
                  No Optom users found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedOptomUsers.map((u) => {
                const avail = u.avail;

                return (
                  <TableRow className="hover:bg-muted/50 transition-colors" key={u.email}>
                    <TableCell className="font-semibold text-foreground text-xs py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="relative shrink-0" title={avail.tooltip}>
                          <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center border border-teal-200 dark:border-teal-800">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${avail.dotClass}`} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="truncate font-semibold text-foreground">{u.name}</span>
                          <span className="truncate text-[10px] text-muted-foreground font-mono">{u.email}</span>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

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
