// Import Library
import type { Account, ForwardLog, UserSession } from "@prisma/client";
// Import Types
import type { AccountDto, SessionDto } from "../types/auth.type";
import type { ForwardLogDto } from "../types/forward-log.type";

/* -------------------------------------- Functions -------------------------------------- */

// Function แปลง Prisma Account เป็น AccountDto
export function mapAccount(account: Account): AccountDto {
  return {
    id: account.id,
    username: account.username,
    password_hash: account.passwordHash,
    role: account.role,
    status: account.status,
    full_name: account.fullName,
    created_at: account.createdAt.toISOString(),
    updated_at: account.updatedAt.toISOString(),
  };
}

// Function แปลง Prisma UserSession เป็น SessionDto
export function mapSession(session: UserSession): SessionDto {
  return {
    id: session.id,
    account_id: session.accountId,
    refresh_token_hash: session.refreshTokenHash,
    ip_address: session.ipAddress,
    user_agent: session.userAgent,
    is_active: session.isActive,
    expires_at: session.expiresAt.toISOString(),
    revoked_at: session.revokedAt?.toISOString() ?? null,
    created_at: session.createdAt.toISOString(),
  };
}

// Function แปลง Prisma ForwardLog เป็น ForwardLogDto
export function mapForwardLog(log: ForwardLog): ForwardLogDto {
  return {
    id: log.id,
    request_id: log.requestId,
    webhook_event_id: log.webhookEventId,
    project: log.project,
    target_url: log.targetUrl,
    line_user_id: log.lineUserId,
    event_type: log.eventType,
    message_type: log.messageType,
    content: log.content,
    payload: log.payload,
    status: log.status,
    http_status: log.httpStatus,
    response_body: log.responseBody,
    error_message: log.errorMessage,
    attempts: log.attempts,
    duration_ms: log.durationMs,
    forwarded_at: log.forwardedAt?.toISOString() ?? null,
    created_at: log.createdAt.toISOString(),
  };
}
