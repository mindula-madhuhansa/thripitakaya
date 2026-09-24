// Run: npm run check (repo root)
import assert from 'node:assert/strict';
import { fold, findFolded } from './fold.ts';

assert.equal(fold('Mettā'), 'metta');
assert.equal(fold('saṁvaro'), fold('saṃvaro'));
assert.equal(fold('ප්\u200Dරඥා'), fold('ප්රඥා'));            // ZWJ ignored
assert.equal(fold('ඛේමිනෝ'), fold('ඛෙමිනො'));          // long/short e, o
assert.equal(fold('ā'), 'a');                       // NFD input

const t = 'Mettañca sabbalokasmi, mānasaṃ';
const r = findFolded(t, 'manasam');
assert.deepEqual(r, [23, 30]);
assert.equal(Array.from(t).slice(...r!).join(''), 'mānasaṃ');
assert.equal(findFolded(t, 'nibbana'), null);
assert.equal(findFolded(t, '   '), null);

console.log('fold: ok');
