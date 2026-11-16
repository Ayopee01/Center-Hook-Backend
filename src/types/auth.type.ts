// Import Config
import type { AccountRole, Permission } from "../config/permission.config";

/* -------------------------------------- Types -------------------------------------- */

// Type payload ของ access token ที่ใช้เรียก API หลัง login
export interface AccessTokenPayload {
  account_id: number;
  role: AccountRole;
  permissions: Permission[];
  session_id: number;
  token_type: "access";
  iat?: number;
  exp?: number;
}

// Type payload ของ refresh token สำหรับขอ access token ชุดใหม่
export interface RefreshTokenPayload {
  account_id: number;
  role: AccountRole;
  session_id: number;
  token_type: "refresh";
  iat?: number;
  exp?: number;
}

// Type DTO ของ table accounts (มี password_hash ใช้ภายใน service เท่านั้น)
export interface AccountDto {
  id: number;
  username: string;
  password_hash: string;
  role: string;
  status: string;
  full_name: string;
  created_at: string;
  updated_at: string;
}

// Type DTO ของ table user_sessions
export interface SessionDto {
  id: number;
  account_id: number;
  refresh_token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  is_active: boolean;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

// Type ข้อมูล request ที่บันทึกลง session ตอน login
export interface RequestClientContext {
  ip_address: string | null;
  user_agent: string | null;
}

// Type ส่วน Response ของ API login / refresh
export interface AuthTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
}

// Type ส่วน Repository input สำหรับสร้าง account
export interface AccountCreateInput {
  username: string;
  password_hash: string;
  role: AccountRole;
  full_name: string;
}

// Type ส่วน Response ของ API สร้าง account (ไม่มี password_hash)
export interface AccountResponse {
  id: number;
  username: string;
  full_name: string;
  role: string;
  status: string;
  created_at: string;
}

// Type ส่วน Response ของ API me
export interface MeResponse {
  id: number;
  username: string;
  full_name: string;
  role: string;
  permissions: Permission[];
}
