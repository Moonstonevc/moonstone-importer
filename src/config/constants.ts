/**
 * MOONSTONE IMPORTER - CONFIGURATION FILE
 * 
 * This file contains all the constants, validation options, and configuration
 * settings used throughout the application. It's designed to be easily 
 * understood and modified by non-programmers.
 */

import type {
    ValidLocation,
    ValidValuation,
    ValidFundingStage,
    ValidAvailability,
    FormType,
    ApiConfig,
    QuestionGroups,
    SectionTitles
} from '../types/index.js';

// ===================== FORM QUESTIONS REPOSITORY =====================
/**
 * Complete list of all form questions used in the application.
 * Each question has a specific index number that corresponds to 
 * columns in the Google Sheets data.
 */
export const FORM_QUESTIONS: readonly string[] = [
    // Questions 0-17: Reserved/Empty slots
    "", "", "", "", "", "", "", "", "", "",
    "", "", "", "", "", "", "", "",

    // Questions 18-24: Referral Contact Information
    "Referred Searcher Name",                    // 18
    "Referrer's Name",                          // 19
    "Referrer's Email",                         // 20
    "Referrer's LinkedIn",                      // 21
    "Entrepreneur's contact information",        // 22
    "Entrepreneur's Email",                     // 23
    "Entrepreneur's LinkedIn",                  // 24

    // Questions 25-28: Referrer Relationship Information
    "How do you know @Entrepreneur's contact info? What is your relationship?", // 25
    "Is @Entrepreneur's contact info a previous founder/entrepreneur?",          // 26
    "If yes, of what?",                                                         // 27
    "In case we contact @Entrepreneur's contact info, do you prefer to stay anonymous?", // 28

    // Questions 29-33: Problem Solving & AI Assessment (Referral)
    "Was there a moment when @Entrepreneur's contact info was responsible for solving a problem no one else could tackle? What did they do first, and how did they structure their approach?", // 29
    "Tell me about a time when @Entrepreneur's contact info had to make a decision under intense time pressure and without full information. What was the impact of that decision, and how did they justify it at the time?", // 30
    "Can you describe a project where @Entrepreneur's contact info used an AI tool to produce a first draft, prototype, or concept much faster than expected? Which tool did they use, and what difference did it make?", // 31
    "Was there a time when @Entrepreneur's contact info introduced you to a new AI tool? What was the tool, and what problem was it trying to solve?", // 32
    "Think of the most clever use of AI you've seen from @Entrepreneur's contact info. What was the context, what did they build or automate, and why was it impressive?", // 33

    // Questions 34-36: Leadership & Conflict Resolution (Referral)
    "Tell me about a time when @Entrepreneur's contact info had to challenge a teammate, partner, or client on a sensitive issue. How did they approach the conversation, and what was the outcome?", // 34
    "Was there ever a high-stakes meeting or moment where @Entrepreneur's contact info had to assert a new direction or call for a change in plans? How did they carry the room, and how did others respond?", // 35
    "Can you share an instance where @Entrepreneur's contact info helped stakeholders or team members realign after a conflict? What actions did they take to rebuild trust?", // 36

    // Questions 37-44: Searcher Basic Information
    "Searcher Name",        // 37
    "Searcher Email",       // 38
    "Searcher Phone",       // 39
    "Searcher LinkedIn",    // 40
    "Searcher Nickname",    // 41
    "Searcher v Intern",    // 42
    "Searcher Location",    // 43
    "Searcher CV",          // 44

    // Questions 45-46: Searcher Background
    "Are you a previous founder/entrepreneur?",  // 45
    "If yes, tell us more.",                    // 46

    // Questions 47-48: Training & Availability
    "To be able to well understand and support our searchers we intend all searchers to go through a six month training program. From when could you start dedicating ~3 hours per day to this program?", // 47
    "Our cohorts of 5 choose a daily touchpoint time together. What time windows work best for you? (Morning, Early afternoon, Late afternoon, Evening, Late evening, I'm flexible / decide with the group)", // 48

    // Questions 49-52: Problem Solving Assessment
    "Think of a time when you had two or more urgent deadlines collide. What was at stake, how did you decide what to handle first, and how did you communicate that decision to others?", // 49
    "Describe a situation where a project led by you started going off-track. How did you step in, and what actions did you take to regain control?", // 50
    "Was there a moment when you were responsible for solving a problem that no one else seemed to know how to tackle? What did you do first, and how did you structure your approach?", // 51
    "Tell us about a time when you had to make a decision under intense time pressure and without full information. What was the impact of that decision, and how did you justify it at the time?", // 52

    // Questions 53-57: AI Leverage Assessment
    "What added value do you believe AI tools bring to a business?", // 53
    "Can you describe a specific project where you used an AI tool to produce a first draft, prototype, or concept much faster than expected? Which tool did you use, and what difference did it make?", // 54
    "What AI tool are you currently passionate about? What is it, and what problem is it trying to solve?", // 55
    "Think of your most \"clever\" use of AI to date. What was the context, what did you build or automate, and why was it impressive?", // 56
    "We're looking for your high-level strategic thinking. Beyond just using tools, what are the first three actionable steps you would take to fundamentally transform a company and make it resilient in the face of future AGI advancements? Describe the actions and the rationale behind your choices.", // 57

    // Questions 58-65: Leadership & Network Assessment
    "Tell me about a time when you had to challenge a teammate, partner, or client on a sensitive issue. Walk me through your approach, and what was the outcome?", // 58
    "Describe a situation where team morale was low or trust was strained—and you played a role in shifting the dynamic. What exactly did you do?", // 59
    "Was there ever a high-stakes meeting or moment where you had to assert a new direction or call for a change in plans? How did you make that decision, how did you communicate it to the room, and how did others respond?", // 60
    "Can you share an instance where you helped stakeholders or team members realign after a conflict? What actions did you take to rebuild trust?", // 61
    "How many people could you go to dinner with in the next week who'd gladly lend you their social capital (out of 10)? These are the kind of people who say \"Tell me who I should intro you to,\" no pitch needed.", // 62
    "If you had to raise €150,000 in 90 days today, who would you turn to first and how would you present your proposal?", // 63
    "The relationships with outgoing entrepreneurs are a cornerstone of our program. Describe a specific experience where you had to earn the trust of a senior business owner. Walk us through your approach, what challenges you faced, and what actions you took to build a lasting, trusting relationship.", // 64
    "We are looking for visionary leaders who can inspire confidence in an unproven idea. Tell us about a time you secured buy-in for a big, bold project. Describe the project, the audience you were trying to convince, and the core arguments or story you used to get them on board.", // 65
] as const;

// ===================== VALIDATION OPTIONS =====================
/**
 * Valid options for dropdown/select fields in Notion.
 * These must match exactly with the options configured in your Notion database.
 */

export const VALID_LOCATIONS: readonly ValidLocation[] = [
    "Northern Europe",
    "Western Europe",
    "Central Europe",
    "Eastern Europe",
    "Southern Europe",
    "North America",
    "Latin America",
    "Africa",
    "Asia"
] as const;

export const VALID_VALUATIONS: readonly ValidValuation[] = [
    "< €5M",
    "€5M - €10M",
    "€11M - €15M",
    "€16M - €20M",
    "€21M - €25M",
    "> €26M"
] as const;

export const VALID_FUNDING_STAGES: readonly ValidFundingStage[] = [
    "Pre-Seed",
    "Bridge to Seed",
    "Seed",
    "Bridge to Series A",
    "Series A",
    "Bridge to Series B",
    "Series B",
    "Bridge to Series C",
    "Series C",
    "Bridge to Series D",
    "Series D",
    "> Series D"
] as const;

export const AVAILABILITY_OPTIONS: readonly ValidAvailability[] = [
    "Morning (09:00–12:00)",
    "Early afternoon (12:00–15:00)",
    "Late afternoon (15:00–18:00)",
    "Evening (18:00–21:00)",
    "Late evening (21:00–23:00)",
    "I'm flexible / decide with the group"
] as const;

// ===================== FORM TYPE MAPPINGS =====================
/**
 * Maps the long form descriptions from Google Sheets to simple form types
 */
export const FORM_TYPE_MAPPINGS: Record<string, FormType> = {
    "i am a founder and i want to take my startup to the moon.": "founder",
    "i know an incredible founder, someone moonstone should get to know.": "founder referral",
    "i am an entrepreneur and i want to be a searcher for moonstone's search fund.": "searcher",
    "i know an incredible entrepreneur, that would be a great searcher for moonstone's search fund.": "searcher referral"
} as const;

// ===================== QUESTION GROUPS =====================
/**
 * Organizes questions into logical groups for better presentation in Notion
 */
export const QUESTION_GROUPS: QuestionGroups = {
    // Referral Questions
    REFERRAL_BASICS: [25, 26, 27, 28],
    REFERRAL_PROBLEM_SOLVING: [29, 30],
    REFERRAL_AI_LEVERAGE: [31, 32, 33],
    REFERRAL_LEADERSHIP: [34, 35, 36],

    // Searcher Questions  
    SEARCHER_BASICS: [45, 46, 47, 48],
    SEARCHER_PROBLEM_SOLVING: [49, 50, 51, 52],
    SEARCHER_AI_LEVERAGE: [53, 54, 55, 56, 57],
    SEARCHER_LEADERSHIP: [58, 59, 60, 61, 62, 63, 64, 65],

    // Founder Questions
    FOUNDER_BASICS: [79, 80, 81, 82, 83, 84],
    FOUNDER_FINANCIALS: [87, 88, 95, 96, 97],
    FOUNDER_CHALLENGES: [98, 99, 100, 101, 103],
    FOUNDER_HR: [106, 107, 108, 109, 110, 111, 112],
    FOUNDER_EXIT: [113, 114, 115, 116, 117]
} as const;

// ===================== SECTION TITLES =====================
/**
 * Human-readable titles for different sections in Notion pages
 */
export const SECTION_TITLES: SectionTitles = {
    REFERRAL_BASICS: "BASICS",
    REFERRAL_PROBLEM_SOLVING: "THE SEARCHER'S MIND: PROBLEM SOLVING, PRIORITIZATION & PRESSURE",
    REFERRAL_AI_LEVERAGE: "AGI-PROOFING THE FUTURE: AI LEVERAGE IN ACTION",
    REFERRAL_LEADERSHIP: "THE MOONSTONE DNA: TRUST, CONFLICT, AND STRATEGIC LEADERSHIP",

    SEARCHER_BASICS: "BASICS",
    SEARCHER_PROBLEM_SOLVING: "YOUR MIND: PROBLEM SOLVING, PRIORITIZATION & PRESSURE",
    SEARCHER_AI_LEVERAGE: "AI LEVERAGE IN ACTION: PREPARING FOR THE AGI ECONOMY",
    SEARCHER_LEADERSHIP: "THE MOONSTONE DNA: TRUST, CONFLICT, STRATEGIC LEADERSHIP, NETWORK",

    FOUNDER_BASICS: "BASICS",
    FOUNDER_FINANCIALS: "FINANCIALS",
    FOUNDER_CHALLENGES: "CHALLENGES & PRIORITIES",
    FOUNDER_HR: "HR",
    FOUNDER_EXIT: "EXIT"
} as const;

// ===================== API CONFIGURATION =====================
/**
 * Configuration for external API connections
 */
export const API_CONFIG: ApiConfig = {
    GOOGLE_SHEETS: {
        SCOPES: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
        RANGE: "A2:ABY" // The range of cells to read from the spreadsheet
    },

    NOTION: {
        RETRY_ATTEMPTS: 7,
        BASE_DELAY: 600, // milliseconds
        RATE_LIMIT_DELAY: 100 // milliseconds between operations
    }
} as const;

// ===================== ENVIRONMENT VARIABLES =====================
/**
 * Required environment variables for the application to function
 */
export const REQUIRED_ENV_VARS: readonly string[] = [
    "NOTION_API_KEY",
    "GAPI_SERVICE_ACCOUNT_KEY",
    "GOOGLE_SHEET_ID",
    "NOTION_DATABASE_ID"
] as const;
