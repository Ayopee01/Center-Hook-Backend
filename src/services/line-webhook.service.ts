// Import Library
import { randomUUID } from "node:crypto";
// Import Config
import { FORWARD_CONFIG } from "../config/forward.config";
// Import Projects
import { getProjectUrl, resolveProjectRoute } from "../projects";
// Import Repositories
import * as forwardLogRepository from "../repositories/forward-log.repository";
// Import Services
import * as lineForwardService from "./line-forward.service";
// Import Runtime
import { runInBackground } from "../runtime/background-tasks";
// Import Types
import type { ForwardResult } from "../types/forward-log.type";
import type { LineWebhookBody, LineWebhookEvent } from "../types/line.type";
// Import Utils
import ApiError from "../utils/api-error";
import { isValidLineSignature, signLineBody } from "../utils/line-signature";
import { logger } from "../utils/logger";

/* -------------------------------------- Helpers -------------------------------------- */

// Function ดึง LINE channel secret (ไม่ตั้งตอบ 503)
function getChannelSecret(): string {
  const secret = process.env.LINE_CHANNEL_SECRET;

  if (!secret) {
    throw new ApiError(503, "LINE_WEBHOOK_NOT_CONFIGURED", "LINE webhook is not configured.");
  }

  return secret;
}

// Function ตรวจ x-line-signature ของ request ที่ LINE ส่งมา
function verifySignature(rawBody: string | undefined, signature: string | undefined, secret: string): string {
  if (!rawBody || !signature) {
    throw new ApiError(401, "INVALID_LINE_SIGNATURE", "LINE signature is required.");
  }

  if (!isValidLineSignature(rawBody, secret, signature)) {
    logger.error("LINE webhook signature mismatch. Check LINE_CHANNEL_SECRET.", { alertCode: "LINE_SIGNATURE_MISMATCH" });
    throw new ApiError(401, "INVALID_LINE_SIGNATURE", "LINE signature is invalid.");
  }

  return rawBody;
}

// Function parse body ของ LINE webhook (รับเฉพาะ object)
function parseWebhookBody(rawBody: string): LineWebhookBody {
  try {
    const body: unknown = JSON.parse(rawBody);

    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as LineWebhookBody;
    }
  } catch {
    // ตกไป throw ด้านล่าง
  }

  throw new ApiError(400, "VALIDATION_ERROR", "Invalid JSON body.");
}

// Function สรุปเนื้อหาของ event สำหรับเก็บใน log (ข้อความ, postback data หรือชนิดข้อความ)
function describeEventContent(event: LineWebhookEvent): string | null {
  if (event.type === "message") {
    return event.message?.type === "text" ? event.message.text ?? null : `[${event.message?.type ?? "unknown"}]`;
  }

  if (event.type === "postback") {
    return event.postback?.data ?? null;
  }

  return null;
}

// Function ส่งต่อ event หนึ่งรายการไป project ปลายทาง แล้วบันทึก forward log
async function forwardEvent(requestId: string, destination: string | undefined, event: LineWebhookEvent, secret: string): Promise<void> {
  const project = resolveProjectRoute(event);
  const targetUrl = getProjectUrl(project);
  // ส่งทีละ event และเซ็นใหม่ด้วย secret เดิม ปลายทางจึงตรวจ signature ได้เหมือนรับจาก LINE โดยตรง
  const body = JSON.stringify({ destination, events: [event] });
  const result: ForwardResult = targetUrl
    ? await lineForwardService.forwardToTarget(targetUrl, body, signLineBody(body, secret))
    : {
        status: "SKIPPED",
        http_status: null,
        response_body: null,
        error_message: `${project.urlEnv} is not configured.`,
        attempts: 0,
        duration_ms: 0,
        forwarded_at: null,
      };

  if (result.status === "FAILED") {
    logger.warn("Failed to forward LINE event.", { requestId, project: project.name, eventType: event.type, error: result.error_message });
  }

  await forwardLogRepository.createForwardLog({
    ...result,
    request_id: requestId,
    webhook_event_id: event.webhookEventId ?? null,
    project: project.name,
    target_url: targetUrl,
    line_user_id: event.source?.userId ?? null,
    event_type: event.type ?? "unknown",
    message_type: event.message?.type ?? null,
    content: lineForwardService.truncate(describeEventContent(event), FORWARD_CONFIG.maxContentLength),
    payload: event,
  });
}

// Function ส่งต่อทุก event ของ request ตามลำดับ (event หนึ่งล้มไม่กระทบ event อื่น)
async function forwardEvents(requestId: string, body: LineWebhookBody, secret: string): Promise<void> {
  for (const event of body.events ?? []) {
    try {
      await forwardEvent(requestId, body.destination, event, secret);
    } catch (error) {
      logger.error("Failed to forward or log LINE event.", { requestId, eventType: event.type, error });
    }
  }
}

/* -------------------------------------- Functions -------------------------------------- */

// Function รับ LINE webhook ตรวจ signature แล้วส่งต่อ event เบื้องหลัง (ตอบ LINE ทันที)
export function handleLineWebhook(rawBody: string | undefined, signature: string | undefined): { message: string; received: number } {
  const secret = getChannelSecret();
  const body = parseWebhookBody(verifySignature(rawBody, signature, secret));
  const events = Array.isArray(body.events) ? body.events : [];

  if (events.length > 0) {
    const requestId = randomUUID();
    runInBackground("forward-line-events", () => forwardEvents(requestId, { destination: body.destination, events }, secret));
  }

  return { message: "LINE webhook received.", received: events.length };
}
