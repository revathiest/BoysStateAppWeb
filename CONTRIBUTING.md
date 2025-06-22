# Contributing to Boys State App – Web Admin Portal

Thank you for your interest in contributing to the Boys State App web admin portal! Whether you’re fixing UI bugs, adding admin features, improving resource management, or strengthening security, your help is appreciated.

---

## Disclaimer

> **This portal is being developed to support Boys State & Girls State programs affiliated with the American Legion, but is not created, funded, or officially supported by the American Legion. No endorsement is implied.**

---

## Getting Started

1. **Fork the repository** and clone it locally.
2. **Install dependencies:**

   ```bash
   npm install
   # or yarn
   ```
3. **Set up prerequisites:**

   * Ensure Node.js version is correct and web tooling is up to date.
4. **Set up environment variables:**

   * Copy `.env.example` to `.env` and configure API endpoints, OAuth, and settings.
5. **Run the admin portal:**

   ```bash
   npm run start
   # or your preferred web build command
   ```

---

## Code Standards

* Use clear, descriptive commit messages and PR descriptions.
* Follow code style as enforced by the project linter/config.
* All new logic or UI must be covered by automated tests.
* Place tests with components or in `__tests__/` as appropriate.
* Reference [`AGENTS.md`](./AGENTS.md) for architectural decisions.
* Never commit secrets or credentials.

---

## Submitting Changes

1. Create a branch for your changes:
   `git checkout -b feature/my-admin-feature`
2. Make changes, write/update tests, and docs as needed.
3. Run all tests and lints:

   ```bash
   npm test
   npm run lint
   ```
4. Submit a pull request (PR) and mention any related issues or cross-repo features.
5. Be available to answer questions and respond to code review feedback.

---

## Testing

* Automated tests are required for all new features and bug fixes.
* Use `npm test` or `yarn test` for the suite.
* Security and integration testing is prioritized, especially for admin functions.

---

## Cross-Repo Coordination

* For API/backend changes, see [Backend Services](https://github.com/yourorg/boysstate-backend).
* For changes impacting mobile users, see [Mobile App](https://github.com/yourorg/boysstate-mobile).
* Discuss broad features/bugs in all impacted repos as needed.

---

## Questions?

Open an issue, post in discussions, or contact a maintainer.
