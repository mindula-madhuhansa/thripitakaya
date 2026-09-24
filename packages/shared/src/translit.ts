// Sinhala-script Pāḷi ↔ Roman (ṃ for niggahīta). Display and search only: stored text stays Sinhala script.
// Lossless by design: toSinhala(toRoman(x)) === x for ZWJ-free input. Unknown characters pass through both ways,
// and the rare long ේ/ෝ become ē/ō instead of being folded into e/o. A virama cluster that would read as an
// aspirate (බ්හ vs භ, both "bh") gets a middle dot: "b·h". Upstream has 8 such spots, all likely typos.

const CONS: [string, string][] = [
  ['ක', 'k'], ['ඛ', 'kh'], ['ග', 'g'], ['ඝ', 'gh'], ['ඞ', 'ṅ'],
  ['ච', 'c'], ['ඡ', 'ch'], ['ජ', 'j'], ['ඣ', 'jh'], ['ඤ', 'ñ'],
  ['ට', 'ṭ'], ['ඨ', 'ṭh'], ['ඩ', 'ḍ'], ['ඪ', 'ḍh'], ['ණ', 'ṇ'],
  ['ත', 't'], ['ථ', 'th'], ['ද', 'd'], ['ධ', 'dh'], ['න', 'n'],
  ['ප', 'p'], ['ඵ', 'ph'], ['බ', 'b'], ['භ', 'bh'], ['ම', 'm'],
  ['ය', 'y'], ['ර', 'r'], ['ල', 'l'], ['ව', 'v'], ['ස', 's'], ['හ', 'h'], ['ළ', 'ḷ'],
];
const VOWELS: [string, string][] = [['අ', 'a'], ['ආ', 'ā'], ['ඉ', 'i'], ['ඊ', 'ī'], ['උ', 'u'], ['ඌ', 'ū'], ['එ', 'e'], ['ඒ', 'ē'], ['ඔ', 'o'], ['ඕ', 'ō']];
const SIGNS: [string, string][] = [['ා', 'ā'], ['ි', 'i'], ['ී', 'ī'], ['ු', 'u'], ['ූ', 'ū'], ['ෙ', 'e'], ['ේ', 'ē'], ['ො', 'o'], ['ෝ', 'ō']];
const VIRAMA = '\u0DCA', NIGGAHITA = '\u0D82';
const ZW = /[\u200C\u200D]/g;

const S_CONS = new Map(CONS), S_VOW = new Map(VOWELS), S_SIGN = new Map(SIGNS);
const R_CONS = new Map(CONS.map(([s, r]) => [r, s])), R_VOW = new Map(VOWELS.map(([s, r]) => [r, s]));
const R_SIGN = new Map(SIGNS.map(([s, r]) => [r, s]));

/** Sinhala-script Pāḷi → Roman. ZWJ/ZWNJ (display-only joiners) are dropped. */
export function toRoman(s: string): string {
  const a = Array.from(s.replace(ZW, ''));
  let out = '';
  for (let i = 0; i < a.length; i++) {
    const c = a[i], k = S_CONS.get(c);
    if (k === undefined) { out += S_VOW.get(c) ?? (c === NIGGAHITA ? 'ṃ' : c); continue; }
    const n = a[i + 1];
    if (n === VIRAMA) { out += k; i++; if (a[i + 1] === 'හ' && R_CONS.has(k + 'h')) out += '·'; }
    else if (S_SIGN.has(n)) { out += k + S_SIGN.get(n); i++; }
    else out += k + 'a';
  }
  return out;
}

/** Roman Pāḷi → Sinhala script (no ZWJ; add those at display time). Accepts ṁ as ṃ.
 *  Footnote markers like {a} or {12} are copied as-is (they are markup, not Pāḷi). */
export function toSinhala(r: string): string {
  const s = r.normalize('NFC').replace(/ṁ/g, 'ṃ');
  let out = '';
  for (let i = 0; i < s.length;) {
    if (s[i] === '{') { const j = s.indexOf('}', i); if (j > 0) { out += s.slice(i, j + 1); i = j + 1; continue; } }
    const two = s.slice(i, i + 2);
    const cons = R_CONS.has(two) ? two : R_CONS.has(s[i]) ? s[i] : '';
    if (cons) {
      out += R_CONS.get(cons);
      i += cons.length;
      const v = s[i];
      if (v === 'a') i++;
      else if (R_SIGN.has(v)) { out += R_SIGN.get(v); i++; }
      else out += VIRAMA;
    } else {
      if (s[i] === '·' && out.endsWith(VIRAMA)) { i++; continue; }   // cluster separator, see toRoman
      out += R_VOW.get(s[i]) ?? (s[i] === 'ṃ' ? NIGGAHITA : s[i]);
      i++;
    }
  }
  return out;
}

/** Display-time joiners for Sinhala-script Pāḷi, which upstream stores without ZWJ: rakāransaya (ප්‍ර) and
 *  yansaya (ය්‍ය) get consonant + virama + ZWJ. Touching letters (bandi) are not joined yet. Display only. */
export const withZwj = (s: string) => s.replace(/([\u0D9A-\u0DC6]\u0DCA)([\u0DBA\u0DBB])/g, '$1\u200D$2');
