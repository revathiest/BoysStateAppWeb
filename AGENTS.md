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
