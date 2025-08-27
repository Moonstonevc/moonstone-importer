# Moonstone Importer

A comprehensive **TypeScript** application for importing form submissions from Google Sheets into organized Notion pages. This tool is designed to be easily understood and maintained by non-programmers, with full type safety and modern development practices.

## 🎯 What This Application Does

The Moonstone Importer automates the process of:

1. **Reading form data** from a Google Spreadsheet
2. **Categorizing submissions** into different types (founders, searchers, referrals)
3. **Matching referrals** with their corresponding main submissions
4. **Creating organized Notion pages** with all form responses
5. **Handling unmatched data** by creating special warning pages

## 📋 Prerequisites

Before using this application, you need:

- **Node.js** installed on your computer (version 18 or higher)
- **Google Sheets API access** with a service account
- **Notion API access** with an integration token
- **Environment variables** properly configured

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy the example configuration and fill in your values:

```bash
cp config.example.env .env
```

Edit the `.env` file with your credentials:

```env
NOTION_API_KEY=your_notion_integration_token
NOTION_DATABASE_ID=your_notion_database_id
GOOGLE_SHEET_ID=your_google_spreadsheet_id
GAPI_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
```

### 3. Run the Application

**Development Mode (TypeScript):**

```bash
npm run dev
```

**Production Mode (Compiled JavaScript):**

```bash
npm start
```

## 📁 Project Structure (TypeScript)

The application is organized into logical TypeScript modules for easy understanding:

```
MoonstoneImporter-NEW/
├── index.js                    # Entry point (compatibility layer)
├── src/                        # TypeScript source code
│   ├── main.ts                # Application orchestrator
│   ├── types/
│   │   └── index.ts           # Type definitions
│   ├── config/
│   │   └── constants.ts       # Configuration and constants
│   ├── core/
│   │   ├── environmentValidator.ts
│   │   ├── applicationOrchestrator.ts
│   │   └── resultsReporter.ts
│   ├── services/
│   │   ├── googleSheetsService.ts  # Google Sheets API handling
│   │   └── notionService.ts        # Notion API handling
│   ├── processors/
│   │   ├── formClassifier.ts       # Form categorization logic
│   │   ├── founderProcessor.ts     # Founder form processing
│   │   └── searcherProcessor.ts    # Searcher form processing
│   └── utils/
│       ├── textUtils.ts            # Text processing utilities
│       └── matchingUtils.ts        # Data matching utilities
├── dist/                       # Compiled JavaScript (auto-generated)
├── tsconfig.json              # TypeScript configuration
├── package.json               # Project dependencies
└── README.md                 # This documentation
```

## 🛠️ Development Commands

### Essential Commands

```bash
# Development with TypeScript
npm run dev                    # Run directly with TypeScript

# Production build and run
npm run build                  # Compile TypeScript to JavaScript
npm start                      # Run compiled version

# Type checking
npm run type-check             # Verify types without compilation
```

### Advanced Development

```bash
# Watch mode for development
npm run dev:watch              # Auto-restart on file changes
npm run type-check:watch       # Continuous type checking

# Build variants
npm run build:production       # Production optimized build
npm run build:watch            # Watch and rebuild on changes

# Validation
npm run validate               # Type-check + build verification
```

## 🔧 Configuration Guide

### Environment Variables

| Variable                   | Description                                 | Example                                        |
| -------------------------- | ------------------------------------------- | ---------------------------------------------- |
| `NOTION_API_KEY`           | Your Notion integration token               | `secret_abc123...`                             |
| `NOTION_DATABASE_ID`       | The ID of your Notion database              | `a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6`         |
| `GOOGLE_SHEET_ID`          | The ID from your Google Sheets URL          | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms` |
| `GAPI_SERVICE_ACCOUNT_KEY` | JSON credentials for Google service account | `{"type":"service_account",...}`               |

### Getting Your Credentials

#### Notion API Key

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Create a new integration
3. Copy the "Internal Integration Token"
4. Share your database with the integration

#### Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable the Google Sheets API
4. Create a service account
5. Download the JSON credentials file
6. Share your spreadsheet with the service account email

## 🚀 GitHub Actions Deployment

### Minimal Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Moonstone Importer

on:
  push:
    branches: [main]
  schedule:
    - cron: "0 9 * * *" # Daily at 9 AM UTC

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build TypeScript
        run: npm run build

      - name: Run import
        run: npm start
        env:
          NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }}
          NOTION_DATABASE_ID: ${{ secrets.NOTION_DATABASE_ID }}
          GOOGLE_SHEET_ID: ${{ secrets.GOOGLE_SHEET_ID }}
          GAPI_SERVICE_ACCOUNT_KEY: ${{ secrets.GAPI_SERVICE_ACCOUNT_KEY }}
```

### Required GitHub Secrets

Add these secrets in your repository settings:

- `NOTION_API_KEY`
- `NOTION_DATABASE_ID`
- `GOOGLE_SHEET_ID`
- `GAPI_SERVICE_ACCOUNT_KEY`

## 📊 Form Types Supported

The application processes four types of form submissions:

### 1. Founder Forms

- **Purpose**: Startup founders applying for investment
- **Key Data**: Company information, financials, team details

### 2. Founder Referrals

- **Purpose**: Referrals recommending founders/startups
- **Matching**: Automatically matched with founder submissions

### 3. Searcher Forms

- **Purpose**: Entrepreneurs applying to be searchers
- **Key Data**: Personal information, experience, availability

### 4. Searcher Referrals

- **Purpose**: Referrals recommending potential searchers
- **Matching**: Automatically matched with searcher submissions

## 🔄 How the Import Process Works

1. **Environment Validation** - Checks all required environment variables
2. **Data Collection** - Downloads form submission data from Google Sheets
3. **Form Processing** - Categorizes and validates forms by type
4. **Data Matching** - Matches referrals with corresponding main submissions
5. **Notion Import** - Creates or updates Notion pages with organized data
6. **Results Summary** - Displays comprehensive import statistics

## 📈 Understanding the Results

After running the import, you'll see a detailed summary:

```
📈 IMPORT RESULTS SUMMARY
==================================================
🏢 FOUNDERS:
  📊 Processed: 25
  🆕 Created: 15
  🔄 Updated: 10
  ❌ Errors: 0

🔍 SEARCHERS:
  📊 Processed: 18
  🆕 Created: 12
  🔄 Updated: 6
  ❌ Errors: 0

📊 OVERALL TOTALS:
  📋 Total Processed: 43
  🆕 Total Created: 27
  🔄 Total Updated: 16
  ✅ Success Rate: 100%
```

## 🛠️ Troubleshooting

### Common Issues

#### "Missing required environment variables"

- Check that your `.env` file exists in the project root
- Verify all four environment variables are set

#### "TypeScript compilation failed"

```bash
npm run type-check  # Check for type errors
npm run clean       # Clean build cache
npm run build       # Rebuild
```

#### "Google Sheets read failed"

- Verify the `GOOGLE_SHEET_ID` is correct
- Check that the service account has access to the spreadsheet

#### "Notion operation failed"

- Confirm the `NOTION_API_KEY` is valid
- Check that the integration has access to your database

## 🔧 TypeScript Benefits

This application uses **TypeScript** for:

- ✅ **Type Safety**: Errors caught during development
- ✅ **Better IntelliSense**: Precise autocompletion and documentation
- ✅ **Refactoring Safety**: Compiler-guaranteed code changes
- ✅ **Self-Documenting Code**: Types serve as living documentation

### Development vs Production

- **Development**: `npm run dev` - Direct TypeScript execution with type checking
- **Production**: `npm start` - Compiled JavaScript for optimal performance

## 🚨 Important Notes

- **Always backup your data** before running imports
- **Test with sample data** when making changes
- **Keep credentials secure** and never commit them to version control
- **Use GitHub Secrets** for automated deployments

## 📞 Support

For technical issues:

1. Check TypeScript compilation: `npm run type-check`
2. Review application logs for error details
3. Verify configuration and credentials
4. Test with a smaller dataset to isolate issues

The application provides detailed error messages and type-safe development experience with TypeScript.
