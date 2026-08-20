import { Download } from 'lucide-react';
import * as React from 'react';

import type { Customer, CustomerStatusTab, CustomerTabCounts } from '../../../types';

import { PaginationBar } from '../../../components/shared/PaginationBar';
import { DataTable, type DataTableColumn } from '../../../components/shared/table/DataTable';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { exportSingleCustomerReport } from '../../../utils/excelExport';
import { StatusTabs } from '../../store/components/StatusTabs';
import { renderCallDuration, renderTimeStarted } from './cells';

interface CustomerDirectoryBodyProps {
  currentPage: number;
  customerStatusTab: CustomerStatusTab;
  onNextPage: () => void;
  onPageSizeChange: (size: number) => void;
  onPrevPage: () => void;
  onStatusTabChange: (tab: CustomerStatusTab) => void;
  pageSize: number;
  paginatedCustomers: Customer[];
  tabCounts: CustomerTabCounts;
  totalItems: number;
  totalPages: number;
  visibleColumns: string[];
}

export function CustomerDirectoryBody({
  currentPage,
  customerStatusTab,
  onNextPage,
  onPageSizeChange,
  onPrevPage,
  onStatusTabChange,
  pageSize,
  paginatedCustomers,
  tabCounts,
  totalItems,
  totalPages,
  visibleColumns,
}: CustomerDirectoryBodyProps) {
  const columns = React.useMemo<DataTableColumn<Customer>[]>(
    () => [
      {
        cellClassName: 'whitespace-nowrap py-3 text-xs font-normal text-blue-600 dark:text-blue-400',
        headerClassName: 'w-[80px] whitespace-nowrap text-sm font-medium text-muted-foreground',
        id: 'id',
        label: 'ID',
        render: (cust) => cust.id,
      },
      {
        cellClassName: 'whitespace-nowrap py-3 text-xs font-normal text-foreground',
        headerClassName: 'whitespace-nowrap text-sm font-medium text-muted-foreground',
        id: 'name',
        label: 'Name',
        render: (cust) => cust.name,
      },
      {
        cellClassName: 'whitespace-nowrap py-3 text-xs text-muted-foreground',
        id: 'storeName',
        label: 'Store Code',
        render: (cust) => cust.storeName || '—',
      },
      {
        cellClassName: 'whitespace-nowrap py-3 text-xs text-muted-foreground',
        id: 'timeStarted',
        label: 'Time Started',
        render: (cust) => renderTimeStarted(cust),
      },
      {
        cellClassName: 'whitespace-nowrap py-3 text-xs text-muted-foreground',
        id: 'callDuration',
        label: 'Call Duration',
        render: (cust) => renderCallDuration(cust),
      },
      {
        cellClassName: 'whitespace-nowrap py-3 text-xs text-muted-foreground',
        id: 'ageGender',
        label: 'Age / Gender',
        render: (cust) => `${cust.age} / ${cust.gender}`,
      },
      {
        cellClassName: 'whitespace-nowrap py-3 text-xs text-muted-foreground',
        id: 'mobile',
        label: 'Mobile',
        render: (cust) => cust.mobile || '—',
      },
      {
        cellClassName: 'whitespace-nowrap py-3',
        id: 'status',
        label: 'Status',
        render: (cust) => <Badge variant={cust.status}>{cust.status.toUpperCase()}</Badge>,
      },
      {
        cellClassName: 'whitespace-nowrap py-3 text-xs text-muted-foreground',
        id: 'lastUpdated',
        label: 'Last Updated',
        render: (cust) => cust.lastUpdatedOn || '—',
      },
      {
        cellClassName: 'whitespace-nowrap py-3 text-center',
        headerClassName: 'whitespace-nowrap text-center text-sm font-medium text-muted-foreground',
        id: 'report',
        label: 'Report',
        render: (cust) => (
          <Button
            className="h-7 cursor-pointer gap-1 rounded-[50px] border-blue-200 bg-blue-50 px-2.5 text-[11px] font-medium text-blue-700 transition-all hover:bg-blue-100 active:scale-95 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50"
            onClick={() => exportSingleCustomerReport(cust)}
            size="sm"
            title={`Download ${cust.name} Excel Report`}
            variant="outline"
          >
            <Download size={12} />
            <span>Export</span>
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <>
      <StatusTabs
        hideCompleted
        onValueChange={(v) => onStatusTabChange(v as CustomerStatusTab)}
        pendingLabel="Queue"
        tabCounts={tabCounts}
        value={customerStatusTab}
      />

      <DataTable
        columns={columns}
        emptyMessage="No customers found."
        getRowKey={(cust) => cust.id}
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
