// ===================== SECTION: Imports =====================
import { Client } from "@notionhq/client";
import { google } from "googleapis";
import { auth } from "google-auth-library";
import { distance } from "fastest-levenshtein";

// ===================== SECTION: Question Text Repository (allQuestions) =====================
const allQuestions = [
  // 0–17
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",

  // 18–24 → Referral Info
  "Referred Searcher Name",
  "Referrer's Name",
  "Referrer's Email",
  "Referrer's LinkedIn",
  "Entrepeneur's contact information",
  "Entrepeneur's Email",
  "Entrepeneur's LinkedIn",

  // 25–28 → Referrer Info & Preferences
  "How do you know @Entrepreneur’s contact info? What is your relationship?",
  "Is @Entrepreneur’s contact info a previous founder/entrepreneur?",
  "If yes, of what?",
  "In case we contact @Entrepreneur’s contact info, do you prefer to stay anonymous?",

  // 29–33 → Problem Solving + AI (Referral)
  "Was there a moment when @Entrepreneur’s contact info was responsible for solving a problem no one else could tackle? What did they do first, and how did they structure their approach?",
  "Tell me about a time when @Entrepreneur’s contact info had to make a decision under intense time pressure and without full information. What was the impact of that decision, and how did they justify it at the time?",
  "Can you describe a project where @Entrepreneur’s contact info used an AI tool to produce a first draft, prototype, or concept much faster than expected? Which tool did they use, and what difference did it make?",
  "Was there a time when @Entrepreneur’s contact info introduced you to a new AI tool? What was the tool, and what problem was it trying to solve?",
  "Think of the most clever use of AI you’ve seen from @Entrepreneur’s contact info. What was the context, what did they build or automate, and why was it impressive?",

  // 34–36 → Moonstone DNA (Referral)
  "Tell me about a time when @Entrepreneur’s contact info had to challenge a teammate, partner, or client on a sensitive issue. How did they approach the conversation, and what was the outcome?",
  "Was there ever a high-stakes meeting or moment where @Entrepreneur’s contact info had to assert a new direction or call for a change in plans? How did they carry the room, and how did others respond?",
  "Can you share an instance where @Entrepreneur’s contact info helped stakeholders or team members realign after a conflict? What actions did they take to rebuild trust?",

  // 37–44 → Searcher Inputs (title + properties)
  "Searcher Name", // 37
  "Searcher Email", // 38
  "Searcher Phone", // 39
  "Searcher LinkedIn", // 40
  "Searcher Nickname", // 41
  "Searcher v Intern", //42
  "Searcher Location", // 43
  "Searcher CV", // 44
  
  // 45–46 → Searcher BASICS
  "Are you a previous founder/entrepreneur?",
  "If yes,  tell us more.",
  // 47–48: NEW training & availability
  "To be able to well understand and support our searchers we intend all searchers to go through a six month training program. From when could you start dedicating ~3 hours per day to this program?",
  "Our cohorts of 5 choose a daily touchpoint time together. What time windows work best for you? (Morning, Early afternoon, Late afternoon, Evening, Late evening, I’m flexible / decide with the group)",
  // 49–52 → Searcher Problem Solving
  "Think of a time when you had two or more urgent deadlines collide. What was at stake, how did you decide what to handle first, and how did you communicate that decision to others?",
  "Describe a situation where a project led by you started going off-track. How did you step in, and what actions did you take to regain control?",
  "Was there a moment when you were responsible for solving a problem that no one else seemed to know how to tackle? What did you do first, and how did you structure your approach?",
  "Tell us about a time when you had to make a decision under intense time pressure and without full information. What was the impact of that decision, and how did you justify it at the time?",
  // 53–57 → Searcher AI Leverage
  "What added value do you believe AI tools bring to a business?",
  "Can you describe a specific project where you used an AI tool to produce a first draft, prototype, or concept much faster than expected? Which tool did you use, and what difference did it make?",
  "What AI tool are you currently passionate about? What is it, and what problem is it trying to solve?",
  "Think of your most “clever” use of AI to date. What was the context, what did you build or automate, and why was it impressive?",
  "We're looking for your high-level strategic thinking. Beyond just using tools, what are the first three actionable steps you would take to fundamentally transform a company and make it resilient in the face of future AGI advancements? Describe the actions and the rationale behind your choices.",
  // 58–65 → Searcher Moonstone DNA
  "Tell me about a time when you had to challenge a teammate, partner, or client on a sensitive issue. Walk me through your approach, and what was the outcome?",
  "Describe a situation where team morale was low or trust was strained—and you played a role in shifting the dynamic. What exactly did you do?",
  "Was there ever a high-stakes meeting or moment where you had to assert a new direction or call for a change in plans? How did you make that decision, how did you communicate it to the room, and how did others respond?",
  "Can you share an instance where you helped stakeholders or team members realign after a conflict? What actions did you take to rebuild trust?",
  "How many people could you go to dinner with in the next week who’d gladly lend you their social capital (out of 10)? These are the kind of people who say “Tell me who I should intro you to,” no pitch needed.",
  "If you had to raise €150,000 in 90 days today, who would you turn to first and how would you present your proposal?",
  "The relationships with outgoing entrepreneurs are a cornerstone of our program. Describe a specific experience where you had to earn the trust of a senior business owner. Walk us through your approach, what challenges you faced, and what actions you took to build a lasting, trusting relationship.",
  "We are looking for visionary leaders who can inspire confidence in an unproven idea. Tell us about a time you secured buy-in for a big, bold project. Describe the project, the audience you were trying to convince, and the core arguments or story you used to get them on board.",
];

const normalizeName = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, "")
// ===================== SECTION: Environment & Client Initialization (Notion + Google Sheets) =====================
    .trim();

console.log("\ud83c\udf0d Environment variables check:", {
  NOTION_API_KEY: !!process.env.NOTION_API_KEY,
  GAPI_SERVICE_ACCOUNT_KEY: !!process.env.GAPI_SERVICE_ACCOUNT_KEY,
  GOOGLE_SHEET_ID: !!process.env.GOOGLE_SHEET_ID,
  NOTION_DATABASE_ID: !!process.env.NOTION_DATABASE_ID,
});

let json_data;
try {
  json_data = JSON.parse(process.env.GAPI_SERVICE_ACCOUNT_KEY);
  console.log("\u2705 Parsed Google service account key");
} catch (err) {
  console.error("\u274c Invalid Google service account key:", err.message);
  process.exit(1);
}

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
  timeoutMs: 120000, 
});

const google_client = auth.fromJSON(json_data);
google_client.scopes = [
  "https://www.googleapis.com/auth/spreadsheets.readonly",
];
const sheets = google.sheets({ version: "v4", auth: google_client });

// --- Notion retry helpers (inserted after client init) ---
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const withRetry = async (fn, { tries = 8, baseDelay = 1000 } = {}) => {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      const code = err?.code || err?.status || err?.name || err?.cause?.code;
      const msg  = (err?.message || "").toLowerCase();

      const transient =
        code === "rate_limited" ||
        code === "service_unavailable" ||                 
        code === "notionhq_client_request_timeout" ||     
        code === 429 ||
        code === 408 ||                                   
        code === 500 ||
        code === 502 ||
        code === 503 ||
        code === 504 ||
        msg.includes("timed out") ||                      
        msg.includes("timeout") ||                        
        msg.includes("socket hang up") ||
        msg.includes("fetch failed") ||
        msg.includes("terminated");

      if (transient) {
        const wait = Math.min(30000, baseDelay * Math.pow(2, i)); // cap at 30s
        console.warn(
          `⏳ withRetry: attempt ${i + 1}/${tries} failed (${code || err.name}): ${err.message}. ` +
          `Retrying in ${wait}ms…`
        );
        await sleep(wait);
        continue;
      }
      // not transient → bubble up
      throw err;
    }
  }
  throw lastErr;
};

const notionWithRetry = {
  blocks: {
    children: {
      append: (args) => withRetry(() => notion.blocks.children.append(args)),
      list:   (args) => withRetry(() => notion.blocks.children.list(args)),
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

async function appendChildrenSafe(block_id, children) {
  const clean = (children || []).filter(Boolean);
  if (clean.length === 0) return { results: [] }; // nothing to append
  return await notionWithRetry.blocks.children.append({ block_id, children: clean });
}

function coerceInternSearcher(val) {
  const s = String(val || "").trim().toLowerCase();
  if (s === "intern") return "Intern";
  if (s === "searcher") return "Searcher";
  return undefined; // leave property untouched if cell is empty or unexpected
}

// --- end retry helpers ---
function normName(s) {
  const mapDigits = {
    "⁰":"0","¹":"1","²":"2","³":"3","⁴":"4","⁵":"5","⁶":"6","⁷":"7","⁸":"8","⁹":"9",
    "₀":"0","₁":"1","₂":"2","₃":"3","₄":"4","₅":"5","₆":"6","₇":"7","₈":"8","₉":"9",
  };
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉]/g, ch => mapDigits[ch] || "")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function dedupeToggles(parentId, titles) {
  if (!parentId || !Array.isArray(titles) || titles.length === 0) return;

  const kids = await notionWithRetry.blocks.children.list({ block_id: parentId });
  for (const title of titles) {
    const toggles = kids.results.filter(
      (b) => b.type === "toggle" && b.toggle?.rich_text?.[0]?.text?.content === title
    );
    // keep the first, archive the rest
    for (let i = 1; i < toggles.length; i++) {
      await notionWithRetry.blocks.update({ block_id: toggles[i].id, archived: true });
      await sleep(60);
    }
  }
}

function debugSearcherReferralJoin(rows, searchers, searcherReferrals) {
  const norm = (s) => (s || "").trim().toLowerCase();

  // Build a set of Searcher names from Searcher forms (col 37)
  const searcherNames = new Set(searchers.map((s) => norm(s[37])));

  // Check each referral: does its Searcher Name (col 22) exist among Searchers (col 37)?
  const missing = [];
  for (const r of searcherReferrals) {
    const referred22 = norm(r[22]); // Searcher name provided by the referrer
    if (!searcherNames.has(referred22)) {
      missing.push({ rowIndex: rows.indexOf(r), referredRaw: r[22] });
    }
  }

  console.log("🔎 Searchers (col 37):", searcherNames.size);
  console.log("🔎 Searcher referrals:", searcherReferrals.length);

  if (missing.length) {
    console.warn("⚠️ Referrals whose Searcher Name (col 22) does not match any Searcher (col 37):");
    for (const m of missing.slice(0, 50)) {
      console.warn(`  - referral row#${m.rowIndex}: [22] = "${m.referredRaw}"`);
    }
  } else {
    console.log("✅ Every referral name in col 22 has a matching Searcher name in col 37.");
  }
}

// ===================== SECTION: Block Builder Helpers (createQuoteToggle, hasBlockChanged, etc.) =====================
const createQuoteToggle = (title, content) => ({
  object: "block",
  type: "toggle",
  toggle: {
    rich_text: [{ type: "text", text: { content: title } }],
    children:
      content && content.trim() !== ""
        ? [
            {
              object: "block",
              type: "quote",
              quote: {
                rich_text: [{ type: "text", text: { content: content } }],
              },
            },
          ]
        : [],
  },
});

const hasBlockChanged = (existingBlock, newText) => {
  const existingText =
    existingBlock?.quote?.rich_text?.[0]?.text?.content || "";
  return existingText.trim() !== newText.trim();
};

const createTextTableRow = (label, value) => ({
  object: "block",
  type: "table_row",
  table_row: {
    cells: [
      [{ type: "text", text: { content: label || "" } }],
      [{ type: "text", text: { content: value || "" } }],
    ],
  },
});

const updateToggleQuote = async (parentBlockId, title, newText) => {
  if (!newText?.trim()) return;

  const existingChildren = await notionWithRetry.blocks.children.list({
    block_id: parentBlockId,
  });

  const toggle = existingChildren.results.find(
    (b) =>
      b.type === "toggle" && b.toggle?.rich_text?.[0]?.text?.content === title,
  );

  if (toggle) {
    const toggleChildren = await notionWithRetry.blocks.children.list({
      block_id: toggle.id,
    });
    const quoteBlock = toggleChildren.results.find((b) => b.type === "quote");
    if (hasBlockChanged(quoteBlock, newText)) {
      await notionWithRetry.blocks.update({
        block_id: quoteBlock.id,
        quote: {
          rich_text: [{ type: "text", text: { content: newText } }],
        },
      });
      await sleep(100);
    }
  } else {
    // Add new toggle if it didn't exist
    const block = createQuoteToggle(title, newText);
    await notionWithRetry.blocks.children.append({
      block_id: parentBlockId,
      children: [block],
    });
    await sleep(120);
  }
};

// ✅ Moved outside of updateToggleQuote:
const updateMultipleQuotes = async (parentBlockId, titles, answers) => {
  for (let i = 0; i < titles.length; i++) {
    await updateToggleQuote(parentBlockId, titles[i], answers[i]);
    await sleep(120);
  }
};

// ===================== SECTION: Enumerations / Valid Select Options =====================
const validLocations = [
  "Northern Europe",
  "Western Europe",
  "Central Europe",
  "Eastern Europe",
  "Southern Europe",
  "North America",
  "Latin America",
  "Africa",
  "Asia",
];

const validValuations = [
  "< €5M",
  "€5M - €10M",
  "€11M - €15M",
  "€16M - €20M",
  "€21M - €25M",
  "> €26M",
];

const validFundingStages = [
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
  "> Series D",
];

// Map the sheet answer (col 48) to your Notion Select options
function mapAvailabilityOption(raw) {
  if (!raw) return undefined;
  const s = String(raw).toLowerCase();

  const options = [
    "Morning (09:00–12:00)",
    "Early afternoon (12:00–15:00)",
    "Late afternoon (15:00–18:00)",
    "Evening (18:00–21:00)",
    "Late evening (21:00–23:00)",
    "I’m flexible / decide with the group",
  ];

  // return the first defined option that appears in the answer
  for (const opt of options) {
    const probe = opt.toLowerCase().split(" (")[0]; // match by label part
    if (s.includes(probe.split(" ")[0]) || s.includes(probe)) return opt;
  }
  if (s.includes("flex")) return "I’m flexible / decide with the group";
  return undefined;
}

// === Table helpers (used by unmatched-searcher page and elsewhere) ===

function generateTableRows(pairs) {
  return (pairs || []).map(([label, value]) => ({
    object: "block",
    type: "table_row",
    table_row: {
      cells: [
        [{ type: "text", text: { content: String(label ?? "") } }],
        [{ type: "text", text: { content: String(value ?? "") } }],
      ],
    },
  }));
}

function createTableBlock(pairs) {
  return {
    object: "block",
    type: "table",
    table: {
      table_width: 2,
      has_column_header: true,
      has_row_header: false,
      children: generateTableRows(pairs),
    },
  };
}

// ---- appendQuestionGroup(notion, parentId, row, title, indices) ----
async function appendQuestionGroup(notion, parentId, row, title, indices) {
  console.log(`➕ Appending section "${title}" with ${indices.length} questions to ${parentId}`);

  // 1) Create the section toggle
  const sectionRes = await notionWithRetry.blocks.children.append({
    block_id: parentId,
    children: [
      {
        object: "block",
        type: "toggle",
        toggle: { rich_text: [{ type: "text", text: { content: title } }] },
      },
    ],
  });
  const sectionId = sectionRes.results?.[0]?.id;
  await sleep(80);

  // 2) One toggle per question, then a quote with the answer
  for (const i of indices) {
    const qTitle =
      (typeof allQuestions !== "undefined" && allQuestions[i]) || `Question ${i}`;

    const qRes = await notionWithRetry.blocks.children.append({
      block_id: sectionId,
      children: [
        {
          object: "block",
          type: "toggle",
          toggle: { rich_text: [{ type: "text", text: { content: qTitle } }] },
        },
      ],
    });
    const qId = qRes.results?.[0]?.id;
    await sleep(60);

    const answer = (row?.[i]?.trim?.() || "No response");
    await notionWithRetry.blocks.children.append({
      block_id: qId,
      children: [
        {
          object: "block",
          type: "quote",
          quote: { rich_text: [{ type: "text", text: { content: answer } }] },
        },
      ],
    });
    await sleep(60);
  }
}

// ---- createQAgroup(row, indices) ----
// Returns an array of Q/A toggle blocks, one per column index.
// Used when we already have the parent toggle and want to append multiple Q/A items at once.
function createQAgroup(row, indices) {
  return (indices || []).map((i) => ({
    object: "block",
    type: "toggle",
    toggle: {
      rich_text: [
        {
          type: "text",
          text: {
            // If you have allQuestions[], use it; otherwise fall back to "Question <i>"
            content:
              (typeof allQuestions !== "undefined" && allQuestions[i]) ||
              `Question ${i}`,
          },
        },
      ],
      children: [
        {
          object: "block",
          type: "quote",
          quote: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: (row?.[i]?.trim?.() || "No response"),
                },
              },
            ],
          },
        },
      ],
    },
  }));
}

// ===================== SECTION: Page Builders (Unmatched Referral Page) =====================
// Create a page for an unmatched *searcher* referral
async function createUnmatchedReferralPage(searcherName, timestamp, row) {
  const title = `⚠️ Unmatched referral for searcher: ${searcherName || "Unknown"}`;
  console.log("🧩 Upserting unmatched searcher referral page:", title);

  // Upsert by Name
  const existing = await notionWithRetry.databases.query({
    database_id: process.env.NOTION_DATABASE_ID,
    filter: { property: "Name", title: { equals: title } },
  });

  const baseProps = {
    "Form Type":    { select: { name: "Searcher Referral" } },
    "SF Referrals": { select: { name: "⚠️ Unmatched Referral" } },
    "Form filled out:":
      timestamp && !Number.isNaN(Date.parse(timestamp))
        ? { date: { start: new Date(timestamp).toISOString() } }
        : undefined,
    "Last Updated": { date: { start: new Date().toISOString() } },
  };

  let page;
  if (existing.results.length > 0) {
    page = existing.results[0];
    await notionWithRetry.pages.update({ page_id: page.id, properties: baseProps });
  } else {
    page = await notionWithRetry.pages.create({
      parent: { type: "database_id", database_id: process.env.NOTION_DATABASE_ID },
      properties: { Name: { title: [{ text: { content: title } }] }, ...baseProps },
    });
  }
  const pageId = page.id;

  // --- Ensure a single "Form" toggle at the page root
  await dedupeToggles(pageId, ["Form"]);
  let formToggle = (await notionWithRetry.blocks.children.list({ block_id: pageId }))
    .results.find((b) => b.type === "toggle" && b.toggle?.rich_text?.[0]?.text?.content === "Form");
  if (!formToggle) {
    const formRes = await notionWithRetry.blocks.children.append({
      block_id: pageId,
      children: [
        { object: "block", type: "toggle",
          toggle: { rich_text: [{ type: "text", text: { content: "Form" } }] } }
      ],
    });
    await sleep(80);
    formToggle = formRes.results?.[0];
  }

  // --- Ensure a single "REFERRAL INSIGHT" under "Form"
  // --- Ensure a single "REFERRAL INSIGHT" under "Form"
  await dedupeToggles(formToggle.id, ["REFERRAL INSIGHT"]);
  let riToggle = (await notionWithRetry.blocks.children.list({ block_id: formToggle.id }))
    .results.find((b) => b.type === "toggle" && b.toggle?.rich_text?.[0]?.text?.content === "REFERRAL INSIGHT");

  if (!riToggle) {
    const riRes = await notionWithRetry.blocks.children.append({
      block_id: formToggle.id,
      children: [
        {
          object: "block",
          type: "toggle",
          toggle: { rich_text: [{ type: "text", text: { content: "REFERRAL INSIGHT" } }] },
        },
      ],
    });
    await sleep(100);
    riToggle = riRes.results?.[0];
  }
  const riToggleId = riToggle.id;

  // --- Clear ANY old children under REFERRAL INSIGHT (do this once per run)
  {
    const riChildren = await notionWithRetry.blocks.children.list({ block_id: riToggleId });
    for (const b of riChildren.results) {
      await notionWithRetry.blocks.update({ block_id: b.id, archived: true });
      await sleep(40);
    }
  }

  // --- Append the 2-column info table first
  const infoPairs = [
    ["Searcher Name",          row?.[22] || ""],
    ["Searcher Email",         row?.[23] || ""],
    ["Searcher LinkedIn",      row?.[24] || ""],
    ["Referrer Name",          row?.[18] || ""],
    ["Referrer Email",         row?.[19] || ""],
    ["Referrer Phone",         row?.[20] || ""],
    ["Referrer LinkedIn",      row?.[21] || ""],
    ["Form filled out:",       row?.[2]  || ""],
  ];
  await notionWithRetry.blocks.children.append({
    block_id: riToggleId,
    children: [createTableBlock(infoPairs)],
  });
  await sleep(120);

  // --- Then append the four Q&A sections (same layout/titles as matched referrals)
  await appendQuestionGroup(notionWithRetry, riToggleId, row, "BASICS", [25, 26, 27, 28]);
  await sleep(80);

  await appendQuestionGroup(
    notionWithRetry, riToggleId, row,
    "THE SEARCHER’S MIND: PROBLEM SOLVING, PRIORITIZATION & PRESSURE",
    [29, 30]
  );
  await sleep(80);

  await appendQuestionGroup(
    notionWithRetry, riToggleId, row,
    "AGI-PROOFING THE FUTURE: AI LEVERAGE IN ACTION",
    [31, 32, 33]
  );
  await sleep(80);

  await appendQuestionGroup(
    notionWithRetry, riToggleId, row,
    "THE MOONSTONE DNA: TRUST, CONFLICT, AND STRATEGIC LEADERSHIP",
    [34, 35, 36]
  );

  console.log(`✅ Unmatched referral page updated for searcher: ${searcherName}`);
}

async function processUnmatchedSearcherReferrals(searchers, searcherReferrals) {
  // Build set of normalized names from Searcher forms (col 37)
  const searcherNameSet = new Set(
    (searchers || []).map(s => normName(s[37])).filter(Boolean)
  );

  // Keep only searcher-referral rows whose Searcher Name (col 22) has no match in Searchers (col 37)
  const unmatched = (searcherReferrals || []).filter(r => {
    const referred = normName(r[22]); // searcher name as stated by the referrer
    return referred && !searcherNameSet.has(referred);
  });

  console.log("👤 Searchers by name:", Array.from(searcherNameSet));
  console.log("🧩 Unmatched searcher referrals:", unmatched.length);
  unmatched.forEach(r => {
    console.log(`  - [22]=${(r[22]||"").trim()}  [2]=${r[2]||""}`);
  });

  // Upsert a Notion page for each truly unmatched searcher referral
  for (const r of unmatched) {
    const timestamp = r?.[2] ?? null;
    const searcherName = String(r?.[22] || "Unknown").trim();
    console.log(`🧾 Creating unmatched searcher referral page for: ${searcherName}`);
    await createUnmatchedReferralPage(searcherName, timestamp, r);
    await sleep(80);
  }
}

// ===================== SECTION: Main Orchestrator =====================
  async function main() {
  console.log("\ud83d\ude80 Script started");
  const response = await withRetry(
    () =>
      sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "A2:ABY",
      }),
    { tries: 5, baseDelay: 500 }
  );
  const rows = response.data.values;
  const referralMap = {};
  // Fetch all existing pages from Notion
  const existingPages = [];
  let cursor = undefined;

  do {
    const resp = await notionWithRetry.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      start_cursor: cursor,
    });
    existingPages.push(...resp.results);
    cursor = resp.has_more ? resp.next_cursor : undefined;
  } while (cursor);
  console.log("\ud83d\udcc4 Sheet data loaded. Rows:", rows.length);

  const founders = [],
    referrals = [],
    searchers = [],
    searcherReferrals = [];

  for (const row of rows) {
    const signal = row[3]?.trim().toLowerCase() || "";

    // Map the long Tally prompt to a simple form type
    const simpleType =
      signal === "i am a founder and i want to take my startup to the moon."
        ? "founder"
        : signal === "i know an incredible founder, someone moonstone should get to know."
        ? "founder referral"
        : signal === "i am an entrepreneur and i want to be a searcher for moonstone's search fund (or apply as an intern)."
        ? "searcher"
        : signal === "i know an incredible entrepreneur, that would be a great searcher for moonstone's search fund."
        ? "searcher referral"
        : "";

    if (simpleType === "founder") {
      founders.push(row);
    } else if (simpleType === "founder referral") {
      referrals.push(row);
    } else if (simpleType === "searcher") {
      searchers.push(row);
    } else if (simpleType === "searcher referral") {
      searcherReferrals.push(row);
    }
  }

  // DEBUG: verify Searcher (col 37) ↔ Referral (col 22) joins
  debugSearcherReferralJoin(rows, searchers, searcherReferrals);

    // Build referralMap with a normalized key (coalesces CO₂Zero / CO2Zero / spacing, etc.)
    for (const row of referrals) {
      const raw = (row[9] || "").trim();      // human-friendly startup name from the referral row
      const key = normName(raw);               // ← normalized key: lowercased, diacritics stripped, non-alnum removed
      if (!key) continue;

      if (!referralMap[key]) {
        referralMap[key] = { display: raw, rows: [] };  // keep a pretty display name
      }
      referralMap[key].rows.push(row);
    }

  // ❗️REMOVE referrals for startups that exist in founder rows
    const matchedStartupNamesRaw = founders
    .map((row) => row[73]?.trim())
    .filter(Boolean);

    // NOTE: this version expects you already pass IN normalized keys
    const getBestMatch = (targetKey, candidates) => {
      let best = null;
      let bestScore = Infinity;

      for (const c of candidates) {
        const score = distance(targetKey, c);
        if (score < bestScore) {
          bestScore = score;
          best = c;
        }
      }
      return bestScore <= 2 ? best : null;  // keep your threshold
    };

  // Remove startups from unmatchedReferrals if they will be matched in the founders loop
  const matchedStartupNames = founders
    .map((row) => row[73]?.trim().toLowerCase())
    .filter((name) => name); // remove undefined/null

  for (const row of founders) {
    try {
      const startupName = row[73]?.trim();                 // your display name (from the sheet)
      const founderKey  = normName(startupName || "");     // normalized key for matching
      const matchedKey  = getBestMatch(founderKey, Object.keys(referralMap)) || founderKey;
      const bundle      = referralMap[matchedKey];         // { display, rows } or undefined
      const referralCount    = bundle?.rows?.length || 0;
      const matchedReferrals = bundle?.rows || [];
      const matchedDisplay   = bundle?.display || startupName;
    const founderForm_filled_out = row[2] || null;
    const founderDeck = row[75]?.trim() || null;
    const founderCount = Number(row[70]) || 1;

    // 🌟 Detect Form Type from column 3
    const formIntent = row[3]?.trim();

    let formType;
    if (
      formIntent ===
      "I know an incredible founder, someone Moonstone should get to know."
    ) {
      formType = "Founder Referral";
    } else if (
      formIntent === "I am a founder and I want to take my startup to the moon."
    ) {
      formType = "Founder";
    } else if (
      formIntent ===
      "I know an incredible entrepreneur, that would be a great searcher for Moonstone's Search Fund."
    ) {
      formType = "Searcher Referral";
    } else if (
      formIntent ===
      "I am an entrepreneur and I want to be a searcher for Moonstone's Search Fund (or apply as an intern)."
    ) {
      formType = "Searcher";
    }

    // ✅ Detect referral count logic for Searcher Referrals
    const normalize = (s) => s?.trim().toLowerCase();
    const searcherName = normalize(row[37]); // row = searcher row

    const searcherReferrals = rows.filter(
      (r) =>
        r[3]?.trim() ===
          "I know an incredible entrepreneur, that would be a great searcher for Moonstone's Search Fund." &&
        normalize(r[22]) === searcherName,
    );

    // 🏷️ Tag SF Referrals status
    let sfReferralsLabel;
    if (formType === "Searcher") {
      const count = searcherReferrals.length;
      sfReferralsLabel =
        count >= 5
          ? "V+ Referrals"
          : ["I Referral", "II Referrals", "III Referrals", "IV Referrals"][
              count - 1
            ] || undefined;
    }

    console.log(
      `\ud83d\udee0 Creating Notion card for ${startupName} with ${referralCount} referrals`,
    );

// ---- helper inside main: getFilledCount; index ranges for founders & teams ----
    const getFilledCount = (row, indices) =>
      indices.reduce((count, i) => count + (row[i]?.trim() ? 1 : 0), 0);

    // Count answered (founders loop → always founder indices)
    let allRelevantIndices = [...Array(50)].map((_, i) => 66 + i);

    // Team members: number from col 115; each member adds 11 cols starting at 116
    const numTeamMembers = Number(row[118]) || 0;
    for (let i = 0; i < numTeamMembers; i++) {
      const startIndex = 119 + i * 11;
      allRelevantIndices.push(...Array.from({ length: 11 }, (_, j) => startIndex + j));
    }

    const answeredCount = getFilledCount(row, allRelevantIndices);
    const totalCount = allRelevantIndices.length;
    const completionPercent =
      totalCount === 0 ? 0 : Math.round((answeredCount / totalCount) * 100);
    const priorityRanking = row[105]
      ? row[105].split(",").map((s) => s.trim())
      : [];

      // Try to find an existing page
      const existing = existingPages.find((p) =>
        normName(p?.properties?.Name?.title?.[0]?.text?.content || "") === founderKey
      );

    let parentPage;

    if (existing) {
      console.log(`🔁 Updating existing page for ${startupName}`);
      parentPage = existing;

      // Update only dynamic properties
      await notionWithRetry.pages.update({
        page_id: parentPage.id,
        properties: {
          "Completion %": { number: completionPercent },
          Status:
            referralCount === 0
              ? undefined
              : {
                  select: {
                    name:
                      referralCount >= 5
                        ? "V+ Endorsements"
                        : [
                            "I Endorsement",
                            "II Endorsements",
                            "III Endorsements",
                            "IV Endorsements",
                          ][referralCount - 1],
                  },
                },
          "Last Updated": {
            date: { start: new Date().toISOString() },
          },
        },
      });

      // ⏳ Later: here is where you'd handle block-by-block edits
    } else {
      console.log(`🛠 Creating new page for ${startupName}`);
      parentPage = await notionWithRetry.pages.create({
        parent: {
          type: "database_id",
          database_id: process.env.NOTION_DATABASE_ID,
        },
        properties: {
          Name: {
            title: [{ text: { content: startupName || "Unnamed Startup" } }],
          },
          "Form Type": formType ? { select: { name: formType } } : undefined,
          "SF Referrals": sfReferralsLabel
            ? { select: { name: sfReferralsLabel } }
            : undefined,

          "Searcher Mail": row[38] ? { email: row[38] } : undefined,
          "Searcher Phone": row[39] ? { phone_number: row[39] } : undefined,
          "Searcher LinkedIn": row[40] ? { url: row[40] } : undefined,
          "Searcher Nickname": row[41]
            ? { rich_text: [{ text: { content: row[41] } }] }
            : undefined,
          "Searcher Location": row[43]
            ? { rich_text: [{ text: { content: row[43] } }] }
            : undefined,
          "Searcher Availability": mapAvailabilityOption(row[48])
          ? { select: { name: mapAvailabilityOption(row[48]) } }
          : undefined,
          "Start of Availability": row[47]
          ? { rich_text: [{ text: { content: String(row[47]) } }] }
          : undefined,
          "Searcher CV": row[44]
            ? {
                files: [
                  {
                    name: "CV",
                    external: { url: row[44] },
                  },
                ],
              }
            : undefined,

          Status:
            referralCount === 0
              ? undefined
              : {
                  select: {
                    name:
                      referralCount >= 5
                        ? "V+ Endorsements"
                        : [
                            "I Endorsement",
                            "II Endorsements",
                            "III Endorsements",
                            "IV Endorsements",
                          ][referralCount - 1],
                  },
                },

          "Founder Name": {
            rich_text: [
              {
                type: "text",
                text: { content: row[69] || "No founder name provided" },
              },
            ],
          },
          "Company Website": { url: row[73] || null },
          "Founder Email": { email: row[70] || null },
          "Founder LinkedIn": { url: row[72] || null },
          "Founder Phone Number": { phone_number: row[71] || null },
          Status:
            referralCount === 0
              ? undefined
              : {
                  select: {
                    name:
                      referralCount >= 5
                        ? "V+ Endorsements"
// ---- Notion property mapping for founders ----
                        : [
                            "I Endorsement",
                            "II Endorsements",
                            "III Endorsements",
                            "IV Endorsements",
                          ][referralCount - 1],
                  },
                },
          Founders: { number: founderCount },
          "Business Model": {
            multi_select: row[76]
              ? row[76].split(",").map((s) => ({ name: s.trim() }))
              : [],
          },
          "Where is the company based?": validLocations.includes(row[78])
            ? { select: { name: row[78] } }
            : undefined,

          "What is your current valuation?": validValuations.includes(row[102])
            ? { select: { name: row[102] } }
            : undefined,

          "What next stage is this round funding?": validFundingStages.includes(
            row[103],
          )
            ? { select: { name: row[103] } }
            : undefined,

          "1. Priority (18 months)": priorityRanking[0]
            ? { select: { name: priorityRanking[0] } }
            : undefined,

          "2. Priority (18 months)": priorityRanking[1]
            ? { select: { name: priorityRanking[1] } }
            : undefined,

          "3. Priority (18 months)": priorityRanking[2]
            ? { select: { name: priorityRanking[2] } }
            : undefined,

          "4. Priority (18 months)": priorityRanking[3]
            ? { select: { name: priorityRanking[3] } }
            : undefined,

          "5. Priority (18 months)": priorityRanking[4]
            ? { select: { name: priorityRanking[4] } }
            : undefined,

          "6. Priority (18 months)": priorityRanking[5]
            ? { select: { name: priorityRanking[5] } }
            : undefined,

          "Founded in": { number: Number(row[77]) || null },

          "Completion %": { number: completionPercent },
          "Form filled out:": founderForm_filled_out
            ? {
                date: { start: new Date(founderForm_filled_out).toISOString() },
              }
            : {},
          ...(founderDeck && {
            Deck: {
              files: [{ name: "Deck", external: { url: founderDeck } }],
            },
          }),
          "Last Updated": {
            date: { start: new Date().toISOString() },
          },
        }, // This curly brace closes the 'properties' object correctly
      });
      // Then create toggle sections below like normal
    }

    const sectionNames = [
      "Referral Insight",
      "Basics",
      "Financials",
      "Challenges & Priorities",
      "HR",
      "Exit",
      "Team-Insights",
    ];

    // Ensure FORM toggle is present and get its reference
    let formToggle = (
      await notionWithRetry.blocks.children.list({ block_id: parentPage.id })
    ).results.find(
      (b) =>
        b.type === "toggle" &&
        b.toggle?.rich_text?.[0]?.text?.content === "Form",
    );

    if (!formToggle) {
      const formBlock = {
        object: "block",
        type: "toggle",
        toggle: {
          rich_text: [
            {
              type: "text",
              text: { content: "Form" },
            },
          ],
          children: [
            {
              object: "block",
              type: "paragraph",
              paragraph: {
                rich_text: [
                  {
                    type: "text",
                    text: {
                      content:
                        "Responses from the founder form are grouped here.",
                    },
                  },
                ],
              },
            },
          ],
        },
      };

      const created = await notionWithRetry.blocks.children.append({
        block_id: parentPage.id,
        children: [formBlock],
      });

      formToggle = created.results[0];

      // ➕ Append a divider block right after the Form toggle
      await notionWithRetry.blocks.children.append({
        block_id: parentPage.id,
        children: [
          {
            object: "block",
            type: "divider",
            divider: {},
          },
        ],
      });

      if (formType === "Searcher Referral") {
        // 1) Create the parent toggle "REFERRAL INSIGHT" EMPTY
        const createdRI = await notionWithRetry.blocks.children.append({
          block_id: formToggle.id,
          children: [
            {
              object: "block",
              type: "toggle",
              toggle: {
                rich_text: [{ type: "text", text: { content: "REFERRAL INSIGHT" } }],
                // IMPORTANT: no children here
              },
            },
          ],
        });
        await sleep(120);
        const riToggleId = createdRI.results?.[0]?.id;

        // 2) Append the referral info TABLE as a separate call
        const tableBlock = createTableBlock([
          ["Referred Searcher Name", row[18] || ""],
          ["Referrer's Name",       row[19] || ""],
          ["Referrer's Email",      row[20] || ""],
          ["Referrer's LinkedIn",   row[21] || ""],
          ["Relationship",          row[22] || ""],
          ["Location",              row[23] || ""],
          ["Form filled out:",      row[2]  || ""],
        ]);
        await appendChildrenSafe(riToggleId, [tableBlock]);
        await sleep(120);

        // 3) Append each question group as its own section (flat, safe appends)
        await appendQuestionGroup(
          notionWithRetry, riToggleId, row,
          "BASICS", [25, 26, 27, 28]
        );
        await sleep(120);

        await appendQuestionGroup(
          notionWithRetry, riToggleId, row,
          "THE SEARCHER’S MIND: PROBLEM SOLVING, PRIORITIZATION & PRESSURE",
          [29, 30]
        );
        await sleep(120);

        await appendQuestionGroup(
          notionWithRetry, riToggleId, row,
          "AGI-PROOFING THE FUTURE: AI LEVERAGE IN ACTION",
          [31, 32, 33]
        );
        await sleep(120);

        await appendQuestionGroup(
          notionWithRetry, riToggleId, row,
          "THE MOONSTONE DNA: TRUST, CONFLICT, AND STRATEGIC LEADERSHIP",
          [34, 35, 36]
        );
      }

      // 1) Create empty "Team Inputs" toggle
      const teamToggleRes = await notionWithRetry.blocks.children.append({
        block_id: parentPage.id,
        children: [
          {
            object: "block",
            type: "toggle",
            toggle: { rich_text: [{ type: "text", text: { content: "Team Inputs" } }] },
          },
        ],
      });
      const teamId = teamToggleRes.results?.[0]?.id;

      // 2) Append paragraph + table
      await appendChildrenSafe(teamId, [
        { object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: "Responses from the Moonstone team are grouped here." } }] } },
        {
          object: "block",
          type: "table",
          table: {
            table_width: 2,
            has_column_header: false,
            has_row_header: false,
            children: ["round size", "valuation", "moonstone ticket", "other investors"].map((label) => ({
              object: "block",
              type: "table_row",
              table_row: {
                cells: [
                  [{ type: "text", text: { content: label } }],
                  [{ type: "text", text: { content: "" } }],
                ],
              },
            })),
          },
        },
      ]);

      // 3) Append "Assessment Notes" toggle, then quote
      const assessRes = await notionWithRetry.blocks.children.append({
        block_id: teamId,
        children: [
          { object: "block", type: "toggle", toggle: { rich_text: [{ type: "text", text: { content: "Assessment Notes" } }] } },
        ],
      });
      const assessId = assessRes.results?.[0]?.id;

      await appendChildrenSafe(assessId, [
        { object: "block", type: "quote", quote: { rich_text: [{ type: "text", text: { content: "" } }] } },
      ]);
    }

    // ⚠️ REFETCH children from the Form toggle
    const formChildren = await notionWithRetry.blocks.children.list({
      block_id: formToggle.id,
    });
    const toggles = formChildren.results;

      for (const title of sectionNames) {
        const alreadyExists = formChildren.results.some(
          (b) =>
            b.type === "toggle" &&
            b.toggle?.rich_text?.[0]?.text?.content === title.toUpperCase(),
        );

        if (!alreadyExists) {
          const newToggle = {
            object: "block",
            type: "toggle",
            toggle: {
              rich_text: [{ type: "text", text: { content: title.toUpperCase() } }],
            },
            children: [],
          };

          // ✅ Rename to avoid redeclaration & TDZ
          const toggleTitle =
            newToggle?.toggle?.rich_text?.[0]?.text?.content || "Untitled";

          const created = await notionWithRetry.blocks.children.append({
            block_id: formToggle.id,
            children: [
              {
                object: "block",
                type: "toggle",
                toggle: {
                  rich_text: [{ type: "text", text: { content: toggleTitle } }],
                },
              },
            ],
          });
          const newToggleId = created.results?.[0]?.id;

          await appendChildrenSafe(newToggleId, newToggle.toggle.children);
        }
      }

    // ✅ REFRESH the list of children *after* creating new toggles
    const updatedFormChildren = await notionWithRetry.blocks.children.list({
      block_id: formToggle.id,
    });

    const getToggle = (name) =>
      updatedFormChildren.results.find(
        (t) => t.toggle?.rich_text[0]?.text?.content === name.toUpperCase(),
      );

    // Fill REFERRAL INSIGHT
    // Fill REFERRAL INSIGHT  (two-phase append, no deep nesting in one call)
    const referralToggle = getToggle("Referral Insight");
    if (referralToggle && matchedReferrals.length > 0) {
      // 1) Keep only one "Referral N" per title, archive extras
      const existingReferrals = await notionWithRetry.blocks.children.list({
        block_id: referralToggle.id,
      });
      const seenTitles = new Set();
      for (const b of existingReferrals.results) {
        if (b.type === "toggle") {
          const t = b.toggle?.rich_text?.[0]?.text?.content || "";
          if (t.startsWith("Referral ")) {
            if (seenTitles.has(t)) {
              await notionWithRetry.blocks.update({ block_id: b.id, archived: true });
              await sleep(60);
            } else {
              seenTitles.add(t);
            }
          }
        }
      }

      // 2) Upsert each "Referral i" as an empty toggle, then append children
      for (let i = 0; i < matchedReferrals.length; i++) {
        const r = matchedReferrals[i];
        const referralTitle = `Referral ${i + 1}`;

        // 2a) find or create the Referral i toggle (no nested children in this call)
        let referralBlock = (
          await notionWithRetry.blocks.children.list({ block_id: referralToggle.id })
        ).results.find(
          (b) => b.type === "toggle" && b.toggle?.rich_text?.[0]?.text?.content === referralTitle
        );

        if (!referralBlock) {
          const created = await notionWithRetry.blocks.children.append({
            block_id: referralToggle.id,
            children: [
              {
                object: "block",
                type: "toggle",
                toggle: {
                  rich_text: [{ type: "text", text: { content: referralTitle } }],
                },
              },
            ],
          });
          await sleep(120);
          referralBlock = created.results?.[0];
        }

        // 2b) ensure a 2-col table exists/updated as the first child
        const tableData = [
          ["Form filled out:", r[2]],
          ["Name", r[4]],
          ["Email", r[5]],
          ["Phone Number", r[6]],
          ["LinkedIn", r[7]],
          ["Founder's Contact Info", r[8]],
          ["Startup Name", r[9]],
          ["Founder's Email", r[10]],
          ["Company Website", r[11]],
          ["# of startups you're a shareholder in", r[12]],
          ["Anonymous if we reach out?", r[17]],
        ];

        const childList = await notionWithRetry.blocks.children.list({ block_id: referralBlock.id });
        let tableBlock = childList.results.find((b) => b.type === "table");

        if (!tableBlock) {
          // append a fresh table
          // Build the table block
          const tableBlock = {
            object: "block",
            type: "table",
            table: {
              table_width: 2,
              has_column_header: false,
              has_row_header: false,
              children: tableData.map(([k, v]) => ({
                object: "block",
                type: "table_row",
                table_row: {
                  cells: [
                    [{ type: "text", text: { content: (k ?? "") } }],
                    [{ type: "text", text: { content: (v ?? "").toString() } }],
                  ],
                },
              })),
            },
          };

          // Append safely (filters out undefined, no-op on empty)
          await appendChildrenSafe(referralBlock.id, [tableBlock]);
          await sleep(120);
          
        } else {
          // update rows in place if labels match
          const rows = await notionWithRetry.blocks.children.list({ block_id: tableBlock.id });
          for (let j = 0; j < Math.min(rows.results.length, tableData.length); j++) {
            const rowBlock = rows.results[j];
            const [label, value] = tableData[j];
            const curLabel = rowBlock.table_row?.cells?.[0]?.[0]?.text?.content || "";
            const curValue = rowBlock.table_row?.cells?.[1]?.[0]?.text?.content || "";
            if (curLabel === label && curValue !== (value || "")) {
              await notionWithRetry.blocks.update({
                block_id: rowBlock.id,
                table_row: {
                  cells: [
                    [{ type: "text", text: { content: label } }],
                    [{ type: "text", text: { content: (value || "").toString() } }],
                  ],
                },
              });
              await sleep(60);
            }
          }
        }

        // 2c) append/update the four quote questions under this referral
        const quoteTitles = [
          "How do you know the founder? What is your relationship?",
          "Describe an episode where the founder demonstrated qualities such as independent thinking, clarity of thought and outstanding performance",
          "Think of the person in your first-degree network that is the most ambitious in terms of the above qualities",
          "Now, tell us where the founder outperforms this person.",
        ];
        const quoteAnswers = [13, 14, 15, 16].map((qIdx) => r[qIdx] || "");

        await updateMultipleQuotes(referralBlock.id, quoteTitles, quoteAnswers);
      }
    }

    // ✅ Replacement for BASICS toggle
    const basicsToggle = getToggle("Basics");
    if (basicsToggle) {
      const basicsChildren = await notionWithRetry.blocks.children.list({ block_id: basicsToggle.id });
      const titles = [
        "Why is it the best location?",
        "What is your vision of the market you operate in?",
        "What is the problem @About your startup is trying to solve and how?",
        "What do you think is impossible today that can be achievable in 10 years thanks to what you are building?",
        "What is @About your startup's Unique Selling Proposition?",
        "Who are @About your startup's competitors? What do you understand about your business that they don't?",
      ];
      const answers = [79, 80, 81, 82, 83, 84].map((i) => row[i]);

      const unique = new Set();
      for (const block of basicsChildren.results) {
        if (block.type === "toggle") {
          const label = block.toggle?.rich_text?.[0]?.text?.content;
          if (unique.has(label)) {
            await notionWithRetry.blocks.update({ block_id: block.id, archived: true }); await sleep(60);
          } else {
            unique.add(label);
          }
        }
      }

      await updateMultipleQuotes(basicsToggle.id, titles, answers);

      const patent = row[85]?.trim().toLowerCase() === "yes";
      const patentExists = basicsChildren.results?.some(
        (b) =>
          b.type === "to_do" &&
          b.to_do?.rich_text?.[0]?.text?.content === "Patent?",
      );
      if (!patentExists) {
        await notionWithRetry.blocks.children.append({
          block_id: basicsToggle.id,
          children: [
            {
              object: "block",
              type: "to_do",
              to_do: {
                rich_text: [{ type: "text", text: { content: "Patent?" } }],
                checked: patent,
              },
            },
          ],
        });
      }
      await updateToggleQuote(
        basicsToggle.id,
        "If yes, tell us more:",
        row[35],
      );
    }

    // ✅ Replacement for FINANCIALS toggle using Basics-style deduplication
    const financialsToggle = getToggle("Financials");
    if (financialsToggle) {
      const financialTitles = [
        "What is @About your startup's native SOM going to be in the next 18 months?",
        "What is @About your startup's Italian SOM going to be in the next 18 months?",
        "What is @About your Startup's international SOM going to be in 18 months?",
        "How much revenue has @About your startup generated in the last 12 months?",
        "How much revenue can @About your startup generate in the next 12 months?",
      ];
      const financialAnswers = [87, 88, 95, 96, 97].map((i) => row[i]);

      const existingFinancialChildren = await notionWithRetry.blocks.children.list({ block_id: financialsToggle.id });

      // Archive duplicates
      const seen = new Set();
      for (const block of existingFinancialChildren.results) {
        if (block.type === "toggle") {
          const label = block.toggle?.rich_text?.[0]?.text?.content;
          if (seen.has(label)) {
            await notionWithRetry.blocks.update({ block_id: block.id, archived: true }); await sleep(60);
          } else {
            seen.add(label);
          }
        }
      }

      // Update or insert all standard financial questions
      await updateMultipleQuotes(
        financialsToggle.id,
        financialTitles,
        financialAnswers,
      );

      // Revenue Table block (optional)
      const revenueToggle = existingFinancialChildren.results.find(
        (b) =>
          b.type === "toggle" &&
          b.toggle?.rich_text?.[0]?.text?.content.includes(
            "revenue has your startup generated in each",
          ),
      );

      if (!revenueToggle) {
        // 1) create the toggle EMPTY
        const createdRevToggle = await notionWithRetry.blocks.children.append({
          block_id: financialsToggle.id,
          children: [
            {
              object: "block",
              type: "toggle",
              toggle: {
                rich_text: [{
                  type: "text",
                  text: { content: "How much revenue has your startup generated in each of these months?" }
                }],
              },
            },
          ],
        });
        await sleep(120);
        const revToggleId = createdRevToggle.results?.[0]?.id;

        // 2) append the table as a separate child
        await appendChildrenSafe(revToggleId, [
          {
            object: "block",
            type: "table",
            table: {
              table_width: 2,
              has_column_header: false,
              has_row_header: false,
              children: [91, 92, 93, 94, 95, 96].map((i, idx) => ({
                object: "block",
                type: "table_row",
                table_row: {
                  cells: [
                    [{ type: "text", text: { content: `${6 - idx} month(s) ago` } }],
                    [{ type: "text", text: { content: row[i] || "" } }],
                  ],
                },
              })),
            },
          },
        ]);
        await sleep(120);
      }
    }

    // ✅ Replacement for CHALLENGES & PRIORITIES toggle using Basics-style deduplication
    const challengeToggle = getToggle("Challenges & Priorities");
    if (challengeToggle) {
      const challengeTitles = [
        "Which are the most valuable key metrics that will contribute to @About your startup's valuation growth?",
        "What role will the regulatory environment play?",
        "What is the hardest challenge you are facing right now?",
        "What has been the hardest challenge related to people's management?",
        "What is your funding need? Why are you looking for capital?",
      ];
      const challengeAnswers = [98, 99, 100, 101, 103].map((i) => row[i]); // ⚠️ Includes index 51 for funding need

      const challengeChildren = await notionWithRetry.blocks.children.list({
        block_id: challengeToggle.id,
      });

      // Archive duplicates
      const unique = new Set();
      for (const block of challengeChildren.results) {
        if (block.type === "toggle") {
          const label = block.toggle?.rich_text?.[0]?.text?.content;
          if (unique.has(label)) {
            await notionWithRetry.blocks.update({ block_id: block.id, archived: true }); await sleep(60);
          } else {
            unique.add(label);
          }
        }
      }

      // Insert or update toggles
      await updateMultipleQuotes(
        challengeToggle.id,
        challengeTitles,
        challengeAnswers,
      );
    }

    // ✅ Replacement for HR toggle using Basics-style deduplication
    const hrToggle = getToggle("HR");
    if (hrToggle) {
      const hrTitles = [
        "How many team members have worked on @About your startup full-time so far? How many are currently working on @About your startup full-time?",
        "How does (or will) @About your startup as an employer help talent thrive?",
        "Which two exceptional roles would you like to hire next?",
        "Profile 1 Linkedin Profile:",
        "Profile 2 Linkedin Profile:",
        "Why them, how much would you like to pay them and why would they accept or not accept?",
        "When do you believe that they'll actually join your team?",
      ];
      const hrAnswers = [106, 107, 108, 109, 110, 111, 112].map((i) => row[i]);

      const hrChildren = await notionWithRetry.blocks.children.list({
        block_id: hrToggle.id,
      });

      // Archive duplicates
      const unique = new Set();
      for (const block of hrChildren.results) {
        if (block.type === "toggle") {
          const label = block.toggle?.rich_text?.[0]?.text?.content;
          if (unique.has(label)) {
            await notionWithRetry.blocks.update({ block_id: block.id, archived: true }); await sleep(60);
          } else {
            unique.add(label);
          }
        }
      }

      // Insert or update toggles
      await updateMultipleQuotes(hrToggle.id, hrTitles, hrAnswers);
    }

    // ✅ Replacement for EXIT toggle using Basics-style deduplication
    const exitToggle = getToggle("Exit");
    if (exitToggle) {
      const exitTitles = [
        "Which comparable companies have successfully exited in the past 5 years?",
        "Who are strategic buyers you've identified for @About your startup, and what makes you think that they could be interested in acquiring your company?",
        "When a strategic buyer acquires @About your startup, what will primarily drive their decision?",
        "What is the timeline you envision for Moonstone's eventual exit from @About your startup?",
        "Give us more context — what year will it be, what milestones will you have reached, and what valuation will the market be willing to pay to acquire @About your Startup?",
      ];
      const exitAnswers = [113, 114, 115, 116, 117].map((i) => row[i]);

      const exitChildren = await notionWithRetry.blocks.children.list({
        block_id: exitToggle.id,
      });

      // Archive duplicate toggles
      const unique = new Set();
      for (const block of exitChildren.results) {
        if (block.type === "toggle") {
          const label = block.toggle?.rich_text?.[0]?.text?.content;
          if (unique.has(label)) {
            await notionWithRetry.blocks.update({ block_id: block.id, archived: true }); await sleep(60);
          } else {
            unique.add(label);
          }
        }
      }

      // Insert or update toggles
      await updateMultipleQuotes(exitToggle.id, exitTitles, exitAnswers);
    }

    // ✅ TEAM-INSIGHTS (deduplicated like Basics)
    const teamToggle = getToggle("Team-Insights");
    if (teamToggle) {
      const teamToggleId = teamToggle.id;
      const existingChildren = await notionWithRetry.blocks.children.list({
        block_id: teamToggle.id,
      });

      const tableIndices = [
        [133, 134, 135, 136, 137],
        [144, 145, 146, 147, 148],
        [155, 156, 157, 158, 159],
        [166, 167, 168, 169, 170],
      ];
      const qaIndices = [
        [138, 139, 140, 141, 142, 143],
        [149, 150, 151, 152, 153, 154],
        [160, 161, 162, 163, 164, 165],
        [171, 172, 173, 174, 175, 176],
      ];
      const qaTitles = [
        "Tell us what @Contact info would never say about themselves",
        "When did you first work with @Contact info?",
        "When did you meet @Contact info and why are they the right fit for their role in the company?",
        "What's the biggest polarity/divergence between you and  @Contact info - and how does it define your everyday work?",
        "Out of 10 times @Contact info commits to delivering something on time, they succeed at least:",
        "How well does @Contact info adapt to changes in role, context and field area?",
      ];

      for (let i = 0; i < founderCount; i++) {
        const title = `TEAM MEMBER ${i + 1}`;

        // Find existing TEAM MEMBER toggles under Team and archive duplicates
        const siblings = await notionWithRetry.blocks.children.list({ block_id: teamToggleId });
        const matching = siblings.results.filter(
          (b) => b.type === "toggle" && b.toggle?.rich_text?.[0]?.text?.content === title
        );

        let memberBlock = matching[0];
        for (let j = 1; j < matching.length; j++) {
          await notionWithRetry.blocks.update({ block_id: matching[j].id, archived: true });
          await sleep(60);
        }

        // Create the TEAM MEMBER toggle if missing
        if (!memberBlock) {
          const created = await notionWithRetry.blocks.children.append({
            block_id: teamToggleId,
            children: [
              {
                object: "block",
                type: "toggle",
                toggle: { rich_text: [{ type: "text", text: { content: title } }] },
              },
            ],
          });
          await sleep(120);
          memberBlock = created.results?.[0];
        }

        // De-dupe inner children inside this TEAM MEMBER
        const existingMemberChildren = await notionWithRetry.blocks.children.list({
          block_id: memberBlock.id,
        });
        const seen = new Set();
        for (const block of existingMemberChildren.results) {
          const label =
            block.toggle?.rich_text?.[0]?.text?.content ||
            block.table_row?.cells?.[0]?.[0]?.text?.content;
          if (label && seen.has(label)) {
            await notionWithRetry.blocks.update({ block_id: block.id, archived: true });
            await sleep(60);
          } else if (label) {
            seen.add(label);
          }
        }

        // === Build children INSIDE the loop ===
        const children = [];

        // Your existing question titles/indices logic
        const qTitles =
          i === 0
            ? [
                "Who introduced you to Moonstone?",
                "Tell us something extraordinary about yourself that you wouldn't normally say out loud?",
                "Please describe the breakdown of the equity ownership in percentages among you and any other shareholders?",
                "When I commit to delivering on time, I succeed at least X times out of 10:",
                "What is the biggest frustration that you face within @About your startup?",
                "Tell us one time you faced a challenge and took advantage of your network",
                "Have you ever paid a cost (even in time) to support someone in your network without expecting immediate returns?",
                "Do you have any commitments or obligations to people in your network that could influence strategic decisions?",
                "Who are the most influential people in your network, and what role have they played in @About your startup's success?",
                "Tell us about a mistake from the past two weeks",
                "What is something you did before turning 20 that is particularly meaningful to you?",
                "Which 3 voices or people do you closely follow and why?",
                "How many VC firms or family offices could you get dinner with in the next 10 days?",
                "What is something you are dreaming of achieving in the next 30 days?",
              ]
            : qaTitles;

        const qAnswers =
          i === 0
            ? Array.from({ length: 14 }, (_, j) => row[124 + j])
            : qaIndices[i - 1].map((idx) => row[idx] || "");

        // Quote toggles (create new, or update if text changed)
        const quoteBlocks = [];
        for (let j = 0; j < qTitles.length; j++) {
          const label = qTitles[j];
          const answer = qAnswers[j];

          const oldToggle = existingMemberChildren.results.find(
            (b) => b?.type === "toggle" && b.toggle?.rich_text?.[0]?.text?.content === label
          );

          if (oldToggle) {
            const oldKids = await notionWithRetry.blocks.children.list({ block_id: oldToggle.id });
            const first = oldKids?.results?.[0];
            const existingText = first?.[first?.type || "paragraph"]?.rich_text?.[0]?.text?.content || "";
            if (existingText.trim() !== (answer || "").trim()) {
              quoteBlocks.push(createQuoteToggle(label, answer));
            }
          } else {
            quoteBlocks.push(createQuoteToggle(label, answer));
          }
        }

        // Optional table (only for TEAM MEMBER 2+)
        if (i > 0) {
          const hasTable = existingMemberChildren.results.some((b) => b.type === "table");
          if (!hasTable) {
            const labels = ["Contact info", "Position", "Email", "Phone number", "LinkedIn"];
            const table = {
              object: "block",
              type: "table",
              table: {
                table_width: 2,
                has_column_header: false,
                has_row_header: false,
                children: tableIndices[i - 1].map((idx, k) =>
                  createTextTableRow(labels[k], row[idx])
                ),
              },
            };
            children.push(table);
          }
        }

        // Append quotes after (and in addition to) table
        children.push(...quoteBlocks);

        if (children.length > 0) {
          await notionWithRetry.blocks.children.append({
            block_id: memberBlock.id,
            children,
          });
          await sleep(120);
        }
      }
    }

    console.log(`\u2705 Page complete for ${startupName}`);
    // Cleanup referralMap so they won't appear again
      delete referralMap[matchedKey];

      const unmatchedPageTitle = `⚠️ Unmatched referral for startup: ${matchedDisplay}`;
      const previouslyUnmatched = existingPages.find(
        (p) => p.properties?.Name?.title?.[0]?.text?.content === unmatchedPageTitle
      );
      if (previouslyUnmatched) {
        console.log(
          `🗑 Deleting unmatched page now that ${startupName} has been matched`,
        );
        await notionWithRetry.pages.update({
          page_id: previouslyUnmatched.id,
          archived: true,
        });
      }
      } catch (err) {
      const startupName = (row?.[73] || "Unknown");
      console.error(
        `⚠️ Skipping founder '${startupName}' due to:`,
        err?.code || err?.message || err
      );
      }
  }

    // --- BEGIN: Create/Update UNMATCHED STARTUP referral pages ---
    for (const [key, bundle] of Object.entries(referralMap)) {
      const referralRows = bundle?.rows || [];
      if (referralRows.length === 0) continue;

      // human-friendly name we kept when building referralMap
      const displayName = bundle.display || referralRows[0]?.[9] || key;
      if (!referralRows || referralRows.length === 0) continue;

      const pageTitle = `⚠️ Unmatched referral for startup: ${displayName}`;
      console.log(`🧾 Creating/Updating unmatched startup referral page for: ${displayName}  (rows: ${referralRows.length})`);

      // Upsert page
      const existing = await notionWithRetry.databases.query({
        database_id: process.env.NOTION_DATABASE_ID,
        filter: { property: "Name", title: { equals: pageTitle } },
      });

      let page;
      if (existing.results.length > 0) {
        page = existing.results[0];
        await notionWithRetry.pages.update({
          page_id: page.id,
          properties: {
            Status: { select: { name: "⚠️ Unmatched Referral" } },
            "Last Updated": { date: { start: new Date().toISOString() } },
          },
        });
        console.log(`🔁 Updated unmatched startup page: ${displayName}`);
      } else {
        const firstTimestamp = referralRows[0]?.[2] || null;
        page = await notionWithRetry.pages.create({
          parent: { type: "database_id", database_id: process.env.NOTION_DATABASE_ID },
          properties: {
            Name: { title: [{ text: { content: pageTitle } }] },
            Status: { select: { name: "⚠️ Unmatched Referral" } },
            ...(firstTimestamp && !Number.isNaN(Date.parse(firstTimestamp))
              ? { "Form filled out:": { date: { start: new Date(firstTimestamp).toISOString() } } }
              : {}),
            "Last Updated": { date: { start: new Date().toISOString() } },
          },
        });
        console.log(`🔁 Updated unmatched startup page: ${displayName}`);
      }

      // Ensure single REFERRAL INSIGHT toggle
      await dedupeToggles(page.id, ["REFERRAL INSIGHT"]);
      let ri = (await notionWithRetry.blocks.children.list({ block_id: page.id }))
        .results.find((b) => b.type === "toggle" && b.toggle?.rich_text?.[0]?.text?.content === "REFERRAL INSIGHT");
      if (!ri) {
        const riRes = await notionWithRetry.blocks.children.append({
          block_id: page.id,
          children: [{ object: "block", type: "toggle", toggle: { rich_text: [{ type: "text", text: { content: "REFERRAL INSIGHT" } }] } }],
        });
        await sleep(60);
        ri = riRes.results?.[0];
      }
      const riId = ri.id;

      // Clear any old content under REFERRAL INSIGHT
      const kids = await notionWithRetry.blocks.children.list({ block_id: riId });
      for (const b of kids.results) {
        await notionWithRetry.blocks.update({ block_id: b.id, archived: true });
        await sleep(30);
      }

      // Add one toggle per referral row
      const referralToggles = referralRows.map((refRow, idx) => ({
        object: "block",
        type: "toggle",
        toggle: { rich_text: [{ type: "text", text: { content: `Referral ${idx + 1}` } }] },
      }));
      await notionWithRetry.blocks.children.append({ block_id: riId, children: referralToggles });
      await sleep(80);

      // For each referral toggle: append an info table (adjust columns if your founder-referral sheet differs)
      const latest = await notionWithRetry.blocks.children.list({ block_id: riId });
      for (let i = 0; i < referralRows.length; i++) {
        const refRow = referralRows[i];
        const title = `Referral ${i + 1}`;
        const refBlock = latest.results.find(
          (b) => b.type === "toggle" && b.toggle?.rich_text?.[0]?.text?.content === title
        );
        if (!refBlock) continue;

        await appendChildrenSafe(refBlock.id, [
          createTableBlock([
            ["Startup",          refRow?.[9] || ""],  // founder referral’s startup (col 9)
            ["Referrer Name",    refRow?.[4] || ""],
            ["Referrer Email",   refRow?.[5] || ""],
            ["Form filled out:", refRow?.[2] || ""],
          ]),
        ]);
        await sleep(80);

        // If you have founder-referral Q&A columns, you can add appendQuestionGroup(...) here similarly.
      }

      console.log(`✅ Unmatched startup page complete: ${displayName}`);
    }
    // --- END: Unmatched STARTUP referral pages ---
    console.log("🎉 All founder pages created successfully.");

    await processUnmatchedSearcherReferrals(searchers, searcherReferrals);
    await handleSearcherPages(searchers, searcherReferrals, notionWithRetry);

// 🔧 Helper to group Q&A quote blocks by question columns
// ---- createQAgroup(row, indices) ----
function createQAgroup(row, columnIndices) {
  return columnIndices
    .filter((i) => row[i]?.trim())
    .map((i) => ({
      object: "block",
      type: "toggle",
      toggle: {
        rich_text: [
          {
            type: "text",
            text: {
              content: allQuestions[i] || `Question ${i}`,
            },
          },
        ],
        children: [
          {
            object: "block",
            type: "quote",
            quote: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: row[i].trim(),
                  },
                },
              ],
            },
          },
        ],
      },
    }));
}

// 🧩 Wrap children in a toggle with a title
// ---- getToggle(title, children) ----
function getToggle(title, children) {
  return {
    object: "block",
    type: "toggle",
    toggle: {
      rich_text: [{ type: "text", text: { content: title } }],
      // never let undefined or holes through:
      children: Array.isArray(children) ? children.filter(Boolean) : [],
    },
  };
}

// ✅ Creates an empty table block (step 1 of 2)
// ---- createEmptyTableBlock() ----
function createEmptyTableBlock() {
  return {
    object: "block",
    type: "table",
    table: {
      table_width: 2,
      has_column_header: true,
      has_row_header: false,
    },
  };
}

// Build an array of paragraph blocks from [label, value] pairs
function createReferralInsightBlocks(entries) {
  return entries.map(([label, value]) => ({
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [
        {
          type: "text",
          text: {
            content: `${label}: ${value || "No response"}`,
          },
        },
      ],
    },
  }));
}

// ---- addSearcherBlocks(pageId, row, searcherReferrals) ----
async function addSearcherBlocks(pageId, row, searcherReferrals) {
  const existingBlocks = await notionWithRetry.blocks.children.list({
    block_id: pageId,
  });
  const formToggle = existingBlocks.results.find(
    (b) =>
      b.type === "toggle" && b.toggle?.rich_text?.[0]?.text?.content === "Form",
  );

  let formToggleId;

  if (formToggle) {
    formToggleId = formToggle.id;
  } else {
    const created = await notionWithRetry.blocks.children.append({
      block_id: pageId,
      children: [
        {
          object: "block",
          type: "toggle",
          toggle: {
            rich_text: [{ type: "text", text: { content: "Form" } }],
            children: [],
          },
        },
      ],
    });
    formToggleId = created.results?.[0]?.id;
  }

  if (Array.isArray(searcherReferrals) && searcherReferrals.length > 0) {
  // Step 2.1 — Add the toggle block "REFERRAL INSIGHT"
  const referralInsightToggleRes = await notionWithRetry.blocks.children.append({
    block_id: formToggleId,
    children: [
      {
        object: "block",
        type: "toggle",
        toggle: {
          rich_text: [
            {
              type: "text",
              text: { content: "REFERRAL INSIGHT" },
            },
          ],
        },
      },
    ],
  });
  const referralInsightToggleId = referralInsightToggleRes.results[0].id;

  // Step 2.2 — Append an empty table block
  const tableBlockRes = await notionWithRetry.blocks.children.append({
    block_id: referralInsightToggleId,
    children: [
      {
        object: "block",
        type: "table",
        table: {
          table_width: 2,
          has_column_header: true,
          has_row_header: false,
          children: generateTableRows([
            ["Referred Searcher Name", row[18]],
            ["Referrer's Name", row[19]],
            ["Referrer's Email", row[20]],
            ["Referrer's LinkedIn", row[21]],
            ["Relationship", row[22]],
            ["Location", row[23]],
            ["Form filled out:", row[2] || ""],
          ]),
        },
      },
    ],
  });
  const tableBlockId = tableBlockRes.results[0].id;
  }

  // Append the Searcher FORM Q&A (correct indices)
  await appendQuestionGroup(
    notionWithRetry, formToggleId, row,
    "BASICS",
    [45, 46, 47, 48]
  );

  await appendQuestionGroup(
    notionWithRetry, formToggleId, row,
    "YOUR MIND: PROBLEM SOLVING, PRIORITIZATION & PRESSURE",
    [49, 50, 51, 52]
  );

  await appendQuestionGroup(
    notionWithRetry, formToggleId, row,
    "AI LEVERAGE IN ACTION: PREPARING FOR THE AGI ECONOMY",
    [53, 54, 55, 56, 57]
  );

  await appendQuestionGroup(
    notionWithRetry, formToggleId, row,
    "THE MOONSTONE DNA: TRUST, CONFLICT, STRATEGIC LEADERSHIP, NETWORK",
    [58, 59, 60, 61, 62, 63, 64, 65]
  );

  await sleep(120);

  // then call a small helper that builds Team Inputs in two phases (from Patch #1)
  await addTeamInputs(parentPage.id);

  async function addTeamInputs(parentId) {
    // 1) De-dupe and/or create the "Team Inputs" toggle at the page root (parentId)
    const topKids = await notionWithRetry.blocks.children.list({ block_id: parentId });
    const teamToggles = topKids.results.filter(
      (b) => b.type === "toggle" && b.toggle?.rich_text?.[0]?.text?.content === "Team Inputs"
    );

    let teamId = teamToggles[0]?.id || null;
    for (let i = 1; i < teamToggles.length; i++) {
      await notionWithRetry.blocks.update({ block_id: teamToggles[i].id, archived: true });
      await sleep(60);
    }

    if (!teamId) {
      const res = await notionWithRetry.blocks.children.append({
        block_id: parentId,
        children: [
          {
            object: "block",
            type: "toggle",
            toggle: { rich_text: [{ type: "text", text: { content: "Team Inputs" } }] },
          },
        ],
      });
      await sleep(120);
      teamId = res.results?.[0]?.id;
    }

    // 2) Ensure the paragraph + a small 2-col table exist exactly once
    const teamKids = await notionWithRetry.blocks.children.list({ block_id: teamId });
    const hasParagraph = teamKids.results.some((b) => b.type === "paragraph");
    const hasTable = teamKids.results.some((b) => b.type === "table");

    if (!hasParagraph) {
      await appendChildrenSafe(teamId, [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              { type: "text", text: { content: "Responses from the Moonstone team are grouped here." } },
            ],
          },
        },
      ]);
      await sleep(80);
    }

    if (!hasTable) {
      const tableRows = ["round size", "valuation", "moonstone ticket", "other investors"].map((label) => ({
        object: "block",
        type: "table_row",
        table_row: {
          cells: [
            [{ type: "text", text: { content: label } }],
            [{ type: "text", text: { content: "" } }],
          ],
        },
      }));

      await appendChildrenSafe(teamId, [
        {
          object: "block",
          type: "table",
          table: {
            table_width: 2,
            has_column_header: false,
            has_row_header: false,
            children: tableRows,
          },
        },
      ]);
      await sleep(80);
    }

    // 3) Ensure "Assessment Notes" toggle with an empty quote exists once
    const refreshed = await notionWithRetry.blocks.children.list({ block_id: teamId });
    let assess = refreshed.results.find(
      (b) => b.type === "toggle" && b.toggle?.rich_text?.[0]?.text?.content === "Assessment Notes"
    );

    if (!assess) {
      const a = await notionWithRetry.blocks.children.append({
        block_id: teamId,
        children: [
          { object: "block", type: "toggle", toggle: { rich_text: [{ type: "text", text: { content: "Assessment Notes" } }] } },
        ],
      });
      await sleep(120);
      assess = a.results?.[0];
    }

    const assessKids = await notionWithRetry.blocks.children.list({ block_id: assess.id });
    const hasQuote = assessKids.results.some((b) => b.type === "quote");
    if (!hasQuote) {
      await appendChildrenSafe(assess.id, [
        { object: "block", type: "quote", quote: { rich_text: [{ type: "text", text: { content: "" } }] } },
      ]);
    }
  }
}

// ---- addStructureBlocks(pageId, formType, row) ----
    async function addStructureBlocks(pageId, formType, row) {
      await notionWithRetry.blocks.children.append({
        block_id: pageId,
        children: [
          // Form
          {
            object: "block",
            type: "toggle",
            toggle: {
              rich_text: [{ type: "text", text: { content: "Form" } }],
              children: [
                {
                  object: "block",
                  type: "paragraph",
                  paragraph: {
                    rich_text: [
                      {
                        type: "text",
                        text: { content: "Responses from the founder form are grouped here." },
                      },
                    ],
                  },
                },
              ],
            },
          },
          // THE ONE divider we keep for this page
          { object: "block", type: "divider", divider: {} },

          // Team Inputs
          {
            object: "block",
            type: "toggle",
            toggle: {
              rich_text: [{ type: "text", text: { content: "Team Inputs" } }],
              children: [
                {
                  object: "block",
                  type: "paragraph",
                  paragraph: {
                    rich_text: [
                      {
                        type: "text",
                        text: { content: "Responses from the Moonstone team are grouped here." },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      });
    }
    }

// ---- addStructureBlocks(pageId) ----
// Creates the top-level structure ("Form" toggle, one divider, "Team Inputs" toggle)
// idempotently. It only adds what's missing, then dedupes and ensures exactly one divider.
async function addStructureBlocks(pageId) {
  const kids = await notionWithRetry.blocks.children.list({ block_id: pageId });
  const results = kids.results || [];

  const hasForm = results.some(
    b => b.type === "toggle" && b.toggle?.rich_text?.[0]?.text?.content === "Form"
  );
  const hasTeam = results.some(
    b => b.type === "toggle" && b.toggle?.rich_text?.[0]?.text?.content === "Team Inputs"
  );
  const hasDivider = results.some(b => b.type === "divider");

  const children = [];

  if (!hasForm) {
    children.push({
      object: "block",
      type: "toggle",
      toggle: {
        rich_text: [{ type: "text", text: { content: "Form" } }],
        children: [
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                { type: "text", text: { content: "Responses from the founder form are grouped here." } },
              ],
            },
          },
        ],
      },
    });
  }

  if (!hasDivider) {
    children.push({ object: "block", type: "divider", divider: {} });
  }

  if (!hasTeam) {
    children.push({
      object: "block",
      type: "toggle",
      toggle: {
        rich_text: [{ type: "text", text: { content: "Team Inputs" } }],
        children: [
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                { type: "text", text: { content: "Responses from the Moonstone team are grouped here." } },
              ],
            },
          },
        ],
      },
    });
  }

  if (children.length) {
    await notionWithRetry.blocks.children.append({
      block_id: pageId,
      children,
    });
    await sleep(80);
  }

  // keep exactly one divider and one of each toggle
  await dedupeToggles(pageId, ["Form", "Team Inputs", "Team"]);
}

  
// ---- handleSearcherPages(searchers, searcherReferrals, notion) ----
async function handleSearcherPages(searchers, searcherReferrals, notion) {
  const normalize = (str) => str?.trim().toLowerCase();

  for (const row of searchers) {
    const searcherName = normalize(row[37]);

    const matchedReferrals = searcherReferrals.filter(
      (r) => normalize(r[22]) === searcherName,
    );
    const searcherRefCount = matchedReferrals.length;

    const formType = "Searcher";
    const sfReferralsLabel =
      searcherRefCount >= 5
        ? "V+ Referrals"
        : ["I Referral", "II Referrals", "III Referrals", "IV Referrals"][
            searcherRefCount - 1
          ] || undefined;

    // 1) Create the Searcher page
    const searcherTitle = (row[37] || "").trim();
    if (!searcherTitle) {
      console.warn("⏭️ Skipping Searcher with empty Name (col 37).");
      continue;
    }

    // Try to find an existing page with the same Name
    const existing = await notionWithRetry.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      filter: {
        property: "Name",
        title: { equals: searcherTitle },
      },
    });

    let parentPage;
    if (existing.results.length > 0) {
      // Update existing
      parentPage = existing.results[0];
      await notionWithRetry.pages.update({
        page_id: parentPage.id,
        properties: {
          "Form Type": { select: { name: formType } },
          "Intern v Searcher": formType === "Searcher" && coerceInternSearcher(row[42])
          ? { select: { name: coerceInternSearcher(row[42]) } }
          : undefined,
          "SF Referrals": sfReferralsLabel
            ? { select: { name: sfReferralsLabel } }
            : undefined,
          "Searcher Mail": row[38] ? { email: row[38] } : undefined,
          "Searcher Phone": row[39] ? { phone_number: row[39] } : undefined,
          "Searcher LinkedIn": row[40] ? { url: row[40] } : undefined,
          "Searcher Nickname": row[41]
            ? { rich_text: [{ text: { content: row[41] } }] }
            : undefined,
          "Searcher Location": row[43]
            ? { rich_text: [{ text: { content: row[43] } }] }
            : undefined,
          "Searcher CV": row[44]
            ? {
                files: [{ name: "CV", external: { url: row[44] } }],
              }
            : undefined,
          "Searcher Availability": mapAvailabilityOption(row[48])
          ? { select: { name: mapAvailabilityOption(row[48]) } }
          : undefined,
          "Start of Availability": row[47]
          ? { rich_text: [{ text: { content: String(row[47]) } }] }
          : undefined,
          "Form filled out:": row[2]
            ? { date: { start: new Date(row[2]).toISOString() } }
            : undefined,
          "Last Updated": { date: { start: new Date().toISOString() } },
        },
      });
    } else {
      // Create new
      parentPage = await notionWithRetry.pages.create({
        parent: {
          type: "database_id",
          database_id: process.env.NOTION_DATABASE_ID,
        },
        properties: {
          Name: { title: [{ text: { content: searcherTitle } }] },
          "Form Type": { select: { name: formType } },
          "Intern v Searcher": formType === "Searcher" && coerceInternSearcher(row[42])
          ? { select: { name: coerceInternSearcher(row[42]) } }
          : undefined,
          "SF Referrals": sfReferralsLabel
            ? { select: { name: sfReferralsLabel } }
            : undefined,
          "Searcher Mail": row[38] ? { email: row[38] } : undefined,
          "Searcher Phone": row[39] ? { phone_number: row[39] } : undefined,
          "Searcher LinkedIn": row[40] ? { url: row[40] } : undefined,
          "Searcher Nickname": row[41]
            ? { rich_text: [{ text: { content: row[41] } }] }
            : undefined,
          "Searcher Location": row[43]
            ? { rich_text: [{ text: { content: row[43] } }] }
            : undefined,
          "Searcher CV": row[44]
            ? {
                files: [{ name: "CV", external: { url: row[44] } }],
              }
            : undefined,
          "Searcher Availability": mapAvailabilityOption(row[48])
          ? { select: { name: mapAvailabilityOption(row[48]) } }
          : undefined,
          "Start of Availability": row[47]
          ? { rich_text: [{ text: { content: String(row[47]) } }] }
          : undefined,
          "Form filled out:": row[2]
            ? { date: { start: new Date(row[2]).toISOString() } }
            : undefined,
          "Last Updated": { date: { start: new Date().toISOString() } },
        },
      });
    }

    // 🔽 Add this block to archive a stale unmatched page
    const unmatchedTitle = `⚠️ Unmatched referral for searcher: ${searcherTitle}`;
    const oldUnmatched = await notionWithRetry.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      filter: { property: "Name", title: { equals: unmatchedTitle } },
    });
    if (oldUnmatched.results.length > 0) {
      await notionWithRetry.pages.update({
        page_id: oldUnmatched.results[0].id,
        archived: true,
      });
    }

    // 🧹 Purge any existing top-level "Form" / "Team Inputs" toggles to avoid duplicates
    const topKids = await notionWithRetry.blocks.children.list({ block_id: parentPage.id });
    for (const b of topKids.results) {
      if (b.type === "toggle") {
        const title = b.toggle?.rich_text?.[0]?.text?.content || "";
        if (title === "Form" || title === "Team Inputs") {
          await notionWithRetry.blocks.update({ block_id: b.id, archived: true });
          await sleep(60);
        }
      }
    }

    // 2) Ensure base structure exists (adds "Form" + "Team Inputs")
    await addStructureBlocks(parentPage.id);

    // 3) Locate the "Form" toggle we just created
    const pageBlocks = await notionWithRetry.blocks.children.list({
      block_id: parentPage.id,
    });
    const formToggle = pageBlocks.results.find(
      (b) =>
        b.type === "toggle" &&
        b.toggle?.rich_text?.[0]?.text?.content === "Form",
    );
    const formToggleId = formToggle?.id;

    // NEW: always append the Searcher FORM Q&A under "Form" (even if there are no referrals)
    if (formToggleId) {
      // 44–45 BASICS
      await appendQuestionGroup(
        notionWithRetry, formToggleId, row,
        "BASICS", [45, 46]
      );

      // 47–50 YOUR MIND
      await appendQuestionGroup(
        notionWithRetry, formToggleId, row,
        "YOUR MIND: PROBLEM SOLVING, PRIORITIZATION & PRESSURE",
        [47, 48, 49, 50]
      );

      // 51–55 AI LEVERAGE
      await appendQuestionGroup(
        notionWithRetry, formToggleId, row,
        "AI LEVERAGE IN ACTION: PREPARING FOR THE AGI ECONOMY",
        [51, 52, 53, 54, 55]
      );

      // 56–63 MOONSTONE DNA
      await appendQuestionGroup(
        notionWithRetry, formToggleId, row,
        "THE MOONSTONE DNA: TRUST, CONFLICT, STRATEGIC LEADERSHIP, NETWORK",
        [56, 57, 58, 59, 60, 61, 62, 63]
      );
    }

    // 4) Append REFERRAL INSIGHT safely (no deep-nesting in one payload)
    if (formToggleId && matchedReferrals.length > 0) {
      // A) Create an empty "REFERRAL INSIGHT" toggle
      const riRes = await notionWithRetry.blocks.children.append({
        block_id: formToggleId,
        children: [
          {
            object: "block",
            type: "toggle",
            toggle: {
              rich_text: [{ type: "text", text: { content: "REFERRAL INSIGHT" } }],
            },
          },
        ],
      });
      await sleep(120);
      const riId = riRes.results?.[0]?.id;
      if (!riId) {
        console.warn("⚠️ Could not create REFERRAL INSIGHT");
      } else {
        // B) Create empty "Referral n" toggles (no children yet)
        const referralToggles = matchedReferrals.map((_, i) => ({
          object: "block",
          type: "toggle",
          toggle: {
            rich_text: [{ type: "text", text: { content: `Referral ${i + 1}` } }],
          },
        }));
        await appendChildrenSafe(riId, referralToggles);
        await sleep(120);

        // C) For each referral toggle: append TABLE first, then Q&A (separate calls)
        const riChildren = await notionWithRetry.blocks.children.list({ block_id: riId });

        for (let i = 0; i < matchedReferrals.length; i++) {
          const refRow = matchedReferrals[i];
          const referralTitle = `Referral ${i + 1}`;
          const referralBlock = riChildren.results.find(
            (b) => b.type === "toggle" && b.toggle?.rich_text?.[0]?.text?.content === referralTitle
          );
          if (!referralBlock) continue;

          // C1) Table (separate append)
          await appendChildrenSafe(referralBlock.id, [
            createTableBlock([
              ["Searcher Name",        refRow?.[22] || ""],
              ["Searcher Email",       refRow?.[23] || ""],
              ["Searcher LinkedIn",    refRow?.[24] || ""],
              ["Referrer Name",        refRow?.[18] || ""],
              ["Referrer Email",       refRow?.[19] || ""],
              ["Referrer Phone",       refRow?.[20] || ""],
              ["Referrer LinkedIn",    refRow?.[21] || ""],
              ["Form filled out:",     refRow?.[2]  || ""],
            ]),
          ]);
          await sleep(120);

          // C2) Q&A sections (separate append)
          const qaChildren = [
            ...createQAgroup(refRow, [25, 26, 27, 28]),
            ...createQAgroup(refRow, [29, 30]),
            ...createQAgroup(refRow, [31, 32, 33]),
            ...createQAgroup(refRow, [34, 35, 36]),
          ];
          await appendChildrenSafe(referralBlock.id, qaChildren);
          await sleep(120);
        }
      }
    }

    // Make sure we only have one divider on the page and no duplicate toggles
    await dedupeToggles(parentPage.id, ["Form", "Team Inputs", "Team"]);

    console.log(
      `✅ Created Searcher page for ${row[37]} with ${searcherRefCount} referrals`,
    );
  }
}

  /* ===================== Script Entrypoint ===================== */
  // ===================== SECTION: Script Entrypoint =====================
  main()
    .catch((err) => {
      console.error("❌ Script failed:", err);
      process.exit(1);
    });
