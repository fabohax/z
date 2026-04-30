export type SupportedVideoProvider = "youtube" | "x" | "tiktok" | "instagram" | "facebook" | "vimeo" | "redgifs" | "reddit" | "pornhub";
const PORNHUB_HOSTS = new Set([
  "pornhub.com",
  "www.pornhub.com",
]);
const parsePornhubUrl = (url: URL) => {
  const hostname = url.hostname.toLowerCase();
  if (!PORNHUB_HOSTS.has(hostname)) {
    return null;
  }
  // /view_video.php?viewkey=ID
  if (url.pathname === "/view_video.php" && url.searchParams.get("viewkey")) {
    return {
      videoId: url.searchParams.get("viewkey"),
      kind: "watch" as const,
      originalUrl: url.toString(),
    };
  }
  return null;
};
export type RequestedDownloadFormat = "mp4" | "mp3" | "best";
export type RequestedDownloadQuality = "best" | "1080p" | "720p" | "480p";

export type VideoRecognitionResult = {
  recognized: boolean;
  provider: SupportedVideoProvider | null;
  normalizedUrl: string | null;
  canonicalUrl: string | null;
  videoId: string | null;
  kind: "watch" | "short" | "embed" | "live" | "tweet" | "unknown" | "share" | null;
  thumbnailUrl: string | null;
  message: string;
  requestedFormat?: RequestedDownloadFormat | null;
  requestedQuality?: RequestedDownloadQuality | null;
  title?: string | null;
  authorName?: string | null;
  durationLabel?: string | null;
  viewCountLabel?: string | null;
  publishedAt?: string | null;
  fileName?: string | null;
  contentType?: string | null;
  downloadUrl?: string | null;
  downloadAvailable?: boolean | null;
  warningMessage?: string | null;
  estimatedSizeBytes?: number | null;
  estimatedSizeLabel?: string | null;
};

const requestedFormats = ["mp4", "mp3", "best"] as const;
const requestedQualities = ["best", "1080p", "720p", "480p"] as const;

export const isRequestedDownloadFormat = (
  value: string | null | undefined,
): value is RequestedDownloadFormat => {
  return requestedFormats.some((candidate) => candidate === value);
};

export const isRequestedDownloadQuality = (
  value: string | null | undefined,
): value is RequestedDownloadQuality => {
  return requestedQualities.some((candidate) => candidate === value);
};

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const X_HOSTS = new Set([
  "x.com",
  "www.x.com",
  "mobile.x.com",
  "twitter.com",
  "www.twitter.com",
  "mobile.twitter.com",
]);

const TIKTOK_HOSTS = new Set([
  "tiktok.com",
  "www.tiktok.com",
  "m.tiktok.com",
  "vm.tiktok.com",
  "vt.tiktok.com",
]);

const INSTAGRAM_HOSTS = new Set([
  "instagram.com",
  "www.instagram.com",
  "m.instagram.com",
]);

const FACEBOOK_HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "web.facebook.com",
  "fb.watch",
  "www.fb.watch",
  "fb.com",
  "www.fb.com",
]);

const VIMEO_HOSTS = new Set([
  "vimeo.com",
  "www.vimeo.com",
  "player.vimeo.com",
]);

const REDGIFS_HOSTS = new Set([
  "redgifs.com",
  "www.redgifs.com",
]);

const REDDIT_HOSTS = new Set([
  "reddit.com",
  "www.reddit.com",
  "old.reddit.com",
  "m.reddit.com",
  "np.reddit.com",
  "i.reddit.com",
  "v.redd.it",
  "redd.it",
]);

const normalizeCandidateUrl = (rawUrl: string) => {
  const trimmed = rawUrl.trim();

  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

const isValidYouTubeId = (value: string) => /^[A-Za-z0-9_-]{6,15}$/.test(value);

const pickYouTubeId = (candidate?: string | null) => {
  const value = candidate?.trim() ?? "";

  return isValidYouTubeId(value) ? value : null;
};

const isValidXStatusId = (value: string) => /^\d{6,25}$/.test(value);

const isValidTikTokVideoId = (value: string) => /^\d{6,25}$/.test(value);

const isValidInstagramShortcode = (value: string) => /^[A-Za-z0-9_-]{6,20}$/.test(value);

const isValidVimeoId = (value: string) => /^\d{5,15}$/.test(value);

const parseRedditUrl = (url: URL) => {
  const hostname = url.hostname.toLowerCase();

  if (!REDDIT_HOSTS.has(hostname)) {
    return null;
  }

  // v.redd.it/ID short video links
  if (hostname === "v.redd.it") {
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length >= 1) {
      return { postId: segments[0], kind: "watch" as const, originalUrl: url.toString() };
    }
    return null;
  }

  // redd.it/ID short links
  if (hostname === "redd.it") {
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length >= 1) {
      return { postId: segments[0], kind: "watch" as const, originalUrl: url.toString() };
    }
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);

  // /r/SUBREDDIT/comments/POST_ID/...
  if (segments.length >= 4 && segments[0] === "r" && segments[2] === "comments") {
    return { postId: segments[3], kind: "watch" as const, originalUrl: url.toString() };
  }

  // /comments/POST_ID/...
  if (segments.length >= 2 && segments[0] === "comments") {
    return { postId: segments[1], kind: "watch" as const, originalUrl: url.toString() };
  }

  return null;
};

const parseRedGifsUrl = (url: URL) => {
  const hostname = url.hostname.toLowerCase();

  if (!REDGIFS_HOSTS.has(hostname)) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);

  // /watch/SLUG
  if (segments.length >= 2 && segments[0] === "watch" && /^[a-zA-Z]{6,80}$/.test(segments[1])) {
    return { slug: segments[1].toLowerCase(), kind: "watch" as const };
  }

  // /ifr/SLUG (embed)
  if (segments.length >= 2 && segments[0] === "ifr" && /^[a-zA-Z]{6,80}$/.test(segments[1])) {
    return { slug: segments[1].toLowerCase(), kind: "embed" as const };
  }

  return null;
};

const parseVimeoUrl = (url: URL) => {
  const hostname = url.hostname.toLowerCase();

  if (!VIMEO_HOSTS.has(hostname)) {
    return null;
  }

  // player.vimeo.com/video/ID
  if (hostname === "player.vimeo.com") {
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length >= 2 && segments[0] === "video" && isValidVimeoId(segments[1])) {
      return { videoId: segments[1], kind: "embed" as const };
    }
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);

  // /VIDEO_ID at root level
  if (segments.length >= 1 && isValidVimeoId(segments[0])) {
    return { videoId: segments[0], kind: "watch" as const };
  }

  // /channels/CHANNEL/VIDEO_ID or /groups/GROUP/videos/VIDEO_ID
  if (segments.length >= 3 && (segments[0] === "channels" || segments[0] === "groups")) {
    const candidate = segments[0] === "groups" && segments[2] === "videos" ? segments[3] : segments[2];
    if (candidate && isValidVimeoId(candidate)) {
      return { videoId: candidate, kind: "watch" as const };
    }
  }

  return null;
};

export const parseFacebookUrl = (url: URL) => {
  const hostname = url.hostname.toLowerCase();

  if (!FACEBOOK_HOSTS.has(hostname)) {
    return null;
  }

  // fb.watch short links
  if (hostname === "fb.watch" || hostname === "www.fb.watch") {
    return { videoId: null, kind: "watch" as const, originalUrl: url.toString() };
  }

  const segments = url.pathname.split("/").filter(Boolean);

  // /share/v/ID/ or /share/r/ID/
  if (segments.length >= 3 && segments[0] === "share" && (segments[1] === "v" || segments[1] === "r")) {
    // Mark for resolution
    return { videoId: segments[2], kind: "share" as const, originalUrl: url.toString(), needsResolve: true };
  }


// Patch recognizeVideoUrl to resolve Facebook share/v links


// (MUST be at the very end of the file for ESM compatibility)
// (Async server-only logic moved to video-links-async.ts)
// Helper to resolve a Facebook share/v link to a /reel/NUMBER link by following the redirect

  // /watch/?v=ID
  if (segments[0] === "watch" && url.searchParams.get("v")) {
    return { videoId: url.searchParams.get("v"), kind: "watch" as const, originalUrl: url.toString() };
  }

  // /reel/ID or /reels/ID
  if (segments.length >= 2 && (segments[0] === "reel" || segments[0] === "reels")) {
    return { videoId: segments[1], kind: "short" as const, originalUrl: url.toString() };
  }

  // /username/videos/ID/
  if (segments.length >= 3 && segments[1] === "videos") {
    return { videoId: segments[2], kind: "watch" as const, originalUrl: url.toString() };
  }

  // /video.php?v=ID
  if (segments[0] === "video.php" && url.searchParams.get("v")) {
    return { videoId: url.searchParams.get("v"), kind: "watch" as const, originalUrl: url.toString() };
  }

  // Generic fallback – if it looks like a Facebook URL, let yt-dlp try it
  if (segments.length > 0) {
    return { videoId: null, kind: "watch" as const, originalUrl: url.toString() };
  }

  return null;
};

const parseInstagramUrl = (url: URL) => {
  const hostname = url.hostname.toLowerCase();

  if (!INSTAGRAM_HOSTS.has(hostname)) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);

  // /p/SHORTCODE/ or /reel/SHORTCODE/ or /reels/SHORTCODE/
  if (
    segments.length >= 2 &&
    (segments[0] === "p" || segments[0] === "reel" || segments[0] === "reels") &&
    isValidInstagramShortcode(segments[1])
  ) {
    return {
      shortcode: segments[1],
      kind: (segments[0] === "p" ? "watch" : "short") as "watch" | "short",
    };
  }

  // /tv/SHORTCODE/ (IGTV)
  if (segments.length >= 2 && segments[0] === "tv" && isValidInstagramShortcode(segments[1])) {
    return {
      shortcode: segments[1],
      kind: "watch" as const,
    };
  }

  return null;
};

const parseTikTokUrl = (url: URL) => {
  const hostname = url.hostname.toLowerCase();

  if (!TIKTOK_HOSTS.has(hostname)) {
    return null;
  }

  // Short redirect links: vt.tiktok.com/ZSxxx or vm.tiktok.com/ZSxxx
  if (hostname === "vt.tiktok.com" || hostname === "vm.tiktok.com") {
    return {
      videoId: null,
      kind: "short" as const,
      originalUrl: url.toString(),
    };
  }

  const segments = url.pathname.split("/").filter(Boolean);

  // /@username/video/1234567890
  if (
    segments.length >= 3 &&
    segments[0].startsWith("@") &&
    segments[1] === "video" &&
    isValidTikTokVideoId(segments[2])
  ) {
    return {
      videoId: segments[2],
      kind: "watch" as const,
      originalUrl: url.toString(),
    };
  }

  // /t/ZSxxx (another redirect form)
  if (segments.length >= 2 && segments[0] === "t") {
    return {
      videoId: null,
      kind: "short" as const,
      originalUrl: url.toString(),
    };
  }

  // Bare path redirect: tiktok.com/ZSxxx
  if (segments.length === 1 && /^[A-Za-z0-9]+$/.test(segments[0])) {
    return {
      videoId: null,
      kind: "short" as const,
      originalUrl: url.toString(),
    };
  }

  return null;
};

const parseXUrl = (url: URL) => {
  const hostname = url.hostname.toLowerCase();

  if (!X_HOSTS.has(hostname)) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);

  if (segments.length >= 3 && segments[1] === "status" && isValidXStatusId(segments[2])) {
    return {
      statusId: segments[2],
      kind: "tweet" as const,
    };
  }

  if (segments.length >= 3 && segments[0] === "i" && segments[1] === "status" && isValidXStatusId(segments[2])) {
    return {
      statusId: segments[2],
      kind: "tweet" as const,
    };
  }

  return null;
};

const parseYouTubeUrl = (url: URL) => {
  const hostname = url.hostname.toLowerCase();

  if (!YOUTUBE_HOSTS.has(hostname)) {
    return null;
  }

  if (hostname === "youtu.be" || hostname === "www.youtu.be") {
    const videoId = pickYouTubeId(url.pathname.split("/").filter(Boolean)[0]);

    return videoId ? { videoId, kind: "watch" as const } : null;
  }

  if (url.pathname === "/watch") {
    const videoId = pickYouTubeId(url.searchParams.get("v"));

    return videoId ? { videoId, kind: "watch" as const } : null;
  }

  const [firstSegment, secondSegment] = url.pathname.split("/").filter(Boolean);

  if (!firstSegment) {
    return null;
  }

  const pathKinds: Record<string, VideoRecognitionResult["kind"]> = {
    shorts: "short",
    embed: "embed",
    live: "live",
    v: "watch",
  };

  const kind = pathKinds[firstSegment];

  if (!kind) {
    return null;
  }

  const videoId = pickYouTubeId(secondSegment);

  return videoId ? { videoId, kind } : null;
};

export function recognizeVideoUrl(rawUrl: string): VideoRecognitionResult {
  const normalizedCandidate = normalizeCandidateUrl(rawUrl);

  if (!normalizedCandidate) {
    return {
      recognized: false,
      provider: null,
      normalizedUrl: null,
      canonicalUrl: null,
      videoId: null,
      kind: null,
      thumbnailUrl: null,
      message: "Paste a video URL to continue.",
    };
  }

  let url: URL;

  try {
    url = new URL(normalizedCandidate);
  } catch {
    return {
      recognized: false,
      provider: null,
      normalizedUrl: null,
      canonicalUrl: null,
      videoId: null,
      kind: null,
      thumbnailUrl: null,
      message: "Enter a valid video URL.",
    };
  }

  const youtubeMatch = parseYouTubeUrl(url);

  if (youtubeMatch) {
    const canonicalUrl = `https://www.youtube.com/watch?v=${youtubeMatch.videoId}`;

    return {
      recognized: true,
      provider: "youtube",
      normalizedUrl: url.toString(),
      canonicalUrl,
      videoId: youtubeMatch.videoId,
      kind: youtubeMatch.kind,
      thumbnailUrl: `https://i.ytimg.com/vi/${youtubeMatch.videoId}/hqdefault.jpg`,
      message:
        youtubeMatch.kind === "short"
          ? "YouTube Shorts link recognized."
          : "YouTube video link recognized.",
    };
  }

  const xMatch = parseXUrl(url);

  if (xMatch) {
    const canonicalUrl = `https://x.com/i/status/${xMatch.statusId}`;

    return {
      recognized: true,
      provider: "x",
      normalizedUrl: url.toString(),
      canonicalUrl,
      videoId: xMatch.statusId,
      kind: xMatch.kind,
      thumbnailUrl: null,
      message: "X post link recognized.",
    };
  }

  const tiktokMatch = parseTikTokUrl(url);

  if (tiktokMatch) {
    // For short/redirect links, use the original URL as canonical (yt-dlp resolves it)
    const canonicalUrl = tiktokMatch.videoId
      ? `https://www.tiktok.com/@_/video/${tiktokMatch.videoId}`
      : tiktokMatch.originalUrl;

    return {
      recognized: true,
      provider: "tiktok",
      normalizedUrl: url.toString(),
      canonicalUrl,
      videoId: tiktokMatch.videoId,
      kind: tiktokMatch.kind,
      thumbnailUrl: null,
      message: "TikTok video link recognized.",
    };
  }

  const instagramMatch = parseInstagramUrl(url);

  if (instagramMatch) {
    const canonicalUrl = `https://www.instagram.com/p/${instagramMatch.shortcode}/`;

    return {
      recognized: true,
      provider: "instagram",
      normalizedUrl: url.toString(),
      canonicalUrl,
      videoId: instagramMatch.shortcode,
      kind: instagramMatch.kind,
      thumbnailUrl: null,
      message: "Instagram video link recognized.",
    };
  }

  const facebookMatch = parseFacebookUrl(url);

  if (facebookMatch) {
    return {
      recognized: true,
      provider: "facebook",
      normalizedUrl: url.toString(),
      canonicalUrl: facebookMatch.originalUrl,
      videoId: facebookMatch.videoId,
      kind: facebookMatch.kind,
      thumbnailUrl: null,
      message: facebookMatch.kind === "short" ? "Facebook Reel recognized." : "Facebook video link recognized.",
    };
  }

  const vimeoMatch = parseVimeoUrl(url);

  if (vimeoMatch) {
    const canonicalUrl = `https://vimeo.com/${vimeoMatch.videoId}`;

    return {
      recognized: true,
      provider: "vimeo",
      normalizedUrl: url.toString(),
      canonicalUrl,
      videoId: vimeoMatch.videoId,
      kind: vimeoMatch.kind,
      thumbnailUrl: null,
      message: vimeoMatch.kind === "embed" ? "Vimeo embed link recognized." : "Vimeo video link recognized.",
    };
  }

  const redditMatch = parseRedditUrl(url);

  if (redditMatch) {
    return {
      recognized: true,
      provider: "reddit" as const,
      normalizedUrl: url.toString(),
      canonicalUrl: redditMatch.originalUrl,
      videoId: redditMatch.postId,
      kind: redditMatch.kind,
      thumbnailUrl: null,
      message: "Reddit video link recognized.",
    };
  }

  const redgifsMatch = parseRedGifsUrl(url);

  if (redgifsMatch) {
    const canonicalUrl = `https://www.redgifs.com/watch/${redgifsMatch.slug}`;

    return {
      recognized: true,
      provider: "redgifs",
      normalizedUrl: url.toString(),
      canonicalUrl,
      videoId: redgifsMatch.slug,
      kind: redgifsMatch.kind,
      thumbnailUrl: null,
      message: "RedGifs video link recognized.",
    };
  }

  const pornhubMatch = parsePornhubUrl(url);
  if (pornhubMatch) {
    const canonicalUrl = `https://www.pornhub.com/view_video.php?viewkey=${pornhubMatch.videoId}`;
    return {
      recognized: true,
      provider: "pornhub",
      normalizedUrl: url.toString(),
      canonicalUrl,
      videoId: pornhubMatch.videoId,
      kind: pornhubMatch.kind,
      thumbnailUrl: null,
      message: "Pornhub video link recognized.",
    };
  }

  return {
    recognized: false,
    provider: null,
    normalizedUrl: url.toString(),
    canonicalUrl: null,
    videoId: null,
    kind: null,
    thumbnailUrl: null,
    message: "This link is valid, but only YouTube, X/Twitter, TikTok, Instagram, Facebook, Vimeo, Reddit, and RedGifs video URLs are supported right now.",
  };
}
