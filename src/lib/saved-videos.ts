import type { RequestedDownloadFormat, RequestedDownloadQuality } from "@/lib/video-links";

export type SavedVideoRecord = {
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
  fileSizeBytes: number | null;
  createdAt: string;
  viewCount: number | null;
  publishDate: string | null;
};

export type SaveVideoInput = Omit<SavedVideoRecord, "id" | "createdAt">;

type SupabaseSavedVideoRow = {
  id: string;
  source_url: string;
  canonical_url: string;
  title: string;
  thumbnail_url: string | null;
  author_name: string | null;
  provider: string | null;
  duration_label: string | null;
  requested_format: RequestedDownloadFormat;
  requested_quality: RequestedDownloadQuality;
  file_name: string | null;
  storage_path: string | null;
  video_url: string | null;
  file_size_bytes: number | null;
  created_at: string;
  view_count: number | null;
  publish_date: string | null;
};

type UploadVideoToStorageInput = {
  canonicalUrl: string;
  title: string;
  requestedFormat: RequestedDownloadFormat;
  requestedQuality: RequestedDownloadQuality;
  fileName: string;
  contentType: string;
  fileBytes: ArrayBuffer;
};

const TABLE_NAME = "saved_videos";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;
const LEGACY_VIDEO_SELECT =
  "id,source_url,canonical_url,title,thumbnail_url,author_name,provider,duration_label,requested_format,requested_quality,created_at";
const EXTENDED_VIDEO_SELECT = `${LEGACY_VIDEO_SELECT},file_name,storage_path,video_url,file_size_bytes`;

const getSupabaseConfig = () => {
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SECRET_KEY?.trim();
  const bucketName =
    process.env.SUPABASE_VIDEOS_BUCKET?.trim() ||
    process.env.SUPABASE_VIDEO_BUCKET?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_VIDEOS_BUCKET?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_VIDEO_BUCKET?.trim() ||
    null;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return {
    url,
    serviceRoleKey,
    bucketName,
  };
};

const toSavedVideoRecord = (row: SupabaseSavedVideoRow): SavedVideoRecord => {
  return {
    id: row.id,
    sourceUrl: row.source_url,
    canonicalUrl: row.canonical_url,
    title: row.title,
    thumbnailUrl: row.thumbnail_url,
    authorName: row.author_name,
    provider: row.provider,
    durationLabel: row.duration_label,
    requestedFormat: row.requested_format,
    requestedQuality: row.requested_quality,
    fileName: row.file_name,
    storagePath: row.storage_path,
    videoUrl: row.video_url,
    fileSizeBytes: row.file_size_bytes,
    createdAt: row.created_at,
    viewCount: row.view_count ?? null,
    publishDate: row.publish_date ?? null,
  };
};

const createSupabaseHeaders = (serviceRoleKey: string, extraHeaders?: Record<string, string>) => {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    ...extraHeaders,
  };
};

const readSupabaseErrorMessage = async (response: Response, fallbackMessage: string) => {
  const rawText = await response.text().catch(() => "");

  if (!rawText.trim()) {
    return fallbackMessage;
  }

  try {
    const parsed = JSON.parse(rawText) as { message?: string; error?: string; hint?: string; details?: string };
    const parts = [parsed.error, parsed.message, parsed.hint, parsed.details].filter(
      (value): value is string => Boolean(value && value.trim()),
    );

    if (parts.length > 0) {
      return parts.join(" ");
    }
  } catch {
    // fall back to raw text below
  }

  return rawText.trim();
};

const isMissingColumnSchemaError = (message: string) => {
  return /column .* does not exist|schema cache|could not find the .* column/i.test(message);
};

const sanitizeStorageSegment = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "video";
};

const buildStoragePath = (input: UploadVideoToStorageInput) => {
  const url = new URL(input.canonicalUrl);
  const videoId = url.searchParams.get("v")?.trim() || sanitizeStorageSegment(input.title);
  const fileExtension = input.fileName.split(".").pop()?.trim().toLowerCase() || (input.requestedFormat === "mp3" ? "m4a" : "mp4");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  return `downloads/${sanitizeStorageSegment(videoId)}-${input.requestedFormat}-${input.requestedQuality}-${timestamp}.${fileExtension}`;
};

const buildPublicStorageUrl = (supabaseUrl: string, bucketName: string, storagePath: string) => {
  const encodedPath = storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return new URL(`/storage/v1/object/public/${bucketName}/${encodedPath}`, supabaseUrl).toString();
};

const createSignedVideoUrl = async (storagePath: string) => {
  const config = getSupabaseConfig();

  if (!config?.bucketName) {
    return null;
  }

  const encodedPath = storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const requestUrl = new URL(`/storage/v1/object/sign/${config.bucketName}/${encodedPath}`, config.url);
  const response = await fetch(requestUrl, {
    method: "POST",
    headers: createSupabaseHeaders(config.serviceRoleKey),
    body: JSON.stringify({
      expiresIn: SIGNED_URL_TTL_SECONDS,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return buildPublicStorageUrl(config.url, config.bucketName, storagePath);
  }

  const payload = (await response.json().catch(() => null)) as { signedURL?: string; signedUrl?: string } | null;
  const signedUrl = payload?.signedURL ?? payload?.signedUrl;

  if (!signedUrl) {
    return buildPublicStorageUrl(config.url, config.bucketName, storagePath);
  }

  return new URL(signedUrl, config.url).toString();
};

export const isSupabaseConfigured = () => {
  return Boolean(getSupabaseConfig());
};

export const isSupabaseStorageConfigured = () => {
  return Boolean(getSupabaseConfig()?.bucketName);
};

export async function uploadVideoToSupabaseStorage(
  input: UploadVideoToStorageInput,
): Promise<{ storagePath: string; videoUrl: string | null }> {
  const config = getSupabaseConfig();

  if (!config?.bucketName) {
    throw new Error("SUPABASE_VIDEO_BUCKET is not configured.");
  }

  const storagePath = buildStoragePath(input);
  const encodedPath = storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const requestUrl = new URL(`/storage/v1/object/${config.bucketName}/${encodedPath}`, config.url);
  const response = await fetch(requestUrl, {
    method: "POST",
    headers: createSupabaseHeaders(config.serviceRoleKey, {
      "Content-Type": input.contentType || "video/mp4",
      "x-upsert": "true",
      "cache-control": "3600",
    }),
    body: Buffer.from(input.fileBytes),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      await readSupabaseErrorMessage(response, `Supabase storage upload failed with status ${response.status}.`),
    );
  }

  return {
    storagePath,
    videoUrl: await createSignedVideoUrl(storagePath),
  };
}

export async function listSavedVideos(limit = 24): Promise<SavedVideoRecord[]> {
  const config = getSupabaseConfig();

  if (!config) {
    return [];
  }

  const fetchRows = async (select: string) => {
    const requestUrl = new URL(`/rest/v1/${TABLE_NAME}`, config.url);
    requestUrl.searchParams.set("select", select);
    requestUrl.searchParams.set("order", "created_at.desc");
    requestUrl.searchParams.set("limit", String(limit));

    const response = await fetch(requestUrl, {
      headers: createSupabaseHeaders(config.serviceRoleKey),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(await readSupabaseErrorMessage(response, `Supabase list failed with status ${response.status}.`));
    }

    const rows = (await response.json()) as SupabaseSavedVideoRow[];
    return Array.isArray(rows) ? rows : [];
  };

  let rows: SupabaseSavedVideoRow[];

  try {
    rows = await fetchRows(EXTENDED_VIDEO_SELECT);
  } catch (error) {
    if (!(error instanceof Error) || !isMissingColumnSchemaError(error.message)) {
      throw error;
    }

    rows = await fetchRows(LEGACY_VIDEO_SELECT);
  }

  const items = rows.map(toSavedVideoRecord);

  return Promise.all(
    items.map(async (item) => {
      if (!item.storagePath) {
        return item;
      }

      return {
        ...item,
        videoUrl: (await createSignedVideoUrl(item.storagePath)) ?? item.videoUrl,
      };
    }),
  );
}

export async function saveVideoRecord(input: SaveVideoInput): Promise<SavedVideoRecord | null> {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  const requestUrl = new URL(`/rest/v1/${TABLE_NAME}`, config.url);
  requestUrl.searchParams.set("on_conflict", "canonical_url,requested_format,requested_quality");

  const basePayload = {
    source_url: input.sourceUrl,
    canonical_url: input.canonicalUrl,
    title: input.title,
    thumbnail_url: input.thumbnailUrl,
    author_name: input.authorName,
    provider: input.provider,
    duration_label: input.durationLabel,
    requested_format: input.requestedFormat,
    requested_quality: input.requestedQuality,
    view_count: input.viewCount ?? null,
    publish_date: input.publishDate ?? null,
  };
  const extendedPayload = {
    ...basePayload,
    file_name: input.fileName,
    storage_path: input.storagePath,
    video_url: input.videoUrl,
    file_size_bytes: input.fileSizeBytes,
  };

  const postPayload = async (payload: object) => {
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: createSupabaseHeaders(config.serviceRoleKey, {
        Prefer: "resolution=merge-duplicates,return=representation",
      }),
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(await readSupabaseErrorMessage(response, `Supabase insert failed with status ${response.status}.`));
    }

    const rows = (await response.json()) as SupabaseSavedVideoRow[];
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  };

  let row: SupabaseSavedVideoRow | null;

  try {
    row = await postPayload(extendedPayload);
  } catch (error) {
    if (!(error instanceof Error) || !isMissingColumnSchemaError(error.message)) {
      throw error;
    }

    row = await postPayload(basePayload);
  }

  if (!row) {
    return null;
  }

  const item = toSavedVideoRecord(row);

  if (!item.storagePath) {
    return item;
  }

  return {
    ...item,
    videoUrl: (await createSignedVideoUrl(item.storagePath)) ?? item.videoUrl,
  };
}
