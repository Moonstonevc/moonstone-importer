/**
 * VALIDATION UTILITIES
 * 
 * This module contains functions for validating and converting form data
 * to match the expected formats in Notion and other systems.
 */

import { AVAILABILITY_OPTIONS, VALID_LOCATIONS, VALID_VALUATIONS, VALID_FUNDING_STAGES } from "../config/constants.js";

/**
 * Converts searcher/intern designation to the correct format
 * 
 * @param {string} value - The raw value from the form
 * @returns {string|undefined} - "Intern" or "Searcher" or undefined
 */
export function validateInternSearcherType(value) {
    if (!value) return undefined;

    const normalized = String(value).trim().toLowerCase();

    if (normalized === "intern") return "Intern";
    if (normalized === "searcher") return "Searcher";

    return undefined; // Leave property unchanged if unexpected value
}

/**
 * Maps availability time preferences to valid Notion select options
 * 
 * @param {string} rawAnswer - The raw answer from the form
 * @returns {string|undefined} - Valid availability option or undefined
 */
export function mapAvailabilityOption(rawAnswer) {
    if (!rawAnswer) return undefined;

    const answer = String(rawAnswer).toLowerCase();

    // Check each valid option to see if it matches the answer
    for (const option of AVAILABILITY_OPTIONS) {
        const optionKey = option.toLowerCase().split(" (")[0]; // Get the main part before parentheses
        const firstWord = optionKey.split(" ")[0];

        if (answer.includes(firstWord) || answer.includes(optionKey)) {
            return option;
        }
    }

    // Special case for flexibility
    if (answer.includes("flex")) {
        return "I'm flexible / decide with the group";
    }

    return undefined;
}

/**
 * Validates if a location is in the approved list
 * 
 * @param {string} location - The location to validate
 * @returns {string|undefined} - Valid location or undefined
 */
export function validateLocation(location) {
    if (!location) return undefined;
    return VALID_LOCATIONS.includes(location) ? location : undefined;
}

/**
 * Validates if a valuation is in the approved list
 * 
 * @param {string} valuation - The valuation to validate
 * @returns {string|undefined} - Valid valuation or undefined
 */
export function validateValuation(valuation) {
    if (!valuation) return undefined;
    return VALID_VALUATIONS.includes(valuation) ? valuation : undefined;
}

/**
 * Validates if a funding stage is in the approved list
 * 
 * @param {string} stage - The funding stage to validate
 * @returns {string|undefined} - Valid funding stage or undefined
 */
export function validateFundingStage(stage) {
    if (!stage) return undefined;
    return VALID_FUNDING_STAGES.includes(stage) ? stage : undefined;
}

/**
 * Validates and formats an email address
 * 
 * @param {string} email - The email to validate
 * @returns {string|null} - Valid email or null
 */
export function validateEmail(email) {
    if (!email) return null;

    const emailStr = String(email).trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailRegex.test(emailStr) ? emailStr : null;
}

/**
 * Validates and formats a URL
 * 
 * @param {string} url - The URL to validate
 * @returns {string|null} - Valid URL or null
 */
export function validateUrl(url) {
    if (!url) return null;

    const urlStr = String(url).trim();

    try {
        new URL(urlStr);
        return urlStr;
    } catch {
        // Try adding https:// if it's missing
        try {
            new URL(`https://${urlStr}`);
            return `https://${urlStr}`;
        } catch {
            return null;
        }
    }
}

/**
 * Validates and formats a phone number
 * 
 * @param {string} phone - The phone number to validate
 * @returns {string|null} - Valid phone number or null
 */
export function validatePhone(phone) {
    if (!phone) return null;

    const phoneStr = String(phone).trim();
    // Basic phone validation - contains digits and common phone characters
    const phoneRegex = /^[\d\s\-\+\(\)\.]+$/;

    return phoneRegex.test(phoneStr) && phoneStr.length >= 7 ? phoneStr : null;
}

/**
 * Validates and converts a number field
 * 
 * @param {any} value - The value to convert to number
 * @returns {number|null} - Valid number or null
 */
export function validateNumber(value) {
    if (value === null || value === undefined || value === "") return null;

    const num = Number(value);
    return !isNaN(num) && isFinite(num) ? num : null;
}

/**
 * Validates and formats a date string for Notion
 * 
 * @param {string} dateStr - The date string to validate
 * @returns {string|null} - ISO date string or null
 */
export function validateDate(dateStr) {
    if (!dateStr) return null;

    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;

        return date.toISOString();
    } catch {
        return null;
    }
}

/**
 * Parses a comma-separated list into an array of trimmed strings
 * 
 * @param {string} csvString - Comma-separated values
 * @returns {Array<string>} - Array of trimmed strings
 */
export function parseCommaSeparatedList(csvString) {
    if (!csvString) return [];

    return String(csvString)
        .split(",")
        .map(item => item.trim())
        .filter(item => item.length > 0);
}
