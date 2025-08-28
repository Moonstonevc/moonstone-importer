# 🚀 Deployment Guide - Moonstone Importer

This guide explains how to set up automated scheduling for the Moonstone Importer script to run **twice daily** using **GitHub Actions** (completely free).

## 📋 Prerequisites

1. GitHub account (free)
2. Your project pushed to a GitHub repository
3. Environment variables from your current setup

## 🔧 Setup Instructions

### 1. Push to GitHub Repository

If not already done, create a new repository on GitHub and push your code:

```bash
git init
git add .
git commit -m "Initial commit - Moonstone Importer"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/moonstone-importer.git
git push -u origin main
```

### 2. Configure Environment Variables (GitHub Secrets)

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add these four secrets:

- `NOTION_API_KEY` - Your Notion integration API key
- `GAPI_SERVICE_ACCOUNT_KEY` - Your Google Service Account JSON (entire JSON as string)
- `GOOGLE_SHEET_ID` - Your Google Sheets ID
- `NOTION_DATABASE_ID` - Your Notion database ID

### 3. Enable GitHub Actions

The workflow file `.github/workflows/scheduled-import.yml` is already created and will:

- ✅ Run **twice daily** at 8:00 AM and 8:00 PM UTC
- ✅ Install dependencies automatically
- ✅ Handle the 10-minute runtime with 15-minute timeout
- ✅ Upload logs if something fails
- ✅ Allow manual triggering for testing

### 4. Test the Setup

1. Go to your repository → Actions tab
2. Click "Moonstone Importer - Scheduled Run"
3. Click "Run workflow" to test manually
4. Monitor the run to ensure everything works

## ⏰ Scheduling Details

**Current Schedule:**
- **8:00 AM UTC** (adjust for your timezone)
- **8:00 PM UTC** (adjust for your timezone)

**To change the schedule**, edit `.github/workflows/scheduled-import.yml`:
```yaml
schedule:
  - cron: '0 8 * * *'   # 8:00 AM UTC
  - cron: '0 20 * * *'  # 8:00 PM UTC
```

**Cron Format Examples:**
- `'0 6 * * *'` - 6:00 AM UTC
- `'30 14 * * *'` - 2:30 PM UTC
- `'0 */12 * * *'` - Every 12 hours
- `'0 9,21 * * *'` - 9:00 AM and 9:00 PM UTC

## 🌍 Timezone Considerations

GitHub Actions runs in UTC. To convert to your local time:

- **Italy (CET/CEST)**: UTC+1/UTC+2
  - For 9:00 AM Italy time: use `'0 7 * * *'` (winter) or `'0 8 * * *'` (summer)
- **New York (EST/EDT)**: UTC-5/UTC-4
  - For 9:00 AM NY time: use `'0 14 * * *'` (winter) or `'0 13 * * *'` (summer)

## 💰 Cost Analysis - FREE!

**GitHub Actions Free Tier:**
- ✅ **2,000 minutes/month** for private repos
- ✅ **Unlimited** for public repos
- ✅ Your script (10 min × 2 runs × 30 days) = **600 minutes/month**
- ✅ **Well within the free limit!**

## 🔍 Monitoring

**Check runs:**
1. Go to repository → Actions tab
2. View recent workflow runs
3. Click on any run to see detailed logs

**Notifications:**
- GitHub will email you if a workflow fails
- You can configure Slack/Discord notifications if needed

## 🚨 Troubleshooting

**Common Issues:**

1. **Environment variables not set**: Check GitHub repository secrets
2. **Workflow doesn't trigger**: Ensure the `.github/workflows/` folder is in the main branch
3. **Script timeout**: The workflow has a 15-minute timeout for your 10-minute script
4. **API rate limits**: GitHub Actions provides stable IP addresses

**View logs:**
- Click on any workflow run → Click on "import-data" job → Expand the steps

## 🔄 Migration from Replit

Your current Replit setup will be replaced by this GitHub Actions automation. The script will run the same way but on GitHub's infrastructure instead of Replit.

**Advantages over Replit:**
- ✅ True scheduling (no manual triggers)
- ✅ Better reliability
- ✅ Free forever
- ✅ Full logs and monitoring
- ✅ No "always on" required

## 📞 Support

If you encounter issues:
1. Check the Actions tab for error logs
2. Verify all environment variables are correctly set
3. Test with manual workflow dispatch first
4. Check that the script works locally with the same environment variables