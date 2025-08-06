// Local testing script for Moonstone Importer
// Run with: node test-local.js

import dotenv from 'dotenv';
import { main } from './index.js';

// Load environment variables from .env file
try {
  dotenv.config();
  console.log('🔧 Environment variables loaded from .env file');
} catch (error) {
  console.log('⚠️  No .env file found, using system environment variables');
}

// Validate required environment variables
const requiredVars = [
  'NOTION_API_KEY',
  'GAPI_SERVICE_ACCOUNT_KEY', 
  'GOOGLE_SHEET_ID',
  'NOTION_DATABASE_ID'
];

console.log('🔍 Checking environment variables...');
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\n💡 Create a .env file with these variables or set them in your system');
  process.exit(1);
}

console.log('✅ All environment variables are set');
console.log('🚀 Starting local test run...');
console.log('⏰ Started at:', new Date().toISOString());

// Run the main function with timeout
const timeout = setTimeout(() => {
  console.error('⏰ Test timed out after 15 minutes');
  process.exit(1);
}, 15 * 60 * 1000); // 15 minutes

main()
  .then(() => {
    clearTimeout(timeout);
    console.log('✅ Test completed successfully!');
    console.log('⏰ Finished at:', new Date().toISOString());
  })
  .catch((error) => {
    clearTimeout(timeout);
    console.error('❌ Test failed:', error);
    process.exit(1);
  });