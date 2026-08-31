import { memo } from 'react';
import { MessageSquare, Stethoscope, Store, Users2 } from 'lucide-react';

import type {
  Customer,
  DateFilterRange,
  ManagedUser,
  OptometristUserRow,
  TabCounts,
  User,
} from '../../../types';

import { ActiveCountBadge } from '../../../components/shared/ActiveCountBadge';
import { CardFrame, CardHeader } from '../../../components/shared/CardFrame';
import { TableToolbar } from '../../../components/shared/table/TableToolbar';
import { TableSkeleton } from '../../../components/shared/TableSkeleton';
import { cn } from '../../../lib/utils';
import { MetricCardGrid } from '../../store/components/MetricCardGrid';
import { OptometristUsersBody } from '../../store/components/OptometristUsersBody';
import { FEEDBACK_TABLE_COLUMNS, USER_TABLE_COLUMNS } from './adminUtils';
import { AvailableStoresBody } from './AvailableStoresBody';
import { FeedbackDirectoryBody } from './FeedbackDirectoryBody';
import { UserDirectoryBody } from './UserDirectoryBody';

export type AdminCardProps =
  | FeedbackRecordsVariant
  | MetricsVariant
  | OptometristUsersVariant
  | StoreUsersVariant
  | UserManagementVariant;

type FeedbackRecordsVariant = {
  currentPage: number;
  dateRange: DateFilterRange;
  filteredCustomers: Customer[];
  isLoading?: boolean;
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

type MetricsVariant = {
  isLoading?: boolean;
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
  isLoading?: boolean;
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

export const AdminCard = memo(function AdminCard(props: AdminCardProps) {
  if (props.variant === 'metrics') {
    return <MetricCardGrid isLoading={props.isLoading} tabCounts={props.tabCounts} />;
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
      isLoading,
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
        {isLoading ? (
          <TableSkeleton columnWidths={['100px', '140px', '180px', '80px', '110px', '140px', '90px']} />
        ) : (
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
        )}
      </CardFrame>
    );
  }

  if (props.variant === 'feedback') {
    const {
      currentPage,
      dateRange,
      isLoading,
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
        {isLoading ? (
          <TableSkeleton columnWidths={['90px', '140px', '110px', '220px', '280px', '90px']} />
        ) : (
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
        )}
      </CardFrame>
    );
  }

  return null;
});
