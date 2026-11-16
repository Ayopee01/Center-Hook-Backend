// Import Library
import type { Next } from "hono";
// Import Types
import type { AppContext } from "../types/http.type";
// Import Utils
import ApiError from "../utils/api-error";
import { verifyAccessToken } from "../utils/jwt";

/* -------------------------------------- Functions -------------------------------------- */

// Function ตรวจ Bearer access token และแนบ auth payload ให้ request
export default async function authMiddleware(c: AppContext, next: Next): Promise<void> {
  const authorization = c.req.header("authorization");

  if (!authorization) {
    throw new ApiError(401, "INVALID_TOKEN", "Authorization token is required.");
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new ApiError(401, "INVALID_TOKEN", "Invalid authorization format.");
  }

  c.set("auth", verifyAccessToken(token));
  await next();
}
