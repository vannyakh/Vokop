/**
 * Ensure MongoDB indexes for video-tools collections.
 * Call once on startup after connectDatabases().
 */

import { projects, assets, renderJobs } from './collections.js';

export async function ensureIndexes(): Promise<void> {
  await Promise.all([
    projects().createIndex({ projectId: 1 }, { unique: true }),
    projects().createIndex({ ownerId: 1 }),

    assets().createIndex({ assetId: 1 }, { unique: true }),
    assets().createIndex({ projectId: 1 }),
    assets().createIndex({ ownerId: 1 }),
    assets().createIndex({ status: 1 }),

    renderJobs().createIndex({ jobId: 1 }, { unique: true }),
    renderJobs().createIndex({ projectId: 1 }),
    renderJobs().createIndex({ status: 1 }),
  ]);
}
