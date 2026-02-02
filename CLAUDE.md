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
- **Required system fields**: First Name, Last Name, and Email are automatically added to all applications and cannot be removed (marked with `isSystemField: true`)

### Program Management

- **Programs** are the top-level organizational unit
- Each user can belong to multiple programs with different roles (admin, counselor, delegate)
- `programId` is passed via URL params or stored in `localStorage` as `lastSelectedProgramId`
- Backend API scopes all data by program

### Pages and Features

Key pages (all in `public/` directory):
- `index.html` / `login.html` / `register.html`: Authentication
- `dashboard.html`: Program selection and main navigation
- `console.html`: Main navigation hub after login
- `application-config.html`: Build/edit application forms
- `application-review.html`: Review and accept/reject applications
- `apply.html`: Public-facing application form (no auth)
- `programs-config.html`: Program settings hub
- `programs-create.html`: Create new programs
- `programs-parties.html`: Political party management
- `programs-groupings.html`: Organizational groupings (cities, counties)
- `programs-positions.html`: Elected/appointed positions
- `programs-year-config.html`: Year-specific configuration
- `branding-contact.html`: Contact info management
- `user-management.html`: Manage users and application review
- `logs.html`: View audit logs

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

**Custom Colors** defined in `tailwind.config.js`:
- `legend-blue`: #1B3D6D
- `legend-gold`: #FFD700

**Custom Semantic Classes** using `@apply` in `src/styles/tailwind.css`:
- Component classes replace long utility strings for better readability
- Defined in `@layer components` for proper precedence
- Source file: `src/styles/tailwind.css`
- Compiled output: `public/tailwind.css`
- Build command: `npm run build:css`
- Watch command: `npm run dev:css`

**Key semantic classes**:
- **Cards**: `.card`, `.card-blue-accent`, `.card-hover`, `.card-planned`
- **Buttons**: `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-cancel`
- **Forms**: `.form-input`, `.form-label`, `.form-select`, `.form-checkbox`
- **Messages**: `.message-error`, `.message-success`, `.message-info`
- **Layout**: `.nav-bar`, `.page-main`, `.footer`
- **Typography**: `.heading-page`, `.heading-section`, `.text-muted`
- **Badges**: `.badge-active`, `.badge-planned`

**Example**:
```html
<!-- Before: Long utility strings -->
<div class="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-legend-gold">

<!-- After: Semantic class -->
<div class="card">
```

This approach maintains Tailwind's utility-first benefits while improving code readability and making global style changes easier.

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

Referenced but not yet created:
- `programs-staff.html` - Staff management interface
- `programs-parents.html` - Parent management interface

### Recently Implemented Pages

- `programs-parties.html` - Political parties management (Federalists/Nationalists defaults)
- `programs-groupings.html` - Organizational groupings management (cities, counties, districts)
- `programs-positions.html` - Elected/appointed positions management
- `programs-year-config.html` - Year-specific configuration and activation
- `user-management.html` - User management landing page with feature cards
- `application-review.html` - Application review interface for accepting/rejecting applications

### Dead Navigation Links

In `console.html`:
- "Manage Content" → `href="#"` (no implementation)
- "Manage Elections" → `href="#"` (no implementation)

### Planned Features

Features documented in PROJECT_OVERVIEW.md but not yet implemented:
- **Election Agent**: Admin interface for elections, ballots, results
- **Progress Tracking Agent**: Delegate milestone/award tracking
- **Integration Agents**: Google Calendar, Google Docs, Discord integrations
- **Performance Evaluation**: Investigate slowness - could be resources, network, or code inefficiency
- ~~**Bug: Primary runoff display**: Runoffs created from primaries don't show as "Primary Runoff"~~ ✅ Fixed - backend now sets `primary_runoff` type, frontend displays appropriately

**Primary Election Models** (planned):
- **Open Primary**: Any voter can vote in any party's primary
- **Closed Primary**: Only registered party members can vote in their party's primary
- **Semi-Open Primary**: Voters can choose which party's primary to vote in at the polls
- **Blanket/Jungle Primary**: All candidates on single ballot regardless of party

**Primary Advancement Models** (planned - for primaries only):
- **Top 2**: Top 2 vote-getters from primary advance to general election (regardless of party)
- **Top 4 with IRV**: Top 4 from primary advance, general election uses Instant Runoff Voting

### Architecture Note: Year-Specific Tables

**CRITICAL**: The base `Position`, `Grouping`, and `Party` tables should ONLY be used as templates when initially setting up a year's configuration. All runtime logic MUST use year-specific tables:
- `ProgramYearPosition` (not `Position`)
- `ProgramYearGrouping` (not `Grouping`)
- `ProgramYearParty` (not `Party`)

The base tables are essentially "defaults" - only used for a "reset to default" option or initial year setup. Even when setting up a new year, we typically copy from the previous year rather than from base tables.

**Known violations to fix**:
- `elections.ts:128-130` - Filters by `position.isElected` instead of `ProgramYearPosition.isElected`
- `elections.ts:2043` - Same issue
- `elections.ts:678-680, 1407-1409` - Accesses `position.requiresDeclaration/requiresPetition/petitionSignatures`
- `bulkOperations.ts` - Multiple queries to base `grouping` and `party` tables
- `elections.ts:578` - Close all nominations queries base `grouping` table

### Incomplete Features

1. **Application Review Workflow**: ✅ Now implemented
   - Backend endpoints exist in `applicationReviews.ts` for listing, viewing, accepting, and rejecting applications
   - Accept creates Delegate (with `status: 'pending_assignment'`, no grouping) or Staff (with role) records
   - Audit logging included
   - **Remaining**: Delegate random assignment to groupings not yet implemented

2. **Branding Configuration**: Frontend exists (`branding-contact.html`, `branding-contact.js`) but backend missing

3. **Dashboard Feature Cards**: Three feature cards defined in `dashboard.html` (lines 22-35) but never properly displayed or linked

4. **Global Function Exposure**: `user-management.js` calls `window.getProgramId()` but `application-service.js` may not expose it globally in all contexts

5. **Year Copy Logic**: Backend endpoint `POST /programs/{programId}/years` supports `copyFromPreviousYear: boolean` to copy grouping/party/position activations from most recent year
   - Implementation in `BoysStateAppServices/src/routes/programYears.ts` lines 46-107
   - Copies from `ProgramYearGrouping`, `ProgramYearParty`, and `ProgramYearPosition` tables
   - **⚠️ VERIFY THIS LOGIC** when implementing groupings/parties/positions management pages - the copy behavior may need adjustment based on actual usage patterns

6. **ProgramYear Creation Inconsistency**: Years can be created from two different places with potentially different behavior:
   - **Program Configuration** (`programs-year-config.html`): Direct year creation via `POST /programs/{programId}/years` with optional `copyFromPreviousYear` flag
   - **Application Configuration** (`application-service.js`): Year created implicitly when creating an application for a new year
   - **Application Acceptance** (`applicationReviews.ts`): Year auto-created if it doesn't exist when accepting an application
   - **⚠️ TODO**: Audit these paths to ensure consistent behavior, or consolidate to a single creation point

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

## Common Bug Patterns to Avoid

### 1. Missing programId in Navigation Links

**Problem**: When adding new pages accessible from `programs-config.html`, the link must be added to the `updateConfigLinks()` function in `programs-config.js`. Otherwise, the link will not include the `programId` parameter, causing the new page to fall back to `localStorage.lastSelectedProgramId`, which may be stale or belong to a different program.

**Symptoms**:
- 403 Forbidden errors from backend API
- "Access denied" or permission errors
- Wrong program data loaded on the page

**Fix Pattern**:
1. Add an `id` attribute to the link in `programs-config.html`
2. Update the `updateConfigLinks()` function in `programs-config.js` to include:
```javascript
const yourNewLink = document.getElementById("yourNewLinkId");
if (yourNewLink) {
  yourNewLink.href = `your-new-page.html?programId=${encodeURIComponent(programId)}`;
}
```

**Example**: The `groupingsLink` was initially missing from `updateConfigLinks()`, causing 403 errors when accessing the groupings page.

### 2. Auth Functions Not Exposed Globally

**Problem**: Functions in `authHelper.js` that are used by multiple pages must be exposed on the `window` object for browser use, not just exported for Node modules.

**Symptoms**:
- `ReferenceError: functionName is not defined` in browser console
- Missing Authorization headers in API requests

**Fix Pattern**: Ensure all auth helper functions are added to the browser context in the `else` block of `authHelper.js`:
```javascript
} else {
  window.functionName = functionName;
  // ... other exports
}
```

**Example**: `getAuthHeaders` was initially only exported for Node modules, causing it to be undefined in browser context.

### 3. Required System Fields in Application Builder

**Requirement**: All applications (delegate and staff) MUST have three required system fields that cannot be removed:
- **First Name** (short_answer, required)
- **Last Name** (short_answer, required)
- **Email** (email, required)

**Implementation**: `application-builder.js` ensures these fields are always present at the top of the question list with `isSystemField: true`. The backend (`applicationReviews.ts`) uses these fields when accepting applications to create Delegate/Staff records and user accounts.

**Symptoms if missing**:
- "Application is missing required fields (First Name, Last Name, Email)" error on acceptance
- Unable to create user accounts for accepted applicants

### 4. Stale localStorage programId

**Problem**: After login, if the user previously selected a program that no longer exists or they no longer have access to, `localStorage.lastSelectedProgramId` will contain a stale value causing API errors.

**Symptoms**:
- 204 No Content or 403 Forbidden from API
- "Program not found" errors
- Wrong program data or no data loaded

**Fix Pattern**: Pages that load programs should validate and correct stale localStorage:
```javascript
// After fetching user's programs
const currentProgramId = localStorage.getItem('lastSelectedProgramId');
const validProgram = programs.find(p => (p.programId || p.id) === currentProgramId);

if (!validProgram && programs.length > 0) {
  // Auto-select first available program
  const programId = programs[0].programId || programs[0].id;
  localStorage.setItem('lastSelectedProgramId', programId);
}
```

**Implementation locations**:
- `console.js`: Auto-selects program after login
- `dashboard.js`: Sets programId when user clicks a program
- `programs-config.js`: Corrects stale values when loading program list

### 5. CSP Blocks Inline Styles

**Problem**: The server's Content Security Policy (CSP) blocks inline styles. When generating HTML with template literals, using `style="..."` attributes will be blocked by CSP.

**Symptoms**:
- Console error: `Applying inline style violates the following Content Security Policy directive 'style-src 'self'...`
- Dynamic width/height styles not applied (e.g., progress bars stuck at 0%)
- Visual elements not rendering correctly

**Fix Pattern**: Instead of inline style attributes in HTML strings, use JavaScript to set styles via the DOM after inserting the HTML:

```javascript
// BAD - CSP will block this
container.innerHTML = `<div class="bar" style="width: ${percent}%"></div>`;

// GOOD - Apply style via JavaScript
container.innerHTML = `<div class="bar" data-width="${percent}"></div>`;
const bar = container.querySelector('.bar');
bar.style.width = percent + '%';
```

**Common locations where this occurs**:
- Progress bars with dynamic widths
- Charts/graphs with dynamic sizing
- Any dynamically generated visual elements

**Note**: Setting `element.style.width` via JavaScript is allowed; only inline `style="..."` attributes in HTML are blocked.
