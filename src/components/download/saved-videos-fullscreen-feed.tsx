"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getDictionary, type Locale } from "@/lib/i18n";

export type SavedVideoFeedItem = {
  id: string;
  title: string;
  authorName: string | null;
  provider: string | null;
  durationLabel: string | null;
  requestedFormat: string;
  requestedQuality: string;
  thumbnailUrl: string | null;
  pageHref: string;
  playbackUrl: string;
  downloadUrl: string;
  sourceHref: string;
  savedAtLabel: string | null;
  createdAt: string;
};

type SavedVideosFullscreenFeedProps = {
  videos: SavedVideoFeedItem[];
  locale?: Locale;
};

export function SavedVideosFullscreenFeed({ videos, locale = "en" }: SavedVideosFullscreenFeedProps) {
  const t = getDictionary(locale);
  const router = useRouter();
  // NSFW toggle (same key as other components)
  const NSFW_TOGGLE_KEY = "z.nsfw-enabled.v1";
  const [nsfwEnabled, setNsfwEnabled] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        setNsfwEnabled(window.localStorage.getItem(NSFW_TOGGLE_KEY) === "1");
      } catch {
        setNsfwEnabled(false);
      }
    }
  }, []);

  // Filter out adult content if NSFW is off
  const filteredVideos = useMemo(() => {
    if (nsfwEnabled) return videos;
    return videos.filter(
      (v) => {
        const provider = v.provider?.toLowerCase();
        return provider !== "redgifs" && provider !== "reddit" && provider !== "pornhub";
      }
    );
  }, [videos, nsfwEnabled]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeVideo = filteredVideos[activeIndex] ?? null;
  const nextVideo = filteredVideos.length > 1 ? filteredVideos[(activeIndex + 1) % filteredVideos.length] : null;

  const goToPrevious = useCallback(() => {
    if (filteredVideos.length === 0) {
      return;
    }

    setActiveIndex((currentIndex) => (currentIndex - 1 + filteredVideos.length) % filteredVideos.length);
  }, [filteredVideos.length]);

  const goToNext = useCallback(() => {
    if (filteredVideos.length === 0) {
      return;
    }

    setActiveIndex((currentIndex) => (currentIndex + 1) % filteredVideos.length);
  }, [filteredVideos.length]);

  const infoRows = useMemo(() => {
    if (!activeVideo) {
      return [];
    }

    return [
      { label: t.titleLabel, value: activeVideo.title },
      { label: t.creatorLabel, value: activeVideo.authorName ?? t.unknown },
      { label: t.providerLabel, value: activeVideo.provider ?? t.unknown },
      { label: t.durationLabel, value: activeVideo.durationLabel ?? t.unknown },
      { label: t.formatLabel, value: activeVideo.requestedFormat.toUpperCase() },
      { label: t.qualityLabel, value: activeVideo.requestedQuality },
      { label: t.savedLabel, value: activeVideo.savedAtLabel ?? activeVideo.createdAt },
    ];
  }, [activeVideo, t.creatorLabel, t.providerLabel, t.durationLabel, t.formatLabel, t.qualityLabel, t.savedLabel, t.titleLabel, t.unknown]);

  useEffect(() => {
    const resetTimer = () => {
      setShowControls(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setShowControls(false), 2500);
    };

    resetTimer();
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("touchstart", resetTimer);
    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    setIsInfoOpen(false);
  }, [activeVideo?.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        goToPrevious();
      }

      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        goToNext();
      }

      if (event.key === " ") {
        event.preventDefault();
        if (event.target === videoRef.current) return;
        const video = videoRef.current;
        if (video) {
          if (video.paused) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        }
      }

      if (event.key.toLowerCase() === "i") {
        event.preventDefault();
        setIsInfoOpen((current) => !current);
      }

      if (event.key === "Escape") {
        event.preventDefault();
        router.push("/");
      }

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        if (document.fullscreenElement) {
          void document.exitFullscreen();
        } else {
          void document.documentElement.requestFullscreen();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrevious, router]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !activeVideo) {
      return;
    }

    video.muted = true;

    const attemptPlayback = async () => {
      try {
        await video.play();
        video.muted = false;
      } catch {
        // user interaction may still be required by the browser
      }
    };

    if (video.readyState >= 2) {
      void attemptPlayback();
      return;
    }

    const handleCanPlay = () => {
      void attemptPlayback();
    };

    video.addEventListener("canplay", handleCanPlay, { once: true });
    return () => video.removeEventListener("canplay", handleCanPlay);
  }, [activeVideo]);

  if (videos.length === 0) {
    return (
      <main className="relative flex h-svh items-center justify-center overflow-hidden bg-[#050816] px-4 text-slate-100">
        <div className="relative z-10 w-full max-w-xl rounded-[28px] border border-dashed border-white/10 bg-slate-950/70 px-6 py-12 text-center shadow-2xl shadow-black/30 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-300">tv</p>
          <h1 className="mt-3 text-2xl font-semibold text-white">{t.noSavedVideos}</h1>
          <p className="mt-2 text-sm text-slate-300">{t.noSavedVideosDescription}</p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
          >
            {t.home}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={`relative h-svh overflow-hidden bg-black text-slate-100 ${showControls ? "cursor-auto" : "cursor-none"}`}>
      <div className="absolute inset-0">
        {activeVideo?.thumbnailUrl ? (
          <Image
            src={activeVideo.thumbnailUrl}
            alt={activeVideo.title}
            fill
            priority
            sizes="100vw"
            className="object-cover scale-110 opacity-45 blur-3xl"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.28),transparent_0,transparent_48%),linear-gradient(180deg,rgba(15,23,42,0.92)_0%,rgba(2,6,23,1)_100%)]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.78)_0%,rgba(2,6,23,0.15)_38%,rgba(2,6,23,0.82)_100%)]" />
      </div>

      <div className="relative z-10 flex h-full items-center justify-center">
        <div className="relative h-full w-full overflow-hidden bg-slate-950/20">
          <div className={`absolute right-3 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-3 sm:right-4 transition-opacity duration-300 ${showControls ? "opacity-100" : "pointer-events-none opacity-0"}`}>
            <button
              type="button"
              onClick={goToPrevious}
              className="cursor-pointer inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/45 text-lg text-white backdrop-blur transition hover:bg-white/10"
              aria-label="Previous video"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="cursor-pointer inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/45 text-lg text-white backdrop-blur transition hover:bg-white/10"
              aria-label="Next video"
            >
              ↓
            </button>
          </div>

          <div className="relative flex h-full items-center justify-center">
            <video
              key={activeVideo?.id}
              ref={videoRef}
              src={activeVideo?.playbackUrl}
              poster={activeVideo?.thumbnailUrl ?? undefined}
              controls
              autoPlay
              muted
              playsInline
              preload="auto"
              onEnded={goToNext}
              className={`h-full w-full bg-transparent object-contain ${showControls ? "" : "[&::-webkit-media-controls]:hidden!"}`}
            />
            {nextVideo ? (
              <link rel="preload" href={nextVideo.playbackUrl} as="video" />
            ) : null}
          </div>

          <div className={`pointer-events-none absolute inset-x-0 top-0 z-20 p-3 sm:p-5 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="pointer-events-auto drop-shadow-lg">
                <span className="text-[1rem] font-semibold text-white">{activeVideo?.title}</span>
                {activeVideo?.authorName ? (
                  <span className="block text-[1rem] text-white/50">{activeVideo.authorName}</span>
                ) : null}
              </div>

              <div className="pointer-events-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsInfoOpen((current) => !current)}
                  className="cursor-pointer inline-flex items-center rounded-full border border-white/10 bg-black/45 px-4 py-2 text-sm font-medium text-slate-100 backdrop-blur transition hover:bg-white/10"
                >
                  i
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close info panel"
            onClick={() => setIsInfoOpen(false)}
            className={`absolute inset-0 z-30 bg-black/40 transition ${isInfoOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
          />

          <aside
            className={`absolute inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col border-l border-white/10 bg-slate-950/95 p-4 shadow-2xl shadow-black/40 backdrop-blur transition-transform duration-300 sm:max-w-md sm:p-5 ${isInfoOpen ? "translate-x-0" : "translate-x-full"}`}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-sky-300">{t.currentVideo}</p>
                <h2 className="mt-1 text-lg font-semibold text-white">{t.details}</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsInfoOpen(false)}
                className="cursor-pointer inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-100 transition hover:bg-white/10"
                aria-label="Close video details"
              >
                ×
              </button>
            </div>

            {activeVideo?.thumbnailUrl ? (
              <div className="relative mb-4 aspect-9/16 overflow-hidden rounded-[20px] border border-white/10 bg-slate-900/80">
                <Image src={activeVideo.thumbnailUrl} alt={activeVideo.title} fill sizes="320px" className="object-cover" />
              </div>
            ) : null}

            <div className="space-y-3 overflow-y-auto pr-1">
              {infoRows.map((row) => (
                <div key={row.label} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{row.label}</p>
                  <p className="mt-1 wrap-break-word text-sm text-slate-100">{row.value}</p>
                </div>
              ))}

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{t.sourceUrlLabel}</p>
                <a
                  href={activeVideo?.sourceHref ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block break-all text-sm text-sky-200 underline decoration-white/20 underline-offset-4"
                >
                  {activeVideo?.sourceHref}
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
