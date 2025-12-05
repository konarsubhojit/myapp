# Azure App Service Deployment Setup

This document explains how to configure GitHub Actions secrets and variables for the Azure App Service deployment workflow.

## Overview

The deployment workflow (`azure-deploy.yml`) requires certain secrets and variables to be configured in your GitHub repository settings. These values are used to create the `.env` file for the backend application during deployment.

## Required Configuration

### GitHub Secrets

Secrets are encrypted values that are used to store sensitive information. Navigate to your repository's **Settings > Secrets and variables > Actions > Secrets** to configure these:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `MONGODB_URI` | MongoDB connection string for the database | `mongodb+srv://<username>:<password>@<cluster-url>/<database>` |

### GitHub Variables

Variables are used for non-sensitive configuration values. Navigate to your repository's **Settings > Secrets and variables > Actions > Variables** to configure these:

| Variable Name | Description | Default Value | Example Value |
|---------------|-------------|---------------|---------------|
| `PORT` | Port number for the backend server | `5000` | `5000` |
| `VITE_API_URL` | Backend API URL for frontend | - | `https://your-backend.azurewebsites.net/api` |
| `VITE_AZURE_TENANT_ID` | Azure AD tenant ID | - | `common` or your tenant GUID |
| `VITE_AZURE_CLIENT_ID` | Azure AD app client ID | - | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `VITE_REDIRECT_URI` | OAuth redirect URI (must match Azure AD registration) | - | `https://your-frontend.azurewebsites.net` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID | - | `xxxxxxxx.apps.googleusercontent.com` |

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

### Step 3: Configure Azure AD Variables

These variables are required for Microsoft authentication to work properly:

1. Go to your GitHub repository
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click on the **Variables** tab
4. Add the following variables:

| Variable | Value |
|----------|-------|
| `VITE_AZURE_TENANT_ID` | Your Azure AD tenant ID (or `common` for multi-tenant apps) |
| `VITE_AZURE_CLIENT_ID` | Your Azure AD app registration client ID |
| `VITE_REDIRECT_URI` | Your frontend URL (e.g., `https://your-app.azurewebsites.net`) |

**Important:** The `VITE_REDIRECT_URI` must exactly match one of the redirect URIs configured in your Azure AD app registration. This includes the protocol (`https://`). Typically, redirect URIs should NOT have a trailing slash (e.g., use `https://your-app.azurewebsites.net` not `https://your-app.azurewebsites.net/`).

### Step 4: Configure Google OAuth (Optional)

To enable Google Sign-In:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Create an OAuth 2.0 Client ID (Web application type)
4. Add your frontend URLs to **Authorized JavaScript origins**
5. Copy the Client ID and add it as `VITE_GOOGLE_CLIENT_ID` in GitHub Actions variables

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

### Authentication fails with redirect_uri error

If you see an error like "The provided value for the input parameter 'redirect_uri' is not valid", check the following:

1. Ensure `VITE_REDIRECT_URI` is set in GitHub Actions variables
2. Verify the URI exactly matches one registered in Azure AD app registration (including protocol, no trailing slash)
3. Check Azure Portal > App Registrations > Your App > Authentication > Redirect URIs

## Related Files

- Workflow file: `.github/workflows/azure-deploy.yml`
- Backend environment example: `backend/.env.example` (for local development reference)
