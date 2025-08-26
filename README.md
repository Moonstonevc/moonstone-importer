# Moonstone Importer

A comprehensive application for importing form submissions from Google Sheets into organized Notion pages. This tool is designed to be easily understood and maintained by non-programmers.

## 🎯 What This Application Does

The Moonstone Importer automates the process of:

1. **Reading form data** from a Google Spreadsheet
2. **Categorizing submissions** into different types (founders, searchers, referrals)
3. **Matching referrals** with their corresponding main submissions
4. **Creating organized Notion pages** with all form responses
5. **Handling unmatched data** by creating special warning pages

## 📋 Prerequisites

Before using this application, you need:

- **Node.js** installed on your computer (version 16 or higher)
- **Google Sheets API access** with a service account
- **Notion API access** with an integration token
- **Environment variables** properly configured

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the project root with these variables:

```env
NOTION_API_KEY=your_notion_integration_token
NOTION_DATABASE_ID=your_notion_database_id
GOOGLE_SHEET_ID=your_google_spreadsheet_id
GAPI_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
```

### 3. Run the Application

```bash
npm start
```

Or directly:

```bash
node index.js
```

## 📁 Project Structure

The application is organized into logical modules for easy understanding:

```
MoonstoneImporter-NEW/
├── index.js                    # Main entry point (starts the app)
├── src/
│   ├── main.js                # Application orchestrator
│   ├── config/
│   │   └── constants.js       # All configuration and constants
│   ├── services/
│   │   ├── googleSheetsService.js  # Google Sheets API handling
│   │   └── notionService.js        # Notion API handling
│   ├── processors/
│   │   ├── formClassifier.js       # Form categorization logic
│   │   ├── founderProcessor.js     # Founder form processing
│   │   └── searcherProcessor.js    # Searcher form processing
│   └── utils/
│       ├── textUtils.js            # Text processing utilities
│       ├── matchingUtils.js        # Data matching utilities
│       └── validationUtils.js      # Data validation utilities
├── package.json               # Project dependencies
└── README.md                 # This documentation
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

## 📊 Form Types Supported

The application processes four types of form submissions:

### 1. Founder Forms

- **Purpose**: Startup founders applying for investment
- **Key Data**: Company information, financials, team details
- **Notion Properties**: Company website, founder details, valuation, etc.

### 2. Founder Referrals

- **Purpose**: Referrals recommending founders/startups
- **Key Data**: Referrer information, startup being referred
- **Matching**: Automatically matched with founder submissions

### 3. Searcher Forms

- **Purpose**: Entrepreneurs applying to be searchers
- **Key Data**: Personal information, experience, availability
- **Notion Properties**: Contact info, CV, availability preferences

### 4. Searcher Referrals

- **Purpose**: Referrals recommending potential searchers
- **Key Data**: Referrer information, searcher being referred
- **Matching**: Automatically matched with searcher submissions

## 🔄 How the Import Process Works

### Step 1: Environment Validation

- Checks all required environment variables
- Validates Google Sheets and Notion API access
- Displays configuration summary

### Step 2: Data Collection

- Connects to Google Sheets API
- Downloads all form submission data
- Validates data integrity

### Step 3: Form Processing

- Categorizes forms by type (founder, searcher, referral)
- Filters out invalid submissions
- Generates processing statistics

### Step 4: Data Matching

- Matches referrals with their corresponding main submissions
- Uses fuzzy matching to handle name variations
- Identifies unmatched referrals

### Step 5: Notion Import

- Creates or updates Notion pages
- Organizes form responses into logical sections
- Handles referral insights and team information
- Creates warning pages for unmatched referrals

### Step 6: Results Summary

- Displays comprehensive import statistics
- Shows success rates and error counts
- Provides troubleshooting guidance if needed

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
  🧩 Unmatched Referrals: 2

🔍 SEARCHERS:
  📊 Processed: 18
  🆕 Created: 12
  🔄 Updated: 6
  ❌ Errors: 0
  🧩 Unmatched Referrals: 1

📊 OVERALL TOTALS:
  📋 Total Processed: 43
  🆕 Total Created: 27
  🔄 Total Updated: 16
  ❌ Total Errors: 0
  ⏱️ Total Time: 45s
  ✅ Success Rate: 100%
```

### What Each Metric Means

- **Processed**: Total number of forms handled
- **Created**: New Notion pages created
- **Updated**: Existing pages that were updated
- **Errors**: Forms that failed to process
- **Unmatched Referrals**: Referrals without corresponding main submissions

## 🛠️ Troubleshooting

### Common Issues

#### "Missing required environment variables"

- Check that your `.env` file exists in the project root
- Verify all four environment variables are set
- Ensure there are no extra spaces or quotes around values

#### "Google Sheets read failed"

- Verify the `GOOGLE_SHEET_ID` is correct
- Check that the service account has access to the spreadsheet
- Ensure the Google Sheets API is enabled in your Google Cloud project

#### "Notion operation failed"

- Confirm the `NOTION_API_KEY` is valid
- Check that the integration has access to your database
- Verify the `NOTION_DATABASE_ID` is correct

#### "Invalid Google service account key"

- Ensure `GAPI_SERVICE_ACCOUNT_KEY` contains valid JSON
- Check that the service account credentials haven't expired
- Verify the service account has the correct permissions

### Getting Help

1. **Check the logs**: The application provides detailed error messages
2. **Verify credentials**: Ensure all API keys and IDs are correct
3. **Test connections**: Try accessing your Google Sheet and Notion database manually
4. **Review permissions**: Make sure service accounts and integrations have proper access

## 🔄 Maintenance

### Regular Tasks

1. **Monitor import results** for errors or unmatched referrals
2. **Update environment variables** if credentials change
3. **Review Notion database structure** if form fields are modified
4. **Check Google Sheets permissions** periodically

### Updating the Application

When form structures change:

1. **Update constants** in `/src/config/constants.js`
2. **Modify question mappings** if column numbers change
3. **Adjust validation rules** in `/src/utils/validationUtils.js`
4. **Test with sample data** before running on production data

## 📝 Customization

### Adding New Form Types

1. **Update form type mappings** in `constants.js`
2. **Create new processor** in `/src/processors/`
3. **Add validation rules** for the new form type
4. **Update the main orchestrator** to handle the new type

### Modifying Notion Properties

1. **Update property mappings** in the relevant processor
2. **Add validation functions** if needed
3. **Test with a small dataset** first

### Changing Question Organization

1. **Update question groups** in `constants.js`
2. **Modify section titles** as needed
3. **Adjust processor logic** if section structure changes

## 🚨 Important Notes

- **Always backup your data** before running imports
- **Test with sample data** when making changes
- **Monitor API rate limits** for large datasets
- **Keep credentials secure** and never commit them to version control
- **Run imports during low-traffic periods** to avoid conflicts

## 📞 Support

For technical issues or questions:

1. Check this documentation first
2. Review the application logs for error details
3. Verify your configuration and credentials
4. Test with a smaller dataset to isolate issues

The application is designed to be self-documenting with clear error messages and helpful troubleshooting guidance.
