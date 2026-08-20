import type { Table } from '@tanstack/react-table';

import { Stethoscope, Users2 } from 'lucide-react';

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
  hideStatusTabs?: boolean;
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
          right={<ActiveCountBadge count={activeCount} />}
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
    hideStatusTabs,
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
    <TableToolbar
      columns={columns}
      dateRange={dateRange}
      onDateRangeChange={onDateRangeChange}
      onResetColumns={onResetColumns}
      onSearchChange={onSearchChange}
      onToggleColumn={onToggleColumn}
      searchPlaceholder="Search customers..."
      searchValue={searchValue}
      visibleColumns={visibleColumns}
    />
  );

  return (
    <CardFrame className="!mt-4">
      <CardHeader
        icon={Users2}
        iconGradient="from-[#EF427F] to-[#892649]"
        right={searchFilter}
        title="Recent Customers"
      />
      <RecentCustomersBody
        columns={columns}
        currentPage={currentPage}
        customersTable={customersTable}
        hideStatusTabs={hideStatusTabs}
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
