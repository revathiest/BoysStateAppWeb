# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Boys State App Web Admin Portal - A web-based administrative portal for Boys State programs. This is a static HTML/JavaScript frontend with a lightweight Node.js development server. In production, static files are served via Netlify while the backend API (separate repository) handles all business logic and data persistence.

**Important**: This project is NOT affiliated with or endorsed by the American Legion.

## Commands

### Development
```bash
npm start                # Start local dev server on port 8080
npm run dev:css          # Watch and compile Tailwind CSS
npm run build:css        # Build and minify Tailwind CSS for production
```

### Testing
```bash
npm test                 # Run Jest test suite with coverage
npm run lint             # Run ESLint
```

**Coverage requirements**: 80% minimum for branches, functions, lines, and statements. Tests are located in the `test/` directory and match the `**/?(*.)+(spec|test).[tj]s?(x)` pattern.

## Architecture

### Server Architecture (Development Only)

The Node.js server (`src/index.js`) is for **local development only** and is not deployed:

- **In-memory user store**: Users and programs exist only in memory (reset on restart)
- **Static file serving**: Serves HTML/CSS/JS from `public/` directory
- **Development endpoints**: Provides `/register`, `/login`, `/create-program`, `/api/programs`, `/api/zip-info`, and `/logs` endpoints for local testing
- **Cookie-based auth**: Uses simple cookie authentication (development only)
- **Zip/city/state lookup**: Loads `docs/zipData.json` at startup for address autocomplete

**Production**: Static files deployed to Netlify, all API calls go to the separate backend services repository.

### Client-Side Architecture

Pure vanilla JavaScript (no frameworks). Key patterns:

1. **Authentication** (`public/js/authHelper.js`):
   - JWT tokens stored in `sessionStorage` under `authToken`
   - `Authorization: Bearer` header sent with all API requests
   - `requireAuth()` runs on DOMContentLoaded to redirect if token expired
   - Token expiration checked via JWT `exp` claim

2. **API Configuration** (`public/js/config.js`):
   - `window.API_URL` defines backend endpoint for both browser and server
   - Switch between `http://localhost:3000` (dev) and production URL
   - Server automatically reads this file for server-side logging

3. **Logging System**:
   - **Server**: `src/logger.js` intercepts `console.*` and process errors, sends to backend `/logs`
   - **Client**: `public/js/clientLogger.js` intercepts browser `console.*`, sends to backend `/logs` via `window.logToServer()`
   - Both include programId, level (info/warn/error), source, and timestamp

4. **Module Pattern**:
   - Each HTML page has a corresponding JS file in `public/js/`
   - JS files use dual export pattern for Node (tests) and browser:
     ```javascript
     if (typeof module !== 'undefined' && module.exports) {
       module.exports = { ... };
     } else {
       window.functionName = functionName;
     }
     ```

### Application Builder System

Multi-file system for creating and managing delegate/staff application forms:

- **application-service.js**: Core API for creating/copying applications, ensures year exists, prevents duplicates
- **application-config.js**: Main UI controller for the application configuration page
- **application-builder.js**: Drag-and-drop form builder logic
- **application-field-types.js**: Defines all available field types (text, textarea, dropdown, file upload, etc.)
- **application-messages.js**: User-facing messages and validation strings
- **apply.js / apply-form.js / apply-validation.js / apply-submit.js**: Public application form logic (no auth required)
- **apply-address.js**: Address autocomplete using zip/city lookup
- **apply-utils.js**: Shared utilities

**Key concepts**:
- Applications are year-specific and type-specific (delegate vs staff)
- Can copy from previous year's application
- Questions have IDs auto-generated on backend
- Public application URLs are non-guessable (UUID-based)

### Program Management

- **Programs** are the top-level organizational unit
- Each user can belong to multiple programs with different roles (admin, counselor, delegate)
- `programId` is passed via URL params or stored in `localStorage` as `lastSelectedProgramId`
- Backend API scopes all data by program

### Pages and Features

Key pages (all in `public/` directory):
- `index.html` / `login.html` / `register.html`: Authentication
- `dashboard.html`: Program selection and main navigation
- `application-config.html`: Build/edit application forms
- `apply.html`: Public-facing application form (no auth)
- `programs-config.html`: Program settings and branding
- `branding-contact.html`: Contact info management
- `user-management.html`: Manage users and roles
- `logs.html`: View audit logs
- `console.html`: Developer console/logs viewer

## Configuration

### API Endpoint

Set `window.API_URL` in `public/js/config.js`:
- Used by browser for all API requests
- Also read by development server for server-side logging
- Single source of truth for API configuration
- Default port: 8080 (hardcoded in `src/index.js`)

### Content Security Policy

Server sets CSP header allowing connections to:
- `'self'`
- `http://localhost:3000`
- `https://boysstateappservices.up.railway.app`

Update `src/index.js:138` if backend URL changes.

### Tailwind Configuration

Custom colors defined in `tailwind.config.js`:
- `legend-blue`: #1B3D6D
- `legend-gold`: #FFD700

## Security and Compliance

- All portal access must be authenticated and authorized by role
- All actions are logged with sensitive data redacted
- No cross-program data access
- Adherence to COPPA, FERPA, GDPR for handling minor data
- Public application forms have CAPTCHA and rate limiting (backend)
- Public application URLs are non-sequential and regeneratable
- All file uploads scanned for malware (backend)

## Testing Standards

- **Automated tests required** for all new features and bug fixes
- **Coverage thresholds**: 80% minimum (do NOT decrease, increase coverage instead)
- **Files are NOT ignored** to boost coverage; write tests instead
- Security and integration tests required for admin features
- Regression tests required for bug fixes
- All tests in `test/` directory with `.test.js` or `.spec.js` suffix

## Tool Usage Guidelines for Claude Code

**CRITICAL**: Always respect dependencies when making tool calls to avoid API 400 errors:

### Sequential Tool Calls (Required When)
- Tool B depends on results from Tool A → wait for A to complete before calling B
- Reading a file before editing it → read first, analyze result, then edit
- Searching for files before reading specific matches → search first, then read
- Any operations on the same file or resource → always sequential

### Parallel Tool Calls (Only When)
- Reading completely independent files with no relationship
- Running searches in different, unrelated directories
- Operations that cannot possibly conflict or depend on each other

### When In Doubt
- **Default to sequential execution**
- Use the Task tool with specialized agents (Explore, Plan) for complex multi-step operations
- This avoids manual orchestration of dependent tool calls

**Example**: To analyze incomplete code, use `Task` with `Explore` agent rather than manually calling multiple Grep/Read/Glob operations that might conflict.

### Known Issues
- **Edit tool may fail**: If Edit tool fails even with files closed, use Write tool to rewrite entire file instead
- **File locking**: Close files in VS Code before requesting edits

## Known Incomplete Implementations

This section documents features that are partially implemented or missing:

### Missing Backend Endpoints

The dev server (`src/index.js`) only implements basic auth and program creation. The following endpoints are called by the frontend but NOT implemented:

**Application Management**:
- `GET /api/programs/{programId}/applications/delegate?status=pending`
- `GET /api/programs/{programId}/applications/staff?status=pending`
- `GET /api/programs/{programId}/applications/{type}/{id}`
- `POST /api/programs/{programId}/applications/{type}/{id}/accept`
- `POST /api/programs/{programId}/applications/{type}/{id}/reject`
- `POST /api/programs/{programId}/application` (create/update application config)
- `PUT /api/programs/{programId}/application` (save application config)

**Configuration Management**:
- `GET /api/branding-contact/{programId}`
- `PUT /api/branding-contact/{programId}`
- `GET /user-programs/{username}`
- `GET /programs/{programId}/years`
- `POST /programs/{programId}/years`

### Missing HTML Pages

Referenced in `programs-config.html` but not created:
- `programs-groupings.html`
- `programs-parties.html`
- `programs-positions.html`
- `programs-staff.html`
- `programs-parents.html`

### Dead Navigation Links

In `console.html`:
- "Manage Content" → `href="#"` (no implementation)
- "Manage Elections" → `href="#"` (no implementation)

### Planned Features

Features documented in PROJECT_OVERVIEW.md but not yet implemented:
- **Election Agent**: Admin interface for elections, ballots, results
- **Progress Tracking Agent**: Delegate milestone/award tracking
- **Integration Agents**: Google Calendar, Google Docs, Discord integrations

### Incomplete Features

1. **Application Review Workflow**: Frontend exists (`user-management.html`, `user-management.js`) but backend missing
   - No endpoints to fetch pending applications
   - No accept/reject implementation
   - No audit logging
   - No onboarding trigger for accepted applicants

2. **Branding Configuration**: Frontend exists (`branding-contact.html`, `branding-contact.js`) but backend missing

3. **Dashboard Feature Cards**: Three feature cards defined in `dashboard.html` (lines 22-35) but never properly displayed or linked

4. **Global Function Exposure**: `user-management.js` calls `window.getProgramId()` but `application-service.js` may not expose it globally in all contexts

5. **Year Copy Logic**: Backend endpoint `POST /programs/{programId}/years` supports `copyFromPreviousYear: boolean` to copy grouping/party/position activations from most recent year
   - Implementation in `BoysStateAppServices/src/routes/programYears.ts` lines 46-107
   - Copies from `ProgramYearGrouping`, `ProgramYearParty`, and `ProgramYearPosition` tables
   - **⚠️ VERIFY THIS LOGIC** when implementing groupings/parties/positions management pages - the copy behavior may need adjustment based on actual usage patterns

## Important Notes

1. **Local vs Production**: The Node.js server is for development only. Production uses Netlify for static hosting + separate backend API.

2. **In-Memory Data**: User accounts and programs created locally don't persist. They're stored in `createServer.userStore` in memory.

3. **Dual Backend**: Development server provides mock endpoints; real backend is at `API_URL`.

4. **Public Application Forms**: The `apply.html` page is accessed without authentication via non-guessable UUID links.

5. **ProgramId Context**: Many operations require a `programId`. It comes from URL params (`?programId=xyz`), `localStorage.lastSelectedProgramId`, or `window.selectedProgramId`.

6. **Authentication Flow**:
   - Register/Login → Backend returns JWT
   - Store JWT in `sessionStorage.authToken`
   - Include `Authorization: Bearer <token>` on all API requests
   - On token expiry, redirect to login

7. **Address Autocomplete**: Uses `docs/zipData.json` for city/state/zip lookups. Server loads this at startup and provides `/api/zip-info` endpoint.

8. **CORS**: Server sets CORS headers to allow cross-origin requests with credentials.

9. **Git Workflow**: Main branch is `main`, development happens on `development` branch.
