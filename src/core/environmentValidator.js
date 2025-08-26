/**
 * ENVIRONMENT VALIDATOR
 * 
 * This module handles validation of environment variables and configuration
 * to ensure the application has everything it needs to run properly.
 */

import { REQUIRED_ENV_VARS } from "../config/constants.js";
import { validateGoogleSheetsEnvironment } from "../services/googleSheetsService.js";
import { validateNotionEnvironment } from "../services/notionService.js";

/**
 * Validates that all required environment variables are present and valid
 * 
 * @throws {Error} If any required environment variables are missing or invalid
 */
export function validateEnvironment() {
    console.log("🔍 Checking environment variables...");

    // Check for missing environment variables
    const missingVars = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(", ")}`);
    }

    // Validate Google Sheets environment
    if (!validateGoogleSheetsEnvironment(process.env)) {
        throw new Error("Google Sheets environment validation failed");
    }

    // Validate Notion environment
    if (!validateNotionEnvironment(process.env)) {
        throw new Error("Notion environment validation failed");
    }

    console.log("✅ Environment validation passed");

    // Display configuration summary (without sensitive data)
    displayConfigurationSummary();
}

/**
 * Displays a summary of the current configuration without exposing sensitive data
 */
function displayConfigurationSummary() {
    console.log("📋 Configuration Summary:");
    console.log(`  - Google Sheet ID: ${process.env.GOOGLE_SHEET_ID}`);
    console.log(`  - Notion Database ID: ${process.env.NOTION_DATABASE_ID}`);
    console.log(`  - Notion API Key: ${process.env.NOTION_API_KEY ? "✓ Set" : "✗ Missing"}`);
    console.log(`  - Google Service Account: ${process.env.GAPI_SERVICE_ACCOUNT_KEY ? "✓ Set" : "✗ Missing"}`);
}

/**
 * Validates a specific environment variable exists and is not empty
 * 
 * @param {string} varName - Name of the environment variable
 * @returns {boolean} - True if the variable exists and has a value
 */
export function validateEnvironmentVariable(varName) {
    const value = process.env[varName];
    return value && value.trim().length > 0;
}

/**
 * Gets an environment variable with a default value
 * 
 * @param {string} varName - Name of the environment variable
 * @param {string} defaultValue - Default value if variable is not set
 * @returns {string} - The environment variable value or default
 */
export function getEnvironmentVariable(varName, defaultValue = "") {
    return process.env[varName] || defaultValue;
}
