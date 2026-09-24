// user.db: the only file holding personal data. Never replaced by a pack update.
import { openDatabaseSync } from 'expo-sqlite';
import { useSyncExternalStore } from 'react';

const db = openDatabaseSync('user.db');
db.execSync(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS bookmark  (id INTEGER PRIMARY KEY, seg_id TEXT, sutta_id TEXT NOT NULL, snippet TEXT, created_at INTEGER);
CREATE UNIQUE INDEX IF NOT EXISTS bookmark_u ON bookmark(sutta_id, ifnull(seg_id, ''));
CREATE TABLE IF NOT EXISTS highlight (id INTEGER PRIMARY KEY, seg_id TEXT NOT NULL UNIQUE, sutta_id TEXT NOT NULL, snippet TEXT, created_at INTEGER);
CREATE TABLE IF NOT EXISTS note      (id INTEGER PRIMARY KEY, seg_id TEXT NOT NULL UNIQUE, sutta_id TEXT NOT NULL, body TEXT NOT NULL, snippet TEXT, created_at INTEGER, updated_at INTEGER);
CREATE TABLE IF NOT EXISTS history   (sutta_id TEXT PRIMARY KEY, last_seg_id TEXT, progress REAL, opened_at INTEGER);
CREATE TABLE IF NOT EXISTS saved_word(form TEXT PRIMARY KEY, created_at INTEGER);
CREATE TABLE IF NOT EXISTS recent_search (q TEXT PRIMARY KEY, at INTEGER);
CREATE TABLE IF NOT EXISTS setting   (key TEXT PRIMARY KEY, value TEXT);
`);

// --- change notification: every write bumps a version, hooks re-render and re-read (reads are sync and tiny)
let version = 0;
const subs = new Set<() => void>();
const bump = () => { version++; subs.forEach(f => f()); };
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const useUserData = () => useSyncExternalStore(subscribe, () => version);

// --- settings
export type Settings = {
  onboarded: boolean; theme: 'paper' | 'night'; lang: 'si' | 'both' | 'en';
  fontStep: number; lhStep: number; mode: 'pali' | 'trans' | 'line' | 'side';
  script: 'roman' | 'sinhala'; siFont: 'noto' | 'abhaya'; paFont: 'gentium' | 'noto'; tip: boolean;
};
const DEFAULTS: Settings = {
  onboarded: false, theme: 'paper', lang: 'si', fontStep: 1, lhStep: 1, mode: 'line',
  script: 'roman', siFont: 'noto', paFont: 'gentium', tip: true,
};
let settings: Settings = { ...DEFAULTS };
for (const r of db.getAllSync<{ key: string; value: string }>('SELECT key, value FROM setting')) {
  if (r.key in DEFAULTS) (settings as any)[r.key] = JSON.parse(r.value);
}
export function setSettings(patch: Partial<Settings>) {
  settings = { ...settings, ...patch };
  for (const [k, v] of Object.entries(patch)) db.runSync('INSERT OR REPLACE INTO setting VALUES (?, ?)', k, JSON.stringify(v));
  bump();
}
export const useSettings = () => { useUserData(); return settings; };

// --- bookmarks (seg_id null = whole sutta)
export function toggleBookmark(suttaId: string, segId: string | null, snippet = '') {
  const on = isBookmarked(suttaId, segId);
  if (on) db.runSync(`DELETE FROM bookmark WHERE sutta_id = ? AND ifnull(seg_id, '') = ?`, suttaId, segId ?? '');
  else db.runSync('INSERT INTO bookmark (seg_id, sutta_id, snippet, created_at) VALUES (?, ?, ?, ?)', segId, suttaId, snippet, Date.now());
  bump();
  return !on;
}
export const isBookmarked = (suttaId: string, segId: string | null) =>
  !!db.getFirstSync(`SELECT 1 FROM bookmark WHERE sutta_id = ? AND ifnull(seg_id, '') = ?`, suttaId, segId ?? '');
export type Bookmark = { id: number; seg_id: string | null; sutta_id: string; snippet: string; created_at: number };
export const listBookmarks = () => db.getAllSync<Bookmark>('SELECT * FROM bookmark ORDER BY created_at DESC');

// --- highlights
export function toggleHighlight(suttaId: string, segId: string, snippet = '') {
  const r = db.runSync('DELETE FROM highlight WHERE seg_id = ?', segId);
  if (!r.changes) db.runSync('INSERT INTO highlight (seg_id, sutta_id, snippet, created_at) VALUES (?, ?, ?, ?)', segId, suttaId, snippet, Date.now());
  bump();
  return !r.changes;
}
export type Highlight = { id: number; seg_id: string; sutta_id: string; snippet: string; created_at: number };
export const listHighlights = () => db.getAllSync<Highlight>('SELECT * FROM highlight ORDER BY created_at DESC');

// --- notes (one per segment; empty body deletes)
export function saveNote(suttaId: string, segId: string, body: string, snippet = '') {
  const t = body.trim(), now = Date.now();
  if (!t) db.runSync('DELETE FROM note WHERE seg_id = ?', segId);
  else db.runSync(
    `INSERT INTO note (seg_id, sutta_id, body, snippet, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(seg_id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at`,
    segId, suttaId, t, snippet, now, now);
  bump();
}
export type Note = { id: number; seg_id: string; sutta_id: string; body: string; snippet: string; updated_at: number };
export const listNotes = () => db.getAllSync<Note>('SELECT * FROM note ORDER BY updated_at DESC');

// --- history / progress (reader calls this when the visible verse changes, not per frame)
export function recordHistory(suttaId: string, segId: string | null, progress: number) {
  db.runSync('INSERT OR REPLACE INTO history VALUES (?, ?, ?, ?)', suttaId, segId, progress, Date.now());
  bump();
}
export type History = { sutta_id: string; last_seg_id: string | null; progress: number; opened_at: number };
export const listHistory = () => db.getAllSync<History>('SELECT * FROM history ORDER BY opened_at DESC LIMIT 100');

// --- words and searches
export function saveWord(form: string) { db.runSync('INSERT OR REPLACE INTO saved_word VALUES (?, ?)', form, Date.now()); bump(); }
export function addRecentSearch(q: string) {
  if (!q.trim()) return;
  db.runSync('INSERT OR REPLACE INTO recent_search VALUES (?, ?)', q.trim(), Date.now());
  db.runSync('DELETE FROM recent_search WHERE q NOT IN (SELECT q FROM recent_search ORDER BY at DESC LIMIT 8)');
  bump();
}
export const recentSearches = () => db.getAllSync<{ q: string }>('SELECT q FROM recent_search ORDER BY at DESC').map(r => r.q);
