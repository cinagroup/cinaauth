import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const compose = readFileSync(
	new URL("../../docker-compose.yml", import.meta.url),
	"utf8",
);

describe("Docker Compose test databases", () => {
	it("uses the database name expected by the shared test clients", () => {
		expect(compose).not.toContain("cina_auth");
		expect(compose).toContain("pg_isready -U user -d cinaauth");
		expect(compose.match(/POSTGRES_DB: cinaauth/g)).toHaveLength(4);
		expect(compose.match(/MYSQL_DATABASE: cinaauth/g)).toHaveLength(3);
	});
});
