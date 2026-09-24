// Downloadable text packs: one SQLite file per collection, published as GitHub Release assets with manifest.json.
// Install = download .db.gz → check sha256 → gunzip in chunks to <id>.db.tmp → swap in. The old pack stays usable
// until the new one is complete, so a failed or cancelled download never leaves a broken pack.
import { useSyncExternalStore } from 'react';
import { Directory, File, Paths } from 'expo-file-system';
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Gunzip } from 'fflate';

const RELEASES = 'https://github.com/mindula-madhuhansa/thripitakaya/releases/latest/download/';
export const SCHEMA_VERSION = 1;

export const PACKS = [
  { id: 'dn', name: 'Dīgha Nikāya', si: 'දීඝ නිකාය' },
  { id: 'mn', name: 'Majjhima Nikāya', si: 'මජ්ඣිම නිකාය' },
  { id: 'sn', name: 'Saṃyutta Nikāya', si: 'සංයුත්ත නිකාය' },
  { id: 'an', name: 'Aṅguttara Nikāya', si: 'අංගුත්තර නිකාය' },
  { id: 'kn', name: 'Khuddaka Nikāya', si: 'ඛුද්දක නිකාය' },
  { id: 'vin', name: 'Vinaya Piṭaka', si: 'විනය පිටකය' },
  { id: 'abhi', name: 'Abhidhamma Piṭaka', si: 'අභිධර්ම පිටකය' },
];
export type ManifestPack = { id: string; version: string; schema_version: number; file: string; bytes: number; sha256: string; db_bytes: number };
export type Manifest = { version: string; packs: ManifestPack[] };

// --- state for the UI (manifest, per-pack progress 0..1, last error)
type State = { manifest?: Manifest; progress: Record<string, number>; error?: string; v: number };
let state: State = { progress: {}, v: 0 };
const subs = new Set<() => void>();
const set = (patch: Partial<State>) => { state = { ...state, ...patch, v: state.v + 1 }; subs.forEach(f => f()); };
export const usePacks = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, () => state);

// --- files
const DIR = new Directory(Paths.document, 'packs');
const dirPath = () => decodeURIComponent(DIR.uri.replace(/^file:\/\//, ''));
const dbFile = (id: string) => new File(DIR, `${id}.db`);
const open = new Map<string, SQLiteDatabase>();

export const isInstalled = (id: string) => dbFile(id).exists;
export function packDb(id: string): SQLiteDatabase | undefined {
  if (!isInstalled(id)) return;
  let db = open.get(id);
  if (!db) { db = openDatabaseSync(`${id}.db`, {}, dirPath()); open.set(id, db); }
  return db;
}
export const installedVersion = (id: string) =>
  packDb(id)?.getFirstSync<{ value: string }>(`SELECT value FROM meta WHERE key = 'version'`)?.value;
export const installedBytes = () => PACKS.reduce((s, p) => s + (isInstalled(p.id) ? dbFile(p.id).size : 0), 0);

// --- network: a plain GET, no identifiers sent
export async function loadManifest(): Promise<Manifest> {
  const r = await fetch(RELEASES + 'manifest.json');
  if (!r.ok) throw new Error(`manifest ${r.status}`);
  const manifest: Manifest = await r.json();
  set({ manifest });
  return manifest;
}

const progress = (id: string, p: number | undefined) => {
  const next = { ...state.progress };
  if (p == null) delete next[id]; else next[id] = p;
  set({ progress: next });
};
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('');

export async function install(id: string) {
  if (id in state.progress) return;
  progress(id, 0);
  const gz = new File(Paths.cache, `${id}.db.gz`), tmp = new File(DIR, `${id}.db.tmp`);
  try {
    const m = state.manifest ?? await loadManifest();
    const p = m.packs.find(x => x.id === id);
    if (!p) throw new Error('Not in the latest release');
    if (p.schema_version > SCHEMA_VERSION) throw new Error('Update the app to get this text');
    DIR.create({ intermediates: true, idempotent: true });

    await File.downloadFileAsync(RELEASES + p.file, gz, {
      idempotent: true, onProgress: ({ bytesWritten, totalBytes }) => progress(id, 0.9 * bytesWritten / (totalBytes > 0 ? totalBytes : p.bytes)),
    });
    const bytes = await gz.bytes();
    if (hex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes)) !== p.sha256) throw new Error('Download damaged, please try again');

    if (tmp.exists) tmp.delete();
    tmp.create();
    const h = tmp.open();
    const g = new Gunzip(chunk => h.writeBytes(chunk));
    const CHUNK = 1 << 20;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      g.push(bytes.subarray(i, i + CHUNK), i + CHUNK >= bytes.length);
      progress(id, 0.9 + 0.1 * i / bytes.length);
      await new Promise(r => setTimeout(r, 0)); // let the UI breathe between chunks
    }
    h.close();

    open.get(id)?.closeSync(); open.delete(id);
    tmp.moveSync(dbFile(id), { overwrite: true });
    set({ error: undefined });
  } catch (e) {
    if (tmp.exists) tmp.delete();
    set({ error: `${id}: ${(e as Error).message}` });
    throw e;
  } finally {
    if (gz.exists) gz.delete();
    progress(id, undefined);
  }
}

export function remove(id: string) {
  open.get(id)?.closeSync(); open.delete(id);
  if (isInstalled(id)) dbFile(id).delete();
  set({});
}
