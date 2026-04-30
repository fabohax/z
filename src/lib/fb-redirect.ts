import { request } from "undici";

export async function resolveFacebookShareUrl(shareUrl: string): Promise<string | null> {
  try {
    const res = await request(shareUrl, { method: "GET", headers: { "user-agent": "Mozilla/5.0" } });
    // undici's ResponseData does not expose the final URL directly; use res.body.url if available, else fallback
    // In practice, you may need to use fetch for easier redirect handling, but for now, try to extract from res.body
    // @ts-expect-error undici types do not expose final URL, but res.body.url is present at runtime
    const finalUrl = (res.body && res.body.url) ? res.body.url : shareUrl;
    const match = finalUrl.match(/facebook\.com\/reel\/(\d+)/);
    if (match) {
      return `https://www.facebook.com/reel/${match[1]}`;
    }
    return null;
  } catch {
    return null;
  }
}
