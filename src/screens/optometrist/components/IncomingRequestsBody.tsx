import { memo } from 'react';
import type { Table } from '@tanstack/react-table';

import type { ColumnOption, Customer, StatusTab, TabCounts } from '../../../types';

import { DataGrid, type DataGridFeatures } from '../../../components/reui/data-grid/data-grid';
import { DataGridScrollArea } from '../../../components/reui/data-grid/data-grid-scroll-area';
import { DataGridTable } from '../../../components/reui/data-grid/data-grid-table';
import { PaginationBar } from '../../../components/shared/PaginationBar';
import { TableSkeleton } from '../../../components/shared/TableSkeleton';
import { StatusTabs } from '../../store/components/StatusTabs';

const INCOMING_REQUESTS_SKELETON_COLUMN_WIDTHS = ['60px', '110px', '100px', '50px', '160px', '90px'];

type IncomingRequestsBodyProps = {
  columns?: ColumnOption[];
  currentPage?: number;
  isLoading?: boolean;
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

export const IncomingRequestsBody = memo(
  function IncomingRequestsBody({
    columns,
    currentPage = 1,
    isLoading,
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
        <StatusTabs
          hideCompleted
          onValueChange={onStatusTabChange}
          pendingLabel="Queue"
          tabCounts={tabCounts}
          value={statusTab}
        />

        <div className="border-b border-gray-200" />

        <div className="flex-1 overflow-x-auto">
          {isLoading ? (
            <TableSkeleton columnWidths={INCOMING_REQUESTS_SKELETON_COLUMN_WIDTHS} />
          ) : (
            <DataGrid
              emptyMessage="No pending requests in queue."
              recordCount={paginatedRequests.length}
              table={requestsTable}
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
    prevProps.paginatedRequests === nextProps.paginatedRequests &&
    prevProps.requestsTable === nextProps.requestsTable &&
    prevProps.visibleColumns === nextProps.visibleColumns &&
    prevProps.tabCounts.all === nextProps.tabCounts.all &&
    prevProps.tabCounts.pending === nextProps.tabCounts.pending &&
    prevProps.tabCounts.inProgress === nextProps.tabCounts.inProgress &&
    prevProps.tabCounts.completed === nextProps.tabCounts.completed
);
