/**
 * GOOGLE SHEETS SERVICE
 * 
 * This module handles all interactions with Google Sheets API.
 * It provides a clean interface for reading spreadsheet data
 * and includes retry logic for reliability.
 */

import { google } from "googleapis";
import { auth } from "google-auth-library";
import { API_CONFIG } from "../config/constants.js";

/**
 * Creates and configures a Google Sheets client
 * 
 * @param {string} serviceAccountKey - JSON string containing service account credentials
 * @returns {Object} - Configured Google Sheets client
 */
function createSheetsClient(serviceAccountKey) {
    console.log("🔧 Setting up Google Sheets client...");

    let credentials;
    try {
        credentials = JSON.parse(serviceAccountKey);
        console.log("✅ Successfully parsed Google service account credentials");
    } catch (error) {
        console.error("❌ Failed to parse Google service account key:", error.message);
        throw new Error("Invalid Google service account key format");
    }

    // Create authentication client
    const googleClient = auth.fromJSON(credentials);
    googleClient.scopes = API_CONFIG.GOOGLE_SHEETS.SCOPES;

    // Create and return sheets client
    const sheets = google.sheets({ version: "v4", auth: googleClient });

    console.log("✅ Google Sheets client configured successfully");
    return sheets;
}

/**
 * Utility function for adding delays between operations
 * 
 * @param {number} milliseconds - How long to wait
 * @returns {Promise} - Promise that resolves after the delay
 */
function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

/**
 * Retry wrapper for Google Sheets operations with exponential backoff
 * 
 * @param {Function} operation - The operation to retry
 * @param {Object} options - Retry configuration
 * @returns {Promise} - Result of the operation
 */
async function withRetry(operation, options = {}) {
    const { maxAttempts = 5, baseDelay = 500 } = options;
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            // Check if this is a retryable error
            const isRetryable = isRetryableError(error);

            if (!isRetryable || attempt === maxAttempts) {
                throw error;
            }

            // Calculate delay with exponential backoff
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.log(`⏳ Attempt ${attempt} failed, retrying in ${delay}ms...`);
            await sleep(delay);
        }
    }

    throw lastError;
}

/**
 * Determines if an error is worth retrying
 * 
 * @param {Error} error - The error to check
 * @returns {boolean} - True if the error is retryable
 */
function isRetryableError(error) {
    const code = error?.code || error?.status || error?.name;
    const message = (error?.message || "").toLowerCase();

    // Common retryable conditions
    const retryableConditions = [
        code === "rate_limited",
        code === 429, // Too Many Requests
        code === 503, // Service Unavailable
        code === "ECONNRESET",
        code === "ENOTFOUND",
        code === "UND_ERR_CONNECT_TIMEOUT",
        code === "UND_ERR_HEADERS_TIMEOUT",
        code === "UND_ERR_SOCKET",
        message.includes("fetch failed"),
        message.includes("terminated")
    ];

    return retryableConditions.some(condition => condition);
}

/**
 * Reads data from a Google Spreadsheet
 * 
 * @param {string} spreadsheetId - The ID of the Google Spreadsheet
 * @param {string} serviceAccountKey - JSON credentials for service account
 * @param {string} range - The range of cells to read (default: A2:ABY)
 * @returns {Promise<Array>} - Array of rows from the spreadsheet
 */
export async function readSpreadsheetData(spreadsheetId, serviceAccountKey, range = null) {
    console.log("📊 Starting to read Google Sheets data...");

    if (!spreadsheetId) {
        throw new Error("Spreadsheet ID is required");
    }

    if (!serviceAccountKey) {
        throw new Error("Service account key is required");
    }

    const sheets = createSheetsClient(serviceAccountKey);
    const readRange = range || API_CONFIG.GOOGLE_SHEETS.RANGE;

    console.log(`📖 Reading range: ${readRange} from spreadsheet: ${spreadsheetId}`);

    try {
        const response = await withRetry(
            () => sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: readRange,
            }),
            { maxAttempts: 5, baseDelay: 500 }
        );

        const rows = response.data.values || [];
        console.log(`✅ Successfully read ${rows.length} rows from Google Sheets`);

        return rows;

    } catch (error) {
        console.error("❌ Failed to read Google Sheets data:", error.message);
        throw new Error(`Google Sheets read failed: ${error.message}`);
    }
}

/**
 * Validates that the required environment variables are present
 * 
 * @param {Object} env - Environment variables object
 * @returns {boolean} - True if all required variables are present
 */
export function validateGoogleSheetsEnvironment(env) {
    const required = ["GAPI_SERVICE_ACCOUNT_KEY", "GOOGLE_SHEET_ID"];
    const missing = required.filter(key => !env[key]);

    if (missing.length > 0) {
        console.error("❌ Missing required Google Sheets environment variables:", missing);
        return false;
    }

    console.log("✅ Google Sheets environment variables validated");
    return true;
}

/**
 * Gets basic information about a spreadsheet (for debugging/validation)
 * 
 * @param {string} spreadsheetId - The ID of the Google Spreadsheet
 * @param {string} serviceAccountKey - JSON credentials for service account
 * @returns {Promise<Object>} - Basic spreadsheet information
 */
export async function getSpreadsheetInfo(spreadsheetId, serviceAccountKey) {
    console.log("ℹ️ Getting spreadsheet information...");

    const sheets = createSheetsClient(serviceAccountKey);

    try {
        const response = await withRetry(
            () => sheets.spreadsheets.get({
                spreadsheetId: spreadsheetId,
            }),
            { maxAttempts: 3, baseDelay: 500 }
        );

        const info = {
            title: response.data.properties.title,
            sheetCount: response.data.sheets.length,
            sheets: response.data.sheets.map(sheet => ({
                title: sheet.properties.title,
                sheetId: sheet.properties.sheetId,
                rowCount: sheet.properties.gridProperties.rowCount,
                columnCount: sheet.properties.gridProperties.columnCount
            }))
        };

        console.log(`ℹ️ Spreadsheet: "${info.title}" with ${info.sheetCount} sheets`);
        return info;

    } catch (error) {
        console.error("❌ Failed to get spreadsheet info:", error.message);
        throw new Error(`Spreadsheet info failed: ${error.message}`);
    }
}
