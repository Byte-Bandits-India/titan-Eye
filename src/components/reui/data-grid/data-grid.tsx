'use client';

import type {
  Column,
  ColumnFiltersState,
  ReactTable,
  RowData,
  SortingState,
  Table,
  TableFeatures,
} from '@tanstack/react-table';
import type { ReactNode } from 'react';

import {
  columnFacetingFeature,
  columnFilteringFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createExpandedRowModel,
  createFacetedRowModel,
  createFacetedUniqueValues,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  metaHelper,
  rowExpandingFeature,
  rowPaginationFeature,
  rowPinningFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_alphanumericCaseSensitive,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  sortFn_textCaseSensitive,
  tableFeatures,
} from '@tanstack/react-table';
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useRef } from 'react';

import { cn } from '@/lib/utils';

export type CellValue = ReactNode | string | number | boolean | object | null | undefined;

export interface DataGridColumnMeta<TData = object> {
  autoSize?: boolean;
  cellClassName?: string;
  expandedContent?: (row: TData) => ReactNode;
  headerClassName?: string;
  headerTitle?: string;
  skeleton?: ReactNode;
}

export const dataGridFeatures = tableFeatures({
  columnFacetingFeature,
  columnFilteringFeature,
  columnMeta: metaHelper<DataGridColumnMeta<object>>(),
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  expandedRowModel: createExpandedRowModel(),
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  filteredRowModel: createFilteredRowModel(),
  globalFilteringFeature,
  paginatedRowModel: createPaginatedRowModel(),
  rowExpandingFeature,
  rowPaginationFeature,
  rowPinningFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    alphanumericCaseSensitive: sortFn_alphanumericCaseSensitive,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
    textCaseSensitive: sortFn_textCaseSensitive,
  },
});

export type DataGridApiFetchParams = {
  filters?: ColumnFiltersState;
  pageIndex: number;
  pageSize: number;
  searchQuery?: string;
  sorting?: SortingState;
};

export type DataGridApiResponse<T> = {
  data: T[];
  empty: boolean;
  pagination: {
    page: number;
    total: number;
  };
};

export type DataGridAutoSizeController = {
  apply: (fillWidth: number) => boolean;
};

export interface DataGridContextProps<TData extends object> {
  autoSize?: DataGridAutoSizeController;
  isLoading: boolean;
  props: DataGridLayoutProps<TData>;
  recordCount: number;
  table: DataGridTableInstance<TData>;
}

export type DataGridFeatures = typeof dataGridFeatures;

export type DataGridLayoutProps<TData extends object> = Omit<
  DataGridProps<TableFeatures, TData>,
  'children' | 'table'
>;

export interface DataGridProps<TFeatures extends TableFeatures, TData extends object> {
  allRowsLoadedMessage?: ReactNode | string;
  children?: ReactNode;
  className?: string;
  emptyMessage?: ReactNode | string;
  fetchingMoreMessage?: ReactNode | string;
  isLoading?: boolean;
  loadingMessage?: ReactNode | string;
  loadingMode?: 'skeleton' | 'spinner';
  onRowClick?: (row: TData) => void;
  recordCount: number;
  table?: Table<TFeatures, TData>;
  tableClassNames?: {
    base?: string;
    body?: string;
    bodyRow?: string;
    edgeCell?: string;
    footer?: string;
    header?: string;
    headerRow?: string;
    headerSticky?: string;
  };
  tableLayout?: {
    cellBorder?: boolean;
    columnsDraggable?: boolean;
    columnsMovable?: boolean;
    columnsPinnable?: boolean;
    columnsResizable?: boolean;
    columnsResizeMode?: 'onChange' | 'onEnd';
    columnsVisibility?: boolean;
    dense?: boolean;
    footerBackground?: boolean;
    headerBackground?: boolean;
    headerBorder?: boolean;
    headerSticky?: boolean;
    rowBorder?: boolean;
    rowRounded?: boolean;
    rowsDraggable?: boolean;
    rowsPinnable?: boolean;
    stripped?: boolean;
    width?: 'auto' | 'fixed';
  };
}

export type DataGridRequestParams = {
  columnFilters?: ColumnFiltersState;
  pageIndex: number;
  pageSize: number;
  sorting?: SortingState;
};

export type DataGridTableInstance<TData extends object> = ReactTable<DataGridFeatures, TData>;

export function getColumnHeaderLabel<TData extends RowData, TValue>(
  column: Column<DataGridFeatures, TData, TValue>
): string {
  const meta = column.columnDef.meta as undefined | { headerTitle?: string };

  if (typeof meta?.headerTitle === 'string') {
    return meta.headerTitle;
  }

  const defHeader = column.columnDef.header;

  if (typeof defHeader === 'string') {
    return defHeader;
  }

  return String(column.id);
}

function createDataGridAutoSizeController<TData extends object>(
  getTable: () => DataGridTableInstance<TData>
): DataGridAutoSizeController {
  let applied: null | { base: number; columnId: string; grown: number } = null;

  return {
    apply(fillWidth: number) {
      const table = getTable();
      const columnSizing = table.state.columnSizing;

      if (applied && columnSizing[applied.columnId] === undefined) {
        applied = null;
      }

      if (fillWidth <= 0) {
        return false;
      }

      const autoSizeColumn = table
        .getVisibleLeafColumns()
        .find((column) => column.columnDef.meta?.autoSize && column.getCanResize());

      if (!autoSizeColumn || applied?.columnId === autoSizeColumn.id) {
        return false;
      }

      const currentSize = columnSizing[autoSizeColumn.id];

      if (currentSize !== undefined && currentSize !== applied?.grown) {
        return false;
      }

      const revert = applied && columnSizing[applied.columnId] === applied.grown ? applied : null;
      const base = columnSizing[autoSizeColumn.id] ?? autoSizeColumn.getSize();
      const grown = base + fillWidth;

      applied = { base, columnId: autoSizeColumn.id, grown };
      table.setColumnSizing((old) => {
        const next = { ...old, [autoSizeColumn.id]: grown };

        if (revert && next[revert.columnId] === revert.grown) {
          next[revert.columnId] = revert.base;
        }

        return next;
      });

      return true;
    },
  };
}

const DataGridContext = createContext<DataGridContextProps<object> | undefined>(undefined);

function DataGrid<TFeatures extends TableFeatures, TData extends object>({
  children,
  table,
  ...props
}: DataGridProps<TFeatures, TData>) {
  const defaultProps: Partial<DataGridProps<TFeatures, TData>> = {
    loadingMode: 'skeleton',
    tableClassNames: {
      base: '',
      body: '',
      bodyRow: '',
      edgeCell: '',
      footer: '',
      header: '',
      headerRow: '',
      headerSticky: 'sticky top-0 z-40 bg-background/90 backdrop-blur-xs',
    },
    tableLayout: {
      cellBorder: false,
      columnsDraggable: false,
      columnsMovable: false,
      columnsPinnable: false,
      columnsResizable: false,
      columnsVisibility: false,
      dense: false,
      footerBackground: false,
      headerBackground: false,
      headerBorder: true,
      headerSticky: false,
      rowBorder: true,
      rowRounded: false,
      rowsDraggable: false,
      rowsPinnable: false,
      stripped: false,
      width: 'fixed',
    },
  };

  const mergedProps: DataGridProps<TFeatures, TData> = {
    ...defaultProps,
    ...props,
    tableClassNames: {
      ...defaultProps.tableClassNames,
      ...(props.tableClassNames || {}),
    },
    tableLayout: {
      ...defaultProps.tableLayout,
      ...(props.tableLayout || {}),
    },
  };

  if (!table) {
    throw new Error('DataGrid requires a "table" prop');
  }

  const internalTable = table as object as DataGridTableInstance<TData>;
  const internalProps = mergedProps as object as DataGridLayoutProps<TData>;

  return (
    <DataGridProvider table={internalTable} {...internalProps}>
      {children}
    </DataGridProvider>
  );
}

function DataGridContainer({
  children,
  className,
}: {
  border?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('w-full overflow-hidden', className)} data-slot="data-grid">
      {children}
    </div>
  );
}

function DataGridProvider<TData extends object>({
  children,
  table,
  ...props
}: DataGridLayoutProps<TData> & {
  children?: ReactNode;
  table: DataGridTableInstance<TData>;
}) {
  const propsRef = useRef(props);
  const tableRef = useRef(table);

  useEffect(() => {
    propsRef.current = props;
    tableRef.current = table;
  });

  const resizeMode =
    props.tableLayout?.columnsResizable && props.tableLayout.columnsResizeMode
      ? props.tableLayout.columnsResizeMode
      : undefined;

  useEffect(() => {
    if (!resizeMode) {
      return;
    }

    if (table.options.columnResizeMode === resizeMode) {
      return;
    }

    table.setOptions((old) => ({ ...old, columnResizeMode: resizeMode }));
  }, [table, resizeMode]);

  // eslint-disable-next-line react-hooks/refs, react-hooks/exhaustive-deps
  const autoSize = useMemo(() => createDataGridAutoSizeController(() => tableRef.current), [table.store]);

  const tableState = table.state;
  const tableLayoutKey = JSON.stringify(props.tableLayout);
  const tableClassNamesKey = JSON.stringify(props.tableClassNames);

  const value = useMemo(
    () => ({
      autoSize,
      isLoading: props.isLoading || false,
      get props() {
        return propsRef.current;
      },
      tableClassNames: props.tableClassNames,
      recordCount: props.recordCount,
      get table() {
        return tableRef.current;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      autoSize,
      props.recordCount,
      props.isLoading,
      props.loadingMode,
      props.className,
      tableLayoutKey,
      tableClassNamesKey,
      tableState.sorting,
      tableState.pagination,
      tableState.columnFilters,
      tableState.rowSelection,
      tableState.rowPinning,
      tableState.expanded,
      tableState.columnVisibility,
      tableState.columnOrder,
      tableState.columnPinning,
      tableState.globalFilter,
    ]
  );

  return (
    <DataGridContext.Provider value={value as object as DataGridContextProps<object>}>
      {children}
    </DataGridContext.Provider>
  );
}

function useDataGrid<TData extends object = object>(): DataGridContextProps<TData> {
  const context = useContext(DataGridContext) as DataGridContextProps<TData> | undefined;

  if (!context) {
    throw new Error('useDataGrid must be used within a DataGridProvider');
  }

  return context;
}

export { DataGrid, DataGridContainer, DataGridProvider, useDataGrid };
