// Downloads tipitaka.lk Mūla texts + tree.json at the commit pinned in sources.lock.json.
//   node src/fetch.ts            use the pinned commit (first run pins upstream HEAD)
//   node src/fetch.ts --update   move the pin to upstream HEAD
// Only 192 of the repo's files are fetched (~176 MB), never the whole repository.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cacheDir, isMulaText, LOCK, readLock, type Lock } from './common.ts';

const REPO = 'pathnirvana/tipitaka.lk';
const gh = (path: string) => fetch(`https://api.github.com/repos/${REPO}/${path}`, {
  headers: process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {},
}).then(r => { if (!r.ok) throw new Error(`GitHub API ${r.status} for ${path}`); return r.json() as Promise<any>; });
const sha256 = (b: Buffer) => createHash('sha256').update(b).digest('hex');

const old = readLock();
const update = process.argv.includes('--update') || !old;
const head = update ? await gh('commits/master') : undefined;
const commit: string = head?.sha ?? old!.tipitakaLk.commit;
const date: string = head?.commit.committer.date ?? old!.tipitakaLk.date;

const tree = await gh(`git/trees/${commit}?recursive=1`);
const paths: string[] = tree.tree
  .filter((x: any) => x.type === 'blob' && x.path.startsWith('public/static/text/') && isMulaText(x.path.split('/').pop()))
  .map((x: any) => x.path).concat('public/static/data/tree.json').sort();

const dir = cacheDir(commit);
mkdirSync(dir, { recursive: true });
const pinned = !update ? old!.tipitakaLk.files : {};
const files: Record<string, string> = {};
let fetched = 0;

async function get(path: string) {
  const name = path.split('/').pop()!, file = join(dir, name);
  let buf = existsSync(file) ? readFileSync(file) : undefined;
  if (!buf) {
    const r = await fetch(`https://raw.githubusercontent.com/${REPO}/${commit}/${path}`);
    if (!r.ok) throw new Error(`${r.status} ${path}`);
    buf = Buffer.from(await r.arrayBuffer());
    writeFileSync(file, buf);
    fetched++;
  }
  const h = sha256(buf);
  if (pinned[name] && pinned[name] !== h) throw new Error(`${name}: sha256 differs from sources.lock.json at the same commit`);
  files[name] = h;
}

const queue = [...paths];
await Promise.all(Array.from({ length: 8 }, async () => { for (let p; (p = queue.shift());) await get(p); }));

const lock: Lock = { tipitakaLk: { repo: REPO, commit, date, files: Object.fromEntries(Object.entries(files).sort()) } };
writeFileSync(LOCK, JSON.stringify(lock, null, 2) + '\n');
const changed = old?.tipitakaLk.commit !== commit;
console.log(`tipitaka.lk @ ${commit.slice(0, 7)} (${date.slice(0, 10)}): ${paths.length} files, ${fetched} downloaded${changed ? ' · pin moved' : ''}`);
