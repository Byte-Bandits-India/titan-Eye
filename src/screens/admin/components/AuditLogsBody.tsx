import * as React from 'react';

import type { AuditLog } from '../../../types';

import { PaginationBar } from '../../../components/shared/PaginationBar';
import { RoleIdBadge } from '../../../components/shared/RoleIdBadge';
import { DataTable, type DataTableColumn } from '../../../components/shared/table/DataTable';
import { Badge } from '../../../components/ui/badge';
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

function resolveLogRole(log: AuditLog): 'admin' | 'optometrist' | 'store' {
  if (log.role === 'admin' || String(log.id).startsWith('ADM')) {
    return 'admin';
  }

  if (log.role === 'optometrist' || String(log.id).startsWith('OPT')) {
    return 'optometrist';
  }

  return 'store';
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
  const columns = React.useMemo<DataTableColumn<AuditLog>[]>(
    () => [
      {
        cellClassName: 'whitespace-nowrap py-3 font-mono text-sm font-medium',
        headerClassName: 'w-[110px] whitespace-nowrap text-sm font-semibold   text-muted-foreground',
        id: 'id',
        label: 'Log ID',
        render: (log) => <RoleIdBadge role={resolveLogRole(log)}>{log.id}</RoleIdBadge>,
      },
      {
        cellClassName: 'whitespace-nowrap py-3 text-sm text-muted-foreground',
        headerClassName: 'whitespace-nowrap text-sm font-semibold   text-muted-foreground',
        id: 'timestamp',
        label: 'Timestamp',
        render: (log) => log.lastUpdatedOn || '—',
      },
      {
        cellClassName: 'whitespace-nowrap py-3 text-sm sm:text-sm font-medium text-foreground',
        headerClassName: 'whitespace-nowrap text-sm font-semibold   text-muted-foreground',
        id: 'customerName',
        label: 'Name',
        render: (log) => log.customerName || 'N/A',
      },
      {
        cellClassName:
          'whitespace-nowrap py-3 font-mono text-sm font-medium text-blue-600 dark:text-blue-400',
        headerClassName: 'whitespace-nowrap text-sm font-semibold   text-muted-foreground',
        id: 'customerId',
        label: 'Patient ID',
        render: (log) => log.customerId,
      },
      {
        cellClassName: 'whitespace-nowrap py-3 text-sm text-muted-foreground',
        headerClassName: 'whitespace-nowrap text-sm font-semibold   text-muted-foreground',
        id: 'storeName',
        label: 'Store Code',
        render: (log) => log.storeName || '—',
      },
      {
        cellClassName: 'whitespace-nowrap py-3 text-sm text-muted-foreground',
        headerClassName: 'whitespace-nowrap text-sm font-semibold   text-muted-foreground',
        id: 'timeStarted',
        label: 'Time Started',
        render: (log) => renderTimeStarted(log),
      },
      {
        cellClassName: 'whitespace-nowrap py-3 text-sm text-muted-foreground',
        headerClassName: 'whitespace-nowrap text-sm font-semibold   text-muted-foreground',
        id: 'callDuration',
        label: 'Call Duration',
        render: (log) => formatSeconds(log.callDuration || 0),
      },
      {
        cellClassName: 'whitespace-nowrap py-3',
        headerClassName: 'whitespace-nowrap text-sm font-semibold   text-muted-foreground',
        id: 'status',
        label: 'Status',
        render: (log) => (
          <Badge className="whitespace-nowrap" variant={log.status}>
            {log.status?.replace('_', ' ') || 'UPDATED'}
          </Badge>
        ),
      },
      {
        cellClassName: 'whitespace-nowrap py-3 text-sm text-muted-foreground',
        headerClassName: 'whitespace-nowrap text-sm font-semibold   text-muted-foreground',
        id: 'performedBy',
        label: 'Performed By',
        render: (log) => (
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-foreground">
              {log.callTakenBy || 'System / Store'}
            </span>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <>
      <DataTable
        columns={columns}
        emptyMessage={isLoadingLogs ? 'Loading audit logs...' : 'No audit logs found.'}
        getRowKey={(log) => String(log.id)}
        rows={paginatedAuditLogs}
        visibleColumns={visibleColumns}
      />
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
