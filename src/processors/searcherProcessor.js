/**
 * SEARCHER PROCESSOR
 * 
 * This module handles the processing of searcher form submissions.
 * It creates and updates Notion pages for searchers, including
 * their referrals and all form responses.
 */

import { QUESTION_GROUPS, SECTION_TITLES, FORM_QUESTIONS } from "../config/constants.js";
import {
    validateInternSearcherType,
    mapAvailabilityOption,
    validateEmail,
    validateUrl,
    validatePhone,
    validateDate
} from "../utils/validationUtils.js";
import { normalizeText, getFormResponse } from "../utils/textUtils.js";
import { findMatchingReferrals } from "../utils/matchingUtils.js";
import {
    appendChildrenSafely,
    removeDuplicateToggles,
    findPageByTitle,
    createTableBlock,
    createQuoteToggle
} from "../services/notionService.js";

/**
 * Processes all searcher submissions and creates/updates their Notion pages
 * 
 * @param {Array} searcherRows - Array of searcher form submissions
 * @param {Array} referralRows - Array of searcher referral submissions
 * @param {Object} notionClient - Notion client with retry capabilities
 * @param {string} databaseId - Notion database ID
 * @returns {Promise<Object>} - Processing results summary
 */
export async function processSearchers(searcherRows, referralRows, notionClient, databaseId) {
    console.log("🔍 Starting searcher processing...");
    console.log(`📊 Processing ${searcherRows.length} searchers with ${referralRows.length} potential referrals`);

    const results = {
        processed: 0,
        created: 0,
        updated: 0,
        errors: 0,
        unmatchedReferrals: 0
    };

    // Track which referrals have been matched
    const matchedReferralIds = new Set();

    // Process each searcher
    for (const searcherRow of searcherRows) {
        try {
            const result = await processSingleSearcher(
                searcherRow,
                referralRows,
                notionClient,
                databaseId,
                matchedReferralIds
            );

            results.processed++;
            if (result.created) results.created++;
            if (result.updated) results.updated++;

        } catch (error) {
            console.error(`❌ Error processing searcher:`, error.message);
            results.errors++;
        }
    }

    // Process unmatched searcher referrals
    const unmatchedReferrals = referralRows.filter((_, index) => !matchedReferralIds.has(index));
    results.unmatchedReferrals = unmatchedReferrals.length;

    if (unmatchedReferrals.length > 0) {
        console.log(`🧩 Creating pages for ${unmatchedReferrals.length} unmatched searcher referrals`);
        await processUnmatchedSearcherReferrals(unmatchedReferrals, notionClient, databaseId);
    }

    console.log("✅ Searcher processing complete:", results);
    return results;
}

/**
 * Processes a single searcher submission
 * 
 * @param {Array} searcherRow - The searcher's form data
 * @param {Array} allReferrals - All searcher referral submissions
 * @param {Object} notionClient - Notion client
 * @param {string} databaseId - Notion database ID
 * @param {Set} matchedReferralIds - Set to track matched referrals
 * @returns {Promise<Object>} - Processing result
 */
async function processSingleSearcher(searcherRow, allReferrals, notionClient, databaseId, matchedReferralIds) {
    const searcherName = (searcherRow[37] || "").trim(); // Column 37: searcher name
    if (!searcherName) {
        throw new Error("Searcher missing name");
    }

    console.log(`🔍 Processing searcher: ${searcherName}`);

    // Find matching referrals for this searcher
    const matchedReferrals = findMatchingReferrals(searcherName, allReferrals, 22); // Column 22: referred searcher name

    // Track which referrals we've matched
    matchedReferrals.forEach(referral => {
        const index = allReferrals.indexOf(referral);
        if (index !== -1) matchedReferralIds.add(index);
    });

    if (matchedReferrals.length > 0) {
        console.log(`🤝 Found ${matchedReferrals.length} referrals for ${searcherName}`);
    }

    // Check if page already exists
    const existingPage = await findPageByTitle(databaseId, searcherName, notionClient);

    let page;
    let created = false;
    let updated = false;

    if (existingPage) {
        console.log(`🔄 Updating existing page for ${searcherName}`);
        page = await updateSearcherPage(existingPage, searcherRow, matchedReferrals, notionClient);
        updated = true;
    } else {
        console.log(`🆕 Creating new page for ${searcherName}`);
        page = await createSearcherPage(searcherRow, matchedReferrals, notionClient, databaseId);
        created = true;
    }

    // Add/update page content
    await updateSearcherPageContent(page, searcherRow, matchedReferrals, notionClient);

    // Archive any old unmatched referral page for this searcher
    await archiveOldUnmatchedPage(searcherName, notionClient, databaseId);

    console.log(`✅ Completed processing for ${searcherName}`);
    return { created, updated };
}

/**
 * Creates a new Notion page for a searcher
 * 
 * @param {Array} searcherRow - The searcher's form data
 * @param {Array} referrals - Matching referrals
 * @param {Object} notionClient - Notion client
 * @param {string} databaseId - Notion database ID
 * @returns {Promise<Object>} - Created page object
 */
async function createSearcherPage(searcherRow, referrals, notionClient, databaseId) {
    const searcherName = searcherRow[37]?.trim() || "Unnamed Searcher";
    const referralCount = referrals.length;

    // Build page properties
    const properties = buildSearcherProperties(searcherRow, referralCount);

    const page = await notionClient.pages.create({
        parent: {
            type: "database_id",
            database_id: databaseId,
        },
        properties: {
            Name: { title: [{ text: { content: searcherName } }] },
            ...properties
        },
    });

    return page;
}

/**
 * Updates an existing searcher page with current data
 * 
 * @param {Object} existingPage - The existing Notion page
 * @param {Array} searcherRow - The searcher's form data
 * @param {Array} referrals - Matching referrals
 * @param {Object} notionClient - Notion client
 * @returns {Promise<Object>} - Updated page object
 */
async function updateSearcherPage(existingPage, searcherRow, referrals, notionClient) {
    const referralCount = referrals.length;

    // Build updated properties
    const properties = buildSearcherProperties(searcherRow, referralCount);

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
 * Builds the properties object for a searcher's Notion page
 * 
 * @param {Array} searcherRow - The searcher's form data
 * @param {number} referralCount - Number of referrals
 * @returns {Object} - Notion page properties
 */
function buildSearcherProperties(searcherRow, referralCount) {
    // Build referral status based on count
    const referralStatusName = referralCount === 0 ? undefined :
        referralCount >= 5 ? "V+ Referrals" :
            ["I Referral", "II Referrals", "III Referrals", "IV Referrals"][referralCount - 1];

    return {
        "Form Type": { select: { name: "Searcher" } },

        // Searcher/Intern designation
        "Intern v Searcher": validateInternSearcherType(searcherRow[42])
            ? { select: { name: validateInternSearcherType(searcherRow[42]) } }
            : undefined,

        // Referral status
        "SF Referrals": referralStatusName
            ? { select: { name: referralStatusName } }
            : undefined,

        // Contact information
        "Searcher Mail": validateEmail(searcherRow[38])
            ? { email: searcherRow[38] } : undefined,
        "Searcher Phone": validatePhone(searcherRow[39])
            ? { phone_number: searcherRow[39] } : undefined,
        "Searcher LinkedIn": validateUrl(searcherRow[40])
            ? { url: searcherRow[40] } : undefined,

        // Additional information
        "Searcher Nickname": searcherRow[41]?.trim()
            ? { rich_text: [{ text: { content: searcherRow[41].trim() } }] }
            : undefined,
        "Searcher Location": searcherRow[43]?.trim()
            ? { rich_text: [{ text: { content: searcherRow[43].trim() } }] }
            : undefined,

        // Availability
        "Searcher Availability": mapAvailabilityOption(searcherRow[48])
            ? { select: { name: mapAvailabilityOption(searcherRow[48]) } }
            : undefined,

        // CV file
        "Searcher CV": searcherRow[44]?.trim()
            ? { files: [{ name: "CV", external: { url: searcherRow[44].trim() } }] }
            : undefined,

        // Form submission date
        "Form filled out:": validateDate(searcherRow[2])
            ? { date: { start: searcherRow[2] } }
            : undefined,

        "Last Updated": { date: { start: new Date().toISOString() } },
    };
}

/**
 * Updates the content blocks of a searcher's Notion page
 * 
 * @param {Object} page - The Notion page object
 * @param {Array} searcherRow - The searcher's form data
 * @param {Array} referrals - Matching referrals
 * @param {Object} notionClient - Notion client
 */
async function updateSearcherPageContent(page, searcherRow, referrals, notionClient) {
    // Ensure basic page structure exists
    await ensureSearcherPageStructure(page.id, notionClient);

    // Update form sections with searcher responses
    await updateSearcherFormSections(page.id, searcherRow, notionClient);

    // Update referral insights if there are referrals
    if (referrals.length > 0) {
        await updateSearcherReferralInsights(page.id, referrals, notionClient);
    }
}

/**
 * Ensures the basic structure of a searcher page exists
 * 
 * @param {string} pageId - The page ID
 * @param {Object} notionClient - Notion client
 */
async function ensureSearcherPageStructure(pageId, notionClient) {
    console.log(`🏗️ Ensuring searcher page structure for ${pageId}`);

    // Get existing blocks
    const existingBlocks = await notionClient.blocks.children.list({ block_id: pageId });

    // Check if Form toggle exists
    const hasForm = existingBlocks.results.some(block =>
        block.type === "toggle" &&
        block.toggle?.rich_text?.[0]?.text?.content === "Form"
    );

    // Check if Team Inputs toggle exists
    const hasTeamInputs = existingBlocks.results.some(block =>
        block.type === "toggle" &&
        block.toggle?.rich_text?.[0]?.text?.content === "Team Inputs"
    );

    const blocksToAdd = [];

    if (!hasForm) {
        blocksToAdd.push({
            object: "block",
            type: "toggle",
            toggle: {
                rich_text: [{ type: "text", text: { content: "Form" } }],
                children: [{
                    object: "block",
                    type: "paragraph",
                    paragraph: {
                        rich_text: [{
                            type: "text",
                            text: { content: "Responses from the searcher form are grouped here." }
                        }],
                    },
                }],
            },
        });
    }

    if (!hasTeamInputs) {
        blocksToAdd.push({
            object: "block",
            type: "toggle",
            toggle: {
                rich_text: [{ type: "text", text: { content: "Team Inputs" } }],
                children: [{
                    object: "block",
                    type: "paragraph",
                    paragraph: {
                        rich_text: [{
                            type: "text",
                            text: { content: "Responses from the Moonstone team are grouped here." }
                        }],
                    },
                }],
            },
        });
    }

    if (blocksToAdd.length > 0) {
        await appendChildrenSafely(pageId, blocksToAdd, notionClient);
    }

    // Remove any duplicates
    await removeDuplicateToggles(pageId, ["Form", "Team Inputs"], notionClient);
}

/**
 * Updates the form sections with searcher responses
 * 
 * @param {string} pageId - The page ID
 * @param {Array} searcherRow - The searcher's form data
 * @param {Object} notionClient - Notion client
 */
async function updateSearcherFormSections(pageId, searcherRow, notionClient) {
    console.log("📝 Updating searcher form sections");

    // Get the Form toggle
    const pageBlocks = await notionClient.blocks.children.list({ block_id: pageId });
    const formToggle = pageBlocks.results.find(block =>
        block.type === "toggle" &&
        block.toggle?.rich_text?.[0]?.text?.content === "Form"
    );

    if (!formToggle) {
        console.warn("⚠️ Form toggle not found");
        return;
    }

    // Add question sections
    await addQuestionSection(
        formToggle.id,
        SECTION_TITLES.SEARCHER_BASICS,
        QUESTION_GROUPS.SEARCHER_BASICS,
        searcherRow,
        notionClient
    );

    await addQuestionSection(
        formToggle.id,
        SECTION_TITLES.SEARCHER_PROBLEM_SOLVING,
        QUESTION_GROUPS.SEARCHER_PROBLEM_SOLVING,
        searcherRow,
        notionClient
    );

    await addQuestionSection(
        formToggle.id,
        SECTION_TITLES.SEARCHER_AI_LEVERAGE,
        QUESTION_GROUPS.SEARCHER_AI_LEVERAGE,
        searcherRow,
        notionClient
    );

    await addQuestionSection(
        formToggle.id,
        SECTION_TITLES.SEARCHER_LEADERSHIP,
        QUESTION_GROUPS.SEARCHER_LEADERSHIP,
        searcherRow,
        notionClient
    );
}

/**
 * Adds a question section to a parent toggle
 * 
 * @param {string} parentId - Parent toggle ID
 * @param {string} sectionTitle - Title for the section
 * @param {Array<number>} questionIndices - Array of question column indices
 * @param {Array} row - Form data row
 * @param {Object} notionClient - Notion client
 */
async function addQuestionSection(parentId, sectionTitle, questionIndices, row, notionClient) {
    console.log(`➕ Adding section: ${sectionTitle}`);

    // Create section toggle
    const sectionBlocks = await appendChildrenSafely(parentId, [{
        object: "block",
        type: "toggle",
        toggle: {
            rich_text: [{ type: "text", text: { content: sectionTitle } }],
        },
    }], notionClient);

    const sectionId = sectionBlocks.results?.[0]?.id;
    if (!sectionId) return;

    // Add questions to the section
    const questionBlocks = questionIndices.map(index => {
        const questionText = FORM_QUESTIONS[index] || `Question ${index}`;
        const answer = getFormResponse(row, index);

        return createQuoteToggle(questionText, answer);
    });

    await appendChildrenSafely(sectionId, questionBlocks, notionClient);
}

/**
 * Updates the referral insights section for a searcher
 * 
 * @param {string} pageId - The page ID
 * @param {Array} referrals - Referral data
 * @param {Object} notionClient - Notion client
 */
async function updateSearcherReferralInsights(pageId, referrals, notionClient) {
    console.log(`🤝 Updating searcher referral insights with ${referrals.length} referrals`);

    // Get the Form toggle
    const pageBlocks = await notionClient.blocks.children.list({ block_id: pageId });
    const formToggle = pageBlocks.results.find(block =>
        block.type === "toggle" &&
        block.toggle?.rich_text?.[0]?.text?.content === "Form"
    );

    if (!formToggle) return;

    // Create referral insight toggle
    const riBlocks = await appendChildrenSafely(formToggle.id, [{
        object: "block",
        type: "toggle",
        toggle: {
            rich_text: [{ type: "text", text: { content: "REFERRAL INSIGHT" } }],
        },
    }], notionClient);

    const riId = riBlocks.results?.[0]?.id;
    if (!riId) return;

    // Add referral blocks
    for (let i = 0; i < referrals.length; i++) {
        const referral = referrals[i];
        const referralTitle = `Referral ${i + 1}`;

        // Create referral toggle
        const refBlocks = await appendChildrenSafely(riId, [{
            object: "block",
            type: "toggle",
            toggle: {
                rich_text: [{ type: "text", text: { content: referralTitle } }],
            },
        }], notionClient);

        const refId = refBlocks.results?.[0]?.id;
        if (!refId) continue;

        // Add referral information table
        const tableData = [
            ["Searcher Name", referral[22] || ""],
            ["Searcher Email", referral[23] || ""],
            ["Searcher LinkedIn", referral[24] || ""],
            ["Referrer Name", referral[18] || ""],
            ["Referrer Email", referral[19] || ""],
            ["Referrer Phone", referral[20] || ""],
            ["Referrer LinkedIn", referral[21] || ""],
            ["Form filled out:", referral[2] || ""],
        ];

        await appendChildrenSafely(refId, [createTableBlock(tableData)], notionClient);

        // Add referral questions
        await addReferralQuestions(refId, referral, notionClient);
    }
}

/**
 * Adds referral questions to a referral block
 * 
 * @param {string} referralId - The referral block ID
 * @param {Array} referralRow - The referral data
 * @param {Object} notionClient - Notion client
 */
async function addReferralQuestions(referralId, referralRow, notionClient) {
    const questionSections = [
        { title: SECTION_TITLES.REFERRAL_BASICS, indices: QUESTION_GROUPS.REFERRAL_BASICS },
        { title: SECTION_TITLES.REFERRAL_PROBLEM_SOLVING, indices: QUESTION_GROUPS.REFERRAL_PROBLEM_SOLVING },
        { title: SECTION_TITLES.REFERRAL_AI_LEVERAGE, indices: QUESTION_GROUPS.REFERRAL_AI_LEVERAGE },
        { title: SECTION_TITLES.REFERRAL_LEADERSHIP, indices: QUESTION_GROUPS.REFERRAL_LEADERSHIP },
    ];

    for (const section of questionSections) {
        await addQuestionSection(referralId, section.title, section.indices, referralRow, notionClient);
    }
}

/**
 * Archives any old unmatched referral page for a searcher
 * 
 * @param {string} searcherName - The searcher's name
 * @param {Object} notionClient - Notion client
 * @param {string} databaseId - Notion database ID
 */
async function archiveOldUnmatchedPage(searcherName, notionClient, databaseId) {
    const unmatchedTitle = `⚠️ Unmatched referral for searcher: ${searcherName}`;
    const oldPage = await findPageByTitle(databaseId, unmatchedTitle, notionClient);

    if (oldPage) {
        console.log(`🗑️ Archiving old unmatched page for ${searcherName}`);
        await notionClient.pages.update({
            page_id: oldPage.id,
            archived: true,
        });
    }
}

/**
 * Processes unmatched searcher referrals
 * 
 * @param {Array} unmatchedReferrals - Unmatched referral submissions
 * @param {Object} notionClient - Notion client
 * @param {string} databaseId - Notion database ID
 */
async function processUnmatchedSearcherReferrals(unmatchedReferrals, notionClient, databaseId) {
    console.log("🧩 Processing unmatched searcher referrals...");

    for (const referral of unmatchedReferrals) {
        const searcherName = (referral[22] || "Unknown").trim();

        try {
            await createUnmatchedSearcherReferralPage(searcherName, referral, notionClient, databaseId);
            console.log(`✅ Created unmatched searcher referral page for: ${searcherName}`);
        } catch (error) {
            console.error(`❌ Failed to create unmatched searcher referral page for ${searcherName}:`, error.message);
        }
    }
}

/**
 * Creates a page for an unmatched searcher referral
 * 
 * @param {string} searcherName - The searcher name from the referral
 * @param {Array} referralRow - The referral submission
 * @param {Object} notionClient - Notion client
 * @param {string} databaseId - Notion database ID
 */
async function createUnmatchedSearcherReferralPage(searcherName, referralRow, notionClient, databaseId) {
    const pageTitle = `⚠️ Unmatched referral for searcher: ${searcherName}`;

    // Check if page already exists
    const existingPage = await findPageByTitle(databaseId, pageTitle, notionClient);

    if (existingPage) {
        console.log(`🔄 Updating existing unmatched searcher referral page: ${searcherName}`);
        return existingPage;
    }

    // Create new page
    const page = await notionClient.pages.create({
        parent: { type: "database_id", database_id: databaseId },
        properties: {
            Name: { title: [{ text: { content: pageTitle } }] },
            "Form Type": { select: { name: "Searcher Referral" } },
            "SF Referrals": { select: { name: "⚠️ Unmatched Referral" } },
            "Form filled out:": validateDate(referralRow[2])
                ? { date: { start: referralRow[2] } } : undefined,
            "Last Updated": { date: { start: new Date().toISOString() } },
        },
    });

    // Add referral content
    await addUnmatchedSearcherReferralContent(page.id, referralRow, notionClient);

    return page;
}

/**
 * Adds content to an unmatched searcher referral page
 * 
 * @param {string} pageId - The page ID
 * @param {Array} referralRow - The referral submission
 * @param {Object} notionClient - Notion client
 */
async function addUnmatchedSearcherReferralContent(pageId, referralRow, notionClient) {
    console.log("📝 Adding content for unmatched searcher referral");

    // Create Form toggle
    const formBlocks = await appendChildrenSafely(pageId, [{
        object: "block",
        type: "toggle",
        toggle: {
            rich_text: [{ type: "text", text: { content: "Form" } }],
        },
    }], notionClient);

    const formId = formBlocks.results?.[0]?.id;
    if (!formId) return;

    // Create Referral Insight section
    const riBlocks = await appendChildrenSafely(formId, [{
        object: "block",
        type: "toggle",
        toggle: {
            rich_text: [{ type: "text", text: { content: "REFERRAL INSIGHT" } }],
        },
    }], notionClient);

    const riId = riBlocks.results?.[0]?.id;
    if (!riId) return;

    // Add referral information table
    const tableData = [
        ["Searcher Name", referralRow[22] || ""],
        ["Searcher Email", referralRow[23] || ""],
        ["Searcher LinkedIn", referralRow[24] || ""],
        ["Referrer Name", referralRow[18] || ""],
        ["Referrer Email", referralRow[19] || ""],
        ["Referrer Phone", referralRow[20] || ""],
        ["Referrer LinkedIn", referralRow[21] || ""],
        ["Form filled out:", referralRow[2] || ""],
    ];

    await appendChildrenSafely(riId, [createTableBlock(tableData)], notionClient);

    // Add referral questions
    await addReferralQuestions(riId, referralRow, notionClient);
}
