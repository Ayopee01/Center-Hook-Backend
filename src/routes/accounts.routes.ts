// Import Middlewares
import authMiddleware from "../middlewares/auth.middleware";
import permissionMiddleware from "../middlewares/permission.middleware";
import sessionMiddleware from "../middlewares/session.middleware";
// Import Services
import * as accountService from "../services/account.service";
// Import Utils
import { createRouter, sendJson } from "../utils/http";

const router = createRouter();

/* -------------------------------------- Account Routes -------------------------------------- */

router.use("*", authMiddleware, sessionMiddleware);

// สร้างบัญชี admin (เฉพาะ owner ที่มีสิทธิ์ accounts:create)
router.post("/", permissionMiddleware(["accounts:create"]), async (c) => {
  return sendJson(c, await accountService.createAdmin(c.get("body"), c.get("auth")), 201);
});

export default router;
