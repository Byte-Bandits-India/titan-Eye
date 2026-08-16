import { exec, spawn } from 'child_process';
import { NextFunction, Response, Router } from 'express';

import { get, run, UserRow } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { findUserByEmail, getUserPhoto, getUserPresence } from '../services/microsoft/graph.js';
import { logger } from '../utils/logger.js';
import { getChromePath, getScreenSize, getTeamViewerPath } from '../utils/system.js';

const router = Router();

async function resolveEntraUserId(email: string): Promise<null | string> {
  const dbUser = await get<UserRow>('SELECT azureObjectId FROM users WHERE email = ?', [email]);

  if (dbUser?.azureObjectId) {
    return dbUser.azureObjectId;
  }

  const match = await findUserByEmail(email);

  if (!match) {
    return null;
  }

  await run('UPDATE users SET azureObjectId = ?, microsoftUpn = ? WHERE email = ?', [
    match.id,
    match.userPrincipalName,
    email,
  ]);

  return match.id;
}

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

function requireLoopback(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const remoteAddress = req.socket.remoteAddress || '';

  if (!LOOPBACK_ADDRESSES.has(remoteAddress)) {
    return res.status(403).json({ error: 'This endpoint is only available to the local agent' });
  }

  next();
}

router.post('/open-teams', requireLoopback, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'optometrist') {
    return res.status(403).json({ error: 'Only optometrist accounts can launch remote tools' });
  }

  getScreenSize((sw, sh) => {
    const half = Math.floor(sw / 2);
    const chromePath = getChromePath();

    const proc = spawn(
      chromePath,
      [
        '--profile-directory=Profile 54',
        '--app=https://teams.microsoft.com/',
        '--window-position=0,0',
        `--window-size=${half},${sh}`,
      ],
      { detached: true, stdio: 'ignore' }
    );

    proc.on('error', (err) => {
      logger.error('Failed to launch Teams Chrome app', {
        errorMessage: err.message,
        requestId: req.requestId,
      });
    });
    proc.unref();
  });

  return res.json({ ok: true });
});

router.post('/open-teamviewer', requireLoopback, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'optometrist') {
    return res.status(403).json({ error: 'Only optometrist accounts can launch remote tools' });
  }

  getScreenSize((sw, sh) => {
    const half = Math.floor(sw / 2);
    const x = half;

    if (process.platform === 'darwin') {
      const proc = spawn('open', ['-a', 'TeamViewer'], { detached: true, stdio: 'ignore' });
      proc.on('error', (err) => {
        logger.error('Failed to execute open command for TeamViewer', {
          errorMessage: err.message,
          requestId: req.requestId,
        });
      });
      proc.unref();

      setTimeout(() => {
        const appleScript = `
          tell application "System Events"
            tell process "TeamViewer"
              if exists window 1 then
                set position of window 1 to {${x}, 22}
                set size of window 1 to {${half}, ${sh - 22}}
              end if
            end tell
          end tell
        `;
        exec(`osascript -e '${appleScript}'`, (errScript) => {
          if (errScript) {
            logger.error('AppleScript TeamViewer window position failed', {
              errorMessage: errScript.message,
              requestId: req.requestId,
            });
          }
        });
      }, 2000);
    } else if (process.platform === 'win32') {
      const tvPath = getTeamViewerPath();
      const proc = spawn(tvPath, [], { detached: true, stdio: 'ignore' });
      proc.on('error', (err) => {
        logger.error('Failed to spawn TeamViewer on Windows', {
          errorMessage: err.message,
          requestId: req.requestId,
        });
      });
      proc.unref();

      setTimeout(() => {
        const psScript = `
          $definition = '[DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);';
          $type = Add-Type -MemberDefinition $definition -Name "Win32MoveWindow" -Namespace "Win32" -PassThru;
          $process = Get-Process -Name "TeamViewer" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1;
          if ($process) {
              $type::MoveWindow($process.MainWindowHandle, ${x}, 0, ${half}, ${sh}, $true);
          }
        `;
        exec(`powershell -command "${psScript.replace(/\n/g, ' ')}"`, (errScript) => {
          if (errScript) {
            logger.error('PowerShell TeamViewer window position failed', {
              errorMessage: errScript.message,
              requestId: req.requestId,
            });
          }
        });
      }, 2000);
    } else {
      const proc = spawn('teamviewer', [], { detached: true, stdio: 'ignore' });
      proc.on('error', (err) => {
        logger.error('Failed to spawn teamviewer binary', {
          errorMessage: err.message,
          requestId: req.requestId,
        });
      });
      proc.unref();

      const pid = proc.pid;

      if (pid) {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          exec(`DISPLAY=:0 xdotool search --pid ${pid} 2>/dev/null | head -1`, (errSearch, wid) => {
            const trimmedWid = wid?.trim();

            if (trimmedWid) {
              clearInterval(interval);
              exec(
                `DISPLAY=:0 xdotool windowstate --remove MAXIMIZED_VERT --remove MAXIMIZED_HORZ ${trimmedWid}`,
                () => {
                  setTimeout(() => {
                    exec(`DISPLAY=:0 xdotool windowmove --sync ${trimmedWid} ${x} 0`);
                    exec(`DISPLAY=:0 xdotool windowsize --sync ${trimmedWid} ${half} ${sh}`);
                  }, 500);
                }
              );
            }

            if (attempts > 20) {
              clearInterval(interval);
            }
          });
        }, 500);
      }
    }
  });

  return res.json({ ok: true });
});

router.get('/me/presence', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const entraId = await resolveEntraUserId(req.user.email);

    if (!entraId) {
      return res
        .status(404)
        .json({ message: 'No matching Microsoft account found for this email', success: false });
    }

    const presence = await getUserPresence(entraId);

    return res.json({ data: presence, success: true });
  } catch (err) {
    const error = err as Error;
    logger.error('Graph presence error', { errorMessage: error.message, requestId: req.requestId });

    return res
      .status(500)
      .json({ message: error.message || 'Failed to get Microsoft presence', success: false });
  }
});

router.get('/me/photo', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const entraId = await resolveEntraUserId(req.user.email);

    if (!entraId) {
      // No linked Microsoft account is a normal, expected state here too.
      return res.status(204).end();
    }

    const photo = await getUserPhoto(entraId);

    if (!photo) {
      // Not having set a profile photo is a normal, expected state (not an
      // error) — 204 keeps the client's fetch from surfacing as a failed
      // request in the browser console.
      return res.status(204).end();
    }

    res.setHeader('Content-Type', photo.contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    return res.send(photo.buffer);
  } catch (err) {
    const error = err as Error;
    logger.error('Graph photo error', { errorMessage: error.message, requestId: req.requestId });

    return res
      .status(500)
      .json({ message: error.message || 'Failed to get Microsoft photo', success: false });
  }
});

// Fetch another registered app user's photo (e.g. an optometrist's avatar shown to
// store staff). Scoped to emails that already exist in our own users table —
// never accepts an arbitrary Entra ID, so it can't be used to probe the tenant.
router.get('/users/:email/photo', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const email = String(req.params.email);
    const targetUser = await get<UserRow>('SELECT email FROM users WHERE email = ?', [email]);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found', success: false });
    }

    const entraId = await resolveEntraUserId(targetUser.email);

    if (!entraId) {
      // No linked Microsoft account is a normal, expected state here too.
      return res.status(204).end();
    }

    const photo = await getUserPhoto(entraId);

    if (!photo) {
      // Not having set a profile photo is a normal, expected state (not an
      // error) — 204 keeps the client's fetch from surfacing as a failed
      // request in the browser console.
      return res.status(204).end();
    }

    res.setHeader('Content-Type', photo.contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    return res.send(photo.buffer);
  } catch (err) {
    const error = err as Error;
    logger.error('Graph photo error', { errorMessage: error.message, requestId: req.requestId });

    return res
      .status(500)
      .json({ message: error.message || 'Failed to get Microsoft photo', success: false });
  }
});

export default router;
