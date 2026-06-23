import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPrev: () => void;
  onNext: () => void;
}

export function PaginationBar({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPrev,
  onNext,
}: PaginationBarProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-slate-50/50">
      <span className="font-medium">Items per page: {itemsPerPage}</span>
      <div className="flex items-center gap-4">
        <span>
          {startItem}-{endItem} of {totalItems}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="w-7 h-7 p-0 border-gray-200 cursor-pointer"
            disabled={currentPage === 1}
            onClick={onPrev}
          >
            <ChevronLeft size={14} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="w-7 h-7 p-0 border-gray-200 cursor-pointer"
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
