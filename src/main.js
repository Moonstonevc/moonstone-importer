/**
 * MOONSTONE IMPORTER - MAIN APPLICATION
 * 
 * This is the main entry point for the Moonstone Importer application.
 * It orchestrates the entire process of importing form data from Google Sheets
 * and creating/updating pages in Notion.
 * 
 * WHAT THIS APPLICATION DOES:
 * 1. Validates environment configuration
 * 2. Initializes external services (Google Sheets, Notion)
 * 3. Processes and categorizes form data
 * 4. Imports organized data to Notion
 * 5. Reports comprehensive results
 * 
 * ENVIRONMENT VARIABLES REQUIRED:
 * - NOTION_API_KEY: Your Notion integration token
 * - NOTION_DATABASE_ID: The ID of your Notion database
 * - GOOGLE_SHEET_ID: The ID of your Google Spreadsheet
 * - GAPI_SERVICE_ACCOUNT_KEY: JSON string of Google service account credentials
 */

import { validateEnvironment } from "./core/environmentValidator.js";
import { initializeServices, processFormData, importToNotion } from "./core/applicationOrchestrator.js";
import { displayResults } from "./core/resultsReporter.js";

/**
 * Main application function that orchestrates the entire import process
 */
async function main() {
    console.log("🚀 MOONSTONE IMPORTER STARTING");
    console.log("=".repeat(50));

    try {
        // Step 1: Validate Environment
        console.log("🔧 Step 1: Validating environment configuration...");
        validateEnvironment();

        // Step 2: Initialize Services
        console.log("🔧 Step 2: Initializing external services...");
        const { sheetsData, notionClient } = await initializeServices();

        // Step 3: Process Form Data
        console.log("📊 Step 3: Processing and categorizing form data...");
        const processedData = await processFormData(sheetsData);

        // Step 4: Import to Notion
        console.log("📝 Step 4: Importing data to Notion...");
        const results = await importToNotion(processedData, notionClient);

        // Step 5: Display Results
        console.log("📈 Step 5: Import completed successfully!");
        displayResults(results);

    } catch (error) {
        handleApplicationError(error);
    }
}

/**
 * Handles application-level errors with helpful troubleshooting information
 * 
 * @param {Error} error - The error that occurred
 */
function handleApplicationError(error) {
    console.error("❌ APPLICATION FAILED:");
    console.error(error.message);

    console.error("\n🔍 TROUBLESHOOTING TIPS:");
    console.error("- Check that all environment variables are set correctly");
    console.error("- Verify Google Sheets and Notion API access");
    console.error("- Ensure the spreadsheet and database IDs are correct");
    console.error("- Check your internet connection");
    console.error("- Review the error message above for specific details");

    process.exit(1);
}

/**
 * Error handler for uncaught exceptions
 */
process.on('uncaughtException', (error) => {
    console.error('\n❌ UNCAUGHT EXCEPTION:');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
});

/**
 * Error handler for unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
    console.error('\n❌ UNHANDLED PROMISE REJECTION:');
    console.error('Promise:', promise);
    console.error('Reason:', reason);
    process.exit(1);
});

// Start the application
main().catch(error => {
    console.error('❌ Application startup failed:', error.message);
    process.exit(1);
});