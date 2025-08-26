/**
 * NOTION SERVICE
 * 
 * This module handles all interactions with the Notion API.
 * It provides functions for creating, updating, and managing
 * Notion pages and blocks with built-in retry logic.
 */

import { Client } from "@notionhq/client";
import { API_CONFIG } from "../config/constants.js";
import type { NotionClientWithRetry, NotionBlock, RetryOptions } from "../types/index.js";
import { ServiceError } from "../types/index.js";

/**
 * Creates a Notion client with retry capabilities
 * 
 * @param apiKey - Notion API key
 * @returns Notion client with retry methods
 */
export function createNotionClient(apiKey: string): NotionClientWithRetry {
    console.log("🔧 Setting up Notion client...");

    if (!apiKey) {
        throw new ServiceError("Notion API key is required", "notion");
    }

    const notion = new Client({ auth: apiKey });

    // Create client with retry wrapper methods
    const clientWithRetry: NotionClientWithRetry = {
        blocks: {
            children: {
                append: (args: any) => withRetry(() => notion.blocks.children.append(args)),
                list: (args: any) => withRetry(() => notion.blocks.children.list(args)),
            },
            update: (args: any) => withRetry(() => notion.blocks.update(args)),
        },
        pages: {
            create: (args: any) => withRetry(() => notion.pages.create(args)),
            update: (args: any) => withRetry(() => notion.pages.update(args)),
        },
        databases: {
            query: (args: any) => withRetry(() => notion.databases.query(args)),
        },
    };

    console.log("✅ Notion client configured successfully");
    return clientWithRetry;
}

/**
 * Utility function for adding delays between operations
 * 
 * @param milliseconds - How long to wait
 * @returns Promise that resolves after the delay
 */
function sleep(milliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

/**
 * Retry wrapper for Notion operations with exponential backoff
 * 
 * @param operation - The operation to retry
 * @param options - Retry configuration
 * @returns Result of the operation
 */
async function withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxAttempts = API_CONFIG.NOTION.RETRY_ATTEMPTS,
        baseDelay = API_CONFIG.NOTION.BASE_DELAY
    } = options;

    let lastError: Error | unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            // Check if this is a retryable error
            const isRetryable = isRetryableError(error);

            if (!isRetryable || attempt === maxAttempts) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`❌ Notion operation failed after ${attempt} attempts:`, errorMessage);
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
 * @param error - The error to check
 * @returns True if the error is retryable
 */
function isRetryableError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;

    const errorObj = error as Record<string, unknown>;
    const code = errorObj.code || errorObj.status || errorObj.name ||
        (errorObj.cause as Record<string, unknown>)?.code;
    const message = typeof errorObj.message === 'string' ? errorObj.message.toLowerCase() : '';

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
 * @param blockId - The parent block ID
 * @param children - Array of child blocks to append
 * @param notionClient - Notion client with retry capabilities
 * @returns Result of the append operation
 */
export async function appendChildrenSafely(
    blockId: string,
    children: NotionBlock[],
    notionClient: NotionClientWithRetry
): Promise<any> {
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("❌ Failed to append children:", errorMessage);
        throw new ServiceError(`Failed to append children: ${errorMessage}`, "notion", error as Error);
    }
}

/**
 * Removes duplicate toggles with the same title from a parent block
 * 
 * @param parentId - The parent block ID
 * @param titles - Array of toggle titles to deduplicate
 * @param notionClient - Notion client with retry capabilities
 */
export async function removeDuplicateToggles(
    parentId: string,
    titles: string[],
    notionClient: NotionClientWithRetry
): Promise<void> {
    if (!parentId || !Array.isArray(titles) || titles.length === 0) {
        return;
    }

    console.log(`🧹 Removing duplicate toggles in ${parentId} for titles:`, titles);

    try {
        const children = await notionClient.blocks.children.list({ block_id: parentId });

        for (const title of titles) {
            const togglesWithTitle = children.results.filter((block: any) =>
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("❌ Failed to remove duplicate toggles:", errorMessage);
        throw new ServiceError(`Failed to remove duplicate toggles: ${errorMessage}`, "notion", error as Error);
    }
}

/**
 * Fetches all pages from a Notion database with pagination
 * 
 * @param databaseId - The database ID
 * @param notionClient - Notion client with retry capabilities
 * @returns Array of all pages in the database
 */
export async function getAllDatabasePages(
    databaseId: string,
    notionClient: NotionClientWithRetry
): Promise<any[]> {
    console.log(`📚 Fetching all pages from database: ${databaseId}`);

    const allPages: any[] = [];
    let cursor: string | undefined = undefined;
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("❌ Failed to fetch database pages:", errorMessage);
        throw new ServiceError(`Failed to fetch database pages: ${errorMessage}`, "notion", error as Error);
    }
}

/**
 * Finds an existing page in a database by title
 * 
 * @param databaseId - The database ID
 * @param title - The page title to search for
 * @param notionClient - Notion client with retry capabilities
 * @returns The found page or null
 */
export async function findPageByTitle(
    databaseId: string,
    title: string,
    notionClient: NotionClientWithRetry
): Promise<any | null> {
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Failed to search for page "${title}":`, errorMessage);
        throw new ServiceError(`Failed to search for page: ${errorMessage}`, "notion", error as Error);
    }
}

/**
 * Validates that the required Notion environment variables are present
 * 
 * @param env - Environment variables object
 * @returns True if all required variables are present
 */
export function validateNotionEnvironment(env: Record<string, string | undefined>): boolean {
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
 * @param rows - Array of [label, value] pairs
 * @returns Notion table block object
 */
export function createTableBlock(rows: Array<[string, string]>): NotionBlock {
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
    } as NotionBlock;
}

/**
 * Creates a toggle block with a quote child containing the answer
 * 
 * @param title - The toggle title (question)
 * @param content - The content for the quote (answer)
 * @returns Notion toggle block object
 */
export function createQuoteToggle(title: string, content: string): NotionBlock {
    const children: any[] = [];

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
    } as NotionBlock;
}
