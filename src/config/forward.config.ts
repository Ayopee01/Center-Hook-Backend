// Import Config
import { readPositiveIntegerEnv } from "./env";

/* -------------------------------------- Config -------------------------------------- */

// Config การส่งต่อ event ไปปลายทาง (replyToken อายุสั้น จึง retry น้อยครั้งและไม่รอนาน)
export const FORWARD_CONFIG = {
  timeoutMs: readPositiveIntegerEnv("FORWARD_TIMEOUT_MS", 10_000),
  maxAttempts: readPositiveIntegerEnv("FORWARD_MAX_ATTEMPTS", 3),
  retryDelayMs: readPositiveIntegerEnv("FORWARD_RETRY_DELAY_MS", 1_000),
  // ตัดข้อความที่เก็บลง log ไม่ให้ใหญ่เกิน
  maxContentLength: 1_000,
  maxResponseBodyLength: 2_000,
} as const;

// Config อายุ forward log ก่อนลบอัตโนมัติ (วัน)
export const FORWARD_LOG_RETENTION_DAYS = readPositiveIntegerEnv("FORWARD_LOG_RETENTION_DAYS", 90);

// Config รอบการลบ forward log ที่หมดอายุ (6 ชั่วโมง)
export const FORWARD_LOG_CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
