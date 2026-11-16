// Import Library
import assert from "node:assert/strict";
import test from "node:test";
// Import Setup
import "../setup/test-env";
// Import Docs
import setupSwagger from "../../src/docs/swagger";
// Import Utils
import { createRouter } from "../../src/utils/http";

/* -------------------------------------- Helpers -------------------------------------- */

// Function ตั้ง env ชั่วคราว (undefined = ลบ) แล้วคืนฟังก์ชันคืนค่าเดิม
function withEnv(env: Record<string, string | undefined>): () => void {
  const previous = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  const apply = (values: Record<string, string | undefined>) => {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };

  apply(env);
  return () => apply(previous);
}

// Function สร้าง app ที่มีแค่ Swagger ตาม env แล้วยิง request
async function requestDocs(env: Record<string, string | undefined>, path: string, authorization?: string): Promise<number> {
  const restore = withEnv(env);
  const app = createRouter();

  setupSwagger(app);
  restore();

  const response = await app.request(path, { headers: authorization ? { authorization } : {} });
  return response.status;
}

// Function สร้าง header Basic auth
function basic(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

/* -------------------------------------- Tests -------------------------------------- */

const credentials = { API_DOCS_USERNAME: "docs-user", API_DOCS_PASSWORD: "docs-pass", NODE_ENV: "production" };

test("api docs require basic auth when credentials are configured", async () => {
  for (const path of ["/api-docs", "/api-docs/openapi.json", "/api-docs/swagger-ui.css"]) {
    assert.equal(await requestDocs(credentials, path), 401, path);
    assert.equal(await requestDocs(credentials, path, basic("docs-user", "wrong")), 401, path);
    assert.equal(await requestDocs(credentials, path, basic("wrong", "docs-pass")), 401, path);
    assert.equal(await requestDocs(credentials, path, basic("docs-user", "docs-pass")), 200, path);
  }
});

test("api docs are disabled in production when credentials are not configured", async () => {
  const env = { API_DOCS_USERNAME: undefined, API_DOCS_PASSWORD: undefined, NODE_ENV: "production" };

  assert.equal(await requestDocs(env, "/api-docs/openapi.json"), 404);
});

test("api docs stay open outside production when credentials are not configured", async () => {
  const env = { API_DOCS_USERNAME: undefined, API_DOCS_PASSWORD: undefined, NODE_ENV: "development" };

  assert.equal(await requestDocs(env, "/api-docs/openapi.json"), 200);
});

test("openapi spec lists every route", async () => {
  const restore = withEnv({ API_DOCS_USERNAME: undefined, API_DOCS_PASSWORD: undefined, NODE_ENV: "development" });
  const app = createRouter();

  setupSwagger(app);
  restore();

  const spec = (await (await app.request("/api-docs/openapi.json")).json()) as { paths: Record<string, unknown> };

  assert.deepEqual(Object.keys(spec.paths).sort(), [
    "/api/accounts",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/me",
    "/api/auth/refresh",
    "/api/forward-logs",
    "/api/forward-logs/{id}",
    "/api/line/webhook",
    "/livez",
    "/readyz",
  ]);
});
