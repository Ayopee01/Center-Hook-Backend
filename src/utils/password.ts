// Import Library
import argon2 from "argon2";

/* -------------------------------------- Config -------------------------------------- */

// Config option ของ argon2 ที่ใช้ hash password (ค่าขั้นต่ำตาม OWASP)
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

/* -------------------------------------- Functions -------------------------------------- */

// Function hash password ด้วย argon2
export async function hashPassword(password: string): Promise<string> {
  if (!password) {
    throw new TypeError("Password must be a non-empty string.");
  }

  return argon2.hash(password, ARGON2_OPTIONS);
}

// Function เทียบ password กับ hash (hash ผิดรูปแบบคืน false)
export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}
