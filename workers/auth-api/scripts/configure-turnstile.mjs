import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const API_BASE_URL = "https://api.cloudflare.com/client/v4";

export const DEFAULT_TURNSTILE_WIDGET_NAME = "CinaAuth Production";
export const DEFAULT_TURNSTILE_DOMAINS = [
	"auth.cinaseek.ai",
	"accounts.cinaseek.ai",
	"demo-auth.cinagroup.com",
	"admin.cinaseek.ai",
];

const fail = (message) => {
	throw new Error(message);
};

const nonEmpty = (value) =>
	typeof value === "string" && value.trim().length > 0
		? value.trim()
		: undefined;

export const parseTurnstileDomains = (value) => {
	const candidates = nonEmpty(value)
		? value.split(",").map((domain) => domain.trim().toLowerCase())
		: DEFAULT_TURNSTILE_DOMAINS;
	const domains = [...new Set(candidates.filter(Boolean))].sort();
	if (domains.length === 0 || domains.length > 10) {
		fail("Turnstile requires between 1 and 10 unique domains");
	}
	for (const domain of domains) {
		let parsed;
		try {
			parsed = new URL(`https://${domain}`);
		} catch {
			fail(`Invalid Turnstile domain: ${domain}`);
		}
		if (
			parsed.hostname !== domain ||
			parsed.port ||
			parsed.username ||
			parsed.password ||
			parsed.pathname !== "/"
		) {
			fail(`Invalid Turnstile domain: ${domain}`);
		}
	}
	return domains;
};

export const selectCloudflareAccount = (accounts, configuredAccountId) => {
	if (configuredAccountId) {
		const account = accounts.find(({ id }) => id === configuredAccountId);
		return account ?? { id: configuredAccountId, name: "configured account" };
	}
	if (accounts.length !== 1) {
		fail(
			"Set CLOUDFLARE_ACCOUNT_ID when the API token can access zero or multiple accounts",
		);
	}
	return accounts[0];
};

export const selectTurnstileWidget = (widgets, name) => {
	const matches = widgets.filter((widget) => widget.name === name);
	if (matches.length > 1) {
		fail(`Multiple Turnstile widgets are named ${name}; resolve the duplicate first`);
	}
	return matches[0] ?? null;
};

export const turnstileWidgetNeedsUpdate = (widget, domains) => {
	if (!widget) return true;
	const actualDomains = [...(widget.domains ?? [])].sort();
	return (
		widget.mode !== "managed" ||
		widget.clearance_level !== "no_clearance" ||
		JSON.stringify(actualDomains) !== JSON.stringify([...domains].sort())
	);
};

const parseApiResponse = async (response, operation) => {
	const body = await response.json().catch(() => null);
	if (!response.ok || body?.success !== true) {
		const details = Array.isArray(body?.errors)
			? body.errors
					.map((error) => `${error.code ?? "unknown"}: ${error.message ?? "unknown"}`)
					.join("; ")
			: "unknown Cloudflare API error";
		fail(`${operation} failed with HTTP ${response.status}: ${details}`);
	}
	return body;
};

const createApiClient = (token) => {
	const request = async (path, init = {}) => {
		const response = await fetch(`${API_BASE_URL}${path}`, {
			...init,
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
				...(init.body ? { "Content-Type": "application/json" } : {}),
			},
			signal: AbortSignal.timeout(15_000),
		});
		return parseApiResponse(response, `${init.method ?? "GET"} ${path}`);
	};
	return { request };
};

const resolveWranglerBinary = () => {
	const workerDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
	const executable = process.platform === "win32" ? "wrangler.cmd" : "wrangler";
	const binary = join(workerDir, "node_modules", ".bin", executable);
	if (!existsSync(binary)) {
		fail(`Wrangler is not installed at ${binary}`);
	}
	return binary;
};

const putWorkerSecret = (name, value) => {
	const result = spawnSync(resolveWranglerBinary(), ["secret", "put", name], {
		input: value,
		shell: process.platform === "win32",
		stdio: ["pipe", "inherit", "inherit"],
	});
	if (result.status !== 0) {
		fail(`Wrangler failed to provision ${name}`);
	}
	console.log(`Provisioned ${name}`);
};

export const configureTurnstile = async ({
	env = process.env,
	dryRun = false,
} = {}) => {
	const token = nonEmpty(env.CLOUDFLARE_API_TOKEN ?? env.CF_API_TOKEN);
	if (!token) fail("Missing CLOUDFLARE_API_TOKEN (or CF_API_TOKEN)");

	const widgetName =
		nonEmpty(env.CLOUDFLARE_TURNSTILE_WIDGET_NAME) ??
		DEFAULT_TURNSTILE_WIDGET_NAME;
	const domains = parseTurnstileDomains(env.CLOUDFLARE_TURNSTILE_DOMAINS);
	const api = createApiClient(token);
	const accountsBody = await api.request("/accounts?per_page=50");
	const accounts = Array.isArray(accountsBody.result) ? accountsBody.result : [];
	const account = selectCloudflareAccount(
		accounts,
		nonEmpty(env.CLOUDFLARE_ACCOUNT_ID),
	);
	const widgetsPath = `/accounts/${account.id}/challenges/widgets`;
	const widgetsBody = await api.request(`${widgetsPath}?per_page=100`);
	const widgets = Array.isArray(widgetsBody.result) ? widgetsBody.result : [];
	const existing = selectTurnstileWidget(widgets, widgetName);
	const needsUpdate = turnstileWidgetNeedsUpdate(existing, domains);
	const action = existing ? (needsUpdate ? "update" : "reuse") : "create";

	if (dryRun) {
		return {
			action,
			accountName: account.name ?? "unknown",
			widgetName,
			domains,
			sitekey: existing?.sitekey ?? null,
			provisioned: false,
		};
	}

	const payload = JSON.stringify({
		name: widgetName,
		domains,
		mode: "managed",
		clearance_level: "no_clearance",
	});
	let widget;
	if (!existing) {
		widget = (await api.request(widgetsPath, { method: "POST", body: payload }))
			.result;
	} else if (needsUpdate) {
		widget = (
			await api.request(`${widgetsPath}/${existing.sitekey}`, {
				method: "PUT",
				body: payload,
			})
		).result;
	} else {
		widget = (
			await api.request(`${widgetsPath}/${existing.sitekey}`)
		).result;
	}

	if (!nonEmpty(widget?.sitekey) || !nonEmpty(widget?.secret)) {
		fail("Cloudflare did not return the Turnstile sitekey and secret");
	}

	putWorkerSecret("CLOUDFLARE_TURNSTILE_SECRET_KEY", widget.secret);
	putWorkerSecret("CLOUDFLARE_TURNSTILE_SITE_KEY", widget.sitekey);

	return {
		action,
		accountName: account.name ?? "unknown",
		widgetName,
		domains,
		sitekey: widget.sitekey,
		provisioned: true,
	};
};

const isMain =
	process.argv[1] &&
	resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
	configureTurnstile({ dryRun: process.argv.includes("--dry-run") })
		.then((result) => {
			console.log(
				JSON.stringify({
					...result,
					secretValuesPrinted: false,
				}),
			);
		})
		.catch((error) => {
			console.error(error instanceof Error ? error.message : "Unknown error");
			process.exit(1);
		});
}
