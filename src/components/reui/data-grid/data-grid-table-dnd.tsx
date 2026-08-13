import type { Cell, Header, HeaderGroup, Row } from '@tanstack/react-table';
import type { CSSProperties, ReactNode } from 'react';

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  type Modifier,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { flexRender } from '@tanstack/react-table';
import { GripVerticalIcon } from 'lucide-react';
import { Fragment, memo, useEffect, useId, useMemo, useRef, useState } from 'react';

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

function DataGridTableDndBodyRows<TData extends object>({ table }: { table: DataGridTableInstance<TData> }) {
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
    <>
      {table.getRowModel().rows.map((row: Row<DataGridFeatures, TData>) => (
        <Fragment key={row.id}>
          <DataGridTableBodyRow row={row}>
            <SortableContext items={table.state.columnOrder} strategy={horizontalListSortingStrategy}>
              {row.getVisibleCells().map((cell: Cell<DataGridFeatures, TData, unknown>) => (
                <DataGridTableDndCell cell={cell} key={cell.id} />
              ))}
            </SortableContext>
            <DataGridTableFillBodyCell />
          </DataGridTableBodyRow>
          {row.getIsExpanded() && <DataGridTableBodyRowExpandded row={row} />}
        </Fragment>
      ))}
    </>
  );
}

function DataGridTableDndCell<TData extends object>({
  cell,
}: {
  cell: Cell<DataGridFeatures, TData, unknown>;
}) {
  const { props } = useDataGrid();
  const { isDragging, setNodeRef, transform, transition } = useSortable({
    id: cell.column.id,
  });

  const style: CSSProperties = {
    cursor: isDragging ? 'grabbing' : undefined,
    opacity: isDragging ? 0.8 : 1,
    position: 'relative',
    transform: CSS.Translate.toString(transform),
    transition,
    width: props.tableLayout?.columnsResizable
      ? `calc(var(--col-${cell.column.id}-size) * 1px)`
      : cell.column.getSize(),
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <DataGridTableBodyRowCell cell={cell} dndRef={setNodeRef} dndStyle={style}>
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </DataGridTableBodyRowCell>
  );
}

function DataGridTableDndHeader<TData extends object>({
  header,
}: {
  header: Header<DataGridFeatures, TData, unknown>;
}) {
  const { props } = useDataGrid();
  const { column } = header;

  // Check if column ordering is enabled for this column
  const canOrder = (column.columnDef as { enableColumnOrdering?: boolean }).enableColumnOrdering !== false;

  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: header.column.id,
  });

  const style: CSSProperties = {
    cursor: isDragging ? 'grabbing' : undefined,
    opacity: isDragging ? 0.8 : 1,
    position: 'relative',
    transform: CSS.Translate.toString(transform),
    transition,
    whiteSpace: 'nowrap',
    width: props.tableLayout?.columnsResizable
      ? `calc(var(--header-${header.id}-size) * 1px)`
      : header.column.getSize(),
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <DataGridTableHeadRowCell dndRef={setNodeRef} dndStyle={style} header={header}>
      <div className="flex items-center justify-start gap-0.5">
        {canOrder && (
          <Button
            className={`-ms-2 size-6 ${isDragging ? 'cursor-grabbing' : 'cursor-grab active:cursor-grabbing'}`}
            size="icon-sm"
            variant="ghost"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
          >
            <GripVerticalIcon aria-hidden="true" className="opacity-60 hover:opacity-100" />
          </Button>
        )}
        <div className="grow">
          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
        </div>
        {props.tableLayout?.columnsResizable && column.getCanResize() && (
          <DataGridTableHeadRowCellResize header={header} />
        )}
      </div>
    </DataGridTableHeadRowCell>
  );
}

/**
 * Memoized body rows: skip re-renders during active column resize.
 * Column widths update via CSS variables on the <table> element,
 * so the browser handles width changes without React re-renders.
 */
const MemoizedDataGridTableDndBodyRows = memo(
  DataGridTableDndBodyRows,
  (_prev, next) => !!next.table.state.columnResizing.isResizingColumn
) as typeof DataGridTableDndBodyRows;

function DataGridTableDnd<TData extends object>({
  footerContent,
  handleDragEnd,
}: {
  footerContent?: ReactNode;
  handleDragEnd: (event: DragEndEvent) => void;
}) {
  const { props, table } = useDataGrid();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingColumn, setIsDraggingColumn] = useState(false);

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    // Keyboard reordering moves one sortable position per keypress instead
    // of the sensor's raw 25px default.
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!isDraggingColumn) {
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
  }, [isDraggingColumn]);

  // Custom modifier to restrict dragging within table bounds with edge offset
  const modifiers = useMemo(() => {
    const restrictToTableBounds: Modifier = ({ draggingNodeRect, transform }) => {
      if (!draggingNodeRect || !containerRef.current) {
        return { ...transform, y: 0 };
      }

      const containerRect = containerRef.current.getBoundingClientRect();
      const edgeOffset = 0;

      const minX = containerRect.left - draggingNodeRect.left - edgeOffset;
      const maxX = containerRect.right - draggingNodeRect.left - draggingNodeRect.width + edgeOffset;

      return {
        ...transform,
        x: Math.min(Math.max(transform.x, minX), maxX),
        y: 0, // Lock vertical movement
      };
    };

    return [restrictToTableBounds];
  }, []);

  return (
    <DndContext
      collisionDetection={closestCenter}
      id={useId()}
      modifiers={modifiers}
      onDragCancel={() => setIsDraggingColumn(false)}
      onDragEnd={(event) => {
        setIsDraggingColumn(false);
        handleDragEnd(event);
      }}
      onDragStart={() => setIsDraggingColumn(true)}
      sensors={sensors}
    >
      <DataGridTableViewport
        className={isDraggingColumn ? '[&_*]:cursor-grabbing! relative cursor-grabbing' : 'relative'}
        viewportRef={containerRef}
      >
        <DataGridTableBase>
          <DataGridTableHead>
            {table.getHeaderGroups().map((headerGroup: HeaderGroup<DataGridFeatures, TData>, index) => (
              <DataGridTableHeadRow key={index} rowId={headerGroup.id}>
                <SortableContext items={table.state.columnOrder} strategy={horizontalListSortingStrategy}>
                  {headerGroup.headers.map((header) => (
                    <DataGridTableDndHeader header={header} key={header.id} />
                  ))}
                </SortableContext>
                <DataGridTableFillHeadCell />
              </DataGridTableHeadRow>
            ))}
          </DataGridTableHead>

          {(props.tableLayout?.stripped || !props.tableLayout?.rowBorder) && <DataGridTableRowSpacer />}

          <DataGridTableBody>
            <MemoizedDataGridTableDndBodyRows table={table} />
          </DataGridTableBody>

          {footerContent && <DataGridTableFoot>{footerContent}</DataGridTableFoot>}
        </DataGridTableBase>
      </DataGridTableViewport>
    </DndContext>
  );
}

export { DataGridTableDnd };
