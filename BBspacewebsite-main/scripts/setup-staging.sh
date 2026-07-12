#!/bin/bash

# BB Space Website - Staging Environment Setup Script
# This script sets up the staging environment for Vercel + Supabase

set -e

echo "🚀 Setting up BB Space Website Staging Environment"
echo "================================================="

# Check if required tools are installed
command -v vercel >/dev/null 2>&1 || { echo "❌ Vercel CLI is required but not installed. Install with: npm install -g vercel"; exit 1; }
command -v supabase >/dev/null 2>&1 || { echo "❌ Supabase CLI is required but not installed. Install from: https://supabase.com/docs/guides/cli"; exit 1; }

# Check if .env.staging exists
if [ ! -f ".env.staging" ]; then
    echo "❌ .env.staging file not found. Please create it with your staging environment variables."
    echo "   You can copy from .env.staging.example and fill in the values."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Load environment variables
export $(grep -v '^#' .env.staging | xargs)

# Authenticate with Vercel (if not already authenticated)
echo "🔐 Checking Vercel authentication..."
if ! vercel whoami >/dev/null 2>&1; then
    echo "Please authenticate with Vercel:"
    vercel login
fi

# Create Supabase project (staging)
echo "🗄️  Setting up Supabase staging project..."
if [ -z "$SUPABASE_PROJECT_REF" ]; then
    echo "Creating new Supabase project for staging..."
    # Note: This would require interactive setup
    echo "⚠️  Please create a Supabase project manually and update .env.staging with the project details"
    echo "   Project URL: https://your-staging-project.supabase.co"
    echo "   Anon Key: your-anon-key"
    echo "   Service Role Key: your-service-role-key"
else
    echo "Using existing Supabase project: $SUPABASE_PROJECT_REF"
fi

# Prepare Vercel preview deployment
echo "⚙️  Preparing Vercel preview deployment..."
vercel --yes --confirm

# Setup database migrations
echo "🗃️  Setting up database..."
if [ -d "supabase" ]; then
    echo "Running database migrations..."
    supabase db push --project-ref $SUPABASE_PROJECT_REF
else
    echo "⚠️  Supabase directory not found. Make sure to initialize Supabase locally first."
fi

# Deploy to staging
echo "🚀 Deploying to staging environment..."
vercel --prod=false

# Run health checks
echo "🔍 Running health checks..."
echo "Checking staging deployment..."
curl -f https://staging.yourdomain.com/api/health || echo "⚠️  Health check failed - deployment may not be ready yet"

echo ""
echo "✅ Staging environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Configure preview environment variables in Vercel"
echo "2. Test the staging deployment"
echo "3. Run E2E tests against staging: npm run test:e2e -- --config=playwright.staging.config.ts"
echo ""
echo "🔗 Staging URL: check the Vercel preview deployment URL"
echo "📊 Monitoring: Check Sentry and PostHog for staging environment"