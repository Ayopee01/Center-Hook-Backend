// Import Helpers
import "../setup/test-env";
// Import Library
import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
// Import Services
import { forwardToTarget } from "../../src/services/line-forward.service";

/* -------------------------------------- Test Helpers -------------------------------------- */

// Function สร้าง fetch ปลอมที่ตอบตามลำดับ status ที่กำหนด ("error" = network error)
function mockFetchSequence(statuses: (number | "error")[]) {
  let call = 0;

  return mock.method(globalThis, "fetch", async () => {
    const status = statuses[Math.min(call, statuses.length - 1)];
    call += 1;

    if (status === "error") {
      throw new TypeError("fetch failed");
    }

    return new Response(JSON.stringify({ status }), { status });
  });
}

/* -------------------------------------- Tests -------------------------------------- */

describe("forwardToTarget", () => {
  afterEach(() => mock.restoreAll());

  it("สำเร็จครั้งแรกส่งครั้งเดียว", async () => {
    const fetchMock = mockFetchSequence([200]);
    const result = await forwardToTarget("http://target.test", "{}", "sig");

    assert.equal(result.status, "SUCCESS");
    assert.equal(result.attempts, 1);
    assert.equal(result.http_status, 200);
    assert.equal(fetchMock.mock.callCount(), 1);

    const [, init] = fetchMock.mock.calls[0].arguments as [string, RequestInit];
    assert.equal((init.headers as Record<string, string>)["x-line-signature"], "sig");
  });

  it("retry เมื่อได้ 5xx แล้วสำเร็จ", async () => {
    const result = await (mockFetchSequence([502, 200]), forwardToTarget("http://target.test", "{}", "sig"));

    assert.equal(result.status, "SUCCESS");
    assert.equal(result.attempts, 2);
  });

  it("ไม่ retry เมื่อได้ 4xx", async () => {
    const fetchMock = mockFetchSequence([401]);
    const result = await forwardToTarget("http://target.test", "{}", "sig");

    assert.equal(result.status, "FAILED");
    assert.equal(result.http_status, 401);
    assert.equal(result.error_message, "HTTP 401");
    assert.equal(fetchMock.mock.callCount(), 1);
  });

  it("network error ครบทุกครั้งเป็น FAILED", async () => {
    const fetchMock = mockFetchSequence(["error"]);
    const result = await forwardToTarget("http://target.test", "{}", "sig");

    assert.equal(result.status, "FAILED");
    assert.equal(result.attempts, 3);
    assert.equal(result.http_status, null);
    assert.match(result.error_message ?? "", /fetch failed/);
    assert.equal(fetchMock.mock.callCount(), 3);
  });
});
