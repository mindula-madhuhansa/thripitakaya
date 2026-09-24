// Golden search queries against the built databases, using the app's own query builder (@thripitakaya/shared).
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { matchQuery } from '@thripitakaya/shared';
import { OUT } from './common.ts';

const dbs = [join(OUT, 'core.db'), ...readdirSync(join(OUT, 'packs')).map(f => join(OUT, 'packs', f))].map(f => new DatabaseSync(f, { readOnly: true }));
const find = (q: string, lang: 'all' | 'pali' | 'si' = 'all') => dbs.flatMap(db => db.prepare(
  `SELECT s.id, s.node_id FROM segment_fts JOIN segment s ON s.rowid = segment_fts.rowid WHERE segment_fts MATCH ? ORDER BY bm25(segment_fts) LIMIT 500`,
).all(matchQuery(q, lang)) as { id: string; node_id: string }[]);
const nodesOf = (q: string, lang?: 'all' | 'pali' | 'si') => new Set(find(q, lang).map(r => r.node_id));
const ids = (q: string, lang?: 'all' | 'pali' | 'si') => find(q, lang).map(r => r.id).sort().join();

// diacritics optional, prefix match. The Metta Sutta is Khp 9 ("mettañca sabbalokasmiṃ") and Snp 1.8 ("mettaṃ ca …")
const metta = nodesOf('sabbalokasmi manasa bhavaye');
assert.ok(metta.has('kn-snp-1-8') && metta.has('kn-khp-9'));
assert.ok(nodesOf('mettanca sabbalokasmi').has('kn-khp-9'));
assert.equal(ids('mettanca sabbalokasmi'), ids('mettañca sabbalokasmiṃ'));
// Pāḷi typed in Sinhala script finds the same passages as Roman
assert.equal(ids('මෙත්තඤ්ච සබ්බලොකස්මිං', 'pali'), ids('mettañca sabbalokasmiṃ', 'pali'));
// Sinhala translation: ZWJ in the query makes no difference
const withZwj = 'සූත්\u200Dරය', noZwj = 'සූත්රය';
assert.ok(find(withZwj, 'si').length > 0, 'Sinhala query finds something');
assert.equal(ids(withZwj, 'si'), ids(noZwj, 'si'));
// refuge formula, DN 1 by title, Dhammapada verse 5
assert.ok(nodesOf('buddham saranam gacchami').has('kn-khp-1'));
assert.ok(nodesOf('brahmajalasuttam').has('dn-1-1'));
assert.ok([...nodesOf('na hi verena verani')].some(n => n.startsWith('kn-dhp-1')));
// nonsense and punctuation-only queries return nothing, without throwing
assert.equal(find('zzqxw').length, 0);
assert.equal(matchQuery(' .,; ', 'all'), '');

console.log('golden queries: ok');
