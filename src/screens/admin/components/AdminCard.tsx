import { Download, FileText, MessageSquare, Search, Stethoscope, Store, Users2 } from 'lucide-react';

import type {
  AuditLog,
  Customer,
  CustomerStatusTab,
  DateFilterRange,
  ManagedUser,
  OptometristUserRow,
  TabCounts,
  User,
} from '../../../types';

import { CardFrame, CardHeader } from '../../../components/shared/CardFrame';
import { ColumnVisibilityDropdown } from '../../../components/shared/ColumnVisibilityDropdown';
import { DateFilter } from '../../../components/shared/DateFilter';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { cn } from '../../../lib/utils';
import { exportAllCustomersReport } from '../../../utils/excelExport';
import { MetricCardGrid } from '../../store/components/MetricCardGrid';
import { OptometristUsersBody } from '../../store/components/OptometristUsersBody';
import {
  AUDIT_LOG_TABLE_COLUMNS,
  CUSTOMER_TABLE_COLUMNS,
  FEEDBACK_TABLE_COLUMNS,
  USER_TABLE_COLUMNS,
} from './adminUtils';
import { AuditLogsBody } from './AuditLogsBody';
import { AvailableStoresBody } from './AvailableStoresBody';
import { CustomerDirectoryBody } from './CustomerDirectoryBody';
import { FeedbackDirectoryBody } from './FeedbackDirectoryBody';
import { UserDirectoryBody } from './UserDirectoryBody';

export type AdminCardProps =
  | AuditLogsVariant
  | CustomerRecordsVariant
  | FeedbackRecordsVariant
  | MetricsVariant
  | OptometristUsersVariant
  | StoreUsersVariant
  | UserManagementVariant;

type FeedbackRecordsVariant = {
  currentPage: number;
  dateRange: DateFilterRange;
  filteredCustomers: Customer[];
  onDateRangeChange: (v: DateFilterRange) => void;
  onNextPage: () => void;
  onPageSizeChange: (size: number) => void;
  onPrevPage: () => void;
  onResetColumns: () => void;
  onSearchChange: (v: string) => void;
  onToggleColumn: (id: string) => void;
  pageSize: number;
  paginatedCustomers: Customer[];
  searchTerm: string;
  totalItems: number;
  totalPages: number;
  variant: 'feedback';
  visibleColumns: string[];
};

type AuditLogsVariant = {
  currentPage: number;
  dateRange: DateFilterRange;
  isLoadingLogs: boolean;
  onDateRangeChange: (v: DateFilterRange) => void;
  onNextPage: () => void;
  onPageSizeChange: (size: number) => void;
  onPrevPage: () => void;
  onResetColumns: () => void;
  onSearchChange: (v: string) => void;
  onToggleColumn: (id: string) => void;
  pageSize: number;
  paginatedAuditLogs: AuditLog[];
  searchTerm: string;
  totalItems: number;
  totalPages: number;
  variant: 'audit-logs';
  visibleColumns: string[];
};

type CustomerRecordsVariant = {
  currentPage: number;
  customerStatusTab: CustomerStatusTab;
  dateRange: DateFilterRange;
  filteredCustomers: Customer[];
  onDateRangeChange: (v: DateFilterRange) => void;
  onNextPage: () => void;
  onPageSizeChange: (size: number) => void;
  onPrevPage: () => void;
  onResetColumns: () => void;
  onSearchChange: (v: string) => void;
  onStatusTabChange: (tab: CustomerStatusTab) => void;
  onToggleColumn: (id: string) => void;
  pageSize: number;
  paginatedCustomers: Customer[];
  searchTerm: string;
  tabCounts: TabCounts;
  totalItems: number;
  totalPages: number;
  variant: 'customer-records';
  visibleColumns: string[];
};

type MetricsVariant = {
  tabCounts: TabCounts;
  variant: 'metrics';
};

type OptometristUsersVariant = {
  data: OptometristUserRow[];
  variant: 'optometrist-users';
};

type StoreUsersVariant = {
  className?: string;
  data: OptometristUserRow[];
  variant: 'store-users';
};

type UserManagementVariant = {
  currentPage: number;
  currentUser: ManagedUser | null | User;
  dateRange: DateFilterRange;
  onDateRangeChange: (v: DateFilterRange) => void;
  onDelete: (u: ManagedUser) => void;
  onEdit: (u: ManagedUser) => void;
  onNextPage: () => void;
  onPageSizeChange: (size: number) => void;
  onPrevPage: () => void;
  onResetColumns: () => void;
  onSearchChange: (v: string) => void;
  onToggleColumn: (id: string) => void;
  onToggleStatus: (email: string, currentStatus: 'active' | 'inactive') => void;
  pageSize: number;
  paginatedUsers: ManagedUser[];
  searchTerm: string;
  totalItems: number;
  totalPages: number;
  users: ManagedUser[];
  variant: 'user-management';
  visibleColumns: string[];
};

function ActiveCountBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {count} Active
    </span>
  );
}

export function AdminCard(props: AdminCardProps) {
  if (props.variant === 'metrics') {
    return <MetricCardGrid tabCounts={props.tabCounts} />;
  }

  if (props.variant === 'optometrist-users') {
    const activeCount = props.data.filter((d) => d.avail.statusLabel !== 'Offline').length;

    return (
      <CardFrame className="flex h-[300px] flex-col justify-between">
        <CardHeader
          icon={Stethoscope}
          iconGradient="from-teal-500 to-teal-800"
          right={<ActiveCountBadge count={activeCount} />}
          title="Available Optometrists"
        />
        <OptometristUsersBody data={props.data} />
      </CardFrame>
    );
  }

  if (props.variant === 'store-users') {
    const activeCount = props.data.filter((d) => d.avail.statusLabel !== 'Offline').length;

    return (
      <CardFrame className={cn('flex h-[300px] flex-col justify-between', props.className)}>
        <CardHeader
          icon={Store}
          iconGradient="from-blue-500 to-blue-800"
          right={<ActiveCountBadge count={activeCount} />}
          title="Available Stores"
        />
        <AvailableStoresBody data={props.data} />
      </CardFrame>
    );
  }

  if (props.variant === 'user-management') {
    const {
      currentPage,
      currentUser,
      dateRange,
      onDateRangeChange,
      onDelete,
      onEdit,
      onNextPage,
      onPageSizeChange,
      onPrevPage,
      onResetColumns,
      onSearchChange,
      onToggleColumn,
      onToggleStatus,
      pageSize,
      paginatedUsers,
      searchTerm,
      totalItems,
      totalPages,
      users,
      visibleColumns,
    } = props;

    const headerControls = (
      <>
        <Input
          className="h-9 w-72 border-border bg-card text-xs sm:w-80"
          icon={Search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search users..."
          value={searchTerm}
        />
        <DateFilter onChange={onDateRangeChange} value={dateRange} />
        <ColumnVisibilityDropdown
          columns={USER_TABLE_COLUMNS}
          onResetColumns={onResetColumns}
          onToggleColumn={onToggleColumn}
          visibleColumns={visibleColumns}
        />
      </>
    );

    return (
      <CardFrame className="!mt-4 flex h-[600px] flex-col">
        <CardHeader
          icon={Users2}
          iconGradient="from-violet-500 to-violet-800"
          right={headerControls}
          title="User Directory"
        />
        <UserDirectoryBody
          currentPage={currentPage}
          currentUser={currentUser}
          onDelete={onDelete}
          onEdit={onEdit}
          onNextPage={onNextPage}
          onPageSizeChange={onPageSizeChange}
          onPrevPage={onPrevPage}
          onToggleStatus={onToggleStatus}
          pageSize={pageSize}
          paginatedUsers={paginatedUsers}
          totalItems={totalItems}
          totalPages={totalPages}
          users={users}
          visibleColumns={visibleColumns}
        />
      </CardFrame>
    );
  }

  if (props.variant === 'customer-records') {
    const {
      currentPage,
      customerStatusTab,
      dateRange,
      filteredCustomers,
      onDateRangeChange,
      onNextPage,
      onPageSizeChange,
      onPrevPage,
      onResetColumns,
      onSearchChange,
      onStatusTabChange,
      onToggleColumn,
      pageSize,
      paginatedCustomers,
      searchTerm,
      tabCounts,
      totalItems,
      totalPages,
      visibleColumns,
    } = props;

    const headerControls = (
      <>
        <Input
          className="h-9 w-72 border-border bg-card text-xs sm:w-80"
          icon={Search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search patients..."
          value={searchTerm}
        />
        <DateFilter onChange={onDateRangeChange} value={dateRange} />
        <ColumnVisibilityDropdown
          columns={CUSTOMER_TABLE_COLUMNS}
          onResetColumns={onResetColumns}
          onToggleColumn={onToggleColumn}
          visibleColumns={visibleColumns}
        />
        <Button
          className="active:scale-98 flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-[50px] border-0 px-4 text-xs font-medium shadow-sm transition-all"
          onClick={() => exportAllCustomersReport(filteredCustomers)}
          title="Download full Excel report for all patients"
          variant="gradient"
        >
          <Download size={14} />
          <span>Export All Excel Reports</span>
        </Button>
      </>
    );

    return (
      <CardFrame className="!mt-4 flex h-[600px] flex-col">
        <CardHeader
          icon={Users2}
          iconGradient="from-[#EF427F] to-[#892649]"
          right={headerControls}
          title="Customer Directory"
        />
        <CustomerDirectoryBody
          currentPage={currentPage}
          customerStatusTab={customerStatusTab}
          onNextPage={onNextPage}
          onPageSizeChange={onPageSizeChange}
          onPrevPage={onPrevPage}
          onStatusTabChange={onStatusTabChange}
          pageSize={pageSize}
          paginatedCustomers={paginatedCustomers}
          tabCounts={tabCounts}
          totalItems={totalItems}
          totalPages={totalPages}
          visibleColumns={visibleColumns}
        />
      </CardFrame>
    );
  }

  if (props.variant === 'feedback') {
    const {
      currentPage,
      dateRange,
      onDateRangeChange,
      onNextPage,
      onPageSizeChange,
      onPrevPage,
      onResetColumns,
      onSearchChange,
      onToggleColumn,
      pageSize,
      paginatedCustomers,
      searchTerm,
      totalItems,
      totalPages,
      visibleColumns,
    } = props;

    const headerControls = (
      <>
        <Input
          className="h-9 w-72 border-border bg-card text-xs sm:w-80"
          icon={Search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search patient feedback..."
          value={searchTerm}
        />
        <DateFilter onChange={onDateRangeChange} value={dateRange} />
        <ColumnVisibilityDropdown
          columns={FEEDBACK_TABLE_COLUMNS}
          onResetColumns={onResetColumns}
          onToggleColumn={onToggleColumn}
          visibleColumns={visibleColumns}
        />
      </>
    );

    return (
      <CardFrame className="!mt-4 flex h-[600px] flex-col">
        <CardHeader
          icon={MessageSquare}
          iconGradient="from-amber-500 to-amber-800"
          right={headerControls}
          title="Patient Feedback Directory"
        />
        <FeedbackDirectoryBody
          currentPage={currentPage}
          onNextPage={onNextPage}
          onPageSizeChange={onPageSizeChange}
          onPrevPage={onPrevPage}
          pageSize={pageSize}
          paginatedCustomers={paginatedCustomers}
          totalItems={totalItems}
          totalPages={totalPages}
          visibleColumns={visibleColumns}
        />
      </CardFrame>
    );
  }

  const {
    currentPage,
    dateRange,
    isLoadingLogs,
    onDateRangeChange,
    onNextPage,
    onPageSizeChange,
    onPrevPage,
    onResetColumns,
    onSearchChange,
    onToggleColumn,
    pageSize,
    paginatedAuditLogs,
    searchTerm,
    totalItems,
    totalPages,
    visibleColumns,
  } = props;

  const headerControls = (
    <>
      <Input
        className="h-9 w-72 border-border bg-card text-xs sm:w-80"
        icon={Search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search audit logs..."
        value={searchTerm}
      />
      <DateFilter onChange={onDateRangeChange} value={dateRange} />
      <ColumnVisibilityDropdown
        columns={AUDIT_LOG_TABLE_COLUMNS}
        onResetColumns={onResetColumns}
        onToggleColumn={onToggleColumn}
        visibleColumns={visibleColumns}
      />
    </>
  );

  return (
    <CardFrame className="!mt-4 flex h-[600px] flex-col">
      <CardHeader
        icon={FileText}
        iconGradient="from-gray-600 to-gray-900"
        right={headerControls}
        title="System Audit Logs"
      />
      <AuditLogsBody
        currentPage={currentPage}
        isLoadingLogs={isLoadingLogs}
        onNextPage={onNextPage}
        onPageSizeChange={onPageSizeChange}
        onPrevPage={onPrevPage}
        pageSize={pageSize}
        paginatedAuditLogs={paginatedAuditLogs}
        totalItems={totalItems}
        totalPages={totalPages}
        visibleColumns={visibleColumns}
      />
    </CardFrame>
  );
}
