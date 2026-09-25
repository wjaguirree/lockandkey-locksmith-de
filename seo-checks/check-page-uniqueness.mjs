#!/usr/bin/env node
// Verifies every generated page produces a title and description that no
// other page in the same set duplicates. Generic version of Palmetto State
// Locksmith's check-page-uniqueness.mjs — reuses the same `pageGroups`
// config used by check-metadata-lengths.mjs.
//
// Usage: node check-page-uniqueness.mjs --config seo-checks.config.mjs
//
// Config contract: same `pageGroups: () => [{pageType, label, title, description}]`
// as check-metadata-lengths.mjs — write one config module and pass it to both.
import { findDuplicates, loadConfig } from './core.mjs';

const cwd = process.cwd();
const config = await loadConfig(cwd);
const pages = await config.pageGroups();

console.log(`Checked ${pages.length} generated pages for title/description uniqueness.`);
const byType = new Map();
for (const p of pages) byType.set(p.pageType, (byType.get(p.pageType) ?? 0) + 1);
for (const [type, count] of byType) console.log(`  - ${type} pages: ${count}`);

const duplicateTitles = findDuplicates(pages, 'title');
const duplicateDescriptions = findDuplicates(pages, 'description');

if (duplicateTitles.length > 0 || duplicateDescriptions.length > 0) {
  if (duplicateTitles.length > 0) {
    console.error(`\n${duplicateTitles.length} duplicate title group(s):`);
    for (const [title, entries] of duplicateTitles) {
      console.error(`  - "${title}"`);
      for (const e of entries) console.error(`      [${e.pageType}] ${e.label}`);
    }
  }
  if (duplicateDescriptions.length > 0) {
    console.error(`\n${duplicateDescriptions.length} duplicate description group(s):`);
    for (const [description, entries] of duplicateDescriptions) {
      console.error(`  - "${description}"`);
      for (const e of entries) console.error(`      [${e.pageType}] ${e.label}`);
    }
  }
  process.exit(1);
}

console.log('\nAll generated titles and descriptions are unique across every page group.');
