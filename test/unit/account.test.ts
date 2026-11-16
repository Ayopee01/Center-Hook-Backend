// Import Helpers
import "../setup/test-env";
// Import Library
import assert from "node:assert/strict";
import { beforeEach, describe, it, mock } from "node:test";
// Import Config
import { getRolePermissions } from "../../src/config/permission.config";
// Import Types
import type { AccessTokenPayload, AccountCreateInput, AccountDto } from "../../src/types/auth.type";
// Import Utils
import ApiError from "../../src/utils/api-error";

/* -------------------------------------- Module Mocks -------------------------------------- */

// Config account ที่ repository ปลอมเก็บไว้ (mock ก่อน require service ที่ใช้ repository)
const accounts: AccountDto[] = [];

mock.module(require.resolve("../../src/repositories/account.repository"), {
  exports: {
    findByUsername: async (username: string) => accounts.find((account) => account.username === username) ?? null,
    findById: async (id: number) => accounts.find((account) => account.id === id) ?? null,
    createAccount: async (input: AccountCreateInput) => {
      const account: AccountDto = {
        id: accounts.length + 1,
        username: input.username,
        password_hash: input.password_hash,
        role: input.role,
        status: "active",
        full_name: input.full_name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      accounts.push(account);
      return account;
    },
  },
});

const { createAdmin } = require("../../src/services/account.service") as typeof import("../../src/services/account.service");
const { default: permissionMiddleware } = require("../../src/middlewares/permission.middleware") as typeof import("../../src/middlewares/permission.middleware");
const { errorHandler } = require("../../src/middlewares/error.middleware") as typeof import("../../src/middlewares/error.middleware");
const { createRouter } = require("../../src/utils/http") as typeof import("../../src/utils/http");

/* -------------------------------------- Test Helpers -------------------------------------- */

// Function สร้าง auth payload ของ role ที่กำหนด
function authOf(role: "owner" | "admin"): AccessTokenPayload {
  return { account_id: 1, role, permissions: getRolePermissions(role), session_id: 1, token_type: "access" };
}

// Function ยิง route ที่ต้องมีสิทธิ์ accounts:create ด้วย role ที่กำหนด
async function requestAsRole(role: "owner" | "admin"): Promise<number> {
  const app = createRouter();
  app.use("*", async (c, next) => {
    c.set("auth", authOf(role));
    await next();
  });
  app.post("/api/accounts", permissionMiddleware(["accounts:create"]), (c) => c.json({ ok: true }, 201));
  app.onError(errorHandler);

  return (await app.request("/api/accounts", { method: "POST" })).status;
}

/* -------------------------------------- Tests -------------------------------------- */

describe("account permissions", () => {
  it("มีแค่ owner ที่มีสิทธิ์ accounts:create", () => {
    assert.deepEqual(getRolePermissions("owner"), ["forward_logs:read", "accounts:create"]);
    assert.deepEqual(getRolePermissions("admin"), ["forward_logs:read"]);
  });

  it("owner เรียก route สร้างบัญชีได้ ส่วน admin ได้ 403", async () => {
    assert.equal(await requestAsRole("owner"), 201);
    assert.equal(await requestAsRole("admin"), 403);
  });
});

describe("createAdmin", () => {
  beforeEach(() => {
    accounts.length = 0;
  });

  it("สร้างบัญชีเป็น role admin เสมอ และไม่คืน password_hash", async () => {
    const result = await createAdmin(
      { username: "admin01", password: "Admin@123456", full_name: "Admin One", role: "owner" },
      authOf("owner")
    );

    assert.equal(result.role, "admin");
    assert.equal(accounts[0].role, "admin");
    assert.notEqual(accounts[0].password_hash, "Admin@123456");
    assert.equal("password_hash" in result, false);
  });

  it("ตอบ 409 เมื่อ username ซ้ำ", async () => {
    const body = { username: "admin01", password: "Admin@123456", full_name: "Admin One" };

    await createAdmin(body, authOf("owner"));
    await assert.rejects(createAdmin(body, authOf("owner")), (error: ApiError) => error.statusCode === 409 && error.code === "USERNAME_TAKEN");
  });

  it("ตอบ 400 เมื่อข้อมูลไม่ครบหรือผิดรูปแบบ", async () => {
    for (const body of [
      {},
      { username: "ab", password: "Admin@123456", full_name: "A" },
      { username: "admin 01", password: "Admin@123456", full_name: "A" },
      { username: "admin01", password: "short", full_name: "A" },
      { username: "admin01", password: "Admin@123456", full_name: " " },
    ]) {
      await assert.rejects(createAdmin(body, authOf("owner")), (error: ApiError) => error.statusCode === 400);
    }
  });
});
