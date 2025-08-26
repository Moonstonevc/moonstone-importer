/**
 * TEXT UTILITIES
 * 
 * This module contains utility functions for text processing, normalization,
 * and string manipulation. These functions help ensure consistent data 
 * handling across the application.
 */

/**
 * Normalizes a name by removing special characters, converting to lowercase,
 * and handling various text encodings. This is used for matching names
 * between different data sources.
 * 
 * @param {string} name - The name to normalize
 * @returns {string} - The normalized name
 */
export function normalizeName(name) {
    if (!name) return "";

    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/gi, "")
        .trim();
}

/**
 * Advanced name normalization that handles special characters, diacritics,
 * and Unicode characters. Used for more sophisticated name matching.
 * 
 * @param {string} text - The text to normalize
 * @returns {string} - The normalized text
 */
export function normalizeText(text) {
    if (!text) return "";

    // Map special digit characters to regular digits
    const digitMap = {
        "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
        "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
    };

    return text
        .toLowerCase()
        .normalize("NFKD") // Normalize Unicode characters
        .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉]/g, char => digitMap[char] || "")
        .replace(/\p{Diacritic}/gu, "") // Remove diacritics (accents)
        .replace(/[^a-z0-9]+/g, " ") // Replace non-alphanumeric with spaces
        .trim();
}

/**
 * Checks if a text field has meaningful content (not empty or just whitespace)
 * 
 * @param {string} text - The text to check
 * @returns {boolean} - True if the text has content, false otherwise
 */
export function hasContent(text) {
    return text && typeof text === 'string' && text.trim().length > 0;
}

/**
 * Safely converts a value to a string, handling null/undefined values
 * 
 * @param {any} value - The value to convert
 * @returns {string} - The string representation
 */
export function safeString(value) {
    if (value === null || value === undefined) return "";
    return String(value);
}

/**
 * Counts how many fields in an array have meaningful content
 * 
 * @param {Array} row - Array of values (typically a spreadsheet row)
 * @param {Array<number>} indices - Array of column indices to check
 * @returns {number} - Count of fields with content
 */
export function countFilledFields(row, indices) {
    if (!Array.isArray(row) || !Array.isArray(indices)) return 0;

    return indices.reduce((count, index) => {
        return count + (hasContent(row[index]) ? 1 : 0);
    }, 0);
}

/**
 * Extracts and cleans a response from a form field, providing a default
 * if the field is empty
 * 
 * @param {Array} row - The data row
 * @param {number} index - The column index
 * @param {string} defaultValue - Default value if field is empty
 * @returns {string} - The cleaned response
 */
export function getFormResponse(row, index, defaultValue = "No response") {
    if (!row || !row[index]) return defaultValue;

    const response = String(row[index]).trim();
    return response.length > 0 ? response : defaultValue;
}
