# Titan Eye+ — Step-by-Step Security Remediation Guide

This document provides a highly actionable, file-by-file step-by-step checklist and guide to resolve every single security vulnerability identified in the [Titan_Eye_Vulnerability_Report.md](file:///Users/abc/Desktop/Byte-Bandits/project_new/titan/Titan_Eye_Vulnerability_Report.md).

---

## 📋 Remediation Status & Roadmap Tracker

- [x] **Phase 0: Emergency Mitigations ("Stop the Bleeding")**
  - [x] Step 0.1: Secure `JWT_SECRET` & Git History
  - [x] Step 0.2: Authenticate `/api/events` (SSE Endpoint)
  - [x] Step 0.3: Authenticate `/api/webhooks/call-event`
  - [x] Step 0.4: Remove Hardcoded Demo Credentials
- [x] **Phase 1: Core Cryptographic & Authorization Controls**
  - [x] Step 1.1: Secure Password Storage with Cryptographic Hashing
  - [x] Step 1.2: Move JWTs to Secure HttpOnly Cookies
  - [x] Step 1.3: Enforce Store Isolation & Role-Based Access Controls (IDOR Fix)
- [x] **Phase 2: Application Hardening**
  - [x] Step 2.1: Tighten CORS Policy
  - [x] Step 2.2: Implement Security Headers (Helmet Middleware)
  - [x] Step 2.3: Implement Rate Limiting on Login and Sensitive APIs
- [x] **Phase 3: Deployment & Infrastructure Hardening**
  - [x] Step 3.1: Enforce Strict SSH Host Checking in GitHub Actions

---

## 🛠️ Phase 0: Emergency Mitigations ("Stop the Bleeding")

### Step 0.1: Secure `JWT_SECRET` & Git History
**Objective:** Prevent credential forgery by removing secrets from git, logs, and codebases.

1. **Modify [jwt.ts](file:///Users/abc/Desktop/Byte-Bandits/project_new/titan/server/config/jwt.ts):**
   Ensure the server throws an error if no environment variable is supplied, preventing fallbacks to the weak key:
   ```typescript
   // server/config/jwt.ts
   import crypto from 'crypto';

   if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'titan-eye-secret-key-987654321') {
     throw new Error('FATAL: JWT_SECRET environment variable is missing or insecure!');
   }
   export const JWT_SECRET = process.env.JWT_SECRET;
   ```

2. **Update Environment Variables:**
   - Remove `JWT_SECRET` from [.env](file:///Users/abc/Desktop/Byte-Bandits/project_new/titan/.env) and [.env.local](file:///Users/abc/Desktop/Byte-Bandits/project_new/titan/.env.local).
   - Create a template file `.env.example` showing configuration options without secrets.
   - Run the command to untrack `.env` from git:
     ```bash
     git rm --cached .env
     ```
   - Add `.env` to [.gitignore](file:///Users/abc/Desktop/Byte-Bandits/project_new/titan/.gitignore):
     ```
     .env
     ```

3. **Secure CI/CD Configuration in [deploy.yml](file:///Users/abc/Desktop/Byte-Bandits/project_new/titan/.github/workflows/deploy.yml):**
   Replace hardcoded secrets at lines 28 and 31 with a reference to GitHub Secrets:
   ```yaml
   # .github/workflows/deploy.yml (Lines 28 & 31)
   echo "JWT_SECRET=${{ secrets.JWT_SECRET }}" >> .env
   echo "JWT_SECRET=${{ secrets.JWT_SECRET }}" >> .env.production
   ```
   *Action:* Add a secure generated secret value for `JWT_SECRET` under repository settings in GitHub: `Settings` ➔ `Secrets and variables` ➔ `Actions` ➔ `New repository secret`.

4. **Purge Git History:**
   To permanently erase the leaked keys from repository history, run:
   ```bash
   git filter-repo --path .env --invert-paths
   ```

---

### Step 0.2: Authenticate `/api/events` (SSE Endpoint)
**Objective:** Stop the unauthenticated PHI wiretap.

1. **Modify [index.ts](file:///Users/abc/Desktop/Byte-Bandits/project_new/titan/server/index.ts):**
   Since the browser's native `EventSource` API does not support custom headers, modify the SSE route to check the token via the query string:
   ```typescript
   // server/index.ts (Lines 43-59)
   import { verifyToken } from './config/jwt.js';

   app.get('/api/events', (req: Request, res: Response, next: NextFunction) => {
     const token = req.query.token as string;
     if (!token) {
       return res.status(401).json({ error: 'Access token required via query parameter' });
     }

     const user = verifyToken(token);
     if (!user) {
       return res.status(401).json({ error: 'Invalid or expired token' });
     }

     res.writeHead(200, {
       'Content-Type': 'text/event-stream',
       'Cache-Control': 'no-cache, no-transform',
       'Connection': 'keep-alive',
       'X-Accel-Buffering': 'no'
     });
     res.write('\n');

     const clientId = Date.now();
     const newClient = { id: clientId, res };
     addSseClient(newClient);

     req.on('close', () => {
       removeSseClient(clientId);
     });
   });
   ```

2. **Update Frontend SSE Connection in [App.tsx](file:///Users/abc/Desktop/Byte-Bandits/project_new/titan/src/App.tsx):**
   ```typescript
   // src/App.tsx (Line 128)
   const eventSource = new EventSource(`${apiBaseUrl}/events?token=${encodeURIComponent(user.token)}`);
   ```

---

### Step 0.3: Authenticate `/api/webhooks/call-event`
**Objective:** Secure control of clinic call-state.

1. **Modify [webhooks.ts](file:///Users/abc/Desktop/Byte-Bandits/project_new/titan/server/routes/webhooks.ts):**
   Validate a secure header token on all webhook calls:
   ```typescript
   // server/routes/webhooks.ts
   router.post('/call-event', async (req: Request, res: Response) => {
     const signature = req.headers['x-webhook-signature'];
     const webhookSecret = process.env.WEBHOOK_SECRET;

     if (!webhookSecret) {
       console.error('WEBHOOK_SECRET environment variable is missing.');
       return res.status(500).json({ error: 'Internal configuration error' });
     }

     if (signature !== webhookSecret) {
       return res.status(401).json({ error: 'Unauthorized webhook source' });
     }

     // ... rest of the handler logic ...
   });
   ```

---

### Step 0.4: Remove Hardcoded Demo Credentials
**Objective:** Close the login page credentials backdoor.

1. **Modify [LoginScreen.tsx](file:///Users/abc/Desktop/Byte-Bandits/project_new/titan/src/components/LoginScreen.tsx):**
   - Reset state fields to empty strings (Lines 14-15):
     ```typescript
     const [email, setEmail] = React.useState('');
     const [password, setPassword] = React.useState('');
     ```
   - Delete the credentials helper footer (Lines 140-145):
     ```tsx
     {/* DELETE the demo emails panel entirely */}
     ```

2. **Clean up DB Seeding:**
   Once passwords are encrypted, do not print default login strings on production systems. Add a check to only log seeder commands in development builds.

---

## 🛡️ Phase 1: Core Cryptographic & Authorization Controls

### Step 1.1: Secure Password Storage with Cryptographic Hashing
**Objective:** Ensure stored passwords cannot be read in plaintext if the database is leaked.

1. **Create Hashing Helper (`server/utils/hash.ts`):**
   Implement secure, platform-independent hashing using native Node.js cryptography (no native-binary compilation issues):
   ```typescript
   // server/utils/hash.ts
   import crypto from 'crypto';

   export function hashPassword(password: string): string {
     const salt = crypto.randomBytes(16).toString('hex');
     const hash = crypto.scryptSync(password, salt, 64).toString('hex');
     return `${salt}:${hash}`;
   }

   export function verifyPassword(password: string, storedValue: string): boolean {
     const [salt, hash] = storedValue.split(':');
     if (!salt || !hash) return false;
     const inputHash = crypto.scryptSync(password, salt, 64).toString('hex');
     return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(inputHash, 'hex'));
   }
   ```

2. **Hash Seeding Values in [database.ts](file:///Users/abc/Desktop/Byte-Bandits/project_new/titan/server/db/database.ts):**
   ```typescript
   // server/db/database.ts
   import { hashPassword } from '../utils/hash.js';

   // Update inserts to store hashed strings
   await run('INSERT OR IGNORE INTO users (email, name, role, password) VALUES (?, ?, ?, ?)', [
     'store@gmail.com', 'Meena', 'store', hashPassword('pass@123')
   ]);
   ```

3. **Verify Hashed Sign-in in [auth.ts](file:///Users/abc/Desktop/Byte-Bandits/project_new/titan/server/routes/auth.ts):**
   ```typescript
   // server/routes/auth.ts (Lines 13-19)
   import { verifyPassword } from '../utils/hash.js';

   const user = await get('SELECT email, name, role, password FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
   if (user && verifyPassword(password, user.password)) {
     const token = generateToken({ email: user.email, name: user.name, role: user.role });
     return res.json({ user: { email: user.email, name: user.name, role: user.role, token } });
   } else {
     return res.status(401).json({ error: 'Invalid email or password' });
   }
   ```

---

### Step 1.2: Move JWTs to Secure HttpOnly Cookies
**Objective:** Protect JWT sessions from extraction by malicious browser extensions or XSS.

1. **Install Cookie Parser:**
   ```bash
   npm install cookie-parser
   ```

2. **Integrate Middleware in [index.ts](file:///Users/abc/Desktop/Byte-Bandits/project_new/titan/server/index.ts):**
   ```typescript
   import cookieParser from 'cookie-parser';
   app.use(cookieParser());
   ```

3. **Modify Login Endpoint to Set Cookie:**
   ```typescript
   // server/routes/auth.ts
   res.cookie('token', token, {
     httpOnly: true,
     secure: process.env.NODE_ENV === 'production',
     sameSite: 'strict',
     maxAge: 24 * 60 * 60 * 1000 // 24 Hours
   });
   ```

4. **Extract Token in [auth.ts](file:///Users/abc/Desktop/Byte-Bandits/project_new/titan/server/middleware/auth.ts):**
   ```typescript
   // server/middleware/auth.ts
   const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
   ```

---

### Step 1.3: Enforce Store Isolation & Role-Based Access Controls (IDOR Fix)
**Objective:** Restrict store workers to their store's patient records, and restrict clinical modifications to Optometrist accounts.

1. **Add `storeName` to User Model:**
   Modify the database schema in [database.ts](file:///Users/abc/Desktop/Byte-Bandits/project_new/titan/server/db/database.ts) to define a store designation:
   ```sql
   CREATE TABLE IF NOT EXISTS users (
     email TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     role TEXT NOT NULL,
     storeName TEXT, -- Added store location designation
     password TEXT NOT NULL
   )
   ```

2. **Secure Routes in [customers.ts](file:///Users/abc/Desktop/Byte-Bandits/project_new/titan/server/routes/customers.ts):**
   - **Enforce store isolation on Read:**
     ```typescript
     // GET /api/customers
     let query = 'SELECT * FROM customer_summary';
     let params: any[] = [];

     if (req.user.role === 'store') {
       query += ' WHERE storeName = ?';
       params.push(req.user.storeName);
     }
     query += ' ORDER BY lastUpdatedOn DESC';
     const rows = await all(query, params);
     ```

   - **Prevent clinical data modification on Write (PUT /:id):**
     If a user has the `store` role, reject attempts to overwrite optometrist data:
     ```typescript
     if (req.user.role === 'store') {
       const existing = await get('SELECT storeName, optomRxData, optumFeedback FROM customers WHERE id = ?', [id]);
       if (!existing || existing.storeName !== req.user.storeName) {
         return res.status(403).json({ error: 'Access Denied: Store mismatch' });
       }
       // Ensure they do not overwrite clinical fields
       c.optomRxData = existing.optomRxData;
       c.optumFeedback = existing.optumFeedback;
     }
     ```

---

## 🛡️ Phase 2: Application Hardening

### Step 2.1: Tighten CORS Policy
Configure CORS to permit connection only from designated origins:
```typescript
// server/index.ts
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### Step 2.2: Implement Security Headers (Helmet Middleware)
Install `helmet` to block clickjacking, MIME sniffing, and load strict policies:
```bash
npm install helmet
```
Enable it globally in [index.ts](file:///Users/abc/Desktop/Byte-Bandits/project_new/titan/server/index.ts):
```typescript
import helmet from 'helmet';
app.use(helmet());
```

### Step 2.3: Implement Rate Limiting on Login and Sensitive APIs
Install rate-limiter middleware:
```bash
npm install express-rate-limit
```
Add limits on the login endpoint:
```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 10, // 10 sign-in requests limit
  message: { error: 'Too many login attempts. Please wait 15 minutes.' }
});
app.use('/api/login', authLimiter);
```

---

## 🛡️ Phase 3: Deployment & Infrastructure Hardening

### Step 3.1: Enforce Strict SSH Host Checking in GitHub Actions
Prevent deployment interceptions via CI/CD Man-in-the-Middle (MITM) attacks by pinning the server's public SSH key instead of bypassing checks.

1. Capture public host key:
   ```bash
   ssh-keyscan <server-ip>
   ```
2. Save this fingerprint into GitHub Secrets as `SSH_HOST_KEY`.
3. Update [deploy.yml](file:///Users/abc/Desktop/Byte-Bandits/project_new/titan/.github/workflows/deploy.yml) at line 54 to trust only the matching fingerprint:
   ```yaml
   # .github/workflows/deploy.yml (Lines 49-54)
   - name: 🔑 Configure SSH Key
     run: |
       mkdir -p ~/.ssh
       echo "${{ secrets.SSH_PRIVATE_KEY }}" | tr -d '\r' > ~/.ssh/id_rsa
       chmod 600 ~/.ssh/id_rsa
       echo "${{ secrets.SERVER_IP }} ${{ secrets.SSH_HOST_KEY }}" >> ~/.ssh/known_hosts
   ```
