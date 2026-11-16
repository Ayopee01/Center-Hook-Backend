// Import Config
import type { Permission } from "../config/permission.config";
// Import Types
import type { AppMiddleware } from "../types/http.type";
// Import Utils
import ApiError from "../utils/api-error";

/* -------------------------------------- Functions -------------------------------------- */

// Function ตรวจว่าผู้ใช้มีสิทธิ์ครบตามที่ route ต้องการ
export default function permissionMiddleware(requiredPermissions: Permission[]): AppMiddleware {
  return async (c, next) => {
    const permissions = c.get("auth")?.permissions ?? [];

    if (!requiredPermissions.every((permission) => permissions.includes(permission))) {
      throw new ApiError(403, "FORBIDDEN", "Permission denied.");
    }

    await next();
  };
}
