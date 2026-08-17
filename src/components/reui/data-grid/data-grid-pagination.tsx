'use client';

import type { JSX, ReactNode } from 'react';

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import { useDataGrid } from '@/components/reui/data-grid/data-grid';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface DataGridPaginationProps {
  className?: string;
  ellipsisText?: string;
  info?: string;
  infoSkeleton?: ReactNode;
  more?: boolean;
  moreLimit?: number;
  nextPageLabel?: string;
  previousPageLabel?: string;
  rowsPerPageLabel?: string;
  sizes?: number[];
  sizesDescription?: string;
  sizesInfo?: string;
  sizesLabel?: string;
  sizesSkeleton?: ReactNode;
}

function DataGridPagination(props: DataGridPaginationProps): JSX.Element {
  const { isLoading, recordCount, table } = useDataGrid();

  const defaultProps: Partial<DataGridPaginationProps> = {
    ellipsisText: '...',
    info: '{from} - {to} of {count}',
    infoSkeleton: <Skeleton className="h-8 w-60" />,
    moreLimit: 5,
    nextPageLabel: 'Go to next page',
    previousPageLabel: 'Go to previous page',
    rowsPerPageLabel: 'Rows per page',
    sizes: [5, 10, 25, 50, 100],
    sizesSkeleton: <Skeleton className="h-8 w-44" />,
  };

  const mergedProps: DataGridPaginationProps = { ...defaultProps, ...props };

  const btnBaseClasses = 'p-0 text-sm';
  const btnArrowClasses = `${btnBaseClasses} rtl:transform rtl:rotate-180`;
  const pageIndex = table.state.pagination.pageIndex;
  const pageSize = table.state.pagination.pageSize;
  const from = recordCount === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, recordCount);
  const pageCount = table.getPageCount();

  const paginationInfo = mergedProps.info
    ? mergedProps.info
        .replaceAll('{from}', from.toString())
        .replaceAll('{to}', to.toString())
        .replaceAll('{count}', recordCount.toString())
    : `${from} - ${to} of ${recordCount}`;

  const paginationMoreLimit = mergedProps.moreLimit || 5;

  const currentGroupStart = Math.floor(pageIndex / paginationMoreLimit) * paginationMoreLimit;
  const currentGroupEnd = Math.min(currentGroupStart + paginationMoreLimit, pageCount);

  const renderPageButtons = () => {
    const buttons = [];

    for (let i = currentGroupStart; i < currentGroupEnd; i++) {
      buttons.push(
        <Button
          className={cn(btnBaseClasses, 'text-muted-foreground', {
            'bg-accent text-accent-foreground': pageIndex === i,
          })}
          key={i}
          onClick={() => {
            if (pageIndex !== i) {
              table.setPageIndex(i);
            }
          }}
          size="icon-sm"
          variant="ghost"
        >
          {i + 1}
        </Button>
      );
    }

    return buttons;
  };

  const renderEllipsisPrevButton = () => {
    if (currentGroupStart > 0) {
      return (
        <Button
          className={btnBaseClasses}
          onClick={() => table.setPageIndex(currentGroupStart - 1)}
          size="icon-sm"
          variant="ghost"
        >
          {mergedProps.ellipsisText}
        </Button>
      );
    }

    return null;
  };

  const renderEllipsisNextButton = () => {
    if (currentGroupEnd < pageCount) {
      return (
        <Button
          className={btnBaseClasses}
          onClick={() => table.setPageIndex(currentGroupEnd)}
          size="icon-sm"
          variant="ghost"
        >
          {mergedProps.ellipsisText}
        </Button>
      );
    }

    return null;
  };

  return (
    <div
      className={cn(
        'flex grow flex-col flex-wrap items-center justify-between gap-2.5 py-2.5 sm:flex-row sm:py-0',
        mergedProps.className
      )}
      data-slot="data-grid-pagination"
    >
      <div className="order-2 flex flex-wrap items-center space-x-2.5 pb-2.5 sm:order-1 sm:pb-0">
        {isLoading ? (
          mergedProps.sizesSkeleton
        ) : (
          <>
            <div className="text-sm text-muted-foreground">{mergedProps.rowsPerPageLabel}</div>
            <Select
              onValueChange={(value) => {
                const newPageSize = Number(value);
                table.setPageSize(newPageSize);
              }}
              value={`${pageSize}`}
            >
              <SelectTrigger className="w-16" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start" className="min-w-(--radix-select-trigger-width)" position="popper">
                {mergedProps.sizes?.map((size: number) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>
      <div className="order-1 flex flex-col items-center justify-center gap-2.5 pt-2.5 sm:order-2 sm:flex-row sm:justify-end sm:pt-0">
        {isLoading ? (
          mergedProps.infoSkeleton
        ) : (
          <>
            <div className="order-2 text-nowrap text-sm text-muted-foreground sm:order-1">
              {paginationInfo}
            </div>
            {pageCount > 1 && (
              <div className="order-1 flex items-center space-x-1">
                <Button
                  className={btnArrowClasses}
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                  size="icon-sm"
                  variant="ghost"
                >
                  <span className="sr-only">{mergedProps.previousPageLabel}</span>
                  <ChevronLeftIcon className="size-4" />
                </Button>

                {renderEllipsisPrevButton()}

                {renderPageButtons()}

                {renderEllipsisNextButton()}

                <Button
                  className={btnArrowClasses}
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.nextPage()}
                  size="icon-sm"
                  variant="ghost"
                >
                  <span className="sr-only">{mergedProps.nextPageLabel}</span>
                  <ChevronRightIcon className="size-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export { DataGridPagination, type DataGridPaginationProps };
