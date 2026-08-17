import { MessageSquare } from 'lucide-react';

import type { Customer } from '../../../types';

import { PaginationBar } from '../../../components/shared/PaginationBar';
import { Badge } from '../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';

interface FeedbackDirectoryBodyProps {
  currentPage: number;
  onNextPage: () => void;
  onPageSizeChange: (size: number) => void;
  onPrevPage: () => void;
  pageSize: number;
  paginatedCustomers: Customer[];
  totalItems: number;
  totalPages: number;
  visibleColumns: string[];
}

export function FeedbackDirectoryBody({
  currentPage,
  onNextPage,
  onPageSizeChange,
  onPrevPage,
  pageSize,
  paginatedCustomers,
  totalItems,
  totalPages,
  visibleColumns,
}: FeedbackDirectoryBodyProps) {
  return (
    <>
      {/* Table */}
      <div className="relative min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
              {visibleColumns.includes('id') && (
                <TableHead className="w-28 text-sm font-medium text-muted-foreground">Patient ID</TableHead>
              )}
              {visibleColumns.includes('name') && (
                <TableHead className="w-44 text-sm font-medium text-muted-foreground">Name</TableHead>
              )}
              {visibleColumns.includes('storeName') && (
                <TableHead className="w-36 text-sm font-medium text-muted-foreground">Store Code</TableHead>
              )}
              {visibleColumns.includes('storeContactEmail') && (
                <TableHead className="w-90 text-sm font-medium text-muted-foreground">Store Email</TableHead>
              )}
              {visibleColumns.includes('patientFeedback') && (
                <TableHead className="text-sm font-medium text-muted-foreground">Patient Feedback</TableHead>
              )}
              {visibleColumns.includes('lastUpdated') && (
                <TableHead className="w-32 text-right text-sm font-medium text-muted-foreground">
                  Date
                </TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedCustomers.length === 0 ? (
              <TableRow>
                <TableCell className="h-48 text-center" colSpan={visibleColumns.length}>
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-medium">No patient feedback submitted yet.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedCustomers.map((cust) => (
                <TableRow
                  key={cust.id}
                  className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/40"
                >
                  {visibleColumns.includes('id') && (
                    <TableCell className="font-mono text-xs font-normal text-slate-600 dark:text-slate-400">
                      {cust.id}
                    </TableCell>
                  )}

                  {visibleColumns.includes('name') && (
                    <TableCell>
                      <div className="font-normal text-foreground">{cust.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {cust.age} yrs • {cust.gender}
                      </div>
                    </TableCell>
                  )}

                  {visibleColumns.includes('storeName') && (
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {cust.storeName}
                      </Badge>
                    </TableCell>
                  )}

                  {visibleColumns.includes('storeContactEmail') && (
                    <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">
                      {cust.storeContactEmail || '—'}
                    </TableCell>
                  )}

                  {visibleColumns.includes('patientFeedback') && (
                    <TableCell>
                      <div className="flex items-start gap-2 p-2.5 text-xs text-slate-800 dark:text-slate-200">
                        <span className="leading-relaxed">{cust.patientFeedback}</span>
                      </div>
                    </TableCell>
                  )}

                  {visibleColumns.includes('lastUpdated') && (
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {cust.lastUpdatedOn
                        ? new Date(cust.lastUpdatedOn).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
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
