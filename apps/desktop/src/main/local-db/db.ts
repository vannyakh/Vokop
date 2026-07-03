/**
 * SQLite connection via node:sqlite (Node 22 built-in).
 * Opens / creates the app database at userData/vokop.db.
 */

import { DatabaseSync } from 'node:sqlite';
import { app } from 'electron';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

let _db: DatabaseSync | null = null;

export function openDb(): DatabaseSync {
  if (_db) return _db;

  const dataDir = app.getPath('userData');
  mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, 'vokop.db');

  _db = new DatabaseSync(dbPath);
  _db.exec('PRAGMA journal_mode=WAL;');
  _db.exec('PRAGMA foreign_keys=ON;');

  runMigrations(_db);
  return _db;
}

export function getDb(): DatabaseSync {
  if (!_db) throw new Error('DB not initialised — call openDb() first');
  return _db;
}

// ─── Migrations ───────────────────────────────────────────────────────────────

function runMigrations(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    );
  `);

  const versionRow = db
    .prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1')
    .get() as { version: number } | undefined;

  const current = versionRow?.version ?? 0;

  if (current < 1) {
    db.exec(`
      -- ── Projects ────────────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        aspect_ratio TEXT NOT NULL DEFAULT '16:9',
        duration_sec REAL NOT NULL DEFAULT 0,
        timeline_json TEXT NOT NULL DEFAULT '{}',
        version INTEGER NOT NULL DEFAULT 1,
        cloud_id TEXT,          -- remote project ID after first sync
        synced_at INTEGER,      -- Unix ms
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      -- ── Assets ─────────────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        kind TEXT NOT NULL CHECK(kind IN ('video','audio','image')),
        original_path TEXT NOT NULL,
        proxy_path TEXT,
        thumb_dir TEXT,
        waveform_path TEXT,
        duration_sec REAL,
        width INTEGER,
        height INTEGER,
        fps REAL,
        codec TEXT,
        size INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','ingesting','ready','error')),
        error TEXT,
        r2_key TEXT,            -- set after upload
        upload_offset INTEGER,  -- for resumable uploads
        cloud_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_id);

      -- ── Op log ─────────────────────────────────────────────────────────
      -- Append-only ledger for cloud sync (LWW / last-write-wins).
      CREATE TABLE IF NOT EXISTS op_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        op_id TEXT NOT NULL UNIQUE,      -- UUID
        entity TEXT NOT NULL,            -- 'project' | 'asset'
        entity_id TEXT NOT NULL,
        op_type TEXT NOT NULL CHECK(op_type IN ('create','update','delete')),
        payload TEXT,                    -- JSON patch / full snapshot
        created_at INTEGER NOT NULL,
        synced_at INTEGER                -- NULL = pending sync
      );
      CREATE INDEX IF NOT EXISTS idx_oplog_pending ON op_log(synced_at) WHERE synced_at IS NULL;

      INSERT INTO schema_version(version) VALUES (1);
    `);
  }
}
