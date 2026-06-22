# Titan Eye+ — ZAP Scan Remediation Guide

This document outlines the step-by-step checklist and guide to resolve every single security vulnerability identified in the ZAP Scan Report (`/Users/abc/2026-06-22-ZAP-Report-.html`).

---

## 📋 Remediation Status & Roadmap Tracker

- [ ] **Phase 1: Content Security Policy (CSP) Hardening (Medium Risk)**
  - [ ] Step 1.1: Enable Helmet's CSP Middleware in Express
  - [ ] Step 1.2: Define Explicit fallback directives (`frame-ancestors`, `form-action`)
- [ ] **Phase 2: Nginx Server Version Leak Prevention (Low Risk)**
  - [ ] Step 2.1: Suppress Nginx Version Tokens in production
- [ ] **Phase 3: Cache Hardening (Informational Risk)**
  - [ ] Step 3.1: Enforce strict no-cache directives on sensitive API routes

---

## 🛠️ Step-by-Step Remediation Instructions

### Phase 1: Content Security Policy (CSP) Hardening
**Risk Level:** Medium  
**Alerts:** 
* *Content Security Policy (CSP) Header Not Set* (on `/` root page)
* *CSP: Failure to Define Directive with No Fallback* (missing `frame-ancestors` and `form-action`)

**Objective:** Configure a strict Content Security Policy to protect the web application from cross-site scripting (XSS) and clickjacking attacks.

#### 1. Modify [index.ts](file:///Users/abc/Desktop/Byte-Bandits/project_new/titan/server/index.ts):
Update the `helmet` middleware configuration to enable the Content Security Policy directives:

```typescript
// server/index.ts (Lines 31-33)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      // Allow loading scripts from origin, plus unsafe-inline for inline bundle hooks
      scriptSrc: ["'self'", "'unsafe-inline'"],
      // Allow CSS from origin, unsafe-inline, and Google Fonts
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      // Allow API and SSE connections to origin
      connectSrc: ["'self'", "https://titaneye.duckdns.org", "http://localhost:3001"],
      imgSrc: ["'self'", "data:"],
      // Fix for: CSP: Failure to Define Directive with No Fallback
      frameAncestors: ["'none'"], // Prevent clickjacking framing
      formAction: ["'self'"],     // Enforce forms submit only to origin
    },
  },
}));
```

---

### Phase 2: Nginx Server Version Leak Prevention
**Risk Level:** Low  
**Alert:** *Server Leaks Version Information via "Server" HTTP Response Header Field*

**Objective:** Suppress version numbers from HTTP headers (e.g., `Server: nginx/1.28.2`) to prevent vulnerability scanning and enumeration.

#### 1. Modify Nginx configuration on EC2 Server:
Log into the production server and edit your Nginx configuration:
```bash
sudo nano /etc/nginx/nginx.conf
```
Under the `http` block, add/uncomment the following directive:
```nginx
http {
    server_tokens off;
    # ... other configuration ...
}
```

#### 2. Restart Nginx to apply changes:
```bash
sudo systemctl restart nginx
```

---

### Phase 3: Cache Hardening
**Risk Level:** Informational  
**Alert:** *Re-examine Cache-control Directives*

**Objective:** Prevent intermediate proxies and browsers from caching sensitive clinical or user session data.

#### 1. Implement No-Cache headers on sensitive API routes in [index.ts](file:///Users/abc/Desktop/Byte-Bandits/project_new/titan/server/index.ts):
Ensure that dynamic API endpoints explicitly override cache headers by adding no-cache headers.
Modify `server/index.ts` to add a cache-control middleware specifically for `/api` routes:
```typescript
// server/index.ts (before registering routers)
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});
```
