// Shared helpers for the generalized SEO-check scripts in this folder.
// Project-specific logic (title/description generation, business data) stays
// out of here — it lives in each project's own config module.

export function truncateAtWord(raw, max) {
  if (raw.length <= max) return raw;
  return raw.charAt(max) === ' '
    ? raw.slice(0, max)
    : raw.slice(0, raw.lastIndexOf(' ', max)).trimEnd();
}

export function firstFit(candidates, min, max) {
  return candidates.find((t) => t.length >= min && t.length <= max) ?? candidates[candidates.length - 1];
}

// FNV-1a seeded pick — deterministic per-seed selection, useful for varying
// generated copy without randomness (so output is stable across builds).
export function pickIndex(seed, length) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return length > 0 ? (hash >>> 0) % length : 0;
}

export function pick(seed, items) {
  if (!items || items.length === 0) return undefined;
  return items[pickIndex(seed, items.length)];
}

export function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractMainText(html) {
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (!mainMatch) return null;
  return stripTags(
    mainMatch[1]
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  );
}

// items: array of objects; field: key to group/dedupe on.
// Returns [[value, [items...]], ...] for every value shared by >1 item.
export function findDuplicates(items, field) {
  const groups = new Map();
  for (const item of items) {
    const key = item[field];
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return [...groups.entries()].filter(([, entries]) => entries.length > 1);
}

export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

export async function loadConfig(cwd) {
  const { resolve } = await import('path');
  const args = parseArgs(process.argv.slice(2));
  if (!args.config) {
    console.error('Error: --config <path-to-config.mjs> is required.');
    process.exit(1);
  }
  const configPath = resolve(cwd, args.config);
  const mod = await import(`file://${configPath}`);
  return mod.default;
}
