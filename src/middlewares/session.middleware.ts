// Import Library
import type { Next } from "hono";
// Import Repositories
import * as accountRepository from "../repositories/account.repository";
import * as sessionRepository from "../repositories/session.repository";
// Import Types
import type { AppContext } from "../types/http.type";
// Import Utils
import ApiError from "../utils/api-error";

/* -------------------------------------- Functions -------------------------------------- */

// Function ตรวจว่า session ใน token ยัง active และ account ยังใช้งานได้ (logout แล้ว token ใช้ต่อไม่ได้)
export default async function sessionMiddleware(c: AppContext, next: Next): Promise<void> {
  const auth = c.get("auth");

  if (!auth) {
    throw new ApiError(401, "INVALID_TOKEN", "Invalid or expired token.");
  }

  const session = await sessionRepository.findActiveById(auth.session_id);

  if (!session || session.account_id !== auth.account_id) {
    throw new ApiError(401, "INVALID_TOKEN", "Session is no longer active.");
  }

  const account = await accountRepository.findById(auth.account_id);

  if (!account || account.status !== "active") {
    throw new ApiError(401, "INVALID_TOKEN", "Account is inactive.");
  }

  c.set("session", session);
  await next();
}
