# Boys State App: Agents Specification – Web Admin Portal

> **Important Disclaimer:**
>
> This application is being developed to support programs affiliated with the American Legion (such as Boys State and Girls State), but it is **not** created, funded, or officially supported by the American Legion or any agent or representative thereof. No endorsement or sponsorship by the American Legion is implied. All branding, configuration, and operational decisions are made independently by the app’s creators and participating programs.

## Overview

This document describes agents and modules specific to the web-based administrative portal for the Boys State App. The admin portal is for program administrators, staff, and select counselors. It provides advanced management for programs, users, schedules, elections, integrations, logs, and resources. This file covers only agents and features relevant to the web admin portal.

---

## 1. User Role Agents (Web Admin Portal)

### 1.1. Staff Agent (Admin)

**Description:** Full administrative access to manage program content and configuration.

**Responsibilities:**

* All counselor functions, with program-wide scope
* Manage schedules, announcements, resources, user roles, and onboarding
* Send targeted/global announcements
* Invite/manage parent links
* Configure program branding, settings, feature toggles
* Manage integrations (Google, Discord, etc.)
* Manage elections, results, and audit logs
* Define and publish program-specific application forms for delegate admissions
* Review submitted applications, accept or reject applicants, and trigger automatic delegate onboarding for accepted applicants

### 1.2. Counselor Agent

**Description:** Elevated access for staff/counselors with limited admin rights.

**Responsibilities:**

* All delegate access
* View/manage teams or groups as assigned
* Access restricted resources for staff/counselors

---

## 2. Web Portal Feature Agents

### 2.1. Program Management Website Agent

**Description:** Provides secure portal for admins to manage programs, settings, users, elections, integrations, and logs.

**Responsibilities:**

* Admin account creation and login
* Define/configure new programs (branding, contacts, settings)
* Add/manage admins, counselors, staff, and delegate invitations
* Manage all program resources, schedules, and announcements
* Manage integrations and elections as required
* View logs/audits for their own program

### 2.2. Schedule Agent

**Description:** Enables viewing, updating, and management of schedules.

**Responsibilities:**

* Edit schedules, integrate with Google Calendar
* Approve/propagate updates to mobile and parent/child users

### 2.3. Notification Agent

**Description:** Enables sending targeted or global notifications/announcements to program users.

**Responsibilities:**

* Compose/send notifications by role, group, or program-wide
* Review notification history/logs

### 2.4. Branding/Config Agent

**Description:** Manages branding, theme, configuration, and feature toggles for the program via the portal.

**Responsibilities:**

* Edit and preview branding (logos, colors, assets)
* Manage settings for available modules/features

### 2.5. Election Agent (Planned)

**Description:** Admin interface for setting up, configuring, and auditing elections.

**Responsibilities:**

* Create/configure elections and ballots
* Review voting tallies, results, and logs
* Ensure secure/auditable voting for delegates

### 2.6. Progress Tracking Agent (Planned)

**Description:** Allows admins to track delegate milestones/awards and notify parents.

**Responsibilities:**

* Track and report on progress/achievement history
* Manage notifications to parents/delegates about awards/milestones

### 2.7. Application/Admissions Agent

**Description:**  
Enables program admins to define, publish, and manage online application forms for delegate admission. Presents a secure, public-facing application form for external applicants (no login required) and manages the complete admission workflow.

**Responsibilities:**
- Admin UI for staff to:
  - Build and edit application forms with question types (text, essay, dropdown, multi-choice, file upload, etc)
  - Set required/optional questions and organize into sections/pages
  - Preview, publish, and **generate a non-guessable public application URL** (using a UUID/token, not just programId), with configurable open/close dates
  - **Copy and share the public application link** with prospective applicants
  - Unpublish or regenerate the public application link as needed
  - View, search, filter, and export submitted applications
  - Accept/reject applications (triggers backend to auto-designate accepted applicants as delegates)
- Presents a secure, **public, unauthenticated application form**:
  - **No login required for access or submission**
  - Strong anti-bot protections (e.g., CAPTCHA), plus rate limiting for abuse prevention
  - Program branding, details, open/close dates, and mandatory compliance/affiliation disclaimers (COPPA, FERPA, GDPR, non-affiliation) are clearly shown
  - Confirmation/receipt with unique reference ID on successful submission
- Notifies staff/admins of new submissions and applicant status changes
- On acceptance, triggers onboarding and portal access for new delegates
- Ensures all actions are tracked/audited (including link copies, publishes, unpublishes)
- All file uploads are scanned for malware/abuse (if uploads enabled)

**Key UI Flows:**
- **Admin:** Application builder, publish/copy public link, manage admissions, trigger onboarding
- **Applicant:** Access public form, complete and submit, receive confirmation, optional follow-up
- **Delegate:** On acceptance, gains delegate portal access and onboarding prompt

**Security, Compliance, and Audit:**
- Public application links must be **non-sequential, unguessable**, and regeneratable
- All public submissions are logged (timestamp, IP, browser info), never userId
- All required privacy and non-affiliation disclaimers must appear before data entry
- All admin link publish/copy/unpublish actions are auditable
- Automated tests and documentation required for all public access flows

### 2.8. Integration Agents (Planned)

### 2.9. Application Review & User Management Agents

**Description:**  
Provides two distinct review systems—one for delegate applications and one for staff applications. Both are restricted to authorized program staff/admins but have separate workflows, roles, data handling, and onboarding logic.

#### A. Delegate Application Review Agent

**Responsibilities:**
- Admin/staff UI for listing all **pending delegate applications**
- Filter/search/sort by year, status (pending/accepted/rejected), school, etc.
- View full application details, files, and metadata
- **Accept** action:
  - Creates a new delegate user account linked to the application and program
  - Triggers delegate onboarding, notification, and portal access provisioning
  - Records audit (who/when accepted, notes)
- **Reject** action:
  - Marks application as rejected
  - (Optional) Triggers notification to applicant
  - Audit logs all rejections, including who/when/why
- Bulk actions: Accept/Reject multiple delegate applications
- Data isolation: Only applications for the reviewer’s assigned program are visible
- **No staff applications are visible or actionable in this UI**
- Export/download permitted only for delegate application data
- All actions audited and tested for compliance (COPPA, FERPA, etc.)

**UI Flows:**
- “Delegate Applications” dashboard (list, filters, actions)
- Detailed view, approve/reject controls
- Confirmation and status feedback for all actions

---

#### B. Staff Application Review Agent

**Responsibilities:**
- Admin UI for listing all **pending staff applications** (separate table/dashboard from delegates)
- Filter/search/sort by staff type/role, status, year, etc.
- View full application details, references, and supporting files
- **Accept** action:
  - Creates a staff user account (correct role/permissions per application)
  - Triggers staff onboarding and access to admin/counselor portal features
  - Full audit (who/when/why accepted)
- **Reject** action:
  - Marks application as rejected, with reason if provided
  - Notification to applicant (if contact available)
  - Full audit trail
- Bulk Accept/Reject (where permitted)
- Data isolation: Staff reviewers only see staff applications for their own program
- **No delegate applications are visible or actionable in this UI**
- Export/download permitted only for staff application data
- Integration with background check or approval workflows (future/planned)
- All review, accept, and reject actions are logged and auditable

**UI Flows:**
- “Staff Applications” dashboard (completely separate from delegates)
- Details, review, approve/reject, status/history views

---

**Security, Compliance, and Audit (Both Agents):**
- Strict role-based access: Only permitted users can review/approve/reject in each section
- Reviewers cannot see or act on applications outside their program or type (delegate vs. staff)
- All decisions/actions logged with user, timestamp, and action reason
- Export, notification, and onboarding flows are separately tracked per agent
- All review features require automated tests and OpenAPI docs

---

**Automated Testing & Documentation:**
- Separate integration/unit tests for staff and delegate review flows (edge cases: double accept, re-review, etc.)
- All new endpoints for each process are documented, with example payloads and required roles
- Onboarding/user creation flows validated for each role

---

**Google Calendar Agent:** Manage Google Calendar integration for schedule sync and sharing.

**Google Docs Agent:** Link/upload/view program documents/resources.

**Discord Agent:** Manage Discord linking, in-app and cross-channel announcements.

---

## 3. Security, Privacy, and Compliance (Admin Portal)

* All portal access is authenticated and authorized by admin/staff role.
* All portal actions are logged, with sensitive data redacted as appropriate.
* No direct access to delegate/parent data outside the current program.
* Branding and configuration managed per program; no cross-program sharing.
* Adherence to privacy/security standards for minors (COPPA, FERPA, GDPR, etc.).

---

## 4. Development & Testing Standards (Admin Portal)

* Automated tests for all new features/fixes and logic
* If tests do not meet coverage requirements, increase coverage.  Do NOT decrease requirements.
* Changes require code review and passing tests before merge
* All admin features must include security/integration tests
* Regression tests required for any bug fixes or API changes
* Documentation/spec for future/planned agents must be maintained in this file
* Files are NOT to be ignored just to boost coverage.  Instead, new tests are to be created.
