# Boys State App Web - Page Navigation Map

**Last Updated: 2026-01-26 (Added back link to user-management.html)**

> **Note**: This is a living document that will be kept up to date as pages are added, modified, or completed. Update this file whenever page status changes.

This document maps all pages in the admin portal, their navigation hierarchy, and implementation status.

## Page Navigation Hierarchy

### Entry Points (Authentication)
1. ✅ **login.html** - COMPLETE
   - Links to: register.html

2. ✅ **register.html** - COMPLETE
   - Links to: login.html

3. ✅ **dashboard.html** - COMPLETE
   - Program selector (redirects to console.html after selection)
   - No back link (top level)

---

### Admin Dashboard (Top Level)
4. ✅ **console.html** - COMPLETE
   - No back link (top level)
   - Links to:
     - user-management.html ✅
     - programs-create.html ✅
     - programs-config.html ✅
     - logs.html ✅
     - "#" Content Management ❌ (not implemented)
     - "#" Elections ❌ (not implemented)

---

### Level 2: Main Admin Sections

5. ✅ **user-management.html** - COMPLETE
   - ✅ Back link to console.html
   - Manages delegate/staff applications
   - Frontend complete, backend endpoints exist
   - Tab switching works correctly
   - CSP compliant

6. ✅ **programs-create.html** - COMPLETE
   - ✅ Back link to console.html
   - Create new program functionality

7. ✅ **programs-config.html** - COMPLETE
   - ✅ Back link to console.html
   - Links to (via JavaScript programId injection):
     - branding-contact.html ✅
     - application-config.html ✅
     - programs-groupings.html ❌ (not created)
     - programs-parties.html ❌ (not created)
     - programs-positions.html ❌ (not created)
     - programs-staff.html ❌ (not created)
     - programs-parents.html ❌ (not created)

8. ✅ **logs.html** - COMPLETE
   - ✅ Back link to console.html
   - Displays audit logs

---

### Level 3: Program Configuration Sub-Pages

9. ✅ **branding-contact.html** - COMPLETE
   - ✅ Back link to programs-config.html
   - Branding, colors, contact info
   - Backend API: ✅ Fully implemented

10. ✅ **application-config.html** - COMPLETE
    - ✅ Back link to programs-config.html
    - Application form builder
    - Backend API: ✅ Fully implemented

11. ❌ **programs-groupings.html** - NOT CREATED
    - Should have: Back link to programs-config.html
    - Backend API: ✅ Fully implemented
    - Purpose: Manage cities, counties, organizational groupings

12. ❌ **programs-parties.html** - NOT CREATED
    - Should have: Back link to programs-config.html
    - Backend API: ✅ Fully implemented
    - Purpose: Manage political parties for elections

13. ❌ **programs-positions.html** - NOT CREATED
    - Should have: Back link to programs-config.html
    - Backend API: ✅ Fully implemented
    - Purpose: Manage elected/appointed positions

14. ❌ **programs-staff.html** - NOT CREATED
    - Should have: Back link to programs-config.html
    - Backend API: ✅ Fully implemented
    - Purpose: Manage staff members and counselor roles

15. ❌ **programs-parents.html** - NOT CREATED
    - Should have: Back link to programs-config.html
    - Backend API: ✅ Fully implemented
    - Purpose: Manage parent/delegate account links

---

### Public Pages (No Authentication)

16. ✅ **apply.html** - COMPLETE
    - Public application form
    - No back link (external entry point)
    - Accessed via non-guessable UUID tokens

---

### Placeholder Pages (Referenced but Not Implemented)

17. ❌ **Content Management Page** - NOT CREATED
    - Should have: Back link to console.html
    - Backend API: Partially implemented
    - Purpose: Manage schedules, announcements, resources

18. ❌ **Elections Page** - NOT CREATED
    - Should have: Back link to console.html
    - Backend API: ✅ Fully implemented
    - Purpose: Set up and manage elections, ballots, results

---

## Implementation Status Summary

### ✅ Complete Pages (11)
- login.html
- register.html
- dashboard.html
- console.html
- programs-create.html
- programs-config.html
- logs.html
- branding-contact.html
- application-config.html
- apply.html
- user-management.html

### ❌ Missing Pages with Backend Ready (7)
All of these have fully implemented backend APIs and just need frontend pages created:

1. **programs-groupings.html** (Backend ✅)
   - CRUD for cities, counties, organizational units
   - Endpoints: GET/POST/PUT/DELETE `/api/programs/:programId/groupings`

2. **programs-parties.html** (Backend ✅)
   - CRUD for political parties
   - Endpoints: GET/POST/PUT/DELETE `/api/programs/:programId/parties`

3. **programs-positions.html** (Backend ✅)
   - CRUD for elected/appointed positions
   - Endpoints: GET/POST/PUT/DELETE `/api/programs/:programId/positions`

4. **programs-staff.html** (Backend ✅)
   - CRUD for staff members
   - Endpoints: GET/POST/PUT/DELETE `/api/programs/:programId/staff`

5. **programs-parents.html** (Backend ✅)
   - Manage parent accounts and delegate links
   - Endpoints: GET/POST/PUT/DELETE `/api/programs/:programId/parents`

6. **Content Management Page** (Backend Partial)
   - Schedules, announcements, resources
   - Some endpoints may need completion

7. **Elections Page** (Backend ✅)
   - Full election management system
   - Endpoints: GET/POST/PUT/DELETE `/api/programs/:programId/elections`

---

## Navigation Patterns

### Standard Back Link Pattern
All sub-pages should include this back link at the top of `<main>`:

```html
<a href="[parent-page].html" class="inline-flex items-center text-legend-blue font-semibold mb-4 hover:underline group self-start">
  <span class="mr-2 text-lg">&larr;</span>
  Back to [Parent Page Name]
</a>
```

### Program ID Handling
Pages under Program Configuration receive programId via:
- URL parameter: `?programId=xxx`
- Injected by JavaScript in programs-config.js via `updateConfigLinks()`

### Standard Page Structure
All admin pages should include:
1. Navigation bar with logout button
2. Back link (except top-level pages)
3. Main content area
4. Footer with copyright notice
5. Standard scripts: config.js, authHelper.js, clientLogger.js (if needed)

---

## Next Steps

### Priority 1: Create Missing Configuration Pages
Based on backend API completeness, recommended order:

1. **programs-groupings.html** - Essential for organizational structure
2. **programs-parties.html** - Required for elections
3. **programs-positions.html** - Required for elections
4. **programs-staff.html** - Important for team management
5. **programs-parents.html** - Important for user management
6. **Elections Page** - Feature-complete backend ready
7. **Content Management Page** - May need backend completion first

### Priority 3: Testing
- [ ] Test all navigation paths
- [ ] Verify programId propagation through all pages
- [ ] Test CSP compliance on all pages
- [ ] Verify authentication on all protected pages

---

## Design Patterns to Follow

### Page Template
Use existing pages as templates:
- **Simple CRUD page**: branding-contact.html as template
- **Table/list page**: user-management.html as template
- **Form builder page**: application-config.html as template

### CSS Framework
- Use Tailwind CSS exclusively (no inline styles)
- Use `hidden` class for visibility control
- Custom colors: `legend-blue`, `legend-gold`

### JavaScript Patterns
- Use addEventListener (no inline onclick)
- Use classList.add/remove('hidden') for visibility
- Export for both Node (tests) and browser
- Wrap in IIFE if needed to avoid global pollution

### Security
- All pages CSP compliant
- No inline scripts or styles
- No inline event handlers
- JWT authentication required (except apply.html)

---

## Document Maintenance

**This document should be updated whenever:**
- A new page is created (add to appropriate section with ✅ status)
- A page is completed (update status from ❌ to ✅)
- Navigation links are added or changed (update back link information)
- Backend APIs are implemented (update "Backend API" status)
- Page structure or purpose changes significantly

**Update the "Last Updated" date at the top when making changes.**

This ensures the navigation map remains an accurate reference for all development sessions.
