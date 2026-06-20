import express from 'express'
import cors from 'cors'
import { exec, spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import sqlite3 from 'sqlite3'
import crypto from 'crypto'

const JWT_SECRET = 'titan-eye-secret-key-987654321'

function generateToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString('base64url')
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${signature}`
}

function verifyToken(token) {
  try {
    const [header, body, signature] = token.split('.')
    if (!header || !body || !signature) return null
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
    if (signature !== expectedSignature) return null
    
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (payload.exp && Date.now() > payload.exp) return null
    return payload
  } catch (err) {
    return null
  }
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }
  
  const user = verifyToken(token)
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
  
  req.user = user
  next()
}

const app = express()

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Private-Network', 'true')
  next()
})

// Allow cross-origin requests from any origin (needed for production site → localhost calls)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Enable JSON body parsing for API requests
app.use(express.json())

// --- SQLite Database Setup ---
const db = new sqlite3.Database('database.db')

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) reject(err);
    else resolve(this);
  });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

async function initDb() {
  // Create Users Table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      password TEXT NOT NULL
    )
  `);

  // Create Customers Table
  await run(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      age TEXT NOT NULL,
      gender TEXT NOT NULL,
      mobile TEXT NOT NULL,
      customerType TEXT NOT NULL,
      storeName TEXT NOT NULL,
      preferredLanguage TEXT NOT NULL,
      preferredLanguage2 TEXT NOT NULL,
      storeFeedback TEXT NOT NULL,
      optumFeedback TEXT NOT NULL,
      status TEXT NOT NULL,
      activeProfile INTEGER NOT NULL DEFAULT 0,
      lastUpdatedOn TEXT,
      rxData TEXT,
      optomRxData TEXT
    )
  `);

  // Drop old view to ensure it is updated with all columns
  await run(`DROP VIEW IF EXISTS customer_summary`);

  // Create Customer Summary View
  await run(`
    CREATE VIEW IF NOT EXISTS customer_summary AS
    SELECT id, name, age, gender, mobile, customerType, storeName, preferredLanguage, preferredLanguage2, storeFeedback, optumFeedback, status, activeProfile, lastUpdatedOn, rxData, optomRxData
    FROM customers
  `);

  // Seed default users if empty
  const userCount = await get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    await run('INSERT INTO users (email, name, role, password) VALUES (?, ?, ?, ?)', [
      'store@gmail.com', 'Meena', 'store', 'pass@123'
    ]);
    await run('INSERT INTO users (email, name, role, password) VALUES (?, ?, ?, ?)', [
      'optem@gmail.com', 'Dr. Priya', 'optem', 'pass@123'
    ]);
    console.log('Seeded default users.');
  }

  // Seed default customers if empty
  const customerCount = await get('SELECT COUNT(*) as count FROM customers');
  if (customerCount.count === 0) {
    const seedCustomers = [
      {
        id: '#0492',
        name: 'ANDF',
        age: '34',
        gender: 'Male',
        mobile: '9845012345',
        customerType: 'Existing',
        storeName: 'Titan Eye+ Chennai Anna Nagar',
        preferredLanguage: 'Tamil',
        preferredLanguage2: 'English',
        storeFeedback: 'Routine eye checkup. Suggested progressive lenses.',
        optumFeedback: '',
        status: 'Initiated',
        activeProfile: true,
        lastUpdatedOn: 'Jun 19, 2026, 10:15:32 AM',
      },
      {
        id: '#0491',
        name: 'ANAS',
        age: '28',
        gender: 'Female',
        mobile: '9731098765',
        customerType: 'New',
        storeName: 'Titan Eye+ Chennai Adyar',
        preferredLanguage: 'Tamil',
        preferredLanguage2: 'English',
        storeFeedback: 'Complaining of blurriness in far vision.',
        optumFeedback: 'Approved remote assessment.',
        status: 'Accepted',
        activeProfile: true,
        lastUpdatedOn: 'Jun 19, 2026, 09:42:15 AM',
      },
      {
        id: '#0484',
        name: 'eye',
        age: '21',
        gender: 'Male',
        mobile: '91',
        customerType: 'New',
        storeName: 'Titan Eye+ Chennai Velachery',
        preferredLanguage: 'English',
        preferredLanguage2: 'None',
        storeFeedback: 'Assessment initiated from Optem console.',
        optumFeedback: '',
        status: 'Accepted',
        activeProfile: false,
        lastUpdatedOn: 'Jun 18, 2026, 9:47:04 PM',
      },
      {
        id: '#0483',
        name: 'eye',
        age: '21',
        gender: 'Male',
        mobile: '91',
        customerType: 'New',
        storeName: 'Titan Eye+ Chennai Mylapore',
        preferredLanguage: 'English',
        preferredLanguage2: 'Tamil',
        storeFeedback: 'Checkup for distant objects.',
        optumFeedback: 'Refraction values validated.',
        status: 'Completed',
        activeProfile: true,
        lastUpdatedOn: 'Jun 18, 2026, 8:20:12 PM',
      },
      {
        id: '#0482',
        name: 'eye',
        age: '21',
        gender: 'Male',
        mobile: '91',
        customerType: 'New',
        storeName: 'Titan Eye+ Chennai Nungambakkam',
        preferredLanguage: 'English',
        preferredLanguage2: 'None',
        storeFeedback: 'Visual acuity testing needed.',
        optumFeedback: 'Need re-test for right eye.',
        status: 'Initiated',
        activeProfile: true,
        lastUpdatedOn: 'Jun 18, 2026, 7:15:45 PM',
      },
      {
        id: '#0481',
        name: 'eye',
        age: '21',
        gender: 'Male',
        mobile: '91',
        customerType: 'New',
        storeName: 'Titan Eye+ Chennai Tambaram',
        preferredLanguage: 'Tamil',
        preferredLanguage2: 'English',
        storeFeedback: 'Complaining of headaches.',
        optumFeedback: 'Rejected - invalid scan values.',
        status: 'Accepted',
        activeProfile: false,
        lastUpdatedOn: 'Jun 18, 2026, 6:02:11 PM',
      },
      {
        id: '#0354',
        name: 'test',
        age: '45',
        gender: 'Other',
        mobile: '9900112233',
        customerType: 'New',
        storeName: 'Titan Eye+ Chennai Chromepet',
        preferredLanguage: 'Tamil',
        preferredLanguage2: 'English',
        storeFeedback: 'Test scan performed in optical room.',
        optumFeedback: '',
        status: 'Initiated',
        activeProfile: false,
        lastUpdatedOn: 'Jun 17, 2026, 11:30:00 AM',
      },
      {
        id: '#0353',
        name: 'test',
        age: '50',
        gender: 'Female',
        mobile: '9900112244',
        customerType: 'Existing',
        storeName: 'Titan Eye+ Chennai T Nagar',
        preferredLanguage: 'Tamil',
        preferredLanguage2: 'English',
        storeFeedback: 'Second test scan.',
        optumFeedback: '',
        status: 'Initiated',
        activeProfile: false,
        lastUpdatedOn: 'Jun 17, 2026, 11:15:00 AM',
      },
      {
        id: '#0352',
        name: 'test',
        age: '22',
        gender: 'Male',
        mobile: '9900112255',
        customerType: 'New',
        storeName: 'Titan Eye+ Chennai Royapettah',
        preferredLanguage: 'Tamil',
        preferredLanguage2: 'None',
        storeFeedback: 'Third test scan.',
        optumFeedback: '',
        status: 'Initiated',
        activeProfile: false,
        lastUpdatedOn: 'Jun 17, 2026, 11:00:00 AM',
      },
      {
        id: '#0351',
        name: 'test',
        age: '30',
        gender: 'Male',
        mobile: '9900112266',
        customerType: 'VIP',
        storeName: 'Titan Eye+ Chennai OMR Karapakkam',
        preferredLanguage: 'English',
        preferredLanguage2: 'Tamil',
        storeFeedback: 'Fourth test scan.',
        optumFeedback: '',
        status: 'Initiated',
        activeProfile: false,
        lastUpdatedOn: 'Jun 17, 2026, 10:45:00 AM',
      },
      {
        id: '#0350',
        name: 'test',
        age: '35',
        gender: 'Female',
        mobile: '9900112277',
        customerType: 'Existing',
        storeName: 'Titan Eye+ Chennai ECR Thiruvanmiyur',
        preferredLanguage: 'English',
        preferredLanguage2: 'Tamil',
        storeFeedback: 'Fifth test scan.',
        optumFeedback: 'Scan quality verified.',
        status: 'Accepted',
        activeProfile: true,
        lastUpdatedOn: 'Jun 17, 2026, 10:30:00 AM',
      },
      {
        id: '#0021',
        name: 'Satheesh',
        age: '62',
        gender: 'Male',
        mobile: '9444054321',
        customerType: 'Existing',
        storeName: 'Titan Eye+ Chennai T Nagar',
        preferredLanguage: 'Tamil',
        preferredLanguage2: 'English',
        storeFeedback: 'Post-cataract vision evaluation.',
        optumFeedback: 'Verified by Dr. Priya.',
        status: 'Accepted',
        activeProfile: true,
        lastUpdatedOn: 'Jun 10, 2026, 02:15:30 PM',
      },
    ];

    for (const c of seedCustomers) {
      await run(`
        INSERT INTO customers (
          id, name, age, gender, mobile, customerType, storeName,
          preferredLanguage, preferredLanguage2, storeFeedback, optumFeedback,
          status, activeProfile, lastUpdatedOn, rxData, optomRxData
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        c.id, c.name, c.age, c.gender, c.mobile, c.customerType, c.storeName,
        c.preferredLanguage, c.preferredLanguage2, c.storeFeedback, c.optumFeedback || '',
        c.status, c.activeProfile ? 1 : 0, c.lastUpdatedOn || '',
        null,
        null
      ]);
    }
    console.log('Seeded default customers.');
  }
}
initDb().catch(console.error);

// Ping endpoint for latency measurement
app.get('/api/ping', (req, res) => {
  res.sendStatus(200)
})

// User Login Authentication
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }
    const user = await get('SELECT email, name, role FROM users WHERE LOWER(email) = LOWER(?) AND password = ?', [email.trim(), password])
    if (user) {
      const token = generateToken({ email: user.email, name: user.name, role: user.role })
      res.json({ user: { ...user, token } })
    } else {
      res.status(401).json({ error: 'Invalid email or password' })
    }
  } catch (err) {
    console.error('Login error:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Fetch all customers
app.get('/api/customers', authenticateToken, async (req, res) => {
  try {
    const rows = await all('SELECT * FROM customer_summary ORDER BY lastUpdatedOn DESC')
    const customers = rows.map(c => ({
      ...c,
      activeProfile: c.activeProfile === 1,
      rxData: c.rxData ? JSON.parse(c.rxData) : undefined,
      optomRxData: c.optomRxData ? JSON.parse(c.optomRxData) : undefined
    }))
    res.json(customers)
  } catch (err) {
    console.error('Fetch customers error:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create a new customer
app.post('/api/customers', authenticateToken, async (req, res) => {
  try {
    const c = req.body
    await run(`
      INSERT INTO customers (
        id, name, age, gender, mobile, customerType, storeName,
        preferredLanguage, preferredLanguage2, storeFeedback, optumFeedback,
        status, activeProfile, lastUpdatedOn, rxData, optomRxData
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      c.id, c.name, c.age, c.gender, c.mobile, c.customerType, c.storeName,
      c.preferredLanguage, c.preferredLanguage2, c.storeFeedback, c.optumFeedback || '',
      c.status, c.activeProfile ? 1 : 0, c.lastUpdatedOn || '',
      c.rxData ? JSON.stringify(c.rxData) : null,
      c.optomRxData ? JSON.stringify(c.optomRxData) : null
    ])
    res.status(201).json({ ok: true })
  } catch (err) {
    console.error('Create customer error:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update an existing customer
app.put('/api/customers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const c = req.body
    await run(`
      UPDATE customers SET
        name = ?, age = ?, gender = ?, mobile = ?, customerType = ?, storeName = ?,
        preferredLanguage = ?, preferredLanguage2 = ?, storeFeedback = ?, optumFeedback = ?,
        status = ?, activeProfile = ?, lastUpdatedOn = ?, rxData = ?, optomRxData = ?
      WHERE id = ?
    `, [
      c.name, c.age, c.gender, c.mobile, c.customerType, c.storeName,
      c.preferredLanguage, c.preferredLanguage2, c.storeFeedback, c.optumFeedback || '',
      c.status, c.activeProfile ? 1 : 0, c.lastUpdatedOn || '',
      c.rxData ? JSON.stringify(c.rxData) : null,
      c.optomRxData ? JSON.stringify(c.optomRxData) : null,
      id
    ])
    res.json({ ok: true })
  } catch (err) {
    console.error('Update customer error:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// --- Helper Functions for screen/app paths ---
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

// Teams (Chrome PWA) supports --window-position and --window-size flags directly
app.post('/api/open-teams', authenticateToken, (req, res) => {
  getScreenSize((sw, sh) => {
    const half = Math.floor(sw / 2)
    const chromePath = getChromePath()
    
    const proc = spawn(chromePath, [
      `--profile-directory=Profile 54`,
      `--app=https://teams.microsoft.com/`,
      `--window-position=0,0`,
      `--window-size=${half},${sh}`,
    ], { detached: true, stdio: 'ignore' })

    proc.on('error', (err) => {
      console.error('Failed to launch Teams Chrome app:', err.message)
    })
    proc.unref()
  })
  res.json({ ok: true })
})

// TeamViewer: launch then track window and position
app.post('/api/open-teamviewer', authenticateToken, (req, res) => {
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
// Serve static files from Vite build directory
const distPath = path.resolve('dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  // For any other request, send back index.html (supports client-side routing)
  app.get('/*splat', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next()
    }
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) {
        console.error('res.sendFile error:', err)
        next(err)
      }
    })
  })
}

app.listen(3001, () => console.log('API server running on http://localhost:3001'))
