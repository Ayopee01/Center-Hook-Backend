// Import Library
import { isIPv6 } from "node:net";
import { MemoryStore, rateLimiter } from "hono-rate-limiter";
// Import Config
import { readPositiveIntegerEnv } from "../config/env";
// Import Types
import type { AppContext, AppEnv } from "../types/http.type";
// Import Utils
import ApiError from "../utils/api-error";
import { getClientIp } from "../utils/http";

/* -------------------------------------- Config -------------------------------------- */

// Config กลุ่ม route ที่แยก bucket rate limit (ไม่จำกัด /api/line/webhook เพราะ LINE ยิงมาจาก IP ชุดเดียวกันทั้งหมด)
const RATE_LIMITED_ROUTE_GROUPS = [
  { group: "auth", pattern: /^\/api\/auth\// },
  { group: "accounts", pattern: /^\/api\/accounts(\/|$)/ },
  { group: "forward-logs", pattern: /^\/api\/forward-logs(\/|$)/ },
  // กันเดารหัส Basic auth ของ Swagger
  { group: "docs", pattern: /^\/api-docs/ },
] as const;

// Config ช่วงเวลาและเพดานของ rate limit
const RATE_LIMIT = {
  windowMs: readPositiveIntegerEnv("RATE_LIMIT_WINDOW_MS", 60_000),
  maxRequests: readPositiveIntegerEnv("RATE_LIMIT_MAX_REQUESTS", 300),
  // เพดาน login ต่อ IP รวมทุก username กันสุ่ม username ไล่เดารหัสโดยหลบ bucket ต่อบัญชี
  loginMaxPerIp: readPositiveIntegerEnv("AUTH_LOGIN_RATE_LIMIT_MAX_PER_IP", 1000),
};

// Config store ของตัวนับ (เก็บใน memory ของ process ถ้ารันหลาย instance เปลี่ยนเป็น RedisStore ได้)
const routeGroupStore = new MemoryStore<AppEnv>();
const loginIpStore = new MemoryStore<AppEnv>();

/* -------------------------------------- Functions -------------------------------------- */

// Function ขยาย IPv6 เป็น 8 กลุ่มเต็ม
function expandIpv6(ip: string): string[] {
  const [head, tail = ""] = ip.split("%")[0].split("::");
  const headGroups = head ? head.split(":") : [];
  const tailGroups = tail ? tail.split(":") : [];
  const zeros = Array<string>(Math.max(8 - headGroups.length - tailGroups.length, 0)).fill("0");

  return [...headGroups, ...zeros, ...tailGroups];
}

// Function แปลง IP เป็น key ของ rate limit (IPv6 รวมเป็น subnet /56 กันสลับ address หลบเพดาน)
export function toRateLimitIpKey(ip: string): string {
  if (!isIPv6(ip) || ip.includes(".")) {
    return ip.replace(/^::ffff:/i, "");
  }

  const groups = expandIpv6(ip).slice(0, 4).map((group) => group.padStart(4, "0"));

  return `${groups.slice(0, 3).join(":")}:${groups[3].slice(0, 2)}00::/56`;
}

// Function หา client key จาก IP ของ request
function getClientKey(c: AppContext): string {
  return toRateLimitIpKey(getClientIp(c) || "unknown");
}

// Function หากลุ่ม route ของ request (ไม่อยู่ในกลุ่มใดคืน undefined = ไม่จำกัด)
function findRouteGroup(c: AppContext): string | undefined {
  return RATE_LIMITED_ROUTE_GROUPS.find(({ pattern }) => pattern.test(c.req.path))?.group;
}

// Function ดึง username จาก body ของ route auth (ไม่มีคืนค่าว่าง)
function getAuthUsername(c: AppContext): string {
  const body = c.get("body");
  const username = body && typeof body === "object" ? (body as Record<string, unknown>).username : undefined;

  if (findRouteGroup(c) !== "auth" || typeof username !== "string") {
    return "";
  }

  return username.trim().toLowerCase();
}

// Function หา key ของ bucket: route auth ที่มี username ใน body นับต่อบัญชี นอกนั้นนับต่อ IP แยกตามกลุ่ม route
function getRateLimitKey(c: AppContext): string {
  const username = getAuthUsername(c);

  return username ? `auth:user:${username}` : `${findRouteGroup(c)}:${getClientKey(c)}`;
}

// Function ตอบ 429 ผ่าน error handler กลาง (header RateLimit-* / Retry-After ที่ตั้งไว้แล้วติดไปกับ response)
function throwRateLimited(): never {
  throw new ApiError(429, "RATE_LIMITED", "Too many requests.");
}

// Config limiter ต่อกลุ่ม route (ตั้ง header RateLimit-* ทุก response และ Retry-After ตอนเกินเพดาน)
const routeGroupRateLimit = rateLimiter<AppEnv>({
  windowMs: RATE_LIMIT.windowMs,
  limit: RATE_LIMIT.maxRequests,
  standardHeaders: "draft-6",
  store: routeGroupStore,
  skip: (c) => !findRouteGroup(c),
  keyGenerator: getRateLimitKey,
  handler: throwRateLimited,
});

// Config limiter login ต่อ IP (รวมทุกบัญชี) กันเปลี่ยน username ไปเรื่อยๆ เพื่อหลบ bucket ต่อบัญชี
// ปิด standardHeaders ไม่ให้ทับ header ของ limiter ต่อกลุ่ม route
const loginIpRateLimit = rateLimiter<AppEnv>({
  windowMs: RATE_LIMIT.windowMs,
  limit: RATE_LIMIT.loginMaxPerIp,
  standardHeaders: false,
  requestPropertyName: "loginIpRateLimit",
  requestStorePropertyName: "loginIpRateLimitStore",
  store: loginIpStore,
  skip: (c) => !getAuthUsername(c),
  keyGenerator: (c) => `auth:login-ip:${getClientKey(c)}`,
  handler: throwRateLimited,
});

// Config middleware จำกัดจำนวน request ต่อ client ตามกลุ่ม route (ต้องวางหลัง jsonBodyMiddleware เพื่ออ่าน username)
export const rateLimitMiddleware = [routeGroupRateLimit, loginIpRateLimit];

// Function ลบตัวนับทั้งหมด (ใช้ใน test)
export function clearRateLimitBuckets(): void {
  routeGroupStore.resetAll();
  loginIpStore.resetAll();
}
