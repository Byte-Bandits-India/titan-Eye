import { ChevronDown, RotateCcw, SlidersHorizontal } from 'lucide-react';

import type { ColumnOption } from '../../types';

import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export interface ColumnVisibilityDropdownProps {
  className?: string;
  columns: ColumnOption[];
  onResetColumns?: () => void;
  onToggleColumn: (columnId: string) => void;
  visibleColumns: string[];
}

export function ColumnVisibilityDropdown({
  className,
  columns,
  onResetColumns,
  onToggleColumn,
  visibleColumns,
}: ColumnVisibilityDropdownProps) {
  if (!columns || columns.length === 0) {
    return null;
  }

  const optionalColumns = columns.filter((col) => !col.isMandatory);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className={cn(
            'border-border/80 shadow-xs flex h-9 shrink-0 cursor-pointer items-center justify-between gap-2 rounded-md border bg-card px-3 text-sm font-medium text-foreground transition-all hover:border-blue-300 hover:bg-accent dark:hover:border-blue-700',
            className
          )}
          size="sm"
          title="Customize visible columns"
          variant="secondary"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <SlidersHorizontal className="shrink-0 stroke-[2.2] text-blue-600 dark:text-blue-400" size={16} />
            <span className="truncate font-medium">Columns</span>
          </div>
          <ChevronDown className="text-muted-foreground/70 ml-1 shrink-0" size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="z-50 w-56 rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"
        sideOffset={6}
      >
        <div className="flex items-center justify-between px-2.5 py-1.5">
          <DropdownMenuLabel className="p-0 text-sm font-medium text-foreground">
            Optional Columns
          </DropdownMenuLabel>
          {onResetColumns && (
            <button
              className="flex cursor-pointer items-center gap-1 text-[10px] font-medium text-blue-600 hover:underline dark:text-blue-400"
              onClick={(e) => {
                e.stopPropagation();
                onResetColumns();
              }}
              type="button"
            >
              <RotateCcw size={10} />
              Reset
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-60 space-y-0.5 overflow-y-auto py-1">
          {optionalColumns.length === 0 ? (
            <div className="px-3 py-2 text-center text-sm text-muted-foreground">
              All columns are default.
            </div>
          ) : (
            optionalColumns.map((col) => {
              const isChecked = visibleColumns.includes(col.id);

              return (
                <DropdownMenuItem
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors hover:bg-accent"
                  key={col.id}
                  onSelect={(e) => {
                    e.preventDefault();
                    onToggleColumn(col.id);
                  }}
                >
                  <input
                    checked={isChecked}
                    className="h-4 w-4 cursor-pointer rounded border-border text-blue-600 accent-blue-600 focus:ring-blue-500"
                    readOnly
                    type="checkbox"
                  />
                  <span className="truncate">{col.label}</span>
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
