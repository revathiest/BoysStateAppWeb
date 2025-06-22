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

### 2.7. Integration Agents (Planned)

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
* Changes require code review and passing tests before merge
* All admin features must include security/integration tests
* Regression tests required for any bug fixes or API changes
* Documentation/spec for future/planned agents must be maintained in this file
