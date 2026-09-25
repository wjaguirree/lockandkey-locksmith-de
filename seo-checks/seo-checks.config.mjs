// seo-checks config for Lock and Key Locksmith DE.
//
// This repo is the BUILT STATIC OUTPUT only (see ../CLAUDE.md) — there is no
// src/data/*.ts to import service/city lists from, and no template function
// that "generates" titles/descriptions ahead of build. So unlike the example
// config (seo-checks.config.example.mjs), everything here is derived by
// reading the already-built HTML/directory structure on disk, at the exact
// paths these checks are meant to validate.
//
// Usage (run from this repo's root, i.e. one level up from seo-checks/):
//   node seo-checks/check-word-count.mjs        --config seo-checks/seo-checks.config.mjs
//   node seo-checks/check-metadata-lengths.mjs  --config seo-checks/seo-checks.config.mjs
//   node seo-checks/check-page-uniqueness.mjs   --config seo-checks/seo-checks.config.mjs
//   node seo-checks/check-intro-uniqueness.mjs  --config seo-checks/seo-checks.config.mjs
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());

// Non-page directories at the repo root that must never be treated as a page.
const SKIP_DIRS = new Set(['assets', 'seo-checks', 'node_modules', '.git']);

function listTopLevelPageDirs() {
  return readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !SKIP_DIRS.has(e.name))
    .map((e) => e.name)
    .filter((name) => existsSync(path.join(ROOT, name, 'index.html')));
}

// City slugs (e.g. "dover-de", "bethany-beach-de") come from the real
// service-areas/ subfolders — the one place a clean, authoritative city list
// already exists in this built output.
function listCitySlugs() {
  return readdirSync(path.join(ROOT, 'service-areas'), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

// Combo dirs are named `{service-slug}-in-{city-slug}` (city-slug already
// ends in "-de", e.g. "access-control-in-dover-de"). Some services use a
// longer slug in combo form than their standalone page slug (see
// ../CLAUDE.md — e.g. standalone /automotive-locksmith/ vs combo
// automotive-locksmith-services-in-<city>-de), so we derive the service slug
// per-combo by stripping whichever known city suffix matches, rather than
// assuming it matches a standalone page directory name.
function parseCombo(dirName, citySlugs) {
  for (const city of citySlugs) {
    const suffix = `-in-${city}`;
    if (dirName.endsWith(suffix)) {
      return { service: dirName.slice(0, -suffix.length), city };
    }
  }
  return null;
}

function extractTag(html, re) {
  const m = html.match(re);
  return m ? m[1] : null;
}

function readMeta(dirName) {
  const html = readFileSync(path.join(ROOT, dirName, 'index.html'), 'utf8');
  return {
    html,
    title: extractTag(html, /<title>([\s\S]*?)<\/title>/),
    description: extractTag(html, /<meta name="description" content="([^"]*)"/),
  };
}

export default {
  // --- check-word-count.mjs ---
  // '.' scans every top-level directory with an index.html directly inside
  // it: the 1,400 service×city combo pages + 28 standalone service pages +
  // about/faq/services/service-areas/blog/privacy-policy/terms/request
  // (their nested city/post pages are intentionally out of scope here — add
  // a second config block for those if/when they need their own check).
  distDir: '.',
  minWords: 300,
  // NOTE: expectedCount is intentionally omitted. Both check-word-count.mjs
  // and check-intro-uniqueness.mjs read config.expectedCount, but the two
  // checks legitimately expect different counts here (1,436 total top-level
  // pages vs. 1,400 service×city combo pages) and this config is a single
  // shared object — there's no way to give each script its own value under
  // one key. Leaving it undefined disables the hard-fail-on-mismatch check
  // in both scripts; rely on the printed "Checked N pages" line instead.

  // --- check-metadata-lengths.mjs / check-page-uniqueness.mjs ---
  // Reads the *actual* built <title>/meta-description out of each page
  // rather than generating them, since there's no upstream generator here.
  pageGroups: () => {
    const citySlugs = listCitySlugs();
    return listTopLevelPageDirs().map((dirName) => {
      const combo = parseCombo(dirName, citySlugs);
      const { title, description } = readMeta(dirName);
      return {
        pageType: combo ? 'combo' : 'standalone',
        label: dirName,
        title: title ?? '',
        description: description ?? '',
      };
    });
  },

  // --- check-intro-uniqueness.mjs ---
  // key1 = service slug (checks: is this service's intro unique across every
  // city?), key2 = city slug (checks: is this city's intro unique across
  // every service?). This is the actual "unique content" check the audits
  // flagged — the combo template's <div class="prose"><p>...</p></div> intro
  // is the ~150-250 word block that's supposed to carry genuine local detail.
  combos: () => {
    const citySlugs = listCitySlugs();
    return listTopLevelPageDirs()
      .map((dirName) => ({ dirName, combo: parseCombo(dirName, citySlugs) }))
      .filter((r) => r.combo)
      .map((r) => ({
        key1: r.combo.service,
        key2: r.combo.city,
        segments: [r.dirName],
      }));
  },
  introPattern: /<div class="prose"><p>([\s\S]*?)<\/p><\/div>/,
  // No linkPattern/validLink configured yet — the combo intro paragraph does
  // sometimes link back to its own /service-areas/<city>-de/ page (see the
  // Dover example), but not reliably to a *sibling* page, so there's nothing
  // meaningful to assert here yet without inspecting more samples.
};
