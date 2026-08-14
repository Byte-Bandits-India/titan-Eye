# Full End-to-End Implementation Plan: Direct In-Browser TeamViewer Remote Session (Store Email/UPN Auto-Mapping)

This document details the complete end-to-end implementation plan for embedding TeamViewer remote desktop control directly inside the Titan web application, leveraging existing store identity fields (`storeContactEmail` and `microsoftUpn`) for automatic store PC discovery and pairing.

---

## 1. System Overview & Architecture

The integration allows an **Optometrist** to remotely control a store's examination/phoropter PC directly from within the Titan browser interface without opening third-party desktop windows, mirroring the UX of `TeamsCallModal.tsx`.

By utilizing the store's Microsoft email (`storeContactEmail` or `microsoftUpn`), the TeamViewer session is **automatically routed to that specific store's PC** with zero manual code entry required by store staff.
---

## 2. Complete Detailed End-to-End Flows

### Flow 1: Session Initiation Flow (Optometrist Side)

1. **Trigger**: Optometrist views patient record in `OptomPatientDetails.tsx` and clicks the **TeamViewer** button.
2. **State Transition**: `isTeamViewerLoading` is set to `true` (renders a loading spinner on the button).
3. **Payload Extraction**: Frontend extracts the store identity from `selectedCustomer`:
   - `customerId: selectedCustomer.id`
   - `storeName: selectedCustomer.storeName`
   - `storeContactEmail: selectedCustomer.storeContactEmail || selectedCustomer.microsoftUpn`
4. **API Request**: Calls `POST /calls/teamviewer/start` with this payload.
5. **Modal Launch**: Upon receiving `{ sessionCode, webLink }`, state `teamViewerSession` is updated and `<TeamViewerModal />` opens in **Normal Mode**.

---

### Flow 2: Session Provisioning & Auto-Mapping (Backend & TeamViewer REST API)

1. Backend receives request from authenticated Optometrist session.
2. Backend identifies the target store email (`storeContactEmail` / `microsoftUpn`).
3. Backend calls TeamViewer REST API with the store email as the `end_customer`:
   - **URL**: `POST https://webapi.teamviewer.com/api/v1/sessions`
   - **Headers**: `Authorization: Bearer <TEAMVIEWER_API_TOKEN>`, `Content-Type: application/json`
   - **Payload**:
     ```json
     {
       "groupname": "Titan Retail Stores",
       "description": "Remote consultation for Customer #${customerId} at ${storeName}",
       "end_customer": {
         "name": "${storeName}",
         "email": "${storeContactEmail || microsoftUpn || 'support@titan.internal'}"
       }
     }
     ```
4. TeamViewer routes the session directly to the Store PC registered under that Microsoft email/UPN.
5. TeamViewer returns `code` (e.g. `"s01-892-123"`) and `supporter_link` (`"https://web.teamviewer.com/connect?code=s01-892-123"`).
6. Backend responds to the Optometrist with session details.

---

### Flow 3: In-Session Interaction & Multi-Window UX Flow

Once `<TeamViewerModal />` mounts, the Optometrist has 3 seamless modes:

1. **Normal Mode**:
   - Centered `max-w-6xl` glassmorphism modal overlay with dark slate theme matching Titan UI.
   - Header shows customer ID, store name, live pulsing indicator, session code, pop-out external link, minimize, fullscreen, and disconnect buttons.
2. **Fullscreen Mode**:
   - Expands to `100vw x 100vh` for maximum remote control precision when configuring eye equipment / phoropter software.
3. **Minimized Floating PiP Mode (Draggable Pill)**:
   - Clicking **Minus** minimizes the modal into a compact, draggable floating bar (`Call Active · TeamViewer #12345 (StoreName)`).
   - The `<iframe />` is maintained in a hidden DOM element (`<div className="hidden">`) so the active remote desktop connection, mouse focus, and WebRTC streaming are **never disconnected** while the optometrist navigates customer history, enters prescription data, or updates clinical feedback.

---

### Flow 4: Session Termination & Cleanup Flow

1. Optometrist clicks **Disconnect** in `<TeamViewerModal />` or closes the tab.
2. Frontend calls `POST /calls/teamviewer/end` with `{ customerId, sessionCode }`.
3. Backend marks session as closed on TeamViewer API (`PUT /api/v1/sessions/<code_id> { state: "closed" }`).
4. Frontend unmounts `<TeamViewerModal />` and displays a confirmation toast.

---

### Flow 5: Graceful Fallback Flow (Resilience & Edge Cases)

If the store email is missing or web client is blocked:

1. If `storeContactEmail` is empty, backend generates a standard session code and allows the store to connect via one-click link.
2. If the web client fails to load in the browser iframe, the frontend catches the error and dispatches the native desktop app launcher (`teamviewer10://`).

---

## 3. Potential Edge Cases & Solutions

| Potential Concern                                        | Risk Level | Solution / Mitigation                                                                                                                                                  |
| :------------------------------------------------------- | :--------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Store PC signed in with different email**              | Low        | In Step 3 of Outside Setup, ensure store PCs are signed into TeamViewer Host with their respective store Microsoft email (e.g. `store.chennai@titan.onmicrosoft.com`). |
| **Missing `storeContactEmail` on older customer record** | Very Low   | Backend provides fallback to `microsoftUpn` or generic session code generation.                                                                                        |
| **Iframe clipboard/screen capture permission**           | Low        | Iframe includes all required permission policies (`allow="display-capture; clipboard-read; clipboard-write; fullscreen..."`).                                          |

---

## 4. Outside Setup Required (Step-by-Step)

### Step 1: TeamViewer License & Management Console

1. Register/Sign in at [login.teamviewer.com](https://login.teamviewer.com).
2. Enable Microsoft Entra ID / Office 365 Single Sign-On (SSO) or sync store emails in the TeamViewer Management Console.

### Step 2: Generate Script Token (API Key)

1. Go to **Management Console** -> Profile (top right) -> **Edit profile** -> **Apps**.
2. Click **Create Script Token** with `Session Management` (Create, View, Edit) permissions.
3. Save the token as `TEAMVIEWER_API_TOKEN` in the backend environment.

### Step 3: Configure Store Endpoint Machines with Store Email

1. Install **TeamViewer Host** on the store exam PC.
2. Sign in to TeamViewer Host using the store's Microsoft email (`storeContactEmail` / `microsoftUpn`).
3. Enable "Grant Easy Access".

---

## 5. Source Code File Changes

### Component 1: Type Definitions

#### `src/types/index.ts`

```typescript
export type TeamViewerSessionPayload = {
  customerId: string;
  sessionCode: string;
  webLink: string;
  storeName?: string;
  storeContactEmail?: null | string;
  supporterLink?: string;
};
```

---

### Component 2: Shared Modal

#### `src/components/shared/TeamViewerModal.tsx`

- Full multi-window mode support (`normal`, `fullscreen`, `minimized`).
- Draggable header in minimized mode.
- Embedded iframe with full hardware permissions:
  ```html
  <iframe
    src="{session.webLink}"
    className="h-full w-full border-0"
    allow="camera; microphone; display-capture; clipboard-read; clipboard-write; autoplay; fullscreen"
    title="TeamViewer Web Client"
  />
  ```

---

### Component 3: Optometrist Screen Integration

#### `src/screens/optom/OptomPatientDetails.tsx`

- Add `teamViewerSession` state.
- Update `handleOpenTeamViewer` to pass `selectedCustomer.storeContactEmail || selectedCustomer.microsoftUpn` to `POST /calls/teamviewer/start`.
- Mount `<TeamViewerModal />` alongside `<TeamsCallModal />`.

---

## 6. Verification Plan

### Automated Verification

```bash
# Typecheck TypeScript files
npx tsc --noEmit
```

### Manual Verification

1. **Initiate**: Click **TeamViewer** button on patient detail screen -> verify request includes store email -> verify modal opens.
2. **Modes**: Test Normal -> Fullscreen -> Minimized PiP floating bar dragging -> Expand.
3. **Session Persistence**: Verify navigating fields while minimized does not reload or disconnect the remote session.
4. **Disconnect**: Verify clicking Disconnect closes modal cleanly.
