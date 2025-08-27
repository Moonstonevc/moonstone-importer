/**
 * MATCHING UTILITIES
 * 
 * This module contains functions for matching and comparing data between
 * different sources (Google Sheets, Notion, etc.). It uses fuzzy matching
 * to handle slight variations in names and text.
 */

import { distance } from "fastest-levenshtein";
import { normalizeText } from "./textUtils.js";
import type { SpreadsheetRow, MatchingDebugInfo } from "../types/index.js";

/**
 * Finds the best match for a target string from a list of candidates
 * using fuzzy string matching (Levenshtein distance).
 * 
 * @param target - The string to find a match for
 * @param candidates - Array of possible matches
 * @param maxDistance - Maximum allowed distance (default: 2)
 * @returns The best match or null if no good match found
 */
export function findBestMatch(
    target: string,
    candidates: string[],
    maxDistance = 2
): string | null {
    if (!target || !Array.isArray(candidates)) return null;

    const normalizedTarget = normalizeText(target);
    let bestMatch: string | null = null;
    let bestScore = Infinity;

    for (const candidate of candidates) {
        if (!candidate) continue;

        const normalizedCandidate = normalizeText(candidate);
        const score = distance(normalizedTarget, normalizedCandidate);

        if (score < bestScore) {
            bestScore = score;
            bestMatch = candidate;
        }
    }

    // Only return a match if it's within the acceptable distance
    return bestScore <= maxDistance ? bestMatch : null;
}

/**
 * Checks if two strings are similar enough to be considered a match
 * 
 * @param str1 - First string
 * @param str2 - Second string  
 * @param maxDistance - Maximum allowed distance (default: 2)
 * @returns True if strings match within tolerance
 */
export function isStringMatch(str1: string, str2: string, maxDistance = 2): boolean {
    if (!str1 || !str2) return false;

    const normalized1 = normalizeText(str1);
    const normalized2 = normalizeText(str2);

    return distance(normalized1, normalized2) <= maxDistance;
}

/**
 * Creates a mapping of normalized keys to original values and associated data.
 * This is useful for building lookup tables from spreadsheet data.
 * 
 * @param rows - Array of data rows
 * @param keyColumn - Column index to use as the key
 * @returns Mapping object with normalized keys
 */
export function createKeyMapping(rows: SpreadsheetRow[], keyColumn: number): Record<string, { display: string; rows: SpreadsheetRow[] }> {
    const mapping: Record<string, { display: string; rows: SpreadsheetRow[] }> = {};

    for (const row of rows) {
        const rawKey = row[keyColumn];
        if (!rawKey) continue;

        const normalizedKey = normalizeText(String(rawKey).trim());
        if (!normalizedKey) continue;

        if (!mapping[normalizedKey]) {
            mapping[normalizedKey] = {
                display: String(rawKey).trim(), // Keep original for display
                rows: []
            };
        }

        mapping[normalizedKey].rows.push(row);
    }

    return mapping;
}

/**
 * Finds matching referrals for a given searcher name
 * 
 * @param searcherName - The searcher's name to find referrals for
 * @param referralRows - Array of referral data rows
 * @param referralNameColumn - Column index containing referral names
 * @returns Array of matching referral rows
 */
export function findMatchingReferrals(
    searcherName: string,
    referralRows: SpreadsheetRow[],
    referralNameColumn: number
): SpreadsheetRow[] {
    if (!searcherName || !Array.isArray(referralRows)) return [];

    const normalizedSearcherName = normalizeText(searcherName);

    return referralRows.filter(row => {
        const referralName = row[referralNameColumn];
        if (!referralName) return false;

        const normalizedReferralName = normalizeText(referralName);
        return normalizedReferralName === normalizedSearcherName;
    });
}

/**
 * Debugs the relationship between searchers and their referrals,
 * identifying any mismatches or missing connections.
 * 
 * @param allRows - All data rows
 * @param searcherRows - Searcher form submissions
 * @param referralRows - Referral form submissions
 * @returns Debug information about matching
 */
export function debugSearcherReferralMatching(
    allRows: SpreadsheetRow[],
    searcherRows: SpreadsheetRow[],
    referralRows: SpreadsheetRow[]
): MatchingDebugInfo {
    console.log("🔍 DEBUGGING SEARCHER-REFERRAL MATCHING");

    // Build set of searcher names from searcher forms (column 37)
    const searcherNames = new Set(
        searcherRows
            .map(row => normalizeText(row[37] || ""))
            .filter(name => name.length > 0)
    );

    // Check each referral to see if it matches a searcher
    const unmatchedReferrals: Array<{ rowIndex: number; referredName: string; normalizedName: string }> = [];

    for (const referralRow of referralRows) {
        const referredName = normalizeText(referralRow[22] || ""); // Column 22: referred searcher name

        if (referredName && !searcherNames.has(referredName)) {
            const rowIndex = allRows.indexOf(referralRow);
            unmatchedReferrals.push({
                rowIndex,
                referredName: referralRow[22] || "", // Keep original for display
                normalizedName: referredName
            });
        }
    }

    console.log(`📊 Found ${searcherNames.size} searchers`);
    console.log(`📊 Found ${referralRows.length} referrals`);
    console.log(`⚠️ Found ${unmatchedReferrals.length} unmatched referrals`);

    if (unmatchedReferrals.length > 0) {
        console.log("🔍 Unmatched referrals (first 10):");
        unmatchedReferrals.slice(0, 10).forEach(ref => {
            console.log(`  - Row ${ref.rowIndex}: "${ref.referredName}"`);
        });
    } else {
        console.log("✅ All referrals have matching searchers");
    }

    return {
        totalSearchers: searcherNames.size,
        totalReferrals: referralRows.length,
        unmatchedReferrals: unmatchedReferrals.length
    };
}
