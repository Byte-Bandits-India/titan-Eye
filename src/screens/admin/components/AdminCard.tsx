import { Download, FileText, MessageSquare, Stethoscope, Store, Users2 } from 'lucide-react';

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

import { ActiveCountBadge } from '../../../components/shared/ActiveCountBadge';
import { CardFrame, CardHeader } from '../../../components/shared/CardFrame';
import { TableToolbar } from '../../../components/shared/table/TableToolbar';
import { Button } from '../../../components/ui/button';
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
      <TableToolbar
        columns={USER_TABLE_COLUMNS}
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
        onResetColumns={onResetColumns}
        onSearchChange={onSearchChange}
        onToggleColumn={onToggleColumn}
        searchPlaceholder="Search users..."
        searchValue={searchTerm}
        visibleColumns={visibleColumns}
      />
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
      <TableToolbar
        columns={CUSTOMER_TABLE_COLUMNS}
        dateRange={dateRange}
        extra={
          <Button
            className="active:scale-98 flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-[50px] border-0 px-4 text-xs font-medium shadow-sm transition-all"
            onClick={() => exportAllCustomersReport(filteredCustomers)}
            title="Download full Excel report for all patients"
            variant="gradient"
          >
            <Download size={14} />
            <span>Export All Excel Reports</span>
          </Button>
        }
        onDateRangeChange={onDateRangeChange}
        onResetColumns={onResetColumns}
        onSearchChange={onSearchChange}
        onToggleColumn={onToggleColumn}
        searchPlaceholder="Search patients..."
        searchValue={searchTerm}
        visibleColumns={visibleColumns}
      />
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
      <TableToolbar
        columns={FEEDBACK_TABLE_COLUMNS}
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
        onResetColumns={onResetColumns}
        onSearchChange={onSearchChange}
        onToggleColumn={onToggleColumn}
        searchPlaceholder="Search patient feedback..."
        searchValue={searchTerm}
        visibleColumns={visibleColumns}
      />
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
    <TableToolbar
      columns={AUDIT_LOG_TABLE_COLUMNS}
      dateRange={dateRange}
      onDateRangeChange={onDateRangeChange}
      onResetColumns={onResetColumns}
      onSearchChange={onSearchChange}
      onToggleColumn={onToggleColumn}
      searchPlaceholder="Search audit logs..."
      searchValue={searchTerm}
      visibleColumns={visibleColumns}
    />
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
