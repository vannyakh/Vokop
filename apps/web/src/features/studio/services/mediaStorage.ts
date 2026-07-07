import { formatNumberForDisplay } from '@vokop/shared';
import type { MediaAsset } from '@/features/studio/lib/mediaLibrary';
import {
  clearOpfsMediaCache,
  hydrateMediaFromOpfs,
  loadMediaFileFromOpfs,
  persistMediaToOpfs,
  removeMediaFromOpfs,
} from '@/features/studio/lib/opfsMediaCache';

/**
 * Client storage service handle for studio media (OpenCut `services/storage`
 * pattern): wraps the OPFS media cache with quota awareness so callers can
 * check capacity before writing and get typed errors when the browser
 * storage quota is exhausted.
 */

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/** Keep some quota free so project snapshots and caches never hit the wall. */
export const STORAGE_HEADROOM_RESERVE_BYTES = 50 * 1024 * 1024;

export interface StorageQuotaStatus {
  quotaBytes: number | null;
  usageBytes: number | null;
  headroomBytes: number | null;
  availableBytes: number | null;
}

export interface StorageCapacityCheckResult {
  canStore: boolean;
  reason: 'enough-space' | 'insufficient-space' | 'estimate-unavailable';
  availableBytes: number | null;
}

function normalizeByteValue(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}

export function formatStorageBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${formatNumberForDisplay(value, { fractionDigits: precision })} ${BYTE_UNITS[unitIndex]}`;
}

export async function readStorageQuotaStatus(): Promise<StorageQuotaStatus> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.storage ||
    typeof navigator.storage.estimate !== 'function'
  ) {
    return { quotaBytes: null, usageBytes: null, headroomBytes: null, availableBytes: null };
  }

  const estimate = await navigator.storage.estimate();
  const quotaBytes = normalizeByteValue(estimate.quota);
  const usageBytes = normalizeByteValue(estimate.usage);

  if (quotaBytes === null || usageBytes === null) {
    return { quotaBytes, usageBytes, headroomBytes: null, availableBytes: null };
  }

  const headroomBytes = Math.max(quotaBytes - usageBytes, 0);
  const availableBytes = Math.max(headroomBytes - STORAGE_HEADROOM_RESERVE_BYTES, 0);
  return { quotaBytes, usageBytes, headroomBytes, availableBytes };
}

export function evaluateStorageCapacity(
  requiredBytes: number,
  quotaStatus: StorageQuotaStatus,
): StorageCapacityCheckResult {
  if (quotaStatus.availableBytes === null) {
    return { canStore: true, reason: 'estimate-unavailable', availableBytes: null };
  }

  if (requiredBytes > quotaStatus.availableBytes) {
    return {
      canStore: false,
      reason: 'insufficient-space',
      availableBytes: quotaStatus.availableBytes,
    };
  }

  return { canStore: true, reason: 'enough-space', availableBytes: quotaStatus.availableBytes };
}

export class StorageQuotaExceededError extends Error {
  requiredBytes: number;

  constructor(requiredBytes: number) {
    super(
      `Not enough browser storage to save a ${formatStorageBytes(requiredBytes)} file.`,
    );
    this.name = 'StorageQuotaExceededError';
    this.requiredBytes = requiredBytes;
  }
}

export function isStorageQuotaExceededError(error: unknown): boolean {
  if (error instanceof StorageQuotaExceededError) return true;
  if (!(error instanceof Error)) return false;
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.message.toLowerCase().includes('quota')
  );
}

class MediaStorageService {
  /** Check whether a file of `size` bytes fits in the remaining quota. */
  async canStoreFile(size: number): Promise<StorageCapacityCheckResult> {
    const quotaStatus = await readStorageQuotaStatus();
    return evaluateStorageCapacity(size, quotaStatus);
  }

  getQuotaStatus(): Promise<StorageQuotaStatus> {
    return readStorageQuotaStatus();
  }

  /**
   * Persist a media asset file for a project.
   * Throws `StorageQuotaExceededError` when the browser quota cannot fit it.
   */
  async saveAsset(projectId: string, asset: MediaAsset, file: File | Blob): Promise<void> {
    const capacity = await this.canStoreFile(file.size);
    if (!capacity.canStore) {
      throw new StorageQuotaExceededError(file.size);
    }

    try {
      await persistMediaToOpfs(projectId, asset, file);
    } catch (error) {
      if (isStorageQuotaExceededError(error)) {
        throw new StorageQuotaExceededError(file.size);
      }
      throw error;
    }
  }

  loadAsset(projectId: string, id: string): Promise<File | null> {
    return loadMediaFileFromOpfs(projectId, id);
  }

  /** Restore all project media (fresh blob URLs; Files registered via callback). */
  loadProjectAssets(
    projectId: string,
    registerFile: (id: string, file: File) => void,
  ): Promise<MediaAsset[]> {
    return hydrateMediaFromOpfs(projectId, registerFile);
  }

  removeAsset(projectId: string, id: string): Promise<void> {
    return removeMediaFromOpfs(projectId, id);
  }

  clearProject(projectId: string): Promise<void> {
    return clearOpfsMediaCache(projectId);
  }
}

export const mediaStorage = new MediaStorageService();
