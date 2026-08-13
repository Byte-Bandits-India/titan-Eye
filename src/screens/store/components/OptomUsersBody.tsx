import { type ColumnDef, useTable } from '@tanstack/react-table';
import * as React from 'react';

import type { OptomUserRow } from '../../../types';

import {
  DataGrid,
  dataGridFeatures,
  type DataGridFeatures,
} from '../../../components/reui/data-grid/data-grid';
import { DataGridTable } from '../../../components/reui/data-grid/data-grid-table';
import { OptomAvatar } from '../../../components/shared/OptomAvatar';
import { PaginationBar } from '../../../components/shared/PaginationBar';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { usePagination } from '../../../hooks/usePagination';
import { cn } from '../../../lib/utils';
import { renderCallDuration } from './cells';

type OptomUsersBodyProps = {
  data: OptomUserRow[];
};

export function OptomUsersBody({ data }: OptomUsersBodyProps) {
  const [pageSize, setPageSize] = React.useState<number>(5);

  const { currentPage, nextPage, paginatedItems, prevPage, resetPage, totalItems, totalPages } =
    usePagination(data, pageSize);

  const handlePageSizeChange = React.useCallback(
    (newSize: number) => {
      setPageSize(newSize);
      resetPage();
    },
    [resetPage]
  );

  const columns = React.useMemo<ColumnDef<DataGridFeatures, OptomUserRow>[]>(
    () => [
      {
        accessorKey: 'name',
        cell: ({ row }) => (
          <div className="flex items-center gap-3 py-0.5">
            <div className="relative shrink-0" title={row.original.avail.statusLabel}>
              <OptomAvatar className="h-9 w-9" email={row.original.email} name={row.original.name} />
              <span
                className={cn(
                  'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card transition-all',
                  row.original.avail.dotClass
                )}
              />
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-foreground">{row.original.name}</div>
              <div className="truncate font-mono text-[10px] text-muted-foreground">{row.original.email}</div>
            </div>
          </div>
        ),
        enableSorting: false,
        header: () => <span className="text-[10px] font-bold uppercase text-muted-foreground">Optom</span>,
        id: 'name',
        meta: { cellClassName: 'py-2.5' },
        size: 220,
      },
      {
        cell: ({ row }) =>
          row.original.activeCall ? (
            renderCallDuration(row.original.activeCall)
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        enableSorting: false,
        header: () => (
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Call Duration</span>
        ),
        id: 'callDuration',
        meta: { cellClassName: 'whitespace-nowrap py-2.5 text-xs text-muted-foreground' },
        size: 140,
      },
      {
        cell: ({ row }) =>
          row.original.activeCall ? (
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-semibold text-amber-600 dark:text-amber-400">
                {row.original.activeCall.name}
              </span>
              <span className="truncate text-[10px] text-muted-foreground">
                {row.original.activeCall.storeName || row.original.activeCall.id}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        enableSorting: false,
        header: () => (
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Talking To</span>
        ),
        id: 'talkingTo',
        meta: { cellClassName: 'py-2.5' },
        size: 160,
      },
    ],
    []
  );

  const table = useTable({
    columns,
    data: paginatedItems,
    features: dataGridFeatures,
    getRowId: (row: OptomUserRow) => row.email,
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
          emptyMessage="No Optom users found."
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
