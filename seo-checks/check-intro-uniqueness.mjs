#!/usr/bin/env node
// Verifies combo-page intro paragraphs are unique per axis (e.g. unique per
// service across all areas, unique per area across all services) and,
// optionally, that each links to at least one sibling page. Generic version
// of Palmetto State Locksmith's check-intro-uniqueness.mjs.
//
// Usage: node check-intro-uniqueness.mjs --config seo-checks.config.mjs
//
// Config contract (default export):
// {
//   distDir: 'dist/services',
//   expectedCount: 45,                 // areas x services, etc.
//   combos: () => [
//     { key1: 'locks', key2: 'greenville', segments: ['greenville', 'locks'] },
//   ],
//   introPattern: /<h2[^>]*>.*?<\/h2>\s*<p>([\s\S]*?)<\/p>/,   // capture group 1 = intro HTML
//   linkPattern: /<a href="\/services\/([^/]+)\/([^/]+)\/"/g, // optional
//   validLink: (match, combo) => boolean,                      // optional, required if linkPattern set
// }
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { stripTags, loadConfig } from './core.mjs';

const cwd = process.cwd();
const config = await loadConfig(cwd);
const { distDir, expectedCount, introPattern, linkPattern, validLink } = config;
const dir = path.resolve(cwd, distDir);

if (!existsSync(dir)) {
  console.error(`${dir} does not exist — run the project build first.`);
  process.exit(1);
}

const combos = await config.combos();
const rows = [];
const failures = [];
let checked = 0;

for (const combo of combos) {
  const indexPath = path.join(dir, ...combo.segments, 'index.html');
  if (!existsSync(indexPath)) {
    failures.push({ combo, issue: 'missing built page' });
    continue;
  }
  const html = readFileSync(indexPath, 'utf8');
  const match = html.match(introPattern);
  if (!match) {
    failures.push({ combo, issue: 'no intro paragraph found' });
    continue;
  }
  checked++;
  rows.push({ combo, rawIntro: match[1], text: stripTags(match[1]) });
}

console.log(`Checked ${checked} combo pages (expected ${combos.length}).`);

// Per-key1 uniqueness (e.g. same service, across areas)
for (const key1 of new Set(combos.map((c) => c.key1))) {
  const subset = rows.filter((r) => r.combo.key1 === key1);
  const seen = new Map();
  for (const row of subset) {
    if (seen.has(row.text)) {
      failures.push({ combo: row.combo, issue: `duplicate intro text as ${JSON.stringify(seen.get(row.text))} (same key1, different key2)` });
    } else {
      seen.set(row.text, row.combo);
    }
  }
}

// Per-key2 uniqueness (e.g. same area, across services)
for (const key2 of new Set(combos.map((c) => c.key2))) {
  const subset = rows.filter((r) => r.combo.key2 === key2);
  const seen = new Map();
  for (const row of subset) {
    if (seen.has(row.text)) {
      failures.push({ combo: row.combo, issue: `duplicate intro text as ${JSON.stringify(seen.get(row.text))} (same key2, different key1)` });
    } else {
      seen.set(row.text, row.combo);
    }
  }
}

if (linkPattern && validLink) {
  for (const row of rows) {
    const links = [...row.rawIntro.matchAll(new RegExp(linkPattern))];
    const ok = links.some((m) => validLink(m, row.combo));
    if (!ok) failures.push({ combo: row.combo, issue: 'no valid in-content link found' });
  }
}

if (expectedCount !== undefined && checked !== expectedCount) {
  console.error(
    `\nExpected to check ${expectedCount} combo pages but only found ${checked}. ` +
      'This likely means the build output or route structure changed — failing loudly instead of silently passing.'
  );
  process.exit(1);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} intro-uniqueness issue(s):`);
  for (const f of failures) {
    console.error(`  - ${JSON.stringify(f.combo)} : ${f.issue}`);
  }
  process.exit(1);
}

console.log('All combo-page intros pass uniqueness (and link, if configured) checks.');
