// Import Helpers
import "../setup/test-env";
// Import Library
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { basicAuth } from "hono/basic-auth";
import { requestId } from "hono/request-id";
// Import Middlewares
import { bodyLimitMiddleware, jsonBodyMiddleware } from "../../src/middlewares/body.middleware";
import { errorHandler } from "../../src/middlewares/error.middleware";
// Import Utils
import { createRouter } from "../../src/utils/http";

/* -------------------------------------- Test Helpers -------------------------------------- */

// Config app ทดสอบที่ต่อ middleware ลำดับเดียวกับ app จริง
const app = createRouter();
app.use(requestId());
app.use(bodyLimitMiddleware);
app.use(jsonBodyMiddleware);
app.use("/secure", basicAuth({ username: "u", password: "p" }));
app.post("/echo", (c) => c.json({ body: c.get("body") ?? null, request_id: c.get("requestId") }));
app.get("/secure", (c) => c.json({ ok: true }));
app.onError(errorHandler);

/* -------------------------------------- Tests -------------------------------------- */

describe("body limit", () => {
  it("ตอบ 413 PAYLOAD_TOO_LARGE เมื่อ body เกิน 1MB", async () => {
    const response = await app.request("/echo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: "x".repeat(1024 * 1024) }),
    });

    assert.equal(response.status, 413);
    assert.equal(((await response.json()) as { code: string }).code, "PAYLOAD_TOO_LARGE");
  });

  it("body ไม่เกินเพดานยัง parse JSON ได้ตามปกติ", async () => {
    const response = await app.request("/echo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hello: "world" }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(((await response.json()) as { body: unknown }).body, { hello: "world" });
  });
});

describe("request id", () => {
  it("ใช้ X-Request-Id ที่ client ส่งมาถ้ารูปแบบถูกต้อง", async () => {
    const response = await app.request("/echo", { method: "POST", headers: { "x-request-id": "abc-123" } });

    assert.equal(response.headers.get("x-request-id"), "abc-123");
    assert.equal(((await response.json()) as { request_id: string }).request_id, "abc-123");
  });

  it("สร้างใหม่เมื่อค่าที่ส่งมามีอักขระต้องห้าม (กัน log injection)", async () => {
    const response = await app.request("/echo", { method: "POST", headers: { "x-request-id": "bad id\twith tab" } });
    const generated = response.headers.get("x-request-id") ?? "";

    assert.notEqual(generated, "bad id\twith tab");
    assert.match(generated, /^[0-9a-f-]{36}$/);
  });
});

describe("error handler", () => {
  it("ส่ง HTTPException ของ hono ออกไปตามสถานะเดิม ไม่แปลงเป็น 500", async () => {
    const response = await app.request("/secure");

    assert.equal(response.status, 401);
    assert.ok(response.headers.get("www-authenticate"));
  });
});
