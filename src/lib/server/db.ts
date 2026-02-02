import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const DB_PATH = process.env.DB_PATH ?? join(process.cwd(), 'data', 'image-edit-ai.db');
const MAX_SAVES = 200;
const MAX_VERSIONS = 500;

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;
  const dir = join(process.cwd(), 'data');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS saves (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      label TEXT,
      state_json TEXT NOT NULL,
      prompt_used TEXT,
      edit_history TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_saves_created_at ON saves(created_at DESC);

    CREATE TABLE IF NOT EXISTS versions (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      state_json TEXT NOT NULL,
      prompt_used TEXT,
      edit_history TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_versions_created_at ON versions(created_at DESC);
  `);
  try {
    db.exec('ALTER TABLE saves ADD COLUMN prompt_used TEXT');
  } catch {
    /* column may already exist */
  }
  try {
    db.exec('ALTER TABLE saves ADD COLUMN edit_history TEXT');
  } catch {
    /* column may already exist */
  }
  try {
    db.exec('ALTER TABLE versions ADD COLUMN prompt_used TEXT');
  } catch {
    /* column may already exist */
  }
  try {
    db.exec('ALTER TABLE versions ADD COLUMN edit_history TEXT');
  } catch {
    /* column may already exist */
  }
  return db;
}

export interface StateSnapshot {
  canvas: { imageUrl: string | null; x: number; y: number; scale: number; rotation: number; opacity: number };
  elements: { mainImage: string | null; elementList: unknown[]; selectedElement: string | null };
}

export function insertSave(
  label: string | undefined,
  state: StateSnapshot,
  meta?: { promptUsed?: string | null; editHistory?: string[] }
): { id: string; createdAt: number } {
  const id = `save-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const createdAt = Date.now();
  const promptUsed = meta?.promptUsed ?? null;
  const editHistoryJson = meta?.editHistory?.length ? JSON.stringify(meta.editHistory) : null;
  const stmt = getDb().prepare(
    'INSERT INTO saves (id, created_at, label, state_json, prompt_used, edit_history) VALUES (?, ?, ?, ?, ?, ?)'
  );
  stmt.run(id, createdAt, label ?? null, JSON.stringify(state), promptUsed, editHistoryJson);

  const count = getDb().prepare('SELECT COUNT(*) as c FROM saves').get() as { c: number };
  if (count.c > MAX_SAVES) {
    const toDelete = getDb()
      .prepare('SELECT id FROM saves ORDER BY created_at ASC LIMIT ?')
      .all(count.c - MAX_SAVES) as { id: string }[];
    const del = getDb().prepare('DELETE FROM saves WHERE id = ?');
    toDelete.forEach((r) => del.run(r.id));
  }
  return { id, createdAt };
}

export function listSaves(): {
  id: string;
  createdAt: number;
  label: string | null;
  promptUsed: string | null;
  editHistory: string[] | null;
}[] {
  const rows = getDb()
    .prepare('SELECT id, created_at, label, prompt_used, edit_history FROM saves ORDER BY created_at DESC LIMIT ?')
    .all(MAX_SAVES) as {
      id: string;
      created_at: number;
      label: string | null;
      prompt_used: string | null;
      edit_history: string | null;
    }[];
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    label: r.label,
    promptUsed: r.prompt_used,
    editHistory: r.edit_history ? (JSON.parse(r.edit_history) as string[]) : null
  }));
}

export function getSave(id: string): (StateSnapshot & { promptUsed?: string | null; editHistory?: string[] | null }) | null {
  const row = getDb()
    .prepare('SELECT state_json, prompt_used, edit_history FROM saves WHERE id = ?')
    .get(id) as { state_json: string; prompt_used: string | null; edit_history: string | null } | undefined;
  if (!row) return null;
  const state = JSON.parse(row.state_json) as StateSnapshot;
  return {
    ...state,
    promptUsed: row.prompt_used,
    editHistory: row.edit_history ? (JSON.parse(row.edit_history) as string[]) : null
  };
}

export function insertVersion(
  state: StateSnapshot,
  meta?: { promptUsed?: string | null; editHistory?: string[] }
): { id: string; createdAt: number } {
  const id = `ver-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const createdAt = Date.now();
  const promptUsed = meta?.promptUsed ?? null;
  const editHistoryJson = meta?.editHistory?.length ? JSON.stringify(meta.editHistory) : null;
  const stmt = getDb().prepare(
    'INSERT INTO versions (id, created_at, state_json, prompt_used, edit_history) VALUES (?, ?, ?, ?, ?)'
  );
  stmt.run(id, createdAt, JSON.stringify(state), promptUsed, editHistoryJson);

  const count = getDb().prepare('SELECT COUNT(*) as c FROM versions').get() as { c: number };
  if (count.c > MAX_VERSIONS) {
    const toDelete = getDb()
      .prepare('SELECT id FROM versions ORDER BY created_at ASC LIMIT ?')
      .all(count.c - MAX_VERSIONS) as { id: string }[];
    const del = getDb().prepare('DELETE FROM versions WHERE id = ?');
    toDelete.forEach((r) => del.run(r.id));
  }
  return { id, createdAt };
}

export function listVersions(): {
  id: string;
  createdAt: number;
  promptUsed: string | null;
  editHistory: string[] | null;
}[] {
  const rows = getDb()
    .prepare('SELECT id, created_at, prompt_used, edit_history FROM versions ORDER BY created_at DESC LIMIT ?')
    .all(MAX_VERSIONS) as {
      id: string;
      created_at: number;
      prompt_used: string | null;
      edit_history: string | null;
    }[];
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    promptUsed: r.prompt_used,
    editHistory: r.edit_history ? (JSON.parse(r.edit_history) as string[]) : null
  }));
}

export function getVersion(id: string): (StateSnapshot & { promptUsed?: string | null; editHistory?: string[] | null }) | null {
  const row = getDb()
    .prepare('SELECT state_json, prompt_used, edit_history FROM versions WHERE id = ?')
    .get(id) as { state_json: string; prompt_used: string | null; edit_history: string | null } | undefined;
  if (!row) return null;
  const state = JSON.parse(row.state_json) as StateSnapshot;
  return {
    ...state,
    promptUsed: row.prompt_used,
    editHistory: row.edit_history ? (JSON.parse(row.edit_history) as string[]) : null
  };
}
