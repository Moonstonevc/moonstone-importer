// ===================== SECTION: Imports =====================
import { Client } from "@notionhq/client";
import { google } from "googleapis";
import { auth } from "google-auth-library";
import { distance } from "fastest-levenshtein";

// ===================== SECTION: Environment & Client Initialization =====================
console.log("🌍 Environment check:", {
  NOTION_API_KEY:           !!process.env.NOTION_API_KEY,
  NOTION_DATABASE_ID:       !!process.env.NOTION_DATABASE_ID,
  GAPI_SERVICE_ACCOUNT_KEY: !!process.env.GAPI_SERVICE_ACCOUNT_KEY,
  GOOGLE_SHEET_ID_INCOMING: !!process.env.GOOGLE_SHEET_ID_INCOMING,
  GOOGLE_SHEET_ID_REFS:     !!process.env.GOOGLE_SHEET_ID_REFS,
});

let json_data;
try {
  json_data = JSON.parse(process.env.GAPI_SERVICE_ACCOUNT_KEY);
  console.log("✅ Parsed Google service account key");
} catch (err) {
  console.error("❌ Invalid Google service account key:", err.message);
  process.exit(1);
}

const notion = new Client({ auth: process.env.NOTION_API_KEY, timeoutMs: 120000 });

const google_client = auth.fromJSON(json_data);
google_client.scopes = ["https://www.googleapis.com/auth/spreadsheets.readonly"];
const sheets = google.sheets({ version: "v4", auth: google_client });

// ===================== SECTION: Retry + Sleep Helpers =====================
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
        [429, 408, 500, 502, 503, 504, "rate_limited", "service_unavailable",
         "notionhq_client_request_timeout"].includes(code) ||
        ["timed out","timeout","socket hang up","fetch failed","terminated"].some(s => msg.includes(s));
      if (transient) {
        const wait = Math.min(30000, baseDelay * Math.pow(2, i));
        console.warn(`⏳ Retry ${i+1}/${tries} (${code}): waiting ${wait}ms…`);
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
};

const n = {
  blocks: {
    children: {
      append: (a) => withRetry(() => notion.blocks.children.append(a)),
      list:   (a) => withRetry(() => notion.blocks.children.list(a)),
    },
    update: (a) => withRetry(() => notion.blocks.update(a)),
  },
  pages: {
    create: (a) => withRetry(() => notion.pages.create(a)),
    update: (a) => withRetry(() => notion.pages.update(a)),
  },
  databases: {
    query: (a) => withRetry(() => notion.databases.query(a)),
  },
};

// ===================== SECTION: Name Normalisation =====================
const DIGIT_MAP = {
  "⁰":"0","¹":"1","²":"2","³":"3","⁴":"4","⁵":"5","⁶":"6","⁷":"7","⁸":"8","⁹":"9",
  "₀":"0","₁":"1","₂":"2","₃":"3","₄":"4","₅":"5","₆":"6","₇":"7","₈":"8","₉":"9",
};

function normName(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉]/g, ch => DIGIT_MAP[ch] || "")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normUrl(s) {
  return (s || "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "")
    .trim();
}

function fuzzyMatch(a, b, threshold = 2) {
  if (!a || !b) return false;
  const na = normName(a), nb = normName(b);
  if (na.length < 5 || nb.length < 5) return na === nb;
  return distance(na, nb) <= threshold;
}

function getBestMatch(targetKey, candidates, threshold = 2) {
  if (targetKey.length < 5) return null;
  let best = null, bestScore = Infinity;
  for (const c of candidates) {
    const score = distance(targetKey, c);
    if (score < bestScore) { bestScore = score; best = c; }
  }
  return bestScore <= threshold ? best : null;
}

// ===================== SECTION: Reference Matching =====================
// 2-of-3 signal system:
//   1. Startup name fuzzy match  (col 7 vs page title)
//   2. Founder email exact match (col 8 vs Founder Email property)
//   3. Company website match     (col 9 vs Company Website property)
function findReferenceMatch(refRow, existingPages) {
  const refName    = (refRow[7] || "").trim();
  const refEmail   = (refRow[8] || "").trim().toLowerCase();
  const refWebsite = normUrl(refRow[9] || "");

  let bestPage  = null;
  let bestScore = 0;

  for (const page of existingPages) {
    const pageTitle   = page?.properties?.Name?.title?.[0]?.text?.content || "";
    const pageEmail   = (page?.properties?.["Founder Email"]?.email || "").toLowerCase();
    const pageWebsite = normUrl(page?.properties?.["Company Website"]?.url || "");

    let signals = 0;
    if (refName    && fuzzyMatch(refName, pageTitle))                         signals++;
    if (refEmail   && pageEmail   && refEmail === pageEmail)                  signals++;
    if (refWebsite && pageWebsite && normUrl(refWebsite) === pageWebsite)     signals++;

    if (signals >= 2 && signals > bestScore) {
      bestScore = signals;
      bestPage  = page;
    }
  }

  return bestPage;
}

// ===================== SECTION: Column Routing =====================
const ENTITY_PROP_MAP = {
  "moonstone vc (cleantech, healthtech, deeptech)": "Moonstone Status",
  "urban venture vc (media-driven growth)":         "Urban Venture Status",
  "human augmentation & sovereignty (hsf)":         "HSF",
  "moonstone searchfund":                           "Moonstone Searchfund",
};

const FORM_TOGGLE_INDICES = [13,14,15,16,17,18,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39];

const QUESTION_LABELS = {
  13: "Why now?",
  14: "Tell us about your defensibility.",
  15: "Which pillar of the HSF thesis does your startup address?",
  16: "What evidential basis supports your core intervention?",
  17: "How central is media spend to your growth strategy? What would you do with more media firepower?",
  18: "Which sector, geography, size range and business model are you targeting?",
  20: "What is the target EBITDA range?",
  21: "What is your target EV range?",
  22: "Tell us about your deal sourcing approach.",
  23: "Tell us about your relevant M&A and operational experience.",
  24: "What is your current ARR?",
  25: "What earlier investment did you receive, if any?",
  26: "Which funds or angels have you had in-depth conversations with?",
  27: "How is your upcoming round structured?",
  28: "What is your pre-money valuation?",
  29: "What is your post-money valuation?",
  30: "What is your valuation cap?",
  31: "What is your discount rate?",
  32: "What is your floor?",
  33: "What is your interest rate?",
  34: "What is your use of funds?",
  35: "Why are you the right person for this?",
  36: "What is your organisation's full-time headcount?",
  37: "What is your organisation's team composition?",
  38: "Did someone suggest you apply to Moonstone? How did you find us?",
  39: "Anything else?",
};

const REF_LABELS = {
  2:  "Submitted at",
  3:  "Referrer name",
  4:  "Referrer email",
  5:  "How do you know us?",
  6:  "Notes about the reference",
  7:  "Startup's name",
  8:  "Founder's email",
  9:  "Company link",
  10: "Relevant sectors",
  11: "Stay anonymous?",
};

// ===================== SECTION: Block Helpers =====================
function quoteToggle(title, content) {
  return {
    object: "block", type: "toggle",
    toggle: {
      rich_text: [{ type: "text", text: { content: title } }],
      children: content?.trim()
        ? [{ object: "block", type: "quote",
             quote: { rich_text: [{ type: "text", text: { content: content.trim() } }] } }]
        : [],
    },
  };
}

function tableBlock(pairs) {
  return {
    object: "block", type: "table",
    table: {
      table_width: 2, has_column_header: false, has_row_header: false,
      children: pairs.map(([k, v]) => ({
        object: "block", type: "table_row",
        table_row: { cells: [
          [{ type: "text", text: { content: String(k ?? "") } }],
          [{ type: "text", text: { content: String(v ?? "") } }],
        ]},
      })),
    },
  };
}

async function appendSafe(block_id, children) {
  const clean = (children || []).filter(Boolean);
  if (!clean.length) return;
  return await n.blocks.children.append({ block_id, children: clean });
}

async function dedupeToggles(parentId, titles) {
  if (!parentId || !titles?.length) return;
  const kids = await n.blocks.children.list({ block_id: parentId });
  for (const title of titles) {
    const matches = kids.results.filter(
      b => b.type === "toggle" && b.toggle?.rich_text?.[0]?.text?.content === title
    );
    for (let i = 1; i < matches.length; i++) {
      await n.blocks.update({ block_id: matches[i].id, archived: true });
      await sleep(60);
    }
  }
}

async function ensureToggle(parentId, title) {
  const kids = await n.blocks.children.list({ block_id: parentId });
  const existing = kids.results.find(
    b => b.type === "toggle" && b.toggle?.rich_text?.[0]?.text?.content === title
  );
  if (existing) return existing.id;
  const res = await n.blocks.children.append({
    block_id: parentId,
    children: [{ object: "block", type: "toggle",
      toggle: { rich_text: [{ type: "text", text: { content: title } }] } }],
  });
  await sleep(80);
  return res.results[0].id;
}

// ===================== SECTION: Fetch All Existing Notion Pages =====================
async function fetchAllPages() {
  const pages = [];
  let cursor;
  do {
    const resp = await n.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      start_cursor: cursor,
    });
    pages.push(...resp.results);
    cursor = resp.has_more ? resp.next_cursor : undefined;
  } while (cursor);
  return pages;
}

function buildSubmissionIdSet(existingPages) {
  const ids = new Set();
  for (const page of existingPages) {
    const sid = page?.properties?.["Submission ID"]?.rich_text?.[0]?.text?.content;
    if (sid) ids.add(sid);
  }
  return ids;
}

// ===================== SECTION: Process Incoming Form Row =====================
async function processIncomingRow(row, existingPages, processedIds) {
  const submissionId = (row[0] || "").trim();

  if (submissionId && processedIds.has(submissionId)) {
    console.log(`⏭️  Skipping already-imported submission: ${submissionId}`);
    return;
  }

  const entity = (row[3] || "").trim().toLowerCase();
  const statusProp = ENTITY_PROP_MAP[entity];
  if (!statusProp) {
    console.warn(`⚠️  Unknown entity value: "${row[3]}" — skipping row`);
    return;
  }

  const pageTitle = (row[7] || "").trim();
  if (!pageTitle) {
    console.warn("⚠️  Empty org name (col 7) — skipping row");
    return;
  }

  const titleKey   = normName(pageTitle);
  const candidates = existingPages.map(p => normName(p?.properties?.Name?.title?.[0]?.text?.content || ""));
  const matchedKey = getBestMatch(titleKey, candidates);
  const existing   = matchedKey
    ? existingPages.find(p => normName(p?.properties?.Name?.title?.[0]?.text?.content || "") === matchedKey)
    : null;

  const props = {
    [statusProp]:   { select: { name: "Form Inbound" } },
    "Last Updated": { date: { start: new Date().toISOString() } },
  };

  if (submissionId) props["Submission ID"]      = { rich_text: [{ text: { content: submissionId } }] };
  if (row[2])  props["Form filled out:"]        = { date: { start: new Date(row[2]).toISOString() } };
  if (row[4])  props["Founder Name"]            = { rich_text: [{ text: { content: row[4] } }] };
  if (row[5])  props["Founder Email"]           = { email: row[5] };
  if (row[6])  props["Founder LinkedIn"]        = { url: row[6] };
  if (row[8])  props["Company Website"]         = { url: row[8] };
  if (row[9])  props["Country, City"]           = { select: { name: row[9].trim() } };
  if (row[10]) props["Current raise in kEUR"]   = { number: parseFloat(row[10]) || null };
  if (row[11]) props["Value Proposition"]       = { rich_text: [{ text: { content: row[11] } }] };
  if (row[12]) props["Sector"] = {
    multi_select: row[12].split(",").map(s => ({ name: s.trim() })).filter(s => s.name),
  };
  if (row[19]) props["SF Status"] = { select: { name: row[19].trim() } };

  let parentPage;

  if (existing) {
    console.log(`🔁 Updating existing page: ${pageTitle}`);
    parentPage = existing;
    await n.pages.update({ page_id: existing.id, properties: props });
  } else {
    console.log(`🛠  Creating new page: ${pageTitle}`);
    parentPage = await n.pages.create({
      parent: { type: "database_id", database_id: process.env.NOTION_DATABASE_ID },
      properties: {
        Name: { title: [{ text: { content: pageTitle } }] },
        ...props,
      },
    });
    existingPages.push({
      id: parentPage.id,
      properties: {
        Name:              { title: [{ text: { content: pageTitle } }] },
        "Submission ID":   { rich_text: [{ text: { content: submissionId } }] },
        "Founder Email":   { email: row[5] || null },
        "Company Website": { url: row[8] || null },
      },
    });
  }

  if (submissionId) processedIds.add(submissionId);

  await dedupeToggles(parentPage.id, ["Form"]);
  const formId = await ensureToggle(parentPage.id, "Form");

  const formKids = await n.blocks.children.list({ block_id: formId });
  const existingTitles = new Set(
    formKids.results
      .filter(b => b.type === "toggle")
      .map(b => b.toggle?.rich_text?.[0]?.text?.content || "")
  );

  const toAppend = [];
  for (const idx of FORM_TOGGLE_INDICES) {
    const answer = row[idx]?.trim?.();
    if (!answer) continue;
    const label = QUESTION_LABELS[idx] || `Question ${idx}`;
    if (existingTitles.has(label)) continue;
    toAppend.push(quoteToggle(label, answer));
  }

  if (toAppend.length) {
    for (let i = 0; i < toAppend.length; i += 50) {
      await appendSafe(formId, toAppend.slice(i, i + 50));
      await sleep(100);
    }
  }

  console.log(`✅ Done: ${pageTitle}`);
  return parentPage;
}

// ===================== SECTION: Process Reference Row =====================
async function processReferenceRow(refRow, existingPages, processedRefIds) {
  const submissionId = (refRow[0] || "").trim();

  if (submissionId && processedRefIds.has(submissionId)) {
    console.log(`⏭️  Skipping already-imported reference: ${submissionId}`);
    return;
  }

  const startupName    = (refRow[7] || "").trim();
  const refToggleTitle = submissionId ? `Referral · ${submissionId}` : `Referral · ${Date.now()}`;
  const matchedPage    = findReferenceMatch(refRow, existingPages);

  if (matchedPage) {
    const matchedTitle = matchedPage?.properties?.Name?.title?.[0]?.text?.content || "";
    console.log(`🔗 Matched reference "${startupName}" → "${matchedTitle}"`);

    await dedupeToggles(matchedPage.id, ["Referral Insight"]);
    const riId = await ensureToggle(matchedPage.id, "Referral Insight");

    const riKids = await n.blocks.children.list({ block_id: riId });
    const alreadyExists = riKids.results.some(
      b => b.type === "toggle" && b.toggle?.rich_text?.[0]?.text?.content === refToggleTitle
    );
    if (alreadyExists) {
      console.log(`⏭️  Reference toggle already exists for ${submissionId} — skipping`);
      if (submissionId) processedRefIds.add(submissionId);
      return;
    }

    const refRes = await n.blocks.children.append({
      block_id: riId,
      children: [{ object: "block", type: "toggle",
        toggle: { rich_text: [{ type: "text", text: { content: refToggleTitle } }] } }],
    });
    await sleep(120);
    const refId = refRes.results[0].id;

    const pairs = Object.entries(REF_LABELS).map(([idx, label]) => [label, refRow[idx] || ""]);
    await appendSafe(refId, [tableBlock(pairs)]);
    await sleep(100);

  } else {
    console.log(`⚠️  Unmatched reference: "${startupName}" — creating standalone page`);

    const pageTitle = `[REFERENCE] ${startupName || "Unknown Startup"}`;
    const existingUnmatched = existingPages.find(
      p => p?.properties?.Name?.title?.[0]?.text?.content === pageTitle
    );

    const refProps = {
      "Moonstone Status": { select: { name: "Form Referral" } },
      "Last Updated":     { date: { start: new Date().toISOString() } },
    };
    if (submissionId) refProps["Submission ID"]  = { rich_text: [{ text: { content: submissionId } }] };
    if (refRow[6])  refProps["Founder Name"]     = { rich_text: [{ text: { content: refRow[6] } }] };
    if (refRow[8])  refProps["Founder Email"]    = { email: refRow[8] };
    if (refRow[9])  refProps["Company Website"]  = { url: refRow[9] };
    if (refRow[10]) refProps["Sector"] = {
      multi_select: refRow[10].split(",").map(s => ({ name: s.trim() })).filter(s => s.name),
    };

    let page;
    if (existingUnmatched) {
      page = existingUnmatched;
      await n.pages.update({ page_id: page.id, properties: refProps });
    } else {
      page = await n.pages.create({
        parent: { type: "database_id", database_id: process.env.NOTION_DATABASE_ID },
        properties: {
          Name: { title: [{ text: { content: pageTitle } }] },
          ...refProps,
        },
      });
      existingPages.push({
        id: page.id,
        properties: {
          Name:              { title: [{ text: { content: pageTitle } }] },
          "Submission ID":   { rich_text: [{ text: { content: submissionId } }] },
          "Founder Email":   { email: refRow[8] || null },
          "Company Website": { url: refRow[9] || null },
        },
      });
    }

    await dedupeToggles(page.id, ["Referral Insight"]);
    const riId = await ensureToggle(page.id, "Referral Insight");

    const riKids = await n.blocks.children.list({ block_id: riId });
    const alreadyExists = riKids.results.some(
      b => b.type === "toggle" && b.toggle?.rich_text?.[0]?.text?.content === refToggleTitle
    );

    if (!alreadyExists) {
      const refRes = await n.blocks.children.append({
        block_id: riId,
        children: [{ object: "block", type: "toggle",
          toggle: { rich_text: [{ type: "text", text: { content: refToggleTitle } }] } }],
      });
      await sleep(120);
      const refId = refRes.results[0].id;

      const pairs = Object.entries(REF_LABELS).map(([idx, label]) => [label, refRow[idx] || ""]);
      await appendSafe(refId, [tableBlock(pairs)]);
      await sleep(100);
    }

    console.log(`✅ Unmatched reference page ready: ${pageTitle}`);
  }

  if (submissionId) processedRefIds.add(submissionId);
}

// ===================== SECTION: Fetch Sheet =====================
async function fetchSheet(spreadsheetId, range = "A2:AZ") {
  const resp = await withRetry(
    () => sheets.spreadsheets.values.get({ spreadsheetId, range }),
    { tries: 5, baseDelay: 500 }
  );
  return resp.data.values || [];
}

// ===================== SECTION: Main =====================
async function main() {
  console.log("🚀 Moonstone Importer started");

  const [incomingRows, refRows] = await Promise.all([
    fetchSheet(process.env.GOOGLE_SHEET_ID_INCOMING),
    fetchSheet(process.env.GOOGLE_SHEET_ID_REFS),
  ]);
  console.log(`📄 Incoming rows: ${incomingRows.length} | Reference rows: ${refRows.length}`);

  const existingPages = await fetchAllPages();
  console.log(`📚 Existing Notion pages loaded: ${existingPages.length}`);

  const processedIds    = buildSubmissionIdSet(existingPages);
  const processedRefIds = new Set(processedIds);
  console.log(`🔑 Known submission IDs: ${processedIds.size}`);

  for (const row of incomingRows) {
    try {
      await processIncomingRow(row, existingPages, processedIds);
    } catch (err) {
      console.error(`⚠️  Error processing incoming row (org: "${row[7]}"): `, err?.message || err);
    }
  }

  for (const row of refRows) {
    try {
      await processReferenceRow(row, existingPages, processedRefIds);
    } catch (err) {
      console.error(`⚠️  Error processing reference row (startup: "${row[7]}"): `, err?.message || err);
    }
  }

  console.log("🎉 Import complete.");
}

main().catch(err => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
