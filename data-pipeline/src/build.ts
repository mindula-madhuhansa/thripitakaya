// Builds out/core.db (full table of contents + starter texts) and out/packs/<id>.db from the pinned sources.
// pali/sinh/footnote text is stored byte-for-byte as upstream (CC BY-ND). Only the *_f search columns are derived.
// Deterministic: same sources.lock.json → same bytes (sorted inserts, no timestamps, VACUUM).
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fold, toRoman } from '@thripitakaya/shared';
import { loadSources, OUT, packOf, type TreeRow } from './common.ts';

export const SCHEMA_VERSION = 1;
const MULA_KEY = /^(vp|sp|ap|dn|mn|sn|an|kn)(-|$)/;

const { lock, tree, files } = loadSources();
const { commit, date } = lock.tipitakaLk;
const version = `${date.slice(0, 10).replace(/-/g, '')}-${commit.slice(0, 7)}`;

// --- tree. tree.json lists keys in file order (an-1, an-10, an-11, an-2…), so numbered siblings are
// sorted by number; named ones (vp-prj, kn-khp…) keep upstream order. ord = position among siblings.
const keys = Object.keys(tree).filter(k => MULA_KEY.test(k));
const treeIndex = new Map(keys.map((k, i) => [k, i]));
const children = new Map<string, string[]>();
for (const k of keys) { const p = tree[k][4]; children.set(p, [...(children.get(p) ?? []), k]); }
const num = (k: string) => { const s = k.slice(k.lastIndexOf('-') + 1); return /^\d+$/.test(s) ? +s : NaN; };
for (const sibs of children.values())
  sibs.sort((a, b) => (isNaN(num(a)) || isNaN(num(b)) ? treeIndex.get(a)! - treeIndex.get(b)! : num(a) - num(b)));

// --- ownership: each entry belongs to the last tree node that starts at or before it in the same file
type Seg = { id: string; node: string; kind: string; level: number | null; pali: string; sinh: string | null };
const segsByPack = new Map<string, Seg[]>();
const notesByPack = new Map<string, [string, string, number, string][]>();
for (const [file, t] of files) {
  const starts = keys.filter(k => tree[k][5] === file)
    .sort((a, b) => { const [pa, ea] = tree[a][3], [pb, eb] = tree[b][3]; return pa - pb || ea - eb || treeIndex.get(a)! - treeIndex.get(b)!; });
  if (!starts.length) throw new Error(`${file}: no tree node starts in this file`);
  const header = tree[starts[0]][4] in tree ? tree[starts[0]][4] : starts[0]; // lines before the first node → its parent
  const pack = packOf(file), segs = segsByPack.get(pack) ?? [], notes = notesByPack.get(pack) ?? [];
  let si = -1;
  t.pages.forEach((page, p) => {
    page.pali.entries.forEach((e, i) => {
      while (si + 1 < starts.length && cmp(tree[starts[si + 1]][3], [p, i]) <= 0) si++;
      segs.push({ id: `${file}:${page.pageNum}:${i}`, node: si < 0 ? header : starts[si], kind: e.type, level: e.level ?? null,
        pali: e.text, sinh: page.sinh?.entries[i]?.text ?? null });
    });
    for (const lang of ['pali', 'sinh'] as const)
      (page[lang]?.footnotes ?? []).forEach((n, i) => notes.push([`${file}:${page.pageNum}`, lang, i, n.text]));
  });
  segsByPack.set(pack, segs); notesByPack.set(pack, notes);
}
function cmp(a: [number, number], b: [number, number]) { return a[0] - b[0] || a[1] - b[1]; }

// --- write
const strip = (s: string) => s.replace(/\{[^}]*\}/g, '').replace(/\*\*/g, '');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'packs'), { recursive: true });

for (const pack of ['core', ...[...segsByPack.keys()].filter(p => p !== 'core').sort()]) {
  const file = pack === 'core' ? join(OUT, 'core.db') : join(OUT, 'packs', `${pack}.db`);
  const db = new DatabaseSync(file);
  db.exec(`PRAGMA page_size = 4096; PRAGMA journal_mode = OFF; PRAGMA synchronous = OFF;
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL) WITHOUT ROWID;
    CREATE TABLE source (id TEXT PRIMARY KEY, name TEXT NOT NULL, license TEXT NOT NULL, attribution TEXT NOT NULL, url TEXT NOT NULL, upstream_commit TEXT NOT NULL) WITHOUT ROWID;
    CREATE TABLE segment (
      rowid INTEGER PRIMARY KEY,
      id TEXT NOT NULL UNIQUE,     -- <file>:<pageNum>:<entry index>, upstream coordinates
      node_id TEXT NOT NULL,       -- owning node in core.db node table
      ord INTEGER NOT NULL,        -- order within node
      kind TEXT NOT NULL,          -- upstream type: paragraph | gatha | heading | centered | unindented
      level INTEGER,
      pali TEXT NOT NULL,          -- verbatim upstream (Sinhala script)
      sinh TEXT                    -- verbatim upstream; NULL where upstream has no translation
    );
    CREATE INDEX segment_node ON segment(node_id, ord);
    CREATE TABLE footnote (page_id TEXT NOT NULL, lang TEXT NOT NULL, ord INTEGER NOT NULL, text TEXT NOT NULL,
      PRIMARY KEY (page_id, lang, ord)) WITHOUT ROWID;   -- verbatim; page_id = <file>:<pageNum>
    CREATE VIRTUAL TABLE segment_fts USING fts5(pali_f, sinh_f, content = '',
      tokenize = "unicode61 remove_diacritics 0 categories 'L* N* Co M*'");
    BEGIN;`);
  const meta = db.prepare('INSERT INTO meta VALUES (?, ?)');
  for (const [k, v] of [['pack_id', pack], ['version', version], ['schema_version', String(SCHEMA_VERSION)], ['source_commit', commit]]) meta.run(k, v);
  const src = db.prepare('INSERT INTO source VALUES (?, ?, ?, ?, ?, ?)');
  src.run('bjt-pali', 'Buddha Jayanti Tripiṭaka: Pāḷi', 'CC BY-ND 4.0', 'Pāḷi text: Buddha Jayanti Tripiṭaka, from tipitaka.lk (CC BY-ND 4.0)', 'https://tipitaka.lk', commit);
  src.run('bjt-sinh', 'Buddha Jayanti Tripiṭaka: Sinhala translation', 'CC BY-ND 4.0', 'Sinhala translation: Buddha Jayanti Tripiṭaka, from tipitaka.lk (CC BY-ND 4.0)', 'https://tipitaka.lk', commit);

  const ins = db.prepare('INSERT INTO segment VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const fts = db.prepare('INSERT INTO segment_fts (rowid, pali_f, sinh_f) VALUES (?, ?, ?)');
  const ord = new Map<string, number>();
  (segsByPack.get(pack) ?? []).forEach((s, i) => {
    const o = ord.get(s.node) ?? 0; ord.set(s.node, o + 1);
    ins.run(i + 1, s.id, s.node, o, s.kind, s.level, s.pali, s.sinh);
    fts.run(i + 1, fold(toRoman(strip(s.pali))), s.sinh == null ? null : fold(strip(s.sinh)));
  });
  const note = db.prepare('INSERT INTO footnote VALUES (?, ?, ?, ?)');
  for (const n of notesByPack.get(pack) ?? []) note.run(...n);

  if (pack === 'core') {
    db.exec(`CREATE TABLE node (
      id TEXT PRIMARY KEY, parent_id TEXT, ord INTEGER NOT NULL, level INTEGER NOT NULL,
      title_pali TEXT NOT NULL, title_si TEXT NOT NULL,   -- verbatim from tipitaka.lk tree.json
      pack TEXT NOT NULL, leaf INTEGER NOT NULL
    ) WITHOUT ROWID;
    CREATE INDEX node_parent ON node(parent_id, ord);`);
    const n = db.prepare('INSERT INTO node VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    for (const k of [...keys].sort()) {
      const r: TreeRow = tree[k], sibs = children.get(r[4])!;
      n.run(k, r[4] === 'root' ? null : r[4], sibs.indexOf(k), r[2], r[0], r[1], packOf(r[5]), children.has(k) ? 0 : 1);
    }
  }
  db.exec(`COMMIT; INSERT INTO segment_fts(segment_fts) VALUES ('optimize'); VACUUM;`);
  db.close();
  console.log(`${pack.padEnd(5)} ${String(segsByPack.get(pack)?.length ?? 0).padStart(6)} segments`);
}
console.log(`built ${version}`);
