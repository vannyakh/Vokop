/** DOM video element used by timeline playback (seek/play mapping). */
let timelineVideo: HTMLVideoElement | null = null;

export function bindTimelineVideo(video: HTMLVideoElement | null): void {
  timelineVideo = video;
}

export function getTimelineVideo(): HTMLVideoElement | null {
  return timelineVideo;
}
