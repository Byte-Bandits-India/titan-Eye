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
  if (!columns || columns.length === 0) {return null;}

  const optionalColumns = columns.filter((col) => !col.isMandatory);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className={cn(
            'h-10 px-4 bg-card border border-border/80 hover:bg-accent text-foreground text-xs font-bold rounded-full flex items-center justify-between gap-2.5 shadow-xs cursor-pointer transition-all hover:border-blue-300 dark:hover:border-blue-700 shrink-0',
            className
          )}
          size="sm"
          title="Customize visible columns"
          variant="outline"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <SlidersHorizontal className="text-blue-600 dark:text-blue-400 stroke-[2.2] shrink-0" size={16} />
            <span className="truncate font-bold">
              Columns
            </span>
          </div>
          <ChevronDown className="text-muted-foreground/70 shrink-0 ml-1" size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-56 p-1.5 rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl z-50"
        sideOffset={6}
      >
        <div className="flex items-center justify-between px-2.5 py-1.5">
          <DropdownMenuLabel className="p-0 text-xs font-bold text-foreground">
            Optional Columns
          </DropdownMenuLabel>
          {onResetColumns && (
            <button
              className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
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
        <div className="max-h-60 overflow-y-auto py-1 space-y-0.5">
          {optionalColumns.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground text-center">
              All columns are default.
            </div>
          ) : (
            optionalColumns.map((col) => {
              const isChecked = visibleColumns.includes(col.id);

              return (
                <DropdownMenuItem
                  className="text-xs py-2 px-2.5 rounded-xl flex items-center gap-2.5 cursor-pointer font-medium hover:bg-accent transition-colors"
                  key={col.id}
                  onSelect={(e) => {
                    e.preventDefault();
                    onToggleColumn(col.id);
                  }}
                >
                  <input
                    checked={isChecked}
                    className="h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
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
