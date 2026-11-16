// Import Library
import crypto from "node:crypto";

/* -------------------------------------- Functions -------------------------------------- */

// Function สร้าง x-line-signature (HMAC-SHA256 base64 ของ body ด้วย channel secret)
export function signLineBody(body: string, channelSecret: string): string {
  return crypto.createHmac("sha256", channelSecret).update(body).digest("base64");
}

// Function ตรวจ x-line-signature แบบ timing-safe
export function isValidLineSignature(body: string, channelSecret: string, signature: string): boolean {
  const expected = Buffer.from(signLineBody(body, channelSecret));
  const received = Buffer.from(signature);

  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}
