import type { RefObject } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { useAppStore } from '@/features/project';
import { useSegments } from '@/features/translation/hooks/useSegments';

interface VideoViewportProps {
  videoRef: RefObject<HTMLVideoElement | null>;
}

export function VideoViewport({ videoRef }: VideoViewportProps) {
  const videoUrl = useAppStore((s) => s.videoUrl);
  const videoFile = useAppStore((s) => s.videoFile);
  const status = useAppStore((s) => s.status);
  const setCurrentTime = useAppStore((s) => s.setCurrentTime);
  const setDuration = useAppStore((s) => s.setDuration);
  const { transcriptSegments, translationSegments, activeSegmentIndex } = useSegments();

  if (!videoUrl) return null;

  const activeSegment =
    activeSegmentIndex !== -1
      ? translationSegments[activeSegmentIndex] || transcriptSegments[activeSegmentIndex]
      : null;

  return (
    <div className="flex-1 flex items-center justify-center p-6 min-h-0">
      <div className="relative w-full max-w-5xl">
        {/* Frame corners */}
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
        <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-white/20 rounded-tl pointer-events-none" />
        <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-white/20 rounded-tr pointer-events-none" />
        <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-white/20 rounded-bl pointer-events-none" />
        <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-white/20 rounded-br pointer-events-none" />

        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl shadow-black/60 ring-1 ring-white/10">
          <video
            ref={videoRef}
            key={videoUrl}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            className="w-full h-full cursor-pointer object-contain bg-black"
            onClick={() => {
              if (videoRef.current) {
                if (videoRef.current.paused) videoRef.current.play();
                else videoRef.current.pause();
              }
            }}
          >
            <source src={videoUrl} type={videoFile?.type} />
          </video>

          <AnimatePresence mode="wait">
            {activeSegment && (
              <div className="absolute inset-x-0 bottom-0 studio-caption px-8 pb-8 pt-16 pointer-events-none">
                <motion.p
                  key={activeSegmentIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.2 }}
                  className="text-center text-lg md:text-xl font-semibold text-white leading-snug drop-shadow-lg"
                >
                  {activeSegment.text}
                </motion.p>
                {activeSegment.speaker && (
                  <p className="text-center text-[10px] uppercase tracking-widest text-muted mt-2">
                    {activeSegment.speaker}
                  </p>
                )}
              </div>
            )}
          </AnimatePresence>

          {status !== 'idle' && status !== 'error' && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <div className="studio-panel px-6 py-5 flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-accent" size={28} />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted studio-pulse">
                  {status}…
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
