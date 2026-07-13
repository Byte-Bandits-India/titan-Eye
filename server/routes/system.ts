import { Router, Response, NextFunction } from 'express';
import { spawn, exec } from 'child_process';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getScreenSize, getChromePath, getTeamViewerPath } from '../utils/system.js';

const router = Router();

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

function requireLoopback(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const remoteAddress = req.socket.remoteAddress || '';
  if (!LOOPBACK_ADDRESSES.has(remoteAddress)) {
    return res.status(403).json({ error: 'This endpoint is only available to the local agent' });
  }
  next();
}

router.post('/open-teams', requireLoopback, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'optum') {
    return res.status(403).json({ error: 'Only optum accounts can launch remote tools' });
  }
  getScreenSize((sw, sh) => {
    const half = Math.floor(sw / 2);
    const chromePath = getChromePath();

    const proc = spawn(chromePath, [
      '--profile-directory=Profile 54',
      '--app=https://teams.microsoft.com/',
      '--window-position=0,0',
      `--window-size=${half},${sh}`,
    ], { detached: true, stdio: 'ignore' });

    proc.on('error', (err) => {
      console.error('Failed to launch Teams Chrome app:', err.message);
    });
    proc.unref();
  });
  return res.json({ ok: true });
});

router.post('/open-teamviewer', requireLoopback, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'optum') {
    return res.status(403).json({ error: 'Only optum accounts can launch remote tools' });
  }
  getScreenSize((sw, sh) => {
    const half = Math.floor(sw / 2);
    const x = half;

    if (process.platform === 'darwin') {
      const proc = spawn('open', ['-a', 'TeamViewer'], { detached: true, stdio: 'ignore' });
      proc.on('error', (err) => {
        console.error('Failed to execute open command for TeamViewer:', err.message);
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
          if (errScript) console.error('AppleScript TeamViewer window position failed:', errScript.message);
        });
      }, 2000);

    } else if (process.platform === 'win32') {
      const tvPath = getTeamViewerPath();
      const proc = spawn(tvPath, [], { detached: true, stdio: 'ignore' });
      proc.on('error', (err) => {
        console.error('Failed to spawn TeamViewer on Windows:', err.message);
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
          if (errScript) console.error('PowerShell TeamViewer window position failed:', errScript.message);
        });
      }, 2000);

    } else {
      const proc = spawn('teamviewer', [], { detached: true, stdio: 'ignore' });
      proc.on('error', (err) => {
        console.error('Failed to spawn teamviewer binary:', err.message);
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
              exec(`DISPLAY=:0 xdotool windowstate --remove MAXIMIZED_VERT --remove MAXIMIZED_HORZ ${trimmedWid}`, () => {
                setTimeout(() => {
                  exec(`DISPLAY=:0 xdotool windowmove --sync ${trimmedWid} ${x} 0`);
                  exec(`DISPLAY=:0 xdotool windowsize --sync ${trimmedWid} ${half} ${sh}`);
                }, 500);
              });
            }
            if (attempts > 20) clearInterval(interval);
          });
        }, 500);
      }
    }
  });
  return res.json({ ok: true });
});

export default router;
