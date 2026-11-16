// Import Middlewares
import authMiddleware from "../middlewares/auth.middleware";
import sessionMiddleware from "../middlewares/session.middleware";
// Import Services
import * as authService from "../services/auth.service";
// Import Utils
import { createRouter, getRequestClientContext, sendJson } from "../utils/http";

const router = createRouter();

/* -------------------------------------- Authentication Routes -------------------------------------- */

router.post("/login", async (c) => {
  return sendJson(c, await authService.login(c.get("body"), getRequestClientContext(c)));
});

router.post("/refresh", async (c) => {
  return sendJson(c, await authService.refresh(c.get("body")));
});

router.post("/logout", authMiddleware, sessionMiddleware, async (c) => {
  return sendJson(c, await authService.logout(c.get("auth")));
});

router.get("/me", authMiddleware, sessionMiddleware, async (c) => {
  return sendJson(c, await authService.me(c.get("auth")));
});

export default router;
