/* -------------------------------------- Test Env -------------------------------------- */

// ตั้ง env ก่อน import โมดูลที่อ่าน config ตอนโหลด
process.env.LINE_CHANNEL_SECRET = "test-line-channel-secret";
process.env.LABOR_WEBHOOK_URL = "http://labor.test/api/line/webhook";
process.env.WEBHOOK_URL = "http://other.test/webhook";
process.env.FORWARD_TIMEOUT_MS = "1000";
process.env.FORWARD_MAX_ATTEMPTS = "3";
process.env.FORWARD_RETRY_DELAY_MS = "1";
process.env.LOG_LEVEL = "silent";
process.env.RATE_LIMIT_WINDOW_MS = "60000";
process.env.RATE_LIMIT_MAX_REQUESTS = "3";
process.env.AUTH_LOGIN_RATE_LIMIT_MAX_PER_IP = "5";
