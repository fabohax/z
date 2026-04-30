import Image from "next/image";
import Link from "next/link";
import VideoPlayer from "@/components/video-player";
import { getDictionary, localePath, type Locale } from "@/lib/i18n";
import { listSavedVideos, type SavedVideoRecord } from "@/lib/saved-videos";
import {
  isRequestedDownloadFormat,
  isRequestedDownloadQuality,
  type RequestedDownloadFormat,
  type RequestedDownloadQuality,
} from "@/lib/video-links";

const readSearchParam = (value: string | string[] | undefined) => {
  return Array.isArray(value) ? value[0] : value;
};

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

  return `${prefix}/tv/${encodeURIComponent(getVideoSlug(item))}?${searchParams.toString()}`;
};

const buildShareTargets = (title: string, pageUrl: string) => {
  const text = `${title} — watch on Z`;

  return [
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?${new URLSearchParams({ text, url: pageUrl }).toString()}`,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?${new URLSearchParams({ u: pageUrl }).toString()}`,
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?${new URLSearchParams({ text: `${text} ${pageUrl}` }).toString()}`,
    },
    {
      label: "Telegram",
      href: `https://t.me/share/url?${new URLSearchParams({ url: pageUrl, text }).toString()}`,
    },
  ];
};

type VideoPageContentProps = {
  videoId: string;
  searchParams: Record<string, string | string[] | undefined>;
  locale?: Locale;
};

export default async function VideoPageContent({ videoId, searchParams: resolvedSearchParams, locale = "en" }: VideoPageContentProps) {
  const t = getDictionary(locale);

  let savedVideos: SavedVideoRecord[] = [];

  try {
    savedVideos = await listSavedVideos(48);
  } catch {
    savedVideos = [];
  }

  const title = readSearchParam(resolvedSearchParams.title) ?? t.savedVideo;
  const sourceUrl =
    readSearchParam(resolvedSearchParams.url) ?? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const thumbnailUrl = readSearchParam(resolvedSearchParams.thumbnailUrl) ?? null;
  const authorName = readSearchParam(resolvedSearchParams.authorName) ?? null;
  const provider = readSearchParam(resolvedSearchParams.provider) ?? null;
  const durationLabel = readSearchParam(resolvedSearchParams.durationLabel) ?? null;
  const videoUrl = readSearchParam(resolvedSearchParams.videoUrl) ?? null;
  const formatParam = readSearchParam(resolvedSearchParams.format);
  const qualityParam = readSearchParam(resolvedSearchParams.quality);
  const format: RequestedDownloadFormat = isRequestedDownloadFormat(formatParam) ? formatParam : "mp4";
  const quality: RequestedDownloadQuality = isRequestedDownloadQuality(qualityParam) ? qualityParam : "1080p";

  const fallbackPlaybackUrl = `/api/download/file?${new URLSearchParams({
    url: sourceUrl,
    format,
    quality,
    mode: "play",
  }).toString()}`;
  const fallbackDownloadUrl = `/api/download/file?${new URLSearchParams({
    url: sourceUrl,
    format,
    quality,
  }).toString()}`;
  const playbackUrl = videoUrl ?? fallbackPlaybackUrl;
  const downloadUrl = videoUrl ?? fallbackDownloadUrl;
  const pageUrl = `${localePath(locale, "")}/tv/${encodeURIComponent(videoId)}?${new URLSearchParams({
    url: sourceUrl,
    title,
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
    ...(authorName ? { authorName } : {}),
    ...(provider ? { provider } : {}),
    ...(durationLabel ? { durationLabel } : {}),
    format,
    quality,
  }).toString()}`;
  const shareTargets = buildShareTargets(title, pageUrl);
  const currentVideoIndex = savedVideos.findIndex((item) => {
    return getVideoSlug(item) === videoId || item.id === videoId || item.canonicalUrl === sourceUrl || item.sourceUrl === sourceUrl;
  });
  const previousVideo = currentVideoIndex >= 0 ? savedVideos[(currentVideoIndex - 1 + savedVideos.length) % savedVideos.length] : null;
  const nextVideo = currentVideoIndex >= 0 ? savedVideos[(currentVideoIndex + 1) % savedVideos.length] : null;

  // Metadata fields
  // const topic = readSearchParam(resolvedSearchParams.topic) ?? "";

  // ...metadataText was unused and removed to fix lint warning


  return (
    <main className="min-h-screen h-screen bg-[#000] text-slate-100 p-0 m-0">
      <section className="mx-auto w-full max-w-7xl h-full px-0 py-0 sm:px-0 sm:py-0 lg:px-0">
        <div className="overflow-hidden rounded-[28px] border border-none bg-black shadow-2xl shadow-black/30 backdrop-blur h-full">

          <div className="px-0 py-0 sm:px-0 sm:py-0 h-full">
            <div className="relative overflow-hidden rounded-[24px] border border-none bg-black h-full">
              {thumbnailUrl ? (
                <>
                  <Image
                    src={thumbnailUrl}
                    alt={title}
                    fill
                    sizes="100vw"
                    className="object-cover opacity-40 blur-3xl scale-110"
                  />
                  <div className="absolute inset-0 bg-black" />
                </>
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,0,0,0.28),_transparent_0,_transparent_48%),linear-gradient(180deg,_rgba(15,23,42,0.92)_0%,_rgba(2,6,23,0.98)_100%)]" />
              )}

              <div className="relative z-10 flex h-full min-h-0 items-center justify-center p-0 sm:h-full sm:min-h-0 sm:p-0">
                <VideoPlayer
                  src={playbackUrl}
                  poster={thumbnailUrl ?? undefined}
                  className="h-full w-full rounded-[20px] bg-transparent object-contain shadow-2xl shadow-black/40"
                />
              </div>
            </div>
          </div>
          <div className="border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
            <h1 className="max-w-5xl text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">{title}</h1>

            {(authorName || provider || durationLabel) ? (
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-300">
                {authorName ? <span>{authorName}</span> : null}
                {provider ? <span>{authorName ? "•" : ""} {provider}</span> : null}
                {durationLabel ? <span>{authorName || provider ? "•" : ""} {durationLabel}</span> : null}
              </div>
            ) : null}
          </div>

          {/* Video Metadata Section */}
          <div className="border-t border-none px-4 py-4 sm:px-6 sm:py-5">
            <div className="mb-4">
              <ul className="text-sm text-slate-200 space-y-1">
                <li><b>Source:</b> <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline text-sky-300">{sourceUrl}</a></li>
                <li><b>Duration:</b> {durationLabel || "-"}</li>
              </ul>
            </div>

            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-3">
                <Link
                  href={localePath(locale, "/")}
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
                >
                  {t.back}
                </Link>

                <Link
                  href={localePath(locale, "/tv")}
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
                >
                  {t.allSaved}
                </Link>

                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
                >
                  {t.openSourceLink}
                </a>

                <a
                  href={downloadUrl}
                  download
                  className="inline-flex items-center rounded-full border border-sky-400/30 bg-sky-500/15 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-500/20"
                >
                  {t.download}
                </a>
              </div>

              <div className="flex flex-wrap gap-2 xl:justify-end">
                {previousVideo && savedVideos.length > 1 ? (
                  <Link
                    href={buildVideoPageHref(previousVideo, locale)}
                    className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
                  >
                    {t.previous}
                  </Link>
                ) : null}

                {nextVideo && savedVideos.length > 1 ? (
                  <Link
                    href={buildVideoPageHref(nextVideo, locale)}
                    className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
                  >
                    {t.next}
                  </Link>
                ) : null}

                {shareTargets.map((target) => (
                  <a
                    key={target.label}
                    href={target.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
                  >
                    {target.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
