/**
 * NOTION SERVICE
 * 
 * This module handles all interactions with the Notion API.
 * It provides functions for creating, updating, and managing
 * Notion pages and blocks with built-in retry logic.
 */

import { Client } from "@notionhq/client";
import { API_CONFIG } from "../config/constants.js";

/**
 * Creates a Notion client with retry capabilities
 * 
 * @param {string} apiKey - Notion API key
 * @returns {Object} - Notion client with retry methods
 */
export function createNotionClient(apiKey) {
    console.log("🔧 Setting up Notion client...");

    if (!apiKey) {
        throw new Error("Notion API key is required");
    }

    const notion = new Client({ auth: apiKey });

    // Create client with retry wrapper methods
    const clientWithRetry = {
        blocks: {
            children: {
                append: (args) => withRetry(() => notion.blocks.children.append(args)),
                list: (args) => withRetry(() => notion.blocks.children.list(args)),
            },
            update: (args) => withRetry(() => notion.blocks.update(args)),
        },
        pages: {
            create: (args) => withRetry(() => notion.pages.create(args)),
            update: (args) => withRetry(() => notion.pages.update(args)),
        },
        databases: {
            query: (args) => withRetry(() => notion.databases.query(args)),
        },
    };

    console.log("✅ Notion client configured successfully");
    return clientWithRetry;
}

/**
 * Utility function for adding delays between operations
 * 
 * @param {number} milliseconds - How long to wait
 * @returns {Promise} - Promise that resolves after the delay
 */
function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

/**
 * Retry wrapper for Notion operations with exponential backoff
 * 
 * @param {Function} operation - The operation to retry
 * @param {Object} options - Retry configuration
 * @returns {Promise} - Result of the operation
 */
async function withRetry(operation, options = {}) {
    const {
        maxAttempts = API_CONFIG.NOTION.RETRY_ATTEMPTS,
        baseDelay = API_CONFIG.NOTION.BASE_DELAY
    } = options;

    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            // Check if this is a retryable error
            const isRetryable = isRetryableError(error);

            if (!isRetryable || attempt === maxAttempts) {
                console.error(`❌ Notion operation failed after ${attempt} attempts:`, error.message);
                throw error;
            }

            // Calculate delay with exponential backoff
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.log(`⏳ Notion API attempt ${attempt} failed, retrying in ${delay}ms...`);
            await sleep(delay);
        }
    }

    throw lastError;
}

/**
 * Determines if a Notion API error is worth retrying
 * 
 * @param {Error} error - The error to check
 * @returns {boolean} - True if the error is retryable
 */
function isRetryableError(error) {
    const code = error?.code || error?.status || error?.name || error?.cause?.code;
    const message = (error?.message || "").toLowerCase();

    // Common retryable conditions for Notion API
    const retryableConditions = [
        code === "rate_limited",
        code === 429, // Too Many Requests
        code === 503, // Service Unavailable
        code === "ECONNRESET",
        code === "ENOTFOUND",
        code === "UND_ERR_CONNECT_TIMEOUT",
        code === "UND_ERR_HEADERS_TIMEOUT",
        code === "UND_ERR_SOCKET",
        message.includes("fetch failed"),
        message.includes("terminated")
    ];

    return retryableConditions.some(condition => condition);
}

/**
 * Safely appends children to a Notion block, filtering out invalid entries
 * 
 * @param {string} blockId - The parent block ID
 * @param {Array} children - Array of child blocks to append
 * @param {Object} notionClient - Notion client with retry capabilities
 * @returns {Promise<Object>} - Result of the append operation
 */
export async function appendChildrenSafely(blockId, children, notionClient) {
    // Filter out any null, undefined, or invalid children
    const validChildren = (children || []).filter(child =>
        child &&
        typeof child === 'object' &&
        child.object === 'block'
    );

    if (validChildren.length === 0) {
        console.log("ℹ️ No valid children to append");
        return { results: [] };
    }

    console.log(`➕ Appending ${validChildren.length} children to block ${blockId}`);

    try {
        const result = await notionClient.blocks.children.append({
            block_id: blockId,
            children: validChildren
        });

        await sleep(API_CONFIG.NOTION.RATE_LIMIT_DELAY);
        return result;

    } catch (error) {
        console.error("❌ Failed to append children:", error.message);
        throw error;
    }
}

/**
 * Removes duplicate toggles with the same title from a parent block
 * 
 * @param {string} parentId - The parent block ID
 * @param {Array<string>} titles - Array of toggle titles to deduplicate
 * @param {Object} notionClient - Notion client with retry capabilities
 */
export async function removeDuplicateToggles(parentId, titles, notionClient) {
    if (!parentId || !Array.isArray(titles) || titles.length === 0) {
        return;
    }

    console.log(`🧹 Removing duplicate toggles in ${parentId} for titles:`, titles);

    try {
        const children = await notionClient.blocks.children.list({ block_id: parentId });

        for (const title of titles) {
            const togglesWithTitle = children.results.filter(block =>
                block.type === "toggle" &&
                block.toggle?.rich_text?.[0]?.text?.content === title
            );

            // Keep the first toggle, archive the rest
            for (let i = 1; i < togglesWithTitle.length; i++) {
                console.log(`🗑️ Archiving duplicate toggle: "${title}"`);
                await notionClient.blocks.update({
                    block_id: togglesWithTitle[i].id,
                    archived: true
                });
                await sleep(60);
            }
        }
    } catch (error) {
        console.error("❌ Failed to remove duplicate toggles:", error.message);
        throw error;
    }
}

/**
 * Fetches all pages from a Notion database with pagination
 * 
 * @param {string} databaseId - The database ID
 * @param {Object} notionClient - Notion client with retry capabilities
 * @returns {Promise<Array>} - Array of all pages in the database
 */
export async function getAllDatabasePages(databaseId, notionClient) {
    console.log(`📚 Fetching all pages from database: ${databaseId}`);

    const allPages = [];
    let cursor = undefined;
    let pageCount = 0;

    try {
        do {
            const response = await notionClient.databases.query({
                database_id: databaseId,
                start_cursor: cursor,
            });

            allPages.push(...response.results);
            pageCount += response.results.length;
            cursor = response.has_more ? response.next_cursor : undefined;

            if (cursor) {
                console.log(`📄 Fetched ${pageCount} pages so far, continuing...`);
            }

        } while (cursor);

        console.log(`✅ Successfully fetched ${allPages.length} total pages`);
        return allPages;

    } catch (error) {
        console.error("❌ Failed to fetch database pages:", error.message);
        throw error;
    }
}

/**
 * Finds an existing page in a database by title
 * 
 * @param {string} databaseId - The database ID
 * @param {string} title - The page title to search for
 * @param {Object} notionClient - Notion client with retry capabilities
 * @returns {Promise<Object|null>} - The found page or null
 */
export async function findPageByTitle(databaseId, title, notionClient) {
    if (!title) return null;

    console.log(`🔍 Searching for page with title: "${title}"`);

    try {
        const response = await notionClient.databases.query({
            database_id: databaseId,
            filter: {
                property: "Name",
                title: { equals: title }
            }
        });

        const page = response.results.length > 0 ? response.results[0] : null;

        if (page) {
            console.log(`✅ Found existing page: "${title}"`);
        } else {
            console.log(`ℹ️ No existing page found for: "${title}"`);
        }

        return page;

    } catch (error) {
        console.error(`❌ Failed to search for page "${title}":`, error.message);
        throw error;
    }
}

/**
 * Validates that the required Notion environment variables are present
 * 
 * @param {Object} env - Environment variables object
 * @returns {boolean} - True if all required variables are present
 */
export function validateNotionEnvironment(env) {
    const required = ["NOTION_API_KEY", "NOTION_DATABASE_ID"];
    const missing = required.filter(key => !env[key]);

    if (missing.length > 0) {
        console.error("❌ Missing required Notion environment variables:", missing);
        return false;
    }

    console.log("✅ Notion environment variables validated");
    return true;
}

/**
 * Creates a standardized table block for Notion
 * 
 * @param {Array<Array>} rows - Array of [label, value] pairs
 * @returns {Object} - Notion table block object
 */
export function createTableBlock(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error("Table rows must be a non-empty array");
    }

    return {
        object: "block",
        type: "table",
        table: {
            table_width: 2,
            has_column_header: true,
            has_row_header: false,
            children: rows.map(([label, value]) => ({
                object: "block",
                type: "table_row",
                table_row: {
                    cells: [
                        [{ type: "text", text: { content: String(label || "") } }],
                        [{ type: "text", text: { content: String(value || "") } }],
                    ],
                },
            })),
        },
    };
}

/**
 * Creates a toggle block with a quote child containing the answer
 * 
 * @param {string} title - The toggle title (question)
 * @param {string} content - The content for the quote (answer)
 * @returns {Object} - Notion toggle block object
 */
export function createQuoteToggle(title, content) {
    const children = [];

    if (content && content.trim() !== "") {
        children.push({
            object: "block",
            type: "quote",
            quote: {
                rich_text: [{ type: "text", text: { content: content.trim() } }],
            },
        });
    }

    return {
        object: "block",
        type: "toggle",
        toggle: {
            rich_text: [{ type: "text", text: { content: title || "Untitled" } }],
            children: children,
        },
    };
}
