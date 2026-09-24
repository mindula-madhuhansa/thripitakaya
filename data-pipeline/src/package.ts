// Gzips each pack into out/release/, writes manifest.json (what the app checks for updates) and a size report.
// Fails if a pack is over budget. core.db is bundled with the app, so it is size-checked but not released.
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { OUT, ROOT } from './common.ts';

const MB = 1e6, PACK_BUDGET = 40 * MB, CORE_BUDGET = 8 * MB;
const RELEASE = join(OUT, 'release');
mkdirSync(RELEASE, { recursive: true });
const sha256 = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const meta = (file: string) => Object.fromEntries((new DatabaseSync(file, { readOnly: true })
  .prepare('SELECT key, value FROM meta').all() as { key: string; value: string }[]).map(r => [r.key, r.value]));

const over: string[] = [], rows: string[] = [];
const packs = readdirSync(join(OUT, 'packs')).sort().map(f => {
  const file = join(OUT, 'packs', f), raw = readFileSync(file), gz = gzipSync(raw, { level: 9 }), m = meta(file);
  gz[9] = 0xff; // gzip header OS byte: 'unknown' on every platform, so Windows and Linux builds match
  writeFileSync(join(RELEASE, `${f}.gz`), gz);
  rows.push(`| ${m.pack_id} | ${(raw.length / MB).toFixed(1)} | ${(gz.length / MB).toFixed(1)} |`);
  if (gz.length > PACK_BUDGET) over.push(`${f}: ${(gz.length / MB).toFixed(1)} MB gzipped > ${PACK_BUDGET / MB} MB`);
  return { id: m.pack_id, version: m.version, schema_version: +m.schema_version, file: `${f}.gz`,
    bytes: gz.length, sha256: sha256(gz), db_bytes: raw.length, db_sha256: sha256(raw) };
});

const coreRaw = readFileSync(join(OUT, 'core.db')), coreMeta = meta(join(OUT, 'core.db'));
if (coreRaw.length > CORE_BUDGET) over.push(`core.db: ${(coreRaw.length / MB).toFixed(1)} MB > ${CORE_BUDGET / MB} MB`);

const manifest = { version: coreMeta.version, schema_version: +coreMeta.schema_version, source_commit: coreMeta.source_commit,
  core_sha256: sha256(coreRaw), packs };
writeFileSync(join(RELEASE, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
// the app bundles core.db (table of contents + starter texts); gitignored, refreshed by this step
mkdirSync(join(ROOT, '../apps/mobile/assets/db'), { recursive: true });
copyFileSync(join(OUT, 'core.db'), join(ROOT, '../apps/mobile/assets/db/core.db'));

const total = packs.reduce((s, p) => s + p.bytes, 0), totalRaw = packs.reduce((s, p) => s + p.db_bytes, 0);
const report = [`# Size report (${coreMeta.version})`, '', '| Pack | DB MB | gzip MB |', '|---|---|---|', ...rows,
  `| **all packs** | **${(totalRaw / MB).toFixed(1)}** | **${(total / MB).toFixed(1)}** |`, '',
  `core.db (bundled): ${(coreRaw.length / MB).toFixed(1)} MB`, '', over.length ? `Over budget:\n${over.map(o => `- ${o}`).join('\n')}` : 'Within budget.'].join('\n');
writeFileSync(join(OUT, 'size-report.md'), report + '\n');
console.log(report);
process.exit(over.length ? 1 : 0);
