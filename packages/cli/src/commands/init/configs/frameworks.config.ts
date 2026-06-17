export const FRAMEWORKS = [
	{
		name: "Astro",
		id: "astro",
		dependency: "astro",
		authClient: {
			importPath: "cinaauth/react", // assume react is used for astro
		},
		routeHandler: {
			path: "pages/api/auth/[...all].ts",
			code: `import { auth } from "~/auth";
import type { APIRoute } from "astro";

export const ALL: APIRoute = async (ctx) => {
	// If you want to use rate limiting, make sure to set the 'x-forwarded-for' header to the request headers from the context
	// ctx.request.headers.set("x-forwarded-for", ctx.clientAddress);
	return auth.handler(ctx.request);
};`,
		},
		configPaths: [
			"astro.config.mjs",
			"astro.config.ts",
			"astro.config.js",
			"astro.config.cjs",
		],
	},
	// todo: remove in future versions
	{
		name: "Remix",
		id: "remix",
		dependency: "@remix-run/server-runtime",
		authClient: {
			importPath: "cinaauth/react",
		},
		routeHandler: {
			path: "app/lib/auth.server.ts",
			code: `import { CinaAuth } from "cinaauth"

export const auth = CinaAuth({
    database: {
        provider: "postgres", //change this to your database provider
        url: process.env.DATABASE_URL, // path to your database or connection string
    }
})`,
		},
		configPaths: ["remix.config.js"],
	},
	{
		name: "React Router v7",
		id: "react-router-v7",
		dependency: "react-router",
		authClient: {
			importPath: "cinaauth/react",
		},
		routeHandler: {
			path: "app/lib/auth.server.ts",
			code: `import { CinaAuth } from "cinaauth"

export const auth = CinaAuth({
    database: {
        provider: "postgres", //change this to your database provider
        url: process.env.DATABASE_URL, // path to your database or connection string
    }
})`,
		},
		configPaths: ["react-router.config.ts"],
	},
	{
		name: "Next.js",
		id: "next",
		dependency: "next",
		authClient: {
			importPath: "cinaauth/react",
		},
		routeHandler: {
			path: "api/auth/[...all]/route.ts",
			code: `import { auth } from "@/lib/auth";
import { toNextJsHandler } from "cinaauth/next-js";
export const { GET, POST } = toNextJsHandler(auth.handler);`,
		},
		configPaths: [
			"next.config.js",
			"next.config.ts",
			"next.config.mjs",
			".next/server/next.config.js",
			".next/server/next.config.ts",
			".next/server/next.config.mjs",
		],
	},
	{
		name: "Nuxt",
		id: "nuxt",
		dependency: "nuxt",
		authClient: {
			importPath: "cinaauth/vue",
		},
		routeHandler: {
			path: "server/api/auth/[...all].ts",
			code: `import { auth } from "~/lib/auth"; // import your auth config

export default defineEventHandler((event) => {
	return auth.handler(toWebRequest(event));
});`,
		},
		configPaths: [
			"nuxt.config.js",
			"nuxt.config.ts",
			"nuxt.config.mjs",
			"nuxt.config.cjs",
		],
	},
	{
		name: "SvelteKit",
		id: "sveltekit",
		dependency: "@sveltejs/kit",
		authClient: {
			importPath: "cinaauth/svelte",
		},
		routeHandler: {
			path: `hooks.server.ts`,
			code: `import { auth } from "$lib/auth";
import { svelteKitHandler } from "cinaauth/svelte-kit";
import { building } from "$app/environment";

export async function handle({ event, resolve }) {
  return svelteKitHandler({ event, resolve, auth, building });
}`,
		},
		configPaths: [
			"svelte.config.js",
			"svelte.config.ts",
			"svelte.config.mjs",
			"svelte.config.cjs",
		],
	},
	{
		name: "Solid Start",
		id: "solid-start",
		dependency: "solid-start",
		authClient: {
			importPath: "cinaauth/solid",
		},
		routeHandler: {
			path: `routes/api/auth/*auth.ts`,
			code: `import { auth } from "~/lib/auth";
import { toSolidStartHandler } from "cinaauth/solid-start";

export const { GET, POST } = toSolidStartHandler(auth);`,
		},
		configPaths: ["app.config.ts"],
	},
	{
		name: "Tanstack Start",
		id: "tanstack-start",
		dependency: "tanstack-start",
		authClient: {
			importPath: "cinaauth/react", // assume react is used for tanstack start
		},
		routeHandler: {
			path: `src/routes/api/auth/$.ts`,
			code: `import { auth } from '@/lib/auth'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => {
        return auth.handler(request)
      },
      POST: ({ request }) => {
        return auth.handler(request)
      },
    },
  },
})`,
		},
		configPaths: null,
	},
	{
		name: "Hono",
		id: "hono",
		dependency: "hono",
		authClient: null,
		routeHandler: null,
		configPaths: null,
	},
	{
		name: "Fastify",
		id: "fastify",
		dependency: "fastify",
		authClient: null,
		routeHandler: null,
		configPaths: null,
	},
	{
		name: "Express",
		id: "express",
		dependency: "express",
		authClient: null,
		routeHandler: null,
		configPaths: null,
	},
	{
		name: "Elysia",
		id: "elysia",
		dependency: "elysia",
		authClient: null,
		routeHandler: null,
		configPaths: null,
	},
	{
		name: "Nitro",
		id: "nitro",
		dependency: "nitro",
		authClient: null,
		routeHandler: null,
		configPaths: ["nitro.config.ts"],
	},
] as const satisfies {
	name: string;
	id: string;
	dependency: string;
	authClient: {
		importPath: string;
	} | null;
	routeHandler: {
		path: string;
		code: string;
	} | null;
	configPaths: string[] | null;
}[];

export type Framework = (typeof FRAMEWORKS)[number];
