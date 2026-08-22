'use client';

import type { Column, Row } from '@tanstack/react-table';
import type { VirtualItem, Virtualizer, VirtualizerOptions } from '@tanstack/react-virtual';
import type { CSSProperties, ReactNode } from 'react';

import { flexRender } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { DataGridFeatures, DataGridTableInstance } from '@/components/reui/data-grid/data-grid';

import { useDataGrid } from '@/components/reui/data-grid/data-grid';
import {
  DataGridTableBase,
  DataGridTableBody,
  DataGridTableEmpty,
  DataGridTableFillBodyCell,
  DataGridTableFillHeadCell,
  DataGridTableFoot,
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
  DataGridTableHeadRowCellResize,
  DataGridTableRenderedRow,
  DataGridTableRowSpacer,
  DataGridTableViewport,
  getDataGridScrollAreaViewport,
  getDataGridTableMergedHeaderGroups,
  getDataGridTableRowSections,
  getPinningStyles,
  hasDataGridTableRightPinnedColumns,
} from '@/components/reui/data-grid/data-grid-table';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

type DataGridTableVirtualizerInstance = Virtualizer<HTMLElement, HTMLTableRowElement>;

type DataGridTableVirtualizerOptions<TData extends object> = Omit<
  VirtualizerOptions<HTMLElement, HTMLTableRowElement>,
  'count' | 'estimateSize' | 'getItemKey' | 'getScrollElement'
> & {
  estimateSize?: (index: number, row: Row<DataGridFeatures, TData>) => number;
  getItemKey?: (index: number, row: Row<DataGridFeatures, TData>) => number | string;
  getScrollElement?: (elements: DataGridTableVirtualScrollElements) => HTMLElement | null;
};

interface DataGridTableVirtualProps<TData extends object> {
  estimateSize?: number;
  fetchMoreOffset?: number;
  footerContent?: ReactNode;
  hasMore?: boolean;
  height?: number | string;
  isFetchingMore?: boolean;
  onFetchMore?: () => void;
  overscan?: number;
  renderHeader?: boolean;
  scrollBehavior?: ScrollBehavior;
  scrollToRowAlign?: DataGridTableVirtualScrollAlignment;
  scrollToRowIndex?: number;
  virtualizerOptions?: DataGridTableVirtualizerOptions<TData>;
}

type DataGridTableVirtualScrollAlignment = 'auto' | 'center' | 'end' | 'start';

type DataGridTableVirtualScrollElements = {
  containerElement: HTMLDivElement | null;
  scrollElement: HTMLElement | null;
};

type DataGridTableVirtualScrollRequest = {
  align: DataGridTableVirtualScrollAlignment;
  behavior: ScrollBehavior;
  containerElement: HTMLDivElement;
  headerSticky: boolean;
  isVirtualizationEnabled: boolean;
  rowId: string | undefined;
  rowIndex: number;
  scrollElement: HTMLElement;
};

interface VirtualBodyProps<TData extends object> {
  allRowsLoadedMessage: ReactNode;
  bottomRows: Row<DataGridFeatures, TData>[];
  centerRows: Row<DataGridFeatures, TData>[];
  hasMore?: boolean;
  isFetchingMore: boolean;
  isInfiniteMode: boolean;
  isVirtualizationEnabled: boolean;
  loadingMoreMessage: ReactNode;
  measureRowRef?: (element: HTMLTableRowElement | null) => void;
  table: DataGridTableInstance<TData>;
  topRows: Row<DataGridFeatures, TData>[];
  totalSize: number;
  virtualItems: VirtualItem[];
}

function DataGridTableVirtualBody<TData extends object>({
  allRowsLoadedMessage,
  bottomRows,
  centerRows,
  hasMore,
  isFetchingMore,
  isInfiniteMode,
  isVirtualizationEnabled,
  loadingMoreMessage,
  measureRowRef,
  table,
  topRows,
  totalSize,
  virtualItems,
}: VirtualBodyProps<TData>) {
  const { isLoading } = useDataGrid();
  const totalRows = topRows.length + centerRows.length + bottomRows.length;

  if (!totalRows) {
    if (isLoading) {
      return (
        <DataGridTableVirtualStatusRow table={table}>
          <div className="flex items-center justify-center gap-2">
            <Spinner className="size-4 opacity-60" />
            {loadingMoreMessage}
          </div>
        </DataGridTableVirtualStatusRow>
      );
    }

    return <DataGridTableEmpty />;
  }

  const hasCenterRows = centerRows.length > 0;
  const showFetchingRow = isInfiniteMode && isFetchingMore;
  const showCompleteRow = isInfiniteMode && hasMore === false && totalRows > 0;
  const hasMiddleSection = hasCenterRows || showFetchingRow || showCompleteRow;
  const leadingSpacerHeight =
    isVirtualizationEnabled && hasCenterRows && virtualItems.length > 0 ? (virtualItems[0]?.start ?? 0) : 0;
  const trailingSpacerHeight =
    isVirtualizationEnabled && hasCenterRows && virtualItems.length > 0
      ? Math.max(0, totalSize - (virtualItems[virtualItems.length - 1]?.end ?? 0))
      : 0;

  const renderedRows: ReactNode[] = [];

  topRows.forEach((row, index) => {
    renderedRows.push(
      <DataGridTableRenderedRow
        key={row.id}
        pinnedBoundary={index === topRows.length - 1 && hasMiddleSection ? 'top' : undefined}
        row={row}
      />
    );
  });

  if (isVirtualizationEnabled) {
    if (leadingSpacerHeight > 0) {
      renderedRows.push(
        <DataGridTableVirtualSpacer height={leadingSpacerHeight} key="virtual-spacer-start" table={table} />
      );
    }

    virtualItems.forEach((virtualRow) => {
      const row = centerRows[virtualRow.index];

      if (!row) {
        return;
      }

      renderedRows.push(
        <DataGridTableRenderedRow key={row.id} row={row} rowIndex={virtualRow.index} rowRef={measureRowRef} />
      );
    });

    if (trailingSpacerHeight > 0) {
      renderedRows.push(
        <DataGridTableVirtualSpacer height={trailingSpacerHeight} key="virtual-spacer-end" table={table} />
      );
    }
  } else {
    centerRows.forEach((row, rowIndex) => {
      renderedRows.push(<DataGridTableRenderedRow key={row.id} row={row} rowIndex={rowIndex} />);
    });
  }

  if (showFetchingRow) {
    renderedRows.push(
      <DataGridTableVirtualStatusRow key="virtual-status-loading" table={table}>
        <div className="flex items-center justify-center gap-2">
          <Spinner className="size-4 opacity-60" />
          {loadingMoreMessage}
        </div>
      </DataGridTableVirtualStatusRow>
    );
  }

  if (showCompleteRow) {
    renderedRows.push(
      <DataGridTableVirtualStatusRow className="py-3 text-sm" key="virtual-status-complete" table={table}>
        {allRowsLoadedMessage}
      </DataGridTableVirtualStatusRow>
    );
  }

  bottomRows.forEach((row, index) => {
    renderedRows.push(
      <DataGridTableRenderedRow
        key={row.id}
        pinnedBoundary={index === 0 && (topRows.length > 0 || hasMiddleSection) ? 'bottom' : undefined}
        row={row}
      />
    );
  });

  return <>{renderedRows}</>;
}

function DataGridTableVirtualPinnedPlaceholderCell<TData extends object>({
  column,
}: {
  column: Column<DataGridFeatures, TData>;
}) {
  const { props } = useDataGrid();
  const isPinned = column.getIsPinned();
  const isLastStartPinned = isPinned === 'start' && column.getIsLastColumn('start');
  const isFirstEndPinned = isPinned === 'end' && column.getIsFirstColumn('end');

  return (
    <td
      aria-hidden="true"
      className={cn(
        'p-0',
        props.tableLayout?.cellBorder && 'border-e',
        props.tableLayout?.columnsPinnable &&
          column.getCanPin() &&
          'data-pinned:bg-background data-pinned:isolate [&[data-pinned=end][data-last-col=end]]:shadow-[inset_1px_0_0_0_var(--border)] [&[data-pinned=start][data-last-col=start]]:shadow-[inset_-1px_0_0_0_var(--border)]'
      )}
      data-last-col={isLastStartPinned ? 'start' : isFirstEndPinned ? 'end' : undefined}
      data-pinned={isPinned || undefined}
      style={{
        ...(props.tableLayout?.columnsPinnable && column.getCanPin() && getPinningStyles(column)),
        ...(props.tableLayout?.columnsResizable && {
          width: `calc(var(--col-${column.id}-size) * 1px)`,
        }),
      }}
    />
  );
}

function DataGridTableVirtualSpacer<TData extends object>({
  height,
  table,
}: {
  height: number;
  table: DataGridTableInstance<TData>;
}) {
  if (height <= 0) {
    return null;
  }

  return (
    <DataGridTableVirtualUtilityRow
      ariaHidden
      centerCellClassName="p-0"
      centerCellStyle={{ height, padding: 0 }}
      table={table}
    >
      {null}
    </DataGridTableVirtualUtilityRow>
  );
}

function DataGridTableVirtualStatusRow<TData extends object>({
  children,
  className,
  table,
}: {
  children: ReactNode;
  className?: string;
  table: DataGridTableInstance<TData>;
}) {
  return (
    <DataGridTableVirtualUtilityRow
      centerCellClassName={cn('py-4 text-center text-sm text-muted-foreground', className)}
      table={table}
    >
      {children}
    </DataGridTableVirtualUtilityRow>
  );
}

function DataGridTableVirtualUtilityRow<TData extends object>({
  ariaHidden,
  centerCellClassName,
  centerCellStyle,
  children,
  rowClassName,
  table,
}: {
  ariaHidden?: boolean;
  centerCellClassName?: string;
  centerCellStyle?: CSSProperties;
  children: ReactNode;
  rowClassName?: string;
  table: DataGridTableInstance<TData>;
}) {
  const { props } = useDataGrid();
  const leftVisibleColumns = table.getStartVisibleLeafColumns();
  const centerVisibleColumns = table.getCenterVisibleLeafColumns();
  const rightVisibleColumns = table.getEndVisibleLeafColumns();
  const hasRightPinnedColumns = hasDataGridTableRightPinnedColumns(table);

  return (
    <tr aria-hidden={ariaHidden || undefined} className={rowClassName}>
      {leftVisibleColumns.map((column) => (
        <DataGridTableVirtualPinnedPlaceholderCell column={column} key={column.id} />
      ))}
      <td
        className={centerCellClassName}
        colSpan={Math.max(centerVisibleColumns.length, 1)}
        style={centerCellStyle}
      >
        {children}
      </td>
      {props.tableLayout?.columnsResizable && hasRightPinnedColumns ? <DataGridTableFillBodyCell /> : null}
      {rightVisibleColumns.map((column) => (
        <DataGridTableVirtualPinnedPlaceholderCell column={column} key={column.id} />
      ))}
      {props.tableLayout?.columnsResizable && !hasRightPinnedColumns ? <DataGridTableFillBodyCell /> : null}
    </tr>
  );
}

function getDataGridTableHeaderOffset({
  containerElement,
  headerSticky,
  scrollElement,
}: {
  containerElement: HTMLDivElement;
  headerSticky: boolean;
  scrollElement: HTMLElement;
}) {
  if (!headerSticky) {
    return 0;
  }

  const headerElement = containerElement.querySelector<HTMLElement>(
    ':scope > [data-slot="data-grid-table"] > thead'
  );

  if (!headerElement) {
    return 0;
  }

  const scrollRect = scrollElement.getBoundingClientRect();
  const headerRect = headerElement.getBoundingClientRect();
  const headerBottomOffset = headerRect.bottom - scrollRect.top;
  const overlapsViewportTop = headerRect.top <= scrollRect.top + 0.5 && headerBottomOffset > 0;

  if (!overlapsViewportTop) {
    return 0;
  }

  return Math.min(scrollElement.clientHeight, Math.max(0, headerBottomOffset));
}

function getDataGridTableScrollTarget({
  align,
  clientHeight,
  rowBottom,
  rowHeight,
  rowTop,
  scrollHeight,
  scrollTop,
  viewportTopOffset = 0,
}: {
  align: DataGridTableVirtualScrollAlignment;
  clientHeight: number;
  rowBottom: number;
  rowHeight: number;
  rowTop: number;
  scrollHeight: number;
  scrollTop: number;
  viewportTopOffset?: number;
}) {
  const visibleHeight = Math.max(0, clientHeight - viewportTopOffset);
  const viewportTop = scrollTop + viewportTopOffset;
  const viewportBottom = scrollTop + clientHeight;

  const targetTop =
    align === 'auto'
      ? rowTop < viewportTop
        ? rowTop - viewportTopOffset
        : rowBottom > viewportBottom
          ? rowBottom - clientHeight
          : null
      : align === 'start'
        ? rowTop - viewportTopOffset
        : align === 'end'
          ? rowBottom - clientHeight
          : rowTop - viewportTopOffset - Math.max(0, (visibleHeight - rowHeight) / 2);

  if (targetTop === null) {
    return null;
  }

  return Math.min(Math.max(0, targetTop), Math.max(0, scrollHeight - clientHeight));
}

function isSameDataGridTableScrollRequest(
  previous: DataGridTableVirtualScrollRequest | null,
  next: DataGridTableVirtualScrollRequest
) {
  return (
    previous?.align === next.align &&
    previous.behavior === next.behavior &&
    previous.containerElement === next.containerElement &&
    previous.headerSticky === next.headerSticky &&
    previous.isVirtualizationEnabled === next.isVirtualizationEnabled &&
    previous.rowId === next.rowId &&
    previous.rowIndex === next.rowIndex &&
    previous.scrollElement === next.scrollElement
  );
}

function scrollDataGridTableRowIntoView({
  align,
  behavior,
  cancelPendingScroll = false,
  containerElement,
  headerSticky,
  rowIndex,
  scrollElement,
  virtualizer,
}: {
  align: DataGridTableVirtualScrollAlignment;
  behavior: ScrollBehavior;
  cancelPendingScroll?: boolean;
  containerElement: HTMLDivElement | null;
  headerSticky: boolean;
  rowIndex: number;
  scrollElement: HTMLElement | null;
  virtualizer?: DataGridTableVirtualizerInstance;
}) {
  if (!containerElement || !scrollElement) {
    return false;
  }

  const rowElement = containerElement.querySelector<HTMLTableRowElement>(
    `:scope > [data-slot="data-grid-table"] > tbody > tr[data-index="${rowIndex}"]`
  );

  if (!rowElement) {
    return false;
  }

  const scrollRect = scrollElement.getBoundingClientRect();
  const rowRect = rowElement.getBoundingClientRect();
  const viewportTopOffset = getDataGridTableHeaderOffset({
    containerElement,
    headerSticky,
    scrollElement,
  });
  const rowTop = scrollElement.scrollTop + rowRect.top - scrollRect.top;
  const rowBottom = scrollElement.scrollTop + rowRect.bottom - scrollRect.top;
  const targetTop = getDataGridTableScrollTarget({
    align,
    clientHeight: scrollElement.clientHeight,
    rowBottom,
    rowHeight: rowRect.height || rowElement.offsetHeight,
    rowTop,
    scrollHeight: scrollElement.scrollHeight,
    scrollTop: scrollElement.scrollTop,
    viewportTopOffset,
  });

  if (targetTop === null || Math.abs(targetTop - scrollElement.scrollTop) < 0.5) {
    if (cancelPendingScroll) {
      scrollDataGridTableToOffset({
        behavior: 'auto',
        scrollElement,
        targetTop: scrollElement.scrollTop,
        virtualizer,
      });
    }

    return true;
  }

  scrollDataGridTableToOffset({
    behavior,
    scrollElement,
    targetTop,
    virtualizer,
  });

  return true;
}

function scrollDataGridTableToOffset({
  behavior,
  scrollElement,
  targetTop,
  virtualizer,
}: {
  behavior: ScrollBehavior;
  scrollElement: HTMLElement;
  targetTop: number;
  virtualizer?: DataGridTableVirtualizerInstance;
}) {
  if (virtualizer) {
    virtualizer.scrollToOffset(targetTop, { align: 'start', behavior });
  } else if (typeof scrollElement.scrollTo === 'function') {
    scrollElement.scrollTo({ behavior, top: targetTop });
  } else {
    scrollElement.scrollTop = targetTop;
  }
}

const MemoizedVirtualBody = memo(
  DataGridTableVirtualBody,
  (_prev, next) => !!next.table.state.columnResizing.isResizingColumn
) as typeof DataGridTableVirtualBody;

function DataGridTableVirtual<TData extends object>({
  estimateSize = 48,
  fetchMoreOffset = 0,
  footerContent,
  hasMore,
  height,
  isFetchingMore = false,
  onFetchMore,
  overscan = 10,
  renderHeader = true,
  scrollBehavior = 'auto',
  scrollToRowAlign = 'auto',
  scrollToRowIndex,
  virtualizerOptions,
}: DataGridTableVirtualProps<TData>) {
  const { props, table } = useDataGrid<TData>();
  const mergedHeaderGroups = getDataGridTableMergedHeaderGroups(table);
  const hasRightPinnedColumns = hasDataGridTableRightPinnedColumns(table);
  const { bottomRows, centerRows, topRows } = getDataGridTableRowSections(
    table,
    props.tableLayout?.rowsPinnable
  );
  const isInfiniteMode = typeof onFetchMore === 'function';
  const [viewportElements, setViewportElements] = useState<DataGridTableVirtualScrollElements>({
    containerElement: null,
    scrollElement: null,
  });

  const {
    estimateSize: customEstimateSize,
    getItemKey: customGetItemKey,
    getScrollElement: customGetScrollElement,
    measureElement: customMeasureElement,
    overscan: customOverscan,
    ...virtualizerOptionsRest
  } = virtualizerOptions ?? {};

  const isVirtualizationEnabled = virtualizerOptions?.enabled !== false;
  const loadingMoreMessage = props.fetchingMoreMessage || props.loadingMessage || 'Loading...';
  const allRowsLoadedMessage = props.allRowsLoadedMessage || 'All records loaded';

  const handleViewportRef = useCallback((node: HTMLDivElement | null) => {
    setViewportElements({
      containerElement: node,
      scrollElement: node ? (getDataGridScrollAreaViewport(node) ?? node) : null,
    });
  }, []);

  const usesExternalScrollArea =
    viewportElements.scrollElement !== null &&
    viewportElements.scrollElement !== viewportElements.containerElement;

  const resolveScrollElement = useCallback(() => {
    if (customGetScrollElement) {
      return customGetScrollElement(viewportElements);
    }

    return viewportElements.scrollElement;
  }, [customGetScrollElement, viewportElements]);

  const resolveItemKey = useCallback(
    (index: number) => {
      const row = centerRows[index];

      if (!row) {
        return index;
      }

      return customGetItemKey?.(index, row) ?? row.id ?? index;
    },
    [centerRows, customGetItemKey]
  );

  const resolveEstimateSize = useCallback(
    (index: number) => {
      const row = centerRows[index];

      return row ? (customEstimateSize?.(index, row) ?? estimateSize) : estimateSize;
    },
    [centerRows, customEstimateSize, estimateSize]
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: centerRows.length,
    estimateSize: resolveEstimateSize,
    getItemKey: resolveItemKey,
    getScrollElement: resolveScrollElement,
    measureElement: customMeasureElement,
    overscan: customOverscan ?? overscan,
    ...virtualizerOptionsRest,
  }) as DataGridTableVirtualizerInstance;

  const virtualItems = useMemo(
    () => (isVirtualizationEnabled ? virtualizer.getVirtualItems() : []),
    [isVirtualizationEnabled, virtualizer]
  );
  const totalSize = isVirtualizationEnabled ? virtualizer.getTotalSize() : 0;
  const measureRowRef =
    isVirtualizationEnabled && customMeasureElement ? virtualizer.measureElement : undefined;
  const resolvedFetchMoreOffset = Math.max(0, fetchMoreOffset);
  const scrollToRowId = scrollToRowIndex !== undefined ? centerRows[scrollToRowIndex]?.id : undefined;
  const scrollToRowVirtualItem =
    isVirtualizationEnabled && scrollToRowIndex !== undefined
      ? virtualItems.find((item: VirtualItem) => item.index === scrollToRowIndex)
      : undefined;
  const pendingScrollToRowIndexRef = useRef<null | number>(null);
  const lastScrollRequestRef = useRef<DataGridTableVirtualScrollRequest | null>(null);
  const fetchMoreFiredAtCountRef = useRef<null | number>(null);

  useEffect(() => {
    const previousRequest = lastScrollRequestRef.current;

    if (scrollToRowIndex === undefined || scrollToRowIndex < 0 || scrollToRowIndex >= centerRows.length) {
      pendingScrollToRowIndexRef.current = null;
      lastScrollRequestRef.current = null;

      if (previousRequest) {
        const scrollElement = resolveScrollElement();

        if (scrollElement) {
          scrollDataGridTableToOffset({
            behavior: 'auto',
            scrollElement,
            targetTop: scrollElement.scrollTop,
            virtualizer: isVirtualizationEnabled ? virtualizer : undefined,
          });
        }
      }

      return;
    }

    const scrollElement = resolveScrollElement();
    const containerElement = viewportElements.containerElement;

    if (!containerElement || !scrollElement) {
      return;
    }

    const headerSticky = renderHeader && !!props.tableLayout?.headerSticky;
    const nextRequest: DataGridTableVirtualScrollRequest = {
      align: scrollToRowAlign,
      behavior: scrollBehavior,
      containerElement,
      headerSticky,
      isVirtualizationEnabled,
      rowId: scrollToRowId,
      rowIndex: scrollToRowIndex,
      scrollElement,
    };

    if (isSameDataGridTableScrollRequest(previousRequest, nextRequest)) {
      return;
    }

    pendingScrollToRowIndexRef.current = null;

    const rowWasHandled = scrollDataGridTableRowIntoView({
      align: scrollToRowAlign,
      behavior: scrollBehavior,
      cancelPendingScroll: previousRequest !== null,
      containerElement,
      headerSticky,
      rowIndex: scrollToRowIndex,
      scrollElement,
      virtualizer: isVirtualizationEnabled ? virtualizer : undefined,
    });

    if (rowWasHandled) {
      lastScrollRequestRef.current = nextRequest;

      return;
    }

    if (!isVirtualizationEnabled) {
      return;
    }

    pendingScrollToRowIndexRef.current = scrollToRowIndex;
    lastScrollRequestRef.current = nextRequest;
    virtualizer.scrollToIndex(scrollToRowIndex, {
      align: scrollToRowAlign,
      behavior: scrollBehavior,
    });
  });

  useEffect(() => {
    if (
      !isVirtualizationEnabled ||
      scrollToRowIndex === undefined ||
      pendingScrollToRowIndexRef.current !== scrollToRowIndex ||
      !scrollToRowVirtualItem
    ) {
      return;
    }

    const rowWasHandled = scrollDataGridTableRowIntoView({
      align: scrollToRowAlign,
      behavior: 'auto',
      cancelPendingScroll: true,
      containerElement: viewportElements.containerElement,
      headerSticky: renderHeader && !!props.tableLayout?.headerSticky,
      rowIndex: scrollToRowIndex,
      scrollElement: resolveScrollElement(),
      virtualizer,
    });

    if (rowWasHandled) {
      pendingScrollToRowIndexRef.current = null;
    }
  }, [
    isVirtualizationEnabled,
    props.tableLayout?.headerSticky,
    renderHeader,
    resolveScrollElement,
    scrollToRowAlign,
    scrollToRowIndex,
    scrollToRowVirtualItem,
    virtualizer,
    viewportElements.containerElement,
  ]);

  useEffect(() => {
    if (!isVirtualizationEnabled || !isInfiniteMode || hasMore === false || isFetchingMore) {
      return;
    }

    const lastItem = virtualItems[virtualItems.length - 1];

    if (!lastItem) {
      return;
    }

    if (fetchMoreFiredAtCountRef.current === centerRows.length) {
      return;
    }

    if (lastItem.index >= centerRows.length - 1 - resolvedFetchMoreOffset) {
      fetchMoreFiredAtCountRef.current = centerRows.length;
      onFetchMore?.();
    }
  }, [
    centerRows.length,
    hasMore,
    isFetchingMore,
    isInfiniteMode,
    isVirtualizationEnabled,
    onFetchMore,
    resolvedFetchMoreOffset,
    virtualItems,
  ]);

  return (
    <DataGridTableViewport
      className={!usesExternalScrollArea ? 'block' : undefined}
      style={
        usesExternalScrollArea
          ? undefined
          : {
              height,
              overflow: 'auto',
              position: 'relative',
              width: 'auto',
            }
      }
      viewportRef={handleViewportRef}
    >
      <DataGridTableBase>
        {renderHeader && (
          <DataGridTableHead>
            {mergedHeaderGroups.map((headerGroup) => (
              <DataGridTableHeadRow key={headerGroup.id} rowId={headerGroup.id}>
                {headerGroup.headers
                  .filter((header) => header.column.getIsPinned() !== 'end')
                  .map((header) => {
                    const { column } = header;

                    return (
                      <DataGridTableHeadRowCell header={header} key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {props.tableLayout?.columnsResizable && column.getCanResize() && (
                          <DataGridTableHeadRowCellResize header={header} />
                        )}
                      </DataGridTableHeadRowCell>
                    );
                  })}
                {props.tableLayout?.columnsResizable && hasRightPinnedColumns ? (
                  <DataGridTableFillHeadCell />
                ) : null}
                {headerGroup.headers
                  .filter((header) => header.column.getIsPinned() === 'end')
                  .map((header) => {
                    const { column } = header;

                    return (
                      <DataGridTableHeadRowCell header={header} key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {props.tableLayout?.columnsResizable && column.getCanResize() && (
                          <DataGridTableHeadRowCellResize header={header} />
                        )}
                      </DataGridTableHeadRowCell>
                    );
                  })}
                {props.tableLayout?.columnsResizable && !hasRightPinnedColumns ? (
                  <DataGridTableFillHeadCell />
                ) : null}
              </DataGridTableHeadRow>
            ))}
          </DataGridTableHead>
        )}

        {renderHeader && (props.tableLayout?.stripped || !props.tableLayout?.rowBorder) && (
          <DataGridTableRowSpacer />
        )}

        <DataGridTableBody>
          <MemoizedVirtualBody
            allRowsLoadedMessage={allRowsLoadedMessage}
            bottomRows={bottomRows}
            centerRows={centerRows}
            hasMore={hasMore}
            isFetchingMore={isFetchingMore}
            isInfiniteMode={isInfiniteMode}
            isVirtualizationEnabled={isVirtualizationEnabled}
            loadingMoreMessage={loadingMoreMessage}
            measureRowRef={measureRowRef}
            table={table}
            topRows={topRows}
            totalSize={totalSize}
            virtualItems={virtualItems}
          />
        </DataGridTableBody>

        {footerContent && <DataGridTableFoot>{footerContent}</DataGridTableFoot>}
      </DataGridTableBase>
    </DataGridTableViewport>
  );
}

export { DataGridTableVirtual };
export type {
  DataGridTableVirtualizerOptions,
  DataGridTableVirtualProps,
  DataGridTableVirtualScrollAlignment,
  DataGridTableVirtualScrollElements,
};
