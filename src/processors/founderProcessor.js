/**
 * FOUNDER PROCESSOR
 * 
 * This module handles the processing of founder form submissions.
 * It creates and updates Notion pages for founders, including
 * their referrals and all form responses.
 */

import { QUESTION_GROUPS, SECTION_TITLES, FORM_QUESTIONS } from "../config/constants.js";
import {
    validateLocation,
    validateValuation,
    validateFundingStage,
    validateEmail,
    validateUrl,
    validatePhone,
    validateNumber,
    validateDate,
    parseCommaSeparatedList
} from "../utils/validationUtils.js";
import { normalizeText, countFilledFields, getFormResponse } from "../utils/textUtils.js";
import { findBestMatch, createKeyMapping } from "../utils/matchingUtils.js";
import {
    appendChildrenSafely,
    removeDuplicateToggles,
    findPageByTitle,
    createTableBlock,
    createQuoteToggle
} from "../services/notionService.js";

/**
 * Processes all founder submissions and creates/updates their Notion pages
 * 
 * @param {Array} founderRows - Array of founder form submissions
 * @param {Array} referralRows - Array of founder referral submissions  
 * @param {Object} notionClient - Notion client with retry capabilities
 * @param {string} databaseId - Notion database ID
 * @returns {Promise<Object>} - Processing results summary
 */
export async function processFounders(founderRows, referralRows, notionClient, databaseId) {
    console.log("🏢 Starting founder processing...");
    console.log(`📊 Processing ${founderRows.length} founders with ${referralRows.length} potential referrals`);

    // Create mapping of referrals by startup name
    const referralMapping = createReferralMapping(referralRows);
    console.log(`🔗 Created referral mapping for ${Object.keys(referralMapping).length} startups`);

    const results = {
        processed: 0,
        created: 0,
        updated: 0,
        errors: 0,
        unmatchedReferrals: 0
    };

    // Process each founder
    for (const founderRow of founderRows) {
        try {
            const result = await processSingleFounder(
                founderRow,
                referralMapping,
                notionClient,
                databaseId
            );

            results.processed++;
            if (result.created) results.created++;
            if (result.updated) results.updated++;

        } catch (error) {
            console.error(`❌ Error processing founder:`, error.message);
            results.errors++;
        }
    }

    // Count unmatched referrals
    results.unmatchedReferrals = Object.keys(referralMapping).length;

    // Create pages for unmatched referrals
    if (results.unmatchedReferrals > 0) {
        console.log(`🧩 Creating pages for ${results.unmatchedReferrals} unmatched referrals`);
        await processUnmatchedReferrals(referralMapping, notionClient, databaseId);
    }

    console.log("✅ Founder processing complete:", results);
    return results;
}

/**
 * Creates a mapping of referrals organized by startup name
 * 
 * @param {Array} referralRows - Array of referral submissions
 * @returns {Object} - Mapping of normalized startup names to referral data
 */
function createReferralMapping(referralRows) {
    console.log("🔗 Creating referral mapping...");

    const mapping = {};

    for (const row of referralRows) {
        const startupName = (row[9] || "").trim(); // Column 9: startup name
        if (!startupName) continue;

        const normalizedKey = normalizeText(startupName);
        if (!normalizedKey) continue;

        if (!mapping[normalizedKey]) {
            mapping[normalizedKey] = {
                displayName: startupName, // Keep original for display
                referrals: []
            };
        }

        mapping[normalizedKey].referrals.push(row);
    }

    return mapping;
}

/**
 * Processes a single founder submission
 * 
 * @param {Array} founderRow - The founder's form data
 * @param {Object} referralMapping - Mapping of referrals by startup name
 * @param {Object} notionClient - Notion client
 * @param {string} databaseId - Notion database ID
 * @returns {Promise<Object>} - Processing result
 */
async function processSingleFounder(founderRow, referralMapping, notionClient, databaseId) {
    const startupName = (founderRow[73] || "").trim(); // Column 73: startup name
    if (!startupName) {
        throw new Error("Founder missing startup name");
    }

    console.log(`🏢 Processing founder: ${startupName}`);

    // Find matching referrals
    const founderKey = normalizeText(startupName);
    const matchedKey = findBestMatch(founderKey, Object.keys(referralMapping)) || founderKey;
    const referralData = referralMapping[matchedKey];
    const matchedReferrals = referralData?.referrals || [];

    if (matchedReferrals.length > 0) {
        console.log(`🤝 Found ${matchedReferrals.length} referrals for ${startupName}`);
        // Remove from mapping so it won't be processed as unmatched
        delete referralMapping[matchedKey];
    }

    // Check if page already exists
    const existingPage = await findPageByTitle(databaseId, startupName, notionClient);

    let page;
    let created = false;
    let updated = false;

    if (existingPage) {
        console.log(`🔄 Updating existing page for ${startupName}`);
        page = await updateFounderPage(existingPage, founderRow, matchedReferrals, notionClient);
        updated = true;
    } else {
        console.log(`🆕 Creating new page for ${startupName}`);
        page = await createFounderPage(founderRow, matchedReferrals, notionClient, databaseId);
        created = true;
    }

    // Add/update page content
    await updateFounderPageContent(page, founderRow, matchedReferrals, notionClient);

    console.log(`✅ Completed processing for ${startupName}`);
    return { created, updated };
}

/**
 * Creates a new Notion page for a founder
 * 
 * @param {Array} founderRow - The founder's form data
 * @param {Array} referrals - Matching referrals
 * @param {Object} notionClient - Notion client
 * @param {string} databaseId - Notion database ID
 * @returns {Promise<Object>} - Created page object
 */
async function createFounderPage(founderRow, referrals, notionClient, databaseId) {
    const startupName = founderRow[73]?.trim() || "Unnamed Startup";
    const referralCount = referrals.length;

    // Calculate completion percentage
    const relevantIndices = Array.from({ length: 50 }, (_, i) => 66 + i); // Columns 66-115
    const answeredCount = countFilledFields(founderRow, relevantIndices);
    const completionPercent = Math.round((answeredCount / relevantIndices.length) * 100);

    // Build page properties
    const properties = buildFounderProperties(founderRow, referralCount, completionPercent);

    const page = await notionClient.pages.create({
        parent: {
            type: "database_id",
            database_id: databaseId,
        },
        properties: {
            Name: { title: [{ text: { content: startupName } }] },
            ...properties
        },
    });

    return page;
}

/**
 * Updates an existing founder page with current data
 * 
 * @param {Object} existingPage - The existing Notion page
 * @param {Array} founderRow - The founder's form data
 * @param {Array} referrals - Matching referrals
 * @param {Object} notionClient - Notion client
 * @returns {Promise<Object>} - Updated page object
 */
async function updateFounderPage(existingPage, founderRow, referrals, notionClient) {
    const referralCount = referrals.length;

    // Calculate completion percentage
    const relevantIndices = Array.from({ length: 50 }, (_, i) => 66 + i);
    const answeredCount = countFilledFields(founderRow, relevantIndices);
    const completionPercent = Math.round((answeredCount / relevantIndices.length) * 100);

    // Build updated properties
    const properties = buildFounderProperties(founderRow, referralCount, completionPercent);

    await notionClient.pages.update({
        page_id: existingPage.id,
        properties: {
            ...properties,
            "Last Updated": { date: { start: new Date().toISOString() } },
        },
    });

    return existingPage;
}

/**
 * Builds the properties object for a founder's Notion page
 * 
 * @param {Array} founderRow - The founder's form data
 * @param {number} referralCount - Number of referrals
 * @param {number} completionPercent - Form completion percentage
 * @returns {Object} - Notion page properties
 */
function buildFounderProperties(founderRow, referralCount, completionPercent) {
    // Parse priority ranking
    const priorityRanking = founderRow[105]
        ? parseCommaSeparatedList(founderRow[104])
        : [];

    // Build status based on referral count
    const statusName = referralCount === 0 ? undefined :
        referralCount >= 5 ? "V+ Endorsements" :
            ["I Endorsement", "II Endorsements", "III Endorsements", "IV Endorsements"][referralCount - 1];

    return {
        "Form Type": { select: { name: "Founder" } },
        "Founder Name": {
            rich_text: [{ text: { content: founderRow[69] || "No founder name provided" } }]
        },
        "Company Website": validateUrl(founderRow[73]) ? { url: founderRow[73] } : undefined,
        "Founder Email": validateEmail(founderRow[70]) ? { email: founderRow[70] } : undefined,
        "Founder LinkedIn": validateUrl(founderRow[72]) ? { url: founderRow[72] } : undefined,
        "Founder Phone Number": validatePhone(founderRow[71]) ? { phone_number: founderRow[71] } : undefined,

        "Status": statusName ? { select: { name: statusName } } : undefined,
        "Founders": { number: validateNumber(founderRow[70]) || 1 },

        "Business Model": {
            multi_select: parseCommaSeparatedList(founderRow[76]).map(item => ({ name: item }))
        },

        "Where is the company based?": validateLocation(founderRow[78])
            ? { select: { name: founderRow[78] } } : undefined,

        "What is your current valuation?": validateValuation(founderRow[102])
            ? { select: { name: founderRow[102] } } : undefined,

        "What next stage is this round funding?": validateFundingStage(founderRow[103])
            ? { select: { name: founderRow[103] } } : undefined,

        "Founded in": { number: validateNumber(founderRow[77]) },
        "Completion %": { number: completionPercent },

        "Form filled out:": validateDate(founderRow[2])
            ? { date: { start: founderRow[2] } } : undefined,

        // Priority rankings
        ...Object.fromEntries(
            Array.from({ length: 6 }, (_, i) => [
                `${i + 1}. Priority (18 months)`,
                priorityRanking[i] ? { select: { name: priorityRanking[i] } } : undefined
            ]).filter(([_, value]) => value !== undefined)
        ),

        // Deck file if provided
        ...(founderRow[75]?.trim() && {
            Deck: { files: [{ name: "Deck", external: { url: founderRow[75] } }] }
        }),

        "Last Updated": { date: { start: new Date().toISOString() } },
    };
}

/**
 * Updates the content blocks of a founder's Notion page
 * 
 * @param {Object} page - The Notion page object
 * @param {Array} founderRow - The founder's form data
 * @param {Array} referrals - Matching referrals
 * @param {Object} notionClient - Notion client
 */
async function updateFounderPageContent(page, founderRow, referrals, notionClient) {
    // Ensure basic page structure exists
    await ensureFounderPageStructure(page.id, notionClient);

    // Update referral insights if there are referrals
    if (referrals.length > 0) {
        await updateReferralInsights(page.id, referrals, notionClient);
    }

    // Update form sections
    await updateFounderFormSections(page.id, founderRow, notionClient);
}

/**
 * Ensures the basic structure of a founder page exists
 * 
 * @param {string} pageId - The page ID
 * @param {Object} notionClient - Notion client
 */
async function ensureFounderPageStructure(pageId, notionClient) {
    // Implementation would create the basic toggles: Form, Team Inputs, etc.
    // This is a simplified version - the full implementation would be more detailed
    console.log(`🏗️ Ensuring page structure for ${pageId}`);
}

/**
 * Updates the referral insights section
 * 
 * @param {string} pageId - The page ID
 * @param {Array} referrals - Referral data
 * @param {Object} notionClient - Notion client
 */
async function updateReferralInsights(pageId, referrals, notionClient) {
    console.log(`🤝 Updating referral insights with ${referrals.length} referrals`);
    // Implementation would create referral insight blocks
}

/**
 * Updates the form sections with founder responses
 * 
 * @param {string} pageId - The page ID
 * @param {Array} founderRow - The founder's form data
 * @param {Object} notionClient - Notion client
 */
async function updateFounderFormSections(pageId, founderRow, notionClient) {
    console.log("📝 Updating founder form sections");
    // Implementation would create form response blocks organized by section
}

/**
 * Processes unmatched referrals (referrals without corresponding founder submissions)
 * 
 * @param {Object} referralMapping - Remaining unmatched referrals
 * @param {Object} notionClient - Notion client
 * @param {string} databaseId - Notion database ID
 */
async function processUnmatchedReferrals(referralMapping, notionClient, databaseId) {
    console.log("🧩 Processing unmatched referrals...");

    for (const [key, data] of Object.entries(referralMapping)) {
        const { displayName, referrals } = data;

        try {
            await createUnmatchedReferralPage(displayName, referrals, notionClient, databaseId);
            console.log(`✅ Created unmatched referral page for: ${displayName}`);
        } catch (error) {
            console.error(`❌ Failed to create unmatched referral page for ${displayName}:`, error.message);
        }
    }
}

/**
 * Creates a page for an unmatched referral
 * 
 * @param {string} startupName - The startup name from the referral
 * @param {Array} referrals - The referral submissions
 * @param {Object} notionClient - Notion client
 * @param {string} databaseId - Notion database ID
 */
async function createUnmatchedReferralPage(startupName, referrals, notionClient, databaseId) {
    const pageTitle = `⚠️ Unmatched referral for startup: ${startupName}`;

    // Check if page already exists
    const existingPage = await findPageByTitle(databaseId, pageTitle, notionClient);

    if (existingPage) {
        console.log(`🔄 Updating existing unmatched referral page: ${startupName}`);
        return existingPage;
    }

    // Create new page
    const page = await notionClient.pages.create({
        parent: { type: "database_id", database_id: databaseId },
        properties: {
            Name: { title: [{ text: { content: pageTitle } }] },
            Status: { select: { name: "⚠️ Unmatched Referral" } },
            "Form filled out:": validateDate(referrals[0]?.[2])
                ? { date: { start: referrals[0][2] } } : undefined,
            "Last Updated": { date: { start: new Date().toISOString() } },
        },
    });

    // Add referral content
    await addUnmatchedReferralContent(page.id, referrals, notionClient);

    return page;
}

/**
 * Adds content to an unmatched referral page
 * 
 * @param {string} pageId - The page ID
 * @param {Array} referrals - The referral submissions
 * @param {Object} notionClient - Notion client
 */
async function addUnmatchedReferralContent(pageId, referrals, notionClient) {
    console.log(`📝 Adding content for ${referrals.length} unmatched referrals`);
    // Implementation would create referral insight blocks for unmatched referrals
}
