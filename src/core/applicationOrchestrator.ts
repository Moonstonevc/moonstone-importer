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
import type {
    SpreadsheetRow,
    ProcessedFormData,
    ImportResults,
    NotionClientWithRetry
} from "../types/index.js";
import { getEnvironmentVariables } from "./environmentValidator.js";

/**
 * Service initialization result
 */
interface ServiceInitializationResult {
    sheetsData: SpreadsheetRow[];
    notionClient: NotionClientWithRetry;
}

/**
 * Initializes connections to Google Sheets and Notion services
 * 
 * @returns Object containing sheetsData and notionClient
 */
export async function initializeServices(): Promise<ServiceInitializationResult> {
    console.log("🔗 Connecting to external services...");

    const env = getEnvironmentVariables();

    // Initialize Notion client
    console.log("🔗 Connecting to Notion...");
    const notionClient = createNotionClient(env.NOTION_API_KEY);

    // Read data from Google Sheets
    console.log("📊 Reading data from Google Sheets...");
    const sheetsData = await readSpreadsheetData(
        env.GOOGLE_SHEET_ID,
        env.GAPI_SERVICE_ACCOUNT_KEY
    );

    console.log("✅ Services initialized successfully");
    return { sheetsData, notionClient };
}

/**
 * Processes and categorizes the raw form data from Google Sheets
 * 
 * @param sheetsData - Raw data from Google Sheets
 * @returns Processed and categorized form data
 */
export async function processFormData(sheetsData: SpreadsheetRow[]): Promise<ProcessedFormData> {
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
 * @param processedData - Processed form data
 * @param notionClient - Notion client with retry capabilities
 * @returns Import results summary
 */
export async function importToNotion(
    processedData: ProcessedFormData,
    notionClient: NotionClientWithRetry
): Promise<ImportResults> {
    console.log("📝 Starting Notion import process...");

    const env = getEnvironmentVariables();
    const databaseId = env.NOTION_DATABASE_ID;
    const { valid: forms } = processedData;

    // Get existing pages for reference
    console.log("📚 Fetching existing Notion pages...");
    const existingPages = await getAllDatabasePages(databaseId, notionClient);
    console.log(`📄 Found ${existingPages.length} existing pages in database`);

    const results: ImportResults = {
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
