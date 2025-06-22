# AGENTS.md – BoysStateAppAdmin (Admin Portal)

## Overview

This document details the agents, admin tools, and portal features for Boys State App’s program management website (**the only web component in this project**). The Admin Portal is strictly for authorized program administrators and staff. It provides secure interfaces to manage programs, resources, user roles, onboarding, branding, logs, elections, and integrations. No delegate, parent, or general public access is permitted.

---

## 1. Admin Portal Agents & Roles

### 1.1. Staff Agent (Admin)

* Full access to all program management tools and settings.
* Can manage schedules, announcements, resources, and elections.
* User role assignment, onboarding, parent invites, program configuration.
* Manage and review logs, audit trails, and API integration endpoints.
* Program-specific branding and feature toggles.

### 1.2. Counselor Agent

* (If portal access is granted by program) – Limited admin views/resources, generally focused on group/team management.

---

## 2. Authentication & Security (Admin Portal)

* Strict authentication required for all access.
* All actions logged and auditable by program.
* Per-program isolation enforced for admin accounts and resources.

---

## 3. Admin Features (Portal)

* Manage program branding, configuration, and feature toggles.
* CRUD operations for schedules, announcements, resources, and elections.
* User and role management (delegates, parents, counselors, staff).
* Review, export, and audit logs.
* Manage integrations (Google Calendar, Docs, Discord, etc.).
* Initiate or manage parent-delegate linking.
* Run or configure elections (future-ready, auditable).

---

## 4. Agent Interactions (Admin Portal)

* All actions taken via secure backend API endpoints.
* No direct third-party integrations in the portal; all interactions are via backend.
* All user/resource/event actions logged.

---

## 5. Privacy & Dev Standards (Admin Portal)

* No cross-program access to data or configuration.
* All admin actions must be secure, auditable, and logged.
* Automated testing required for all logic, edge cases, and error handling.
* Portal UI must enforce all security, privacy, and program boundaries defined by backend.

---

## 6. Future Features

* Placeholders for future admin features (bulk data management, advanced analytics, resource library, etc.)—must be spec’d and documented here before implementation.
