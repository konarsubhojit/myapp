# Development Instructions

## Pre-Commit Checklist

Before committing any changes, **always** run the following commands to ensure code quality and prevent CI/CD pipeline failures:

### 1. Install Dependencies (if not already installed)
```bash
npm run install:all
```

### 2. Frontend Checks

#### Lint the frontend code
```bash
cd frontend && npm run lint
```

#### Build the frontend
```bash
cd frontend && npm run build
```

#### Run frontend tests
```bash
cd frontend && npm test
```

#### Type checking
```bash
cd frontend && npm run typecheck
```

### 3. Backend Checks

#### Run backend tests
```bash
cd backend && npm test
```

### 4. Customer Feedback App Checks

#### Install dependencies (if not already installed)
```bash
cd customer-feedback-app && npm install
```

#### Build the customer feedback app
```bash
cd customer-feedback-app && npm run build
```

#### Run customer feedback app tests
```bash
cd customer-feedback-app && npm test
```

## Quick Command Summary

From the repository root, you can run:

```bash
# Install all dependencies
npm run install:all

# Lint frontend
cd frontend && npm run lint && cd ..

# Build frontend
cd frontend && npm run build && cd ..

# Test frontend
cd frontend && npm test && cd ..

# Test backend
cd backend && npm test && cd ..

# Build customer feedback app
cd customer-feedback-app && npm run build && cd ..

# Test customer feedback app
cd customer-feedback-app && npm test && cd ..
```

## CI/CD Pipeline Equivalents

The CI/CD pipeline runs these checks automatically. Running them locally before committing saves time and prevents pipeline failures:

- **ESLint**: Ensures code style and catches potential bugs
- **TypeScript Build**: Catches type errors before runtime
- **Tests**: Verifies functionality hasn't broken
- **Build**: Ensures production builds succeed

## Common Issues

### Frontend ESLint Failures
- Check for unused variables
- Ensure React hooks dependencies are correctly specified
- Watch for memoization issues with React Compiler

### TypeScript Build Failures
- Ensure all types are correctly defined
- Check test files for type mismatches
- Verify interface properties match usage

### Test Failures
- Run tests locally before committing
- Update tests when changing functionality
- Ensure test data matches type definitions
