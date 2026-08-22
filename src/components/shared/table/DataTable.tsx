import type { ReactNode } from 'react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';

export type DataTableColumn<T> = {
  cellClassName?: string;
  headerClassName?: string;
  id: string;
  label: ReactNode;
  render: (row: T) => ReactNode;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  emptyMessage: ReactNode;
  getRowKey: (row: T) => string;
  headerClassName?: string;
  headerRowClassName?: string;
  rowClassName?: (row: T) => string | undefined;
  rows: T[];
  visibleColumns: string[];
};

export function DataTable<T>({
  columns,
  emptyMessage,
  getRowKey,
  headerClassName = 'sticky top-0 z-10 bg-card',
  headerRowClassName,
  rowClassName,
  rows,
  visibleColumns,
}: DataTableProps<T>) {
  const visibleColumnDefs = columns.filter((col) => visibleColumns.includes(col.id));

  return (
    <div className="min-h-0 w-full flex-1 overflow-auto [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Table>
        <TableHeader className={headerClassName}>
          <TableRow className={headerRowClassName}>
            {visibleColumnDefs.map((col) => (
              <TableHead
                className={
                  col.headerClassName ?? 'whitespace-nowrap text-sm font-semibold text-muted-foreground'
                }
                key={col.id}
              >
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                className="py-8 text-center text-muted-foreground"
                colSpan={visibleColumnDefs.length}
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow className={rowClassName?.(row)} key={getRowKey(row)}>
                {visibleColumnDefs.map((col) => (
                  <TableCell className={col.cellClassName} key={col.id}>
                    {col.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
