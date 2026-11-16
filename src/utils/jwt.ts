// Import Library
import { randomUUID } from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { ZodType } from "zod";
// Import Config
import { getAccessTokenExpiresInSeconds, getRefreshTokenExpiresInSeconds } from "../config/auth.config";
// Import Types
import type { AccessTokenPayload, RefreshTokenPayload } from "../types/auth.type";
// Import Validation
import { parseWithSchema } from "../validation/parser";
import { accessTokenPayloadSchema, refreshTokenPayloadSchema } from "../validation/schemas";
// Import Utils
import ApiError from "./api-error";

/* -------------------------------------- Types -------------------------------------- */

// Type map payload ตามชนิด token
type TokenPayloadByType = { access: AccessTokenPayload; refresh: RefreshTokenPayload };

// Type ชนิด token ที่ระบบออกให้
type TokenType = keyof TokenPayloadByType;

/* -------------------------------------- Config -------------------------------------- */

// Config env ของ secret, อายุ token และ error code แต่ละชนิด
const TOKEN_CONFIG = {
  access: { secretEnv: "JWT_ACCESS_SECRET", expiresIn: getAccessTokenExpiresInSeconds, invalidCode: "INVALID_TOKEN" },
  refresh: { secretEnv: "JWT_REFRESH_SECRET", expiresIn: getRefreshTokenExpiresInSeconds, invalidCode: "INVALID_REFRESH_TOKEN" },
} as const;

// Config schema ที่ใช้ validate payload ของ token แต่ละชนิด
const TOKEN_PAYLOAD_SCHEMAS: { [T in TokenType]: ZodType<TokenPayloadByType[T]> } = {
  access: accessTokenPayloadSchema,
  refresh: refreshTokenPayloadSchema,
};

// Config ค่า secret ที่ห้ามใช้ (placeholder จาก .env.example)
const WEAK_SECRET_PATTERN = /^(secret|password|change-me|CHANGE_ME.*)$/;

/* -------------------------------------- Functions -------------------------------------- */

// Function ดึง secret ของ token และตรวจว่าถูกตั้งและแข็งแรงพอ
function getTokenSecret(tokenType: TokenType): string {
  const secretEnv = TOKEN_CONFIG[tokenType].secretEnv;
  const secret = process.env[secretEnv];

  if (!secret || secret.length < 32 || WEAK_SECRET_PATTERN.test(secret)) {
    throw new Error(`${secretEnv} must be a strong value (at least 32 characters, not a placeholder).`);
  }

  return secret;
}

// Function เซ็น JWT ตามชนิด token
function signTypedToken<T extends TokenType>(payload: Omit<TokenPayloadByType[T], "token_type" | "iat" | "exp">, tokenType: T): string {
  return jwt.sign({ ...payload, token_type: tokenType }, getTokenSecret(tokenType), {
    algorithm: "HS256",
    // jti สุ่มทุกครั้ง กัน token ที่ออกในวินาทีเดียวกันซ้ำกัน (refresh token เก่าจะใช้ซ้ำได้)
    jwtid: randomUUID(),
    expiresIn: TOKEN_CONFIG[tokenType].expiresIn() as SignOptions["expiresIn"],
  });
}

// Function ตรวจ JWT และ validate payload ตามชนิด token
function verifyTypedToken<T extends TokenType>(token: string, tokenType: T): TokenPayloadByType[T] {
  const invalidCode = TOKEN_CONFIG[tokenType].invalidCode;

  try {
    const payload = jwt.verify(token, getTokenSecret(tokenType), { algorithms: ["HS256"] });

    return parseWithSchema(TOKEN_PAYLOAD_SCHEMAS[tokenType], payload, { statusCode: 401, code: invalidCode, message: "Invalid token." });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === "TokenExpiredError") {
      throw new ApiError(401, "TOKEN_EXPIRED", "Token expired.");
    }

    throw new ApiError(401, invalidCode, "Invalid token.");
  }
}

// Function เซ็น access token
export const signAccessToken = (payload: Omit<AccessTokenPayload, "token_type" | "iat" | "exp">): string =>
  signTypedToken(payload, "access");

// Function เซ็น refresh token
export const signRefreshToken = (payload: Omit<RefreshTokenPayload, "token_type" | "iat" | "exp">): string =>
  signTypedToken(payload, "refresh");

// Function ตรวจ access token
export const verifyAccessToken = (token: string): AccessTokenPayload => verifyTypedToken(token, "access");

// Function ตรวจ refresh token
export const verifyRefreshToken = (token: string): RefreshTokenPayload => verifyTypedToken(token, "refresh");
