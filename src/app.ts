// Import Library
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
// Import Docs
import setupSwagger from "./docs/swagger";
// Import Middlewares
import { bodyLimitMiddleware, jsonBodyMiddleware } from "./middlewares/body.middleware";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import { rateLimitMiddleware } from "./middlewares/rate-limit.middleware";
import { requestLoggerMiddleware } from "./middlewares/request-logger.middleware";
// Import Routes
import accountRoutes from "./routes/accounts.routes";
import authRoutes from "./routes/auth.routes";
import lineRoutes from "./routes/line.routes";
import logRoutes from "./routes/logs.routes";
import systemRoutes from "./routes/system.routes";
// Import Utils
import { createRouter } from "./utils/http";

/* -------------------------------------- App -------------------------------------- */

// Config Hono app
const app = createRouter();

// Config CORS origin จาก env (คั่นหลาย origin ด้วย comma ไม่ตั้ง = ไม่เปิด CORS)
const corsOrigins = (process.env.CORS_ORIGIN ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);

app.use(requestId());
app.use(requestLoggerMiddleware);
app.use(secureHeaders());

if (corsOrigins.length > 0) {
  app.use(cors({ origin: corsOrigins.includes("*") ? "*" : corsOrigins }));
}

app.use(bodyLimitMiddleware);
app.use(jsonBodyMiddleware);
// วางหลัง jsonBodyMiddleware เพราะต้องอ่าน username จาก body ของ /api/auth
app.use(...rateLimitMiddleware);

/* -------------------------------------- Routes -------------------------------------- */

app.route("/", systemRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/accounts", accountRoutes);
app.route("/api/line", lineRoutes);
app.route("/api/forward-logs", logRoutes);

// Config Swagger UI ที่ /api-docs
setupSwagger(app);

app.notFound(notFoundHandler);
app.onError(errorHandler);

export default app;
