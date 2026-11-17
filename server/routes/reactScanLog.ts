import { Request, Response, Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();
const LOCAL_DATA_DIR = path.resolve(process.cwd(), 'localData');
const AUDIT_LOG_PATH = path.join(LOCAL_DATA_DIR, 'react-scan-audit.log');
const REPORT_JSON_PATH = path.join(LOCAL_DATA_DIR, 'react-scan-report.json');
const MAX_LOG_SIZE_BYTES = 5 * 1024 * 1024; // 5MB cap to prevent unbounded growth
const FORBIDDEN_PROPERTIES = new Set(['__proto__', 'constructor', 'prototype']);

router.use((_req: Request, res: Response, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not Found' });
  }
  next();
});

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
    const rawItems = Array.isArray(req.body) ? req.body.slice(0, 50) : [req.body || {}];
    ensureLocalDataDir();

    // Prototype-pollution safe dictionary
    const reportData: Record<string, ComponentReportStats> = Object.create(null);
    if (fs.existsSync(REPORT_JSON_PATH)) {
      try {
        const raw = fs.readFileSync(REPORT_JSON_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        for (const [k, v] of Object.entries(parsed)) {
          if (!FORBIDDEN_PROPERTIES.has(k)) {
            reportData[k] = v as ComponentReportStats;
          }
        }
      } catch {
        // Fall back to clean map
      }
    }

    let logLines = '';
    for (const item of rawItems) {
      const rawComponent = item?.component;
      if (typeof rawComponent !== 'string' || FORBIDDEN_PROPERTIES.has(rawComponent.trim().toLowerCase())) {
        continue; // Strictly reject prototype-polluting property names
      }

      // Neutralize newline injection and control characters
      const component = rawComponent.replace(/[\r\n\x00-\x1f]/g, '').trim().slice(0, 100) || 'Unknown';
      const count = Math.max(1, Math.min(10000, Number(item?.count) || 1));
      const time = Math.max(0, Math.min(60000, Number(item?.time) || 0));
      const logTime = new Date().toISOString();

      const issueType = item?.unnecessary
        ? 'UNNECESSARY'
        : time > 5
          ? 'SLOW'
          : 'REPEATED';

      logLines += `[${logTime}] [${issueType}_RENDER_ISSUE] Component: ${component} | Renders: ${count} | Self-Time: ${time.toFixed(2)}ms\n`;

      const currentStats = reportData[component] || {
        componentName: component,
        issueType,
        totalRenders: 0,
        totalSelfTimeMs: 0,
        maxSelfTimeMs: 0,
        lastUpdated: logTime,
      };

      currentStats.issueType = issueType;
      currentStats.totalRenders += count;
      currentStats.totalSelfTimeMs += time;
      currentStats.maxSelfTimeMs = Math.max(currentStats.maxSelfTimeMs, time);
      currentStats.lastUpdated = logTime;

      reportData[component] = currentStats;
    }

    if (logLines) {
      // Rotate / truncate if log file exceeds 5MB
      if (fs.existsSync(AUDIT_LOG_PATH)) {
        try {
          const stats = fs.statSync(AUDIT_LOG_PATH);
          if (stats.size >= MAX_LOG_SIZE_BYTES) {
            fs.writeFileSync(AUDIT_LOG_PATH, `[${new Date().toISOString()}] --- Log Rotated (Exceeded 5MB) ---\n`, 'utf8');
          }
        } catch {}
      }

      fs.appendFileSync(AUDIT_LOG_PATH, logLines, 'utf8');
    }

    fs.writeFileSync(REPORT_JSON_PATH, JSON.stringify(reportData, null, 2), 'utf8');

    return res.status(200).json({ count: rawItems.length, status: 'logged' });
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
