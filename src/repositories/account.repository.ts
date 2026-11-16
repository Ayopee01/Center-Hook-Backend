// Import Config
import { prisma } from "../db/prisma";
// Import Mappers
import { mapAccount } from "./mappers";
// Import Types
import type { AccountCreateInput, AccountDto } from "../types/auth.type";

/* -------------------------------------- Functions -------------------------------------- */

// Function ค้นหา account จาก username
export async function findByUsername(username: string): Promise<AccountDto | null> {
  const account = await prisma.account.findUnique({ where: { username } });

  return account ? mapAccount(account) : null;
}

// Function ค้นหา account จาก id
export async function findById(id: number): Promise<AccountDto | null> {
  const account = await prisma.account.findUnique({ where: { id } });

  return account ? mapAccount(account) : null;
}

// Function สร้าง account ใหม่ (username ซ้ำคืน null)
export async function createAccount(input: AccountCreateInput): Promise<AccountDto | null> {
  try {
    const account = await prisma.account.create({
      data: {
        username: input.username,
        passwordHash: input.password_hash,
        role: input.role,
        status: "active",
        fullName: input.full_name,
      },
    });

    return mapAccount(account);
  } catch (error) {
    // P2002 = unique constraint ของ username (รวมกรณีสร้างพร้อมกัน 2 request)
    if ((error as { code?: string }).code === "P2002") {
      return null;
    }

    throw error;
  }
}
