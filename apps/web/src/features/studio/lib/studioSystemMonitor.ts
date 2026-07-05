const TARGET_FPS = 60;
const FRAME_BUDGET_MS = 1000 / TARGET_FPS;

export interface NetworkConnectionInfo {
  label: string;
  effectiveType: string | null;
  downlinkMbps: number | null;
  rttMs: number | null;
  saveData: boolean;
}

export interface MemoryInfo {
  usedGb: number | null;
  limitGb: number | null;
  totalGb: number | null;
}

export interface StorageInfo {
  usedGb: number | null;
  quotaGb: number | null;
}

export function bytesToGb(bytes: number): number {
  return bytes / (1024 * 1024 * 1024);
}

export function formatMonitorGb(value: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)} GB`;
}

export function formatMonitorPercent(value: number | null, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

export function readMemoryInfo(): MemoryInfo {
  const memory = (
    performance as Performance & {
      memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number; totalJSHeapSize?: number };
    }
  ).memory;
  if (!memory) return { usedGb: null, limitGb: null, totalGb: null };
  return {
    usedGb: bytesToGb(memory.usedJSHeapSize),
    limitGb: bytesToGb(memory.jsHeapSizeLimit),
    totalGb: memory.totalJSHeapSize != null ? bytesToGb(memory.totalJSHeapSize) : null,
  };
}

export async function readStorageInfo(): Promise<StorageInfo> {
  if (!navigator.storage?.estimate) {
    return { usedGb: null, quotaGb: null };
  }
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return {
      usedGb: usage > 0 ? bytesToGb(usage) : null,
      quotaGb: quota > 0 ? bytesToGb(quota) : null,
    };
  } catch {
    return { usedGb: null, quotaGb: null };
  }
}

export function readNetworkInfo(online: boolean): NetworkConnectionInfo {
  if (!online) {
    return {
      label: 'Offline',
      effectiveType: null,
      downlinkMbps: null,
      rttMs: null,
      saveData: false,
    };
  }

  const connection = (
    navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        downlink?: number;
        rtt?: number;
        saveData?: boolean;
      };
    }
  ).connection;

  if (!connection) {
    return {
      label: 'Online',
      effectiveType: null,
      downlinkMbps: null,
      rttMs: null,
      saveData: false,
    };
  }

  const effectiveType = connection.effectiveType?.toUpperCase() ?? null;
  const downlinkMbps = connection.downlink ?? null;
  const rttMs = connection.rtt ?? null;

  let label = 'Online';
  if (effectiveType) label = effectiveType;
  else if (downlinkMbps != null) label = `${downlinkMbps.toFixed(0)} Mbps`;

  return {
    label,
    effectiveType,
    downlinkMbps,
    rttMs,
    saveData: Boolean(connection.saveData),
  };
}

/** Estimate main-thread load from frame pacing and long tasks (browser-safe). */
export function estimateCpuLoadPercent(frameTimeMs: number, longTaskMs: number): number {
  const frameLoad = frameTimeMs > 0 ? Math.min(100, (frameTimeMs / FRAME_BUDGET_MS) * 100) : 0;
  const taskLoad = Math.min(100, (longTaskMs / 1000) * 100);
  return Math.min(100, Math.max(frameLoad, taskLoad));
}

export function fpsHealthClass(fps: number): 'is-good' | 'is-ok' | 'is-low' {
  if (fps >= 55) return 'is-good';
  if (fps >= 30) return 'is-ok';
  return 'is-low';
}

export function cpuHealthClass(cpuPercent: number): 'is-good' | 'is-ok' | 'is-low' {
  if (cpuPercent <= 35) return 'is-good';
  if (cpuPercent <= 65) return 'is-ok';
  return 'is-low';
}
