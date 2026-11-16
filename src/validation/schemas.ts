// Import Library
import { z } from "zod";
// Import Config
import { ACCOUNT_ROLES, PERMISSIONS } from "../config/permission.config";

/* -------------------------------------- Formats -------------------------------------- */

// Format ข้อความที่ trim แล้วและห้ามว่าง
const trimmedString = z.string().trim().min(1);

// Format เวลาออก/หมดอายุของ JWT
const tokenTimestampsSchema = {
  iat: z.number().int().optional(),
  exp: z.number().int().optional(),
};

/* -------------------------------------- Auth Schemas -------------------------------------- */

// Schema body สำหรับเข้าสู่ระบบด้วย username/password
export const loginBodySchema = z.object({
  username: trimmedString,
  password: z.string().min(1),
});

// Schema body สำหรับขอ token ชุดใหม่ด้วย refresh token
export const refreshBodySchema = z.object({
  refresh_token: trimmedString,
});

/* -------------------------------------- Account Schemas -------------------------------------- */

// Schema body สำหรับสร้างบัญชี admin (role กำหนดเป็น admin เสมอ ไม่รับจาก body)
export const createAdminBodySchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(100)
    .regex(/^[A-Za-z0-9._-]+$/, "Username may contain only letters, numbers, dot, underscore and hyphen."),
  password: z.string().min(8).max(128),
  full_name: trimmedString.max(255),
});

/* -------------------------------------- Token Schemas -------------------------------------- */

// Schema payload ของ access token
export const accessTokenPayloadSchema = z.object({
  account_id: z.number().int().positive(),
  role: z.enum(ACCOUNT_ROLES),
  permissions: z.array(z.enum(PERMISSIONS)),
  session_id: z.number().int().positive(),
  token_type: z.literal("access"),
  ...tokenTimestampsSchema,
});

// Schema payload ของ refresh token
export const refreshTokenPayloadSchema = z.object({
  account_id: z.number().int().positive(),
  role: z.enum(ACCOUNT_ROLES),
  session_id: z.number().int().positive(),
  token_type: z.literal("refresh"),
  ...tokenTimestampsSchema,
});

/* -------------------------------------- Query Schemas -------------------------------------- */

// Schema query สำหรับค้นหา forward log (from/to รับ ISO date หรือ datetime)
export const forwardLogListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["SUCCESS", "FAILED", "SKIPPED"]).optional(),
  project: trimmedString.optional(),
  line_user_id: trimmedString.optional(),
  event_type: trimmedString.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// Schema id ใน path param
export const idParamSchema = z.coerce.number().int().positive();
