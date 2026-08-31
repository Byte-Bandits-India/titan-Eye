import { Request, Response, Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();
const LOCAL_DATA_DIR = path.resolve(process.cwd(), 'localData');
const AUDIT_LOG_PATH = path.join(LOCAL_DATA_DIR, 'react-scan-audit.log');
const REPORT_JSON_PATH = path.join(LOCAL_DATA_DIR, 'react-scan-report.json');

function ensureLocalDataDir() {
  if (!fs.existsSync(LOCAL_DATA_DIR)) {
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  }
}

interface ComponentReportStats {
  componentName: string;
  issueType: 'UNNECESSARY' | 'SLOW' | 'REPEATED';
  totalRenders: number;
  totalSelfTimeMs: number;
  maxSelfTimeMs: number;
  lastUpdated: string;
}

router.post('/log', (req: Request, res: Response) => {
  try {
    const rawItems = Array.isArray(req.body) ? req.body : [req.body || {}];
    ensureLocalDataDir();

    let reportData: Record<string, ComponentReportStats> = {};
    if (fs.existsSync(REPORT_JSON_PATH)) {
      try {
        const raw = fs.readFileSync(REPORT_JSON_PATH, 'utf8');
        reportData = JSON.parse(raw);
      } catch {
        reportData = {};
      }
    }

    let logLines = '';
    for (const item of rawItems) {
      const { component = 'Unknown', count = 1, time = 0, timestamp, unnecessary, changes } = item;
      const logTime = timestamp || new Date().toISOString();

      const issueType = unnecessary
        ? 'UNNECESSARY'
        : Number(time) > 5
          ? 'SLOW'
          : 'REPEATED';

      const formattedChanges = changes && Array.isArray(changes) && changes.length > 0
        ? ` | Changes: ${JSON.stringify(changes)}`
        : '';

      logLines += `[${logTime}] [${issueType}_RENDER_ISSUE] Component: ${component} | Renders: ${count} | Self-Time: ${Number(time).toFixed(2)}ms${formattedChanges}\n`;

      const currentStats = reportData[component] || {
        componentName: component,
        issueType,
        totalRenders: 0,
        totalSelfTimeMs: 0,
        maxSelfTimeMs: 0,
        lastUpdated: logTime,
      };

      currentStats.issueType = issueType;
      currentStats.totalRenders += Number(count) || 1;
      currentStats.totalSelfTimeMs += Number(time) || 0;
      currentStats.maxSelfTimeMs = Math.max(currentStats.maxSelfTimeMs, Number(time) || 0);
      currentStats.lastUpdated = logTime;

      reportData[component] = currentStats;
    }

    if (logLines) {
      fs.appendFileSync(AUDIT_LOG_PATH, logLines, 'utf8');
    }
    fs.writeFileSync(REPORT_JSON_PATH, JSON.stringify(reportData, null, 2), 'utf8');

    return res.status(200).json({ status: 'logged', count: rawItems.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
});

router.get('/logs', (_req: Request, res: Response) => {
  try {
    ensureLocalDataDir();
    if (!fs.existsSync(AUDIT_LOG_PATH)) {
      return res.status(200).send('No rendering issues recorded.');
    }
    const content = fs.readFileSync(AUDIT_LOG_PATH, 'utf8');
    return res.status(200).type('text/plain').send(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
});

router.get('/report', (_req: Request, res: Response) => {
  try {
    ensureLocalDataDir();
    if (!fs.existsSync(REPORT_JSON_PATH)) {
      return res.status(200).json({});
    }
    const raw = fs.readFileSync(REPORT_JSON_PATH, 'utf8');
    return res.status(200).type('application/json').send(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
});

export default router;
