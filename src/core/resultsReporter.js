/**
 * RESULTS REPORTER
 * 
 * This module handles the display and reporting of import results.
 * It provides comprehensive summaries and statistics about the import process.
 */

/**
 * Displays a comprehensive summary of the import results
 * 
 * @param {Object} results - Import results from the import process
 */
export function displayResults(results) {
    console.log("\n" + "=".repeat(50));
    console.log("📈 IMPORT RESULTS SUMMARY");
    console.log("=".repeat(50));

    // Display founder results
    displayFounderResults(results.founders);

    // Display searcher results
    displaySearcherResults(results.searchers);

    // Display overall statistics
    displayOverallStatistics(results);

    // Display final status message
    displayFinalStatus(results);

    console.log("\n" + "=".repeat(50));
}

/**
 * Displays results for founder processing
 * 
 * @param {Object} founderResults - Results from founder processing
 */
function displayFounderResults(founderResults) {
    console.log("🏢 FOUNDERS:");
    console.log(`  📊 Processed: ${founderResults.processed}`);
    console.log(`  🆕 Created: ${founderResults.created}`);
    console.log(`  🔄 Updated: ${founderResults.updated}`);
    console.log(`  ❌ Errors: ${founderResults.errors}`);
    console.log(`  🧩 Unmatched Referrals: ${founderResults.unmatchedReferrals || 0}`);
}

/**
 * Displays results for searcher processing
 * 
 * @param {Object} searcherResults - Results from searcher processing
 */
function displaySearcherResults(searcherResults) {
    console.log("\n🔍 SEARCHERS:");
    console.log(`  📊 Processed: ${searcherResults.processed}`);
    console.log(`  🆕 Created: ${searcherResults.created}`);
    console.log(`  🔄 Updated: ${searcherResults.updated}`);
    console.log(`  ❌ Errors: ${searcherResults.errors}`);
    console.log(`  🧩 Unmatched Referrals: ${searcherResults.unmatchedReferrals || 0}`);
}

/**
 * Displays overall statistics across all processing
 * 
 * @param {Object} results - Complete results object
 */
function displayOverallStatistics(results) {
    const totalProcessed = results.founders.processed + results.searchers.processed;
    const totalCreated = results.founders.created + results.searchers.created;
    const totalUpdated = results.founders.updated + results.searchers.updated;
    const totalErrors = results.founders.errors + results.searchers.errors;

    console.log("\n📊 OVERALL TOTALS:");
    console.log(`  📋 Total Processed: ${totalProcessed}`);
    console.log(`  🆕 Total Created: ${totalCreated}`);
    console.log(`  🔄 Total Updated: ${totalUpdated}`);
    console.log(`  ❌ Total Errors: ${totalErrors}`);
    console.log(`  ⏱️ Total Time: ${Math.round(results.totalTime / 1000)}s`);

    // Calculate and display success rate
    const successRate = totalProcessed > 0
        ? Math.round(((totalProcessed - totalErrors) / totalProcessed) * 100)
        : 0;

    console.log(`  ✅ Success Rate: ${successRate}%`);
}

/**
 * Displays the final status message based on results
 * 
 * @param {Object} results - Complete results object
 */
function displayFinalStatus(results) {
    const totalProcessed = results.founders.processed + results.searchers.processed;
    const totalErrors = results.founders.errors + results.searchers.errors;

    if (totalErrors === 0) {
        console.log("\n🎉 IMPORT COMPLETED SUCCESSFULLY!");
        console.log("All form submissions have been processed and imported to Notion.");
    } else if (totalErrors < totalProcessed / 2) {
        console.log("\n⚠️ IMPORT COMPLETED WITH SOME ERRORS");
        console.log("Most submissions were processed successfully, but some encountered errors.");
        console.log("Check the logs above for details about the errors.");
    } else {
        console.log("\n❌ IMPORT COMPLETED WITH SIGNIFICANT ERRORS");
        console.log("Many submissions encountered errors during processing.");
        console.log("Please review the configuration and error logs.");
    }
}

/**
 * Generates a summary object with key metrics
 * 
 * @param {Object} results - Complete results object
 * @returns {Object} - Summary metrics object
 */
export function generateSummaryMetrics(results) {
    const totalProcessed = results.founders.processed + results.searchers.processed;
    const totalCreated = results.founders.created + results.searchers.created;
    const totalUpdated = results.founders.updated + results.searchers.updated;
    const totalErrors = results.founders.errors + results.searchers.errors;
    const successRate = totalProcessed > 0
        ? Math.round(((totalProcessed - totalErrors) / totalProcessed) * 100)
        : 0;

    return {
        totalProcessed,
        totalCreated,
        totalUpdated,
        totalErrors,
        successRate,
        executionTime: Math.round(results.totalTime / 1000),
        founderStats: results.founders,
        searcherStats: results.searchers
    };
}
