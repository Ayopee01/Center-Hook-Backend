/* -------------------------------------- Config -------------------------------------- */

// Config หน่วยเวลาที่รองรับสำหรับแปลงอายุ token จาก env
const TIME_UNIT_SECONDS = { s: 1, m: 60, h: 60 * 60, d: 24 * 60 * 60 } as const;

// Config รูปแบบ duration เช่น 15m, 24h หรือเลขวินาที
const DURATION_PATTERN = /^(\d+)([smhd])?$/;

// Config ค่า default ของ token เมื่อไม่ได้กำหนดผ่าน env
export const AUTH_DEFAULTS = {
  accessTokenExpiresInSeconds: 15 * TIME_UNIT_SECONDS.m,
  refreshTokenExpiresInSeconds: 24 * TIME_UNIT_SECONDS.h,
} as const;

/* -------------------------------------- Functions -------------------------------------- */

// Function แปลงค่า duration เป็นวินาที (รูปแบบผิดใช้ fallback)
function parseDurationSeconds(value: string | undefined, fallbackSeconds: number): number {
  const match = value?.trim().match(DURATION_PATTERN);

  if (!match) {
    return fallbackSeconds;
  }

  return Number(match[1]) * TIME_UNIT_SECONDS[(match[2] || "s") as keyof typeof TIME_UNIT_SECONDS];
}

// Function อ่านอายุ access token เป็นวินาที
export function getAccessTokenExpiresInSeconds(): number {
  return parseDurationSeconds(process.env.JWT_ACCESS_EXPIRES_IN, AUTH_DEFAULTS.accessTokenExpiresInSeconds);
}

// Function อ่านอายุ refresh token เป็นวินาที ใช้ทั้ง JWT exp และ session expires_at
export function getRefreshTokenExpiresInSeconds(): number {
  return parseDurationSeconds(process.env.JWT_REFRESH_EXPIRES_IN, AUTH_DEFAULTS.refreshTokenExpiresInSeconds);
}
