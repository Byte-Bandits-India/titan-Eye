import type { Table } from '@tanstack/react-table';

import type { ColumnOption, Customer, StatusTab, TabCounts } from '../../../types';

import { DataGrid, type DataGridFeatures } from '../../../components/reui/data-grid/data-grid';
import { DataGridScrollArea } from '../../../components/reui/data-grid/data-grid-scroll-area';
import { DataGridTable } from '../../../components/reui/data-grid/data-grid-table';
import { PaginationBar } from '../../../components/shared/PaginationBar';
import { StatusTabs } from './StatusTabs';

type RecentCustomersBodyProps = {
  columns?: ColumnOption[];
  currentPage?: number;
  customersTable: Table<DataGridFeatures, Customer>;
  onNextPage?: () => void;
  onPageSizeChange?: (size: number) => void;
  onPrevPage?: () => void;
  onResetColumns?: () => void;
  onStatusTabChange: (tab: StatusTab) => void;
  onToggleColumn?: (columnId: string) => void;
  pageSize?: number;
  paginatedCustomers: Customer[];
  statusTab: StatusTab;
  tabCounts: TabCounts;
  totalItems?: number;
  totalPages?: number;
  visibleColumns?: string[];
};

export function RecentCustomersBody({
  columns,
  currentPage = 1,
  customersTable,
  onNextPage,
  onPageSizeChange,
  onPrevPage,
  onResetColumns,
  onStatusTabChange,
  onToggleColumn,
  pageSize = 10,
  paginatedCustomers,
  statusTab,
  tabCounts,
  totalItems = 0,
  totalPages = 1,
}: RecentCustomersBodyProps) {
  return (
    <>
      <StatusTabs hideCompleted onValueChange={onStatusTabChange} tabCounts={tabCounts} value={statusTab} />

      <div className="border-b border-gray-200" />

      <div className="flex-1 overflow-x-auto">
        <DataGrid
          emptyMessage="No transactions found."
          recordCount={paginatedCustomers.length}
          table={customersTable}
          tableLayout={{
            dense: false,
            headerBackground: false,
            headerBorder: true,
            rowBorder: false,
            width: 'auto',
          }}
        >
          <DataGridScrollArea>
            <DataGridTable />
          </DataGridScrollArea>
        </DataGrid>
      </div>

      {onNextPage && onPrevPage && (
        <PaginationBar
          columns={columns}
          currentPage={currentPage}
          itemsPerPage={pageSize}
          onItemsPerPageChange={onPageSizeChange}
          onNext={onNextPage}
          onPrev={onPrevPage}
          onResetColumns={onResetColumns}
          onToggleColumn={onToggleColumn}
          totalItems={totalItems}
          totalPages={totalPages}
        />
      )}
    </>
  );
}
