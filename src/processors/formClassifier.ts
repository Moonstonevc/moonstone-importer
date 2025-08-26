/**
 * FORM CLASSIFIER
 * 
 * This module is responsible for analyzing form submissions and 
 * categorizing them into different types (founder, searcher, referrals).
 * It provides a clean interface for separating mixed form data.
 */

import { FORM_TYPE_MAPPINGS } from "../config/constants.js";
import type {
    SpreadsheetRow,
    FormType,
    CategorizedForms,
    ValidForms,
    FormStatistics
} from "../types/index.js";

/**
 * Determines the type of form submission based on the form intent
 * 
 * @param row - The form submission row from Google Sheets
 * @returns The form type
 */
export function classifyFormType(row: SpreadsheetRow): FormType {
    if (!row || !Array.isArray(row)) {
        return "unknown";
    }

    // Column 3 contains the form intent/signal
    const formIntent = (row[3] || "").trim().toLowerCase();

    // Look up the form type in our mappings
    const formType = FORM_TYPE_MAPPINGS[formIntent];

    if (formType) {
        console.log(`📝 Classified form as: ${formType}`);
        return formType;
    }

    console.warn(`⚠️ Unknown form intent: "${formIntent}"`);
    return "unknown";
}

/**
 * Separates all form submissions into categories
 * 
 * @param allRows - All rows from the Google Sheets
 * @returns Object containing arrays of different form types
 */
export function categorizeAllForms(allRows: SpreadsheetRow[]): CategorizedForms {
    console.log("📊 Categorizing all form submissions...");

    if (!Array.isArray(allRows)) {
        throw new Error("Form data must be an array of rows");
    }

    const categories: CategorizedForms = {
        founders: [],
        founderReferrals: [],
        searchers: [],
        searcherReferrals: [],
        unknown: []
    };

    let processedCount = 0;

    for (const row of allRows) {
        const formType = classifyFormType(row);
        processedCount++;

        switch (formType) {
            case "founder":
                categories.founders.push(row);
                break;
            case "founder referral":
                categories.founderReferrals.push(row);
                break;
            case "searcher":
                categories.searchers.push(row);
                break;
            case "searcher referral":
                categories.searcherReferrals.push(row);
                break;
            default:
                categories.unknown.push(row);
                break;
        }
    }

    // Log the categorization results
    console.log("📈 Form categorization complete:");
    console.log(`  📋 Total forms processed: ${processedCount}`);
    console.log(`  🏢 Founder forms: ${categories.founders.length}`);
    console.log(`  👥 Founder referrals: ${categories.founderReferrals.length}`);
    console.log(`  🔍 Searcher forms: ${categories.searchers.length}`);
    console.log(`  🤝 Searcher referrals: ${categories.searcherReferrals.length}`);
    console.log(`  ❓ Unknown forms: ${categories.unknown.length}`);

    // Warn about unknown forms
    if (categories.unknown.length > 0) {
        console.warn("⚠️ Found forms with unknown types - these will be skipped");
        categories.unknown.slice(0, 5).forEach((row, index) => {
            console.warn(`  - Row ${index + 1}: "${row[3] || 'No intent specified'}"`);
        });
    }

    return categories;
}

/**
 * Validates that a form submission has the minimum required data
 * 
 * @param row - The form submission row
 * @param formType - The type of form
 * @returns True if the form has valid data
 */
export function validateFormData(row: SpreadsheetRow, formType: FormType): boolean {
    if (!row || !Array.isArray(row)) {
        return false;
    }

    switch (formType) {
        case "founder":
            // Founders need at least a startup name (column 73)
            return !!(row[73] && row[73].trim());

        case "founder referral":
            // Founder referrals need referrer info and startup name
            return !!(row[4] && row[4].trim() && row[9] && row[9].trim());

        case "searcher":
            // Searchers need at least a name (column 37)
            return !!(row[37] && row[37].trim());

        case "searcher referral":
            // Searcher referrals need referrer info and searcher name
            return !!(row[18] && row[18].trim() && row[22] && row[22].trim());

        default:
            return false;
    }
}

/**
 * Filters out invalid form submissions from each category
 * 
 * @param categories - Categorized forms from categorizeAllForms
 * @returns Filtered categories with only valid forms
 */
export function filterValidForms(categories: CategorizedForms): ValidForms {
    console.log("🔍 Filtering out invalid form submissions...");

    const filtered: ValidForms = {
        founders: [],
        founderReferrals: [],
        searchers: [],
        searcherReferrals: []
    };

    // Filter each category
    for (const [categoryName, forms] of Object.entries(categories)) {
        if (categoryName === "unknown") continue; // Skip unknown forms

        const formType = getFormTypeFromCategory(categoryName);
        const validForms = forms.filter((row: SpreadsheetRow) => validateFormData(row, formType));
        const invalidCount = forms.length - validForms.length;

        (filtered as any)[categoryName] = validForms;

        if (invalidCount > 0) {
            console.warn(`⚠️ Filtered out ${invalidCount} invalid ${categoryName} forms`);
        }
    }

    console.log("✅ Form validation complete");
    return filtered;
}

/**
 * Helper function to map category names to form types
 * 
 * @param categoryName - The category name
 * @returns The corresponding form type
 */
function getFormTypeFromCategory(categoryName: string): FormType {
    const mapping: Record<string, FormType> = {
        founders: "founder",
        founderReferrals: "founder referral",
        searchers: "searcher",
        searcherReferrals: "searcher referral"
    };

    return mapping[categoryName] || "unknown";
}

/**
 * Gets summary statistics about the form data
 * 
 * @param categories - Categorized forms
 * @returns Summary statistics
 */
export function getFormStatistics(categories: ValidForms): FormStatistics {
    const stats: FormStatistics = {
        totalForms: 0,
        byType: {},
        completionRates: {}
    };

    for (const [categoryName, forms] of Object.entries(categories)) {
        const formType = getFormTypeFromCategory(categoryName);
        const validForms = forms.filter((row: SpreadsheetRow) => validateFormData(row, formType));

        stats.totalForms += forms.length;
        stats.byType[categoryName] = {
            total: forms.length,
            valid: validForms.length,
            invalid: forms.length - validForms.length
        };

        stats.completionRates[categoryName] = forms.length > 0
            ? Math.round((validForms.length / forms.length) * 100)
            : 0;
    }

    return stats;
}
