import { createHmac, timingSafeEqual } from "node:crypto";
import type { RequestedDownloadFormat, RequestedDownloadQuality } from "@/lib/video-links";

type DownloadSignatureInput = {
  url: string;
  format: RequestedDownloadFormat;
  quality: RequestedDownloadQuality;
  expiresAt: number;
};

const getSignaturePayload = ({ url, format, quality, expiresAt }: DownloadSignatureInput) => {
  return [url, format, quality, String(expiresAt)].join("\n");
};

export const createDownloadSignature = (input: DownloadSignatureInput, secret: string) => {
  return createHmac("sha256", secret).update(getSignaturePayload(input)).digest("hex");
};

export const verifyDownloadSignature = (
  input: DownloadSignatureInput,
  secret: string,
  signature: string,
) => {
  if (!signature || input.expiresAt <= Date.now()) {
    return false;
  }

  const expected = createDownloadSignature(input, secret);
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
};
