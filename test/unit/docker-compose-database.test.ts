import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const compose = readFileSync(
	new URL("../../docker-compose.yml", import.meta.url),
	"utf8",
).replaceAll("\r\n", "\n");

const postgresQuery =
	"PGPASSWORD=$${POSTGRES_PASSWORD} psql -h 127.0.0.1 -U $${POSTGRES_USER} -d $${POSTGRES_DB} -tAc 'SELECT 1' >/dev/null";
const mysqlQuery =
	"MYSQL_PWD=$${MYSQL_PASSWORD} mysql --protocol=TCP -h 127.0.0.1 -u $${MYSQL_USER} --database=$${MYSQL_DATABASE} --batch --skip-column-names -e 'SELECT 1' >/dev/null";

const expectedHealthchecks = {
	"postgres-healthcheck": `test: ["CMD-SHELL", "${postgresQuery}"]`,
	"mysql-healthcheck": `test: ["CMD-SHELL", "${mysqlQuery}"]`,
} as const;

const postgresServices = [
	{ name: "postgres", port: "5432:5432" },
	{ name: "postgres-kysely", port: "5433:5432" },
	{ name: "postgres-kysely2", port: "5435:5432" },
	{ name: "postgres-prisma", port: "5434:5432" },
] as const;

const mysqlServices = [
	{ name: "mysql", port: "3306:3306" },
	{ name: "mysql-kysely", port: "3307:3306" },
	{ name: "mysql-prisma", port: "3308:3306" },
] as const;

const composeLines = compose.split("\n");

const getTopLevelBlock = (name: string) => {
	const start = composeLines.findIndex((line) => line.startsWith(`${name}:`));
	if (start === -1) throw new Error(`Missing top-level Compose block: ${name}`);

	const end = composeLines.findIndex(
		(line, index) => index > start && /^[a-z][a-z0-9-]*:(?:\s|$)/.test(line),
	);
	return composeLines.slice(start, end === -1 ? undefined : end).join("\n");
};

const getServiceBlock = (name: string) => {
	const start = composeLines.findIndex((line) => line === `  ${name}:`);
	if (start === -1) throw new Error(`Missing Compose service: ${name}`);

	const end = composeLines.findIndex(
		(line, index) =>
			index > start &&
			(/^  [a-z][a-z0-9-]*:$/.test(line) || line === "volumes:"),
	);
	return composeLines.slice(start, end === -1 ? undefined : end).join("\n");
};

const capture = (block: string, pattern: RegExp, label: string) => {
	const value = block.match(pattern)?.[1];
	if (!value) throw new Error(`Missing ${label}`);
	return value;
};

const readServiceContract = (name: string, databaseKey: string) => {
	const block = getServiceBlock(name);
	return {
		database: capture(
			block,
			new RegExp(`^      ${databaseKey}: ([^\\s]+)$`, "m"),
			`${databaseKey} for ${name}`,
		),
		healthcheck: capture(
			block,
			/^    <<: \*([a-z][a-z0-9-]+)$/m,
			`healthcheck anchor for ${name}`,
		),
		port: capture(block, /^      - "([0-9]+:[0-9]+)"$/m, `port for ${name}`),
	};
};

describe("Docker Compose test databases", () => {
	it("queries the configured PostgreSQL database before reporting healthy", () => {
		const healthcheck = getTopLevelBlock("x-postgres-healthcheck");
		const test = capture(
			healthcheck,
			/^    (test: .+)$/m,
			"PostgreSQL healthcheck",
		);

		expect(test).toBe(expectedHealthchecks["postgres-healthcheck"]);
		expect(healthcheck).not.toContain("pg_isready");
	});

	it("queries the configured MySQL database before reporting healthy", () => {
		const healthcheck = getTopLevelBlock("x-mysql-healthcheck");
		const test = capture(healthcheck, /^    (test: .+)$/m, "MySQL healthcheck");

		expect(test).toBe(expectedHealthchecks["mysql-healthcheck"]);
		expect(healthcheck).not.toContain("mysqladmin");
	});

	it.each(
		postgresServices,
	)("maps $name to its dedicated PostgreSQL port and database", ({
		name,
		port,
	}) => {
		expect(readServiceContract(name, "POSTGRES_DB")).toEqual({
			database: "cinaauth",
			healthcheck: "postgres-healthcheck",
			port,
		});
	});

	it.each(
		mysqlServices,
	)("maps $name to its dedicated MySQL port and database", ({ name, port }) => {
		expect(readServiceContract(name, "MYSQL_DATABASE")).toEqual({
			database: "cinaauth",
			healthcheck: "mysql-healthcheck",
			port,
		});
	});

	it("does not retain the legacy database name", () => {
		expect(compose).not.toContain("cina_auth");
	});
});
