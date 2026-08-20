import { MessageSquare } from 'lucide-react';
import * as React from 'react';

import type { Customer } from '../../../types';

import { PaginationBar } from '../../../components/shared/PaginationBar';
import { DataTable, type DataTableColumn } from '../../../components/shared/table/DataTable';
import { Badge } from '../../../components/ui/badge';

interface FeedbackDirectoryBodyProps {
  currentPage: number;
  onNextPage: () => void;
  onPageSizeChange: (size: number) => void;
  onPrevPage: () => void;
  pageSize: number;
  paginatedCustomers: Customer[];
  totalItems: number;
  totalPages: number;
  visibleColumns: string[];
}

const EMPTY_MESSAGE = (
  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
    <MessageSquare className="h-8 w-8 text-slate-300 dark:text-slate-600" />
    <p className="text-sm font-medium">No patient feedback submitted yet.</p>
  </div>
);

export function FeedbackDirectoryBody({
  currentPage,
  onNextPage,
  onPageSizeChange,
  onPrevPage,
  pageSize,
  paginatedCustomers,
  totalItems,
  totalPages,
  visibleColumns,
}: FeedbackDirectoryBodyProps) {
  const columns = React.useMemo<DataTableColumn<Customer>[]>(
    () => [
      {
        cellClassName: 'font-mono text-xs font-normal text-slate-600 dark:text-slate-400',
        headerClassName: 'w-28 text-sm font-medium text-muted-foreground',
        id: 'id',
        label: 'Patient ID',
        render: (cust) => cust.id,
      },
      {
        headerClassName: 'w-44 text-sm font-medium text-muted-foreground',
        id: 'name',
        label: 'Name',
        render: (cust) => (
          <>
            <div className="font-normal text-foreground">{cust.name}</div>
            <div className="text-xs text-muted-foreground">
              {cust.age} yrs • {cust.gender}
            </div>
          </>
        ),
      },
      {
        headerClassName: 'w-36 text-sm font-medium text-muted-foreground',
        id: 'storeName',
        label: 'Store Code',
        render: (cust) => (
          <Badge className="bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300" variant="outline">
            {cust.storeName}
          </Badge>
        ),
      },
      {
        cellClassName: 'font-mono text-xs text-slate-600 dark:text-slate-400',
        headerClassName: 'w-90 text-sm font-medium text-muted-foreground',
        id: 'storeContactEmail',
        label: 'Store Email',
        render: (cust) => cust.storeContactEmail || '—',
      },
      {
        headerClassName: 'text-sm font-medium text-muted-foreground',
        id: 'patientFeedback',
        label: 'Patient Feedback',
        render: (cust) => (
          <div className="flex items-start gap-2 p-2.5 text-xs text-slate-800 dark:text-slate-200">
            <span className="leading-relaxed">{cust.patientFeedback}</span>
          </div>
        ),
      },
      {
        cellClassName: 'text-right text-xs text-muted-foreground',
        headerClassName: 'w-32 text-right text-sm font-medium text-muted-foreground',
        id: 'lastUpdated',
        label: 'Date',
        render: (cust) =>
          cust.lastUpdatedOn
            ? new Date(cust.lastUpdatedOn).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : '—',
      },
    ],
    []
  );

  return (
    <>
      <DataTable
        columns={columns}
        emptyMessage={EMPTY_MESSAGE}
        getRowKey={(cust) => cust.id}
        headerClassName="sticky top-0 z-10"
        headerRowClassName="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50"
        rowClassName={() => 'group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/40'}
        rows={paginatedCustomers}
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
