import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workerDir = dirname(dirname(fileURLToPath(import.meta.url)));
const configFile = join(workerDir, "wrangler.json");
const hyperdriveId = process.env.CINAAUTH_HYPERDRIVE_ID?.trim();

if (
	!hyperdriveId ||
	!/^[0-9a-f]{32}$/i.test(hyperdriveId) ||
	hyperdriveId === "00000000000000000000000000000000"
) {
	console.error(
		"CINAAUTH_HYPERDRIVE_ID must be a concrete 32-character Hyperdrive ID",
	);
	process.exit(1);
}

const config = JSON.parse(readFileSync(configFile, "utf8"));
const binding = config.hyperdrive?.find(
	(item) => item.binding === "HYPERDRIVE",
);
if (!binding) {
	console.error("wrangler.json does not define the HYPERDRIVE binding");
	process.exit(1);
}

binding.id = hyperdriveId;
writeFileSync(configFile, `${JSON.stringify(config, null, 2)}\n`);
console.log("Configured the HYPERDRIVE binding ID.");
