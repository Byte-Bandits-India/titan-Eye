import { Search } from 'lucide-react';
import type { ReactNode } from 'react';

import type { ColumnOption } from '../../../types';

import type { DateFilterRange } from '../../../utils/dateFilter';

import { DateFilter } from '../DateFilter';
import { ColumnVisibilityDropdown } from '../ColumnVisibilityDropdown';
import { Input } from '../../ui/input';

export type TableToolbarProps = {
  className?: string;
  columns?: ColumnOption[];
  dateRange: DateFilterRange;
  extra?: ReactNode;
  onDateRangeChange: (v: DateFilterRange) => void;
  onResetColumns?: () => void;
  onSearchChange: (v: string) => void;
  onToggleColumn?: (columnId: string) => void;
  searchPlaceholder?: string;
  searchValue: string;
  visibleColumns?: string[];
};

export function TableToolbar({
  className,
  columns,
  dateRange,
  extra,
  onDateRangeChange,
  onResetColumns,
  onSearchChange,
  onToggleColumn,
  searchPlaceholder = 'Search...',
  searchValue,
  visibleColumns,
}: TableToolbarProps) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <Input
        className="h-9 w-72 border-border bg-card text-sm sm:w-80"
        icon={Search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
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
      {extra}
    </div>
  );
}
