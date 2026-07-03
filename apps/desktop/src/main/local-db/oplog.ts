/**
 * Append-only operation log for conflict-free cloud sync.
 * Each write to projects/assets appends an op entry.
 * The sync push reads all un-synced ops and submits them to the API.
 * After a successful sync, ops are marked synced_at.
 */

import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

export type OpEntity = 'project' | 'asset';
export type OpType = 'create' | 'update' | 'delete';

export interface OpLogEntry {
  id: number;
  opId: string;
  entity: OpEntity;
  entityId: string;
  opType: OpType;
  payload: unknown | null;
  createdAt: number;
  syncedAt: number | null;
}

function rowToOp(row: Record<string, unknown>): OpLogEntry {
  return {
    id: row.id as number,
    opId: row.op_id as string,
    entity: row.entity as OpEntity,
    entityId: row.entity_id as string,
    opType: row.op_type as OpType,
    payload: row.payload ? JSON.parse(row.payload as string) : null,
    createdAt: row.created_at as number,
    syncedAt: (row.synced_at as number | null) ?? null,
  };
}

export function appendOpLog(
  db: DatabaseSync,
  input: { entity: OpEntity; entityId: string; opType: OpType; payload: unknown | null },
): void {
  const opId = randomUUID();
  db.prepare(`
    INSERT INTO op_log (op_id, entity, entity_id, op_type, payload, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    opId, input.entity, input.entityId, input.opType,
    input.payload !== null ? JSON.stringify(input.payload) : null,
    Date.now(),
  );
}

/** Return all ops not yet synced to the cloud. */
export function pendingOps(db: DatabaseSync): OpLogEntry[] {
  const rows = db
    .prepare('SELECT * FROM op_log WHERE synced_at IS NULL ORDER BY id ASC')
    .all() as Record<string, unknown>[];
  return rows.map(rowToOp);
}

/** Mark a batch of ops as synced. */
export function markOpsSynced(db: DatabaseSync, opIds: string[]): void {
  if (!opIds.length) return;
  const placeholders = opIds.map(() => '?').join(',');
  db.prepare(`UPDATE op_log SET synced_at=? WHERE op_id IN (${placeholders})`)
    .run(Date.now(), ...opIds);
}

/** Compact: remove ops for deleted entities older than 30 days that are already synced. */
export function pruneOpLog(db: DatabaseSync): void {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  db.prepare(`
    DELETE FROM op_log
    WHERE synced_at IS NOT NULL AND created_at < ?
  `).run(cutoff);
}
