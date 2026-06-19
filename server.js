import express from 'express'
import cors from 'cors'
import { exec, spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

const app = express()

// Chrome Private Network Access: allow public sites to call localhost
// Required since Chrome 94+ — without this, titaneye.duckdns.org → localhost is blocked
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Private-Network', 'true')
  next()
})

// Allow cross-origin requests from any origin (needed for production site → localhost calls)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}))

function getScreenSize(callback) {
  if (process.platform === 'darwin') {
    // macOS: Use AppleScript to find desktop window bounds
    exec('osascript -e "tell application \\"Finder\\" to get bounds of window of desktop"', (err, out) => {
      if (err) return callback(1920, 1080)
      const parts = out.trim().split(',').map(Number)
      if (parts.length >= 4) {
        const w = parts[2]
        const h = parts[3]
        return callback(w, h)
      }
      callback(1920, 1080)
    })
  } else if (process.platform === 'win32') {
    // Windows: Use PowerShell to get primary screen size
    const command = `powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width; [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height"`
    exec(command, (err, out) => {
      if (err) return callback(1920, 1080)
      const parts = out.trim().split(/\r?\n/).map(Number)
      if (parts.length >= 2) {
        return callback(parts[0], parts[1])
      }
      callback(1920, 1080)
    })
  } else {
    // Linux: Use xdotool
    exec('DISPLAY=:0 xdotool getdisplaygeometry', (err, out) => {
      if (err) return callback(1920, 1080)
      const [w, h] = out.trim().split(' ').map(Number)
      callback(w, h)
    })
  }
}

function getChromePath() {
  if (process.platform === 'win32') {
    const paths = [
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
    ]
    for (const p of paths) {
      if (fs.existsSync(p)) return p
    }
    return 'chrome.exe'
  } else if (process.platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  } else {
    return 'google-chrome'
  }
}

function getTeamViewerPath() {
  if (process.platform === 'win32') {
    const paths = [
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'TeamViewer\\TeamViewer.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'TeamViewer\\TeamViewer.exe')
    ]
    for (const p of paths) {
      if (fs.existsSync(p)) return p
    }
    return 'TeamViewer.exe'
  } else if (process.platform === 'darwin') {
    return 'TeamViewer' // opened via 'open -a TeamViewer'
  } else {
    return 'teamviewer' // Linux
  }
}

// Teams: launch native app and position it
app.post('/api/open-teams', (req, res) => {
  let command = ''
  if (process.platform === 'darwin') {
    command = 'open msteams://'
  } else if (process.platform === 'win32') {
    command = 'start msteams://'
  } else {
    command = 'xdg-open msteams://'
  }

  exec(command, (err) => {
    if (err) {
      console.error('Failed to launch native Teams app:', err.message)
    }
  })

  getScreenSize((sw, sh) => {
    const half = Math.floor(sw / 2)
    
    if (process.platform === 'darwin') {
      setTimeout(() => {
        const appleScript = `
          tell application "System Events"
            set procName to ""
            if exists process "Microsoft Teams" then
              set procName to "Microsoft Teams"
            else if exists process "Microsoft Teams (work or school)" then
              set procName to "Microsoft Teams (work or school)"
            else if exists process "Teams" then
              set procName to "Teams"
            end if
            
            if procName is not "" then
              tell process procName
                if exists window 1 then
                  set position of window 1 to {0, 22}
                  set size of window 1 to {${half}, ${sh - 22}}
                end if
              end tell
            end if
          end tell
        `
        exec(`osascript -e '${appleScript}'`, (errScript) => {
          if (errScript) console.error('AppleScript Teams window position failed:', errScript.message)
        })
      }, 3000)
    } else if (process.platform === 'win32') {
      setTimeout(() => {
        const psScript = `
          $definition = '[DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);';
          $type = Add-Type -MemberDefinition $definition -Name "Win32MoveWindow" -Namespace "Win32" -PassThru;
          $process = Get-Process | Where-Object { $_.ProcessName -like "*Teams*" } | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1;
          if ($process) {
              $type::MoveWindow($process.MainWindowHandle, 0, 0, ${half}, ${sh}, $true);
          }
        `
        exec(`powershell -command "${psScript.replace(/\n/g, ' ')}"`, (errScript) => {
          if (errScript) console.error('PowerShell Teams window position failed:', errScript.message)
        })
      }, 3000)
    }
  })

  res.json({ ok: true })
})

// TeamViewer: launch then track window and position
app.post('/api/open-teamviewer', (req, res) => {
  getScreenSize((sw, sh) => {
    const half = Math.floor(sw / 2)
    const x = half

    if (process.platform === 'darwin') {
      // macOS: Launch using open command for TeamViewer only
      const proc = spawn('open', ['-a', 'TeamViewer'], { detached: true, stdio: 'ignore' })
      proc.on('error', (err) => {
        console.error('Failed to execute open command for TeamViewer:', err.message)
      })
      proc.unref()

      // macOS AppleScript to position TeamViewer window 
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
        `
        exec(`osascript -e '${appleScript}'`, (errScript) => {
          if (errScript) console.error('AppleScript TeamViewer window position failed:', errScript.message)
        })
      }, 2000)

    } else if (process.platform === 'win32') {
      // Windows: Launch TeamViewer
      const tvPath = getTeamViewerPath()
      const proc = spawn(tvPath, [], { detached: true, stdio: 'ignore' })
      proc.on('error', (err) => {
        console.error('Failed to spawn TeamViewer on Windows:', err.message)
      })
      proc.unref()

      // Position the window using PowerShell and Win32 MoveWindow API
      setTimeout(() => {
        const psScript = `
          $definition = '[DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);';
          $type = Add-Type -MemberDefinition $definition -Name "Win32MoveWindow" -Namespace "Win32" -PassThru;
          $process = Get-Process -Name "TeamViewer" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1;
          if ($process) {
              $type::MoveWindow($process.MainWindowHandle, ${x}, 0, ${half}, ${sh}, $true);
          }
        `
        exec(`powershell -command "${psScript.replace(/\n/g, ' ')}"`, (errScript) => {
          if (errScript) console.error('PowerShell TeamViewer window position failed:', errScript.message)
        })
      }, 2000)

    } else {
      // Linux: Launch and track via xdotool
      const proc = spawn('teamviewer', [], { detached: true, stdio: 'ignore' })
      proc.on('error', (err) => {
        console.error('Failed to spawn teamviewer binary:', err.message)
      })
      proc.unref()
      
      const pid = proc.pid
      if (pid) {
        let attempts = 0
        const interval = setInterval(() => {
          attempts++
          exec(`DISPLAY=:0 xdotool search --pid ${pid} 2>/dev/null | head -1`, (err, wid) => {
            wid = wid?.trim()
            if (wid) {
              clearInterval(interval)
              exec(`DISPLAY=:0 xdotool windowstate --remove MAXIMIZED_VERT --remove MAXIMIZED_HORZ ${wid}`, () => {
                setTimeout(() => {
                  exec(`DISPLAY=:0 xdotool windowmove --sync ${wid} ${x} 0`)
                  exec(`DISPLAY=:0 xdotool windowsize --sync ${wid} ${half} ${sh}`)
                }, 500)
              })
            }
            if (attempts > 20) clearInterval(interval)
          })
        }, 500)
      }
    }
  })
  res.json({ ok: true })
})

app.listen(3001, () => console.log('API server running on http://localhost:3001'))
