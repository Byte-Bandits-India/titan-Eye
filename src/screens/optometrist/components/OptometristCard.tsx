import type { Table } from '@tanstack/react-table';

import { Radio, RefreshCw, Search, Stethoscope } from 'lucide-react';

import type { DataGridFeatures } from '../../../components/reui/data-grid/data-grid';
import type {
  ColumnOption,
  Customer,
  DateFilterRange,
  OptometristUserRow,
  StatusTab,
  TabCounts,
} from '../../../types';

import { CardFrame, CardHeader } from '../../../components/shared/CardFrame';
import { ColumnVisibilityDropdown } from '../../../components/shared/ColumnVisibilityDropdown';
import { DateFilter } from '../../../components/shared/DateFilter';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { MetricCardGrid } from '../../store/components/MetricCardGrid';
import { IncomingRequestsBody } from './IncomingRequestsBody';
import { OptometristUsersInfiniteBody } from './OptometristUsersInfiniteBody';

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
  variant: 'optometrist-users';
};

export function OptometristCard(props: OptometristCardProps) {
  if (props.variant === 'metrics') {
    return <MetricCardGrid tabCounts={props.tabCounts} />;
  }

  if (props.variant === 'optometrist-users') {
    const activeCount = props.data.filter((d) => d.avail.statusLabel !== 'Offline').length;

    return (
      <CardFrame className="flex h-[300px] flex-col">
        <CardHeader
          icon={Stethoscope}
          iconGradient="from-teal-500 to-teal-800"
          right={
            <span className="font-pro inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-normal text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {activeCount} Active
            </span>
          }
          title="Available Optometrists"
        />
        <OptometristUsersInfiniteBody data={props.data} />
      </CardFrame>
    );
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
    <div className="flex items-center gap-2">
      {onSearchChange && (
        <Input
          className="h-9 w-72 border-border bg-card sm:w-80"
          icon={Search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search patients..."
          value={searchValue ?? ''}
        />
      )}

      {onSyncRefresh && (
        <Button
          className="h-8 w-8 cursor-pointer"
          onClick={onSyncRefresh}
          size="icon"
          title="Force Refresh Feed"
          variant="ghost"
        >
          <RefreshCw className={`text-muted-foreground ${isSyncing ? 'animate-spin' : ''}`} size={13} />
        </Button>
      )}

      <DateFilter onChange={onDateRangeChange} value={dateRange} />

      {columns && visibleColumns && onToggleColumn && (
        <ColumnVisibilityDropdown
          columns={columns}
          onResetColumns={onResetColumns}
          onToggleColumn={onToggleColumn}
          visibleColumns={visibleColumns}
        />
      )}
    </div>
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
