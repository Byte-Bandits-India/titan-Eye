import { Download } from 'lucide-react';

import type { Customer, CustomerStatusTab, CustomerTabCounts } from '../../../types';

import { PaginationBar } from '../../../components/shared/PaginationBar';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { cn } from '../../../lib/utils';
import { exportSingleCustomerReport } from '../../../utils/excelExport';
import { renderCallDuration, renderTimeStarted } from './cells';

interface CustomerDirectoryBodyProps {
  currentPage: number;
  customerStatusTab: CustomerStatusTab;
  onNextPage: () => void;
  onPageSizeChange: (size: number) => void;
  onPrevPage: () => void;
  onStatusTabChange: (tab: CustomerStatusTab) => void;
  pageSize: number;
  paginatedCustomers: Customer[];
  tabCounts: CustomerTabCounts;
  totalItems: number;
  totalPages: number;
  visibleColumns: string[];
}

export function CustomerDirectoryBody({
  currentPage,
  customerStatusTab,
  onNextPage,
  onPageSizeChange,
  onPrevPage,
  onStatusTabChange,
  pageSize,
  paginatedCustomers,
  tabCounts,
  totalItems,
  totalPages,
  visibleColumns,
}: CustomerDirectoryBodyProps) {
  return (
    <>
      {/* Status Filter Tabs */}
      <div className="bg-muted/40 flex items-center gap-1.5 overflow-x-auto border-b border-border px-4 py-2 [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          className={cn(
            'flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-xs font-bold transition-all',
            customerStatusTab === 'all'
              ? 'border border-border bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => onStatusTabChange('all')}
          type="button"
        >
          <span>All</span>
          <span className="py-0.2 rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
            {tabCounts.all}
          </span>
        </button>
        <button
          className={cn(
            'flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-xs font-bold transition-all',
            customerStatusTab === 'Pending'
              ? 'border border-slate-300 bg-slate-100 text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => onStatusTabChange('Pending')}
          type="button"
        >
          <span>Pending</span>
          <span className="py-0.2 rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
            {tabCounts.pending}
          </span>
        </button>
        <button
          className={cn(
            'flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-xs font-bold transition-all',
            customerStatusTab === 'InProgress'
              ? 'border border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => onStatusTabChange('InProgress')}
          type="button"
        >
          <span>In Progress</span>
          <span className="py-0.2 rounded-full bg-indigo-100 px-1.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
            {tabCounts.inProgress}
          </span>
        </button>
        <button
          className={cn(
            'flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-xs font-bold transition-all',
            customerStatusTab === 'Completed'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => onStatusTabChange('Completed')}
          type="button"
        >
          <span>Completed</span>
          <span className="py-0.2 rounded-full bg-emerald-100 px-1.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
            {tabCounts.completed}
          </span>
        </button>
      </div>

      <div className="w-full flex-1 overflow-x-auto [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.includes('id') && (
                <TableHead className="w-[80px] whitespace-nowrap text-xs font-bold uppercase text-muted-foreground">
                  ID
                </TableHead>
              )}
              {visibleColumns.includes('name') && (
                <TableHead className="whitespace-nowrap text-xs font-bold uppercase text-muted-foreground">
                  Patient Name
                </TableHead>
              )}
              {visibleColumns.includes('storeName') && (
                <TableHead className="whitespace-nowrap text-xs font-bold uppercase text-muted-foreground">
                  Store Name
                </TableHead>
              )}
              {visibleColumns.includes('timeStarted') && (
                <TableHead className="whitespace-nowrap text-xs font-bold uppercase text-muted-foreground">
                  Time Started
                </TableHead>
              )}
              {visibleColumns.includes('callDuration') && (
                <TableHead className="whitespace-nowrap text-xs font-bold uppercase text-muted-foreground">
                  Call Duration
                </TableHead>
              )}
              {visibleColumns.includes('ageGender') && (
                <TableHead className="whitespace-nowrap text-xs font-bold uppercase text-muted-foreground">
                  Age / Gender
                </TableHead>
              )}
              {visibleColumns.includes('mobile') && (
                <TableHead className="whitespace-nowrap text-xs font-bold uppercase text-muted-foreground">
                  Mobile
                </TableHead>
              )}
              {visibleColumns.includes('status') && (
                <TableHead className="whitespace-nowrap text-xs font-bold uppercase text-muted-foreground">
                  Status
                </TableHead>
              )}
              {visibleColumns.includes('lastUpdated') && (
                <TableHead className="whitespace-nowrap text-xs font-bold uppercase text-muted-foreground">
                  Last Updated
                </TableHead>
              )}
              {visibleColumns.includes('report') && (
                <TableHead className="whitespace-nowrap text-center text-xs font-bold uppercase text-muted-foreground">
                  Report
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCustomers.length === 0 ? (
              <TableRow>
                <TableCell className="py-8 text-center text-muted-foreground" colSpan={visibleColumns.length}>
                  No customers found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedCustomers.map((cust) => (
                <TableRow key={cust.id}>
                  {visibleColumns.includes('id') && (
                    <TableCell className="whitespace-nowrap py-3 text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {cust.id}
                    </TableCell>
                  )}
                  {visibleColumns.includes('name') && (
                    <TableCell className="whitespace-nowrap py-3 text-xs font-semibold text-foreground">
                      {cust.name}
                    </TableCell>
                  )}
                  {visibleColumns.includes('storeName') && (
                    <TableCell className="whitespace-nowrap py-3 text-xs text-muted-foreground">
                      {cust.storeName || '—'}
                    </TableCell>
                  )}
                  {visibleColumns.includes('timeStarted') && (
                    <TableCell className="whitespace-nowrap py-3 text-xs text-muted-foreground">
                      {renderTimeStarted(cust)}
                    </TableCell>
                  )}
                  {visibleColumns.includes('callDuration') && (
                    <TableCell className="whitespace-nowrap py-3 text-xs text-muted-foreground">
                      {renderCallDuration(cust)}
                    </TableCell>
                  )}
                  {visibleColumns.includes('ageGender') && (
                    <TableCell className="whitespace-nowrap py-3 text-xs text-muted-foreground">
                      {cust.age} / {cust.gender}
                    </TableCell>
                  )}
                  {visibleColumns.includes('mobile') && (
                    <TableCell className="whitespace-nowrap py-3 text-xs text-muted-foreground">
                      {cust.mobile || '—'}
                    </TableCell>
                  )}
                  {visibleColumns.includes('status') && (
                    <TableCell className="whitespace-nowrap py-3">
                      <Badge variant={cust.status}>{cust.status.toUpperCase()}</Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes('lastUpdated') && (
                    <TableCell className="whitespace-nowrap py-3 text-xs text-muted-foreground">
                      {cust.lastUpdatedOn || '—'}
                    </TableCell>
                  )}
                  {visibleColumns.includes('report') && (
                    <TableCell className="whitespace-nowrap py-3 text-center">
                      <Button
                        className="h-7 cursor-pointer gap-1 rounded-[50px] border-blue-200 bg-blue-50 px-2.5 text-[11px] font-bold text-blue-700 transition-all hover:bg-blue-100 active:scale-95 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50"
                        onClick={() => exportSingleCustomerReport(cust)}
                        size="sm"
                        title={`Download ${cust.name} Excel Report`}
                        variant="outline"
                      >
                        <Download size={12} />
                        <span>Export</span>
                      </Button>
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
