import type { Table } from '@tanstack/react-table';

import { Search, Stethoscope, Users2 } from 'lucide-react';

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
import { Input } from '../../../components/ui/input';
import { OptometristUsersInfiniteBody } from '../../optometrist/components/OptometristUsersInfiniteBody';
import { MetricCardGrid } from './MetricCardGrid';
import { RecentCustomersBody } from './RecentCustomersBody';

export type StoreCardProps = MetricsVariant | OptometristUsersVariant | RecentCustomersVariant;

type MetricsVariant = {
  tabCounts: TabCounts;
  variant: 'metrics';
};

type OptometristUsersVariant = {
  data: OptometristUserRow[];
  variant: 'optometrist-users';
};

type RecentCustomersVariant = {
  columns?: ColumnOption[];
  currentPage?: number;
  customersTable: Table<DataGridFeatures, Customer>;
  data: Customer[];
  dateRange: DateFilterRange;
  onDateRangeChange: (v: DateFilterRange) => void;
  onNextPage?: () => void;
  onPageSizeChange?: (size: number) => void;
  onPrevPage?: () => void;
  onResetColumns?: () => void;
  onSearchChange: (v: string) => void;
  onStatusTabChange: (tab: StatusTab) => void;
  onToggleColumn?: (columnId: string) => void;
  pageSize?: number;
  searchValue: string;
  statusTab: StatusTab;
  tabCounts: TabCounts;
  totalItems?: number;
  totalPages?: number;
  variant: 'recent-customers';
  visibleColumns?: string[];
};

export function StoreCard(props: StoreCardProps) {
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
    customersTable,
    data,
    dateRange,
    onDateRangeChange,
    onNextPage,
    onPageSizeChange,
    onPrevPage,
    onResetColumns,
    onSearchChange,
    onStatusTabChange,
    onToggleColumn,
    pageSize,
    searchValue,
    statusTab,
    tabCounts,
    totalItems,
    totalPages,
    visibleColumns,
  } = props;

  const searchFilter = (
    <>
      <Input
        className="h-9 w-72 border-border bg-card sm:w-80"
        icon={Search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search customers..."
        value={searchValue}
      />
      <DateFilter onChange={onDateRangeChange} value={dateRange} />
      {columns && visibleColumns && onToggleColumn && (
        <ColumnVisibilityDropdown
          columns={columns}
          onResetColumns={onResetColumns}
          onToggleColumn={onToggleColumn}
          visibleColumns={visibleColumns}
        />
      )}
    </>
  );

  return (
    <CardFrame className="!mt-4">
      <CardHeader icon={Users2} iconGradient="from-[#EF427F] to-[#892649]" right={searchFilter} title="Recent Customers" />
      <RecentCustomersBody
        columns={columns}
        currentPage={currentPage}
        customersTable={customersTable}
        onNextPage={onNextPage}
        onPageSizeChange={onPageSizeChange}
        onPrevPage={onPrevPage}
        onResetColumns={onResetColumns}
        onStatusTabChange={onStatusTabChange}
        onToggleColumn={onToggleColumn}
        pageSize={pageSize}
        paginatedCustomers={data}
        statusTab={statusTab}
        tabCounts={tabCounts}
        totalItems={totalItems}
        totalPages={totalPages}
        visibleColumns={visibleColumns}
      />
    </CardFrame>
  );
}
