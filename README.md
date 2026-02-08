# State Forge – Web Admin Portal

> **Disclaimer:**
>
> This project is being developed to support Boys State & Girls State programs affiliated with the American Legion, but is **not** created, funded, or officially supported by the American Legion. No endorsement or sponsorship is implied. All branding, configuration, and operational decisions are made independently by the app's creators and participating programs.

## Overview

This repository contains the **web-based admin portal** for State Forge. The portal enables program administrators to manage programs, configure application forms, review applicants, and prepare for program execution.

**Key Features:**
- Program creation and configuration
- Custom application form builder (delegate and staff applications)
- Application review and acceptance workflow
- Branding and contact information management
- User authentication with JWT
- Audit logging
- Public application form (no authentication required)

**Current Status:** Core features complete, ready for application collection phase. See [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) for detailed feature status and roadmap.

## Architecture

### Development vs Production

**Local Development:**
- Lightweight Node.js server (`src/index.js`) serves static files from `public/`
- In-memory user store for testing (resets on restart)
- Mock API endpoints for development

**Production (Netlify):**
- Static HTML/CSS/JS files served directly from `public/` directory
- No build step required
- All API calls go to separate backend services

### Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, Tailwind CSS
- **Development Server**: Node.js with Express
- **Authentication**: JWT tokens (sessionStorage)
- **Deployment**: Netlify (static hosting)
- **Testing**: Jest with 80% coverage requirement

## Quick Start

### Prerequisites
- Node.js (v16+ recommended)
- npm or yarn
- Access to backend API (see configuration below)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd StateForgeWeb
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure API endpoint:**

   Edit `public/js/config.js` to set your backend API URL:
   ```javascript
   window.API_URL = '<your-backend-api-url>';
   ```

   This configures both the browser and the development server.

4. **Run development server:**
   ```bash
   npm start
   ```

5. **Access the portal:**

   Navigate to `http://localhost:8080` and:
   - Click **Register** to create an admin account
   - After registration, you'll be redirected to the dashboard
   - Create your first program using the "Create New Program" button

### Available Commands

```bash
npm start           # Start local dev server on port 8080 (or PORT from .env)
npm test            # Run Jest test suite with coverage
npm run lint        # Run ESLint
npm run dev:css     # Watch and compile Tailwind CSS
npm run build:css   # Build and minify Tailwind CSS for production
```

## Usage

### Authentication Flow

1. **Register** (`/register.html`) - Create admin account
2. **Login** (`/login.html`) - Authenticate with email/password
3. **Dashboard** (`/dashboard.html`) - Select or create program
4. **Console** (`/console.html`) - Access program management features

All authenticated requests include JWT token via `Authorization: Bearer <token>` header.

### Core Features

#### Program Management
- Create programs with unique IDs
- Configure multiple program years (2024, 2025, 2026, etc.)
- Manage program branding, colors, and contact information
- View audit logs for all program activities

#### Application Management
- **Build custom forms** with drag-and-drop interface
- **Field types**: text, email, phone, number, dropdown, radio, checkbox, date, file upload, address autocomplete, and more
- **Copy from previous year** to reuse application templates
- **Generate public URLs** with UUID tokens for secure, unauthenticated access
- **Set closing dates** to control application windows

#### Application Review
- View pending delegate and staff applications
- Extract key information: name, email, phone, school/role
- Accept or reject applications with styled confirmation modals
- Status filtering (accepted/rejected automatically removed from pending list)
- Full response details in modal view

#### Public Application Form
- Accessed via non-guessable UUID URLs (no authentication)
- Dynamic form rendering based on application configuration
- Address autocomplete with zip code lookup
- Client-side validation
- Success message with form hiding after submission

## Project Structure

```
StateForgeWeb/
├── public/              # Static files (HTML, CSS, JS)
│   ├── css/            # Compiled Tailwind CSS
│   ├── js/             # JavaScript modules
│   │   ├── auth.js               # Authentication logic
│   │   ├── authHelper.js         # JWT token management
│   │   ├── application-*.js      # Application builder system
│   │   ├── apply-*.js            # Public application form
│   │   ├── user-management.js    # Application review
│   │   └── config.js             # API configuration
│   ├── *.html          # Page templates
│   └── docs/           # Static assets (zipData.json)
├── src/                # Development server (not deployed)
│   ├── index.js        # Express server
│   └── logger.js       # Server-side logging
├── test/               # Jest tests
├── tailwind.config.js  # Tailwind CSS configuration
├── jest.config.js      # Jest configuration
├── PROJECT_OVERVIEW.md # Comprehensive feature documentation
└── CLAUDE.md           # Development guidelines for AI assistants
```

## Documentation

- **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)** - Comprehensive feature documentation, data models, workflows, and roadmap
- **[CLAUDE.md](./CLAUDE.md)** - Development guidelines for Claude Code
- **[API_ENDPOINTS.md](./API_ENDPOINTS.md)** - Backend API endpoint reference (gitignored - local use only)
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines
- **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Netlify deployment instructions

## Testing

All new features require automated tests with 80% minimum coverage.

Run tests:
```bash
npm test                # Run all tests with coverage
npm test -- --watch     # Watch mode for development
```

Tests are located in `test/` directory and match the pattern `**/?(*.)+(spec|test).[tj]s?(x)`.

**Coverage Requirements:**
- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

## Security

- **Authentication**: JWT tokens with 24-hour expiration
- **Authorization**: Role-based access control (RBAC)
- **CSP Compliance**: No inline scripts or styles, no inline event handlers
- **Data Protection**: FERPA compliance, GDPR considerations for international programs
- **Public Form Security**: Non-guessable UUID URLs, rate limiting, CAPTCHA consideration
- **Audit Logging**: All administrative actions logged with sensitive data redacted

## Deployment

This site is designed to be hosted on **Netlify**.

1. Push repository to GitHub
2. In Netlify, create new site from GitHub
3. Set **publish directory** to `public`
4. No build command required
5. Deploy

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed instructions.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

**Key Points:**
- All new logic must include automated tests
- Follow project code standards and linting rules
- Reference [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) for architectural decisions
- Never commit secrets or credentials

## License

Copyright 2025 Kenneth Hart

Licensed under the Apache License, Version 2.0. See [LICENSE.md](./LICENSE.md) for details.

## Contact & Support

For questions, bug reports, or feature requests, please open an issue in the repository.

---

**Note**: This application is not affiliated with or endorsed by the American Legion. All branding, configuration, and operational decisions are made independently.
