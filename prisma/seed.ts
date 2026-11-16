// Import Library
import dotenv from "dotenv";
// Import Config
import { closePrisma, getPrisma } from "../src/db/prisma";
// Import Utils
import { hashPassword } from "../src/utils/password";

dotenv.config({ quiet: true });

/* -------------------------------------- Types -------------------------------------- */

// Type ส่วน Seed input ของ account
type SeedAccount = {
  username: string;
  password: string;
  fullName: string;
};

/* -------------------------------------- Mock Data -------------------------------------- */

// Mock data บัญชี owner (มีคนเดียวในระบบ สร้างจาก seed เท่านั้น ส่วน admin สร้างผ่าน POST /api/accounts)
const SEED_OWNER: SeedAccount = {
  username: "owner",
  password: "Owner@123456",
  fullName: "Center Hook Owner",
};

/* -------------------------------------- Functions -------------------------------------- */

// Function สร้างบัญชี owner ถ้ายังไม่มี owner ในระบบ (รันซ้ำไม่สร้างเพิ่มและไม่ทับ password เดิม)
async function seedOwner(account: SeedAccount): Promise<void> {
  const prisma = getPrisma();
  const existingOwner = await prisma.account.findFirst({ where: { role: "owner" } });

  if (existingOwner) {
    console.log(`Owner account already exists: ${existingOwner.username}`);
    return;
  }

  await prisma.account.create({
    data: {
      username: account.username,
      passwordHash: await hashPassword(account.password),
      role: "owner",
      status: "active",
      fullName: account.fullName,
    },
  });
  console.log(`Seeded owner account: ${account.username}`);
}

// Function รัน seed ทั้งหมด
async function main(): Promise<void> {
  await seedOwner(SEED_OWNER);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closePrisma());
