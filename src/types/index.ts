/**
 * TYPE DEFINITIONS
 * 
 * This file contains all TypeScript type definitions used throughout
 * the Moonstone Importer application. These types ensure type safety
 * and provide clear interfaces for all data structures.
 */

// ===================== BASIC TYPES =====================

/**
 * Represents a row of data from Google Sheets
 * Each index corresponds to a specific column in the spreadsheet
 */
export type SpreadsheetRow = string[];

/**
 * Environment variables required by the application
 */
export interface EnvironmentVariables {
    NOTION_API_KEY: string;
    NOTION_DATABASE_ID: string;
    GOOGLE_SHEET_ID: string;
    GAPI_SERVICE_ACCOUNT_KEY: string;
}

// ===================== FORM TYPES =====================

/**
 * Different types of form submissions
 */
export type FormType = 'founder' | 'founder referral' | 'searcher' | 'searcher referral' | 'unknown';

/**
 * Categorized form submissions
 */
export interface CategorizedForms {
    founders: SpreadsheetRow[];
    founderReferrals: SpreadsheetRow[];
    searchers: SpreadsheetRow[];
    searcherReferrals: SpreadsheetRow[];
    unknown: SpreadsheetRow[];
}

/**
 * Valid form submissions (after filtering)
 */
export interface ValidForms {
    founders: SpreadsheetRow[];
    founderReferrals: SpreadsheetRow[];
    searchers: SpreadsheetRow[];
    searcherReferrals: SpreadsheetRow[];
}

/**
 * Form processing statistics
 */
export interface FormStatistics {
    totalForms: number;
    byType: Record<string, {
        total: number;
        valid: number;
        invalid: number;
    }>;
    completionRates: Record<string, number>;
}

/**
 * Processed form data container
 */
export interface ProcessedFormData {
    raw: SpreadsheetRow[];
    categorized: CategorizedForms;
    valid: ValidForms;
    statistics: FormStatistics;
}

// ===================== NOTION TYPES =====================

/**
 * Notion page properties for different entity types
 */
export interface NotionPageProperties {
    Name: {
        title: Array<{
            text: {
                content: string;
            };
        }>;
    };
    'Form Type'?: {
        select: {
            name: string;
        };
    };
    'Last Updated': {
        date: {
            start: string;
        };
    };
    [key: string]: any;
}

/**
 * Notion block structure
 */
export interface NotionBlock {
    object: 'block';
    type: string;
    [key: string]: any;
}

/**
 * Notion client with retry capabilities
 */
export interface NotionClientWithRetry {
    blocks: {
        children: {
            append: (args: any) => Promise<any>;
            list: (args: any) => Promise<any>;
        };
        update: (args: any) => Promise<any>;
    };
    pages: {
        create: (args: any) => Promise<any>;
        update: (args: any) => Promise<any>;
    };
    databases: {
        query: (args: any) => Promise<any>;
    };
}

// ===================== PROCESSING RESULTS =====================

/**
 * Results from processing a single entity type
 */
export interface ProcessingResults {
    processed: number;
    created: number;
    updated: number;
    errors: number;
    unmatchedReferrals?: number;
}

/**
 * Complete import results
 */
export interface ImportResults {
    founders: ProcessingResults;
    searchers: ProcessingResults;
    totalTime: number;
}

/**
 * Summary metrics for reporting
 */
export interface SummaryMetrics {
    totalProcessed: number;
    totalCreated: number;
    totalUpdated: number;
    totalErrors: number;
    successRate: number;
    executionTime: number;
    founderStats: ProcessingResults;
    searcherStats: ProcessingResults;
}

// ===================== VALIDATION TYPES =====================

/**
 * Valid location options
 */
export type ValidLocation =
    | 'Northern Europe'
    | 'Western Europe'
    | 'Central Europe'
    | 'Eastern Europe'
    | 'Southern Europe'
    | 'North America'
    | 'Latin America'
    | 'Africa'
    | 'Asia';

/**
 * Valid valuation ranges
 */
export type ValidValuation =
    | '< €5M'
    | '€5M - €10M'
    | '€11M - €15M'
    | '€16M - €20M'
    | '€21M - €25M'
    | '> €26M';

/**
 * Valid funding stages
 */
export type ValidFundingStage =
    | 'Pre-Seed'
    | 'Bridge to Seed'
    | 'Seed'
    | 'Bridge to Series A'
    | 'Series A'
    | 'Bridge to Series B'
    | 'Series B'
    | 'Bridge to Series C'
    | 'Series C'
    | 'Bridge to Series D'
    | 'Series D'
    | '> Series D';

/**
 * Valid availability options
 */
export type ValidAvailability =
    | 'Morning (09:00–12:00)'
    | 'Early afternoon (12:00–15:00)'
    | 'Late afternoon (15:00–18:00)'
    | 'Evening (18:00–21:00)'
    | 'Late evening (21:00–23:00)'
    | "I'm flexible / decide with the group";

/**
 * Valid searcher/intern designation
 */
export type SearcherType = 'Searcher' | 'Intern';

// ===================== UTILITY TYPES =====================

/**
 * Retry configuration options
 */
export interface RetryOptions {
    maxAttempts?: number;
    baseDelay?: number;
}

/**
 * API configuration
 */
export interface ApiConfig {
    GOOGLE_SHEETS: {
        SCOPES: string[];
        RANGE: string;
    };
    NOTION: {
        RETRY_ATTEMPTS: number;
        BASE_DELAY: number;
        RATE_LIMIT_DELAY: number;
    };
}

/**
 * Question group configuration
 */
export interface QuestionGroups {
    REFERRAL_BASICS: number[];
    REFERRAL_PROBLEM_SOLVING: number[];
    REFERRAL_AI_LEVERAGE: number[];
    REFERRAL_LEADERSHIP: number[];
    SEARCHER_BASICS: number[];
    SEARCHER_PROBLEM_SOLVING: number[];
    SEARCHER_AI_LEVERAGE: number[];
    SEARCHER_LEADERSHIP: number[];
    FOUNDER_BASICS: number[];
    FOUNDER_FINANCIALS: number[];
    FOUNDER_CHALLENGES: number[];
    FOUNDER_HR: number[];
    FOUNDER_EXIT: number[];
}

/**
 * Section titles mapping
 */
export interface SectionTitles {
    REFERRAL_BASICS: string;
    REFERRAL_PROBLEM_SOLVING: string;
    REFERRAL_AI_LEVERAGE: string;
    REFERRAL_LEADERSHIP: string;
    SEARCHER_BASICS: string;
    SEARCHER_PROBLEM_SOLVING: string;
    SEARCHER_AI_LEVERAGE: string;
    SEARCHER_LEADERSHIP: string;
    FOUNDER_BASICS: string;
    FOUNDER_FINANCIALS: string;
    FOUNDER_CHALLENGES: string;
    FOUNDER_HR: string;
    FOUNDER_EXIT: string;
}

/**
 * Referral mapping structure
 */
export interface ReferralMapping {
    [normalizedKey: string]: {
        displayName: string;
        referrals: SpreadsheetRow[];
    };
}

/**
 * Matching debug information
 */
export interface MatchingDebugInfo {
    totalSearchers: number;
    totalReferrals: number;
    unmatchedReferrals: number;
}

// ===================== ERROR TYPES =====================

/**
 * Application-specific error with context
 */
export class ApplicationError extends Error {
    constructor(
        message: string,
        public readonly context?: Record<string, any>
    ) {
        super(message);
        this.name = 'ApplicationError';
    }
}

/**
 * Validation error with field information
 */
export class ValidationError extends Error {
    constructor(
        message: string,
        public readonly field?: string,
        public readonly value?: any
    ) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Service error for external API failures
 */
export class ServiceError extends Error {
    constructor(
        message: string,
        public readonly service: 'notion' | 'google-sheets',
        public readonly originalError?: Error
    ) {
        super(message);
        this.name = 'ServiceError';
    }
}
