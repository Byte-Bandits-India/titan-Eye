# TRVC Security & Privacy Audit Findings Analysis

**Target Domain:** `trvc.titan.in`  
**Assessment Date:** September – November 2026  
**Source Artifacts:**
- `docs/TRVC Privacy Security Technical.xlsx` (Privacy & Technical Controls Sheet)
- `docs/TRVC Web Application_Audit_Report.csv` (Web Application Security Vulnerability Scan)

---

## Executive Summary

This document consolidates and analyzes all security vulnerabilities, privacy non-compliances, and architectural risks identified across the TRVC application ecosystem.

### Audit Summary Metrics

| Category / Artifact | Scope / Total | Critical | High | Medium | Low | Info | Status / Outcome |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Privacy & Security Technical Tests** | 7 Domains | — | — | — | — | — | **4 Unsafe** / 3 Safe |
| **Web Application Vulnerability Scan** | 35 Findings | 1 | 4 | 7 | 20 | 3 | **35 Issues** |
| **Combined Distinct Vulnerabilities** | **42 Issues** | **1** | **4** | **7** | **20** | **3** | **Requires Immediate Remediation** |

---

## Part 1: Privacy & Data Protection Audit (`TRVC Privacy Security Technical.xlsx`)

The technical privacy sheet evaluates compliance against strict data privacy standards (PII protection, access control boundaries, data minimization, and client-side data hygiene).

### 1. PII Access Control / IDOR Validation
- **Domain:** PII Access Control / IDOR Validation
- **Status:** **`Unsafe` (Failed)**
- **Objective:** Verify that users cannot access personal data belonging to other users by manipulating identifiers.
- **Execution Summary:** 
  1. Authenticated as User A.
  2. Captured profile retrieval request: `GET /api/user/profile?id=12345`.
  3. Modified identifier to target User B: `GET /api/user/profile?id=12346`.
  4. Observed server response.
- **Pass Criteria:** System returns `403 Access Denied` and discloses zero PII of other users.
- **Finding & Description:** The application returned HTTP 200 with the personal profile data of User B. The endpoint lacks object-level authorization checks, allowing horizontal privilege escalation and unauthorized PII harvesting via Insecure Direct Object Reference (IDOR).
- **Remediation:** Enforce server-side session-to-resource ownership checks. Verify that the authenticated session identity matches the requested subject ID before returning records.

---

### 2. PII Access Control / API Object-Level Authorization (BOLA)
- **Domain:** PII Access Control / API Authorization
- **Status:** **`Unsafe` (Failed)**
- **Objective:** Verify that API endpoints enforce object-level authorization across business entities (orders, documents, invoices, support tickets).
- **Execution Summary:**
  1. Identified API endpoints referencing business objects: `/api/orders/{id}`, `/api/documents/{id}`, `/api/invoices/{id}`, `/api/tickets/{id}`.
  2. Substituted target object identifiers with IDs belonging to other users.
  3. Evaluated whether unauthorized PII or order details were exposed.
- **Pass Criteria:** Server returns `403 Access Denied` when attempting to access objects owned by other entities.
- **Finding & Description:** The API returned order, document, and invoice details without verifying if the requesting user owned or was authorized to view the referenced entity (Broken Object Level Authorization - BOLA).
- **Remediation:** Implement database-level tenancy or user ownership filtering on all queries retrieving business documents and orders.

---

### 3. Data Enumeration / PII Discovery Controls
- **Domain:** Data Enumeration / PII Discovery Controls
- **Status:** **`Safe` (Passed)**
- **Objective:** Verify search or autocomplete APIs do not expose bulk personal data through enumeration or predictable queries.
- **Execution Summary:** Incrementally queried search endpoints (`GET /api/search?query=...`, `GET /api/users?name=...`) with single characters and wildcards to test bulk scraping.
- **Pass Criteria:** Search APIs return minimal non-sensitive data, enforce pagination and rate limits, and block automated bulk scraping.
- **Finding & Description:** The application enforces strict rate limiting and query restrictions, preventing mass PII harvesting.

---

### 4. PII Access Control / File Storage Validation
- **Domain:** PII Access Control / File Storage Validation
- **Status:** **`Safe` (Passed)**
- **Objective:** Verify stored personal files and documents cannot be accessed directly by manipulating file identifiers or URLs.
- **Execution Summary:** Attempted direct file downloads (`GET /api/files/download/{id}`, `/documents/{id}`) across different account sessions.
- **Pass Criteria:** Server returns `403 Access Denied` for files owned by other users.
- **Finding & Description:** File storage requests properly validate access tokens and ownership before streaming or downloading documents.

---

### 5. Data Minimization & Client Storage Controls
- **Domain:** Data Minimization & Client Storage Controls
- **Status:** **`Unsafe` (Failed)**
- **Objective:** Verify that personal data is not unnecessarily stored in browser storage mechanisms or cached responses.
- **Execution Summary:**
  1. Authenticated as a standard user and inspected browser DevTools (`LocalStorage`, `SessionStorage`, `IndexedDB`, `Cache Storage`).
  2. Checked for stored PII attributes and authentication tokens.
- **Pass Criteria:** No sensitive PII stored in client storage; only secure, minimal session identifiers retained.
- **Finding & Description:** The application writes sensitive user details—including email address, full name, user role, and persistent tokens—directly into `LocalStorage`. Any client-side XSS vulnerability can extract this information.
- **Remediation:** Remove sensitive user profile attributes from `LocalStorage`. Store session identifiers in `HttpOnly`, `Secure`, `SameSite=Strict` cookies.

---

### 6. Data Minimization & Form Transmission Controls
- **Domain:** Data Minimization & Collection Controls
- **Status:** **`Safe` (Passed)**
- **Objective:** Detect whether undeclared personal data, device fingerprints, or hidden telemetry fields are collected in network payloads.
- **Execution Summary:** Compared form fields displayed on UI registration/profile forms against the intercepted JSON request bodies sent over the wire.
- **Pass Criteria:** Only fields explicitly declared and shown to the user are transmitted.
- **Finding & Description:** Network payloads match UI form inputs without stealth tracking, device fingerprinting, or hidden data transmission.

---

### 7. Data Minimization & Excessive Data Exposure (Over-Fetching)
- **Domain:** Data Minimization & Collection Controls
- **Status:** **`Unsafe` (Failed)**
- **Objective:** Verify APIs return only required personal data fields and do not expose excessive backend PII or internal system metadata.
- **Execution Summary:** Inspected JSON payloads of `/api/user/profile` and customer endpoints.
- **Pass Criteria:** APIs return only fields strictly required by the frontend view.
- **Finding & Description:** Endpoints dump raw database records containing unnecessary attributes, internal scoring values, and system metadata not utilized by the frontend UI.
- **Remediation:** Use Data Transfer Objects (DTOs) or field projection to return only the minimal set of attributes needed by the client.

---

## Part 2: Web Application Security Vulnerability Audit (`TRVC Web Application_Audit_Report.csv`)

### 1. Critical Severity Vulnerabilities (CVSS 9.0 – 10.0)

#### #10. Hardcoded Encryption Secret in Client-Side Bundle
- **Alert ID:** `5589159`
- **Severity:** Critical (CVSS 9.8) | `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N`
- **OWASP Category:** `A02:2025 - Security Misconfiguration` | **CWE:** CWE-321 (Use of Hard-coded Cryptographic Key)
- **Affected Endpoint:** `https://trvc.titan.in/api/login`
- **Technical Finding:** The encryption key and initialization vector used for client-server payload encryption are embedded directly in the publicly readable JavaScript bundle (`index-BmRwe1ly.js`).
- **Impact & Business Risk:** Any external attacker can extract the secret key, decrypt intercepted sensitive communication (including credentials), tamper with request parameters, and forge valid encrypted requests, completely defeating application payload encryption.
- **Remediation:** Never perform symmetric encryption with client-side embedded keys. Use standard TLS/HTTPS for in-transit encryption. If payload encryption is mandatory, use asymmetric public-key encryption (RSA/ECC) where the client holds only the public key.

---

### 2. High Severity Vulnerabilities (CVSS 7.0 – 8.9)

#### #7. Vertical & Horizontal Privilege Escalation
- **Alert ID:** `5589179`
- **Severity:** High (CVSS 7.1) | `AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:L/A:L`
- **OWASP Category:** `A01:2025 - Broken Access Control` | **CWE:** CWE-285 (Improper Authorization)
- **Affected Endpoint:** `https://trvc.titan.in/api/customers`
- **Technical Finding:** A user with the `Optometrist` role can create customer records, delete customer records, and retrieve customer/staff PII beyond their authorized functional scope.
- **Impact & Business Risk:** Lower-privileged roles can perform administrative operations and access private personal data, violating least-privilege principles and regulatory data privacy mandates.
- **Remediation:** Implement server-side Role-Based Access Control (RBAC) middleware verifying that only authorized administrative roles can invoke mutating (`POST`, `DELETE`, `PUT`) customer endpoints.

#### #9. Business Logic Flaw — Bypassing Store-Controlled Workflow
- **Alert ID:** `5589173`
- **Severity:** High (CVSS 7.1) | `AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N`
- **OWASP Category:** `A04:2025 - Insecure Design` | **CWE:** CWE-840 (Business Logic Errors)
- **Affected Endpoint:** `https://trvc.titan.in/api/customers/%230008/initiate-call`
- **Technical Finding:** The `Optometrist` role can trigger outbound customer calls directly via API without adhering to the required Store-mediated workflow.
- **Impact & Business Risk:** Subversion of operational business rules, enabling rogue call initiations, customer harassment, and unlogged communications outside the governed workflow.
- **Remediation:** Validate workflow state transitions on the backend before executing call initiation actions.

#### #11. Stored Cross-Site Scripting (XSS) via SVG Upload
- **Alert ID:** `5588639`
- **Severity:** High (CVSS 7.2) | `AV:N/AC:L/PR:N/UI:N/S:C/C:L/I:L/A:N`
- **OWASP Category:** `A03:2025 - Injection` | **CWE:** CWE-79 (Improper Neutralization of Input During Web Page Generation)
- **Affected Endpoint:** `https://trvc.titan.in/api/customers/%230007/feedback-image/1`
- **Technical Finding:** The feedback image upload endpoint accepts SVG files containing embedded JavaScript (`<script>` / `onload`). When the uploaded SVG is accessed, the browser executes the script in the context of the user session.
- **Impact & Business Risk:** An attacker can compromise user or administrator sessions, steal session cookies/tokens, perform unauthorized actions, or redirect users to phishing sites.
- **Remediation:** Sanitize uploaded SVG files with a library like DOMPurify or convert images to raster formats (JPEG/PNG). Serve user-uploaded media with `Content-Disposition: attachment` or host them on an isolated, sandboxed domain with `Content-Type: image/svg+xml; sandbox`.

#### #29. Diffie-Hellman Ephemeral Key Exchange Denial-of-Service (D(HE)ater)
- **Alert ID:** `5584733`
- **Severity:** High (CVSS 7.5) | `AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H`
- **OWASP Category:** `A02:2025 - Security Misconfiguration` | **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **Affected Endpoint:** `https://trvc.titan.in/`
- **Technical Finding:** The TLS configuration accepts legacy DHE cipher suites (`TLS_DHE_RSA_WITH_AES_128_GCM_SHA256`, `TLS_DHE_RSA_WITH_AES_256_GCM_SHA384`) over TLS 1.2.
- **Impact & Business Risk:** DHE handshakes are computationally asymmetric. Attackers can initiate thousands of unauthenticated DHE handshakes to exhaust server CPU and bring down web services (D(HE)ater attack).
- **Remediation:** Disable DHE cipher suites. Configure modern ECDHE ciphers (e.g., `ECDHE-RSA-AES128-GCM-SHA256`, `ECDHE-RSA-AES256-GCM-SHA384`) and TLS 1.3.

---

### 3. Medium Severity Vulnerabilities (CVSS 4.0 – 6.9)

#### #1. Failure to Restrict Video Streaming URL Access
- **Alert ID:** `5589319` | **Severity:** Medium (CVSS 5.3) | **OWASP:** `A01:2025 - Broken Access Control`
- **Affected Endpoint:** `https://trvc.titan.in/api/videos/1/stream`
- **Technical Finding:** The video streaming endpoint lacks proper access control checks. Unauthenticated users or users without rights can directly stream and download raw video files.
- **Remediation:** Enforce server-side authorization checks and issue short-lived, signed streaming URLs.

#### #12. Unrestricted File Upload (Executable Files Permitted)
- **Alert ID:** `5588626` | **Severity:** Medium (CVSS 6.5) | **OWASP:** `A04:2025 - Insecure Design`
- **Affected Endpoint:** `https://trvc.titan.in/api/videos`
- **Technical Finding:** The video upload functionality fails to restrict file extensions or validate magic byte signatures, allowing executable `.exe` files to be uploaded.
- **Remediation:** Enforce strict file extension allowlisting (e.g., `.mp4`, `.webm`), validate file headers (magic bytes), and store files outside the web root.

#### #13. Missing Rate Limiting on Video Upload API
- **Alert ID:** `5588622` | **Severity:** Medium (CVSS 5.3) | **OWASP:** `A05:2025 - Security Misconfiguration`
- **Affected Endpoint:** `https://trvc.titan.in/api/videos`
- **Technical Finding:** No rate-limiting or volume restrictions exist on file uploads, permitting rapid successive uploads that can exhaust disk storage.
- **Remediation:** Implement IP- and user-based upload quotas and rate limiters (e.g., maximum 5 uploads per hour per user).

#### #16. Sensitive Identity Data in Browser LocalStorage
- **Alert ID:** `5588613` | **Severity:** Medium (CVSS 5.3) | **OWASP:** `A02:2025 - Security Misconfiguration`
- **Affected Endpoint:** `https://trvc.titan.in/store`
- **Technical Finding:** Sensitive user details (email, username, role) are persisted in `LocalStorage` without encryption, making them susceptible to theft via any XSS flaw.
- **Remediation:** Store session credentials strictly in secure, `HttpOnly` cookies.

#### #18. Missing CAPTCHA & Brute-Force Controls on Login
- **Alert ID:** `5588608` | **Severity:** Medium (CVSS 5.3) | **OWASP:** `A07:2025 - Identification and Authentication Failures`
- **Affected Endpoint:** `https://trvc.titan.in/login`
- **Technical Finding:** The login interface lacks CAPTCHA verification, progressive delays, or account lockout thresholds, enabling automated brute-force attacks.
- **Remediation:** Deploy reCAPTCHA/Cloudflare Turnstile and enforce account lockout or progressive rate limiting after consecutive failed login attempts.

#### #19 & #34. Insecure & Misconfigured Content Security Policy (CSP)
- **Alert IDs:** `5588607`, `5582932` | **Severity:** Medium (CVSS 5.3) | **OWASP:** `A02:2025 - Security Misconfiguration`
- **Affected Endpoints:** `https://trvc.titan.in/login`, `https://trvc.titan.in/`
- **Technical Finding:** CSP contains `unsafe-inline` and `unsafe-eval` directives, lacks `require-trusted-types-for` and report endpoints, and explicitly whitelists internal development domains (`http://localhost:3001`, `http://localhost:5173`).
- **Remediation:** Remove `unsafe-inline` and `unsafe-eval`. Purge localhost references from production CSP headers. Implement nonce-based CSP.

---

### 4. Low Severity Vulnerabilities (CVSS 0.1 – 3.9)

#### #2. JavaScript Source Code & Endpoint Disclosure
- **Alert ID:** `5589234` | **Severity:** Low (CVSS 3.7) | **URL:** `https://trvc.titan.in/assets/index-BmRwe1ly.js`
- **Description:** Client bundles expose complete application routing tables, unminified logic, role definitions, and internal API structures without authentication.

#### #3. Directory Traversal / Path Normalization Defect
- **Alert ID:** `5589215` | **Severity:** Low (CVSS 3.7) | **URL:** `https://trvc.titan.in/api/customers`
- **Description:** Encoded path traversal sequences in requests redirect or resolve to unexpected internal endpoints (`/api/users`).

#### #4, #30, #31, #32. Application Version Disclosure (`X-Powered-By: ARR/3.0`)
- **Alert IDs:** `5589189`, `5588993`, `5588989`, `5584009` | **Severity:** Low (CVSS 3.7)
- **URLs:** `/api/customers`, `/api/me/photo`, `/api/events`, `/api/auth/microsoft/url`
- **Description:** Reverse proxy headers disclose `X-Powered-By: ARR/3.0`, revealing Microsoft Application Request Routing technology.

#### #5, #25, #26, #27, #35. Internal IP Address / Hostname Disclosure (`localhost:3001`)
- **Alert IDs:** `5589188`, `5582904`, `5585754`, `5584076`, `5582931` | **Severity:** Low (CVSS 3.7)
- **URLs:** `/login`, `/login?Submit=Submit`, `/libs/`, `/default.htm`, `/`
- **Description:** HTTP headers and inline CSP definitions expose the internal port and hostname `localhost:3001`, disclosing backend topology.

#### #6. Inadequate Password Complexity Policy
- **Alert ID:** `5589185` | **Severity:** Low (CVSS 3.7) | **URL:** `https://trvc.titan.in/api/users`
- **Description:** The user administration API permits trivial passwords (e.g., `000000`), lacking rules for length, character diversity, or common password lists.

#### #8. Unsanitized Special Characters in Feedback
- **Alert ID:** `5589176` | **Severity:** Low (CVSS 3.7) | **URL:** `https://trvc.titan.in/api/customers/%230007/feedback-image/1`
- **Description:** Arbitrary characters and unescaped HTML characters are accepted and stored by the customer feedback API.

#### #14. Public `robots.txt` Revealing Internal Endpoints
- **Alert ID:** `5588621` | **Severity:** Low (CVSS 3.1) | **URL:** `https://trvc.titan.in/robots.txt`
- **Description:** `robots.txt` explicitly disallows `/api/` and `/assets/`, giving attackers a directory listing of restricted routes.

#### #15. JWT Extended Token Lifetime Misconfiguration
- **Alert ID:** `5588617` | **Severity:** Low (CVSS 3.7) | **URL:** `https://trvc.titan.in/api/login`
- **Description:** Access tokens are issued with excessively long lifetimes without a server-side revocation mechanism.

#### #17. HTTP `OPTIONS` Verb Enabled
- **Alert ID:** `5588610` | **Severity:** Low (CVSS 3.7) | **URL:** `https://trvc.titan.in/login`
- **Description:** Web server responds to `OPTIONS` with `Allow` and `Public` headers, advertising available HTTP methods.

#### #20. Session Cookie Configured With Root Path (`/`)
- **Alert ID:** `5588606` | **Severity:** Low (CVSS 3.7) | **URL:** `https://trvc.titan.in/api/login`
- **Description:** Session cookies are scoped to `Path=/`, transmitting credentials to all application paths and sub-services.

#### #21 & #22. Form Password Fields With Autocomplete Enabled
- **Alert IDs:** `5588605`, `5589049` | **Severity:** Low (CVSS 3.7)
- **URLs:** `https://trvc.titan.in/login`, `http://trvc.titan.in/index.php`
- **Description:** Login and phpMyAdmin password fields lack `autocomplete="off"` / `autocomplete="new-password"`, enabling credential caching on shared machines.

#### #23. Broad Cookie Scoping on phpMyAdmin Cookies
- **Alert ID:** `5589048` | **Severity:** Low (CVSS 3.7) | **URL:** `http://trvc.titan.in/index.php`
- **Description:** phpMyAdmin session cookies (`pma_lang`, `phpMyAdmin`) are set with `Path=/` across the domain.

---

### 5. Informational & Infrastructure Disclosures

#### #24 & #28. Server Banner Disclosure (`Server: Microsoft-HTTPAPI/2.0`)
- **Alert IDs:** `5582952`, `5582895` | **Severity:** Informational
- **URLs:** `https://trvc.titan.in/api/login`, `https://trvc.titan.in/api/me`
- **Description:** Server response headers leak `Server: Microsoft-HTTPAPI/2.0`.

#### #33. IIS Web Server Version Disclosure (`Server: Microsoft-IIS/10.0`)
- **Alert ID:** `5582930` | **Severity:** Informational
- **URL:** `http://trvc.titan.in/`
- **Description:** Root HTTP service discloses `Server: Microsoft-IIS/10.0`.

#### Critical Infrastructure Risk: Publicly Exposed phpMyAdmin on Port 80
- **Identified in:** Alerts `#22`, `#23`, `#33` (`http://trvc.titan.in/index.php`)
- **Description:** The production domain runs an unencrypted HTTP web server hosting an administrative **phpMyAdmin** login portal directly on the public Internet. This exposes the database management interface to credential brute-forcing and automated botnet targeting.

---

## Part 3: Correlated Vulnerability Matrix

| Attack Vector / Security Category | Excel Privacy Sheet Finding | CSV Web Audit Finding | Combined Risk Level |
| :--- | :--- | :--- | :---: |
| **Object Authorization / IDOR** | `#1` Profile IDOR & `#2` Object BOLA (`Unsafe`) | `#7` Privilege Escalation (`High`) | **CRITICAL** |
| **Payload Encryption** | — | `#10` Hardcoded Secret Key in JS Bundle (`Critical`) | **CRITICAL** |
| **Stored Code Execution & Uploads** | `#4` File Storage Passed | `#11` SVG Stored XSS & `#12` Executable Upload | **HIGH** |
| **Client Storage & Credential Hygiene** | `#5` LocalStorage PII (`Unsafe`) | `#16` LocalStorage Session Data (`Medium`) | **HIGH** |
| **API Data Exposure (Over-Fetching)**| `#7` PII Over-Fetching (`Unsafe`) | `#2` JavaScript Source Disclosure (`Low`) | **MEDIUM** |
| **Infrastructure & Database Exposure**| — | phpMyAdmin on Port 80 (`http://trvc.titan.in/`) | **HIGH** |
| **Denial of Service** | — | `#29` TLS DHE Exhaustion (`High`) | **HIGH** |

---

## Part 4: Prioritized Remediation Roadmap

### Phase 1: Immediate Triage (Within 24–48 Hours)
1. **Rotate and Invalidate Exposed Encryption Keys:** Revoke the exposed client-side symmetric secret. Transition sensitive endpoints to standard HTTPS/TLS and remove client-side cryptographic secrets.
2. **Decommission Public phpMyAdmin:** Block access to `http://trvc.titan.in/index.php` at the firewall/IIS level, or restrict it strictly to an internal VPN management IP range.
3. **Disable DHE Cipher Suites:** Disable `TLS_DHE_RSA_*` suites in IIS/ARR to mitigate the D(HE)ater DoS vulnerability.

### Phase 2: Access Control & Authorization Hardening (Sprint 1)
1. **Implement Object-Level Authorization (BOLA/IDOR Fixes):** Validate session ownership across `/api/user/profile`, `/api/orders/{id}`, `/api/documents/{id}`, and `/api/invoices/{id}` before returning records.
2. **Restrict Role Permissions (Optometrist Boundary):** Ensure mutating endpoints (`POST /api/customers`, `DELETE /api/customers`) are restricted to administrator roles.
3. **Secure Video Stream Access:** Implement signed, expiring tokens for `/api/videos/{id}/stream`.
4. **Harden File Uploads:** Block `.exe` and `.svg` uploads on `/api/videos` and customer feedback endpoints. Validate MIME types and binary headers.

### Phase 3: Client Hygiene & Privacy Remediation (Sprint 2)
1. **Purge PII from LocalStorage:** Remove emails, usernames, and roles from browser `LocalStorage`. Use secure `HttpOnly` session cookies.
2. **Implement DTO Data Projection:** Refactor `/api/user/profile` and customer endpoints to return only the specific fields required by the UI.
3. **Shorten JWT Lifetimes & Enforce Password Policies:** Reduce JWT validity periods, support refresh tokens, and enforce standard password complexity (minimum 8 characters, mixed character types).

### Phase 4: Infrastructure & Header Hardening (Sprint 3)
1. **Deploy Strict CSP:** Remove `unsafe-inline`, `unsafe-eval`, and `localhost` entries from Content-Security-Policy headers.
2. **Strip Fingerprinting Headers:** Remove `X-Powered-By`, `Server`, and disable HTTP `OPTIONS` responses.
3. **Add Anti-Automation Protection:** Introduce CAPTCHA on the login endpoint to prevent automated brute-forcing.

