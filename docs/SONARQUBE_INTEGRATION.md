# SonarQube Integration Guide

This document explains the SonarQube integration for the Order Management System monorepo, including setup, configuration, and usage.

## Overview

The project uses SonarQube to analyze code quality and security for both the backend (Node.js/Express) and frontend (React/Vite) components. The analysis includes:

- Code quality metrics (bugs, code smells, technical debt)
- Security vulnerabilities
- Code coverage from unit tests
- Maintainability ratings

## Prerequisites

Before using the SonarQube integration, ensure you have:

1. **A SonarQube instance**: Either self-hosted or [SonarCloud](https://sonarcloud.io/)
2. **A SonarQube project** set up in your instance
3. **A User Token** with appropriate permissions, generated from your SonarQube account settings
4. **The SonarQube server URL** (SONAR_HOST_URL) - not needed for SonarCloud

## GitHub Secrets Configuration

The workflow requires the following secrets to be configured in your GitHub repository:

### Required Secrets

1. **SONAR_TOKEN**
   - Your SonarQube authentication token
   - Generate from: SonarQube → My Account → Security → Generate Token

2. **SONAR_HOST_URL**
   - The URL of your SonarQube server
   - Example: `https://sonarqube.yourcompany.com`
   - Not required if using SonarCloud

3. **SONAR_PROJECT_KEY**
   - Your project's unique identifier in SonarQube
   - Example: `order-management-app`

4. **SONAR_ORGANIZATION** (Optional)
   - Required for SonarCloud
   - Your organization key in SonarCloud

### Setting Up Secrets

1. Navigate to your GitHub repository
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with its corresponding value

## Project Configuration

### sonar-project.properties

The project includes a `sonar-project.properties` file at the repository root that defines the analysis configuration:

```properties
# Project identification
sonar.projectKey=order-management-app
sonar.projectName=Order Management App
sonar.projectVersion=1.0.0

# Source code directories
sonar.sources=backend,frontend/src
sonar.tests=backend/__tests__,frontend/src/test

# Exclusions
sonar.exclusions=**/node_modules/**,**/dist/**,**/coverage/**,**/*.test.js,**/*.spec.js,**/*.test.jsx,**/*.spec.jsx,**/vite.config.js,**/vitest.config.js,**/*eslint*,**/jest.config.js,frontend/src/test/**

# Test exclusions from coverage
sonar.coverage.exclusions=**/*.test.js,**/*.spec.js,**/*.test.jsx,**/*.spec.jsx,**/test/**,**/__tests__/**,**/setup.js

# Code coverage reports
sonar.javascript.lcov.reportPaths=backend/coverage/lcov.info,frontend/coverage/lcov.info

# Encoding
sonar.sourceEncoding=UTF-8
```

### Test Coverage Configuration

#### Backend (Jest)

The backend uses Jest for testing. Coverage is configured in `backend/jest.config.js`:

```javascript
module.exports = {
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json', 'html'],
  // ... other settings
};
```

Run backend tests with coverage:
```bash
cd backend
npm run test:coverage
```

This generates `backend/coverage/lcov.info`.

#### Frontend (Vitest)

The frontend uses Vitest for testing. Coverage is configured in `frontend/vitest.config.js`:

```javascript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      // ... other settings
    },
  },
});
```

Run frontend tests with coverage:
```bash
cd frontend
npm run test:coverage
```

This generates `frontend/coverage/lcov.info`.

## GitHub Actions Workflow

The project includes a comprehensive CI/CD workflow at `.github/workflows/build-and-test.yml` that runs all tasks in a single job for efficiency:

1. **Installs dependencies** for both backend and frontend
2. **Runs backend tests** with coverage
3. **Runs frontend tests** with coverage  
4. **Lints frontend code** with ESLint
5. **Builds frontend** for production
6. **Runs SonarQube analysis** with coverage from both projects
7. **Checks Quality Gate** status

### Workflow Structure

```yaml
jobs:
  build-test-analyze:
    # Single job that runs all steps sequentially
    # - Install backend dependencies
    # - Run backend tests with coverage
    # - Install frontend dependencies
    # - Run frontend tests with coverage
    # - Lint frontend
    # - Build frontend
    # - Run SonarQube scan with coverage
    # - Check Quality Gate status
```

This sequential approach ensures SonarQube can directly access the test coverage generated in the same job, eliminating the need for artifact uploads and downloads.

### SonarQube Scan Action

The workflow uses the official SonarSource GitHub Actions:

```yaml
- name: SonarQube Scan
  uses: sonarsource/sonarqube-scan-action@v2.4.0
  env:
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
    SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
```

### Quality Gate Check

The Quality Gate check ensures code meets quality standards:

```yaml
- name: SonarQube Quality Gate Check
  uses: sonarsource/sonarqube-quality-gate-action@v2.4.0
  timeout-minutes: 5
  env:
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
    SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
  continue-on-error: true
```

## How It Works

### Workflow Execution

When you push code or create a pull request, the workflow runs in a single job:

1. **Setup**
   - Checks out code with full git history (`fetch-depth: 0`) for accurate SonarQube analysis
   - Sets up Node.js environment

2. **Backend Testing**
   - Installs backend dependencies
   - Runs `npm run test:coverage` which generates `backend/coverage/lcov.info`

3. **Frontend Testing & Build**
   - Installs frontend dependencies
   - Runs `npm run test:coverage` which generates `frontend/coverage/lcov.info`
   - Runs ESLint for code quality checks
   - Builds the production frontend

4. **SonarQube Analysis**
   - Runs SonarScanner which:
     - Reads `sonar-project.properties` configuration
     - Analyzes source code for quality and security issues
     - Reads both LCOV reports directly from the filesystem
     - Uploads results to SonarQube server

5. **Quality Gate Check**
   - Verifies that code meets quality standards:
     - Code coverage meets minimum thresholds
     - No new critical bugs or vulnerabilities introduced
     - Code duplication is within acceptable limits
     - Technical debt is manageable
   - If the Quality Gate fails, the workflow continues (`continue-on-error: true`) but marks the check as failed

6. **Artifact Upload**
   - Uploads coverage reports and build artifacts for reference (runs even if previous steps fail)

## Viewing Results

### In GitHub

1. Go to the **Actions** tab in your repository
2. Click on a workflow run
3. View the **Build, Test, and Analyze** job logs
4. Check each step's status including the **SonarQube Quality Gate Check**

### In SonarQube Dashboard

1. Log in to your SonarQube instance
2. Navigate to your project
3. View detailed metrics:
   - **Overview**: Quality Gate status, bugs, vulnerabilities, code smells
   - **Measures**: Code coverage, duplication, complexity
   - **Code**: Browse code with inline issues
   - **Activity**: Historical trends and analysis history

## Branch Protection (Optional)

For stricter quality enforcement, you can configure branch protection rules to:

1. Go to **Settings** → **Branches** → **Branch protection rules**
2. Add a rule for your main branch
3. Enable **Require status checks to pass before merging**
4. Select **SonarQube Quality Gate Check** as a required check

This prevents merging pull requests that don't pass the Quality Gate.

## Troubleshooting

### Coverage Not Showing

**Problem**: SonarQube shows 0% coverage despite tests running.

**Solutions**:
1. Verify LCOV files are generated in the correct locations:
   - `backend/coverage/lcov.info`
   - `frontend/coverage/lcov.info`
2. Check that coverage artifacts are uploaded and downloaded correctly
3. Ensure `sonar.javascript.lcov.reportPaths` is correctly configured

### Analysis Fails

**Problem**: SonarQube scan fails with authentication error.

**Solutions**:
1. Verify `SONAR_TOKEN` secret is set correctly
2. Check that the token has not expired
3. Ensure the token has the necessary permissions

### Quality Gate Timeout

**Problem**: Quality Gate check times out after 5 minutes.

**Solutions**:
1. Check SonarQube server status
2. Verify network connectivity from GitHub Actions to SonarQube
3. Increase timeout in the workflow if needed

## Local Testing

To test coverage generation locally before pushing:

### Backend
```bash
cd backend
npm install
npm run test:coverage
# Check that backend/coverage/lcov.info exists
```

### Frontend
```bash
cd frontend
npm install
npm run test:coverage
# Check that frontend/coverage/lcov.info exists
```

### View Coverage Reports

Both backend and frontend generate HTML coverage reports:
- Backend: `backend/coverage/index.html`
- Frontend: `frontend/coverage/index.html`

Open these files in a browser to view detailed coverage information.

## Best Practices

1. **Run tests locally** before pushing to catch issues early
2. **Review SonarQube findings** regularly and address critical issues
3. **Set coverage thresholds** appropriate for your project
4. **Use Quality Gate** feedback to maintain code quality
5. **Don't ignore security vulnerabilities** reported by SonarQube
6. **Keep dependencies updated** to avoid known vulnerabilities

## Configuring Quality Gate Thresholds

Quality Gates define the set of conditions that must be met for code to be considered production-ready. 

### Setting Up Coverage Thresholds in SonarQube

1. **Navigate to Quality Gates:**
   - Log in to your SonarQube instance
   - Go to **Quality Gates** in the top navigation
   - Select your project's Quality Gate or create a new one

2. **Add Coverage Conditions:**
   - Click **Add Condition**
   - Select **On Overall Code** or **On New Code**
   - Choose metric: **Coverage** or **Coverage on New Code**
   - Set operator: **is less than**
   - Enter threshold value (e.g., 80 for 80% coverage)

3. **Common Coverage Metrics:**
   - **Coverage**: Overall code coverage percentage
   - **Coverage on New Code**: Coverage of newly added/modified code
   - **Line Coverage**: Percentage of lines covered by tests
   - **Branch Coverage**: Percentage of conditional branches covered

4. **Recommended Thresholds:**
   - **Overall Coverage**: 70-80% minimum
   - **New Code Coverage**: 80-90% minimum (stricter for new code)
   - **Critical/Blocker Issues**: 0 (zero tolerance)
   - **Security Vulnerabilities**: 0 (zero tolerance)

### Example Quality Gate Configuration

```
Condition                           | Operator        | Threshold
------------------------------------|-----------------|----------
Coverage on New Code                | is less than    | 80%
Duplicated Lines on New Code (%)    | is greater than | 3%
Maintainability Rating on New Code  | is worse than   | A
Reliability Rating on New Code      | is worse than   | A
Security Rating on New Code         | is worse than   | A
Security Hotspots Reviewed          | is less than    | 100%
```

### Applying Quality Gate to Your Project

1. Go to **Project Settings** → **Quality Gate**
2. Select your configured Quality Gate from the dropdown
3. Save changes

The Quality Gate status will now be checked on every analysis and reported back to GitHub pull requests.

## Additional Resources

- [SonarQube Documentation](https://docs.sonarqube.org/)
- [SonarCloud Documentation](https://docs.sonarcloud.io/)
- [SonarQube GitHub Actions](https://github.com/SonarSource/sonarqube-scan-action)
- [LCOV Coverage Format](https://github.com/linux-test-project/lcov)
- [Jest Coverage](https://jestjs.io/docs/configuration#collectcoverage-boolean)
- [Vitest Coverage](https://vitest.dev/guide/coverage.html)
