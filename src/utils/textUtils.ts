/**
 * TEXT UTILITIES
 * 
 * This module contains utility functions for text processing, normalization,
 * and string manipulation. These functions help ensure consistent data 
 * handling across the application.
 */

import type { SpreadsheetRow } from '../types/index.js';

/**
 * Normalizes a name by removing special characters, converting to lowercase,
 * and handling various text encodings. This is used for matching names
 * between different data sources.
 * 
 * @param name - The name to normalize
 * @returns The normalized name
 */
export function normalizeName(name: string | null | undefined): string {
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
 * @param text - The text to normalize
 * @returns The normalized text
 */
export function normalizeText(text: string | null | undefined): string {
    if (!text) return "";

    // Map special digit characters to regular digits
    const digitMap: Record<string, string> = {
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
 * @param text - The text to check
 * @returns True if the text has content, false otherwise
 */
export function hasContent(text: string | null | undefined): text is string {
    return Boolean(text && typeof text === 'string' && text.trim().length > 0);
}

/**
 * Safely converts a value to a string, handling null/undefined values
 * 
 * @param value - The value to convert
 * @returns The string representation
 */
export function safeString(value: unknown): string {
    if (value === null || value === undefined) return "";
    return String(value);
}

/**
 * Counts how many fields in an array have meaningful content
 * 
 * @param row - Array of values (typically a spreadsheet row)
 * @param indices - Array of column indices to check
 * @returns Count of fields with content
 */
export function countFilledFields(row: SpreadsheetRow, indices: readonly number[]): number {
    if (!Array.isArray(row) || !Array.isArray(indices)) return 0;

    return indices.reduce((count, index) => {
        return count + (hasContent(row[index]) ? 1 : 0);
    }, 0);
}

/**
 * Extracts and cleans a response from a form field, providing a default
 * if the field is empty
 * 
 * @param row - The data row
 * @param index - The column index
 * @param defaultValue - Default value if field is empty
 * @returns The cleaned response
 */
export function getFormResponse(
    row: SpreadsheetRow,
    index: number,
    defaultValue = "No response"
): string {
    if (!row || !row[index]) return defaultValue;

    const response = String(row[index]).trim();
    return response.length > 0 ? response : defaultValue;
}

/**
 * Truncates text to a maximum length with ellipsis
 * 
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
}

/**
 * Capitalizes the first letter of each word in a string
 * 
 * @param text - The text to capitalize
 * @returns Text with capitalized words
 */
export function capitalizeWords(text: string): string {
    if (!text) return "";

    return text
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Removes extra whitespace and normalizes spacing
 * 
 * @param text - The text to clean
 * @returns Cleaned text with normalized spacing
 */
export function cleanWhitespace(text: string): string {
    if (!text) return "";

    return text
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\n\s*\n/g, '\n') // Remove empty lines
        .trim();
}

/**
 * Extracts email addresses from text using regex
 * 
 * @param text - The text to search for emails
 * @returns Array of found email addresses
 */
export function extractEmails(text: string): string[] {
    if (!text) return [];

    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    return text.match(emailRegex) || [];
}

/**
 * Checks if a string is a valid email format
 * 
 * @param email - The email string to validate
 * @returns True if email format is valid
 */
export function isValidEmail(email: string): boolean {
    if (!email) return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Generates a slug from text (URL-friendly string)
 * 
 * @param text - The text to convert to slug
 * @returns URL-friendly slug
 */
export function generateSlug(text: string): string {
    if (!text) return "";

    return text
        .toLowerCase()
        .normalize("NFKD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .substring(0, 50); // Limit length
}
