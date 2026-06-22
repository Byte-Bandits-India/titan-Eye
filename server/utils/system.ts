import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

/** Shell metacharacters that should never appear in an executable path */
const DANGEROUS_CHARS = /[;|&$`!><\n\r]/;

function validatePath(execPath: string, label: string): string {
  if (DANGEROUS_CHARS.test(execPath)) {
    throw new Error(`Unsafe characters detected in ${label} path: ${execPath}`);
  }
  return execPath;
}

export function getScreenSize(callback: (width: number, height: number) => void): void {
  if (process.platform === 'darwin') {
    exec('osascript -e "tell application \\"Finder\\" to get bounds of window of desktop"', (err, out) => {
      if (err) return callback(1920, 1080);
      const parts = out.trim().split(',').map(Number);
      if (parts.length >= 4) {
        const w = parts[2];
        const h = parts[3];
        return callback(w, h);
      }
      callback(1920, 1080);
    });
  } else if (process.platform === 'win32') {
    const command = `powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width; [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height"`;
    exec(command, (err, out) => {
      if (err) return callback(1920, 1080);
      const parts = out.trim().split(/\r?\n/).map(Number);
      if (parts.length >= 2) {
        return callback(parts[0], parts[1]);
      }
      callback(1920, 1080);
    });
  } else {
    exec('DISPLAY=:0 xdotool getdisplaygeometry', (err, out) => {
      if (err) return callback(1920, 1080);
      const [w, h] = out.trim().split(' ').map(Number);
      callback(w, h);
    });
  }
}

export function getChromePath(): string {
  if (process.platform === 'win32') {
    const paths = [
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) return validatePath(p, 'Chrome');
    }
    return 'chrome.exe';
  } else if (process.platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  } else {
    return 'google-chrome';
  }
}

export function getTeamViewerPath(): string {
  if (process.platform === 'win32') {
    const paths = [
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'TeamViewer\\TeamViewer.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'TeamViewer\\TeamViewer.exe')
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) return validatePath(p, 'TeamViewer');
    }
    return 'TeamViewer.exe';
  } else if (process.platform === 'darwin') {
    return 'TeamViewer';
  } else {
    return 'teamviewer';
  }
}

