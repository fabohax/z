import type { RequestedDownloadFormat, RequestedDownloadQuality } from "@/lib/video-links";

export type DownloadHistoryStatus = "queued" | "downloading" | "completed" | "failed";

export type DownloadHistoryItem = {
  id: string;
  title: string;
  canonicalUrl: string | null;
  thumbnailUrl: string | null;
  provider: string | null;
  authorName: string | null;
  durationLabel: string | null;
  fileName: string | null;
  videoUrl?: string | null;
  storagePath?: string | null;
  format: RequestedDownloadFormat | null;
  quality: RequestedDownloadQuality | null;
  status: DownloadHistoryStatus;
  progressPercent: number | null;
  downloadedBytes: number;
  totalBytes: number | null;
  message: string;
  createdAt: string;
  updatedAt: string;
};

export const DOWNLOAD_HISTORY_EVENT = "z:downloads-history-updated";

const STORAGE_KEY = "z.download-history.v1";
const MAX_HISTORY_ITEMS = 18;

const canUseStorage = () => {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
};

export const createDownloadHistoryId = () => {
  return `dl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

export function formatBytes(bytes?: number | null) {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) {
    return null;
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 10 || unitIndex === 0 ? 0 : 1;

  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

export function formatHistoryTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function readDownloadHistory(): DownloadHistoryItem[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue) as DownloadHistoryItem[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => item?.status !== "failed")
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  } catch {
    return [];
  }
}

export function writeDownloadHistory(items: DownloadHistoryItem[]) {
  if (!canUseStorage()) {
    return;
  }

  const nextItems = items
    .filter((item) => item.status !== "failed")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, MAX_HISTORY_ITEMS);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
  window.dispatchEvent(new CustomEvent(DOWNLOAD_HISTORY_EVENT));
}

export function upsertDownloadHistory(item: DownloadHistoryItem) {
  const currentItems = readDownloadHistory();
  const existingIndex = currentItems.findIndex((candidate) => candidate.id === item.id);

  if (existingIndex >= 0) {
    currentItems[existingIndex] = item;
    writeDownloadHistory(currentItems);
    return;
  }

  writeDownloadHistory([item, ...currentItems]);
}
