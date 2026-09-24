// Scripture content API used by every screen. core.db ships with the app (full table of contents + Khp, Dhp, Snp);
// the other collections come from downloaded packs (./packs.ts). Text is shown exactly as stored; only the script
// (Sinhala ↔ Roman) and display joiners change at render time.
import { importDatabaseFromAssetAsync, openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { findFolded, fold, isSinhala, matchQuery, toRoman } from '@thripitakaya/shared';
import { isInstalled, packDb, PACKS } from './packs';

let core: SQLiteDatabase;
/** Copies the bundled core.db into place and opens it. Awaited once before any screen renders. */
export async function initContent() {
  await importDatabaseFromAssetAsync('core.db', { assetId: require('../../assets/db/core.db'), forceOverwrite: true });
  core = openDatabaseSync('core.db');
  if (!core.getFirstSync(`SELECT 1 FROM sqlite_master WHERE name = 'segment'`))
    throw new Error('core.db has no texts. Run `npm run data` at the repo root, then restart with `npx expo start -c`.');
}
const dbFor = (pack: string) => (pack === 'core' ? core : packDb(pack));
const allDbs = () => [core, ...PACKS.map(p => packDb(p.id)).filter((d): d is SQLiteDatabase => !!d)];

// --- tree
export type Node = { id: string; parent_id: string | null; ord: number; level: number; title_pali: string; title_si: string; pack: string; leaf: number };
const COLS = 'id, parent_id, ord, level, title_pali, title_si, pack, leaf';
const nodes = new Map<string, Node>();
export function getNode(id: string) {
  let n = nodes.get(id);
  if (!n) { n = core.getFirstSync<Node>(`SELECT ${COLS} FROM node WHERE id = ?`, id) ?? undefined; if (n) nodes.set(id, n); }
  return n;
}
export const children = (id: string | null) => core.getAllSync<Node>(`SELECT ${COLS} FROM node WHERE parent_id IS ? ORDER BY ord`, id);
export function chain(id: string): Node[] {
  const out: Node[] = [];
  for (let n = getNode(id); n; n = n.parent_id ? getNode(n.parent_id) : undefined) out.unshift(n);
  return out;
}
export const available = (n: Node) => n.pack === 'core' || isInstalled(n.pack);

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Pāḷi title in Roman script, for lists and citations. */
export const romanTitle = (n: Node) => cap(toRoman(n.title_pali).replace(/^\d+\.\s*/, ''));

const leafCache = new Map<string, string[]>();
/** Leaf ids under a node, in reading order. */
export function leavesUnder(id: string): string[] {
  let l = leafCache.get(id);
  if (!l) {
    l = core.getAllSync<{ id: string }>(`WITH RECURSIVE t(id, leaf, path) AS (
        SELECT id, leaf, printf('%05d', ord) FROM node WHERE parent_id = ?
        UNION ALL SELECT n.id, n.leaf, t.path || printf('%05d', n.ord) FROM node n JOIN t ON n.parent_id = t.id)
      SELECT id FROM t WHERE leaf = 1 ORDER BY path`, id).map(r => r.id);
    leafCache.set(id, l);
  }
  return l;
}
export const firstLeaf = (id: string) => (getNode(id)?.leaf ? id : leavesUnder(id)[0] ?? id);

// --- citations. DN and MN use the standard numbers; elsewhere BJT's own position (e.g. Snp 1.8).
const BOOKS: Record<string, string> = {
  dn: 'DN', mn: 'MN', sn: 'SN', an: 'AN', 'kn-khp': 'Khp', 'kn-dhp': 'Dhp', 'kn-ud': 'Ud', 'kn-iti': 'Iti', 'kn-snp': 'Snp',
  'kn-vv': 'Vv', 'kn-pv': 'Pv', 'kn-thag': 'Thag', 'kn-thig': 'Thig', 'kn-jat': 'Ja', 'kn-mn': 'Mnd', 'kn-nc': 'Cnd',
  'kn-ps': 'Paṭis', 'kn-ap': 'Ap', 'kn-bv': 'Bv', 'kn-cp': 'Cp', 'kn-nett': 'Ne', 'kn-petk': 'Pe',
  'vp-prj': 'Pārā', 'vp-pct': 'Pāci', 'vp-mv': 'Mv', 'vp-cv': 'Cv', 'vp-pv': 'Pari',
  'ap-dhs': 'Dhs', 'ap-vbh': 'Vibh', 'ap-dhk': 'Dhātuk', 'ap-pug': 'Pp', 'ap-kvu': 'Kv', 'ap-yam': 'Yam', 'ap-pat': 'Paṭṭh',
};
const bookOf = (id: string) => Object.keys(BOOKS).filter(b => id === b || id.startsWith(b + '-')).sort((a, b) => b.length - a.length)[0];
export function cite(id: string) {
  const b = bookOf(id);
  if (!b) return '';
  if (b === 'dn' || b === 'mn') { const i = leavesUnder(b).indexOf(id); if (i >= 0) return `${BOOKS[b]} ${i + 1}`; }
  const rest = id.slice(b.length + 1);
  return rest ? `${BOOKS[b]} ${rest.replace(/-/g, '.')}` : BOOKS[b];
}
/** Previous / next leaf in the same book. */
export function neighbours(id: string) {
  const b = bookOf(id), l = b ? leavesUnder(b) : [], i = l.indexOf(id);
  return { prev: i > 0 ? getNode(l[i - 1]) : undefined, next: i >= 0 && i < l.length - 1 ? getNode(l[i + 1]) : undefined };
}
export const pitakaOf = (id: string) => (id.startsWith('vp') ? 'vinaya' : id.startsWith('ap') ? 'abhi' : 'sutta');

// --- texts
export type Seg = { id: string; node_id: string; ord: number; kind: string; level: number | null; pali: string; sinh: string | null };
const SEG = 'id, node_id, ord, kind, level, pali, sinh';
export const isHeading = (s: Seg) => s.kind === 'heading' || s.kind === 'centered';

/** A leaf's segments. The first leaf of a book or vagga also gets the headings its ancestors own (title, namo…). */
export function getText(id: string): { node: Node; segs: Seg[] } | undefined {
  const node = getNode(id), db = node && dbFor(node.pack);
  if (!node || !db) return;
  const own = db.getAllSync<Seg>(`SELECT ${SEG} FROM segment WHERE node_id = ? ORDER BY ord`, id);
  // ancestors' headings, but only those printed in this text's own file (a book node owns headers from several files)
  const file = own[0]?.id.slice(0, own[0].id.indexOf(':'));
  const heads: Seg[] = [];
  for (let n = node; file && n.parent_id && n.ord === 0;) {
    const p = getNode(n.parent_id)!;
    heads.unshift(...db.getAllSync<Seg>(`SELECT ${SEG} FROM segment WHERE node_id = ? AND id LIKE ? ORDER BY ord`, p.id, file + ':%'));
    n = p;
  }
  return { node, segs: [...heads, ...own] };
}

/** Footnotes for a {marker} in a segment: the page's notes starting with "<marker>.", else all of that page's notes. */
export function footnotes(node: Node, segId: string, lang: 'pali' | 'sinh', marker: string): string[] {
  const page = segId.slice(0, segId.lastIndexOf(':'));
  const all = (dbFor(node.pack)?.getAllSync<{ text: string }>('SELECT text FROM footnote WHERE page_id = ? AND lang = ? ORDER BY ord', page, lang) ?? []).map(r => r.text);
  const mine = all.filter(t => t.startsWith(marker + '.'));
  return mine.length ? mine : all;
}

/** Markup removed, for snippets, sharing and search highlights. */
export const plain = (s: string) => s.replace(/\{[^}]*\}|\*\*|__|\$\$/g, '');

/** Titles and citation for a saved item (bookmark, note, history row). */
export function describe(nodeId: string, segId?: string | null) {
  const n = getNode(nodeId);
  const seg = segId && n ? dbFor(n.pack)?.getFirstSync<{ ord: number }>('SELECT ord FROM segment WHERE id = ?', segId) : null;
  return { pali: n ? romanTitle(n) : nodeId, si: n?.title_si ?? '', ref: cite(nodeId) + (seg ? ` · ¶${seg.ord + 1}` : '') };
}

// --- search: FTS5 in core + every downloaded pack, merged by rank.
export type LangFilter = 'all' | 'pali' | 'si' | 'en';
export type Hit = { node: Node; seg: Seg; field: 'pali' | 'sinh'; text: string; range: [number, number] | null };
export function search(q: string, f: { lang: LangFilter; pitaka: string; nikaya: string }): Hit[] {
  if (f.lang === 'en' || !q.trim()) return [];
  const match = matchQuery(q, f.lang), roman = fold(toRoman(q));
  // words can match apart from each other; then highlight the first word
  const mark = (text: string, query: string) => findFolded(text, query) ?? findFolded(text, query.trim().split(' ')[0]);
  if (!match) return [];
  const rows: (Seg & { score: number })[] = [];
  for (const db of allDbs()) {
    try {
      rows.push(...db.getAllSync<Seg & { score: number }>(`SELECT s.id, s.node_id, s.ord, s.kind, s.level, s.pali, s.sinh, bm25(segment_fts) AS score
        FROM segment_fts JOIN segment s ON s.rowid = segment_fts.rowid WHERE segment_fts MATCH ? ORDER BY score LIMIT 60`, match));
    } catch { /* malformed query text: no results rather than a crash */ }
  }
  return rows
    .filter(r => (f.pitaka === 'all' || pitakaOf(r.node_id) === f.pitaka)
      && (f.pitaka !== 'sutta' || f.nikaya === 'all' || r.node_id === f.nikaya || r.node_id.startsWith(f.nikaya + '-')))
    .sort((a, b) => a.score - b.score).slice(0, 100)
    .flatMap((seg): Hit[] => {
      const node = getNode(seg.node_id);
      if (!node) return [];
      const si = seg.sinh && isSinhala(q) && f.lang !== 'pali' ? mark(plain(seg.sinh), q) : null;
      if (si) return [{ node, seg, field: 'sinh', text: plain(seg.sinh!), range: si }];
      const text = toRoman(plain(seg.pali));
      return [{ node, seg, field: 'pali', text, range: mark(text, roman) }];
    });
}

// --- home: a Dhammapada verse chosen by date
let dhp: Seg[] | undefined;
export function todayVerse(d = new Date()) {
  dhp ??= core.getAllSync<Seg>(`SELECT ${SEG} FROM segment WHERE node_id LIKE 'kn-dhp-%' AND kind = 'gatha' ORDER BY rowid`);
  const seg = dhp[Math.floor(d.getTime() / 864e5) % dhp.length], node = getNode(seg.node_id)!;
  return { seg, node, ref: `Dhammapada · ${romanTitle(node)}` };
}
