// Import Config
import { FORWARD_LOG_RETENTION_DAYS } from "../config/forward.config";
// Import Repositories
import * as forwardLogRepository from "../repositories/forward-log.repository";
// Import Types
import type { ForwardLogDto, ForwardLogListResponse } from "../types/forward-log.type";
// Import Validation
import { parseWithSchema } from "../validation/parser";
import { forwardLogListQuerySchema, idParamSchema } from "../validation/schemas";
// Import Utils
import ApiError from "../utils/api-error";

/* -------------------------------------- Functions -------------------------------------- */

// Function ค้นหา forward log แบบแบ่งหน้าตาม filter
export async function listForwardLogs(query: unknown): Promise<ForwardLogListResponse> {
  const { page, limit, ...filters } = parseWithSchema(forwardLogListQuerySchema, query);
  const { items, total } = await forwardLogRepository.listForwardLogs(filters, page, limit);

  return {
    data: items,
    pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
  };
}

// Function ดึง forward log หนึ่งรายการพร้อม payload เต็ม
export async function getForwardLog(id: unknown): Promise<ForwardLogDto> {
  const logId = parseWithSchema(idParamSchema, id, { message: "Invalid id." });
  const log = await forwardLogRepository.findForwardLogById(logId);

  if (!log) {
    throw new ApiError(404, "FORWARD_LOG_NOT_FOUND", "Forward log not found.");
  }

  return log;
}

// Function ลบ forward log ที่เก่ากว่าอายุที่กำหนด คืนจำนวนที่ลบ
export async function deleteExpiredForwardLogs(): Promise<number> {
  const before = new Date(Date.now() - FORWARD_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  return forwardLogRepository.deleteForwardLogsBefore(before);
}
