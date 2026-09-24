// Search folding. Pure TS with no RN imports, so the data build can share it.
// Applied to search columns and queries only. Displayed text is never changed.

const SI: Record<string, string> = { '\u0DDA': '\u0DD9', '\u0DDD': '\u0DDC' }; // ේ→ෙ, ෝ→ො

/** Fold one character: NFC input char → search form ('' when it vanishes). */
export function foldChar(c: string): string {
  if (c === '\u200D' || c === '\u200C') return ''; // ZWJ / ZWNJ
  // Long→short first, then NFD, so ෝ, ො and ෙ+ා all end up as the same sequence.
  return (SI[c] ?? c).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export const fold = (s: string) => Array.from(s.normalize('NFC')).map(foldChar).join('');

/** Find folded `q` in `text`; returns [start, end) in `text`'s code points, or null. */
export function findFolded(text: string, q: string): [number, number] | null {
  const fq = fold(q.trim());
  if (!fq) return null;
  const chars = Array.from(text.normalize('NFC'));
  let folded = '';
  const at: number[] = []; // folded UTF-16 index → original char index
  chars.forEach((c, i) => { const f = foldChar(c); for (let k = 0; k < f.length; k++) at.push(i); folded += f; });
  const idx = folded.indexOf(fq);
  if (idx < 0) return null;
  return [at[idx], at[idx + fq.length - 1] + 1];
}
