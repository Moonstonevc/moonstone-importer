/**
 * APPLICATION ORCHESTRATOR
 * 
 * This module handles the high-level orchestration of the import process.
 * It coordinates between different services and processors to complete
 * the full data import workflow.
 */

import { readSpreadsheetData } from "../services/googleSheetsService.js";
import { createNotionClient, getAllDatabasePages } from "../services/notionService.js";
import { categorizeAllForms, filterValidForms, getFormStatistics } from "../processors/formClassifier.js";
import { processFounders } from "../processors/founderProcessor.js";
import { processSearchers } from "../processors/searcherProcessor.js";
import { debugSearcherReferralMatching } from "../utils/matchingUtils.js";

/**
 * Initializes connections to Google Sheets and Notion services
 * 
 * @returns {Promise<Object>} - Object containing sheetsData and notionClient
 */
export async function initializeServices() {
    console.log("🔗 Connecting to external services...");

    // Initialize Notion client
    console.log("🔗 Connecting to Notion...");
    const notionClient = createNotionClient(process.env.NOTION_API_KEY);

    // Read data from Google Sheets
    console.log("📊 Reading data from Google Sheets...");
    const sheetsData = await readSpreadsheetData(
        process.env.GOOGLE_SHEET_ID,
        process.env.GAPI_SERVICE_ACCOUNT_KEY
    );

    console.log("✅ Services initialized successfully");
    return { sheetsData, notionClient };
}

/**
 * Processes and categorizes the raw form data from Google Sheets
 * 
 * @param {Array<Array>} sheetsData - Raw data from Google Sheets
 * @returns {Promise<Object>} - Processed and categorized form data
 */
export async function processFormData(sheetsData) {
    console.log("🔄 Processing form data...");

    if (!sheetsData || sheetsData.length === 0) {
        throw new Error("No data found in Google Sheets");
    }

    console.log(`📊 Found ${sheetsData.length} total rows in spreadsheet`);

    // Categorize all forms by type
    const categorizedForms = categorizeAllForms(sheetsData);

    // Filter out invalid forms
    const validForms = filterValidForms(categorizedForms);

    // Get statistics
    const statistics = getFormStatistics(validForms);

    // Debug searcher-referral matching
    console.log("🔍 Analyzing searcher-referral relationships...");
    debugSearcherReferralMatching(
        sheetsData,
        validForms.searchers,
        validForms.searcherReferrals
    );

    console.log("✅ Form data processing complete");

    return {
        raw: sheetsData,
        categorized: categorizedForms,
        valid: validForms,
        statistics: statistics
    };
}

/**
 * Imports the processed data to Notion
 * 
 * @param {Object} processedData - Processed form data
 * @param {Object} notionClient - Notion client with retry capabilities
 * @returns {Promise<Object>} - Import results summary
 */
export async function importToNotion(processedData, notionClient) {
    console.log("📝 Starting Notion import process...");

    const databaseId = process.env.NOTION_DATABASE_ID;
    const { valid: forms } = processedData;

    // Get existing pages for reference
    console.log("📚 Fetching existing Notion pages...");
    const existingPages = await getAllDatabasePages(databaseId, notionClient);
    console.log(`📄 Found ${existingPages.length} existing pages in database`);

    const results = {
        founders: { processed: 0, created: 0, updated: 0, errors: 0 },
        searchers: { processed: 0, created: 0, updated: 0, errors: 0 },
        totalTime: Date.now()
    };

    // Process founders and their referrals
    if (forms.founders.length > 0 || forms.founderReferrals.length > 0) {
        console.log("🏢 Processing founders and founder referrals...");
        results.founders = await processFounders(
            forms.founders,
            forms.founderReferrals,
            notionClient,
            databaseId
        );
    }

    // Process searchers and their referrals
    if (forms.searchers.length > 0 || forms.searcherReferrals.length > 0) {
        console.log("🔍 Processing searchers and searcher referrals...");
        results.searchers = await processSearchers(
            forms.searchers,
            forms.searcherReferrals,
            notionClient,
            databaseId
        );
    }

    results.totalTime = Date.now() - results.totalTime;

    console.log("✅ Notion import process complete");
    return results;
}
