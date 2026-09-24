// Checks the built databases against the pinned upstream files. Writes out/verify-report.md; exits 1 on any error.
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { toRoman, toSinhala } from '@thripitakaya/shared';
import { loadSources, OUT, ROOT } from './common.ts';

const { lock, files } = loadSources();
const errors: string[] = [], warnings: string[] = [], info: string[] = [];
const err = (check: string, items: string[], limit = 15) => { if (items.length) errors.push(`**${check}**: ${items.length}\n${items.slice(0, limit).map(i => `  - ${i}`).join('\n')}`); };
const warn = (check: string, items: string[], limit = 10) => { if (items.length) warnings.push(`**${check}**: ${items.length}\n${items.slice(0, limit).map(i => `  - ${i}`).join('\n')}`); };

// --- load what was built
const dbs = [join(OUT, 'core.db'), ...readdirSync(join(OUT, 'packs')).map(f => join(OUT, 'packs', f))].map(f => new DatabaseSync(f, { readOnly: true }));
const core = dbs[0];
type Row = { id: string; node_id: string; kind: string; pali: string; sinh: string | null };
const built = new Map<string, Row>(), notes = new Map<string, string>();
let dupes: string[] = [];
for (const db of dbs) {
  for (const r of db.prepare('SELECT id, node_id, kind, pali, sinh FROM segment').all() as Row[]) { if (built.has(r.id)) dupes.push(r.id); built.set(r.id, r); }
  for (const r of db.prepare('SELECT page_id, lang, ord, text FROM footnote').all() as any[]) notes.set(`${r.page_id}|${r.lang}|${r.ord}`, r.text);
  const v = db.prepare(`SELECT value FROM meta WHERE key = 'source_commit'`).get() as any;
  if (v.value !== lock.tipitakaLk.commit) errors.push(`**Stale build**: a database was built from ${v.value}, lock pins ${lock.tipitakaLk.commit}. Run build.`);
}
err('Duplicate segment ids', dupes);

// --- 1. completeness + 2. verbatim (byte-equal to upstream)
const missing: string[] = [], changed: string[] = [], noteBad: string[] = [];
let upstream = 0, upNotes = 0;
for (const [file, t] of files) for (const page of t.pages) {
  page.pali.entries.forEach((e, i) => {
    upstream++;
    const id = `${file}:${page.pageNum}:${i}`, r = built.get(id);
    if (!r) return missing.push(id);
    if (r.pali !== e.text) changed.push(`${id} pali`);
    if (r.sinh !== (page.sinh?.entries[i]?.text ?? null)) changed.push(`${id} sinh`);
  });
  for (const lang of ['pali', 'sinh'] as const) (page[lang]?.footnotes ?? []).forEach((n, i) => {
    upNotes++;
    if (notes.get(`${file}:${page.pageNum}|${lang}|${i}`) !== n.text) noteBad.push(`${file}:${page.pageNum} ${lang} #${i}`);
  });
}
err('Upstream entries missing from the build', missing);
err('Text differs from upstream (ND: must be byte-equal)', changed);
err('Footnotes differ from upstream', noteBad);
if (built.size !== upstream) errors.push(`**Segment count**: built ${built.size}, upstream ${upstream}`);
if (notes.size !== upNotes) errors.push(`**Footnote count**: built ${notes.size}, upstream ${upNotes}`);

// --- 3. structure: every leaf has text; counts match expected-counts.json
type N = { id: string; parent_id: string | null; leaf: number; title_pali: string };
const nodes = core.prepare('SELECT id, parent_id, leaf, title_pali FROM node').all() as N[];
const kids = new Map<string, N[]>();
for (const n of nodes) kids.set(n.parent_id ?? '', [...(kids.get(n.parent_id ?? '') ?? []), n]);
const owned = new Set([...built.values()].map(r => r.node_id));
err('Leaf nodes with no text', nodes.filter(n => n.leaf && !owned.has(n.id)).map(n => `${n.id} ${n.title_pali}`));
err('Segments owned by an unknown node', [...owned].filter(id => !nodes.some(n => n.id === id)));

const leaves = (id: string): N[] => (kids.get(id) ?? []).flatMap(k => k.leaf ? [k] : leaves(k.id));
const under = (id: string): Set<string> => new Set([id, ...(kids.get(id) ?? []).flatMap(k => [...under(k.id)])]);
const expected: Record<string, any> = JSON.parse(readFileSync(join(ROOT, 'expected-counts.json'), 'utf8'));
const countBad: string[] = [];
for (const [id, want] of Object.entries(expected)) {
  if (id.startsWith('_')) continue;
  const got: Record<string, number> = { children: kids.get(id)?.length ?? 0, leaves: leaves(id).length };
  if ('gatha' in want) { const ids = under(id); got.gatha = [...built.values()].filter(r => ids.has(r.node_id) && r.kind === 'gatha').length; }
  for (const k of ['children', 'leaves', 'gatha']) if (k in want && want[k] !== got[k]) countBad.push(`${id} ${k}: expected ${want[k]}, got ${got[k]}${want.note ? ` (${want.note})` : ''}`);
}
err('Counts differ from expected-counts.json', countBad);
info.push(`Tree: ${nodes.length} nodes, ${nodes.filter(n => n.leaf).length} leaves. Vinaya ${leaves('vp').length}, Sutta ${leaves('sp').length}, Abhidhamma ${leaves('ap').length} leaves.`);

// --- 4. characters
const fffd: string[] = [], latin: string[] = [], odd = new Map<string, number>();
// Sinhala block, whitespace, digits, punctuation and upstream markup (**bold**, __underline__, $$heading$$, {n})
const ALLOWED = /[\u0D80-\u0DFF\s\d.,;:!?'"‘’“”()\[\]{}*\-–—…/|=+_$]/u;
for (const r of built.values()) {
  if ((r.sinh ?? '').includes('\uFFFD')) fffd.push(`${r.id} sinh`);   // the translation legitimately contains Latin ([need trans])
  for (const [lang, s] of [['pali', r.pali]] as const) {
    if (s.includes('\uFFFD')) fffd.push(`${r.id} ${lang}`);
    const plain = s.replace(/\{[^}]*\}/g, '');
    if (lang === 'pali' && /[A-Za-z]/.test(plain)) latin.push(`${r.id}: ${plain.match(/.{0,20}[A-Za-z]+.{0,20}/)![0]}`);
    for (const c of plain) if (!ALLOWED.test(c) && c !== '\u200D' && c !== '\u200C') {
      const k = `U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')} ${lang}`;
      odd.set(k, (odd.get(k) ?? 0) + 1);
    }
  }
}
err('U+FFFD replacement characters', fffd);
warn('Latin letters inside Pāḷi text, outside {footnote} marks: typos to report to tipitaka.lk, or markup/numerals (<hr/>, i., III)', latin, 25);
warn('Unexpected characters (code point, field: count)', [...odd].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}: ${n}`), 25);

// --- 5. Roman display is lossless: Sinhala → Roman → Sinhala gives back the stored text
const rt: string[] = [];
const hasLatin = (s: string) => /[A-Za-z]/.test(s.replace(/\{[^}]*\}/g, ''));   // listed as typos above instead
for (const r of built.values()) { if (hasLatin(r.pali)) continue; const back = toSinhala(toRoman(r.pali)); if (back !== r.pali.replace(/[\u200C\u200D]/g, '')) rt.push(`${r.id}: ${firstDiff(r.pali, back)}`); }
err('Transliteration round trip fails', rt);
function firstDiff(a: string, b: string) { let i = 0; while (a[i] === b[i]) i++; return `…${a.slice(Math.max(0, i - 8), i + 8)}… ≠ …${b.slice(Math.max(0, i - 8), i + 8)}…`; }

// --- report
const report = [`# Verify report`, ``, `Source: tipitaka.lk @ ${lock.tipitakaLk.commit} (${lock.tipitakaLk.date})`, ``,
  `Segments: ${built.size} built / ${upstream} upstream. Footnotes: ${notes.size} / ${upNotes}.`, ``,
  `## Errors (${errors.length})`, ...(errors.length ? errors : ['None.']), ``,
  `## Warnings (${warnings.length})`, ...(warnings.length ? warnings : ['None.']), ``, `## Info`, ...info].join('\n');
writeFileSync(join(OUT, 'verify-report.md'), report + '\n');
console.log(report);
process.exit(errors.length ? 1 : 0);
