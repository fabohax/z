import type { SavedVideoFeedItem } from "@/components/download/saved-videos-fullscreen-feed";
import { listSavedVideos, type SavedVideoRecord } from "@/lib/saved-videos";
import type { Locale } from "@/lib/i18n";

const getVideoSlug = (item: Pick<SavedVideoRecord, "id" | "canonicalUrl" | "sourceUrl">) => {
  const candidateUrl = item.canonicalUrl ?? item.sourceUrl;

  if (candidateUrl) {
    try {
      const parsedUrl = new URL(candidateUrl);
      const parsedVideoId = parsedUrl.searchParams.get("v")?.trim();

      if (parsedVideoId) {
        return parsedVideoId;
      }
    } catch {
      // fall back to the record id below
    }
  }

  return item.id;
};

const buildVideoPageHref = (item: SavedVideoRecord, locale: Locale) => {
  const prefix = locale === "es" ? "/es" : "";
  const searchParams = new URLSearchParams({
    url: item.canonicalUrl ?? item.sourceUrl,
    title: item.title,
    format: item.requestedFormat,
    quality: item.requestedQuality,
  });

  if (item.thumbnailUrl) {
    searchParams.set("thumbnailUrl", item.thumbnailUrl);
  }

  if (item.authorName) {
    searchParams.set("authorName", item.authorName);
  }

  if (item.provider) {
    searchParams.set("provider", item.provider);
  }

  if (item.durationLabel) {
    searchParams.set("durationLabel", item.durationLabel);
  }

  if (item.videoUrl) {
    searchParams.set("videoUrl", item.videoUrl);
  }

  return `${prefix}/tv/${encodeURIComponent(getVideoSlug(item))}?${searchParams.toString()}`;
};

const buildPlaybackUrl = (item: SavedVideoRecord) => {
  if (item.videoUrl) {
    return item.videoUrl;
  }

  return `/api/download/file?${new URLSearchParams({
    url: item.canonicalUrl ?? item.sourceUrl,
    format: item.requestedFormat,
    quality: item.requestedQuality,
    mode: "play",
  }).toString()}`;
};

const buildDownloadUrl = (item: SavedVideoRecord) => {
  if (item.videoUrl) {
    return item.videoUrl;
  }

  return `/api/download/file?${new URLSearchParams({
    url: item.canonicalUrl ?? item.sourceUrl,
    format: item.requestedFormat,
    quality: item.requestedQuality,
  }).toString()}`;
};

const formatSavedAt = (value: string, locale: Locale) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

export async function loadFeedItems(locale: Locale = "en"): Promise<SavedVideoFeedItem[]> {
  let savedVideos: SavedVideoRecord[] = [];

  try {
    savedVideos = await listSavedVideos(120);
  } catch {
    savedVideos = [];
  }

  return savedVideos.map((item) => ({
    id: `${item.id}-${item.requestedFormat}-${item.requestedQuality}`,
    title: item.title,
    authorName: item.authorName,
    provider: item.provider,
    durationLabel: item.durationLabel,
    requestedFormat: item.requestedFormat,
    requestedQuality: item.requestedQuality,
    thumbnailUrl: item.thumbnailUrl,
    pageHref: buildVideoPageHref(item, locale),
    playbackUrl: buildPlaybackUrl(item),
    downloadUrl: buildDownloadUrl(item),
    sourceHref: item.canonicalUrl ?? item.sourceUrl,
    savedAtLabel: formatSavedAt(item.createdAt, locale),
    createdAt: item.createdAt,
  }));
}
