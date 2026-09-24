// Scripture content API used by every screen. Today it reads the bundled SAMPLE (./sample.ts).
// These bodies later become SQLite queries over core.db + downloaded packs; the signatures stay.
import { TREE, SN_1_8, DICT, PACKS as SAMPLE_PACKS } from './sample';
import { findFolded, fold } from './fold';

export const IS_SAMPLE = true;

export type Node = {
  id: string; pali: string; si: string; short?: string; meta?: string; desc?: string; ref?: string;
  children?: Node[]; parent?: Node;
};
export type Seg = { id: string; n: number; roman: string[]; pali: string[]; si: string; en: string };
export type Sutta = {
  id: string; ref: string; trail: string; titleRoman: string; titlePali: string; titleSi: string;
  namo: [string, string]; end: [string, string]; segs: Seg[];
};

// --- tree
export const root = TREE as Node;
const byId = new Map<string, Node>();
(function index(n: Node, parent?: Node) {
  n.parent = parent; byId.set(n.id, n); n.children?.forEach(c => index(c, n));
})(root);

export const getNode = (id: string) => byId.get(id);
export function chain(id: string): Node[] {
  const out: Node[] = [];
  for (let n = byId.get(id); n; n = n.parent) out.unshift(n);
  return out;
}
const pitakaOf = (id: string) => chain(id)[1]?.id;
const nikayaOf = (id: string) => chain(id)[2]?.id;

// --- texts
const SUTTAS: Record<string, Sutta> = {
  u7: {
    id: 'u7', ref: 'Sn 1.8', trail: '', segs: SN_1_8,
    titleRoman: 'Karaṇīyamettasutta', titlePali: 'කරණීයමෙත්තසුත්තං', titleSi: 'කරණීය මෙත්ත සූත්‍රය',
    namo: ['Namo tassa bhagavato arahato sammāsambuddhassa', 'නමෝ තස්ස භගවතෝ අරහතෝ සම්මාසම්බුද්ධස්ස'],
    end: ['Mettasuttaṃ niṭṭhitaṃ', 'මෙත්තසුත්තං නිට්ඨිතං'],
  },
};
for (const s of Object.values(SUTTAS)) s.trail = chain(s.id).slice(2, -1).map(n => n.pali).join(' · ');

export const hasText = (id: string) => !!SUTTAS[id];
export const getSutta = (id: string): Sutta | undefined => SUTTAS[id];

/** Titles and citation for a saved item (bookmark, note, history row). */
export function describe(suttaId: string, segId?: string | null) {
  const n = byId.get(suttaId), s = SUTTAS[suttaId], seg = s?.segs.find(x => x.id === segId);
  return {
    pali: s?.titleRoman ?? n?.pali ?? suttaId, si: s?.titleSi ?? n?.si ?? '',
    ref: (s?.ref ?? n?.ref ?? '') + (seg ? ' · v' + seg.n : ''), seg, total: s?.segs.length ?? 0,
  };
}

/** Neighbouring suttas inside the same parent (vagga). */
export function neighbours(id: string) {
  const sibs = byId.get(id)?.parent?.children ?? [];
  const i = sibs.findIndex(n => n.id === id);
  return { prev: sibs[i - 1] as Node | undefined, next: sibs[i + 1] as Node | undefined };
}

// --- search. ponytail: linear scan of the sample; replace with FTS5 per pack.
export type LangFilter = 'all' | 'pali' | 'si' | 'en';
export type Hit = { sutta: Sutta; seg: Seg; field: 'roman' | 'pali' | 'si' | 'en'; pre: string; mid: string; post: string };
const FIELDS: Record<LangFilter, Hit['field'][]> = { all: ['roman', 'pali', 'si', 'en'], pali: ['roman', 'pali'], si: ['si'], en: ['en'] };

export function search(q: string, f: { lang: LangFilter; pitaka: string; nikaya: string }): Hit[] {
  if (!fold(q.trim())) return [];
  const hits: Hit[] = [];
  for (const sutta of Object.values(SUTTAS)) {
    if (f.pitaka !== 'all' && pitakaOf(sutta.id) !== f.pitaka) continue;
    if (f.pitaka === 'sutta' && f.nikaya !== 'all' && nikayaOf(sutta.id) !== f.nikaya) continue;
    for (const seg of sutta.segs) {
      for (const field of FIELDS[f.lang]) {
        const text = Array.isArray(seg[field]) ? (seg[field] as string[]).join(' ') : (seg[field] as string);
        const r = findFolded(text, q);
        if (!r) continue;
        const a = Array.from(text.normalize('NFC'));
        hits.push({ sutta, seg, field, pre: a.slice(0, r[0]).join(''), mid: a.slice(r[0], r[1]).join(''), post: a.slice(r[1]).join('') });
        break;
      }
    }
  }
  return hits;
}

// --- dictionary. ponytail: exact then folded key match on the sample glossary; replace with the dictionary pack.
export type Entry = { form: string; grammar: string; construction: string; en: string };
const DICT_F = new Map(Object.keys(DICT).map(k => [fold(k), k]));
export function lookup(word: string): Entry | undefined {
  const w = word.replace(/[,;.!?'"‘’“”—–-]/g, '').toLowerCase();
  const key = DICT[w] ? w : DICT_F.get(fold(w));
  return key ? { form: key, ...DICT[key] } : undefined;
}

// --- home
export type Verse = { ref: string; title: string; roman: string[]; si: string };
const DAILY: Verse[] = [{
  ref: 'Dhammapada 5 · Yamaka Vagga', title: 'Yamakavagga',
  roman: ['Na hi verena verāni,', 'sammantīdha kudācanaṃ;', 'Averena ca sammanti,', 'esa dhammo sanantano.'],
  si: 'මේ ලෝකයෙහි වෛරයෙන් වෛරයෝ කිසි කලෙකත් නොසංසිඳෙති. අවෛරයෙන්ම සංසිඳෙති. මෙය සනාතන ධර්මයයි.',
}];
export const todayVerse = (d = new Date()) => DAILY[Math.floor(d.getTime() / 864e5) % DAILY.length];

// --- packs. ponytail: static list; replace with manifest.json from GitHub Releases.
export type Pack = { id: string; name: string; si: string; mb: number };
export const PACKS: Pack[] = SAMPLE_PACKS;
