import { useEffect, useState, type RefObject } from 'react';

export function useVideoPlaybackState(videoRef: RefObject<HTMLVideoElement | null>, videoUrl: string | null) {
  const [isPaused, setIsPaused] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPaused(false);
    const onPause = () => setIsPaused(true);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    setIsPaused(video.paused);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [videoRef, videoUrl]);

  const togglePlay = () => {
    if (videoRef.current?.paused) void videoRef.current.play();
    else videoRef.current?.pause();
  };

  const seek = (time: number) => {
    if (videoRef.current) videoRef.current.currentTime = time;
  };

  return { isPaused, togglePlay, seek };
}
