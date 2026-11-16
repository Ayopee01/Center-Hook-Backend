// Import Helpers
import "../setup/test-env";
// Import Library
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
// Import Types
import type { ForwardLogCreateInput } from "../../src/types/forward-log.type";
// Import Utils
import ApiError from "../../src/utils/api-error";
import { isValidLineSignature, signLineBody } from "../../src/utils/line-signature";

/* -------------------------------------- Module Mocks -------------------------------------- */

// Config log ที่ repository ปลอมบันทึกไว้ (mock ก่อน require service ที่ใช้ repository)
const savedLogs: ForwardLogCreateInput[] = [];

mock.module(require.resolve("../../src/repositories/forward-log.repository"), {
  exports: {
    createForwardLog: async (input: ForwardLogCreateInput) => {
      savedLogs.push(input);
    },
  },
});

const { waitForBackgroundTasks } = require("../../src/runtime/background-tasks") as typeof import("../../src/runtime/background-tasks");
const { handleLineWebhook } = require("../../src/services/line-webhook.service") as typeof import("../../src/services/line-webhook.service");

/* -------------------------------------- Config -------------------------------------- */

// Config secret เดียวกับ test-env
const SECRET = "test-line-channel-secret";

// Config token ตัวอย่างรูปแบบเดียวกับ Labor
const LABOR_TOKEN = "AbCdEfGhIjKlMnOpQrStUvWxYz012_-9";

/* -------------------------------------- Test Helpers -------------------------------------- */

// Function สร้าง body ของ LINE webhook พร้อม signature ที่ถูกต้อง
function buildSignedRequest(events: unknown[]): { rawBody: string; signature: string } {
  const rawBody = JSON.stringify({ destination: "Udestination", events });

  return { rawBody, signature: signLineBody(rawBody, SECRET) };
}

/* -------------------------------------- Tests -------------------------------------- */

describe("handleLineWebhook", () => {
  let fetchCalls: { url: string; body: string; signature: string }[];

  beforeEach(() => {
    savedLogs.length = 0;
    fetchCalls = [];
    mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
      fetchCalls.push({
        url,
        body: String(init.body),
        signature: (init.headers as Record<string, string>)["x-line-signature"],
      });
      return new Response("{}", { status: 200 });
    });
  });

  afterEach(() => {
    mock.restoreAll();
    process.env.WEBHOOK_URL = "http://other.test/webhook";
  });

  it("ตอบ 401 เมื่อ signature ไม่ถูกต้อง และไม่ส่งต่อ", async () => {
    const { rawBody } = buildSignedRequest([{ type: "follow" }]);

    assert.throws(() => handleLineWebhook(rawBody, "invalid"), (error: unknown) => error instanceof ApiError && error.statusCode === 401);
    assert.throws(() => handleLineWebhook(rawBody, undefined), (error: unknown) => error instanceof ApiError && error.statusCode === 401);
    await waitForBackgroundTasks(1000);
    assert.equal(fetchCalls.length, 0);
  });

  it("กด Verify (events ว่าง) ตอบสำเร็จโดยไม่ส่งต่อ", async () => {
    const { rawBody, signature } = buildSignedRequest([]);

    assert.equal(handleLineWebhook(rawBody, signature).received, 0);
    await waitForBackgroundTasks(1000);
    assert.equal(fetchCalls.length, 0);
    assert.equal(savedLogs.length, 0);
  });

  it("แยก event ไปแต่ละ project ทีละ event พร้อมเซ็นใหม่และบันทึก log", async () => {
    const laborEvent = { type: "postback", webhookEventId: "E1", source: { userId: "U1" }, postback: { data: `token=${LABOR_TOKEN}` } };
    const otherEvent = { type: "message", webhookEventId: "E2", source: { userId: "U2" }, message: { type: "text", text: "สวัสดี" } };
    const { rawBody, signature } = buildSignedRequest([laborEvent, otherEvent]);

    assert.equal(handleLineWebhook(rawBody, signature).received, 2);
    await waitForBackgroundTasks(1000);

    assert.deepEqual(fetchCalls.map((call) => call.url), ["http://labor.test/api/line/webhook", "http://other.test/webhook"]);

    for (const call of fetchCalls) {
      const forwarded = JSON.parse(call.body);
      assert.equal(forwarded.destination, "Udestination");
      assert.equal(forwarded.events.length, 1);
      assert.ok(isValidLineSignature(call.body, SECRET, call.signature));
    }

    assert.deepEqual(
      savedLogs.map((log) => [log.project, log.status, log.line_user_id, log.content, log.webhook_event_id]),
      [
        ["labor", "SUCCESS", "U1", `token=${LABOR_TOKEN}`, "E1"],
        ["default", "SUCCESS", "U2", "สวัสดี", "E2"],
      ]
    );
    assert.equal(savedLogs[0].request_id, savedLogs[1].request_id);
  });

  it("บันทึก SKIPPED เมื่อไม่ได้ตั้ง WEBHOOK_URL", async () => {
    delete process.env.WEBHOOK_URL;
    const { rawBody, signature } = buildSignedRequest([{ type: "message", message: { type: "image" } }]);

    handleLineWebhook(rawBody, signature);
    await waitForBackgroundTasks(1000);

    assert.equal(fetchCalls.length, 0);
    assert.equal(savedLogs[0].status, "SKIPPED");
    assert.equal(savedLogs[0].content, "[image]");
    assert.equal(savedLogs[0].error_message, "WEBHOOK_URL is not configured.");
  });
});
