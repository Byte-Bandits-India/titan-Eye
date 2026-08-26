import { Skeleton } from '../ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

type TableSkeletonProps = {
  columnWidths: string[];
  rowCount?: number;
};

export function TableSkeleton({ columnWidths, rowCount = 8 }: TableSkeletonProps) {
  return (
    <div className="min-h-0 w-full flex-1 overflow-hidden">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            {columnWidths.map((width, colIndex) => (
              <TableHead key={colIndex}>
                <Skeleton className="h-3.5" style={{ width }} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rowCount }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {columnWidths.map((width, colIndex) => (
                <TableCell key={colIndex}>
                  <Skeleton className="h-4" style={{ width }} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
