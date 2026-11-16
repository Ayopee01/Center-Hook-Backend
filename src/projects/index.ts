// Import Types
import type { LineWebhookEvent } from "../types/line.type";
import type { ProjectRoute } from "./project.type";
// Import Projects
import { laborProject } from "./labor.project";

/* -------------------------------------- Config -------------------------------------- */

// Config project ที่มี rule ของตัวเอง (ตรวจตามลำดับ ตัวแรกที่ match ได้ event)
export const PROJECT_ROUTES: readonly ProjectRoute[] = [laborProject];

// Config ปลายทาง default เมื่อไม่ตรง rule ของ project ไหน
export const DEFAULT_PROJECT: ProjectRoute = {
  name: "default",
  urlEnv: "WEBHOOK_URL",
  matches: () => true,
};

/* -------------------------------------- Functions -------------------------------------- */

// Function เลือก project ปลายทางของ event (ไม่ตรง rule ใดใช้ default)
export function resolveProjectRoute(event: LineWebhookEvent): ProjectRoute {
  return PROJECT_ROUTES.find((project) => project.matches(event)) ?? DEFAULT_PROJECT;
}

// Function อ่าน webhook URL ของ project จาก env (ไม่ได้ตั้งคืน null)
export function getProjectUrl(project: ProjectRoute): string | null {
  return process.env[project.urlEnv]?.trim() || null;
}
