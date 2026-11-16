// Import Library
import type { ZodError, ZodType } from "zod";
// Import Utils
import ApiError from "../utils/api-error";

/* -------------------------------------- Types -------------------------------------- */

// Type option สำหรับแปลง validation error เป็น ApiError
interface ParseOptions {
  statusCode?: number;
  code?: string;
  message?: string;
}

/* -------------------------------------- Parsers -------------------------------------- */

// Function จัดรูปแบบ zod issues เป็นรายการ field/message
function formatZodIssues(error: ZodError): { field: string | null; message: string }[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join(".") : null,
    message: issue.message,
  }));
}

// Function อ่าน input ด้วย Zod schema และโยน ApiError มาตรฐานเมื่อไม่ผ่าน
export function parseWithSchema<T>(schema: ZodType<T>, input: unknown, options: ParseOptions = {}): T {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new ApiError(
      options.statusCode ?? 400,
      options.code ?? "VALIDATION_ERROR",
      options.message ?? "Invalid request data.",
      { validation_errors: formatZodIssues(result.error) }
    );
  }

  return result.data;
}
