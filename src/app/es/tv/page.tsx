import {
  SavedVideosFullscreenFeed,
} from "@/components/download/saved-videos-fullscreen-feed";
import { loadFeedItems } from "@/lib/feed-data";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "tv" };

export const dynamic = "force-dynamic";

export default async function TvEs() {
  const feedItems = await loadFeedItems("es");

  return <SavedVideosFullscreenFeed videos={feedItems} locale="es" />;
}
