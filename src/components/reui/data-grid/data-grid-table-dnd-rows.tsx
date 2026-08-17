'use client';

import type { Cell, HeaderGroup, Row } from '@tanstack/react-table';
import type { CSSProperties, ReactNode } from 'react';

import {
  closestCenter,
  type CollisionDetection,
  DndContext,
  type DragCancelEvent,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  type Modifier,
  MouseSensor,
  TouchSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  type SortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { flexRender } from '@tanstack/react-table';
import { GripHorizontalIcon } from 'lucide-react';
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import type { DataGridFeatures, DataGridTableInstance } from '@/components/reui/data-grid/data-grid';

import { useDataGrid } from '@/components/reui/data-grid/data-grid';
import {
  DataGridTableBase,
  DataGridTableBody,
  DataGridTableBodyRow,
  DataGridTableBodyRowCell,
  DataGridTableBodyRowExpandded,
  DataGridTableBodyRowSkeleton,
  DataGridTableBodyRowSkeletonCell,
  DataGridTableEmpty,
  DataGridTableFillBodyCell,
  DataGridTableFillHeadCell,
  DataGridTableFoot,
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
  DataGridTableHeadRowCellResize,
  DataGridTableRowSpacer,
  DataGridTableViewport,
} from '@/components/reui/data-grid/data-grid-table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SortableContextValue = ReturnType<typeof useSortable>;
const SortableRowContext = createContext<null | Pick<SortableContextValue, 'attributes' | 'listeners'>>(null);

type DataGridTableDndRowData = {
  depth: number;
  index: number;
  parentId: null | string;
  type: 'data-grid-row';
};

type DataGridTableDndRowDecoration<TData extends object> = (context: {
  isDragging: boolean;
  isOver: boolean;
  row: Row<DataGridFeatures, TData>;
}) => ReactNode;

function DataGridTableDndRowHandle({
  className,
  disabled,
  disabledLabel = 'Reordering unavailable',
}: {
  className?: string;
  disabled?: boolean;
  disabledLabel?: string;
}) {
  const context = useContext(SortableRowContext);

  if (!context || disabled) {
    return (
      <Button
        aria-label={disabled ? disabledLabel : 'Drag to reorder row'}
        className={cn(
          'size-7 cursor-grab opacity-70 hover:bg-transparent hover:opacity-100 active:cursor-grabbing',
          disabled && 'cursor-not-allowed',
          className
        )}
        disabled
        size="icon-sm"
        title={disabled ? disabledLabel : undefined}
        variant="ghost"
      >
        <GripHorizontalIcon aria-hidden="true" />
      </Button>
    );
  }

  return (
    <Button
      aria-label="Drag to reorder row"
      className={cn(
        'size-7 cursor-grab opacity-70 hover:bg-transparent hover:opacity-100 active:cursor-grabbing',
        className
      )}
      size="icon-sm"
      variant="ghost"
      {...context.attributes}
      {...context.listeners}
    >
      <GripHorizontalIcon aria-hidden="true" />
    </Button>
  );
}

const holdRowsInPlaceStrategy: SortingStrategy = () => null;

function DataGridTableDndRow<TData extends object>({
  dropIndicator = true,
  renderRowDecoration,
  row,
}: {
  dropIndicator?: boolean;
  renderRowDecoration?: DataGridTableDndRowDecoration<TData>;
  row: Row<DataGridFeatures, TData>;
}) {
  const rowData: DataGridTableDndRowData = {
    depth: row.depth,
    index: row.index,
    parentId: row.getParentRow()?.id ?? null,
    type: 'data-grid-row',
  };

  const { activeIndex, attributes, index, isDragging, isOver, listeners, overIndex, setNodeRef, transform } =
    useSortable({
      data: rowData,
      id: row.id,
    });

  const dropEdge =
    dropIndicator && activeIndex !== -1 && index === overIndex && !isDragging
      ? activeIndex < overIndex
        ? 'bottom'
        : 'top'
      : null;

  const style: CSSProperties = {
    cursor: isDragging ? 'grabbing' : undefined,
    position: 'relative',
    transform: CSS.Transform.toString(transform),
    zIndex: isDragging ? 1 : 0,
    ...(isDragging && {
      opacity: 0.4,
      outline: '1px dashed var(--border)',
      outlineOffset: '-1px',
    }),
  };

  const decoration = renderRowDecoration?.({ isDragging, isOver, row });

  return (
    <SortableRowContext.Provider value={{ attributes, listeners }}>
      <DataGridTableBodyRow dndRef={setNodeRef} dndStyle={style} row={row}>
        {row.getVisibleCells().map((cell: Cell<DataGridFeatures, TData>, index, cells) => (
          <DataGridTableBodyRowCell cell={cell} key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
            {decoration && index === cells.length - 1 ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                data-slot="data-grid-table-row-decoration"
              >
                {decoration}
              </div>
            ) : null}
            {dropEdge && index === cells.length - 1 ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-20"
                data-edge={dropEdge}
                data-slot="data-grid-table-row-drop-indicator"
              >
                {/* Two solid pixels down the leading edge, the same marker
                        the tree drag uses for its drop target. A wash across
                        the row has to stay faint enough not to read as a
                        selected row, and in the achromatic styles primary
                        carries no chroma at all, so faint plus colourless is
                        just grey. The bar reads at any weight and leaves the
                        row's own background to hover and selection.

                        The bar is the whole indicator: the gap the rows have
                        already opened says which side, so a rule across the
                        seam as well only competes with the row borders it sits
                        between. `data-edge` still carries the direction for
                        anyone styling their own. */}
                <span className="absolute inset-y-0 start-0 w-0.5 bg-primary" />
              </div>
            ) : null}
          </DataGridTableBodyRowCell>
        ))}
        <DataGridTableFillBodyCell />
      </DataGridTableBodyRow>
      {row.getIsExpanded() && <DataGridTableBodyRowExpandded row={row} />}
    </SortableRowContext.Provider>
  );
}

function DataGridTableDndRowsBody<TData extends object>({
  dataIds,
  dropIndicator,
  renderRowDecoration,
  sortingStrategy,
  table,
}: {
  dataIds: UniqueIdentifier[];
  dropIndicator?: boolean;
  renderRowDecoration?: DataGridTableDndRowDecoration<TData>;
  sortingStrategy: SortingStrategy;
  table: DataGridTableInstance<TData>;
}) {
  const { isLoading, props } = useDataGrid();
  const pagination = table.state.pagination;

  if (props.loadingMode === 'skeleton' && isLoading && pagination?.pageSize) {
    return (
      <>
        {Array.from({ length: pagination.pageSize }).map((_, rowIndex) => (
          <DataGridTableBodyRowSkeleton key={rowIndex}>
            {table.getVisibleFlatColumns().map((column, colIndex) => (
              <DataGridTableBodyRowSkeletonCell column={column} key={colIndex}>
                {column.columnDef.meta?.skeleton}
              </DataGridTableBodyRowSkeletonCell>
            ))}
            <DataGridTableFillBodyCell />
          </DataGridTableBodyRowSkeleton>
        ))}
      </>
    );
  }

  if (!table.getRowModel().rows.length) {
    return <DataGridTableEmpty />;
  }

  return (
    <SortableContext items={dataIds} strategy={sortingStrategy}>
      {table.getRowModel().rows.map((row: Row<DataGridFeatures, TData>) => (
        <DataGridTableDndRow
          dropIndicator={dropIndicator}
          key={row.id}
          renderRowDecoration={renderRowDecoration}
          row={row}
        />
      ))}
    </SortableContext>
  );
}

const MemoizedDataGridTableDndRowsBody = memo(
  DataGridTableDndRowsBody,
  (_prev, next) => !!next.table.state.columnResizing.isResizingColumn
) as typeof DataGridTableDndRowsBody;

function DataGridTableDndRows<TData extends object>({
  collisionDetection = closestCenter,
  dataIds,
  dropIndicator = true,
  footerContent,
  handleDragEnd,
  modifiers,
  onDragCancel,
  onDragMove,
  onDragOver,
  onDragStart,
  renderRowDecoration,
  sortingStrategy = holdRowsInPlaceStrategy,
}: {
  collisionDetection?: CollisionDetection;
  dataIds: UniqueIdentifier[];
  dropIndicator?: boolean;
  footerContent?: ReactNode;
  handleDragEnd: (event: DragEndEvent) => void;
  modifiers?: Modifier[];
  onDragCancel?: (event: DragCancelEvent) => void;
  onDragMove?: (event: DragMoveEvent) => void;
  onDragOver?: (event: DragOverEvent) => void;
  onDragStart?: (event: DragStartEvent) => void;
  renderRowDecoration?: DataGridTableDndRowDecoration<TData>;
  sortingStrategy?: SortingStrategy;
}) {
  const { props, table } = useDataGrid<TData>();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [isDraggingRow, setIsDraggingRow] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPortalTarget(document.body);
  }, []);
  const [carried, setCarried] = useState<null | {
    columns: number[];
    height: number;
    id: UniqueIdentifier;
    width: number;
  }>(null);

  const pickUpRow = useCallback((id: UniqueIdentifier) => {
    const container = tableContainerRef.current;
    const head = container?.querySelector('thead tr');

    if (!container || !head) {
      setCarried(null);

      return;
    }

    const source = Array.from(container.querySelectorAll<HTMLElement>('tbody tr[data-row-id]')).find(
      (candidate) => candidate.dataset.rowId === String(id)
    );
    const height = source?.getBoundingClientRect().height ?? 0;

    const columns = Array.from(head.children)
      .filter((cell) => cell.getAttribute('data-slot') !== 'data-grid-table-fill-head-cell')
      .map((cell) => cell.getBoundingClientRect().width);

    setCarried({
      columns,
      height,
      id,
      width: columns.reduce((total, width) => total + width, 0),
    });
  }, []);

  const carriedRow = carried
    ? table.getRowModel().rows.find((row: Row<DataGridFeatures, TData>) => row.id === carried.id)
    : undefined;

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!isDraggingRow) {
      return;
    }

    const { body, documentElement } = document;
    const previousBodyCursor = body.style.cursor;
    const previousDocumentCursor = documentElement.style.cursor;

    body.style.cursor = 'grabbing';
    documentElement.style.cursor = 'grabbing';

    return () => {
      body.style.cursor = previousBodyCursor;
      documentElement.style.cursor = previousDocumentCursor;
    };
  }, [isDraggingRow]);

  const resolvedModifiers = useMemo(() => {
    const restrictToTableContainer: Modifier = ({ draggingNodeRect, transform }) => {
      if (!tableContainerRef.current || !draggingNodeRect) {
        return transform;
      }

      const containerRect = tableContainerRef.current.getBoundingClientRect();
      const { x, y } = transform;

      const minX = containerRect.left - draggingNodeRect.left;
      const maxX = containerRect.right - draggingNodeRect.right;
      const minY = containerRect.top - draggingNodeRect.top;
      const maxY = containerRect.bottom - draggingNodeRect.bottom;

      return {
        ...transform,
        x: modifiers ? x : Math.max(minX, Math.min(maxX, x)),
        y: Math.max(minY, Math.min(maxY, y)),
      };
    };

    return [...(modifiers ?? [restrictToVerticalAxis]), restrictToTableContainer];
  }, [modifiers]);

  return (
    <DndContext
      collisionDetection={collisionDetection}
      id={useId()}
      modifiers={resolvedModifiers}
      onDragCancel={(event) => {
        setIsDraggingRow(false);
        setCarried(null);
        onDragCancel?.(event);
      }}
      onDragEnd={(event) => {
        setIsDraggingRow(false);
        setCarried(null);
        handleDragEnd(event);
      }}
      onDragMove={onDragMove}
      onDragOver={onDragOver}
      onDragStart={(event) => {
        setIsDraggingRow(true);
        pickUpRow(event.active.id);
        onDragStart?.(event);
      }}
      sensors={sensors}
    >
      <DataGridTableViewport
        className={isDraggingRow ? '[&_*]:cursor-grabbing! relative cursor-grabbing' : 'relative'}
        viewportRef={tableContainerRef}
      >
        <DataGridTableBase>
          <DataGridTableHead>
            {table.getHeaderGroups().map((headerGroup: HeaderGroup<DataGridFeatures, TData>, index) => (
              <DataGridTableHeadRow key={index} rowId={headerGroup.id}>
                {headerGroup.headers.map((header, index) => {
                  const { column } = header;

                  return (
                    <DataGridTableHeadRowCell header={header} key={index}>
                      {header.isPlaceholder ? null : props.tableLayout?.columnsResizable &&
                        column.getCanResize() ? (
                        <>{flexRender(header.column.columnDef.header, header.getContext())}</>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                      {props.tableLayout?.columnsResizable && column.getCanResize() && (
                        <DataGridTableHeadRowCellResize header={header} />
                      )}
                    </DataGridTableHeadRowCell>
                  );
                })}
                <DataGridTableFillHeadCell />
              </DataGridTableHeadRow>
            ))}
          </DataGridTableHead>

          {(props.tableLayout?.stripped || !props.tableLayout?.rowBorder) && <DataGridTableRowSpacer />}

          <DataGridTableBody>
            <MemoizedDataGridTableDndRowsBody
              dataIds={dataIds}
              dropIndicator={dropIndicator}
              renderRowDecoration={renderRowDecoration}
              sortingStrategy={sortingStrategy}
              table={table}
            />
          </DataGridTableBody>

          {footerContent && <DataGridTableFoot>{footerContent}</DataGridTableFoot>}
        </DataGridTableBase>
      </DataGridTableViewport>

      {/* The row you are actually holding. It is a real clone rendered outside
          the table, which is the only way a dragged row can follow the pointer
          without disturbing the grid: it adds no cell, so it cannot alter the
          column widths, and it floats above the rows rather than through them.
          Its presence also tells dnd-kit to stop translating the source row, so
          the row left behind simply dims in place.

          Portalled to the body so the fixed positioning resolves against the
          viewport wherever the grid is mounted. React context crosses a portal,
          so DndContext still reaches it. */}
      {portalTarget
        ? createPortal(
            <DragOverlay dropAnimation={null}>
              {carried && carriedRow ? (
                <table
                  aria-hidden="true"
                  className="pointer-events-none cursor-grabbing rounded-md border border-border bg-background shadow-lg"
                  style={{ tableLayout: 'fixed', width: carried.width }}
                >
                  <tbody>
                    {/* Padding rides on the inner element, not the cell. A `td` can
                  never render narrower than its own horizontal padding, so a
                  column resized below that would silently widen here and the
                  clone would stop matching the row it came from. Height comes
                  from the measured source row for the same reason the widths
                  do: the clone has no row of its own to inherit it from. */}
                    <tr
                      className="[&>td]:p-0 [&>td]:align-middle"
                      style={{ height: carried.height || undefined }}
                    >
                      {carriedRow
                        .getVisibleCells()
                        .map((cell: Cell<DataGridFeatures, TData>, index: number) => (
                          <td
                            key={cell.id}
                            style={{
                              width: carried.columns[index] ?? cell.column.getSize(),
                            }}
                          >
                            <div className="truncate px-3">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </div>
                          </td>
                        ))}
                    </tr>
                  </tbody>
                </table>
              ) : null}
            </DragOverlay>,
            portalTarget
          )
        : null}
    </DndContext>
  );
}

export { DataGridTableDndRowHandle, DataGridTableDndRows };
export type { DataGridTableDndRowData, DataGridTableDndRowDecoration };
