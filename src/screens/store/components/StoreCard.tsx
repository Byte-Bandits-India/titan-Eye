import type { Table } from '@tanstack/react-table';

import { Search, Stethoscope, Users2 } from 'lucide-react';

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
import { Input } from '../../../components/ui/input';
import { MetricCardGrid } from './MetricCardGrid';
import { OptomUsersBody } from './OptomUsersBody';
import { RecentCustomersBody } from './RecentCustomersBody';

export type StoreCardProps = MetricsVariant | OptomUsersVariant | RecentCustomersVariant;

type MetricsVariant = {
  tabCounts: TabCounts;
  variant: 'metrics';
};

type OptomUsersVariant = {
  data: OptomUserRow[];
  variant: 'optom-users';
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
      <CardHeader icon={Users2} right={searchFilter} title="Recent Customers" />
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
