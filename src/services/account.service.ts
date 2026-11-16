// Import Repositories
import * as accountRepository from "../repositories/account.repository";
// Import Types
import type { AccessTokenPayload, AccountResponse } from "../types/auth.type";
// Import Validation
import { parseWithSchema } from "../validation/parser";
import { createAdminBodySchema } from "../validation/schemas";
// Import Utils
import ApiError from "../utils/api-error";
import { logger } from "../utils/logger";
import { hashPassword } from "../utils/password";

/* -------------------------------------- Functions -------------------------------------- */

// Function สร้างบัญชี admin (role เป็น admin เสมอ owner มีคนเดียวจาก seed จึงสร้างผ่าน API ไม่ได้)
export async function createAdmin(body: unknown, auth: AccessTokenPayload | undefined): Promise<AccountResponse> {
  const { username, password, full_name: fullName } = parseWithSchema(createAdminBodySchema, body);

  if (await accountRepository.findByUsername(username)) {
    throw new ApiError(409, "USERNAME_TAKEN", "Username is already taken.");
  }

  const account = await accountRepository.createAccount({
    username,
    password_hash: await hashPassword(password),
    role: "admin",
    full_name: fullName,
  });

  if (!account) {
    throw new ApiError(409, "USERNAME_TAKEN", "Username is already taken.");
  }

  logger.info("Admin account created.", { accountId: account.id, createdBy: auth?.account_id });

  return {
    id: account.id,
    username: account.username,
    full_name: account.full_name,
    role: account.role,
    status: account.status,
    created_at: account.created_at,
  };
}
