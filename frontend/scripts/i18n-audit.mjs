#!/usr/bin/env node
/**
 * Audit des clés de traduction.
 *
 * Parcourt les sources, résout le namespace de chaque appel t() via le
 * useTranslation('ns') du fichier, et vérifie que la clé existe dans
 * public/locales/<langue>/<ns>.json.
 *
 * Trois familles de problèmes, par gravité décroissante :
 *   1. Clé absente et sans defaultValue -> l'écran affiche la clé brute ("role.user")
 *   2. Clé absente mais avec defaultValue -> l'écran affiche la langue du code
 *   3. Namespace déclaré dans ns[] mais absent de resources -> tout le namespace tombe
 *
 * Sortie non nulle si un problème de niveau 1 ou 3 subsiste, pour usage en CI.
 *
 *   npm run i18n:audit
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const LOCALES = join(ROOT, 'public', 'locales');
const LANGS = ['fr', 'en'];

const RE_USE_NS = /useTranslation\(\s*['"]([\w.-]+)['"]\s*\)/g;
const RE_USE_DEFAULT = /useTranslation\(\s*\)/;
// t('cle') / t("cle") ; capture la suite de l'appel pour repérer un defaultValue
const RE_T_CALL = /\bt\(\s*(['"])([^'"]+?)\1([^)]*)/g;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (['.ts', '.tsx'].includes(extname(entry))) out.push(full);
  }
  return out;
}

function readJSON(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function lookup(data, dotted) {
  let node = data;
  for (const part of dotted.split('.')) {
    if (node === null || typeof node !== 'object' || !(part in node)) return undefined;
    node = node[part];
  }
  return node;
}

function flatten(data, prefix = '') {
  const out = new Set();
  for (const [key, value] of Object.entries(data ?? {})) {
    const full = `${prefix}${key}`;
    if (value !== null && typeof value === 'object') {
      for (const nested of flatten(value, `${full}.`)) out.add(nested);
    } else {
      out.add(full);
    }
  }
  return out;
}

// --- chargement des dictionnaires ---------------------------------------
const locales = {};
for (const lang of LANGS) {
  locales[lang] = {};
  for (const file of readdirSync(join(LOCALES, lang))) {
    if (file.endsWith('.json')) {
      locales[lang][file.replace(/\.json$/, '')] = readJSON(join(LOCALES, lang, file));
    }
  }
}

// --- namespaces enregistrés dans src/lib/i18n.ts ------------------------
const config = readFileSync(join(SRC, 'lib', 'i18n.ts'), 'utf8');
const registered = new Set([...config.matchAll(/^\s{4}(\w+):\s\w+Fr,/gm)].map((m) => m[1]));
const declaredBlock = config.match(/ns:\s*\[(.*?)\]/s);
const declared = new Set(
  declaredBlock ? [...declaredBlock[1].matchAll(/'(\w+)'/g)].map((m) => m[1]) : []
);
const onDisk = new Set(Object.keys(locales.fr));

// --- balayage des sources -----------------------------------------------
const rawKeyBugs = [];   // niveau 1
const wrongLangBugs = []; // niveau 2

for (const file of walk(SRC)) {
  const text = readFileSync(file, 'utf8');
  if (!text.includes('useTranslation')) continue;

  const namespaces = [...text.matchAll(RE_USE_NS)].map((m) => m[1]);
  if (RE_USE_DEFAULT.test(text)) namespaces.push('common');
  if (namespaces.length === 0) continue;

  const lines = text.split('\n');
  lines.forEach((line, index) => {
    for (const match of line.matchAll(RE_T_CALL)) {
      const [, , key, tail] = match;
      const hasDefault = tail.includes('defaultValue');

      let candidates = namespaces;
      let bare = key;
      // Un namespace explicite l'emporte, qu'il vienne du préfixe 'ns:cle'
      // ou de l'option { ns: 'ns' } passée à t().
      const nsOption = tail.match(/\bns:\s*['"]([\w.-]+)['"]/);
      if (key.includes(':')) {
        const [ns, ...rest] = key.split(':');
        candidates = [ns];
        bare = rest.join(':');
      } else if (nsOption) {
        candidates = [nsOption[1]];
      }

      for (const lang of LANGS) {
        const found = candidates.some(
          (ns) => locales[lang][ns] && lookup(locales[lang][ns], bare) !== undefined
        );
        if (found) continue;
        const entry = {
          lang,
          key: bare,
          ns: candidates.join('|'),
          file: relative(ROOT, file),
          line: index + 1,
        };
        (hasDefault ? wrongLangBugs : rawKeyBugs).push(entry);
      }
    }
  });
}

// --- rapport --------------------------------------------------------------
const unregistered = [...declared].filter((ns) => !registered.has(ns));
const neverImported = [...onDisk].filter((ns) => !registered.has(ns));

let failed = false;

console.log('\n=== 1. Namespaces non enregistrés dans resources ===');
if (unregistered.length || neverImported.length) {
  failed = true;
  if (unregistered.length) console.log(`  déclarés dans ns[] mais absents: ${unregistered.join(', ')}`);
  if (neverImported.length) console.log(`  fichiers JSON jamais importés: ${neverImported.join(', ')}`);
} else {
  console.log('  aucun');
}

console.log('\n=== 2. Clés affichées brutes (absentes, sans defaultValue) ===');
if (rawKeyBugs.length) {
  failed = true;
  const seen = new Set();
  for (const bug of rawKeyBugs) {
    const id = `${bug.lang}|${bug.ns}|${bug.key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    console.log(`  [${bug.lang}] ${bug.ns}:${bug.key}  (${bug.file}:${bug.line})`);
  }
  console.log(`  -> ${seen.size} cas`);
} else {
  console.log('  aucun');
}

console.log('\n=== 3. Clés retombant sur defaultValue (mauvaise langue) ===');
if (wrongLangBugs.length) {
  const seen = new Set();
  for (const bug of wrongLangBugs) {
    const id = `${bug.lang}|${bug.ns}|${bug.key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    console.log(`  [${bug.lang}] ${bug.ns}:${bug.key}  (${bug.file}:${bug.line})`);
  }
  console.log(`  -> ${seen.size} cas (non bloquant)`);
} else {
  console.log('  aucun');
}

console.log('\n=== 4. Désynchronisation FR <-> EN ===');
let desync = 0;
for (const ns of [...onDisk].sort()) {
  const fr = flatten(locales.fr[ns] ?? {});
  const en = flatten(locales.en[ns] ?? {});
  const onlyFr = [...fr].filter((k) => !en.has(k));
  const onlyEn = [...en].filter((k) => !fr.has(k));
  if (onlyFr.length || onlyEn.length) {
    desync += onlyFr.length + onlyEn.length;
    console.log(`  ${ns}.json`);
    if (onlyFr.length) console.log(`    FR seulement: ${onlyFr.join(', ')}`);
    if (onlyEn.length) console.log(`    EN seulement: ${onlyEn.join(', ')}`);
  }
}
if (desync) failed = true;
else console.log('  aucune');

console.log('');
process.exit(failed ? 1 : 0);
