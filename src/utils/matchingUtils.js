/**
 * MATCHING UTILITIES
 * 
 * This module contains functions for matching and comparing data between
 * different sources (Google Sheets, Notion, etc.). It uses fuzzy matching
 * to handle slight variations in names and text.
 */

import { distance } from "fastest-levenshtein";
import { normalizeText } from "./textUtils.js";

/**
 * Finds the best match for a target string from a list of candidates
 * using fuzzy string matching (Levenshtein distance).
 * 
 * @param {string} target - The string to find a match for
 * @param {Array<string>} candidates - Array of possible matches
 * @param {number} maxDistance - Maximum allowed distance (default: 2)
 * @returns {string|null} - The best match or null if no good match found
 */
export function findBestMatch(target, candidates, maxDistance = 2) {
    if (!target || !Array.isArray(candidates)) return null;

    const normalizedTarget = normalizeText(target);
    let bestMatch = null;
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
 * @param {string} str1 - First string
 * @param {string} str2 - Second string  
 * @param {number} maxDistance - Maximum allowed distance (default: 2)
 * @returns {boolean} - True if strings match within tolerance
 */
export function isStringMatch(str1, str2, maxDistance = 2) {
    if (!str1 || !str2) return false;

    const normalized1 = normalizeText(str1);
    const normalized2 = normalizeText(str2);

    return distance(normalized1, normalized2) <= maxDistance;
}

/**
 * Creates a mapping of normalized keys to original values and associated data.
 * This is useful for building lookup tables from spreadsheet data.
 * 
 * @param {Array} rows - Array of data rows
 * @param {number} keyColumn - Column index to use as the key
 * @returns {Object} - Mapping object with normalized keys
 */
export function createKeyMapping(rows, keyColumn) {
    const mapping = {};

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
 * @param {string} searcherName - The searcher's name to find referrals for
 * @param {Array} referralRows - Array of referral data rows
 * @param {number} referralNameColumn - Column index containing referral names
 * @returns {Array} - Array of matching referral rows
 */
export function findMatchingReferrals(searcherName, referralRows, referralNameColumn) {
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
 * @param {Array} allRows - All data rows
 * @param {Array} searcherRows - Searcher form submissions
 * @param {Array} referralRows - Referral form submissions
 */
export function debugSearcherReferralMatching(allRows, searcherRows, referralRows) {
    console.log("🔍 DEBUGGING SEARCHER-REFERRAL MATCHING");

    // Build set of searcher names from searcher forms (column 37)
    const searcherNames = new Set(
        searcherRows
            .map(row => normalizeText(row[37] || ""))
            .filter(name => name.length > 0)
    );

    // Check each referral to see if it matches a searcher
    const unmatchedReferrals = [];

    for (const referralRow of referralRows) {
        const referredName = normalizeText(referralRow[22] || ""); // Column 22: referred searcher name

        if (referredName && !searcherNames.has(referredName)) {
            const rowIndex = allRows.indexOf(referralRow);
            unmatchedReferrals.push({
                rowIndex,
                referredName: referralRow[22], // Keep original for display
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
