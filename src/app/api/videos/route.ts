import { NextResponse } from "next/server";
import {
  isSupabaseConfigured,
  isSupabaseStorageConfigured,
  listSavedVideos,
  saveVideoRecord,
  uploadVideoToSupabaseStorage,
} from "@/lib/saved-videos";

// Helper to find existing video by canonicalUrl, format, quality
async function findExistingVideo(
  canonicalUrl: string,
  requestedFormat: string,
  requestedQuality: string
) {
  if (!canonicalUrl) return null;
  const all = await listSavedVideos(100); // Increase limit if needed
  return all.find(
    (v) =>
      v.canonicalUrl === canonicalUrl &&
      v.requestedFormat === requestedFormat &&
      v.requestedQuality === requestedQuality
  ) || null;
}
import {
  isRequestedDownloadFormat,
  isRequestedDownloadQuality,
  type SupportedVideoProvider,
} from "@/lib/video-links";

export const runtime = "nodejs";

type SaveVideoRequestBody = {
  sourceUrl?: string;
  canonicalUrl?: string;
  title?: string;
  thumbnailUrl?: string | null;
  authorName?: string | null;
  provider?: SupportedVideoProvider | null;
  durationLabel?: string | null;
  requestedFormat?: string;
  requestedQuality?: string;
  fileName?: string | null;
  storagePath?: string | null;
  videoUrl?: string | null;
  fileSizeBytes?: number | string | null;
};

const getFormString = (value: FormDataEntryValue | null) => {
  return typeof value === "string" && value.trim() ? value : null;
};

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ items: [], storage: "disabled" });
  }

  try {
    const items = await listSavedVideos();
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      {
        items: [],
        error: error instanceof Error ? error.message : "Could not load saved videos.",
      },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ saved: false, storage: "disabled" });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let body: SaveVideoRequestBody | null = null;
  let file: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData().catch(() => null);

    if (!formData) {
      return NextResponse.json({ error: "Could not read the upload form data." }, { status: 400 });
    }

    const maybeFile = formData.get("file");
    file = maybeFile instanceof File && maybeFile.size > 0 ? maybeFile : null;
    body = {
      sourceUrl: getFormString(formData.get("sourceUrl")) ?? undefined,
      canonicalUrl: getFormString(formData.get("canonicalUrl")) ?? undefined,
      title: getFormString(formData.get("title")) ?? undefined,
      thumbnailUrl: getFormString(formData.get("thumbnailUrl")),
      authorName: getFormString(formData.get("authorName")),
      provider: (getFormString(formData.get("provider")) as SupportedVideoProvider | null) ?? null,
      durationLabel: getFormString(formData.get("durationLabel")),
      requestedFormat: getFormString(formData.get("requestedFormat")) ?? undefined,
      requestedQuality: getFormString(formData.get("requestedQuality")) ?? undefined,
      fileName: getFormString(formData.get("fileName")) ?? file?.name ?? null,
      storagePath: getFormString(formData.get("storagePath")),
      videoUrl: getFormString(formData.get("videoUrl")),
      fileSizeBytes: getFormString(formData.get("fileSizeBytes")) ?? file?.size ?? null,
    };
  } else {
    body = (await request.json().catch(() => null)) as SaveVideoRequestBody | null;
  }

  if (!body?.sourceUrl || !body?.canonicalUrl || !body?.title) {
    return NextResponse.json(
      {
        error: "Missing video data to save.",
      },
      { status: 400 },
    );
  }

  const requestedFormat = isRequestedDownloadFormat(body.requestedFormat) ? body.requestedFormat : "mp4";
  const requestedQuality = isRequestedDownloadQuality(body.requestedQuality) ? body.requestedQuality : "1080p";
  let storagePath = body.storagePath ?? null;
  let videoUrl = body.videoUrl ?? null;
  let fileName = body.fileName ?? file?.name ?? null;
  const parsedSize = Number(body.fileSizeBytes ?? file?.size ?? 0);
  const fileSizeBytes = Number.isFinite(parsedSize) && parsedSize > 0 ? parsedSize : null;

  try {
    // Check for existing video before saving
    const existing = await findExistingVideo(body.canonicalUrl, requestedFormat, requestedQuality);
    if (existing) {
      return NextResponse.json({
        saved: false,
        duplicate: true,
        item: existing,
      });
    }

    if (file && isSupabaseStorageConfigured()) {
      const uploadedVideo = await uploadVideoToSupabaseStorage({
        canonicalUrl: body.canonicalUrl,
        title: body.title,
        requestedFormat,
        requestedQuality,
        fileName: fileName ?? file.name,
        contentType: file.type || "video/mp4",
        fileBytes: await file.arrayBuffer(),
      });

      storagePath = uploadedVideo.storagePath;
      videoUrl = uploadedVideo.videoUrl;
      fileName ??= file.name;
    }

    const item = await saveVideoRecord({
      sourceUrl: body.sourceUrl,
      canonicalUrl: body.canonicalUrl,
      title: body.title,
      thumbnailUrl: body.thumbnailUrl ?? null,
      authorName: body.authorName ?? null,
      provider: body.provider ?? null,
      durationLabel: body.durationLabel ?? null,
      requestedFormat,
      requestedQuality,
      fileName,
      storagePath,
      videoUrl,
      fileSizeBytes,
      viewCount: null,
      publishDate: null,
    });

    return NextResponse.json({
      saved: true,
      uploaded: Boolean(storagePath),
      item,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not save the video.",
      },
      { status: 502 },
    );
  }
}
