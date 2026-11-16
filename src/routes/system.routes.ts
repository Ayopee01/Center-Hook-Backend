// Import Config
import { prisma } from "../db/prisma";
// Import Utils
import { createRouter, sendJson } from "../utils/http";

const router = createRouter();

/* -------------------------------------- System Routes -------------------------------------- */

router.get("/livez", (c) => sendJson(c, { status: "ok" }));

router.get("/readyz", async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return sendJson(c, { status: "ok", database: "ok" });
  } catch {
    return sendJson(c, { status: "error", database: "unavailable" }, 503);
  }
});

export default router;
