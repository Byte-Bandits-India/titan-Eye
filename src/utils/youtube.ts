const YOUTUBE_ID_PATTERN =
  /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/i;

export function getYoutubeVideoId(url: string): null | string {
  const match = YOUTUBE_ID_PATTERN.exec(url);

  return match?.[1] ?? null;
}

export function getYoutubeEmbedUrl(url: string, options: { autoplay?: boolean; loop?: boolean; mute?: boolean } = {}): null | string {
  const id = getYoutubeVideoId(url);

  if (!id) {
    return null;
  }

  const params = new URLSearchParams({
    autoplay: options.autoplay ? '1' : '0',
    controls: '1',
    mute: options.mute ? '1' : '0',
    playsinline: '1',
    rel: '0',
  });

  if (options.loop) {
    params.set('loop', '1');
    params.set('playlist', id);
  }

  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}
