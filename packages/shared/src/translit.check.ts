// Run: npm run check (repo root). The pipeline's verify step also round-trips every stored segment.
import assert from 'node:assert/strict';
import { toRoman, toSinhala } from './translit.ts';

const cases: [string, string][] = [
  ['බුද්ධං සරණං ගච්ඡාමි.', 'buddhaṃ saraṇaṃ gacchāmi.'],
  ['මෙත්තඤ්ච සබ්බලොකස්මිං', 'mettañca sabbalokasmiṃ'],
  ['භික්ඛූනං', 'bhikkhūnaṃ'],
  ['නමො තස්ස භගවතො අරහතො සම්මාසම්බුද්ධස්ස.', 'namo tassa bhagavato arahato sammāsambuddhassa.'],
  ['අථ ඛො', 'atha kho'],
  ['තණ්හා', 'taṇhā'],
  ['3. එවං මෙ සුතං', '3. evaṃ me sutaṃ'],
];
for (const [si, ro] of cases) {
  assert.equal(toRoman(si), ro);
  assert.equal(toSinhala(ro), si);
}
assert.equal(toRoman('උපවදෙය්\u200Dයුං'), 'upavadeyyuṃ');   // ZWJ dropped
assert.equal(toRoman('සබ්හි'), 'sab·hi');                     // b+h cluster ≠ aspirate bh
assert.equal(toSinhala('sab·hi'), 'සබ්හි');
assert.equal(toSinhala('saṁvaro'), 'සංවරො');                // ṁ accepted
assert.equal(toSinhala(toRoman('{1} **ක**')), '{1} **ක**');  // markup and unknowns pass through
assert.equal(toSinhala(toRoman('සති{a} $අ$')), 'සති{a} $අ$'); // footnote letters stay Latin

import { withZwj } from './translit.ts';
assert.equal(withZwj('බ්රහ්ම'), 'බ්\u200Dරහ්ම');                // rakāransaya
assert.equal(withZwj('උපවදෙය්යුං'), 'උපවදෙය්\u200Dයුං');        // yansaya
assert.equal(withZwj('සත්ථා'), 'සත්ථා');                         // other clusters untouched

console.log('translit: ok');
