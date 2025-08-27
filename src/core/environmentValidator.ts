/**
 * ENVIRONMENT VALIDATOR
 * 
 * This module handles validation of environment variables and configuration
 * to ensure the application has everything it needs to run properly.
 */

import { REQUIRED_ENV_VARS } from "../config/constants.js";
import { validateGoogleSheetsEnvironment } from "../services/googleSheetsService.js";
import { validateNotionEnvironment } from "../services/notionService.js";
import type { EnvironmentVariables } from "../types/index.js";
import { ApplicationError } from "../types/index.js";

/**
 * Validates that all required environment variables are present and valid
 * 
 * @throws {ApplicationError} If any required environment variables are missing or invalid
 */
export function validateEnvironment(): void {
    console.log("🔍 Checking environment variables...");

    // Check for missing environment variables
    const missingVars = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        throw new ApplicationError(
            `Missing required environment variables: ${missingVars.join(", ")}`,
            { missingVariables: missingVars }
        );
    }

    // Validate Google Sheets environment
    if (!validateGoogleSheetsEnvironment(process.env as Record<string, string>)) {
        throw new ApplicationError("Google Sheets environment validation failed");
    }

    // Validate Notion environment
    if (!validateNotionEnvironment(process.env as Record<string, string>)) {
        throw new ApplicationError("Notion environment validation failed");
    }

    console.log("✅ Environment validation passed");

    // Display configuration summary (without sensitive data)
    displayConfigurationSummary();
}

/**
 * Displays a summary of the current configuration without exposing sensitive data
 */
function displayConfigurationSummary(): void {
    console.log("📋 Configuration Summary:");
    console.log(`  - Google Sheet ID: ${process.env.GOOGLE_SHEET_ID}`);
    console.log(`  - Notion Database ID: ${process.env.NOTION_DATABASE_ID}`);
    console.log(`  - Notion API Key: ${process.env.NOTION_API_KEY ? "✓ Set" : "✗ Missing"}`);
    console.log(`  - Google Service Account: ${process.env.GAPI_SERVICE_ACCOUNT_KEY ? "✓ Set" : "✗ Missing"}`);
}

/**
 * Validates a specific environment variable exists and is not empty
 * 
 * @param varName - Name of the environment variable
 * @returns True if the variable exists and has a value
 */
export function validateEnvironmentVariable(varName: string): boolean {
    const value = process.env[varName];
    return Boolean(value && value.trim().length > 0);
}

/**
 * Gets an environment variable with a default value
 * 
 * @param varName - Name of the environment variable
 * @param defaultValue - Default value if variable is not set
 * @returns The environment variable value or default
 */
export function getEnvironmentVariable(varName: string, defaultValue = ""): string {
    return process.env[varName] || defaultValue;
}

/**
 * Gets all required environment variables as a typed object
 * 
 * @returns Typed environment variables object
 * @throws {ApplicationError} If any required variables are missing
 */
export function getEnvironmentVariables(): EnvironmentVariables {
    const env = process.env;

    const requiredVars: EnvironmentVariables = {
        NOTION_API_KEY: env.NOTION_API_KEY!,
        NOTION_DATABASE_ID: env.NOTION_DATABASE_ID!,
        GOOGLE_SHEET_ID: env.GOOGLE_SHEET_ID!,
        GAPI_SERVICE_ACCOUNT_KEY: env.GAPI_SERVICE_ACCOUNT_KEY!
    };

    // Validate all required variables are present
    for (const [key, value] of Object.entries(requiredVars)) {
        if (!value) {
            throw new ApplicationError(`Missing required environment variable: ${key}`);
        }
    }

    return requiredVars;
}
