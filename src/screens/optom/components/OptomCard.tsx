import type { Table } from '@tanstack/react-table';

import { Radio, RefreshCw, Stethoscope } from 'lucide-react';

import type { DataGridFeatures } from '../../../components/reui/data-grid/data-grid';
import type {
  ColumnOption,
  Customer,
  DateFilterRange,
  OptomUserRow,
  StatusTab,
  TabCounts,
} from '../../../types';

import { CardFrame, CardHeader } from '../../../components/shared/CardFrame';
import { ColumnVisibilityDropdown } from '../../../components/shared/ColumnVisibilityDropdown';
import { DateFilter } from '../../../components/shared/DateFilter';
import { Button } from '../../../components/ui/button';
import { MetricCardGrid } from '../../store/components/MetricCardGrid';
import { OptomUsersBody } from '../../store/components/OptomUsersBody';
import { IncomingRequestsBody } from './IncomingRequestsBody';

export type OptomCardProps = IncomingRequestsVariant | MetricsVariant | OptomUsersVariant;

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
  onStatusTabChange: (tab: StatusTab) => void;
  onSyncRefresh?: () => void;
  onToggleColumn?: (columnId: string) => void;
  pageSize?: number;
  requestsTable: Table<DataGridFeatures, Customer>;
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

type OptomUsersVariant = {
  data: OptomUserRow[];
  variant: 'optom-users';
};

// ─── OptomCard Component ──────────────────────────────────────────────────────

export function OptomCard(props: OptomCardProps) {
  // ── variant="metrics" ──────────────────────────────────────────────────────
  if (props.variant === 'metrics') {
    return <MetricCardGrid tabCounts={props.tabCounts} />;
  }

  // ── variant="optom-users" ──────────────────────────────────────────────────
  if (props.variant === 'optom-users') {
    return (
      <CardFrame>
        <CardHeader icon={Stethoscope} title="Optom Users" />
        <OptomUsersBody data={props.data} />
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
    onStatusTabChange,
    onSyncRefresh,
    onToggleColumn,
    pageSize,
    requestsTable,
    statusTab,
    tabCounts,
    totalItems,
    totalPages,
    visibleColumns,
  } = props;

  const headerControls = (
    <div className="flex items-center gap-2">
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
      <CardHeader icon={Radio} right={headerControls} title="Incoming Requests" />
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
