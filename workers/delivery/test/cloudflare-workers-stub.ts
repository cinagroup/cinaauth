/** Node-only Vitest shim; production bundles resolve cloudflare:workers. */
export const DurableObject = class {
	ctx: unknown;
	env: unknown;

	constructor(ctx: unknown, env: unknown) {
		this.ctx = ctx;
		this.env = env;
	}
};
