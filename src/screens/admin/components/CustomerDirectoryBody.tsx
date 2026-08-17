import { Download } from 'lucide-react';

import type { Customer, CustomerStatusTab, CustomerTabCounts } from '../../../types';

import { PaginationBar } from '../../../components/shared/PaginationBar';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '../../../components/ui/tabs';
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
      <Tabs
        className="px-4 pb-3 pt-3"
        onValueChange={(v) => onStatusTabChange(v as CustomerStatusTab)}
        value={customerStatusTab}
      >
        <TabsList variant="line">
          <TabsTrigger
            className="flex-none gap-2 text-muted-foreground underline-offset-4 data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:underline"
            value="Pending"
          >
            Queue
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {tabCounts.pending}
            </span>
          </TabsTrigger>
          <TabsTrigger
            className="flex-none gap-2 text-muted-foreground underline-offset-4 data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:underline"
            value="InProgress"
          >
            Testing
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {tabCounts.inProgress}
            </span>
          </TabsTrigger>
          <TabsTrigger
            className="flex-none gap-2 text-muted-foreground underline-offset-4 data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:underline"
            value="all"
          >
            All
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {tabCounts.all}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="min-h-0 w-full flex-1 overflow-auto [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              {visibleColumns.includes('id') && (
                <TableHead className="w-[80px] whitespace-nowrap text-sm font-medium text-muted-foreground">
                  ID
                </TableHead>
              )}
              {visibleColumns.includes('name') && (
                <TableHead className="whitespace-nowrap text-sm font-medium text-muted-foreground">
                  Name
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
              {visibleColumns.includes('ageGender') && (
                <TableHead className="whitespace-nowrap text-sm font-medium text-muted-foreground">
                  Age / Gender
                </TableHead>
              )}
              {visibleColumns.includes('mobile') && (
                <TableHead className="whitespace-nowrap text-sm font-medium text-muted-foreground">
                  Mobile
                </TableHead>
              )}
              {visibleColumns.includes('status') && (
                <TableHead className="whitespace-nowrap text-sm font-medium text-muted-foreground">
                  Status
                </TableHead>
              )}
              {visibleColumns.includes('lastUpdated') && (
                <TableHead className="whitespace-nowrap text-sm font-medium text-muted-foreground">
                  Last Updated
                </TableHead>
              )}
              {visibleColumns.includes('report') && (
                <TableHead className="whitespace-nowrap text-center text-sm font-medium text-muted-foreground">
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
                    <TableCell className="whitespace-nowrap py-3 text-xs font-normal text-blue-600 dark:text-blue-400">
                      {cust.id}
                    </TableCell>
                  )}
                  {visibleColumns.includes('name') && (
                    <TableCell className="whitespace-nowrap py-3 text-xs font-normal text-foreground">
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
                        className="h-7 cursor-pointer gap-1 rounded-[50px] border-blue-200 bg-blue-50 px-2.5 text-[11px] font-medium text-blue-700 transition-all hover:bg-blue-100 active:scale-95 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50"
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
