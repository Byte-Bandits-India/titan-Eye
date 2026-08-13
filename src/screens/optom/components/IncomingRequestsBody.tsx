import type { Table } from '@tanstack/react-table';

import type { ColumnOption, Customer, StatusTab, TabCounts } from '../../../types';

import { DataGrid, type DataGridFeatures } from '../../../components/reui/data-grid/data-grid';
import { DataGridScrollArea } from '../../../components/reui/data-grid/data-grid-scroll-area';
import { DataGridTable } from '../../../components/reui/data-grid/data-grid-table';
import { PaginationBar } from '../../../components/shared/PaginationBar';
import { StatusTabs } from '../../store/components/StatusTabs';

type IncomingRequestsBodyProps = {
  columns?: ColumnOption[];
  currentPage?: number;
  onNextPage?: () => void;
  onPageSizeChange?: (size: number) => void;
  onPrevPage?: () => void;
  onResetColumns?: () => void;
  onStatusTabChange: (tab: StatusTab) => void;
  onToggleColumn?: (columnId: string) => void;
  pageSize?: number;
  paginatedRequests: Customer[];
  requestsTable: Table<DataGridFeatures, Customer>;
  statusTab: StatusTab;
  tabCounts: TabCounts;
  totalItems?: number;
  totalPages?: number;
  visibleColumns?: string[];
};

export function IncomingRequestsBody({
  columns,
  currentPage = 1,
  onNextPage,
  onPageSizeChange,
  onPrevPage,
  onResetColumns,
  onStatusTabChange,
  onToggleColumn,
  pageSize = 6,
  paginatedRequests,
  requestsTable,
  statusTab,
  tabCounts,
  totalItems = 0,
  totalPages = 1,
  visibleColumns,
}: IncomingRequestsBodyProps) {
  return (
    <>
      <StatusTabs onValueChange={onStatusTabChange} tabCounts={tabCounts} value={statusTab} />

      <div className="flex-1 overflow-x-auto">
        <DataGrid
          emptyMessage="No pending requests in queue."
          recordCount={paginatedRequests.length}
          table={requestsTable}
          tableLayout={{
            dense: false,
            headerBackground: true,
            headerBorder: true,
            rowBorder: true,
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
          visibleColumns={visibleColumns}
        />
      )}
    </>
  );
}
