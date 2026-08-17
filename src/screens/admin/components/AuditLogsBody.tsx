import type { AuditLog } from '../../../types';

import { PaginationBar } from '../../../components/shared/PaginationBar';
import { Badge } from '../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { cn } from '../../../lib/utils';
import { formatSeconds } from './adminUtils';
import { renderTimeStarted } from './cells';

interface AuditLogsBodyProps {
  currentPage: number;
  isLoadingLogs: boolean;
  onNextPage: () => void;
  onPageSizeChange: (size: number) => void;
  onPrevPage: () => void;
  pageSize: number;
  paginatedAuditLogs: AuditLog[];
  totalItems: number;
  totalPages: number;
  visibleColumns: string[];
}

export function AuditLogsBody({
  currentPage,
  isLoadingLogs,
  onNextPage,
  onPageSizeChange,
  onPrevPage,
  pageSize,
  paginatedAuditLogs,
  totalItems,
  totalPages,
  visibleColumns,
}: AuditLogsBodyProps) {
  return (
    <>
      <div className="min-h-0 w-full flex-1 overflow-auto [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              {visibleColumns.includes('id') && (
                <TableHead className="w-[110px] whitespace-nowrap text-sm font-medium text-muted-foreground">
                  Log ID
                </TableHead>
              )}
              {visibleColumns.includes('timestamp') && (
                <TableHead className="whitespace-nowrap text-sm font-medium text-muted-foreground">
                  Timestamp
                </TableHead>
              )}
              {visibleColumns.includes('customerName') && (
                <TableHead className="whitespace-nowrap text-sm font-medium text-muted-foreground">
                  Name
                </TableHead>
              )}
              {visibleColumns.includes('customerId') && (
                <TableHead className="whitespace-nowrap text-sm font-medium text-muted-foreground">
                  Patient ID
                </TableHead>
              )}
              {visibleColumns.includes('storeName') && (
                <TableHead className="whitespace-nowrap text-sm font-medium text-muted-foreground">
                  Store Code
                </TableHead>
              )}
              {visibleColumns.includes('timeStarted') && (
                <TableHead className="whitespace-nowrap text-sm font-medium text-muted-foreground">
                  Time Started
                </TableHead>
              )}
              {visibleColumns.includes('callDuration') && (
                <TableHead className="whitespace-nowrap text-sm font-medium text-muted-foreground">
                  Call Duration
                </TableHead>
              )}
              {visibleColumns.includes('status') && (
                <TableHead className="whitespace-nowrap text-sm font-medium text-muted-foreground">
                  Status
                </TableHead>
              )}
              {visibleColumns.includes('performedBy') && (
                <TableHead className="whitespace-nowrap text-sm font-medium text-muted-foreground">
                  Performed By
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedAuditLogs.length === 0 ? (
              <TableRow>
                <TableCell className="py-8 text-center text-muted-foreground" colSpan={visibleColumns.length}>
                  {isLoadingLogs ? 'Loading audit logs...' : 'No audit logs found.'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedAuditLogs.map((log) => (
                <TableRow key={log.id}>
                  {visibleColumns.includes('id') && (
                    <TableCell className="whitespace-nowrap py-3 font-mono text-xs font-normal">
                      <span
                        className={cn(
                          'rounded border px-2 py-0.5 font-mono text-[10px] font-normal',
                          log.role === 'admin' || String(log.id).startsWith('ADM')
                            ? 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
                            : log.role === 'optometrist' || String(log.id).startsWith('OPT')
                              ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                        )}
                      >
                        {log.id}
                      </span>
                    </TableCell>
                  )}
                  {visibleColumns.includes('timestamp') && (
                    <TableCell className="whitespace-nowrap py-3 text-xs font-medium text-foreground">
                      {log.lastUpdatedOn || '—'}
                    </TableCell>
                  )}
                  {visibleColumns.includes('customerName') && (
                    <TableCell className="whitespace-nowrap py-3 text-xs font-normal text-foreground">
                      {log.customerName || 'N/A'}
                    </TableCell>
                  )}
                  {visibleColumns.includes('customerId') && (
                    <TableCell className="whitespace-nowrap py-3 text-xs font-normal text-blue-600 dark:text-blue-400">
                      {log.customerId}
                    </TableCell>
                  )}
                  {visibleColumns.includes('storeName') && (
                    <TableCell className="whitespace-nowrap py-3 text-xs text-muted-foreground">
                      {log.storeName || '—'}
                    </TableCell>
                  )}
                  {visibleColumns.includes('timeStarted') && (
                    <TableCell className="whitespace-nowrap py-3 text-xs text-muted-foreground">
                      {renderTimeStarted(log)}
                    </TableCell>
                  )}
                  {visibleColumns.includes('callDuration') && (
                    <TableCell className="whitespace-nowrap py-3 text-xs text-muted-foreground">
                      {formatSeconds(log.callDuration || 0)}
                    </TableCell>
                  )}
                  {visibleColumns.includes('status') && (
                    <TableCell className="whitespace-nowrap py-3">
                      <Badge className="whitespace-nowrap" variant={log.status}>
                        {log.status?.replace('_', ' ') || 'UPDATED'}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes('performedBy') && (
                    <TableCell className="whitespace-nowrap py-3 text-xs font-normal text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-normal text-foreground">
                          {log.callTakenBy || 'System / Store'}
                        </span>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <PaginationBar
        currentPage={currentPage}
        itemsPerPage={pageSize}
        onItemsPerPageChange={onPageSizeChange}
        onNext={onNextPage}
        onPrev={onPrevPage}
        totalItems={totalItems}
        totalPages={totalPages}
      />
    </>
  );
}
