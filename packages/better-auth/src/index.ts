//#region Re-exports necessaries from core module
export type { StandardSchemaV1 } from "@cinaauth/core";
export * from "@cinaauth/core";
export { getCurrentAdapter } from "@cinaauth/core/context";
export * from "@cinaauth/core/db";
export * from "@cinaauth/core/env";
export * from "@cinaauth/core/error";
export * from "@cinaauth/core/oauth2";
export * from "@cinaauth/core/utils/error-codes";
export * from "@cinaauth/core/utils/id";
export * from "@cinaauth/core/utils/json";
//#endregion
export { CinaAuth } from "./auth/full";
// @ts-expect-error
export * from "./types";
export * from "./utils";

// export this as we are referencing OAuth2Tokens in the `refresh-token` api as return type

// telemetry exports for CLI and consumers
export {
	createTelemetry,
	getTelemetryAuthConfig,
	type TelemetryEvent,
} from "@cinaauth/telemetry";
// re-export third party types
// @ts-expect-error
export type * from "better-call";
export type { JSONWebKeySet, JWTPayload } from "jose";
export type * from "zod";
export { APIError } from "./api";
