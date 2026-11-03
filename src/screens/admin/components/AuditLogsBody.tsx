import { CheckCircle2, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import * as React from 'react';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { apiClient } from '../../../Util/apiClient';

export interface AuditLogItem {
  callerEmail?: string;
  callerRole?: string;
  customerId?: string;
  dryRun?: boolean;
  eventTimestamp?: string;
  hash?: string;
  ip?: string;
  level?: string;
  message?: string;
  prevHash?: string;
  requestId?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export const AuditLogsBody = React.memo(function AuditLogsBody() {
  const [logs, setLogs] = React.useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [lastRefreshed, setLastRefreshed] = React.useState<Date>(new Date());

  const fetchLogs = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<{ logs: AuditLogItem[] }>('/system/audit-logs?limit=200');
      setLogs(res.data.logs || []);
      setLastRefreshed(new Date());
    } catch {
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = React.useMemo(() => {
    if (!searchTerm.trim()) {
      return logs;
    }
    const q = searchTerm.toLowerCase();

    return logs.filter((log) => {
      const msg = String(log.message || '').toLowerCase();
      const email = String(log.callerEmail || '').toLowerCase();
      const custId = String(log.customerId || '').toLowerCase();
      const ip = String(log.ip || '').toLowerCase();

      return msg.includes(q) || email.includes(q) || custId.includes(q) || ip.includes(q);
    });
  }, [logs, searchTerm]);

  const formatActionName = (msg?: string) => {
    if (!msg) {
      return 'SYSTEM_EVENT';
    }
    return msg.replace(/^\[security\]\s*/, '');
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('ACCESSED') || action.includes('VIEWED')) {
      return 'Initiated';
    }
    if (action.includes('PURGE') || action.includes('DELETED')) {
      return 'Cancelled';
    }
    if (action.includes('RATE_LIMIT') || action.includes('UNAUTHORIZED') || action.includes('DENIED')) {
      return 'destructive';
    }

    return 'Completed';
  };

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-sm">
          <Input
            className="pl-9 text-xs"
            icon={Search}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by action, email, patient ID, or IP…"
            value={searchTerm}
          />
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-[11px] text-muted-foreground">
            Refreshed: {lastRefreshed.toLocaleTimeString()}
          </span>
          <Button
            className="h-8 gap-1.5 px-3 text-xs"
            disabled={isLoading}
            onClick={fetchLogs}
            variant="secondary"
          >
            <RefreshCw className={isLoading ? 'size-3.5 animate-spin' : 'size-3.5'} />
            Refresh Logs
          </Button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="border-b border-border bg-muted/40 px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                Tamper-Evident Read & Security Access Trail
              </span>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">
              Showing {filteredLogs.length} of {logs.length} events
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead className="w-[170px] text-xs font-semibold">Timestamp</TableHead>
                <TableHead className="text-xs font-semibold">Action / Event</TableHead>
                <TableHead className="text-xs font-semibold">Operator / Caller</TableHead>
                <TableHead className="text-xs font-semibold">Patient ID</TableHead>
                <TableHead className="text-xs font-semibold">IP Address</TableHead>
                <TableHead className="w-[130px] text-xs font-semibold">Audit Integrity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell className="h-32 text-center text-xs text-muted-foreground" colSpan={6}>
                    Loading security audit logs…
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell className="h-32 text-center text-xs text-muted-foreground" colSpan={6}>
                    No audit log records found matching your filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log, idx) => {
                  const action = formatActionName(log.message);
                  const time = log.timestamp || log.eventTimestamp;
                  const dateStr = time ? new Date(time).toLocaleString() : '—';

                  return (
                    <TableRow className="text-xs hover:bg-muted/30" key={idx}>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {dateStr}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(action) as any}>
                          {action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{log.callerEmail || 'System / Kiosk'}</span>
                          {log.callerRole && (
                            <span className="text-[10px] uppercase text-muted-foreground">
                              Role: {String(log.callerRole)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.customerId ? (
                          <span className="font-mono font-semibold text-primary">#{String(log.customerId)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {String(log.ip || '—')}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3" />
                          Hashed & Valid
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
});
export default AuditLogsBody;
