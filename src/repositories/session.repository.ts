// Import Config
import { prisma } from "../db/prisma";
// Import Mappers
import { mapSession } from "./mappers";
// Import Types
import type { RequestClientContext, SessionDto } from "../types/auth.type";

/* -------------------------------------- Functions -------------------------------------- */

// Function สร้าง session ใหม่ (refresh token hash ใส่ทีหลังเมื่อได้ session id แล้ว)
export async function createPendingSession(
  accountId: number,
  expiresAt: Date,
  context: RequestClientContext
): Promise<SessionDto> {
  const session = await prisma.userSession.create({
    data: {
      accountId,
      refreshTokenHash: "pending",
      ipAddress: context.ip_address,
      userAgent: context.user_agent,
      expiresAt,
    },
  });

  return mapSession(session);
}

// Function ค้นหา session ที่ยัง active และยังไม่หมดอายุ
export async function findActiveById(id: number): Promise<SessionDto | null> {
  const session = await prisma.userSession.findFirst({
    where: { id, isActive: true, revokedAt: null, expiresAt: { gt: new Date() } },
  });

  return session ? mapSession(session) : null;
}

// Function เปลี่ยน refresh token hash แบบมีเงื่อนไข hash เดิม (กัน refresh ซ้อน) คืน true เมื่อสำเร็จ
export async function rotateRefreshTokenHash(
  id: number,
  nextHash: string,
  currentHash: string,
  expiresAt?: Date
): Promise<boolean> {
  const result = await prisma.userSession.updateMany({
    where: { id, isActive: true, refreshTokenHash: currentHash },
    data: { refreshTokenHash: nextHash, ...(expiresAt && { expiresAt }) },
  });

  return result.count === 1;
}

// Function revoke session ที่ active ทั้งหมดของ account (ยกเว้น session ที่ระบุ)
export async function revokeActiveSessions(accountId: number, exceptSessionId?: number): Promise<void> {
  await prisma.userSession.updateMany({
    where: { accountId, isActive: true, ...(exceptSessionId && { id: { not: exceptSessionId } }) },
    data: { isActive: false, revokedAt: new Date() },
  });
}

// Function revoke session เดียว
export async function revokeSession(id: number): Promise<void> {
  await prisma.userSession.updateMany({
    where: { id, isActive: true },
    data: { isActive: false, revokedAt: new Date() },
  });
}
