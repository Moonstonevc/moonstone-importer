import { Client } from "@notionhq/client";
import { google } from "googleapis";
import { auth } from "google-auth-library";
import { distance } from "fastest-levenshtein";

const normalizeName = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, "")
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

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const google_client = auth.fromJSON(json_data);
google_client.scopes = [
  "https://www.googleapis.com/auth/spreadsheets.readonly",
];
const sheets = google.sheets({ version: "v4", auth: google_client });

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

  const existingChildren = await notion.blocks.children.list({
    block_id: parentBlockId,
  });
  const toggle = existingChildren.results.find(
    (b) =>
      b.type === "toggle" && b.toggle?.rich_text?.[0]?.text?.content === title,
  );

  if (toggle) {
    const toggleChildren = await notion.blocks.children.list({
      block_id: toggle.id,
    });
    const quoteBlock = toggleChildren.results.find((b) => b.type === "quote");
    if (hasBlockChanged(quoteBlock, newText)) {
      await notion.blocks.update({
        block_id: quoteBlock.id,
        quote: {
          rich_text: [{ type: "text", text: { content: newText } }],
        },
      });
    }
  } else {
    // Add new toggle if it didn't exist
    const block = createQuoteToggle(title, newText);
    await notion.blocks.children.append({
      block_id: parentBlockId,
      children: [block],
    });
  }
};

// ✅ Moved outside of updateToggleQuote:
const updateMultipleQuotes = async (parentBlockId, titles, answers) => {
  for (let i = 0; i < titles.length; i++) {
    await updateToggleQuote(parentBlockId, titles[i], answers[i]);
  }
};

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

export async function main() {
  console.log("\ud83d\ude80 Script started");
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "A2:ABY",
  });
  const rows = response.data.values;
  // Fetch all existing pages from Notion
  const existingPages = [];
  let cursor = undefined;

  do {
    const resp = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      start_cursor: cursor,
    });
    existingPages.push(...resp.results);
    cursor = resp.has_more ? resp.next_cursor : undefined;
  } while (cursor);
  console.log("\ud83d\udcc4 Sheet data loaded. Rows:", rows.length);

  const founders = [],
    referrals = [];
  for (const row of rows) {
    const signal = row[3]?.trim().toLowerCase() || "";
    if (signal.includes("i am a founder")) founders.push(row);
    else if (signal.includes("i know an incredible founder"))
      referrals.push(row);
  }

  const referralMap = {};
  for (const row of referrals) {
    const name = row[9]?.trim().toLowerCase();
    if (name) {
      if (!referralMap[name]) referralMap[name] = [];
      referralMap[name].push(row);
    }
  }

  // ❗️REMOVE referrals for startups that exist in founder rows
  const matchedStartupNamesRaw = founders
    .map((row) => row[22]?.trim())
    .filter(Boolean);

  const matchedStartupNamesSet = new Set(
    matchedStartupNamesRaw.map((name) => normalizeName(name)),
  );

  const getBestMatch = (targetName, candidates) => {
    const normalizedTarget = normalizeName(targetName);
    let bestMatch = null;
    let bestScore = Infinity;

    for (const candidate of candidates) {
      const candidateNorm = normalizeName(candidate);
      const score = distance(normalizedTarget, candidateNorm);
      if (score < bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    return bestScore <= 2 ? bestMatch : null; // ← You can tune this threshold
  };

  // Identify unmatched referrals
  const unmatchedReferrals = Object.entries(referralMap).filter(
    ([name]) => !getBestMatch(name, matchedStartupNamesRaw),
  );

  // Get existing unmatched pages
  const unmatchedPages = existingPages.filter((p) =>
    p.properties?.Name?.title?.[0]?.text?.content?.startsWith(
      "⚠️ Unmatched referral for startup:",
    ),
  );

  for (const [startupName, referralRows] of unmatchedReferrals) {
    const pageTitle = `⚠️ Unmatched referral for startup: ${startupName}`;

    // Try to find if a page already exists for this unmatched startup
    let existingUnmatched = unmatchedPages.find(
      (p) => p.properties?.Name?.title?.[0]?.text?.content === pageTitle,
    );

    if (!existingUnmatched) {
      // Create a new unmatched referral page
      console.log(
        `🆕 Creating unmatched referral page for startup: ${startupName}`,
      );
      const firstTimestamp = referralRows[0]?.[2] || null;
      console.log("🕒 Unmatched referral timestamp:", firstTimestamp);

      existingUnmatched = await notion.pages.create({
        parent: {
          type: "database_id",
          database_id: process.env.NOTION_DATABASE_ID,
        },
        properties: {
          Name: { title: [{ text: { content: pageTitle } }] },
          Status: { select: { name: "⚠️ Unmatched Referral" } },
          ...(firstTimestamp && !isNaN(Date.parse(firstTimestamp))
            ? {
                "Form filled out:": {
                  date: { start: new Date(firstTimestamp).toISOString() },
                },
              }
            : {}),
          "Last Updated": { date: { start: new Date().toISOString() } },
        },
      });

      // Remove startups from unmatchedReferrals if they will be matched in the founders loop
      const matchedStartupNames = founders
        .map((row) => row[22]?.trim().toLowerCase())
        .filter((name) => name); // remove undefined/null

      // Create the toggle block (Referral Insight)
      await notion.blocks.children.append({
        block_id: existingUnmatched.id,
        children: [
          {
            object: "block",
            type: "toggle",
            toggle: {
              rich_text: [
                {
                  type: "text",
                  text: { content: "REFERRAL INSIGHT" },
                  annotations: { bold: true },
                },
              ],
              children: [],
            },
          },
        ],
      });
    }

    // Get the toggle ID
    const children = await notion.blocks.children.list({
      block_id: existingUnmatched.id,
    });
    const referralToggle = children.results.find((t) => t.type === "toggle");

    // Add each referral as sub-toggles with full detail
    if (referralToggle) {
      const existingReferrals = await notion.blocks.children.list({
        block_id: referralToggle.id,
      });

      for (let i = 0; i < referralRows.length; i++) {
        const r = referralRows[i];
        const referralTitle = `Referral ${i + 1}`;
        const alreadyExists = existingReferrals.results.some(
          (b) =>
            b.type === "toggle" &&
            b.toggle?.rich_text?.[0]?.text?.content === referralTitle,
        );

        if (!alreadyExists) {
          const referralBlock = {
            object: "block",
            type: "toggle",
            toggle: {
              rich_text: [{ type: "text", text: { content: referralTitle } }],
              children: [
                {
                  object: "block",
                  type: "table",
                  table: {
                    table_width: 2,
                    has_column_header: false,
                    has_row_header: false,
                    children: [
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
                    ].map(([k, v]) => ({
                      object: "block",
                      type: "table_row",
                      table_row: {
                        cells: [
                          [{ type: "text", text: { content: k } }],
                          [{ type: "text", text: { content: v || "" } }],
                        ],
                      },
                    })),
                  },
                },
                ...[13, 14, 15, 16].map((qIdx, idx) =>
                  createQuoteToggle(
                    [
                      "How do you know the founder? What is your relationship?",
                      "Describe an episode where the founder demonstrated qualities such as independent thinking, clarity of thought and outstanding performance",
                      "Think of the person in your first-degree network that is the most ambitious in terms of the above qualities",
                      "Now, tell us where the founder outperforms this person.",
                    ][idx],
                    r[qIdx],
                  ),
                ),
              ],
            },
          };

          await notion.blocks.children.append({
            block_id: referralToggle.id,
            children: [referralBlock],
          });
        }
      }
    }
  }

  for (const row of founders) {
    const startupName = row[22]?.trim();
    const normalizedName = startupName?.toLowerCase() || "";
    const matchedKey =
      getBestMatch(normalizedName, Object.keys(referralMap)) || "";
    const referralCount = referralMap[matchedKey]?.length || 0;
    const matchedReferrals = referralMap[matchedKey] || [];
    const founderForm_filled_out = row[2] || null;
    const founderDeck = row[24]?.trim() || null;
    const founderCount = Number(row[67]) || 1;

    console.log(
      `\ud83d\udee0 Creating Notion card for ${startupName} with ${referralCount} referrals`,
    );

    const getFilledCount = (row, indices) =>
      indices.reduce((count, i) => count + (row[i]?.trim() ? 1 : 0), 0);

    // Create list of indices for founder (18–78)
    const founderIndices = Array.from({ length: 64 }, (_, i) => i + 18);

    // Create lists of indices for team members
    const teamIndices = [
      Array.from({ length: 11 }, (_, i) => 82 + i),
      Array.from({ length: 11 }, (_, i) => 93 + i),
      Array.from({ length: 11 }, (_, i) => 104 + i),
      Array.from({ length: 11 }, (_, i) => 115 + i),
    ];

    // Merge relevant rows depending on founderCount
    const applicableTeamIndices = teamIndices.slice(0, founderCount - 1).flat();
    const allRelevantIndices = founderIndices.concat(applicableTeamIndices);

    // Count answered
    const answeredCount = getFilledCount(row, allRelevantIndices);
    const totalCount = allRelevantIndices.length;
    const completionPercent = Math.round((answeredCount / totalCount) * 100);
    const priorityRanking = row[54]
    ? row[54].split(",").map((s) => s.trim())
    : [];

    // Try to find an existing page
    const existing = existingPages.find(
      (p) =>
        p.properties?.Name?.title?.[0]?.text?.content?.toLowerCase() ===
        normalizedName,
    );

    let parentPage;

    if (existing) {
      console.log(`🔁 Updating existing page for ${startupName}`);
      parentPage = existing;

      // Update only dynamic properties
      await notion.pages.update({
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
      parentPage = await notion.pages.create({
        parent: {
          type: "database_id",
          database_id: process.env.NOTION_DATABASE_ID,
        },
        properties: {
          Name: {
            title: [{ text: { content: startupName || "Unnamed Startup" } }],
          },
          "Founder Name": {
            rich_text: [
              {
                type: "text",
                text: { content: row[18] || "No founder name provided" },
              },
            ],
          },
          "Company Website": { url: row[23] || null },
          "Founder Email": { email: row[19] || null },
          "Founder LinkedIn": { url: row[21] || null },
          "Founder Phone Number": { phone_number: row[20] || null },
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
          Founders: { number: founderCount },
          "Business Model": {
            multi_select: row[25]
              ? row[25].split(",").map((s) => ({ name: s.trim() }))
              : [],
          },
          "Where is the company based?": validLocations.includes(row[27])
            ? { select: { name: row[27] } }
            : undefined,

          "What is your current valuation?": validValuations.includes(row[51])
            ? { select: { name: row[51] } }
            : undefined,

          "What next stage is this round funding?": validFundingStages.includes(
            row[52],
          )
            ? { select: { name: row[52] } }
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

          // --- 👇 FIXES START HERE 👇 ---

          "Founded in": { number: Number(row[26]) || null },
          // Added a comma here 👇
          "Completion %": { number: completionPercent },
          "Form filled out:": founderForm_filled_out
            ? { date: { start: new Date(founderForm_filled_out).toISOString() } }
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
      await notion.blocks.children.list({ block_id: parentPage.id })
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
              annotations: { bold: true },
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

      const created = await notion.blocks.children.append({
        block_id: parentPage.id,
        children: [formBlock],
      });

      formToggle = created.results[0];

      // ➕ Append a divider block right after the Form toggle
      await notion.blocks.children.append({
        block_id: parentPage.id,
        children: [
          {
            object: "block",
            type: "divider",
            divider: {},
          },
        ],
      });

      await notion.blocks.children.append({
        block_id: parentPage.id,
        children: [
          {
            object: "block",
            type: "toggle",
            toggle: {
              rich_text: [
                {
                  type: "text",
                  text: { content: "Team Inputs" },
                  annotations: { bold: true },
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
                            "Responses from the Moonstone team are grouped here.",
                        },
                      },
                    ],
                  },
                },
                {
                  object: "block",
                  type: "table",
                  table: {
                    table_width: 2,
                    has_column_header: false,
                    has_row_header: false,
                    children: [
                      "round size",
                      "valuation",
                      "moonstone ticket",
                      "other investors",
                    ].map((label) => ({
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
                {
                  object: "block",
                  type: "toggle",
                  toggle: {
                    rich_text: [
                      {
                        type: "text",
                        text: { content: "Assessment Notes" },
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
                              text: { content: "" },
                            },
                          ],
                        },
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

    // ⚠️ REFETCH children from the Form toggle
    const formChildren = await notion.blocks.children.list({
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
            rich_text: [
              {
                type: "text",
                text: { content: title.toUpperCase() },
                annotations: { bold: true },
              },
            ],
            children: [],
          },
        };
        await notion.blocks.children.append({
          block_id: formToggle.id,
          children: [newToggle],
        });
      }
    }

    // ✅ REFRESH the list of children *after* creating new toggles
    const updatedFormChildren = await notion.blocks.children.list({
      block_id: formToggle.id,
    });

    const getToggle = (name) =>
      updatedFormChildren.results.find(
        (t) => t.toggle?.rich_text[0]?.text?.content === name.toUpperCase(),
      );

    // Fill REFERRAL INSIGHT
    const referralToggle = getToggle("Referral Insight");
    if (referralToggle && referralMap[matchedKey]) {
      const existingReferrals = await notion.blocks.children.list({
        block_id: referralToggle.id,
      });

      // Clean up old toggles with duplicate titles (e.g., "Referral 1", etc.)
      const titlesToDelete = new Set();
      for (const block of existingReferrals.results) {
        if (block.type === "toggle") {
          const content = block.toggle?.rich_text?.[0]?.text?.content || "";
          if (content.startsWith("Referral")) {
            if (titlesToDelete.has(content)) {
              await notion.blocks.update({
                block_id: block.id,
                archived: true,
              });
            } else {
              titlesToDelete.add(content);
            }
          }
        }
      }

      for (let i = 0; i < referralMap[matchedKey].length; i++) {
        const referralTitle = `Referral ${i + 1}`;
        const r = referralMap[matchedKey][i];
        const existingReferrals = await notion.blocks.children.list({
          block_id: referralToggle.id,
        });

        let referralBlock = existingReferrals.results.find(
          (b) =>
            b.type === "toggle" &&
            b.toggle?.rich_text?.[0]?.text?.content === referralTitle,
        );

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

        const quoteTitles = [
          "How do you know the founder? What is your relationship?",
          "Describe an episode where the founder demonstrated qualities such as independent thinking, clarity of thought and outstanding performance",
          "Think of the person in your first-degree network that is the most ambitious in terms of the above qualities",
          "Now, tell us where the founder outperforms this person.",
        ];

        const quoteAnswers = [13, 14, 15, 16].map((qIdx) => r[qIdx]);

        if (!referralBlock) {
          // Create the whole block if missing
          referralBlock = {
            object: "block",
            type: "toggle",
            toggle: {
              rich_text: [{ type: "text", text: { content: referralTitle } }],
              children: [
                {
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
                          [{ type: "text", text: { content: k } }],
                          [{ type: "text", text: { content: v || "" } }],
                        ],
                      },
                    })),
                  },
                },
                ...quoteTitles.map((q, idx) =>
                  createQuoteToggle(q, quoteAnswers[idx]),
                ),
              ],
            },
          };
          await notion.blocks.children.append({
            block_id: referralToggle.id,
            children: [referralBlock],
          });
        } else {
          // Update table rows and quotes
          const referralChildren = await notion.blocks.children.list({
            block_id: referralBlock.id,
          });
          const table = referralChildren.results.find(
            (b) => b.type === "table",
          );

          if (table) {
            const tableRows = await notion.blocks.children.list({
              block_id: table.id,
            });
            for (let j = 0; j < tableRows.results.length; j++) {
              const rowBlock = tableRows.results[j];
              const [expectedLabel, expectedValue] = tableData[j];
              const currentLabel =
                rowBlock.table_row?.cells?.[0]?.[0]?.text?.content || "";
              const currentValue =
                rowBlock.table_row?.cells?.[1]?.[0]?.text?.content || "";

              if (
                currentLabel === expectedLabel &&
                currentValue !== expectedValue
              ) {
                await notion.blocks.update({
                  block_id: rowBlock.id,
                  table_row: {
                    cells: [
                      [{ type: "text", text: { content: expectedLabel } }],
                      [
                        {
                          type: "text",
                          text: { content: expectedValue || "" },
                        },
                      ],
                    ],
                  },
                });
              }
            }
          }

          // Update quote toggles
          await updateMultipleQuotes(
            referralBlock.id,
            quoteTitles,
            quoteAnswers,
          );
        }
      }
    }

    // ✅ Replacement for BASICS toggle
    const basicsToggle = getToggle("Basics");
    if (basicsToggle) {
      const basicsChildren = await notion.blocks.children.list({
        block_id: basicsToggle.id,
      });
      const titles = [
        "Why is it the best location?",
        "What is your vision of the market you operate in?",
        "What is the problem @About your startup is trying to solve and how?",
        "What do you think is impossible today that can be achievable in 10 years thanks to what you are building?",
        "What is @About your startup's Unique Selling Proposition?",
        "Who are @About your startup's competitors? What do you understand about your business that they don't?",
      ];
      const answers = [28, 29, 30, 31, 32, 33].map((i) => row[i]);

      const unique = new Set();
      for (const block of basicsChildren.results) {
        if (block.type === "toggle") {
          const label = block.toggle?.rich_text?.[0]?.text?.content;
          if (unique.has(label)) {
            await notion.blocks.update({ block_id: block.id, archived: true });
          } else {
            unique.add(label);
          }
        }
      }

      await updateMultipleQuotes(basicsToggle.id, titles, answers);

      const patent = row[34]?.trim().toLowerCase() === "yes";
      const patentExists = basicsChildren.results?.some(
        (b) =>
          b.type === "to_do" &&
          b.to_do?.rich_text?.[0]?.text?.content === "Patent?",
      );
      if (!patentExists) {
        await notion.blocks.children.append({
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
      const financialAnswers = [36, 36, 37, 38, 46].map((i) => row[i]);

      const existingFinancialChildren = await notion.blocks.children.list({
        block_id: financialsToggle.id,
      });

      // Archive duplicates
      const seen = new Set();
      for (const block of existingFinancialChildren.results) {
        if (block.type === "toggle") {
          const label = block.toggle?.rich_text?.[0]?.text?.content;
          if (seen.has(label)) {
            await notion.blocks.update({ block_id: block.id, archived: true });
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
        const tableBlock = {
          object: "block",
          type: "toggle",
          toggle: {
            rich_text: [
              {
                type: "text",
                text: {
                  content:
                    "How much revenue has your startup generated in each of these months?",
                },
              },
            ],
            children: [
              {
                object: "block",
                type: "table",
                table: {
                  table_width: 2,
                  has_column_header: false,
                  has_row_header: false,
                  children: [40, 41, 42, 43, 44, 45].map((i, idx) => ({
                    object: "block",
                    type: "table_row",
                    table_row: {
                      cells: [
                        [
                          {
                            type: "text",
                            text: { content: `${6 - idx} month(s) ago` },
                          },
                        ],
                        [{ type: "text", text: { content: row[i] || "" } }],
                      ],
                    },
                  })),
                },
              },
            ],
          },
        };

        await notion.blocks.children.append({
          block_id: financialsToggle.id,
          children: [tableBlock],
        });
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
      const challengeAnswers = [47, 48, 49, 50, 53].map((i) => row[i]); // ⚠️ Includes index 50 for funding need

      const challengeChildren = await notion.blocks.children.list({
        block_id: challengeToggle.id,
      });

      // Archive duplicates
      const unique = new Set();
      for (const block of challengeChildren.results) {
        if (block.type === "toggle") {
          const label = block.toggle?.rich_text?.[0]?.text?.content;
          if (unique.has(label)) {
            await notion.blocks.update({ block_id: block.id, archived: true });
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
      const hrAnswers = [55, 56, 57, 58, 59, 60, 61].map((i) => row[i]);

      const hrChildren = await notion.blocks.children.list({
        block_id: hrToggle.id,
      });

      // Archive duplicates
      const unique = new Set();
      for (const block of hrChildren.results) {
        if (block.type === "toggle") {
          const label = block.toggle?.rich_text?.[0]?.text?.content;
          if (unique.has(label)) {
            await notion.blocks.update({ block_id: block.id, archived: true });
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
      const exitAnswers = [62, 63, 64, 65, 66].map((i) => row[i]);

      const exitChildren = await notion.blocks.children.list({
        block_id: exitToggle.id,
      });

      // Archive duplicate toggles
      const unique = new Set();
      for (const block of exitChildren.results) {
        if (block.type === "toggle") {
          const label = block.toggle?.rich_text?.[0]?.text?.content;
          if (unique.has(label)) {
            await notion.blocks.update({ block_id: block.id, archived: true });
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
      const existingChildren = await notion.blocks.children.list({
        block_id: teamToggle.id,
      });

      const tableIndices = [
        [82, 83, 84, 85, 86],
        [93, 94, 95, 96, 97],
        [104, 105, 106, 107, 108],
        [115, 116, 117, 118, 119],
      ];
      const qaIndices = [
        [87, 88, 89, 90, 91, 92],
        [98, 99, 100, 101, 102, 103],
        [109, 110, 111, 112, 113, 114],
        [120, 121, 122, 123, 124, 125],
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

        // Archive duplicate top-level TEAM MEMBER blocks
        const matchingBlocks = existingChildren.results.filter(
          (b) =>
            b.type === "toggle" &&
            b.toggle?.rich_text?.[0]?.text?.content === title,
        );
        const memberBlock = matchingBlocks[0];
        for (let j = 1; j < matchingBlocks.length; j++) {
          await notion.blocks.update({
            block_id: matchingBlocks[j].id,
            archived: true,
          });
        }

        const existingMemberChildren = memberBlock
          ? await notion.blocks.children.list({ block_id: memberBlock.id })
          : { results: [] };

        // Archive duplicate inner blocks
        const seen = new Set();
        for (const block of existingMemberChildren.results) {
          const label =
            block.toggle?.rich_text?.[0]?.text?.content ||
            block.table_row?.cells?.[0]?.[0]?.text?.content;
          if (label && seen.has(label)) {
            await notion.blocks.update({ block_id: block.id, archived: true });
          } else if (label) {
            seen.add(label);
          }
        }

        const children = [];

        // Quotes
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
            ? Array.from({ length: 14 }, (_, j) => row[73 + j])
            : qaIndices[i - 1].map((idx) => row[idx] || "");

        const quoteBlocks = [];
        for (let j = 0; j < qTitles.length; j++) {
          const label = qTitles[j];
          const answer = qAnswers[j];

          const oldBlock = existingMemberChildren.results.find(
            (b) =>
              b?.type === "toggle" &&
              b.toggle?.rich_text?.[0]?.text?.content === label,
          );

          if (oldBlock) {
            const oldChildren = await notion.blocks.children.list({
              block_id: oldBlock.id,
            });
            const existingText =
              oldChildren?.results?.[0]?.[oldChildren.results[0].type]
                ?.rich_text?.[0]?.text?.content || "";
            if (existingText.trim() !== (answer || "").trim()) {
              quoteBlocks.push(createQuoteToggle(label, answer));
            }
          } else {
            quoteBlocks.push(createQuoteToggle(label, answer));
          }
        }

        // Optional table (NOT for TEAM MEMBER 1)
        if (i > 0) {
          const tableExists = existingMemberChildren.results.some(
            (b) => b.type === "table",
          );
          if (!tableExists) {
            const table = {
              object: "block",
              type: "table",
              table: {
                table_width: 2,
                has_column_header: false,
                has_row_header: false,
                children: tableIndices[i - 1].map((idx, k) => {
                  const label = [
                    "Contact info",
                    "Position",
                    "Email",
                    "Phone number",
                    "LinkedIn",
                  ][k];
                  return createTextTableRow(label, row[idx]);
                }),
              },
            };
            children.push(table);
          }
        }

        // Always add quotes (after table)
        children.push(...quoteBlocks);

        // Append or create the TEAM MEMBER toggle
        if (children.length > 0) {
          if (memberBlock) {
            await notion.blocks.children.append({
              block_id: memberBlock.id,
              children,
            });
          } else {
            await notion.blocks.children.append({
              block_id: teamToggle.id,
              children: [
                {
                  object: "block",
                  type: "toggle",
                  toggle: {
                    rich_text: [{ type: "text", text: { content: title } }],
                    children,
                  },
                },
              ],
            });
          }
        }
      }
    }

    console.log(`\u2705 Page complete for ${startupName}`);
    // Cleanup referralMap so they won't appear again
    delete referralMap[matchedKey];
    // Delete unmatched referral page if now matched
    const unmatchedPageTitle = `⚠️ Unmatched referral for startup: ${matchedKey}`;
    const previouslyUnmatched = existingPages.find(
      (p) =>
        p.properties?.Name?.title?.[0]?.text?.content === unmatchedPageTitle,
    );
    if (previouslyUnmatched) {
      console.log(
        `🗑 Deleting unmatched page now that ${startupName} has been matched`,
      );
      await notion.pages.update({
        page_id: previouslyUnmatched.id,
        archived: true,
      });
    }
  }

  console.log("\ud83c\udf89 All founder pages created successfully.");
}

main().catch((e) => {
  console.error("❌ Script failed:", e);
});
