/**
 * Ensure MongoDB indexes for video-tools collections.
 * Call once on startup after connectDatabases().
 *
 * Design notes:
 * - `sparse: true` on projectId / assetId unique indexes so that documents
 *   without these fields (e.g. legacy auth-service rows in the same DB) are
 *   not counted and don't trigger duplicate-key errors.
 * - Each index is created individually so a single failure doesn't abort the
 *   rest of the startup sequence.
 */

import type { CreateIndexesOptions, IndexSpecification } from 'mongodb';
import { projects, assets, renderJobs } from './collections.js';

type Indexable = {
  createIndex: (keys: IndexSpecification, options?: CreateIndexesOptions) => Promise<string>;
};

const indexDefs: Array<{ col: () => Indexable; keys: IndexSpecification; opts?: CreateIndexesOptions }> = [
  { col: projects, keys: { projectId: 1 }, opts: { unique: true, sparse: true } },
  { col: projects, keys: { ownerId: 1 } },

  { col: assets, keys: { assetId: 1 }, opts: { unique: true, sparse: true } },
  { col: assets, keys: { projectId: 1 } },
  { col: assets, keys: { ownerId: 1 } },
  { col: assets, keys: { status: 1 } },

  { col: renderJobs, keys: { jobId: 1 }, opts: { unique: true, sparse: true } },
  { col: renderJobs, keys: { projectId: 1 } },
  { col: renderJobs, keys: { status: 1 } },
];

export async function ensureIndexes(): Promise<void> {
  await Promise.all(
    indexDefs.map(async ({ col, keys, opts }) => {
      try {
        await col().createIndex(keys, opts ?? {});
      } catch (err) {
        // Log but don't crash — a pre-existing incompatible index should not
        // prevent the service from starting.
        console.warn('[indexes] createIndex warning:', (err as Error).message);
      }
    }),
  );
}
