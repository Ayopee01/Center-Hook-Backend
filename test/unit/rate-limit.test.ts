// Import Library
import assert from "node:assert/strict";
import test from "node:test";
// Import Setup
import "../setup/test-env";
// Import Middlewares
import { jsonBodyMiddleware } from "../../src/middlewares/body.middleware";
import { errorHandler } from "../../src/middlewares/error.middleware";
import { clearRateLimitBuckets, rateLimitMiddleware, toRateLimitIpKey } from "../../src/middlewares/rate-limit.middleware";
// Import Utils
import { createRouter } from "../../src/utils/http";

/* -------------------------------------- Helpers -------------------------------------- */

// Config app ทดสอบที่มีแค่ body parser + rate limit
const app = createRouter();
app.use(jsonBodyMiddleware);
app.use(...rateLimitMiddleware);
app.post("/api/auth/login", (c) => c.json({ ok: true }));
app.get("/api/forward-logs", (c) => c.json({ ok: true }));
app.post("/api/line/webhook", (c) => c.json({ ok: true }));
app.onError(errorHandler);

// Function ยิง request จาก IP ที่กำหนด
function send(path: string, ip: string, body?: unknown): Promise<Response> {
  return Promise.resolve(
    app.request(path, {
      method: body === undefined && path === "/api/forward-logs" ? "GET" : "POST",
      headers: { "x-forwarded-for": ip, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  );
}

/* -------------------------------------- Tests -------------------------------------- */

// เพดานใน test-env: RATE_LIMIT_MAX_REQUESTS=3, AUTH_LOGIN_RATE_LIMIT_MAX_PER_IP=5

test("route group is limited per IP and returns 429 with headers", async () => {
  clearRateLimitBuckets();

  for (let i = 0; i < 3; i += 1) {
    assert.equal((await send("/api/forward-logs", "10.0.0.1")).status, 200);
  }

  const limited = await send("/api/forward-logs", "10.0.0.1");
  assert.equal(limited.status, 429);
  assert.equal(((await limited.json()) as { code: string }).code, "RATE_LIMITED");
  assert.equal(limited.headers.get("RateLimit-Limit"), "3");
  assert.equal(limited.headers.get("RateLimit-Remaining"), "0");
  assert.ok(limited.headers.get("Retry-After"));

  // IP อื่นไม่ชน bucket เดียวกัน
  assert.equal((await send("/api/forward-logs", "10.0.0.2")).status, 200);
});

test("login is limited per username, not per IP", async () => {
  clearRateLimitBuckets();

  for (let i = 0; i < 3; i += 1) {
    assert.equal((await send("/api/auth/login", "10.0.0.1", { username: "owner", password: "x" })).status, 200);
  }

  assert.equal((await send("/api/auth/login", "10.0.0.9", { username: "OWNER", password: "x" })).status, 429);
  assert.equal((await send("/api/auth/login", "10.0.0.1", { username: "admin", password: "x" })).status, 200);
});

test("login has a per-IP ceiling across all usernames", async () => {
  clearRateLimitBuckets();

  for (let i = 0; i < 5; i += 1) {
    assert.equal((await send("/api/auth/login", "10.0.0.1", { username: `user${i}`, password: "x" })).status, 200);
  }

  assert.equal((await send("/api/auth/login", "10.0.0.1", { username: "another", password: "x" })).status, 429);
});

test("IPv6 addresses in the same /56 share one key, IPv4-mapped is unwrapped", () => {
  assert.equal(toRateLimitIpKey("2001:db8:abcd:12ff::1"), toRateLimitIpKey("2001:db8:abcd:1200:ffff::9"));
  assert.notEqual(toRateLimitIpKey("2001:db8:abcd:1200::1"), toRateLimitIpKey("2001:db8:abcd:1300::1"));
  assert.equal(toRateLimitIpKey("::ffff:10.0.0.1"), "10.0.0.1");
  assert.equal(toRateLimitIpKey("10.0.0.1"), "10.0.0.1");
});

test("line webhook is not rate limited", async () => {
  clearRateLimitBuckets();

  for (let i = 0; i < 10; i += 1) {
    assert.equal((await send("/api/line/webhook", "10.0.0.1", {})).status, 200);
  }
});
