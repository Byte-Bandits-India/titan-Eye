import express from 'express'
import cors from 'cors'
import { exec, spawn } from 'child_process'

const app = express()
app.use(cors())

function getScreenSize(callback) {
  exec('DISPLAY=:0 xdotool getdisplaygeometry', (err, out) => {
    if (err) return callback(1920, 1080)
    const [w, h] = out.trim().split(' ').map(Number)
    callback(w, h)
  })
}

// Teams (Chrome PWA) supports --window-position and --window-size flags directly
app.post('/api/open-teams', (req, res) => {
  getScreenSize((sw, sh) => {
    const half = Math.floor(sw / 2)
    spawn('/opt/google/chrome/google-chrome', [
      `--profile-directory=Profile 54`,
      `--app-id=ompifgpmddkgmclendfeacglnodjjndh`,
      `--window-position=0,0`,
      `--window-size=${half},${sh}`,
    ], { detached: true, stdio: 'ignore' }).unref()
  })
  res.json({ ok: true })
})

// TeamViewer: launch then track by PID and position via xdotool
app.post('/api/open-teamviewer', (req, res) => {
  getScreenSize((sw, sh) => {
    const half = Math.floor(sw / 2)
    const x = half

    const proc = spawn('teamviewer', [], { detached: true, stdio: 'ignore' })
    proc.unref()
    const pid = proc.pid

    // Wait for window to appear, search by pid
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
        if (attempts > 20) clearInterval(interval) // give up after 10s
      })
    }, 500)
  })
  res.json({ ok: true })
})

app.listen(3001, () => console.log('API server running on http://localhost:3001'))
