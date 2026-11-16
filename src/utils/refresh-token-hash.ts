// Import Library
import crypto from "node:crypto";

/* -------------------------------------- Functions -------------------------------------- */

// Function ดึง secret ที่ใช้ hash refresh token และตรวจว่าแข็งแรงพอ
function getRefreshTokenHashSecret(): string {
  const secret = process.env.REFRESH_TOKEN_HASH_SECRET;

  if (!secret || secret.length < 32 || secret.startsWith("CHANGE_ME")) {
    throw new Error("REFRESH_TOKEN_HASH_SECRET must be a strong value (at least 32 characters, not a placeholder).");
  }

  return secret;
}

// Function hash refresh token ด้วย HMAC ก่อนเก็บลง DB
export function hashRefreshToken(refreshToken: string): string {
  const digest = crypto.createHmac("sha256", getRefreshTokenHashSecret()).update(refreshToken).digest("base64url");

  return `hmac-sha256$${digest}`;
}

// Function เทียบ hash ของ refresh token แบบ timing-safe
export function refreshTokenHashesMatch(candidateHash: string, storedHash: string): boolean {
  const candidateBuffer = Buffer.from(candidateHash);
  const storedBuffer = Buffer.from(storedHash);

  return candidateBuffer.length === storedBuffer.length && crypto.timingSafeEqual(candidateBuffer, storedBuffer);
}
