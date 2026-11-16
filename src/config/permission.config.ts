/* -------------------------------------- Types -------------------------------------- */

// Type สิทธิ์ที่ account มีได้
export type Permission = (typeof PERMISSIONS)[number];

// Type role ของ account
export type AccountRole = (typeof ACCOUNT_ROLES)[number];

/* -------------------------------------- Config -------------------------------------- */

// Config รายการสิทธิ์ทั้งหมดของระบบ
export const PERMISSIONS = ["forward_logs:read", "accounts:create"] as const;

// Config role ที่ระบบรองรับ 2 ขั้น: owner (มีคนเดียว สร้างจาก seed เท่านั้น) และ admin
export const ACCOUNT_ROLES = ["owner", "admin"] as const;

// Config สิทธิ์ของแต่ละ role (admin สร้างบัญชีไม่ได้)
export const ROLE_PERMISSIONS: Record<AccountRole, readonly Permission[]> = {
  owner: ["forward_logs:read", "accounts:create"],
  admin: ["forward_logs:read"],
};

/* -------------------------------------- Functions -------------------------------------- */

// Function ตรวจว่า value เป็น role ที่ระบบรองรับ
export function isAccountRole(value: string): value is AccountRole {
  return (ACCOUNT_ROLES as readonly string[]).includes(value);
}

// Function ดึงสิทธิ์ของ role (role ที่ไม่รู้จักคืน array ว่าง)
export function getRolePermissions(role: string): Permission[] {
  return isAccountRole(role) ? [...ROLE_PERMISSIONS[role]] : [];
}
