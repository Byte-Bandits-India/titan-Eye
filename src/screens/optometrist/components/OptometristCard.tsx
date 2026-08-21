import type { Table } from '@tanstack/react-table';

import { Radio, RefreshCw, Stethoscope, Store } from 'lucide-react';
import * as React from 'react';

import type { DataGridFeatures } from '../../../components/reui/data-grid/data-grid';
import type {
  ColumnOption,
  Customer,
  DateFilterRange,
  OptometristUserRow,
  StatusTab,
  TabCounts,
} from '../../../types';

import { ActiveCountBadge } from '../../../components/shared/ActiveCountBadge';
import { CardFrame, CardHeader } from '../../../components/shared/CardFrame';
import { TableToolbar } from '../../../components/shared/table/TableToolbar';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { MetricCardGrid } from '../../store/components/MetricCardGrid';
import { AvailableStoresBody } from '../../admin/components/AvailableStoresBody';
import { IncomingRequestsBody } from './IncomingRequestsBody';
import { OptometristUsersInfiniteBody } from './OptometristUsersInfiniteBody';

export type OptometristCardProps = IncomingRequestsVariant | MetricsVariant | OptometristUsersVariant;

type AvailableView = 'optometrists' | 'stores';

function AvailableDirectoryCard({
  optometristData,
  storeData,
}: {
  optometristData: OptometristUserRow[];
  storeData: OptometristUserRow[];
}) {
  const [view, setView] = React.useState<AvailableView>('optometrists');
  const activeData = view === 'optometrists' ? optometristData : storeData;
  const activeCount = activeData.filter((d) => d.avail.statusLabel !== 'Offline').length;

  return (
    <CardFrame className="flex h-[300px] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border bg-[#F7F7F7] px-4 py-2.5 dark:bg-muted/40">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-gradient-to-br text-white',
              view === 'optometrists' ? 'from-teal-500 to-teal-800' : 'from-blue-500 to-blue-800'
            )}
          >
            {view === 'optometrists' ? <Stethoscope size={13} /> : <Store size={13} />}
          </div>
          <span className="text-sm font-semibold text-foreground">Available</span>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            <button
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                view === 'optometrists'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setView('optometrists')}
              type="button"
            >
              Optometrists
            </button>
            <button
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                view === 'stores'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setView('stores')}
              type="button"
            >
              Stores
            </button>
          </div>
        </div>

        <ActiveCountBadge count={activeCount} />
      </div>

      {view === 'optometrists' ? (
        <OptometristUsersInfiniteBody data={optometristData} />
      ) : (
        <AvailableStoresBody data={storeData} />
      )}
    </CardFrame>
  );
}

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
