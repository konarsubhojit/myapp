#!/bin/bash

# Setup verification script for Next.js Order Management System
# This script helps verify that all required environment variables are configured

echo "🔍 Next.js Order Management - Setup Verification"
echo "================================================"
echo ""

# Change to the script's directory
cd "$(dirname "$0")"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "📝 Please copy .env.example to .env:"
    echo "   cp .env.example .env"
    echo ""
    exit 1
fi

echo "✅ .env file found"
echo ""

# Source the .env file
set -a
source .env
set +a

# Check required environment variables
echo "🔧 Checking environment variables..."
echo ""

all_good=true

# Function to check a variable
check_var() {
    local var_name=$1
    local var_value="${!var_name}"
    
    if [ -z "$var_value" ]; then
        echo "❌ $var_name is not set"
        all_good=false
    elif [[ "$var_value" == "your-secret-here-generate-with-openssl" ]] || \
         [[ "$var_value" == "your-google-client-id.apps.googleusercontent.com" ]] || \
         [[ "$var_value" == "your-google-client-secret" ]]; then
        echo "⚠️  $var_name needs to be configured (still has placeholder value)"
        all_good=false
    else
        echo "✅ $var_name is set"
    fi
}

# Check all required variables
check_var "NEXT_PUBLIC_API_URL"
check_var "NEXTAUTH_URL"
check_var "NEXTAUTH_SECRET"
check_var "GOOGLE_CLIENT_ID"
check_var "GOOGLE_CLIENT_SECRET"

echo ""

if [ "$all_good" = true ]; then
    echo "✨ All environment variables are configured!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Make sure the backend is running: cd ../backend && npm start"
    echo "2. Start the Next.js app: npm run dev"
    echo "3. Open http://localhost:3000 in your browser"
    echo ""
    echo "🔐 Google OAuth Redirect URI Configuration:"
    echo "   Make sure you have added this to Google Cloud Console:"
    echo "   ${NEXTAUTH_URL}/api/auth/callback/google"
    echo ""
else
    echo "❌ Some environment variables need attention"
    echo ""
    echo "📝 Please edit .env and configure the missing values"
    echo "💡 See QUICKSTART.md for detailed setup instructions"
    echo ""
    echo "🔑 To generate NEXTAUTH_SECRET, run:"
    echo "   openssl rand -base64 32"
    echo ""
    exit 1
fi
