// Import Types
import type { LineWebhookEvent } from "../types/line.type";

/* -------------------------------------- Types -------------------------------------- */

// Type ปลายทางของแต่ละ project ที่ center-hook ส่ง event ไปให้
export interface ProjectRoute {
  // ชื่อ project ที่บันทึกลง forward log
  name: string;
  // ชื่อ env ที่เก็บ webhook URL ของ project
  urlEnv: string;
  // ตรวจว่า event นี้เป็นของ project นี้
  matches: (event: LineWebhookEvent) => boolean;
}
