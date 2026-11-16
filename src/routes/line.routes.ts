// Import Services
import * as lineWebhookService from "../services/line-webhook.service";
// Import Utils
import { createRouter, sendJson } from "../utils/http";

const router = createRouter();

/* -------------------------------------- Line Routes -------------------------------------- */

router.post("/webhook", (c) => {
  return sendJson(c, lineWebhookService.handleLineWebhook(c.get("rawBody"), c.req.header("x-line-signature")));
});

export default router;
