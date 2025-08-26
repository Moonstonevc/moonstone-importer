/**
 * MOONSTONE IMPORTER - LEGACY ENTRY POINT
 * 
 * This file serves as a compatibility layer for the refactored Moonstone Importer.
 * It imports and runs the new modular application structure.
 * 
 * FOR NON-PROGRAMMERS:
 * This is the main file that starts the application. When you run "npm start"
 * or "node index.js", this file will execute and start the import process.
 * 
 * The actual application logic has been moved to organized modules in the /src folder:
 * - /src/main.js - Main application orchestrator
 * - /src/config/ - Configuration and constants
 * - /src/services/ - External service connections (Google Sheets, Notion)
 * - /src/processors/ - Form processing logic
 * - /src/utils/ - Utility functions
 * 
 * WHAT HAPPENS WHEN YOU RUN THIS:
 * 1. Environment variables are checked
 * 2. Connection to Google Sheets is established
 * 3. Form data is downloaded and categorized
 * 4. Connection to Notion is established
 * 5. Notion pages are created/updated with form data
 * 6. Results summary is displayed
 * 
 * BEFORE RUNNING:
 * Make sure you have set up these environment variables:
 * - NOTION_API_KEY (your Notion integration token)
 * - NOTION_DATABASE_ID (the ID of your Notion database)
 * - GOOGLE_SHEET_ID (the ID of your Google Spreadsheet)
 * - GAPI_SERVICE_ACCOUNT_KEY (Google service account credentials as JSON string)
 * 
 * You can set these in a .env file in the same directory as this file.
 */

// Import the main application
import('./src/main.js')
  .then(() => {
    // Application completed successfully
    console.log('\n✅ Application finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    // Application failed
    console.error('\n❌ Application failed to start:');
    console.error(error.message);

    // Provide helpful troubleshooting information
    console.error('\n🔧 TROUBLESHOOTING GUIDE:');
    console.error('1. Check that all environment variables are set:');
    console.error('   - NOTION_API_KEY');
    console.error('   - NOTION_DATABASE_ID');
    console.error('   - GOOGLE_SHEET_ID');
    console.error('   - GAPI_SERVICE_ACCOUNT_KEY');
    console.error('');
    console.error('2. Verify your .env file is in the correct location');
    console.error('3. Ensure your Google service account has access to the spreadsheet');
    console.error('4. Confirm your Notion integration has access to the database');
    console.error('');
    console.error('📚 For more help, check the README.md file or documentation');

    process.exit(1);
  });