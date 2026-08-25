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
  tabCounts: TabCounts;
  variant: 'metrics';
};

type OptometristUsersVariant = {
  data: OptometristUserRow[];
  storeData?: OptometristUserRow[];
  variant: 'optometrist-users';
};

export function OptometristCard(props: OptometristCardProps) {
  if (props.variant === 'metrics') {
    return <MetricCardGrid tabCounts={props.tabCounts} />;
  }

  if (props.variant === 'optometrist-users') {
    return <AvailableDirectoryCard optometristData={props.data} storeData={props.storeData ?? []} />;
  }

  const {
    columns,
    currentPage,
    data,
    dateRange,
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
}
