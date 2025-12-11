#!/usr/bin/env node
const scraper = require('../scraper');

async function main() {
  const category = process.argv[2] || process.env.CATEGORY;
  const maxPages = process.env.MAX_PAGES ? Number(process.env.MAX_PAGES) : 133;

  if (!category) {
    console.error('Usage: node _category_runner.js <categoryId>');
    process.exit(1);
  }

  console.log(`Starting generic runner for category: ${category}`);

  try {
    const result = await scraper.startCategoryScraping(category, null, maxPages);
    if (result && result.success) {
      console.log('Category completed successfully');
      process.exit(0);
    } else {
      console.error('Category failed', result && result.error);
      process.exit(2);
    }
  } catch (e) {
    console.error('Runner error:', e.message || e);
    process.exit(3);
  }
}

main();
