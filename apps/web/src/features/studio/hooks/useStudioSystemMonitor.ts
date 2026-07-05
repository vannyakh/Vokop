import { useEffect, useState } from 'react';
import {
  estimateCpuLoadPercent,
  readMemoryInfo,
  readNetworkInfo,
  readStorageInfo,
  type MemoryInfo,
  type NetworkConnectionInfo,
  type StorageInfo,
} from '@/features/studio/lib/studioSystemMonitor';

export interface StudioSystemMonitorSnapshot {
  fps: number;
  frameTimeMs: number;
  cpuPercent: number;
  cpuCores: number;
  memory: MemoryInfo;
  storage: StorageInfo;
  online: boolean;
  network: NetworkConnectionInfo;
  tabVisible: boolean;
  longTaskMs: number;
}

const INITIAL: StudioSystemMonitorSnapshot = {
  fps: 0,
  frameTimeMs: 0,
  cpuPercent: 0,
  cpuCores: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 0 : 0,
  memory: { usedGb: null, limitGb: null, totalGb: null },
  storage: { usedGb: null, quotaGb: null },
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  network: readNetworkInfo(typeof navigator !== 'undefined' ? navigator.onLine : true),
  tabVisible: typeof document !== 'undefined' ? document.visibilityState === 'visible' : true,
  longTaskMs: 0,
};

/** Browser-side RAM, storage, network, FPS, and main-thread load for the status bar. */
export function useStudioSystemMonitor(active = true): StudioSystemMonitorSnapshot {
  const [snapshot, setSnapshot] = useState<StudioSystemMonitorSnapshot>(INITIAL);

  useEffect(() => {
    if (!active) return;

    let frames = 0;
    let frameDeltaTotal = 0;
    let longTaskMs = 0;
    let lastSampleAt = performance.now();
    let lastFrameAt = performance.now();
    let rafId = 0;
    let cancelled = false;

    const longTaskObserver =
      typeof PerformanceObserver !== 'undefined'
        ? new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              longTaskMs += entry.duration;
            }
          })
        : null;

    try {
      longTaskObserver?.observe({ type: 'longtask', buffered: true });
    } catch {
      /* longtask unsupported */
    }

    const tick = (now: number) => {
      if (document.visibilityState === 'hidden') {
        lastFrameAt = now;
        rafId = requestAnimationFrame(tick);
        return;
      }

      frameDeltaTotal += now - lastFrameAt;
      lastFrameAt = now;
      frames += 1;

      if (now - lastSampleAt >= 1000) {
        const elapsed = now - lastSampleAt;
        const fps = Math.round((frames * 1000) / elapsed);
        const frameTimeMs = frames > 0 ? frameDeltaTotal / frames : 0;
        const cpuPercent = estimateCpuLoadPercent(frameTimeMs, longTaskMs);

        setSnapshot((prev) => ({
          ...prev,
          fps,
          frameTimeMs,
          cpuPercent,
          longTaskMs,
          tabVisible: document.visibilityState === 'visible',
        }));

        frames = 0;
        frameDeltaTotal = 0;
        longTaskMs = 0;
        lastSampleAt = now;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    const refreshResources = async () => {
      if (cancelled) return;
      const storage = await readStorageInfo();
      const online = navigator.onLine;
      setSnapshot((prev) => ({
        ...prev,
        memory: readMemoryInfo(),
        storage,
        online,
        network: readNetworkInfo(online),
        cpuCores: navigator.hardwareConcurrency || prev.cpuCores,
        tabVisible: document.visibilityState === 'visible',
      }));
    };

    void refreshResources();
    const resourceTimer = window.setInterval(() => void refreshResources(), 5000);

    const syncNetwork = () => {
      const online = navigator.onLine;
      setSnapshot((prev) => ({
        ...prev,
        online,
        network: readNetworkInfo(online),
      }));
    };

    const syncVisibility = () => {
      setSnapshot((prev) => ({
        ...prev,
        tabVisible: document.visibilityState === 'visible',
      }));
    };

    window.addEventListener('online', syncNetwork);
    window.addEventListener('offline', syncNetwork);
    document.addEventListener('visibilitychange', syncVisibility);
    const connection = (navigator as Navigator & { connection?: EventTarget }).connection;
    connection?.addEventListener?.('change', syncNetwork);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.clearInterval(resourceTimer);
      longTaskObserver?.disconnect();
      window.removeEventListener('online', syncNetwork);
      window.removeEventListener('offline', syncNetwork);
      document.removeEventListener('visibilitychange', syncVisibility);
      connection?.removeEventListener?.('change', syncNetwork);
    };
  }, [active]);

  return snapshot;
}

export { formatMonitorGb, formatMonitorPercent } from '@/features/studio/lib/studioSystemMonitor';
