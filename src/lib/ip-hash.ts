import { createHash } from "crypto";

/**
 * Hashes an IP address using SHA-256 and returns a hex string.
 * @param ip The IP address to hash
 */
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}
