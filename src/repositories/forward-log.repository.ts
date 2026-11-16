// Import Library
import type { Prisma } from "@prisma/client";
// Import Config
import { prisma } from "../db/prisma";
// Import Mappers
import { mapForwardLog } from "./mappers";
// Import Types
import type { ForwardLogCreateInput, ForwardLogDto, ForwardLogFilters, ForwardLogSummaryDto } from "../types/forward-log.type";

/* -------------------------------------- Helpers -------------------------------------- */

// Function สร้าง Prisma where จาก filters ของ forward log
function buildWhere(filters: ForwardLogFilters): Prisma.ForwardLogWhereInput {
  return {
    status: filters.status,
    project: filters.project,
    lineUserId: filters.line_user_id,
    eventType: filters.event_type,
    ...((filters.from || filters.to) && { createdAt: { gte: filters.from, lte: filters.to } }),
  };
}

/* -------------------------------------- Functions -------------------------------------- */

// Function บันทึก forward log หนึ่งรายการ
export async function createForwardLog(input: ForwardLogCreateInput): Promise<void> {
  await prisma.forwardLog.create({
    data: {
      requestId: input.request_id,
      webhookEventId: input.webhook_event_id,
      project: input.project,
      targetUrl: input.target_url,
      lineUserId: input.line_user_id,
      eventType: input.event_type,
      messageType: input.message_type,
      content: input.content,
      payload: input.payload as Prisma.InputJsonValue,
      status: input.status,
      httpStatus: input.http_status,
      responseBody: input.response_body,
      errorMessage: input.error_message,
      attempts: input.attempts,
      durationMs: input.duration_ms,
      forwardedAt: input.forwarded_at,
    },
  });
}

// Function ค้นหา forward log แบบแบ่งหน้า เรียงจากใหม่ไปเก่า (ไม่ดึง payload/response_body)
export async function listForwardLogs(
  filters: ForwardLogFilters,
  page: number,
  limit: number
): Promise<{ items: ForwardLogSummaryDto[]; total: number }> {
  const where = buildWhere(filters);
  const [items, total] = await Promise.all([
    prisma.forwardLog.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      omit: { payload: true, responseBody: true },
    }),
    prisma.forwardLog.count({ where }),
  ]);

  return {
    items: items.map((item) => {
      const { payload: _payload, response_body: _responseBody, ...summary } = mapForwardLog({ ...item, payload: null, responseBody: null });
      return summary;
    }),
    total,
  };
}

// Function ดึง forward log เต็มรายการจาก id
export async function findForwardLogById(id: number): Promise<ForwardLogDto | null> {
  const log = await prisma.forwardLog.findUnique({ where: { id } });

  return log ? mapForwardLog(log) : null;
}

// Function ลบ forward log ที่เก่ากว่าเวลาที่กำหนด คืนจำนวนที่ลบ
export async function deleteForwardLogsBefore(before: Date): Promise<number> {
  const result = await prisma.forwardLog.deleteMany({ where: { createdAt: { lt: before } } });

  return result.count;
}
