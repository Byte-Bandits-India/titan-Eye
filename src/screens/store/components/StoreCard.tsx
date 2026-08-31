import { memo } from 'react';
import type { Table } from '@tanstack/react-table';

import { Download, Stethoscope, TrendingUp, Users2 } from 'lucide-react';

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
import {
  ConversionStatusFilter,
  type ConversionStatusFilterValue,
} from '../../../components/shared/ConversionStatusFilter';
import { DirectoryListSkeleton } from '../../../components/shared/DirectoryListSkeleton';
import { TableToolbar } from '../../../components/shared/table/TableToolbar';
import { Button } from '../../../components/ui/button';
import { OptometristUsersInfiniteBody } from '../../optometrist/components/OptometristUsersInfiniteBody';
import { MetricCardGrid } from './MetricCardGrid';
import { RecentCustomersBody } from './RecentCustomersBody';

export type StoreCardProps = MetricsVariant | OptometristUsersVariant | RecentCustomersVariant;

type MetricsVariant = {
  isLoading?: boolean;
  isTabletMode?: boolean;
  tabCounts: TabCounts;
  variant: 'metrics';
};

type OptometristUsersVariant = {
  data: OptometristUserRow[];
  isLoading?: boolean;
  variant: 'optometrist-users';
};

type RecentCustomersVariant = {
  columns?: ColumnOption[];
  conversionStatusFilter?: ConversionStatusFilterValue;
  currentPage?: number;
  customersTable: Table<DataGridFeatures, Customer>;
  data: Customer[];
  dateRange: DateFilterRange;
  hideStatusTabs?: boolean;
  isLoading?: boolean;
  onConversionStatusFilterChange?: (value: ConversionStatusFilterValue) => void;
  onExportCsv?: () => void;
  onlyPendingAndAll?: boolean;
  onDateRangeChange: (v: DateFilterRange) => void;
  onNextPage?: () => void;
  onPageSizeChange?: (size: number) => void;
  onPrevPage?: () => void;
  onResetColumns?: () => void;
  onSearchChange: (v: string) => void;
  onStatusTabChange: (tab: StatusTab) => void;
  onToggleColumn?: (columnId: string) => void;
  pageSize?: number;
  pendingLabel?: string;
  searchValue: string;
  showConversionStatusFilter?: boolean;
  statusTab: StatusTab;
  tabCounts: TabCounts;
  title?: string;
  totalItems?: number;
  totalPages?: number;
  variant: 'recent-customers';
  visibleColumns?: string[];
};

export const StoreCard = memo(
  function StoreCard(props: StoreCardProps) {
    if (props.variant === 'metrics') {
      return (
        <MetricCardGrid
          isLoading={props.isLoading}
          isTabletMode={props.isTabletMode}
          tabCounts={props.tabCounts}
        />
      );
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
          {props.isLoading ? <DirectoryListSkeleton /> : <OptometristUsersInfiniteBody data={props.data} />}
        </CardFrame>
      );
    }

    const {
      columns,
      conversionStatusFilter,
      currentPage,
      customersTable,
      data,
      dateRange,
      hideStatusTabs,
      isLoading,
      onConversionStatusFilterChange,
      onExportCsv,
      onlyPendingAndAll,
      onDateRangeChange,
      onNextPage,
      onPageSizeChange,
      onPrevPage,
      onResetColumns,
      onSearchChange,
      onStatusTabChange,
      onToggleColumn,
      pageSize,
      pendingLabel,
      searchValue,
      showConversionStatusFilter,
      statusTab,
      tabCounts,
      title,
      totalItems,
      totalPages,
      visibleColumns,
    } = props;

    const searchFilter = (
      <TableToolbar
        columns={columns}
        dateRange={dateRange}
        extra={
          onExportCsv ||
          (showConversionStatusFilter && conversionStatusFilter && onConversionStatusFilterChange) ? (
            <div className="flex shrink-0 items-center gap-2">
              {showConversionStatusFilter && conversionStatusFilter && onConversionStatusFilterChange && (
                <ConversionStatusFilter
                  onChange={onConversionStatusFilterChange}
                  value={conversionStatusFilter}
                />
              )}
              {onExportCsv && (
                <Button
                  className="active:scale-98 flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border-0 px-3 text-sm font-medium shadow-sm transition-all"
                  onClick={onExportCsv}
                  title="Download all records as CSV"
                  variant="primary"
                >
                  <Download size={14} />
                  <span>Export CSV</span>
                </Button>
              )}
            </div>
          ) : undefined
        }
        onDateRangeChange={onDateRangeChange}
        onResetColumns={onResetColumns}
        onSearchChange={onSearchChange}
        onToggleColumn={onToggleColumn}
        searchPlaceholder="Search customers..."
        searchValue={searchValue}
        visibleColumns={visibleColumns}
      />
    );

    const isConversionsTable = title === 'Customer Conversions';

    return (
      <CardFrame className="!mt-4">
        <CardHeader
          icon={isConversionsTable ? TrendingUp : Users2}
          iconGradient={isConversionsTable ? 'from-blue-500 to-blue-700' : 'from-[#EF427F] to-[#892649]'}
          right={searchFilter}
          title={title ?? 'Customers'}
        />
        <RecentCustomersBody
          columns={columns}
          currentPage={currentPage}
          customersTable={customersTable}
          hideStatusTabs={hideStatusTabs}
          isLoading={isLoading}
          onlyPendingAndAll={onlyPendingAndAll}
          onNextPage={onNextPage}
          onPageSizeChange={onPageSizeChange}
          onPrevPage={onPrevPage}
          onResetColumns={onResetColumns}
          onStatusTabChange={onStatusTabChange}
          onToggleColumn={onToggleColumn}
          pageSize={pageSize}
          paginatedCustomers={data}
          pendingLabel={pendingLabel}
          statusTab={statusTab}
          tabCounts={tabCounts}
          totalItems={totalItems}
          totalPages={totalPages}
          visibleColumns={visibleColumns}
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
        prevProps.isTabletMode === nextProps.isTabletMode &&
        prevProps.tabCounts.all === nextProps.tabCounts.all &&
        prevProps.tabCounts.pending === nextProps.tabCounts.pending &&
        prevProps.tabCounts.inProgress === nextProps.tabCounts.inProgress &&
        prevProps.tabCounts.completed === nextProps.tabCounts.completed
      );
    }

    if (prevProps.variant === 'optometrist-users' && nextProps.variant === 'optometrist-users') {
      return prevProps.data === nextProps.data;
    }

    if (prevProps.variant === 'recent-customers' && nextProps.variant === 'recent-customers') {
      return (
        prevProps.statusTab === nextProps.statusTab &&
        prevProps.dateRange === nextProps.dateRange &&
        prevProps.searchValue === nextProps.searchValue &&
        prevProps.currentPage === nextProps.currentPage &&
        prevProps.pageSize === nextProps.pageSize &&
        prevProps.totalItems === nextProps.totalItems &&
        prevProps.totalPages === nextProps.totalPages &&
        prevProps.data === nextProps.data &&
        prevProps.conversionStatusFilter === nextProps.conversionStatusFilter &&
        prevProps.showConversionStatusFilter === nextProps.showConversionStatusFilter &&
        prevProps.onlyPendingAndAll === nextProps.onlyPendingAndAll &&
        prevProps.hideStatusTabs === nextProps.hideStatusTabs &&
        prevProps.visibleColumns === nextProps.visibleColumns &&
        prevProps.customersTable === nextProps.customersTable &&
        prevProps.tabCounts.all === nextProps.tabCounts.all &&
        prevProps.tabCounts.pending === nextProps.tabCounts.pending &&
        prevProps.tabCounts.inProgress === nextProps.tabCounts.inProgress &&
        prevProps.tabCounts.completed === nextProps.tabCounts.completed
      );
    }

    return false;
  }
);
