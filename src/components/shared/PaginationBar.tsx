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
  const [inputValue, setInputValue] = React.useState(String(itemsPerPage));

  React.useEffect(() => {
    setInputValue(String(itemsPerPage));
  }, [itemsPerPage]);

  const handleInputSubmit = () => {
    const parsed = parseInt(inputValue, 10);

    if (!isNaN(parsed) && parsed > 0) {
      onItemsPerPageChange?.(parsed);
    }

    setIsCustomMode(false);
  };

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const presets = [5, 10, 20, 50];
  const isPreset = presets.includes(itemsPerPage);

  return (
    <div className="px-2 py-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/30">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-muted-foreground">Per page:</span>
        {onItemsPerPageChange ? (
          <div className="relative flex items-center">
            {isCustomMode ? (
              <input
                autoFocus
                className="w-12 h-7 px-2 bg-card border border-border rounded-lg text-xs text-foreground font-bold shadow-3xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-center"
                min={1}
                onBlur={handleInputSubmit}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleInputSubmit();
                  } else if (e.key === 'Escape') {
                    setInputValue(String(itemsPerPage));
                    setIsCustomMode(false);
                  }
                }}
                type="number"
                value={inputValue}
              />
            ) : (
              <>
                <select
                  className="appearance-none h-7 pl-2.5 bg-card border border-border rounded-lg text-xs text-foreground font-bold shadow-3xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
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
                  {!isPreset && (
                    <option value="custom-preset">
                      {itemsPerPage}
                    </option>
                  )}
                  <option value="custom">Custom...</option>
                </select>
                <ChevronDown
                  className="absolute right-2.5 text-muted-foreground pointer-events-none"
                  size={12}
                />
              </>
            )}
          </div>
        ) : (
          <span className="font-bold text-foreground">{itemsPerPage}</span>
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
            className="w-7 h-7 p-0 border-border cursor-pointer"
            disabled={currentPage === 1}
            onClick={onPrev}
            size="icon"
            variant="outline"
          >
            <ChevronLeft size={14} />
          </Button>
          <Button
            className="w-7 h-7 p-0 border-border cursor-pointer"
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
