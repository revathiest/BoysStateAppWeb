# Boys State App – Web Admin Portal

> **Disclaimer:**
>
> This project is being developed to support Boys State & Girls State programs affiliated with the American Legion, but is **not** created, funded, or officially supported by the American Legion. No endorsement or sponsorship is implied. All branding, configuration, and operational decisions are made independently by the app’s creators and participating programs.

## Overview

This repository contains the **web-based admin portal** for Boys State App. The portal enables staff and administrators to manage programs, schedules, users, elections, integrations, logs, and resources securely via the web.

* Simple static HTML pages served by a lightweight Node server for local development
* Admin login, program and user management
* Schedule, notifications, and resource editing
* Branding, integrations, and election management
* Secure per-program access and audit logs
* Future: Chat, progress tracking, resource library

## Other Boys State App Repositories

* [Mobile App](https://github.com/yourorg/boysstate-mobile): Mobile application for delegates, counselors, staff, and parents.
* [Backend Services](https://github.com/yourorg/boysstate-backend): REST API, integrations, business logic, and core data for all Boys State App clients.

## Quick Start

1. **Install dependencies:**

   ```bash
   npm install
   # or yarn
   ```
2. **Set up environment variables:**

   * Copy `.env.example` to `.env` and configure API endpoints, OAuth credentials, and program info.
3. **Run the app:**

   ```bash
   npm run start
   # or your preferred web build tool
   ```
4. **Connect to backend:**

   * Ensure [Backend Services](https://github.com/yourorg/boysstate-backend) API is running and configured.

## Deployment

This site is designed to be hosted on **Netlify**. The `public` directory contains
the static HTML pages served by Netlify. Simply connect your GitHub repository to
Netlify and set the publish directory to `public`. No build step is required.

## Agent Specification

See [`AGENTS.md`](./AGENTS.md) for details on user roles, portal modules, and admin-only features.

## Contributing

* All portal logic must include automated tests and follow project standards.
* Submit PRs with clear commit messages and coverage.
* See [Mobile App](https://github.com/yourorg/boysstate-mobile) and [Backend Services](https://github.com/yourorg/boysstate-backend) for changes in other system areas.
