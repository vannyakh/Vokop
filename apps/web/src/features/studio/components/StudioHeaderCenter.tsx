import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, Ratio, Pencil } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import { ASPECT_RATIOS, getAspectRatioOption } from '@/features/studio/constants/aspectRatios';
import { StudioHeaderCanvasTools } from '@/features/studio/components/StudioHeaderCanvasTools';
import { StudioHeaderHistoryTools } from '@/features/studio/components/StudioHeaderHistoryTools';

export function StudioHeaderCenter() {
  const projectName = useAppStore((s) => s.projectName);
  const setProjectName = useAppStore((s) => s.setProjectName);
  const aspectRatio = useAppStore((s) => s.aspectRatio);
  const setAspectRatio = useAppStore((s) => s.setAspectRatio);
  const videoFile = useAppStore((s) => s.videoFile);

  const [projectOpen, setProjectOpen] = useState(false);
  const [ratioOpen, setRatioOpen] = useState(false);
  const [draftName, setDraftName] = useState(projectName);
  const [isRenaming, setIsRenaming] = useState(false);

  const groupRef = useRef<HTMLDivElement>(null);

  const ratioOption = getAspectRatioOption(aspectRatio);
  const fileSizeMb = videoFile?.size ? (videoFile.size / (1024 * 1024)).toFixed(1) : null;

  useEffect(() => {
    setDraftName(projectName);
  }, [projectName]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) {
        setProjectOpen(false);
        setRatioOpen(false);
        setIsRenaming(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const saveRename = () => {
    setProjectName(draftName);
    setIsRenaming(false);
    setProjectOpen(false);
  };

  return (
    <div ref={groupRef} className="studio-header-center">
      <div className="studio-header-center-clusters">
        <div className="studio-header-tool-group">
          <StudioHeaderCanvasTools />
        </div>

        <div className="studio-header-tool-group">
          <StudioHeaderHistoryTools />
        </div>

        <div className="studio-header-center-group">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setProjectOpen((o) => !o);
              setRatioOpen(false);
            }}
            className={cn('studio-header-center-btn', projectOpen && 'active')}
            title="Project"
          >
            <span className="studio-header-project-name">{projectName}</span>
            <ChevronDown size={12} className={cn('studio-header-chevron', projectOpen && 'open')} />
          </button>

          {projectOpen && (
            <div className="studio-header-menu studio-header-menu--project">
              <div className="studio-header-menu-section">
                <p className="studio-header-menu-label">Project name</p>
                {isRenaming ? (
                  <div className="studio-header-rename-row">
                    <input
                      type="text"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRename();
                        if (e.key === 'Escape') {
                          setDraftName(projectName);
                          setIsRenaming(false);
                        }
                      }}
                      className="studio-header-rename-input"
                      autoFocus
                    />
                    <button type="button" onClick={saveRename} className="studio-header-rename-save">
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="studio-header-rename-display">
                    <span className="studio-header-rename-value">{projectName}</span>
                    <button
                      type="button"
                      onClick={() => setIsRenaming(true)}
                      className="studio-header-rename-edit"
                      title="Rename project"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                )}
              </div>
              {videoFile && (
                <div className="studio-header-menu-meta">
                  <p className="truncate" title={videoFile.name}>
                    {videoFile.name}
                  </p>
                  {fileSizeMb && <span>{fileSizeMb} MB</span>}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="studio-header-center-divider" />

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setRatioOpen((o) => !o);
              setProjectOpen(false);
              setIsRenaming(false);
            }}
            className={cn('studio-header-center-btn', ratioOpen && 'active')}
            title="Aspect ratio"
          >
            <Ratio size={12} className="text-accent shrink-0" />
            <span>{ratioOption.label}</span>
            <ChevronDown size={12} className={cn('studio-header-chevron', ratioOpen && 'open')} />
          </button>

          {ratioOpen && (
            <div className="studio-header-menu studio-header-menu--ratio">
              {ASPECT_RATIOS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setAspectRatio(option.id);
                    setRatioOpen(false);
                  }}
                  className={cn(
                    'studio-header-ratio-item',
                    aspectRatio === option.id && 'active',
                  )}
                >
                  <span className="studio-header-ratio-icon" data-ratio={option.id} />
                  <span className="studio-header-ratio-copy">
                    <span className="studio-header-ratio-label">{option.label}</span>
                    <span className="studio-header-ratio-hint">{option.hint}</span>
                  </span>
                  {aspectRatio === option.id && <Check size={14} className="text-accent shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
