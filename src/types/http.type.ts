// Import Library
import type { HttpBindings } from "@hono/node-server";
import type { Context, MiddlewareHandler } from "hono";
// Import Types
import type { AccessTokenPayload, SessionDto } from "./auth.type";

/* -------------------------------------- Types -------------------------------------- */

// Type ค่าที่ middleware แนบไว้ใน context ของ request
export type AppVariables = {
  auth?: AccessTokenPayload;
  session?: SessionDto;
  body?: unknown;
  rawBody?: string;
  requestId?: string;
  errorCode?: string;
};

// Type environment ของ Hono app (รันบน node:http)
export type AppEnv = { Bindings: HttpBindings; Variables: AppVariables };

// Type context ของ request
export type AppContext = Context<AppEnv>;

// Type middleware ของ app
export type AppMiddleware = MiddlewareHandler<AppEnv>;
