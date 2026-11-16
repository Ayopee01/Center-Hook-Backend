// Import Library
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
// Import Types
import type { RequestClientContext } from "../types/auth.type";
import type { AppContext, AppEnv } from "../types/http.type";

/* -------------------------------------- Functions -------------------------------------- */

// Function สร้าง router ของ app (ยอมรับ / ท้าย path เหมือนกันทุก route)
export function createRouter(): Hono<AppEnv> {
  return new Hono<AppEnv>({ strict: false });
}

// Function ตอบ JSON พร้อม status code
export function sendJson(c: AppContext, body: unknown, status = 200): Response {
  return c.json(body as object, status as ContentfulStatusCode);
}

// Function หา IP ของ client (เชื่อ proxy 1 ชั้น: ใช้ค่าขวาสุดของ X-Forwarded-For ไม่มีจึงใช้ socket)
export function getClientIp(c: AppContext): string | null {
  const forwardedFor = c.req.header("x-forwarded-for")?.split(",").at(-1)?.trim();

  return forwardedFor || c.env?.incoming?.socket.remoteAddress || null;
}

// Function ดึง IP และ user agent ของ request สำหรับบันทึกลง session
export function getRequestClientContext(c: AppContext): RequestClientContext {
  return {
    ip_address: getClientIp(c),
    user_agent: c.req.header("user-agent")?.slice(0, 512) ?? null,
  };
}

// Function อ่าน query string (key ซ้ำใช้ค่าสุดท้าย)
export function getQuery(c: AppContext): Record<string, string> {
  return c.req.query();
}
