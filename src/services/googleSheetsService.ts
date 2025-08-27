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
import type { SpreadsheetRow, RetryOptions } from "../types/index.js";
import { ServiceError } from "../types/index.js";

/**
 * Google Sheets client interface
 */
interface GoogleSheetsClient {
    spreadsheets: {
        values: {
            get: (params: {
                spreadsheetId: string;
                range: string;
            }) => Promise<{
                data: {
                    values?: string[][];
                };
            }>;
        };
        get: (params: {
            spreadsheetId: string;
        }) => Promise<{
            data: {
                properties: {
                    title: string;
                };
                sheets: Array<{
                    properties: {
                        title: string;
                        sheetId: number;
                        gridProperties: {
                            rowCount: number;
                            columnCount: number;
                        };
                    };
                }>;
            };
        }>;
    };
}

/**
 * Service account credentials structure
 */
interface ServiceAccountCredentials {
    type: string;
    project_id: string;
    private_key_id: string;
    private_key: string;
    client_email: string;
    client_id: string;
    auth_uri: string;
    token_uri: string;
    auth_provider_x509_cert_url: string;
    client_x509_cert_url: string;
}

/**
 * Creates and configures a Google Sheets client
 * 
 * @param serviceAccountKey - JSON string containing service account credentials
 * @returns Configured Google Sheets client
 */
function createSheetsClient(serviceAccountKey: string): GoogleSheetsClient {
    console.log("🔧 Setting up Google Sheets client...");

    let credentials: ServiceAccountCredentials;
    try {
        credentials = JSON.parse(serviceAccountKey) as ServiceAccountCredentials;
        console.log("✅ Successfully parsed Google service account credentials");
    } catch (error) {
        console.error("❌ Failed to parse Google service account key:", error instanceof Error ? error.message : error);
        throw new ServiceError("Invalid Google service account key format", "google-sheets", error as Error);
    }

    // Create authentication client
    const googleClient = auth.fromJSON(credentials);
    (googleClient as any).scopes = API_CONFIG.GOOGLE_SHEETS.SCOPES;

    // Create and return sheets client
    const sheets = google.sheets({ version: "v4", auth: googleClient as any }) as GoogleSheetsClient;

    console.log("✅ Google Sheets client configured successfully");
    return sheets;
}

/**
 * Utility function for adding delays between operations
 * 
 * @param milliseconds - How long to wait
 * @returns Promise that resolves after the delay
 */
function sleep(milliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

/**
 * Retry wrapper for Google Sheets operations with exponential backoff
 * 
 * @param operation - The operation to retry
 * @param options - Retry configuration
 * @returns Result of the operation
 */
async function withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const { maxAttempts = 5, baseDelay = 500 } = options;
    let lastError: Error | unknown;

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
 * @param error - The error to check
 * @returns True if the error is retryable
 */
function isRetryableError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;

    const errorObj = error as Record<string, unknown>;
    const code = errorObj.code || errorObj.status || errorObj.name;
    const message = typeof errorObj.message === 'string' ? errorObj.message.toLowerCase() : '';

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
 * @param spreadsheetId - The ID of the Google Spreadsheet
 * @param serviceAccountKey - JSON credentials for service account
 * @param range - The range of cells to read (default: A2:ABY)
 * @returns Array of rows from the spreadsheet
 */
export async function readSpreadsheetData(
    spreadsheetId: string,
    serviceAccountKey: string,
    range?: string
): Promise<SpreadsheetRow[]> {
    console.log("📊 Starting to read Google Sheets data...");

    if (!spreadsheetId) {
        throw new ServiceError("Spreadsheet ID is required", "google-sheets");
    }

    if (!serviceAccountKey) {
        throw new ServiceError("Service account key is required", "google-sheets");
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("❌ Failed to read Google Sheets data:", errorMessage);
        throw new ServiceError(`Google Sheets read failed: ${errorMessage}`, "google-sheets", error as Error);
    }
}

/**
 * Validates that the required environment variables are present
 * 
 * @param env - Environment variables object
 * @returns True if all required variables are present
 */
export function validateGoogleSheetsEnvironment(env: Record<string, string | undefined>): boolean {
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
 * Spreadsheet information interface
 */
export interface SpreadsheetInfo {
    title: string;
    sheetCount: number;
    sheets: Array<{
        title: string;
        sheetId: number;
        rowCount: number;
        columnCount: number;
    }>;
}

/**
 * Gets basic information about a spreadsheet (for debugging/validation)
 * 
 * @param spreadsheetId - The ID of the Google Spreadsheet
 * @param serviceAccountKey - JSON credentials for service account
 * @returns Basic spreadsheet information
 */
export async function getSpreadsheetInfo(
    spreadsheetId: string,
    serviceAccountKey: string
): Promise<SpreadsheetInfo> {
    console.log("ℹ️ Getting spreadsheet information...");

    const sheets = createSheetsClient(serviceAccountKey);

    try {
        const response = await withRetry(
            () => sheets.spreadsheets.get({
                spreadsheetId: spreadsheetId,
            }),
            { maxAttempts: 3, baseDelay: 500 }
        );

        const info: SpreadsheetInfo = {
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("❌ Failed to get spreadsheet info:", errorMessage);
        throw new ServiceError(`Spreadsheet info failed: ${errorMessage}`, "google-sheets", error as Error);
    }
}
