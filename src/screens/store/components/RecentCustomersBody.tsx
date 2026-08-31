import { memo } from 'react';
import type { Table } from '@tanstack/react-table';

import type { ColumnOption, Customer, StatusTab, TabCounts } from '../../../types';

import { DataGrid, type DataGridFeatures } from '../../../components/reui/data-grid/data-grid';
import { DataGridScrollArea } from '../../../components/reui/data-grid/data-grid-scroll-area';
import { DataGridTable } from '../../../components/reui/data-grid/data-grid-table';
import { PaginationBar } from '../../../components/shared/PaginationBar';
import { TableSkeleton } from '../../../components/shared/TableSkeleton';
import { StatusTabs } from './StatusTabs';

const RECENT_CUSTOMERS_SKELETON_COLUMN_WIDTHS = ['80px', '150px', '160px', '110px', '110px', '100px'];

type RecentCustomersBodyProps = {
  columns?: ColumnOption[];
  currentPage?: number;
  customersTable: Table<DataGridFeatures, Customer>;
  hideStatusTabs?: boolean;
  isLoading?: boolean;
  onlyPendingAndAll?: boolean;
  onNextPage?: () => void;
  onPageSizeChange?: (size: number) => void;
  onPrevPage?: () => void;
  onResetColumns?: () => void;
  onStatusTabChange: (tab: StatusTab) => void;
  onToggleColumn?: (columnId: string) => void;
  pageSize?: number;
  paginatedCustomers: Customer[];
  pendingLabel?: string;
  statusTab: StatusTab;
  tabCounts: TabCounts;
  totalItems?: number;
  totalPages?: number;
  visibleColumns?: string[];
};

export const RecentCustomersBody = memo(function RecentCustomersBody({
  columns,
  currentPage = 1,
  customersTable,
  hideStatusTabs,
  isLoading,
  onlyPendingAndAll,
  onNextPage,
  onPageSizeChange,
  onPrevPage,
  onResetColumns,
  onStatusTabChange,
  onToggleColumn,
  pageSize = 10,
  paginatedCustomers,
  pendingLabel,
  statusTab,
  tabCounts,
  totalItems = 0,
  totalPages = 1,
  visibleColumns,
}: RecentCustomersBodyProps) {
  return (
    <>
      {!hideStatusTabs && (
        <StatusTabs
          hideCompleted
          onlyPendingAndAll={onlyPendingAndAll}
          onValueChange={onStatusTabChange}
          pendingLabel={pendingLabel}
          tabCounts={tabCounts}
          value={statusTab}
        />
      )}

      <div className="border-b border-gray-200" />

      <div className="flex-1 overflow-x-auto">
        {isLoading ? (
          <TableSkeleton columnWidths={RECENT_CUSTOMERS_SKELETON_COLUMN_WIDTHS} />
        ) : (
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
        )}
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
          visibleColumns={visibleColumns}
        />
      )}
    </>
  );
},
(prevProps, nextProps) =>
  prevProps.statusTab === nextProps.statusTab &&
  prevProps.isLoading === nextProps.isLoading &&
  prevProps.currentPage === nextProps.currentPage &&
  prevProps.pageSize === nextProps.pageSize &&
  prevProps.totalItems === nextProps.totalItems &&
  prevProps.totalPages === nextProps.totalPages &&
  prevProps.pendingLabel === nextProps.pendingLabel &&
  prevProps.hideStatusTabs === nextProps.hideStatusTabs &&
  prevProps.onlyPendingAndAll === nextProps.onlyPendingAndAll &&
  prevProps.paginatedCustomers === nextProps.paginatedCustomers &&
  prevProps.customersTable === nextProps.customersTable &&
  prevProps.visibleColumns === nextProps.visibleColumns &&
  prevProps.tabCounts.all === nextProps.tabCounts.all &&
  prevProps.tabCounts.pending === nextProps.tabCounts.pending &&
  prevProps.tabCounts.inProgress === nextProps.tabCounts.inProgress &&
  prevProps.tabCounts.completed === nextProps.tabCounts.completed
);
