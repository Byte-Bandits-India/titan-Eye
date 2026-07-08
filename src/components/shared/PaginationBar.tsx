import * as React from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import type { PaginationBarProps } from '../../types';

export function PaginationBar({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPrev,
  onNext,
  onItemsPerPageChange,
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
    <div className="px-5 py-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/30">
      <div className="flex items-center gap-2">
        <span className="font-medium text-muted-foreground">Items per page:</span>
        {onItemsPerPageChange ? (
          <div className="relative flex items-center">
            {isCustomMode ? (
              <input
                type="number"
                min={1}
                value={inputValue}
                autoFocus
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleInputSubmit();
                  } else if (e.key === 'Escape') {
                    setInputValue(String(itemsPerPage));
                    setIsCustomMode(false);
                  }
                }}
                onBlur={handleInputSubmit}
                className="w-16 h-7 px-2 bg-card border border-border rounded-lg text-xs text-foreground font-bold shadow-3xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-center"
              />
            ) : (
              <>
                <select
                  value={isPreset ? itemsPerPage : 'custom-preset'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom' || val === 'custom-preset') {
                      setIsCustomMode(true);
                    } else {
                      onItemsPerPageChange(Number(val));
                    }
                  }}
                  className="appearance-none h-7 pl-2.5 pr-7 bg-card border border-border rounded-lg text-xs text-foreground font-bold shadow-3xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
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
                  size={12}
                  className="absolute right-2.5 text-muted-foreground pointer-events-none"
                />
              </>
            )}
          </div>
        ) : (
          <span className="font-bold text-foreground">{itemsPerPage}</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span>
          {startItem}-{endItem} of {totalItems}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="w-7 h-7 p-0 border-border cursor-pointer"
            disabled={currentPage === 1}
            onClick={onPrev}
          >
            <ChevronLeft size={14} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="w-7 h-7 p-0 border-border cursor-pointer"
            disabled={currentPage === totalPages}
            onClick={onNext}
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
