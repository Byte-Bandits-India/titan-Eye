import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';

import type { PaginationBarProps } from '../../types';

import { Button } from '../ui/button';
import { ColumnVisibilityDropdown } from './ColumnVisibilityDropdown';

export function PaginationBar({
  columns,
  currentPage,
  itemsPerPage,
  onItemsPerPageChange,
  onNext,
  onPrev,
  onResetColumns,
  onToggleColumn,
  totalItems,
  totalPages,
  visibleColumns,
}: PaginationBarProps) {
  const [isCustomMode, setIsCustomMode] = React.useState(false);

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const presets = [5, 10, 20, 50];
  const isPreset = presets.includes(itemsPerPage);

  return (
    <div className="bg-muted/30 flex items-center justify-between border-t border-border px-3 py-3 text-xs font-medium text-muted-foreground">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Per page:</span>
          {onItemsPerPageChange ? (
            <div className="relative flex items-center">
              {isCustomMode ? (
                <CustomPerPageInput
                  initialValue={itemsPerPage}
                  onCancel={() => setIsCustomMode(false)}
                  onSubmit={(val) => onItemsPerPageChange(val)}
                />
              ) : (
                <>
                  <select
                    className="shadow-3xs h-7 cursor-pointer appearance-none rounded-lg border border-border bg-card pl-2.5 text-xs font-medium text-foreground outline-none transition-all focus:border-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onChange={(e) => {
                      const val = e.target.value;

                      if (val === 'custom' || val === 'custom-preset') {
                        setIsCustomMode(true);
                      } else {
                        onItemsPerPageChange(Number(val));
                      }
                    }}
                    value={isPreset ? itemsPerPage : 'custom-preset'}
                  >
                    {presets.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                    {!isPreset && <option value="custom-preset">{itemsPerPage}</option>}
                    <option value="custom">Custom...</option>
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-2.5 text-muted-foreground"
                    size={12}
                  />
                </>
              )}
            </div>
          ) : (
            <span className="font-medium text-foreground">{itemsPerPage}</span>
          )}
          {columns && visibleColumns && onToggleColumn && (
            <ColumnVisibilityDropdown
              columns={columns}
              onResetColumns={onResetColumns}
              onToggleColumn={onToggleColumn}
              visibleColumns={visibleColumns}
            />
          )}
        </div>
        <div className="flex items-center gap-4">
          <span>
            {startItem}-{endItem} of {totalItems}
          </span>
          <div className="flex items-center gap-1">
            <Button
              className="h-7 w-7 cursor-pointer border-border p-0"
              disabled={currentPage === 1}
              onClick={onPrev}
              size="icon"
              variant="outline"
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              className="h-7 w-7 cursor-pointer border-border p-0"
              disabled={currentPage === totalPages}
              onClick={onNext}
              size="icon"
              variant="outline"
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomPerPageInput({
  initialValue,
  onCancel,
  onSubmit,
}: {
  initialValue: number;
  onCancel: () => void;
  onSubmit: (val: number) => void;
}) {
  const [val, setVal] = React.useState(String(initialValue));

  const handleSubmit = () => {
    const parsed = parseInt(val, 10);

    if (!isNaN(parsed) && parsed > 0) {
      onSubmit(parsed);
    }

    onCancel();
  };

  return (
    <input
      autoFocus
      className="shadow-3xs h-7 w-12 rounded-lg border border-border bg-card px-2 text-center text-xs font-medium text-foreground outline-none transition-all focus:border-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
      min={1}
      onBlur={handleSubmit}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleSubmit();
        } else if (e.key === 'Escape') {
          onCancel();
        }
      }}
      type="number"
      value={val}
    />
  );
}
