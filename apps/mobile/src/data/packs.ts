// Downloadable text packs: one SQLite file per collection, published as GitHub Release assets with manifest.json.
// Install = download .db.gz → check sha256 → gunzip in chunks to a cache file → expo-sqlite copies it into its own
// database folder. expo-sqlite does that copy natively, so we never convert between file URIs and SQLite paths
// (Expo Go's percent-encoded folder names made hand conversion open an empty database at the wrong path).
import { useSyncExternalStore } from 'react';
import { Directory, File, Paths } from 'expo-file-system';
import { deleteDatabaseSync, importDatabaseFromAssetAsync, openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
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

// --- installed packs: recorded in expo-sqlite's key-value store, never inferred from file paths
type Installed = Record<string, { version: string; bytes: number }>;
const KEY = 'installed-packs';
let installed: Installed = JSON.parse(Storage.getItemSync(KEY) ?? '{}');
const save = () => Storage.setItemSync(KEY, JSON.stringify(installed));
const dbName = (id: string) => `pack-${id}.db`;
const open = new Map<string, SQLiteDatabase>();

// the first build kept packs under documents/packs; that location is no longer used
try { const old = new Directory(Paths.document, 'packs'); if (old.exists) old.delete(); } catch { /* nothing to clean */ }

export const isInstalled = (id: string) => id in installed;
export const installedVersion = (id: string) => installed[id]?.version;
export const installedBytes = () => Object.values(installed).reduce((s, p) => s + p.bytes, 0);

export function packDb(id: string): SQLiteDatabase | undefined {
  if (!isInstalled(id)) return;
  let db = open.get(id);
  if (!db) {
    db = openDatabaseSync(dbName(id));
    if (!db.getFirstSync(`SELECT 1 FROM sqlite_master WHERE name = 'segment'`)) {
      // missing or damaged file: forget it so Settings offers the download again, rather than crashing
      db.closeSync(); try { deleteDatabaseSync(dbName(id)); } catch { /* already gone */ }
      delete installed[id]; save();
      set({ error: `${id}: the downloaded file was damaged, please download it again` });
      return;
    }
    open.set(id, db);
  }
  return db;
}

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
  const gz = new File(Paths.cache, `${id}.db.gz`), tmp = new File(Paths.cache, `${id}.db`);
  try {
    const m = state.manifest ?? await loadManifest();
    const p = m.packs.find(x => x.id === id);
    if (!p) throw new Error('Not in the latest release');
    if (p.schema_version > SCHEMA_VERSION) throw new Error('Update the app to get this text');

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

    // swap in: close the old copy, then let expo-sqlite copy the new file into its database folder
    open.get(id)?.closeSync(); open.delete(id);
    await importDatabaseFromAssetAsync(dbName(id), { assetId: tmp.uri as unknown as number, forceOverwrite: true });
    installed[id] = { version: p.version, bytes: p.db_bytes }; save();
    set({ error: undefined });
  } catch (e) {
    set({ error: `${id}: ${(e as Error).message}` });
    throw e;
  } finally {
    if (gz.exists) gz.delete();
    if (tmp.exists) tmp.delete();
    progress(id, undefined);
  }
}

export function remove(id: string) {
  open.get(id)?.closeSync(); open.delete(id);
  try { deleteDatabaseSync(dbName(id)); } catch { /* already gone */ }
  delete installed[id]; save();
  set({});
}
