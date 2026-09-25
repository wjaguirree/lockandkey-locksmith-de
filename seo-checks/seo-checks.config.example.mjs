// Example config for the generalized seo-checks scripts, modeled on Palmetto
// State Locksmith's real page structure. Copy this into a project, update the
// imports/paths/business logic, and pass it to each script with --config.
//
//   node check-word-count.mjs        --config seo-checks.config.mjs
//   node check-metadata-lengths.mjs  --config seo-checks.config.mjs
//   node check-page-uniqueness.mjs   --config seo-checks.config.mjs
//   node check-intro-uniqueness.mjs  --config seo-checks.config.mjs
//
// Paths below are relative to wherever you run the script from (your
// project's Astro root, typically).
import { serviceTypes } from './src/data/serviceTypes.ts';
import { serviceAreas } from './src/data/serviceAreas.ts';
import { neighborhoods } from './src/data/neighborhoods.ts';
import { business } from './src/data/business.ts';
import { firstFit, truncateAtWord, pick } from '../shared-scripts/seo-checks/core.mjs';

const SC = business.address.stateCode;
const BN = business.name;

const COMBO_DESCRIPTION_SUFFIXES = [
  (areaName, sc) => `Serving ${areaName}, ${sc}.`,
  (areaName, sc) => `We serve ${areaName}, ${sc}.`,
];

function buildComboDescription(area, service) {
  const suffixFn = pick(`${area.slug}::${service.slug}::suffix`, COMBO_DESCRIPTION_SUFFIXES);
  const suffix = suffixFn(area.name, SC);
  const rawCore = truncateAtWord(service.shortDescription, 160 - suffix.length - 2);
  const core = /[.!?]$/.test(rawCore) ? rawCore : `${rawCore}.`;
  return `${core} ${suffix}`;
}

export default {
  // --- check-word-count.mjs ---
  distDir: 'dist/services',
  minWords: 900,
  expectedCount: serviceTypes.length,

  // --- check-metadata-lengths.mjs / check-page-uniqueness.mjs ---
  pageGroups: () => {
    const pages = [];
    for (const area of serviceAreas) {
      for (const service of serviceTypes) {
        pages.push({
          pageType: 'combo',
          label: `${service.slug} x ${area.slug}`,
          title: firstFit([`${service.name} in ${area.name}, ${SC} | ${BN}`], 50, 60),
          description: buildComboDescription(area, service),
        });
      }
    }
    for (const service of serviceTypes) {
      pages.push({
        pageType: 'service',
        label: service.slug,
        title: firstFit([`${service.name} Services in Greenville, SC | ${BN}`], 50, 60),
        description: truncateAtWord(`${service.name}. ${service.shortDescription}`, 160),
      });
    }
    return pages;
  },

  // --- check-intro-uniqueness.mjs ---
  combos: () =>
    serviceAreas.flatMap((area) =>
      serviceTypes.map((service) => ({
        key1: service.slug,
        key2: area.slug,
        segments: [area.slug, service.slug],
      }))
    ),
  introPattern: /<h2[^>]*>.*?homes and businesses<\/h2>\s*<p>([\s\S]*?)<\/p>/,
  linkPattern: /<a href="\/services\/([^/]+)\/([^/]+)\/"/g,
  validLink: (match, combo) => match[1] === combo.key2 && match[2] !== combo.key1,
};
