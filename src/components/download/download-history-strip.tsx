"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { RequestedDownloadFormat, RequestedDownloadQuality } from "@/lib/video-links";

type SavedVideoRecord = {
  id: string;
  sourceUrl: string;
  canonicalUrl: string;
  title: string;
  thumbnailUrl: string | null;
  authorName: string | null;
  provider: string | null;
  durationLabel: string | null;
  requestedFormat: RequestedDownloadFormat;
  requestedQuality: RequestedDownloadQuality;
  fileName: string | null;
  storagePath: string | null;
  videoUrl: string | null;
  createdAt: string;
};

type GalleryItem = {
  id: string;
  title: string;
  canonicalUrl: string | null;
  sourceUrl: string | null;
  thumbnailUrl: string | null;
  authorName: string | null;
  provider: string | null;
  durationLabel: string | null;
  videoUrl: string | null;
  storagePath: string | null;
  format: RequestedDownloadFormat | null;
  quality: RequestedDownloadQuality | null;
  updatedAt: string;
  downloadedBytes: number;
  totalBytes: number | null;
  progressPercent: number | null;
  message: string;
};

const getVideoPageSlug = (item: Pick<GalleryItem, "id" | "canonicalUrl" | "sourceUrl">) => {
  const candidateUrl = item.canonicalUrl ?? item.sourceUrl;

  if (candidateUrl) {
    try {
      const parsedUrl = new URL(candidateUrl);
      const videoId = parsedUrl.searchParams.get("v")?.trim();

      if (videoId) {
        return videoId;
      }
    } catch {
      // fall back to the item id below
    }
  }

  return item.id;
};

const buildVideoPageHref = (item: GalleryItem) => {
  const searchParams = new URLSearchParams();

  if (item.canonicalUrl ?? item.sourceUrl) {
    searchParams.set("url", item.canonicalUrl ?? item.sourceUrl ?? "");
  }

  searchParams.set("title", item.title);

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

  if (item.format) {
    searchParams.set("format", item.format);
  }

  if (item.quality) {
    searchParams.set("quality", item.quality);
  }

  return `/tv/${encodeURIComponent(getVideoPageSlug(item))}?${searchParams.toString()}`;
};

const NSFW_TOGGLE_KEY = "z.nsfw-enabled.v1";

const readNsfwToggle = () => {
  if (typeof window === "undefined") return false;
  try { return window.localStorage.getItem(NSFW_TOGGLE_KEY) === "1"; } catch { return false; }
};

const writeNsfwToggle = (value: boolean) => {
  try { window.localStorage.setItem(NSFW_TOGGLE_KEY, value ? "1" : "0"); } catch { /* no-op */ }
};

function ThumbnailImage({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <div className="h-full w-full bg-blue-900/60 blur-xl" />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="176px"
      className="object-cover transition duration-300 group-hover:scale-[1.05]"
      onError={() => setFailed(true)}
    />
  );
}


export function DownloadHistoryStrip(props: { locale?: Locale }) {
  const locale = props.locale ?? "en";
  const t = getDictionary(locale);
  const [savedVideos, setSavedVideos] = useState<SavedVideoRecord[]>([]);
  const [nsfwEnabled, setNsfwEnabled] = useState(false);
  const [showNsfwConfirm, setShowNsfwConfirm] = useState(false);
  const [fetchErrorIds, setFetchErrorIds] = useState<string[]>([]);

  useEffect(() => {
    setNsfwEnabled(readNsfwToggle());
  }, []);

  const toggleNsfw = useCallback(() => {
    if (!nsfwEnabled) {
      setShowNsfwConfirm(true);
      return;
    }
    setNsfwEnabled(false);
    writeNsfwToggle(false);
  }, [nsfwEnabled]);

  const confirmNsfw = useCallback(() => {
    setNsfwEnabled(true);
    writeNsfwToggle(true);
    setShowNsfwConfirm(false);
  }, []);

  useEffect(() => {
    const loadSavedVideos = async () => {
      try {
        const response = await fetch("/api/videos", {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({ items: [] }))) as {
          items?: SavedVideoRecord[];
        };
        if (response.ok && Array.isArray(payload.items)) {
          setSavedVideos(payload.items);
          setFetchErrorIds([]);
        }
      } catch {
        // If fetch fails, set error for all
        setFetchErrorIds(savedVideos.map(v => v.id));
      }
    };

    void loadSavedVideos();

    // Listen for new video downloads
    function handleNewVideo(event: CustomEvent) {
      const newVideo = event.detail;
      setSavedVideos((prev) => [newVideo, ...prev.filter(v => v.id !== newVideo.id)]);
    }
    window.addEventListener("z:video-downloaded", handleNewVideo as EventListener);
    return () => {
      window.removeEventListener("z:video-downloaded", handleNewVideo as EventListener);
    };
  }, [savedVideos]);

  const handleRetry = async (videoId: string) => {
    setFetchErrorIds((prev) => prev.filter((id) => id !== videoId));
    try {
      const response = await fetch(`/api/videos?id=${videoId}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => ({ items: [] }))) as { items?: SavedVideoRecord[] };
      if (response.ok && Array.isArray(payload.items) && payload.items && payload.items.length > 0) {
        const newVideo = payload.items[0];
        if (newVideo) {
          setSavedVideos((prev) => [newVideo, ...prev.filter((v) => v.id !== videoId)]);
        }
      } else {
        setFetchErrorIds((prev) => [...prev, videoId]);
      }
    } catch {
      setFetchErrorIds((prev) => [...prev, videoId]);
    }
  };

  const visibleItems = useMemo(() => {
    const galleryItems: GalleryItem[] = savedVideos.map((item) => ({
      id: item.id,
      title: item.title,
      canonicalUrl: item.canonicalUrl,
      sourceUrl: item.sourceUrl,
      thumbnailUrl: item.thumbnailUrl,
      authorName: item.authorName,
      provider: item.provider,
      durationLabel: item.durationLabel,
      videoUrl: item.videoUrl,
      storagePath: item.storagePath,
      format: item.requestedFormat,
      quality: item.requestedQuality,
      updatedAt: item.createdAt,
      downloadedBytes: 0,
      totalBytes: null,
      progressPercent: 100,
      message: "Saved for replay in the swipe viewer.",
    }));

    const sorted = galleryItems.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    if (!nsfwEnabled) {
      // Hide redgifs, reddit, and pornhub videos by default (NSFW off)
      return sorted.filter((item) => {
        const provider = item.provider?.toLowerCase() || "";
        const url = (item.canonicalUrl || item.sourceUrl || "").toLowerCase();
        // Hide if provider is redgifs, reddit, or pornhub, or url contains pornhub
        if (provider.includes("redgifs") || provider.includes("reddit") || provider.includes("pornhub")) return false;
        if (url.includes("pornhub.com")) return false;
        return true;
      });
    }

    return sorted;
  }, [savedVideos, nsfwEnabled]);

  return (
    <>
      <section className="rounded-3xl border border-none p-1 backdrop-blur">

        <div className="mt-0 flex snap-x snap-mandatory gap-2 overflow-x-auto scrollbar-hide pb-2">
          {savedVideos.length === 0 ? (
            <div className="flex w-full justify-center items-center min-h-30">
              <Image src="/loader.gif" alt="Loading..." width={48} height={48} />
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="min-w-72 snap-start rounded-3xl border border-dashed border-white/15 bg-white/5 p-5">
              <p className="text-sm font-semibold text-white">{t.noSavedVideos}</p>
              <p className="mt-2 text-sm text-slate-300">
                {t.finishDownload}
              </p>
            </div>
          ) : (
            visibleItems.map((item) => {
              const hasError = fetchErrorIds.includes(item.id);
              return (
                <div key={item.id} className="relative h-100 w-64 shrink-0">
                  {hasError ? (
                    <div className="flex flex-col items-center justify-center h-full w-full bg-red-900/30 rounded-2xl p-4">
                      <p className="text-sm text-red-200 mb-2">{t.somethingWentWrong}</p>
                      <button
                        className="rounded-full bg-red-600 hover:bg-red-700 text-white px-4 py-1 text-xs font-semibold shadow"
                        onClick={() => handleRetry(item.id)}
                      >
                        Retry
                      </button>
                    </div>
                  ) : (
                    <Link
                      href={buildVideoPageHref(item)}
                      className="group relative block h-100 w-64 shrink-0 cursor-pointer snap-start overflow-hidden rounded-2xl border border-white/10 transition hover:border-sky-400/40"
                    >
                      <ThumbnailImage src={item.thumbnailUrl} alt={item.title} />
                      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition duration-300 group-hover:opacity-100">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-slate-950/80 shadow-xl backdrop-blur">
                          <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5 fill-white">
                            <path d="M8 6.5v11l9-5.5-9-5.5Z" />
                          </svg>
                        </div>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-2.5 opacity-0 transition duration-300 group-hover:opacity-100">
                        <h3 className="line-clamp-2 text-xs font-semibold text-white drop-shadow-lg">{item.title}</h3>
                        {item.authorName ? <p className="mt-0.5 line-clamp-1 text-[10px] text-white/70">{item.authorName}</p> : null}
                      </div>
                    </Link>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleNsfw}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${
                nsfwEnabled ? "border-rose-500/40 bg-rose-600" : "border-white/15 bg-white/10"
              }`}
              role="switch"
              aria-checked={nsfwEnabled}
              aria-label="Toggle 18+ content"
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white/50 shadow-sm transition-transform ${
                  nsfwEnabled ? "translate-x-5.5" : "translate-x-0.5"
                }`}
              />
            </button>
            <span className="text-xs text-slate-400">+18</span>
          </div>
        </div>
      </section>

      {showNsfwConfirm ? (
        <div className="fixed inset-0 z-9999 flex items-center justify-center">
          <button
            type="button"
            aria-label="Cancel"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowNsfwConfirm(false)}
          />
          <div className="relative z-10 mx-4 w-full max-w-sm rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Age Verification</h3>
            <p className="mt-3 text-sm text-slate-300">
              You are about to enable +18 content. This section may contain explicit material intended only for adults.
            </p>
            <p className="mt-2 text-sm text-slate-300">
              By continuing, you confirm that you are at least 18 years old and that viewing such content is legal in your jurisdiction.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowNsfwConfirm(false)}
                className="flex-1 cursor-pointer rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmNsfw}
                className="flex-1 cursor-pointer rounded-full border border-rose-500/30 bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500"
              >
                I am 18+, continue
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
