const VIDEO_EXTENSION = /\.(mp4|webm|ogg|mov|m4v)(?:$|[?#])/i;

export function isVideoUrl(url: string) {
  return VIDEO_EXTENSION.test(url);
}
