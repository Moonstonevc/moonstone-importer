# Moonstone Importer - Deployment Guide

## 🚀 GitHub Actions Deployment (TypeScript)

This guide shows how to deploy the **TypeScript** version of Moonstone Importer using GitHub Actions for automated execution.

## 📋 Prerequisites

- GitHub repository with the Moonstone Importer code
- Valid API credentials for Notion and Google Sheets
- Basic understanding of GitHub Actions

## 🔧 Setup GitHub Secrets

### Required Secrets

Add these secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

| Secret Name                | Description                                 | Example                                        |
| -------------------------- | ------------------------------------------- | ---------------------------------------------- |
| `NOTION_API_KEY`           | Your Notion integration token               | `secret_abc123...`                             |
| `NOTION_DATABASE_ID`       | The ID of your Notion database              | `a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6`         |
| `GOOGLE_SHEET_ID`          | The ID from your Google Sheets URL          | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms` |
| `GAPI_SERVICE_ACCOUNT_KEY` | JSON credentials for Google service account | `{"type":"service_account",...}`               |

### How to Add Secrets

1. Go to your repository on GitHub
2. Click `Settings` tab
3. Navigate to `Secrets and variables > Actions`
4. Click `New repository secret`
5. Add each secret with the exact name and value

## 📝 GitHub Actions Workflow

### Minimal Workflow

Create `.github/workflows/moonstone-importer.yml`:

```yaml
name: Moonstone Importer

on:
  # Manual trigger
  workflow_dispatch:

  # Scheduled execution (daily at 9 AM UTC)
  schedule:
    - cron: "0 9 * * *"

  # Trigger on push to main branch
  push:
    branches: [main]
    paths:
      - "src/**"
      - "package.json"
      - "tsconfig.json"

jobs:
  import:
    name: Import Form Data
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Type check TypeScript
        run: npm run type-check

      - name: Build TypeScript
        run: npm run build

      - name: Run Moonstone Importer
        run: npm start
        env:
          NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }}
          NOTION_DATABASE_ID: ${{ secrets.NOTION_DATABASE_ID }}
          GOOGLE_SHEET_ID: ${{ secrets.GOOGLE_SHEET_ID }}
          GAPI_SERVICE_ACCOUNT_KEY: ${{ secrets.GAPI_SERVICE_ACCOUNT_KEY }}
          NODE_ENV: production
```

### Advanced Workflow with Error Handling

Create `.github/workflows/moonstone-importer-advanced.yml`:

```yaml
name: Moonstone Importer (Advanced)

on:
  workflow_dispatch:
    inputs:
      dry_run:
        description: "Run in dry-run mode (no actual changes)"
        required: false
        default: false
        type: boolean

  schedule:
    - cron: "0 9 * * *" # Daily at 9 AM UTC

jobs:
  import:
    name: Import Form Data
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Validate TypeScript
        run: |
          echo "🔍 Checking TypeScript types..."
          npm run type-check
          echo "✅ TypeScript validation passed"

      - name: Build application
        run: |
          echo "🏗️ Building TypeScript application..."
          npm run build
          echo "✅ Build completed successfully"

      - name: Run import process
        id: import
        run: |
          echo "🚀 Starting Moonstone Importer..."
          npm start
          echo "✅ Import process completed"
        env:
          NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }}
          NOTION_DATABASE_ID: ${{ secrets.NOTION_DATABASE_ID }}
          GOOGLE_SHEET_ID: ${{ secrets.GOOGLE_SHEET_ID }}
          GAPI_SERVICE_ACCOUNT_KEY: ${{ secrets.GAPI_SERVICE_ACCOUNT_KEY }}
          NODE_ENV: production
          DRY_RUN: ${{ github.event.inputs.dry_run }}

      - name: Handle success
        if: success()
        run: |
          echo "🎉 Moonstone Importer completed successfully!"
          echo "Check the logs above for detailed results."

      - name: Handle failure
        if: failure()
        run: |
          echo "❌ Moonstone Importer failed!"
          echo "Please check the logs above for error details."
          echo "Common issues:"
          echo "- Invalid API credentials"
          echo "- Network connectivity problems"
          echo "- TypeScript compilation errors"
          exit 1
```

## 🕐 Scheduling Options

### Common Cron Schedules

```yaml
# Daily at 9 AM UTC
- cron: "0 9 * * *"

# Every Monday at 8 AM UTC
- cron: "0 8 * * 1"

# Twice daily (9 AM and 6 PM UTC)
- cron: "0 9,18 * * *"

# Every hour during business hours (9 AM - 6 PM UTC, Mon-Fri)
- cron: "0 9-18 * * 1-5"

# First day of every month at 9 AM UTC
- cron: "0 9 1 * *"
```

## 🔍 Monitoring and Debugging

### Viewing Workflow Results

1. Go to your repository on GitHub
2. Click the `Actions` tab
3. Select the workflow run to view logs
4. Check each step for success/failure status

### Common Issues and Solutions

#### ❌ "Missing required environment variables"

**Solution**: Verify all GitHub secrets are correctly set:

```bash
# Check secret names match exactly:
NOTION_API_KEY
NOTION_DATABASE_ID
GOOGLE_SHEET_ID
GAPI_SERVICE_ACCOUNT_KEY
```

#### ❌ "TypeScript compilation failed"

**Solution**: Check the TypeScript code for errors:

- Review the build logs in GitHub Actions
- Run `npm run type-check` locally to identify issues
- Ensure all dependencies are properly installed

#### ❌ "Google Sheets read failed"

**Solution**: Verify Google service account setup:

- Check that `GAPI_SERVICE_ACCOUNT_KEY` contains valid JSON
- Ensure the service account has access to the spreadsheet
- Verify the `GOOGLE_SHEET_ID` is correct

#### ❌ "Notion operation failed"

**Solution**: Check Notion integration:

- Verify `NOTION_API_KEY` is valid and not expired
- Ensure the integration has access to the database
- Check that `NOTION_DATABASE_ID` is correct

### Debugging Tips

1. **Enable detailed logging** by setting `NODE_ENV=development`
2. **Use manual triggers** to test changes before scheduling
3. **Check API rate limits** if processing large datasets
4. **Monitor execution time** and adjust timeout if needed

## 🚨 Security Best Practices

### Secrets Management

- ✅ **Never commit secrets** to your repository
- ✅ **Use GitHub Secrets** for all sensitive data
- ✅ **Rotate credentials regularly**
- ✅ **Limit service account permissions** to minimum required

### Access Control

- ✅ **Restrict repository access** to authorized users only
- ✅ **Review workflow changes** before merging to main
- ✅ **Monitor workflow execution** for unexpected behavior
- ✅ **Use branch protection rules** for production workflows

## 📊 Production Deployment Checklist

### Before First Deployment

- [ ] All GitHub secrets are configured correctly
- [ ] TypeScript compiles without errors (`npm run type-check`)
- [ ] Application builds successfully (`npm run build`)
- [ ] Test run completed successfully locally (`npm run dev`)
- [ ] Google service account has spreadsheet access
- [ ] Notion integration has database access
- [ ] Workflow file is in `.github/workflows/` directory

### Regular Maintenance

- [ ] Monitor workflow execution results
- [ ] Review import statistics for anomalies
- [ ] Update dependencies regularly (`npm update`)
- [ ] Rotate API credentials periodically
- [ ] Backup Notion database before major changes

## 🎯 Next Steps

1. **Set up the workflow** using one of the templates above
2. **Configure GitHub secrets** with your API credentials
3. **Test manually** using the workflow dispatch trigger
4. **Monitor results** and adjust schedule as needed
5. **Set up notifications** for workflow failures (optional)

The TypeScript version provides better reliability and maintainability for automated deployments! 🚀
