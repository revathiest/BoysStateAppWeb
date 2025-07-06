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
2. **Configure environment variables and API endpoint:**

   * Copy `.env.example` to `.env` and adjust values such as `PORT` for the local server.
   * Edit `public/js/config.js` and set `API_URL` to your backend API's base URL.
   * The server uses `API_URL` (read from the environment or `public/js/config.js`) and optional `PROGRAM_ID`
     to send log events to your backend's `/logs` endpoint.
3. **Run the app:**

   ```bash
   npm run start
   # or your preferred web build tool
   ```
4. **Connect to backend:**

   * Ensure [Backend Services](https://github.com/yourorg/boysstate-backend) API is running and configured.

## Using the Portal

* Navigate to `index.html` and choose **Register** to create an admin account.
* After registering you will be taken to **onboarding.html**. From there create your first program. Subsequent logins redirect to **dashboard.html** which lists all your programs and shows features based on your role.
* After login the API returns a JWT which is stored in `sessionStorage`. Subsequent requests include this token via an `Authorization: Bearer` header along with `credentials: 'include'`.

## Deployment

This site is designed to be hosted on **Netlify**. The `public` directory contains
the static HTML pages served by Netlify. 

## Agent Specification

See [`AGENTS.md`](./AGENTS.md) for details on user roles, portal modules, and admin-only features.

## Contributing

* All portal logic must include automated tests and follow project standards.
* Submit PRs with clear commit messages and coverage.
* See [Mobile App](https://github.com/yourorg/boysstate-mobile) and [Backend Services](https://github.com/yourorg/boysstate-backend) for changes in other system areas.
