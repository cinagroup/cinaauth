import { every } from "hono/combine";
import { contextStorage } from "hono/context-storage";
import { createMiddleware } from "hono/factory";
import type { AuthEnv } from "../auth";

const authMiddleware = () =>
	every(
		contextStorage(),
		createMiddleware<AuthEnv>(async (c, next) => {
			c.set("cinaAuthSetCookie", []);
			await next();
			for (const cookie of c.var.cinaAuthSetCookie) {
				c.header("set-cookie", cookie, { append: true });
			}
		}),
	);

export default authMiddleware;
