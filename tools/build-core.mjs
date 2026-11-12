// Слепва бизнес логиката от apps-script/Code.gs + tools/overrides.js
// в functions/_lib/core.js (Cloudflare). Пусни след всяка промяна в Code.gs:
//   node tools/build-core.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const code = readFileSync(join(root, 'apps-script/Code.gs'), 'utf8');
const over = readFileSync(join(root, 'tools/overrides.js'), 'utf8');

const out = `// ⚠️ ГЕНЕРИРАН ФАЙЛ — не го редактирай на ръка.
// Източник: apps-script/Code.gs + tools/overrides.js  →  node tools/build-core.mjs
import { Utilities } from './util.js';

const noop = () => {};
const LockService = { getScriptLock: () => ({ waitLock: noop, tryLock: () => true, releaseLock: noop, hasLock: () => true }) };
const SpreadsheetApp = { flush: noop, getUi: () => { throw new Error('Няма Google Sheet'); }, getActiveSpreadsheet: () => { throw new Error('Няма Google Sheet'); } };
const CacheService = null, CalendarApp = null, ScriptApp = null, UrlFetchApp = null, Session = null, ContentService = null;

// ctx: { store, ops, props, env, calcache, origin }
export function createCore(ctx) {
  const STORE = ctx.store, OPS = ctx.ops, ENV = ctx.env || {}, CALCACHE = ctx.calcache || {}, ORIGIN = ctx.origin || '';
  const CAL_DIRTY = ctx.calDirty || {};
  const PropertiesService = { getScriptProperties: () => ({
    getProperty: (k) => (ctx.props[k] !== undefined ? ctx.props[k] : null),
    setProperty: (k, v) => { ctx.props[k] = String(v); OPS.push({ op: 'prop', k, v: String(v) }); },
  }) };

${code}

${over}

  return { handle_, buildIcs_, SCHEMA, SCHEMA_VERSION, seedSkills_, seedAchievements_, newKey_, nowIso_, readObjects_, updateById_, parseSets_ };
}
`;
writeFileSync(join(root, 'functions/_lib/core.js'), out);
console.log('functions/_lib/core.js готов (' + Math.round(out.length / 1024) + ' KB)');
