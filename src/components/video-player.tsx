"use client";

import { useRef, useEffect } from "react";

type VideoPlayerProps = {
  src: string;
  poster?: string;
  className?: string;
};

export default function VideoPlayer({ src, poster, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.play().catch(() => {
      // Autoplay blocked by browser policy — ignore
    });

    return () => {
      video.pause();
      video.currentTime = 0;
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      key={src}
      src={src}
      poster={poster}
      controls
      playsInline
      preload="auto"
      className={className}
    />
  );
}
