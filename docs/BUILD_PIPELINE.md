# Build Pipeline and Testing

This document describes the build pipeline, testing setup, and code quality analysis for the Order Management Application.

## Overview

The project uses GitHub Actions for continuous integration and SonarQube for code quality analysis. Both backend and frontend have comprehensive test suites with code coverage reporting.

## Test Coverage

### Backend Tests
- **Framework**: Jest + Supertest
- **Coverage**: 78%
- **Test Count**: 102 tests
- **Test Files**:
  - Models: Item.js, Order.js
  - Routes: items.js, orders.js
  - Middleware: auth.js
  - Utils: logger.js

### Frontend Tests
- **Framework**: Vitest + React Testing Library
- **Coverage**: 85%
- **Test Count**: 34 tests
- **Test Files**:
  - Services: api.js
  - Utils: priorityUtils.js

## Running Tests Locally

### Backend Tests
```bash
cd backend
npm install
npm test                # Run tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage
```

### Frontend Tests
```bash
cd frontend
npm install
npm test                # Run tests
npm run test:ui        # Run tests with UI
npm run test:coverage  # Run tests with coverage
```

## Build Pipeline

The build pipeline runs on every push to `main` or `develop` branches and on pull requests targeting these branches.

### Pipeline Stages

1. **Backend Tests**
   - Installs dependencies
   - Runs Jest tests with coverage
   - Uploads coverage reports as artifacts

2. **Frontend Tests**
   - Installs dependencies
   - Runs Vitest tests with coverage
   - Uploads coverage reports as artifacts

3. **Frontend Lint**
   - Runs ESLint to check code style and quality
   - Ensures code follows project conventions

4. **Frontend Build**
   - Builds the production bundle
   - Verifies that the application can be built successfully
   - Uploads build artifacts

5. **SonarQube Analysis**
   - Downloads coverage reports from previous jobs
   - Performs static code analysis
   - Checks code quality metrics
   - Reports coverage and code smells
   - Runs quality gate check

6. **Build Summary**
   - Generates a summary of all pipeline stages
   - Provides quick overview of build status

### Required Secrets

To enable SonarQube analysis, the following secrets must be configured in GitHub repository settings:

- `SONAR_TOKEN`: Authentication token for SonarQube
- `SONAR_HOST_URL`: URL of your SonarQube instance
- `SONAR_PROJECT_KEY`: Project key in SonarQube
- `SONAR_ORGANIZATION`: Organization key in SonarQube (if using SonarCloud)

## SonarQube Configuration

The project is configured to analyze:
- JavaScript code in both backend and frontend
- Code coverage from Jest (backend) and Vitest (frontend)
- Code smells, bugs, and security vulnerabilities
- Code duplication
- Test coverage metrics

### Quality Gates

The pipeline includes a SonarQube Quality Gate check that verifies:
- Code coverage meets minimum thresholds
- No critical security vulnerabilities
- No blocker or critical bugs
- Code duplication is within acceptable limits

## Code Coverage Reports

Coverage reports are generated in multiple formats:
- **Text**: Console output during test runs
- **HTML**: Interactive coverage report (in `coverage/` directory)
- **LCOV**: For SonarQube integration
- **JSON**: For programmatic access

### Viewing Coverage Reports Locally

After running tests with coverage:

**Backend:**
```bash
open backend/coverage/lcov-report/index.html
```

**Frontend:**
```bash
open frontend/coverage/index.html
```

## Continuous Integration

The pipeline automatically:
- Runs on every commit to main/develop branches
- Runs on every pull request
- Can be manually triggered via GitHub Actions UI
- Provides status checks for pull requests
- Blocks merging if tests fail (configurable)

## Test Writing Guidelines

### Backend Tests
- Use Jest's describe/it structure
- Mock external dependencies (database, APIs)
- Test both success and error cases
- Use supertest for API endpoint testing
- Aim for high coverage of business logic

### Frontend Tests
- Use Vitest and React Testing Library
- Test component behavior, not implementation
- Mock API calls
- Test user interactions
- Test edge cases and error states

## Deployment

The application is deployed to Vercel, which has its own deployment pipeline separate from this testing and quality pipeline. This pipeline focuses solely on code quality and testing.

## Maintenance

### Updating Dependencies
```bash
# Backend
cd backend && npm update

# Frontend
cd frontend && npm update
```

### Adding New Tests
1. Create test file with `.test.js` or `.spec.js` extension
2. Place in `__tests__/` directory (backend) or `src/test/` (frontend)
3. Run tests to verify
4. Check coverage to ensure new code is tested

## Troubleshooting

### Tests Failing Locally But Passing in CI
- Check Node.js version matches pipeline (20.x)
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check for environment-specific issues

### Coverage Not Updating in SonarQube
- Verify coverage reports are being generated
- Check that LCOV reports exist in coverage directories
- Verify sonar-project.properties paths are correct
- Check SonarQube logs for parsing errors

### Pipeline Failing
- Check GitHub Actions logs for detailed error messages
- Verify all required secrets are configured
- Check that dependencies are correctly specified in package.json
- Ensure tests pass locally before pushing
