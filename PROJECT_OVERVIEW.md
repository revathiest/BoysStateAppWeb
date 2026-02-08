# State Forge - Web Admin Portal
## Project Overview & Specification

**Last Updated**: 2026-01-27
**Status**: Active Development
**Version**: 1.0 (MVP Phase)

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Project Goals](#project-goals)
3. [System Architecture](#system-architecture)
4. [User Roles & Permissions](#user-roles--permissions)
5. [Core Features](#core-features)
6. [Data Model](#data-model)
7. [Application Workflow](#application-workflow)
8. [Technical Stack](#technical-stack)
9. [Security & Compliance](#security--compliance)
10. [Current Implementation Status](#current-implementation-status)
11. [Future Roadmap](#future-roadmap)

---

## Executive Summary

The State Forge Web Admin Portal is a comprehensive management system for American Legion Boys State programs. It enables program administrators to:

- Configure and manage their Boys State programs year-over-year
- Create and distribute application forms for delegates and staff
- Review and accept/reject applications
- Organize participants into cities, counties, and political parties
- Configure elected and appointed positions
- Manage elections and voting (future)
- Track program activities through audit logs

**Important**: This project is NOT affiliated with or endorsed by the American Legion.

### What is Boys State?

Boys State is an American Legion-sponsored youth leadership program where high school students participate in a week-long mock government experience. Students are organized into cities and counties, form political parties, campaign for offices, and learn about democratic processes through hands-on participation.

---

## Project Goals

### Primary Goals
1. **Simplify Program Management**: Reduce administrative burden on program directors
2. **Standardize Operations**: Provide consistent tooling across different state programs
3. **Digital Transformation**: Move from paper-based applications to digital workflows
4. **Data Integrity**: Maintain accurate records with audit trails
5. **Scalability**: Support multiple programs across different states/regions

### Success Metrics
- Reduce application processing time by 80%
- Enable 100% digital application submission and review
- Support 10+ concurrent programs initially
- Maintain 99.9% uptime during program sessions
- Complete audit trails for all administrative actions

---

## System Architecture

### Three-Tier Architecture

```
┌─────────────────────────────────────────┐
│   Web Admin Portal (Static HTML/JS)    │  ← Netlify
│   - Program Configuration               │
│   - Application Management              │
│   - User Administration                 │
└─────────────────────────────────────────┘
                    ↓ HTTPS/REST API
┌─────────────────────────────────────────┐
│   Backend Services (Node.js/Express)   │  ← Railway
│   - JWT Authentication                  │
│   - Business Logic                      │
│   - API Endpoints                       │
└─────────────────────────────────────────┘
                    ↓ Prisma ORM
┌─────────────────────────────────────────┐
│   PostgreSQL Database                   │
│   - Program Data                        │
│   - User Accounts                       │
│   - Application Responses               │
│   - Audit Logs                          │
└─────────────────────────────────────────┘
```

### Component Breakdown

**Web Portal (Frontend)**
- Static HTML pages with vanilla JavaScript
- Tailwind CSS for styling
- No framework dependencies (pure JS)
- CSP-compliant (no inline scripts/styles)
- Responsive design for desktop/tablet

**Backend Services**
- RESTful API with Express.js
- Prisma ORM for database access
- JWT-based authentication
- Role-based access control
- Comprehensive logging system

**Database**
- PostgreSQL for relational data
- Normalized schema with foreign keys
- Audit log tables for compliance
- Indexes for performance

---

## User Roles & Permissions

### Role Hierarchy

1. **System Administrator** (Future)
   - Manage all programs across the system
   - Create new program accounts
   - System-wide configuration

2. **Program Administrator**
   - Full control over **one program** (1:1 relationship)
   - Create multiple program years (e.g., 2024, 2025, 2026)
   - Create/edit application forms for each year
   - Accept/reject applications
   - Manage groupings, parties, positions
   - Assign roles to other users
   - View all logs

3. **Program Counselor** (Future)
   - View applications
   - Assigned to specific groupings (cities/counties)
   - Limited administrative functions
   - Cannot modify program configuration

4. **Delegate** (Future - Mobile App)
   - View their assigned city/county
   - Campaign for positions
   - Vote in elections
   - View schedule and announcements

5. **Parent** (Future - Mobile App)
   - View their delegate's information
   - Receive notifications:
     - Delegate elected to office (primary or general elections)
     - Delegate appointed to position
     - Delegate unsuccessful in bid for office
     - Additional notifications as features are added
   - View schedule
   - Limited access

### Current Implementation
- Only Program Administrator role fully implemented
- Authentication system in place
- Foundation for role-based permissions exists in schema

---

## Core Features

### 1. Authentication & User Management ✅

**Current Status**: Complete

- User registration and login
- JWT token-based authentication
- Session management with httpOnly cookies
- Password hashing (bcrypt)
- Token expiration and refresh

**Pages**:
- `login.html` - User login
- `register.html` - New user registration
- `dashboard.html` - Program selection dashboard

### 2. Program Management ✅

**Current Status**: Complete

**Features**:
- Create new programs
- Multiple programs per user
- Year-based program organization
- Copy configuration from previous years

**Pages**:
- `programs-create.html` - Create new program
- `programs-config.html` - Main configuration hub

**Data Model**:
```
Program
├── Basic Info (name, year, status)
├── Years (2024, 2025, etc.)
├── Users (assignments with roles)
└── Configuration
    ├── Branding & Contact
    ├── Applications
    ├── Groupings
    ├── Parties
    ├── Positions
    └── Staff
```

### 3. Application Management ✅

**Current Status**: Fully Functional

**Features**:
- Drag-and-drop form builder
- Field types: text, paragraph, email, phone, number, dropdown, radio, checkbox, date, date range, file upload, address, boolean, section headers, static text
- Question ordering and required fields
- Copy applications from previous years
- Public application URLs with encoded tokens
- Closing date configuration
- Question locking when responses exist
- Bulk response deletion to unlock editing

**Application Types**:
- **Delegate Applications**: For student participants
- **Staff Applications**: For counselors and program staff

**Pages**:
- `application-config.html` - Form builder/editor
- `apply.html` - Public-facing application form

**Workflow**:
```
1. Admin creates application form
   ↓
2. Admin generates public URL with token
   ↓
3. Applicants fill out form (no login required)
   ⚠️  Email address REQUIRED on all applications (used for login)
   ↓
4. Responses saved to database with status='pending'
   ↓
5. Admin reviews applications in user-management.html
   ↓
6. Admin accepts or rejects
   ↓
7. [PLANNED] On acceptance:
   - Create Delegate/Staff record (assigned to grouping)
   - Create User account with email from application
   - Send welcome email with first-time login instructions
   - User must set password on first login
   - User can then access mobile app
```

**CRITICAL REQUIREMENT**: All applications (delegate and staff) MUST include email as a required field. Email is used to create user accounts for accepted applicants.

### 4. Application Review & Acceptance ✅

**Current Status**: Functional (Partial)

**Features Implemented**:
- ✅ View pending applications (delegate and staff)
- ✅ Tab switching between application types
- ✅ View detailed application responses in modal
- ✅ Accept applications with styled confirmation
- ✅ Reject applications with styled confirmation
- ✅ Status filtering (accepted/rejected removed from pending list)
- ✅ Extract and display: Name, Email, Phone, School/Role
- ✅ Name formatting as "Last, First"

**Missing Features**:
- ❌ Create Delegate record on delegate acceptance (requires groupings and parties)
- ❌ Create Staff record on staff acceptance (requires groupings, admin assigns role)
- ❌ Create User account on acceptance with email from application
- ❌ First-time login flow (password setup)
- ❌ Welcome email with login instructions
- ❌ Email notifications to applicants (acceptance/rejection)
- ❌ View accepted/rejected applications (separate tabs)
- ❌ Bulk accept/reject
- ❌ Export applications to CSV

**Pages**:
- `user-management.html` - Application review interface

**Blocking Dependencies**:
- Cannot create Delegate/Staff records until groupings are configured (delegates/staff must be assigned to a grouping)
- User account creation requires email address from application (must be required field)

### 5. Branding & Contact Management ✅

**Current Status**: Complete

**Features**:
- Custom welcome message
- Logo, icon, banner URLs
- Color customization (primary, secondary, background)
- Contact information (email, phone, website, Facebook)
- Audit trail for changes

**Pages**:
- `branding-contact.html` - Branding configuration

### 6. Organizational Structure ❌

**Current Status**: Not Implemented (Backend Ready)

**Purpose**: Define the hierarchical organization of the program

**Grouping Hierarchy** (Example):
```
State (top level - parentGroupingId = null)
└── District (optional mid level)
    └── County (mid level)
        └── City (lowest level)
```

**Hierarchical Levels** (from top to bottom):
- State (top level - always exists, parentGroupingId = null)
- District (optional - may contain multiple counties)
- County (typical mid level)
- City (typical lowest level)
- Other custom levels as needed by program

**Note**: Even state-level positions (Governor, etc.) are assigned to the top-level "State" grouping.

**IMPORTANT: Delegate Assignment Logic**:
- Delegates are assigned ONLY to their **lowest level grouping** (e.g., "Springfield")
- All parent groupings are **automatically inherited** through the hierarchy
- Example: Delegate assigned to "Springfield" (city) automatically belongs to:
  - "Sangamon County" (parent county)
  - "Central District" (parent district)
- No need to store multiple grouping assignments per delegate
- Single `programYearGroupingId` field references the activated grouping for that year

**Features Needed**:
- Create groupings with parent-child relationships (hierarchy inferred from parentGroupingId)
- Visual tree/hierarchy display in admin interface
- Drag-and-drop or nested UI for organizing groupings
- Assign display order within same parent
- Status management (active/retired toggle)
- Activate groupings for specific years
- Show usage statistics (how many delegates/staff assigned to each grouping)
- Validation: prevent circular references in parent chain
- Filtering: show only active vs show all

**Data Model (Two-Tier System)**:
```
Grouping (program-level - define once)
├── id
├── programId (which program this belongs to)
├── name (e.g., "Springfield", "Sangamon County", "Central District")
├── parentGroupingId (self-referential - creates hierarchy, null = top level)
├── displayOrder (ordering within same parent)
├── status (active/retired - retired groupings cannot be activated for new years)
├── createdDate
└── notes (optional - for admin reference)

ProgramYearGrouping (year-level activation - junction table)
├── id
├── programYearId (which year this activation applies to)
├── groupingId (which grouping is being activated)
├── status (active/inactive - controls if available for assignments in THIS year)
└── delegates/staff (linked to this activated grouping)

Example: Two-tier system with year-specific activation
  Program-level:
    Grouping { id: 1, name: "Central District", parentGroupingId: null, status: "active" }
    └── Grouping { id: 2, name: "Sangamon County", parentGroupingId: 1, status: "active" }
        └── Grouping { id: 3, name: "Springfield", parentGroupingId: 2, status: "active" }
        └── Grouping { id: 4, name: "Old Town", parentGroupingId: 2, status: "active" }

  Year 2024 Activation:
    ProgramYearGrouping { programYearId: 1, groupingId: 1, status: "active" }
    ProgramYearGrouping { programYearId: 1, groupingId: 2, status: "active" }
    ProgramYearGrouping { programYearId: 1, groupingId: 3, status: "active" }
    ProgramYearGrouping { programYearId: 1, groupingId: 4, status: "active" }

  Year 2026 Activation (Old Town not used this year):
    ProgramYearGrouping { programYearId: 2, groupingId: 1, status: "active" }
    ProgramYearGrouping { programYearId: 2, groupingId: 2, status: "active" }
    ProgramYearGrouping { programYearId: 2, groupingId: 3, status: "active" }
    (Old Town not activated for 2026)

Delegate (2024) { programYearGroupingId: 4 } → "Old Town" (valid for 2024)
Delegate (2026) { programYearGroupingId: ??? } → can only select activated groupings for 2026
```

**Managing Groupings Over Time**:

**Two-Tier Workflow**:
1. **Create at program level**: Define all groupings once (available across all years)
2. **Activate for specific years**: Choose which groupings to use for each year

**Status field meanings**:
- **Program-level status** (active/retired):
  - **active**: Can be activated for new years
  - **retired**: Cannot be activated for new years (historical activations preserved)
- **Year-level status** (active/inactive):
  - **active**: Available for delegate/staff assignments in this specific year
  - **inactive**: Not available for assignments in this year

**Adding a new grouping** (e.g., new city "Chatham"):
1. Create Grouping { name: "Chatham", parentGroupingId: 2, status: "active" } at program level
2. Activate for current year: Create ProgramYearGrouping { programYearId: current, groupingId: newId, status: "active" }
3. Now available for assignments in current year
4. Can be activated for future years as needed

**Not using a grouping for a year** (e.g., "Old Town" not used in 2026):
1. Simply don't activate "Old Town" for 2026 (no ProgramYearGrouping record created)
2. Historical delegates from 2024/2025 still reference their ProgramYearGrouping records
3. New delegates in 2026 cannot select "Old Town" (not activated)
4. Can re-activate "Old Town" for 2027 if needed

**Retiring a grouping permanently** (e.g., "Old Town" eliminated):
1. Update Grouping { id: 4, status: "retired" } at program level
2. Historical ProgramYearGrouping records preserved (2024/2025 delegates unaffected)
3. Cannot be activated for any new years
4. Can be un-retired if circumstances change

**Benefits**:
✅ Flexibility - different groupings per year without affecting history
✅ No need to deactivate - just don't activate for certain years
✅ Historical integrity - old delegates always reference valid year-specific activations
✅ Clean year-over-year configuration
✅ Easy to add/remove groupings per year
✅ Parent relationships maintained at program level

**Admin Workflow for Groupings**:

**Program-Level Management** (programs-groupings.html):
1. Admin creates/edits groupings at program level
2. System shows all groupings (active and retired)
3. Admin can:
   - **Create new** groupings (default to active)
   - **Edit** grouping names/hierarchy
   - **Mark as retired** (cannot be activated for new years)
   - **Mark as active** (can be activated for new years)
4. Changes affect which groupings are available for year activation

**Year-Level Activation** (programs-year-config.html):
1. Admin selects a program year (e.g., 2026)
2. System shows all active program-level groupings
3. Admin checks which groupings to activate for this year
4. System creates ProgramYearGrouping records for selected groupings
5. Only activated groupings available for delegate/staff assignments in that year

**UI Recommendations**:
- **Program-level page**: Show status badges: "Active" (green), "Retired" (gray)
- **Year-level page**: Show checkboxes for activating groupings per year
- Allow filtering: "Show only active" vs "Show all groupings"
- Warn when editing grouping names: "This will change the name for all historical records"
- Show usage count per year: "Used by 45 delegates in 2024, 52 in 2025"
- Prevent retiring if activated for any year (must deactivate from years first)

**Pages Needed**:
- `programs-groupings.html` - CRITICAL: Manage program-level groupings
- `programs-year-config.html` - CRITICAL: Activate groupings for specific years

**Why It's Critical**:
- Delegates MUST be assigned to an activated grouping (their most specific city/location)
  - Assigned to LOWEST level → inherit UP to all parent groupings
- Staff MUST be assigned to an activated grouping (can be any level: city, county, district, or state)
  - Assigned to ANY level → oversee DOWN to all child groupings
  - Example: District staff oversees all counties and cities in that district
- Elections happen at grouping level (city elections, county elections, etc.)
- Positions are linked to activated groupings
- Reporting and analytics grouped by organizational hierarchy

### 7. Party Management ✅

**Current Status**: Implemented (Frontend and Backend)

**Purpose**: Configure political parties for elections

**Features Implemented**:
- Create parties (typically 2, e.g., "Federalist", "Nationalist")
- Party attributes: name, color
- Status management (active/retired toggle)
- Default party setup (Federalists blue, Nationalists red)
- Activate parties for specific years
- Show usage statistics (how many delegates per party per year)

**Data Model (Two-Tier System)**:
```
Party (program-level - define once)
├── id
├── programId (which program owns this party)
├── name (e.g., "Federalist Party")
├── abbreviation (e.g., "FED")
├── color (hex code for UI)
├── icon (optional URL)
├── displayOrder
├── status (active/retired - retired parties cannot be activated for new years)
└── createdDate

ProgramYearParty (year-level activation - junction table)
├── id
├── programYearId (which year this activation applies to)
├── partyId (which party is being activated)
├── status (active/inactive - controls if available for assignments in THIS year)
└── delegates (linked to this activated party)

Example: Two-tier system with year-specific activation
  Program-level:
    Party { id: 1, name: "Federalist Party", abbreviation: "FED", status: "active" }
    Party { id: 2, name: "Nationalist Party", abbreviation: "NAT", status: "active" }
    Party { id: 3, name: "Old Whig Party", abbreviation: "WHIG", status: "active" }

  Year 2024 Activation:
    ProgramYearParty { programYearId: 1, partyId: 1, status: "active" }
    ProgramYearParty { programYearId: 1, partyId: 2, status: "active" }
    ProgramYearParty { programYearId: 1, partyId: 3, status: "active" }

  Year 2026 Activation (Old Whig Party not used this year):
    ProgramYearParty { programYearId: 2, partyId: 1, status: "active" }
    ProgramYearParty { programYearId: 2, partyId: 2, status: "active" }
    (Old Whig Party not activated for 2026)

Delegate (2024) { programYearPartyId: 3 } → "Old Whig Party" (valid for 2024)
Delegate (2026) { programYearPartyId: ??? } → can only select activated parties for 2026
```

**Managing Parties Over Time**:

**Two-Tier Workflow**:
1. **Create at program level**: Define all parties once (available across all years)
2. **Activate for specific years**: Choose which parties to use for each year

**Status field meanings**:
- **Program-level status** (active/retired):
  - **active**: Can be activated for new years
  - **retired**: Cannot be activated for new years (historical activations preserved)
- **Year-level status** (active/inactive):
  - **active**: Available for delegate assignments in this specific year
  - **inactive**: Not available for assignments in this year

**Adding a new party**:
1. Create Party { name: "New Party", color: "#...", status: "active" } at program level
2. Activate for current year: Create ProgramYearParty { programYearId: current, partyId: newId, status: "active" }
3. Now available for assignments in current year

**Not using a party for a year**:
1. Simply don't activate that party for the year (no ProgramYearParty record created)
2. Historical delegates still reference their ProgramYearParty records
3. New delegates cannot select that party (not activated)
4. Can re-activate for future years if needed

**Retiring a party permanently**:
1. Update Party { status: "retired" } at program level
2. Historical ProgramYearParty records preserved
3. Cannot be activated for any new years
4. Can be un-retired if circumstances change

**Benefits**:
✅ Flexibility - different parties per year without affecting history
✅ No need to deactivate - just don't activate for certain years
✅ Historical integrity - old delegates always reference valid year-specific activations
✅ Clean year-over-year configuration
✅ Easy to add/remove parties per year
✅ Same pattern as groupings and positions

**Admin Workflow**:

**Program-Level Management** (programs-parties.html):
1. Admin creates/edits parties at program level
2. Can add custom parties or use "Quick Setup" for Federalists/Nationalists
3. Admin can:
   - **Create new** parties with name and color
   - **Delete** parties (soft delete - sets status to retired)
   - View all parties with color indicators

**Year-Level Activation** (programs-year-config.html - TO BE CREATED):
1. Admin selects a program year (e.g., 2026)
2. System shows all active program-level parties
3. Admin checks which parties to activate for this year
4. System creates ProgramYearParty records for selected parties
5. Only activated parties available for delegate assignments in that year

**Pages**:
- ✅ `programs-parties.html` - Program-level party management (COMPLETE)
- ❌ `programs-year-config.html` - Year-level activation (NEEDED)

### 8. Position Management ❌

**Current Status**: Not Implemented (Backend Ready)

**Purpose**: Define elected and appointed positions

**Features Needed**:
- Create positions (e.g., "Mayor", "Governor", "Judge")
- Position attributes: name, description, grouping level, elected vs appointed
- Status management (active/retired toggle)
- Link positions to specific groupings
- Activate positions for specific years
- Show usage statistics (how many delegates have held each position per year)

**Examples**:
- City-level: Mayor, City Council Member
- County-level: County Commissioner, Sheriff
- State-level: Governor, Lt. Governor, Secretary of State, Supreme Court Justice, Attorney General

**Data Model (Two-Tier System)**:
```
Position (program-level - define once)
├── id
├── programId (which program owns this position)
├── name (e.g., "Mayor", "Governor")
├── description (optional details about the position)
├── isElected (true/false - elected vs appointed)
├── groupingId (REQUIRED - ALL positions assigned to a grouping)
│   └── Example: "Mayor" → groupingId points to city grouping
│       "Governor" → groupingId points to state grouping (top level)
│       "Sheriff" → groupingId points to county grouping
│
│   Note: Even state-level positions like "Governor" are assigned to the
│         top-level "State" grouping (parentGroupingId = null)
├── displayOrder
├── status (active/retired - retired positions cannot be activated for new years)
└── createdDate

ProgramYearPosition (year-level activation - junction table)
├── id
├── programYearId (which year this activation applies to)
├── positionId (which position is being activated)
├── status (active/inactive - controls if available for assignments in THIS year)
└── delegatePositions (delegates who hold this position this year)

Example: Two-tier system with year-specific activation
  Program-level:
    State grouping: Grouping { id: 1, name: "California", parentGroupingId: null }
    County grouping: Grouping { id: 2, name: "Los Angeles County", parentGroupingId: 1 }
    City grouping: Grouping { id: 3, name: "Los Angeles", parentGroupingId: 2 }

    Position { id: 1, name: "Mayor", isElected: true, groupingId: 3, status: "active" }
    Position { id: 2, name: "Governor", isElected: true, groupingId: 1, status: "active" }
    Position { id: 3, name: "Old Magistrate", isElected: false, groupingId: 2, status: "active" }

  Year 2024 Activation:
    ProgramYearPosition { programYearId: 1, positionId: 1, status: "active" }
    ProgramYearPosition { programYearId: 1, positionId: 2, status: "active" }
    ProgramYearPosition { programYearId: 1, positionId: 3, status: "active" }

  Year 2026 Activation (Old Magistrate not used this year):
    ProgramYearPosition { programYearId: 2, positionId: 1, status: "active" }
    ProgramYearPosition { programYearId: 2, positionId: 2, status: "active" }
    (Old Magistrate not activated for 2026)

DelegatePosition (2024) { programYearPositionId: 3 } → "Old Magistrate" (valid for 2024)
New assignment (2026) → can only select activated positions for 2026
```

**Managing Positions Over Time**:

**Two-Tier Workflow**:
1. **Create at program level**: Define all positions once (available across all years)
2. **Activate for specific years**: Choose which positions to use for each year

**Status field meanings**:
- **Program-level status** (active/retired):
  - **active**: Can be activated for new years
  - **retired**: Cannot be activated for new years (historical activations preserved)
- **Year-level status** (active/inactive):
  - **active**: Available for delegate assignments/elections in this specific year
  - **inactive**: Not available for assignments in this year

**Adding a new position**:
1. Create Position { name: "New Position", groupingId: X, status: "active" } at program level
2. Activate for current year: Create ProgramYearPosition { programYearId: current, positionId: newId, status: "active" }
3. Now available for assignments/elections in current year

**Not using a position for a year**:
1. Simply don't activate that position for the year (no ProgramYearPosition record created)
2. Historical DelegatePosition records still reference their ProgramYearPosition records
3. New delegates cannot run for that position (not activated)
4. Can re-activate for future years if needed

**Retiring a position permanently**:
1. Update Position { status: "retired" } at program level
2. Historical ProgramYearPosition records preserved
3. Cannot be activated for any new years
4. Can be un-retired if circumstances change

**Benefits**:
✅ Flexibility - different positions per year without affecting history
✅ No need to deactivate - just don't activate for certain years
✅ Historical integrity - old position holders always reference valid year-specific activations
✅ Clean year-over-year configuration
✅ Easy to add/remove positions per year
✅ Same pattern as groupings and parties

**Admin Workflow**:

**Program-Level Management** (programs-positions.html - TO BE CREATED):
1. Admin creates/edits positions at program level
2. Assigns each position to a grouping (city, county, or state level)
3. Admin can:
   - **Create new** positions with name, description, grouping, elected/appointed
   - **Edit** position details
   - **Mark as retired** (cannot be activated for new years)
   - **Mark as active** (can be activated for new years)

**Year-Level Activation** (programs-year-config.html - TO BE CREATED):
1. Admin selects a program year (e.g., 2026)
2. System shows all active program-level positions grouped by grouping level
3. Admin checks which positions to activate for this year
4. System creates ProgramYearPosition records for selected positions
5. Only activated positions available for elections/appointments in that year

**Pages Needed**:
- `programs-positions.html` - Program-level position management (NEEDED)
- `programs-year-config.html` - Year-level activation (NEEDED)

### 9. Elections Management ❌

**Current Status**: Not Implemented (Backend Ready)

**Purpose**: Conduct elections for positions

**Features Needed**:
- Create elections for positions
- Define election method (plurality, majority, ranked choice)
- Set election timeframes
- Manage ballots
- Record votes
- Tally results
- Publish results

**Election Methods**:
- **Plurality**: Candidate with most votes wins (even if <50%)
- **Majority**: Candidate must receive >50% of votes to win (may require runoff)
- **Ranked Choice**: Voters rank candidates; instant runoff elimination

**Data Model**:
```
Election
├── position (what's being elected)
├── grouping (where election happens)
├── method (plurality, majority, ranked-choice)
├── status (scheduled, active, completed)
├── startTime, endTime
└── votes (ballot records)
```

**Pages Needed**:
- `elections.html` - Election configuration and management

### 10. Logging & Audit Trail ✅

**Current Status**: Complete

**Features**:
- Server-side logging (errors, warnings, info)
- Client-side logging (browser errors)
- Centralized log storage
- Filterable log viewer
- Audit logs for all administrative actions

**Log Types**:
- Authentication events
- Application accept/reject
- Configuration changes
- Error tracking
- Performance metrics

**Pages**:
- `logs.html` - Log viewer with filters
- `console.html` - Developer console integration

---

## Data Model

### Core Entities

**Program Hierarchy**:
```
Program (e.g., "California Boys State")
├── Groupings (program-level, active/retired status)
├── Parties (program-level, active/retired status)
├── Positions (program-level, active/retired status)
└── ProgramYear (e.g., 2024, 2025)
    ├── ProgramYearGrouping (activated groupings for this year)
    ├── ProgramYearParty (activated parties for this year)
    ├── ProgramYearPosition (activated positions for this year)
    ├── Delegates (assigned to activated groupings/parties/positions via junction tables)
    │   └── Parents (linked to delegates)
    ├── Staff (assigned to activated groupings via junction table)
    └── Elections (year-specific, link to activated positions)
```

**Participant Management**:
```
Delegate
├── Personal Info (firstName, lastName, email, phone)
├── programYearId (which year they're participating)
├── programYearGroupingId (REQUIRED - references activated LOWEST LEVEL grouping)
│   └── Points to ProgramYearGrouping (junction table)
│       Example: assigned to activated "Springfield" for 2024
│       Inherits: "Sangamon County" → "Central District" through hierarchy
│   Note: Initially may be set to dummy/placeholder activated grouping for even distribution
├── programYearPartyId (REQUIRED - references activated political party)
│   └── Points to ProgramYearParty (junction table)
│       Example: assigned to activated "Federalist Party" for 2024
│       Historical delegates point to their year-specific party activation
│   Note: Initially may be set to dummy/placeholder activated party for even distribution
├── status (active, inactive, withdrawn)
└── positions (elected/appointed positions held via DelegatePosition → ProgramYearPosition)

**Assignment Strategy**:
- Grouping and party must reference year-specific activations (junction tables)
- May initially use dummy/placeholder activated values for delegates
- May initially use dummy/placeholder activated value for staff
- Allows all delegates and staff to be entered before final assignments
- Enables even distribution across activated groupings and parties after all participants exist
- Admin can then reassign to actual activated groupings/parties for balanced allocation

Staff
├── Personal Info (firstName, lastName, email, phone)
├── programYearId
├── role (assigned by admin after acceptance, e.g., "Counselor", "Director", "District Coordinator")
│   Note: NOT specified on application form - admin assigns role during onboarding
├── programYearGroupingId (REQUIRED - can reference ANY level activated grouping)
│   └── Points to ProgramYearGrouping (junction table)
│       Assigned to ANY level → oversees DOWN to all child groupings
│       Example: assigned to activated "Central District" for 2024
│       Oversees: All counties in district → all cities in counties → all delegates
│   Note: Initially may be set to dummy/placeholder activated grouping to indicate needs assignment
└── status

Parent
├── Personal Info (firstName, lastName, email, phone)
├── programYearId
├── delegates (linked through DelegateParentLink)
└── status
```

**Application System**:
```
Application (form template)
├── programId
├── year, type (delegate/staff)
├── title, description
├── closingDate
└── questions (array of form fields)

ApplicationResponse (submitted form)
├── applicationId
├── status (pending, accepted, rejected)
├── createdAt
└── answers (array of question responses)
```

**Organizational Structure**:
```
Grouping (program-level - define once, use across years)
├── id
├── programId (which program owns this grouping)
├── name (e.g., "Springfield", "Sangamon County", "Central District")
├── parentGroupingId (self-referential hierarchy, null = top level)
├── displayOrder (ordering within same parent)
├── status (active/retired - controls if can be activated for NEW years)
├── createdDate
└── notes (optional)

ProgramYearGrouping (year-level activation - junction table)
├── id
├── programYearId (which year this activation applies to)
├── groupingId (which grouping is being activated)
├── status (active/inactive - controls if available for assignments in THIS year)
└── delegates/staff (linked to this activated grouping)

Benefits of this model:
- Flexibility - different groupings per year without affecting history
- No need to deactivate - just don't activate for certain years
- Historical integrity - old delegates always point to valid year-specific activations
- Hierarchy inferred from parentGroupingId at program level
- Clean year-over-year configuration
- Easy to add/remove groupings per year
- Same pattern for parties and positions
```

### Relationships

- **User ↔ Program**:
  - Program Administrator: **One-to-One** (each admin manages exactly one program)
  - Counselors/Staff: Many-to-One (can be assigned to one program)
  - Delegates/Parents: Specific to program year, not program-level
- **Program ↔ ProgramYear**: One-to-Many (one program has multiple years)
- **ProgramYear ↔ Delegates**: One-to-Many
- **ProgramYear ↔ Staff**: One-to-Many
- **Delegate ↔ Parent**: Many-to-Many (through DelegateParentLink)
- **Grouping ↔ Grouping**: Self-referential (parent-child hierarchy)
- **Election ↔ Votes**: One-to-Many
- **ApplicationResponse → User**: On acceptance, creates User account with email from application

---

## Application Workflow

### Delegate Application Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CONFIGURATION PHASE                                      │
│    Admin creates delegate application form                  │
│    - Define questions (name, email, school, essay, etc.)    │
│    - Set closing date                                        │
│    - Generate public URL with token                          │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. APPLICATION PHASE                                        │
│    Prospective delegates fill out form                      │
│    - Public URL (no login required)                         │
│    - Validation on submit                                    │
│    - Status: 'pending'                                       │
│    - Success message shown                                   │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. REVIEW PHASE (Current Implementation)                   │
│    Admin reviews applications                                │
│    - View all pending applications                           │
│    - View detailed responses                                 │
│    - Accept or Reject                                        │
│    - Status updated to 'accepted' or 'rejected'             │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. ONBOARDING PHASE (Not Yet Implemented)                  │
│    On acceptance:                                            │
│    - Admin assigns delegate to lowest level grouping         │
│      • Select from hierarchical list (e.g., "Springfield")  │
│      • Delegate inherits all parent groupings automatically  │
│    - Create Delegate record                                  │
│      • Extract name, email, phone from answers              │
│      • Store groupingId (lowest level only)                 │
│      • Set status='active'                                   │
│    - Create User account                                     │
│      • Use email from application                            │
│      • Generate first-time login token                       │
│      • Link User to Delegate record                          │
│    - Send welcome email                                      │
│      • Acceptance notification                               │
│      • First-time login instructions                         │
│      • Link to set password                                  │
│    - User sets password on first login                       │
│    - User can then access mobile app                         │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. PROGRAM PARTICIPATION (Future)                          │
│    Delegate uses mobile app to:                             │
│    - View program schedule                                   │
│    - Campaign for positions                                  │
│    - Vote in elections                                       │
│    - Receive notifications                                   │
└─────────────────────────────────────────────────────────────┘
```

### Staff Application Flow

Similar to delegate flow with these differences:

**Application Phase**:
- Different application form (focus on experience, qualifications)
- Email address REQUIRED (used for login)
- Applicants do NOT specify a role - they simply apply to be staff

**Review & Onboarding**:
- Create Staff record instead of Delegate
- Admin assigns role after acceptance (e.g., "Counselor", "Director", "District Coordinator")
- Grouping assignment REQUIRED (can be ANY level: city, county, district, or state)
  - **Staff oversee DOWN to all child groupings**
  - Examples:
    - District Coordinator assigned to "Central District" → oversees all counties and cities in district
    - City Counselor assigned to "Springfield" → oversees only that city
  - May use dummy/placeholder grouping initially to indicate needs assignment
- Create User account with email from application
- Send welcome email with first-time login instructions
- User sets password on first login
- User can then access mobile app (staff view)

**Staff Participation** (Future):
- View program schedule
- Oversee assigned grouping and all child groupings
  - District staff sees all counties and cities in their district
  - County staff sees all cities in their county
  - City staff sees only their city
- View and manage delegates in their oversight area
- Monitor elections in their groupings
- Receive notifications about their responsibilities

---

## Technical Stack

### Frontend
- **HTML5**: Semantic markup
- **Vanilla JavaScript**: No frameworks (ES6+)
- **Tailwind CSS**: Utility-first CSS framework
  - Custom colors: `legend-blue` (#1B3D6D), `legend-gold` (#FFD700)
  - Responsive design
- **Build Tool**: npm scripts for CSS compilation

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **ORM**: Prisma (PostgreSQL)
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **Validation**: Custom middleware
- **Logging**: Custom logger with API integration

### Database
- **PostgreSQL 14+**
- **ORM**: Prisma Client
- **Migrations**: Prisma Migrate
- **Schema**: Fully normalized with foreign keys

### Deployment
- **Frontend**: Netlify
  - Static site hosting
  - Automatic deployments from main branch
  - Custom domain support
  - CDN distribution
- **Backend**: Railway (or similar PaaS)
  - Automatic deployments
  - PostgreSQL database hosting
  - Environment variable management
- **Environment Variables**:
  - `API_URL`: Backend API base URL
  - `DATABASE_URL`: PostgreSQL connection string
  - `JWT_SECRET`: Token signing key

### Development Tools
- **Testing**: Jest (80% coverage minimum)
- **Linting**: ESLint
- **Version Control**: Git
- **CI/CD**: GitHub Actions (future)

---

## Security & Compliance

### Authentication & Authorization
- JWT tokens stored in sessionStorage
- HttpOnly cookies for sensitive operations
- Token expiration (24 hours)
- Role-based access control (RBAC)
- Program-level data isolation

### Content Security Policy (CSP)
- No inline scripts or styles
- No inline event handlers
- Whitelist for script sources
- Connect-src limited to API endpoints

### Data Protection
- **Age Requirement**: All delegates are at least 16 years old
  - COPPA does not apply (only covers children under 13)
  - Delegates are minors (under 18) but above COPPA threshold
- **FERPA Compliance**: Educational records protection
  - Access controls
  - Audit trails
  - Data minimization
- **GDPR Considerations**: For international programs
  - Right to access
  - Right to deletion
  - Data portability
- **Minor Data Handling** (ages 16-17):
  - Parent accounts can view delegate information
  - Parents receive notifications about delegate activities
  - Age-appropriate data collection and retention

### Audit Logging
- All administrative actions logged
- User authentication events tracked
- Application accept/reject decisions recorded
- Configuration changes tracked
- Sensitive data redacted in logs

### Public Application Form Security
- Non-guessable UUID-based URLs (regeneratable by admin)
- Rate limiting (backend)
- CAPTCHA consideration (future)
- No authentication required (by design)
- Data validation on both client and server
- File upload malware scanning (if file uploads enabled)
- Audit trail for public URL operations:
  - URL generation/regeneration
  - Application publish/unpublish actions
  - All logged with admin user and timestamp

---

## Current Implementation Status

### ✅ Complete Features (Production Ready)

1. **Authentication System**
   - User registration and login
   - JWT authentication
   - Session management

2. **Program Management**
   - Create programs
   - Year management
   - User assignments

3. **Application System**
   - Form builder with 15+ field types
   - Public application URLs
   - Response collection
   - Question locking

4. **Application Review**
   - View pending applications
   - Accept/reject workflow
   - Detailed response viewing
   - Status filtering

5. **Branding Configuration**
   - Custom colors and logos
   - Contact information
   - Welcome messages

6. **Logging System**
   - Centralized log collection
   - Client and server logging
   - Filterable log viewer

### 🚧 Partially Complete

1. **Application Acceptance**
   - Status updates work ✅
   - Delegate/Staff record creation ❌ (blocked by groupings)
   - Email notifications ❌

2. **User Management**
   - Basic viewing ✅
   - Role assignment ❌
   - Bulk operations ❌

### 🚧 Partially Complete

1. **Party Management**
   - Program-level party creation ✅
   - Default party setup (Federalists/Nationalists) ✅
   - Year-level party activation ❌ (needs programs-year-config.html)

### ❌ Not Started (Backend Ready)

1. **Groupings Management** - CRITICAL BLOCKER
   - Program-level grouping creation ❌
   - Year-level grouping activation ❌
2. **Position Configuration**
   - Program-level position creation ❌
   - Year-level position activation ❌
3. **Year Configuration Page** - CRITICAL (needed for activating parties, groupings, positions)
4. **Staff Management Page**
5. **Parent Management Page**
6. **Elections System**
7. **Content Management**

### Test Coverage
- **Frontend**: 169 tests passing, 76.47% branch coverage
- **Backend**: 262 tests passing (from previous session)
- **Target**: 80% minimum coverage

---

## Future Roadmap

### Phase 1: MVP Completion (Current)
**Goal**: Complete core admin functionality

- ✅ Application submission and review
- 🚧 Parties configuration (program-level complete, year-activation pending)
- ❌ Groupings configuration (NEXT PRIORITY - program and year-level)
- ❌ Positions configuration (program and year-level)
- ❌ Year configuration page (CRITICAL - activate parties, groupings, positions for each year)
- ❌ Complete delegate/staff onboarding

**Timeline**: 2-4 weeks

### Phase 2: Elections & Voting
**Goal**: Enable democratic processes

- Elections configuration UI
- Ballot creation
- Voting interface (mobile app integration)
- Results tallying and publishing
- Audit trails for elections

**Timeline**: 4-6 weeks

### Phase 3: Mobile App Development
**Goal**: Participant and parent engagement

**Delegate App**:
- Program schedule
- Campaign tools
- Voting interface
- Messaging
- Notifications

**Parent App**:
- View delegate information
- Program updates
- Election result notifications:
  - Delegate elected to office (primary/general)
  - Delegate appointed to position
  - Delegate unsuccessful in election bid
- Emergency notifications
- Photo galleries
- Schedule viewing

**Timeline**: 8-12 weeks

### Phase 4: Advanced Features

- Content management system
- Schedule builder
- Announcement system
- Photo/video management
- Document repository
- Reporting and analytics
- Export functionality
- Email integration
- Push notification system:
  - Election results to parents
  - Program updates
  - Emergency alerts
- SMS notifications (optional)

**Timeline**: 12-16 weeks

### Phase 5: Multi-Tenancy & Scaling

- White-label support
- Custom domain support
- Multi-region deployment
- Advanced analytics
- Mobile admin app

**Timeline**: TBD

---

## Success Criteria

### MVP Success Criteria
- [ ] 100% of application workflow functional
- [ ] Groupings fully configured
- [ ] Delegates can be accepted and onboarded
- [ ] Staff can be accepted and onboarded
- [ ] All core configuration pages complete
- [ ] 80%+ test coverage maintained
- [ ] Zero critical security vulnerabilities
- [ ] Production deployment successful

### Long-Term Success Criteria
- Support 10+ concurrent programs
- 1000+ delegates per program
- <2s average page load time
- 99.9% uptime during program sessions
- Positive user feedback from program directors
- Adoption by multiple state programs

---

## Open Questions & Decisions Needed

### Immediate Questions

1. **Grouping Assignment on Application Acceptance**
   - ✅ CONFIRMED: Delegates assigned to LOWEST LEVEL grouping only (e.g., city)
   - ✅ CONFIRMED: Parent groupings inherited automatically through hierarchy
   - ❓ OPEN: How does admin assign grouping on acceptance?
     - Manual dropdown selection from hierarchical list?
     - Auto-assignment based on geography (zip code → city lookup)?
     - Deferred assignment (accept first, assign to grouping later)?
   - ❓ OPEN: Should application form collect city/county information?
     - Could help with auto-assignment or provide default suggestion
     - Admin would still have final control

2. **Email/Push Notifications**
   - Use which service? (SendGrid, AWS SES, Mailgun for email; Firebase/OneSignal for push)
   - Template system needed?
   - Customizable by program?
   - Notification types:
     - Application acceptance/rejection (email) ✅ CONFIRMED
     - First-time login instructions (email) ✅ CONFIRMED
     - Election results (push to parents: elected, appointed, unsuccessful) ✅ CONFIRMED
     - Program updates (configurable)
     - Emergency alerts (push + email)

3. **First-Time Password Setup Flow**
   - Email with magic link?
   - Email with temporary password?
   - Email with token to set password on web?

### Clarifications Received

✅ **Application Requirements**:
- All applications (delegate and staff) MUST include email as required field
- Email is used to create user accounts on acceptance

✅ **User Account Creation**:
- On application acceptance, create User account with email from application
- User receives welcome email with first-time login instructions
- User must set password on first login before accessing mobile app

✅ **Program Administrator Scope**:
- Each Program Administrator manages exactly ONE program (1:1 relationship)
- Administrators can create multiple program years (2024, 2025, 2026, etc.)
- Program years allow the same program to run annually with separate configurations

✅ **Staff Applications**:
- Same workflow as delegates (create/review/accept)
- Applicants do NOT specify a role on application - they simply apply to be staff
- Create Staff record on acceptance
- Admin assigns role after acceptance (e.g., "Counselor", "Director", "District Coordinator")
- Create User account on acceptance
- Grouping assignment REQUIRED (can be any level: city, county, district, or state)
- May use dummy/placeholder grouping initially to indicate needs assignment

✅ **Grouping Hierarchy & Assignment**:
- Hierarchical structure: District → County → City (or similar multi-level structure)
- Hierarchy inferred from parent-child relationships (no explicit type levels needed)
- **Delegates** (inherit UP):
  - Assigned ONLY to lowest level grouping (most specific location, e.g., city)
  - All parent groupings automatically inherited through hierarchy
  - Example: Delegate in "Springfield" automatically belongs to "Sangamon County" and "Central District"
  - Single `groupingId` field stores most specific grouping; parents resolved via parent chain
- **Staff** (oversee DOWN):
  - Can be assigned to ANY level (city, county, or district) depending on their role
  - Staff oversee all child groupings below their assigned level
  - Example: Staff assigned to "Central District" oversees all counties and cities in that district
  - Example: Staff assigned to "Springfield" oversees only that city (no children)

✅ **Grouping Reuse Across Years**:
- Groupings are created at program level (one "Springfield" definition for all years)
- NOT created fresh for each year
- **Two-tier activation system**:
  - **Program level**: Create groupings with active/retired status
  - **Year level**: Activate specific groupings for each year (ProgramYearGrouping junction table)
- Program-level status (active/retired) controls if can be activated for NEW years
- Year-level status (active/inactive) controls if available for assignments in THAT year
- Adding new groupings: Create at program level, then activate for desired years
- Not using a grouping for a year: Simply don't activate it (no ProgramYearGrouping record)
- Retiring groupings permanently: Set program-level status="retired" (historical activations preserved)
- Historical delegates/staff always point to valid year-specific activations (ProgramYearGrouping records)
- Benefits: Flexibility per year, historical integrity, clean year-over-year configuration

✅ **Party Reuse Across Years**:
- Parties work exactly like groupings (program-level creation, year-specific activation)
- **Two-tier activation system**:
  - **Program level**: Create parties with active/retired status
  - **Year level**: Activate specific parties for each year (ProgramYearParty junction table)
- Program-level status (active/retired) controls if can be activated for NEW years
- Year-level status (active/inactive) controls if available for assignments in THAT year
- Example: "Federalist Party" exists once at program level, activated for specific years
- Not using a party for a year: Simply don't activate it (no ProgramYearParty record)
- Retiring parties permanently: Set program-level status="retired" (historical activations preserved)
- Historical delegates point to their year-specific party activations (ProgramYearParty records)
- Benefits: Same pattern as groupings and positions, flexibility per year

✅ **Position Reuse Across Years**:
- Positions work exactly like groupings and parties (program-level creation, year-specific activation)
- **Two-tier activation system**:
  - **Program level**: Create positions with active/retired status
  - **Year level**: Activate specific positions for each year (ProgramYearPosition junction table)
- Same benefits and workflow as groupings and parties

✅ **Party Assignment for Delegates**:
- `partyId` is REQUIRED for all delegates (not optional)
- Every delegate must be assigned to a political party
- Initial assignment strategy:
  - May use dummy/placeholder party value when creating delegate records
  - May use dummy/placeholder grouping value when creating delegate records
  - Allows all delegates to be entered before final assignments
  - Enables even distribution across all groupings and parties
  - Admin can then reassign delegates for balanced allocation
- Benefits: Ensures balanced party/grouping distribution across all delegates

✅ **Position Assignment Requirements**:
- ALL positions must have a `groupingId` (required field)
- Even state-level positions (Governor, etc.) are assigned to top-level "State" grouping
- No positions exist at "program-wide" level without a grouping
- Positions are year-agnostic with simple active/inactive status (like groupings/parties)

### Strategic Questions

1. **Mobile App Strategy**
   - React Native or native iOS/Android?
   - Shared authentication with web?
   - Offline support needed?

2. **Scalability Planning**
   - Expected peak load?
   - Database sharding strategy?
   - CDN requirements?

---

## Document Maintenance

This document should be reviewed and updated:
- At the start of each development phase
- When major features are completed
- When architectural decisions are made
- When scope changes are requested
- Monthly during active development

**Next Review**: After groupings implementation

---

## Appendix

### Glossary

- **Boys State**: Youth leadership program simulating government
- **Delegate**: Student participant in the program
- **Staff**: Adult counselors and program administrators
- **Grouping**: Organizational unit (city, county)
- **Party**: Political party for election simulation
- **Position**: Elected or appointed government role
- **Program Year**: Annual instance of a program
- **Application Response**: Submitted application form

### Related Documents

- `API_ENDPOINTS.md` - Backend API documentation (gitignored - local use only)
- `CLAUDE.md` - Development guidelines for Claude Code
- `README.md` - Project setup and getting started

### Contact & Support

- **GitHub Issues**: [Repository URL]
- **Development Team**: [Contact info]
- **Program Support**: [Support email]

---

**Document Version**: 1.0
**Created**: 2026-01-27
**Last Modified**: 2026-01-27
**Author**: Claude Code (AI Assistant)
**Review Status**: Awaiting user review and feedback
