/* -------------------------------------- Types -------------------------------------- */

// Type สถานะของการส่งต่อ event
export type ForwardStatus = "SUCCESS" | "FAILED" | "SKIPPED";

// Type ผลการส่ง HTTP ไปปลายทาง (รวมทุก attempt)
export interface ForwardResult {
  status: ForwardStatus;
  http_status: number | null;
  response_body: string | null;
  error_message: string | null;
  attempts: number;
  duration_ms: number;
  forwarded_at: Date | null;
}

// Type ส่วน Repository input สำหรับบันทึก forward log
export interface ForwardLogCreateInput extends ForwardResult {
  request_id: string;
  webhook_event_id: string | null;
  project: string;
  target_url: string | null;
  line_user_id: string | null;
  event_type: string;
  message_type: string | null;
  content: string | null;
  payload: unknown;
}

// Type ส่วน DTO ของ table forward_logs
export interface ForwardLogDto {
  id: number;
  request_id: string;
  webhook_event_id: string | null;
  project: string;
  target_url: string | null;
  line_user_id: string | null;
  event_type: string;
  message_type: string | null;
  content: string | null;
  payload: unknown;
  status: string;
  http_status: number | null;
  response_body: string | null;
  error_message: string | null;
  attempts: number;
  duration_ms: number;
  forwarded_at: string | null;
  created_at: string;
}

// Type ส่วน DTO ของ forward log ในหน้ารายการ (ไม่มี payload/response_body)
export type ForwardLogSummaryDto = Omit<ForwardLogDto, "payload" | "response_body">;

// Type ส่วน Filters ของการค้นหา forward log
export interface ForwardLogFilters {
  status?: ForwardStatus;
  project?: string;
  line_user_id?: string;
  event_type?: string;
  from?: Date;
  to?: Date;
}

// Type ส่วน Response ของ API รายการ forward log
export interface ForwardLogListResponse {
  data: ForwardLogSummaryDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
