# Moonstone Importer

Automated pipeline that reads form submissions from two Google Sheets (incoming applications and references) and creates or updates organized pages in a Notion database. Runs automatically every 4 hours via GitHub Actions.

## What it does

1. Reads all rows from the **incoming form sheet** (founders, searchers, Urban Venture, HSF, Searchfund applicants)
2. Reads all rows from the **references sheet**
3. For each incoming row: creates a new Notion page or updates the existing one, sets the correct status property based on the entity chosen, and appends all form answers into a `Form` toggle
4. For each reference row: if the startup name fuzzy-matches an existing Notion page, appends a `Referral Insight` toggle to that page — otherwise creates a standalone `[REFERENCE] Startup Name` page
5. Pushes a keep-alive commit to prevent GitHub from disabling the scheduled workflow

## Secrets required

Set these in GitHub → Settings → Secrets and variables → Actions:

| Secret | Description |
|---|---|
| `NOTION_API_KEY` | Notion integration token |
| `NOTION_DATABASE_ID` | ID of the Notion database |
| `GAPI_SERVICE_ACCOUNT_KEY` | Full JSON of the Google service account |
| `GOOGLE_SHEET_ID_INCOMING` | Sheet ID of the incoming form responses |
| `GOOGLE_SHEET_ID_REFS` | Sheet ID of the reference form responses |
| `GH_PAT` | GitHub fine-grained PAT with Contents read/write on this repo (for keep-alive commits) |

The Google service account email is `notion-importer@notion-importer-gs.iam.gserviceaccount.com` — both sheets must be shared with this address (Viewer access).

## Column mapping

### Incoming sheet (GOOGLE_SHEET_ID_INCOMING)
- Col 3: Entity selector → routes to `Moonstone Status`, `Urban Venture Status`, `HSF`, or `Moonstone Searchfund` property
- Col 7: Organisation name → Notion page title
- Cols 4–6, 8–12, 19: mapped to Notion properties
- Cols 13–39: appended as question/answer toggles inside a `Form` toggle

### References sheet (GOOGLE_SHEET_ID_REFS)
- Col 7: Startup name → used to match against existing Notion pages
- All cols: appended as a table inside a `Referral Insight` toggle

## Schedule

Runs every 4 hours. Can also be triggered manually from the Actions tab → Moonstone Importer - Scheduled Run → Run workflow.

## Keep-alive

Every run commits a timestamp to `.last-run`. This prevents GitHub from auto-disabling the scheduled workflow after 60 days of no repository activity.
