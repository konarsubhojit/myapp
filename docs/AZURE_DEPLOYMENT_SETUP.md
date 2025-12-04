# Azure App Service Deployment Setup

This document explains how to configure GitHub Actions secrets and variables for the Azure App Service deployment workflow.

## Overview

The deployment workflow (`azure-deploy.yml`) requires certain secrets and variables to be configured in your GitHub repository settings. These values are used to create the `.env` file for the backend application during deployment.

## Required Configuration

### GitHub Secrets

Secrets are encrypted values that are used to store sensitive information. Navigate to your repository's **Settings > Secrets and variables > Actions > Secrets** to configure these:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `MONGODB_URI` | MongoDB connection string for the database | `mongodb+srv://user:password@cluster.mongodb.net/orderapp` |

### GitHub Variables

Variables are used for non-sensitive configuration values. Navigate to your repository's **Settings > Secrets and variables > Actions > Variables** to configure these:

| Variable Name | Description | Default Value | Example Value |
|---------------|-------------|---------------|---------------|
| `PORT` | Port number for the backend server | `5000` | `5000` |

## Setup Instructions

### Step 1: Configure MongoDB URI Secret

1. Go to your GitHub repository
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click on **New repository secret**
4. Set the name as `MONGODB_URI`
5. Enter your MongoDB connection string as the value
6. Click **Add secret**

### Step 2: Configure Port Variable

1. Go to your GitHub repository
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click on the **Variables** tab
4. Click on **New repository variable**
5. Set the name as `PORT`
6. Enter the port number (e.g., `5000`) as the value
7. Click **Add variable**

## Environment File Generation

During the deployment workflow, a `.env` file is automatically generated in the backend deployment package with the following content:

```
MONGODB_URI=<value from MONGODB_URI secret>
PORT=<value from PORT variable, defaults to 5000>
```

## Security Notes

- **Never** commit the `.env` file or any file containing actual secrets to the repository
- The `MONGODB_URI` is stored as a secret because it contains sensitive database credentials
- The `PORT` variable is stored as a variable (not a secret) since it's not sensitive information
- GitHub masks secret values in workflow logs automatically

## Troubleshooting

### Workflow fails with empty MONGODB_URI

If the `MONGODB_URI` secret is not set, the deployment will create an empty value in the `.env` file. Ensure the secret is properly configured.

### Port defaults to 5000

If the `PORT` variable is not set, the workflow defaults to port `5000`. This is intentional to ensure the application can start even without explicit configuration.

## Related Files

- Workflow file: `.github/workflows/azure-deploy.yml`
- Backend environment example: `backend/.env.example` (for local development reference)
