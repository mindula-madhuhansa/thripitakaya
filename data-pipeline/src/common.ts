import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const ROOT = join(import.meta.dirname, '..');
export const CACHE = join(ROOT, 'cache');
export const OUT = join(ROOT, 'out');
export const LOCK = join(ROOT, 'sources.lock.json');

export type Lock = { tipitakaLk: { repo: string; commit: string; date: string; files: Record<string, string> } };
export const readLock = (): Lock | undefined => existsSync(LOCK) ? JSON.parse(readFileSync(LOCK, 'utf8')) : undefined;
export const cacheDir = (commit: string) => join(CACHE, 'tipitaka.lk', commit);

/** Mūla text files only: no atta-* (commentaries), no anya-* (Visuddhimagga, not Tipiṭaka). */
export const isMulaText = (name: string) => /^(vp|dn|mn|sn|an|kn|ap)-[a-z0-9-]*\.json$/.test(name);

// --- upstream shapes (tipitaka.lk public/static)
export type Entry = { type: string; text: string; level?: number };
export type Side = { entries: Entry[]; footnotes: Entry[] };
export type Page = { pageNum: number; pali: Side; sinh?: Side };
export type TextFile = { filename: string; bookId: number; pageOffset: number; collection: string; pages: Page[] };
/** tree.json value: [title pali, title sinhala, level, [page index, entry index], parent key, file] */
export type TreeRow = [string, string, number, [number, number], string, string];

/** Loads the pinned sources from the cache. */
export function loadSources() {
  const lock = readLock();
  if (!lock) throw new Error('No sources.lock.json. Run: npm run fetch');
  const dir = cacheDir(lock.tipitakaLk.commit);
  const read = (name: string) => JSON.parse(readFileSync(join(dir, name), 'utf8'));
  const tree: Record<string, TreeRow> = read('tree.json');
  const files = new Map<string, TextFile>();
  for (const name of Object.keys(lock.tipitakaLk.files).filter(isMulaText).sort()) files.set(name.replace(/\.json$/, ''), read(name));
  return { lock, tree, files };
}

/** Pack that holds a text file's segments. The starter texts ship inside the app (core). */
export function packOf(file: string) {
  if (/^kn-(khp|dhp|snp)(-|$)/.test(file)) return 'core';
  const p = file.split('-')[0];
  return ({ vp: 'vin', ap: 'abhi' } as Record<string, string>)[p] ?? p;
}
