// Import Config
import { getAccessTokenExpiresInSeconds, getRefreshTokenExpiresInSeconds } from "../config/auth.config";
import { getRolePermissions, isAccountRole } from "../config/permission.config";
// Import Repositories
import * as accountRepository from "../repositories/account.repository";
import * as sessionRepository from "../repositories/session.repository";
// Import Types
import type { AccessTokenPayload, AccountDto, AuthTokenResponse, MeResponse, RequestClientContext, SessionDto } from "../types/auth.type";
// Import Validation
import { parseWithSchema } from "../validation/parser";
import { loginBodySchema, refreshBodySchema } from "../validation/schemas";
// Import Utils
import ApiError from "../utils/api-error";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { logger } from "../utils/logger";
import { hashPassword, verifyPassword } from "../utils/password";
import { hashRefreshToken, refreshTokenHashesMatch } from "../utils/refresh-token-hash";

/* -------------------------------------- Config -------------------------------------- */

// Config hash ปลอมใช้ verify เมื่อไม่พบ username ให้เวลาตอบเท่ากับกรณีรหัสผิด (กัน timing attack)
let dummyPasswordHashPromise: Promise<string> | null = null;

/* -------------------------------------- Helpers -------------------------------------- */

// Function ดึง hash ปลอมสำหรับ verify (สร้างครั้งแรกครั้งเดียว)
function getDummyPasswordHash(): Promise<string> {
  dummyPasswordHashPromise ??= hashPassword("center-hook-dummy-password");
  return dummyPasswordHashPromise;
}

// Function ตรวจว่า account ยังใช้งานได้ และ role อยู่ในระบบ
function isUsableAccount(account: AccountDto | null): account is AccountDto {
  return Boolean(account && account.status === "active" && isAccountRole(account.role));
}

// Function ออก access/refresh token ของ session แล้วบันทึก hash ของ refresh token
async function issueTokens(account: AccountDto, session: SessionDto): Promise<AuthTokenResponse> {
  if (!isAccountRole(account.role)) {
    throw new ApiError(401, "INVALID_TOKEN", "Account role is not supported.");
  }

  const accessToken = signAccessToken({
    account_id: account.id,
    role: account.role,
    permissions: getRolePermissions(account.role),
    session_id: session.id,
  });
  const refreshToken = signRefreshToken({ account_id: account.id, role: account.role, session_id: session.id });
  const rotated = await sessionRepository.rotateRefreshTokenHash(
    session.id,
    hashRefreshToken(refreshToken),
    session.refresh_token_hash,
    new Date(Date.now() + getRefreshTokenExpiresInSeconds() * 1000)
  );

  if (!rotated) {
    // อีก request ใช้ refresh token เดียวกัน refresh ไปก่อนแล้ว
    throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token.");
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
    expires_in: getAccessTokenExpiresInSeconds(),
  };
}

/* -------------------------------------- Functions -------------------------------------- */

// Function login ด้วย username/password (account มี session เดียว login ใหม่ revoke session เดิม)
export async function login(body: unknown, context: RequestClientContext): Promise<AuthTokenResponse> {
  const { username, password } = parseWithSchema(loginBodySchema, body);
  const account = await accountRepository.findByUsername(username);
  const passwordValid = await verifyPassword(password, account?.password_hash ?? (await getDummyPasswordHash()));

  if (!passwordValid || !isUsableAccount(account)) {
    logger.warn("Login failed.", { username, ip: context.ip_address });
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid username or password.");
  }

  const session = await sessionRepository.createPendingSession(
    account.id,
    new Date(Date.now() + getRefreshTokenExpiresInSeconds() * 1000),
    context
  );

  await sessionRepository.revokeActiveSessions(account.id, session.id);
  logger.info("Login succeeded.", { accountId: account.id, sessionId: session.id });

  return issueTokens(account, session);
}

// Function ออก token ชุดใหม่ด้วย refresh token (หมุน refresh token ทุกครั้ง)
export async function refresh(body: unknown): Promise<AuthTokenResponse> {
  const { refresh_token: refreshToken } = parseWithSchema(refreshBodySchema, body);
  const payload = verifyRefreshToken(refreshToken);
  const session = await sessionRepository.findActiveById(payload.session_id);

  if (
    !session ||
    session.account_id !== payload.account_id ||
    !refreshTokenHashesMatch(hashRefreshToken(refreshToken), session.refresh_token_hash)
  ) {
    throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token.");
  }

  const account = await accountRepository.findById(payload.account_id);

  if (!isUsableAccount(account)) {
    throw new ApiError(423, "ACCOUNT_INACTIVE", "Account is inactive.");
  }

  return issueTokens(account, session);
}

// Function logout และ revoke session ปัจจุบัน
export async function logout(auth: AccessTokenPayload | undefined): Promise<{ message: string }> {
  if (!auth) {
    throw new ApiError(401, "INVALID_TOKEN", "Invalid or expired token.");
  }

  await sessionRepository.revokeSession(auth.session_id);
  return { message: "Logged out." };
}

// Function ดึงข้อมูล account ของผู้ login พร้อมสิทธิ์
export async function me(auth: AccessTokenPayload | undefined): Promise<MeResponse> {
  const account = auth ? await accountRepository.findById(auth.account_id) : null;

  if (!isUsableAccount(account)) {
    throw new ApiError(401, "INVALID_TOKEN", "Account is inactive.");
  }

  return {
    id: account.id,
    username: account.username,
    full_name: account.full_name,
    role: account.role,
    permissions: getRolePermissions(account.role),
  };
}
