# Local Claude Instructions

These instructions are specific to my local development workflow and should NOT be committed.

## CRITICAL: Testing Requirements

**MANDATORY**: After EVERY code change, you MUST immediately write or update tests to cover that change. This is non-negotiable.

1. **Before considering any code change complete**, write tests that verify the change works correctly
2. Run tests to ensure they pass
3. Check coverage to ensure the 80% branch threshold is maintained
4. If tests already exist for the file, add test cases for the new/modified functionality
5. If no tests exist, create a new test file

**Never** mark a task as done or move on to the next task without writing tests first.

## Git Push Workflow

**IMPORTANT**: Before pushing to any remote branch:

1. Update `public/js/config.js` to use the production URL:
   ```javascript
   window.API_URL = "https://boysstateappservices.up.railway.app";
   // window.API_URL = "http://localhost:3000";
   ```

2. Stage and commit the config change if needed (or amend previous commit)

3. Push to remote

4. After push completes, switch `config.js` back to localhost for local development:
   ```javascript
   // window.API_URL = "https://boysstateappservices.up.railway.app";
   window.API_URL = "http://localhost:3000";
   ```

This ensures the deployed site always uses the production API endpoint.
