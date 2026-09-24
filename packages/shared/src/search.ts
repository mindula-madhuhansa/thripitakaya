// FTS5 MATCH expression for segment_fts (columns pali_f = folded Roman Pāḷi, sinh_f = folded Sinhala).
// Shared so the app and the pipeline's golden-query test run the exact same query text.
import { fold } from './fold.ts';
import { toRoman } from './translit.ts';

export const isSinhala = (s: string) => [...s].some(c => c.charCodeAt(0) >= 0x0d80 && c.charCodeAt(0) <= 0x0dff);
const terms = (s: string) => s.split(/[\s.,;:!?'"‘’“”()[\]{}*\-–—…]+/).filter(Boolean).map(t => `"${t.replace(/"/g, '')}"*`).join(' ');

/** Every word must match as a prefix ("metta" finds "mettā", "mettañca"). A Pāḷi query may be typed in either
 *  script; the Sinhala column is searched only for Sinhala-script input. '' when there is nothing to search. */
export function matchQuery(q: string, lang: 'all' | 'pali' | 'si'): string {
  const parts: string[] = [], pali = terms(fold(toRoman(q))), si = terms(fold(q));
  if (lang !== 'si' && pali) parts.push(`pali_f : (${pali})`);
  if (lang !== 'pali' && isSinhala(q) && si) parts.push(`sinh_f : (${si})`);
  return parts.join(' OR ');
}
