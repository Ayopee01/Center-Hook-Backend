// Import Middlewares
import authMiddleware from "../middlewares/auth.middleware";
import permissionMiddleware from "../middlewares/permission.middleware";
import sessionMiddleware from "../middlewares/session.middleware";
// Import Services
import * as forwardLogService from "../services/forward-log.service";
// Import Utils
import { createRouter, getQuery, sendJson } from "../utils/http";

const router = createRouter();

/* -------------------------------------- Forward Log Routes -------------------------------------- */

router.use("*", authMiddleware, sessionMiddleware, permissionMiddleware(["forward_logs:read"]));

router.get("/", async (c) => {
  return sendJson(c, await forwardLogService.listForwardLogs(getQuery(c)));
});

router.get("/:id", async (c) => {
  return sendJson(c, await forwardLogService.getForwardLog(c.req.param("id")));
});

export default router;
