import { useState } from 'react';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import { useStudioSystemMonitor } from '@/features/studio/hooks/useStudioSystemMonitor';
import {
  cpuHealthClass,
  formatMonitorGb,
  formatMonitorPercent,
  fpsHealthClass,
} from '@/features/studio/lib/studioSystemMonitor';
import { Popover } from '@vokop/ui/antd';

interface StudioStatusbarMonitorProps {
  active?: boolean;
}

function MonitorMetric({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <span className={cn('studio-statusbar-metric', className)}>
      <span className="studio-statusbar-metric-label">{label}</span>
      <span className="studio-statusbar-metric-value">{value}</span>
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="studio-statusbar-monitor-row">
      <span className="studio-statusbar-monitor-row-label">{label}</span>
      <span className="studio-statusbar-monitor-row-value">{value}</span>
    </div>
  );
}

export function StudioStatusbarMonitor({ active = true }: StudioStatusbarMonitorProps) {
  const [open, setOpen] = useState(false);
  const snapshot = useStudioSystemMonitor(active);
  const isTimelinePlaying = useAppStore((s) => s.isTimelinePlaying);
  const isExporting = useAppStore((s) => s.isExporting);

  const ramValue =
    snapshot.memory.usedGb != null ? formatMonitorGb(snapshot.memory.usedGb) : '—';
  const cpuValue = snapshot.cpuPercent > 0 ? formatMonitorPercent(snapshot.cpuPercent) : '—';
  const diskValue =
    snapshot.storage.usedGb != null && snapshot.storage.quotaGb != null
      ? `${formatMonitorGb(snapshot.storage.usedGb, 1)}/${formatMonitorGb(snapshot.storage.quotaGb, 0)}`
      : snapshot.storage.usedGb != null
        ? formatMonitorGb(snapshot.storage.usedGb, 1)
        : '—';

  const networkDetail = [
    snapshot.network.label,
    snapshot.network.rttMs != null ? `${Math.round(snapshot.network.rttMs)} ms RTT` : null,
    snapshot.network.downlinkMbps != null
      ? `${snapshot.network.downlinkMbps.toFixed(1)} Mbps`
      : null,
    snapshot.network.saveData ? 'Save-Data' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const popover = (
    <div className="studio-statusbar-monitor-panel">
      <div className="studio-statusbar-monitor-panel-head">
        <Activity size={13} aria-hidden />
        <span>Performance</span>
      </div>
      <DetailRow label="CPU" value={cpuValue} />
      <DetailRow
        label="RAM"
        value={
          snapshot.memory.usedGb != null && snapshot.memory.limitGb != null
            ? `${formatMonitorGb(snapshot.memory.usedGb)} / ${formatMonitorGb(snapshot.memory.limitGb)}`
            : ramValue
        }
      />
      <DetailRow
        label="Disk"
        value={
          snapshot.storage.usedGb != null && snapshot.storage.quotaGb != null
            ? `${formatMonitorGb(snapshot.storage.usedGb)} used (limit ${formatMonitorGb(snapshot.storage.quotaGb)})`
            : diskValue
        }
      />
      <DetailRow
        label="FPS"
        value={
          snapshot.fps > 0
            ? `${snapshot.fps} (${snapshot.frameTimeMs.toFixed(1)} ms/frame)`
            : '—'
        }
      />
      <DetailRow label="Network" value={networkDetail || '—'} />
      <DetailRow
        label="CPU cores"
        value={snapshot.cpuCores > 0 ? String(snapshot.cpuCores) : '—'}
      />
      <DetailRow label="Tab" value={snapshot.tabVisible ? 'Active' : 'Background'} />
      <DetailRow
        label="Studio"
        value={
          [
            isTimelinePlaying ? 'Playing' : null,
            isExporting ? 'Exporting' : null,
            !isTimelinePlaying && !isExporting ? 'Idle' : null,
          ]
            .filter(Boolean)
            .join(' · ') || 'Idle'
        }
      />
      <p className="studio-statusbar-monitor-note">
        CPU is a main-thread estimate from frame pacing and long tasks, not system CPU.
      </p>
    </div>
  );

  return (
    <Popover
      content={popover}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="top"
      overlayClassName="studio-statusbar-monitor-popover"
    >
      <button
        type="button"
        className={cn('studio-statusbar-monitor', open && 'is-open')}
        aria-label="Performance monitor"
        aria-expanded={open}
      >
        <MonitorMetric
          label="CPU"
          value={cpuValue}
          className={snapshot.cpuPercent > 0 ? cpuHealthClass(snapshot.cpuPercent) : undefined}
        />
        <MonitorMetric label="RAM" value={ramValue} />
        <MonitorMetric
          label="FPS"
          value={snapshot.fps > 0 ? String(snapshot.fps) : '—'}
          className={snapshot.fps > 0 ? fpsHealthClass(snapshot.fps) : undefined}
        />
        <MonitorMetric label="Disk" value={diskValue} />
        <MonitorMetric
          label="Net"
          value={snapshot.network.label}
          className={snapshot.online ? 'is-online' : 'is-offline'}
        />
      </button>
    </Popover>
  );
}
