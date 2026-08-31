import type { Table } from '@tanstack/react-table';

import { Radio, RefreshCw } from 'lucide-react';

import type { DataGridFeatures } from '../../../components/reui/data-grid/data-grid';
import type {
  ColumnOption,
  Customer,
  DateFilterRange,
  OptometristUserRow,
  StatusTab,
  TabCounts,
} from '../../../types';

import { AvailableDirectoryCard } from '../../../components/shared/AvailableDirectoryCard';
import { CardFrame, CardHeader } from '../../../components/shared/CardFrame';
import { TableToolbar } from '../../../components/shared/table/TableToolbar';
import { Button } from '../../../components/ui/button';
import { MetricCardGrid } from '../../store/components/MetricCardGrid';
import { IncomingRequestsBody } from './IncomingRequestsBody';

export type OptometristCardProps = IncomingRequestsVariant | MetricsVariant | OptometristUsersVariant;

type IncomingRequestsVariant = {
  columns?: ColumnOption[];
  currentPage?: number;
  data: Customer[];
  dateRange: DateFilterRange;
  isLoading?: boolean;
  isSyncing?: boolean;
  onDateRangeChange: (v: DateFilterRange) => void;
  onNextPage?: () => void;
  onPageSizeChange?: (size: number) => void;
  onPrevPage?: () => void;
  onResetColumns?: () => void;
  onSearchChange?: (v: string) => void;
  onStatusTabChange: (tab: StatusTab) => void;
  onSyncRefresh?: () => void;
  onToggleColumn?: (columnId: string) => void;
  pageSize?: number;
  requestsTable: Table<DataGridFeatures, Customer>;
  searchValue?: string;
  statusTab: StatusTab;
  tabCounts: TabCounts;
  totalItems?: number;
  totalPages?: number;
  variant: 'incoming-requests';
  visibleColumns?: string[];
};

type MetricsVariant = {
  isLoading?: boolean;
  tabCounts: TabCounts;
  variant: 'metrics';
};

type OptometristUsersVariant = {
  data: OptometristUserRow[];
  isLoading?: boolean;
  storeData?: OptometristUserRow[];
  variant: 'optometrist-users';
};

import { memo } from 'react';

export const OptometristCard = memo(
  function OptometristCard(props: OptometristCardProps) {
    if (props.variant === 'metrics') {
      return <MetricCardGrid isLoading={props.isLoading} tabCounts={props.tabCounts} />;
    }

    if (props.variant === 'optometrist-users') {
      return (
        <AvailableDirectoryCard
          isLoading={props.isLoading}
          optometristData={props.data}
          storeData={props.storeData ?? []}
        />
      );
    }

    const {
      columns,
      currentPage,
      data,
      dateRange,
      isLoading,
      isSyncing,
      onDateRangeChange,
      onNextPage,
      onPageSizeChange,
      onPrevPage,
      onResetColumns,
      onSearchChange,
      onStatusTabChange,
      onSyncRefresh,
      onToggleColumn,
      pageSize,
      requestsTable,
      searchValue,
      statusTab,
      tabCounts,
      totalItems,
      totalPages,
      visibleColumns,
    } = props;

    const headerControls = (
      <TableToolbar
        columns={columns}
        dateRange={dateRange}
        extra={
          onSyncRefresh && (
            <Button
              className="h-8 w-8 cursor-pointer"
              onClick={onSyncRefresh}
              size="icon"
              title="Force Refresh Feed"
              variant="ghost"
            >
              <RefreshCw className={`text-muted-foreground ${isSyncing ? 'animate-spin' : ''}`} size={13} />
            </Button>
          )
        }
        onDateRangeChange={onDateRangeChange}
        onResetColumns={onResetColumns}
        onSearchChange={onSearchChange ?? (() => undefined)}
        onToggleColumn={onToggleColumn}
        searchPlaceholder="Search patients..."
        searchValue={searchValue ?? ''}
        visibleColumns={visibleColumns}
      />
    );

    return (
      <CardFrame className="!mt-4">
        <CardHeader
          icon={Radio}
          iconGradient="from-indigo-500 to-indigo-800"
          right={headerControls}
          title="Queue Requests"
        />
        <IncomingRequestsBody
          columns={columns}
          currentPage={currentPage}
          isLoading={isLoading}
          onNextPage={onNextPage}
          onPageSizeChange={onPageSizeChange}
          onPrevPage={onPrevPage}
          onResetColumns={onResetColumns}
          onStatusTabChange={onStatusTabChange}
          onToggleColumn={onToggleColumn}
          pageSize={pageSize}
          paginatedRequests={data}
          requestsTable={requestsTable}
          statusTab={statusTab}
          tabCounts={tabCounts}
          totalItems={totalItems}
          totalPages={totalPages}
        />
      </CardFrame>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps.variant !== nextProps.variant) {
      return false;
    }

    if (prevProps.isLoading !== nextProps.isLoading) {
      return false;
    }

    if (prevProps.variant === 'metrics' && nextProps.variant === 'metrics') {
      return (
        prevProps.tabCounts.all === nextProps.tabCounts.all &&
        prevProps.tabCounts.pending === nextProps.tabCounts.pending &&
        prevProps.tabCounts.inProgress === nextProps.tabCounts.inProgress &&
        prevProps.tabCounts.completed === nextProps.tabCounts.completed
      );
    }

    if (prevProps.variant === 'optometrist-users' && nextProps.variant === 'optometrist-users') {
      return prevProps.data === nextProps.data && prevProps.storeData === nextProps.storeData;
    }

    if (prevProps.variant === 'incoming-requests' && nextProps.variant === 'incoming-requests') {
      return (
        prevProps.statusTab === nextProps.statusTab &&
        prevProps.dateRange === nextProps.dateRange &&
        prevProps.searchValue === nextProps.searchValue &&
        prevProps.currentPage === nextProps.currentPage &&
        prevProps.pageSize === nextProps.pageSize &&
        prevProps.totalItems === nextProps.totalItems &&
        prevProps.totalPages === nextProps.totalPages &&
        prevProps.data === nextProps.data &&
        prevProps.visibleColumns === nextProps.visibleColumns &&
        prevProps.requestsTable === nextProps.requestsTable &&
        prevProps.tabCounts.all === nextProps.tabCounts.all &&
        prevProps.tabCounts.pending === nextProps.tabCounts.pending &&
        prevProps.tabCounts.inProgress === nextProps.tabCounts.inProgress &&
        prevProps.tabCounts.completed === nextProps.tabCounts.completed
      );
    }

    return false;
  }
);
