#!/usr/bin/env node
// Validates generated <title>/description lengths across every generated page.
// Generic version of Palmetto State Locksmith's check-metadata-lengths.mjs —
// the actual title/description generation logic (which mirrors each project's
// .astro templates) lives in the project's --config module, not here.
//
// Usage: node check-metadata-lengths.mjs --config seo-checks.config.mjs
//
// Config contract (default export):
// {
//   titleMin: 50, titleMax: 60,      // optional, these are the defaults
//   descMin: 70, descMax: 160,       // optional, these are the defaults
//   pageGroups: () => [
//     { pageType: 'combo', label: 'locks x greenville', title: '...', description: '...' },
//     ...
//   ],
// }
import { loadConfig } from './core.mjs';

const cwd = process.cwd();
const config = await loadConfig(cwd);
const TITLE_MIN = config.titleMin ?? 50;
const TITLE_MAX = config.titleMax ?? 60;
const DESC_MIN = config.descMin ?? 70;
const DESC_MAX = config.descMax ?? 160;

const pages = await config.pageGroups();

const violations = [];
for (const p of pages) {
  if (p.title.length < TITLE_MIN || p.title.length > TITLE_MAX) {
    violations.push({ pageType: p.pageType, label: p.label, field: 'title', length: p.title.length, value: p.title });
  }
  if (p.description.length < DESC_MIN || p.description.length > DESC_MAX) {
    violations.push({ pageType: p.pageType, label: p.label, field: 'description', length: p.description.length, value: p.description });
  }
}

console.log(`Checked ${pages.length} generated title/description pairs.`);
const byType = new Map();
for (const p of pages) byType.set(p.pageType, (byType.get(p.pageType) ?? 0) + 1);
for (const [type, count] of byType) console.log(`  - ${type} pages: ${count}`);

const titleViolations = violations.filter((v) => v.field === 'title');
const descriptionViolations = violations.filter((v) => v.field === 'description');

if (violations.length > 0) {
  console.error(
    `\n${violations.length} metadata length violation(s) (${titleViolations.length} title, ${descriptionViolations.length} description):`
  );
  for (const v of violations) {
    const range = v.field === 'title' ? `${TITLE_MIN}-${TITLE_MAX}` : `${DESC_MIN}-${DESC_MAX}`;
    console.error(`  - [${v.pageType}] ${v.label} : ${v.field} is ${v.length} chars (target ${range}) -> "${v.value}"`);
  }
  process.exit(1);
}

console.log('\nAll generated titles and descriptions are within target length ranges.');
