# 🚀 Quick Setup Guide - GitHub Actions Scheduling

## Step-by-Step Instructions

### 1. 📋 Copy Your Environment Variables
From your current Replit environment, copy these values:
- `NOTION_API_KEY`
- `GAPI_SERVICE_ACCOUNT_KEY` 
- `GOOGLE_SHEET_ID`
- `NOTION_DATABASE_ID`

### 2. 🏠 Create GitHub Repository
```bash
# In your project directory
git init
git add .
git commit -m "Setup automated scheduling for Moonstone Importer"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/moonstone-importer.git
git push -u origin main
```

### 3. 🔐 Add GitHub Secrets
1. Go to: `https://github.com/YOUR_USERNAME/moonstone-importer/settings/secrets/actions`
2. Click "New repository secret" for each:
   - Name: `NOTION_API_KEY`, Value: (your Notion API key)
   - Name: `GAPI_SERVICE_ACCOUNT_KEY`, Value: (your full Google Service Account JSON)
   - Name: `GOOGLE_SHEET_ID`, Value: (your Google Sheet ID)
   - Name: `NOTION_DATABASE_ID`, Value: (your Notion database ID)

### 4. ✅ Test the Setup
1. Go to: `https://github.com/YOUR_USERNAME/moonstone-importer/actions`
2. Click "Moonstone Importer - Scheduled Run"
3. Click "Run workflow" → "Run workflow"
4. Wait and check if it runs successfully

### 5. 🎯 You're Done!
Your script will now run automatically:
- **8:00 AM UTC** (10:00 AM Italy, 3:00 AM Eastern)
- **8:00 PM UTC** (10:00 PM Italy, 3:00 PM Eastern)

## 🔧 Customization

**Change schedule times**: Edit `.github/workflows/scheduled-import.yml`
```yaml
schedule:
  - cron: '0 7 * * *'   # 9:00 AM Italy time (winter)
  - cron: '0 19 * * *'  # 9:00 PM Italy time (winter)
```

**Local testing**: 
```bash
npm install
npm test  # Runs with your .env file
```

## 💰 Cost: $0 Forever
- GitHub Actions: 2000 free minutes/month
- Your usage: ~600 minutes/month (well within limit)
- No credit card required!