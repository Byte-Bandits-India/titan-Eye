import { type ColumnDef, useTable } from '@tanstack/react-table';
import * as React from 'react';

import type { OptometristUserRow } from '../../../types';

import {
  DataGrid,
  dataGridFeatures,
  type DataGridFeatures,
} from '../../../components/reui/data-grid/data-grid';
import { DataGridTable } from '../../../components/reui/data-grid/data-grid-table';
import { OptometristAvatar } from '../../../components/shared/OptometristAvatar';
import { PaginationBar } from '../../../components/shared/PaginationBar';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { usePagination } from '../../../hooks/usePagination';
import { cn } from '../../../lib/utils';
import { getOptometristStatusBadge, rankAvailability } from '../../../utils/optometristStatusBadge';

type OptometristUsersBodyProps = {
  data: OptometristUserRow[];
};

export function OptometristUsersBody({ data }: OptometristUsersBodyProps) {
  const [pageSize, setPageSize] = React.useState<number>(5);

  const sortedData = React.useMemo(
    () => [...data].sort((a, b) => rankAvailability(a) - rankAvailability(b)),
    [data]
  );

  const { currentPage, nextPage, paginatedItems, prevPage, resetPage, totalItems, totalPages } =
    usePagination(sortedData, pageSize);

  const handlePageSizeChange = React.useCallback(
    (newSize: number) => {
      setPageSize(newSize);
      resetPage();
    },
    [resetPage]
  );

  const columns = React.useMemo<ColumnDef<DataGridFeatures, OptometristUserRow>[]>(
    () => [
      {
        accessorKey: 'name',
        cell: ({ row }) => (
          <div className="flex items-center gap-3 py-0.5">
            <div className="relative shrink-0" title={row.original.avail.statusLabel}>
              <OptometristAvatar className="h-9 w-9" email={row.original.email} name={row.original.name} />
              <span
                className={cn(
                  'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card transition-all',
                  row.original.avail.dotClass
                )}
              />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-normal text-foreground">{row.original.name}</div>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {row.original.languages && row.original.languages.length > 0 ? (
                  row.original.languages.map((lang) => (
                    <span
                      className="inline-flex rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      key={lang}
                    >
                      {lang}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </div>
        ),
        enableSorting: false,
        header: () => <span className="text-sm font-medium text-muted-foreground">Optometrist</span>,
        id: 'name',
        meta: { cellClassName: 'py-2.5' },
        size: 260,
      },
      {
        cell: ({ row }) => {
          const { classes, label } = getOptometristStatusBadge(row.original);

          return (
            <span
              className={cn('inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-medium', classes)}
            >
              {label}
            </span>
          );
        },
        enableSorting: false,
        header: () => <span className="text-sm font-medium text-muted-foreground">Status</span>,
        id: 'status',
        meta: { cellClassName: 'py-2.5' },
        size: 120,
      },
    ],
    []
  );

  const table = useTable({
    columns,
    data: paginatedItems,
    features: dataGridFeatures,
    getRowId: (row: OptometristUserRow) => row.email,
    onPaginationChange: () => undefined,
    pageCount: 1,
    state: {
      pagination: { pageIndex: 0, pageSize: Math.max(paginatedItems.length, 1) },
    },
  });

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <ScrollArea className="min-h-0 w-full flex-1">
        <DataGrid
          emptyMessage="No Optometrist found."
          recordCount={paginatedItems.length}
          table={table}
          tableLayout={{
            dense: false,
            headerBorder: true,
            rowBorder: true,
          }}
        >
          <DataGridTable />
        </DataGrid>
      </ScrollArea>

      <PaginationBar
        currentPage={currentPage}
        itemsPerPage={pageSize}
        onItemsPerPageChange={handlePageSizeChange}
        onNext={nextPage}
        onPrev={prevPage}
        totalItems={totalItems}
        totalPages={totalPages}
      />
    </div>
  );
}
