// Import Types
import type { LineWebhookEvent } from "../types/line.type";
import type { ProjectRoute } from "./project.type";

/* -------------------------------------- Config -------------------------------------- */

// Config key ที่ postback ของ Labor ใช้ (ปุ่มยืนยัน/ตีกลับ = token, ปุ่มให้คะแนน = token+score)
const LABOR_POSTBACK_KEYS = new Set(["token", "score", "action", "reject_reason", "reason"]);

// Config รูปแบบ LINE action token ของ Labor (randomBytes(24) แบบ base64url = 32 ตัวอักษร)
const LABOR_ACTION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

// Config คำสั่งข้อความที่ Labor ตอบ LINE user id กลับ
const LABOR_TEXT_COMMANDS = new Set(["id"]);

/* -------------------------------------- Functions -------------------------------------- */

// Function ตรวจว่า postback data มาจากปุ่มของ Labor (มี token ตามรูปแบบ และไม่มี key อื่นปน)
function isLaborPostback(event: LineWebhookEvent): boolean {
  if (event.type !== "postback" || !event.postback?.data) {
    return false;
  }

  const params = new URLSearchParams(event.postback.data);
  const token = params.get("token");

  return Boolean(token && LABOR_ACTION_TOKEN_PATTERN.test(token)) &&
    [...params.keys()].every((key) => LABOR_POSTBACK_KEYS.has(key));
}

// Function ตรวจว่าเป็นข้อความคำสั่งที่ Labor รับ (เช่น "id")
function isLaborTextCommand(event: LineWebhookEvent): boolean {
  const text = event.message?.text?.trim().toLowerCase();

  return event.type === "message" && event.message?.type === "text" && Boolean(text && LABOR_TEXT_COMMANDS.has(text));
}

// Config ปลายทางของ Labor Project
export const laborProject: ProjectRoute = {
  name: "labor",
  urlEnv: "LABOR_WEBHOOK_URL",
  matches: (event) => isLaborPostback(event) || isLaborTextCommand(event),
};
