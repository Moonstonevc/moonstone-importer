/**
 * MOONSTONE IMPORTER - LEGACY ENTRY POINT
 * 
 * This file serves as a compatibility layer for the refactored Moonstone Importer.
 * It imports and runs the new modular TypeScript application structure.
 * 
 * FOR NON-PROGRAMMERS:
 * This is the main file that starts the application. When you run "npm start"
 * or "node index.js", this file will execute and start the import process.
 * 
 * The actual application logic has been moved to organized TypeScript modules in the /src folder:
 * - /src/main.ts - Main application orchestrator (TypeScript)
 * - /src/config/ - Configuration and constants
 * - /src/services/ - External service connections (Google Sheets, Notion)
 * - /src/processors/ - Form processing logic
 * - /src/utils/ - Utility functions
 * - /src/types/ - TypeScript type definitions for type safety
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
 * 
 * NEW IN VERSION 2.0:
 * - Full TypeScript support for better code quality and type safety
 * - Improved error handling with detailed error types
 * - Better modular architecture
 * - Enhanced documentation and maintainability
 */

// Check if we're in development mode and should use TypeScript directly
const isDevelopment = process.env.NODE_ENV === 'development';

if (isDevelopment) {
  // In development, use tsx to run TypeScript directly
  console.log('🔧 Running in development mode with TypeScript...');
  import('./src/main.ts')
    .then(() => {
      console.log('\n✅ TypeScript application finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ TypeScript application failed to start:');
      console.error(error.message);
      provideTroubleshootingHelp();
      process.exit(1);
    });
} else {
  // In production, use compiled JavaScript
  console.log('🚀 Running compiled JavaScript version...');
  import('./dist/main.js')
    .then(() => {
      console.log('\n✅ Application finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Application failed to start:');
      console.error(error.message);

      // If compiled version fails, try TypeScript version as fallback
      console.log('\n🔄 Attempting to run TypeScript version as fallback...');
      return import('./src/main.ts');
    })
    .then(() => {
      if (!isDevelopment) {
        console.log('\n✅ TypeScript fallback completed successfully');
        console.log('💡 Consider running "npm run build" to compile TypeScript for better performance');
        process.exit(0);
      }
    })
    .catch((error) => {
      console.error('\n❌ Both compiled and TypeScript versions failed:');
      console.error(error.message);
      provideTroubleshootingHelp();
      process.exit(1);
    });
}

/**
 * Provides helpful troubleshooting information
 */
function provideTroubleshootingHelp() {
  console.error('\n🔧 TROUBLESHOOTING GUIDE:');
  console.error('1. Check that all environment variables are set:');
  console.error('   - NOTION_API_KEY');
  console.error('   - NOTION_DATABASE_ID');
  console.error('   - GOOGLE_SHEET_ID');
  console.error('   - GAPI_SERVICE_ACCOUNT_KEY');
  console.error('');
  console.error('2. If using compiled version, try building first:');
  console.error('   npm run build');
  console.error('');
  console.error('3. For development, install TypeScript dependencies:');
  console.error('   npm install');
  console.error('');
  console.error('4. Verify your .env file is in the correct location');
  console.error('5. Ensure your Google service account has access to the spreadsheet');
  console.error('6. Confirm your Notion integration has access to the database');
  console.error('');
  console.error('📚 For more help, check the README.md file or documentation');
}