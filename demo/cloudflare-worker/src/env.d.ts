export interface CloudflareBindings {
  DB: D1Database;
  CINAAUTH_SECRET: string;
  CINAAUTH_URL: string;
  /** Service token for cinaadmin console (auditLog writeTokens). */
  CINAUTH_ADMIN_SERVICE_KEY: string;
}
