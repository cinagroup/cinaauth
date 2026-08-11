import { describe, expect, it, vi } from "vitest";
import type { CinaAuthDatabase } from "../src/database";
import { createDatabase } from "../src/database";
import { withRuntimeOrganizationMemberCapacity } from "../src/entitlement-runtime";
import type { CloudflareBindings } from "../src/env";

vi.mock("../src/database", () => ({
	createDatabase: vi.fn(),
}));

const createDatabaseDouble = ({
	existing = false,
	memberCount = 0,
}: {
	existing?: boolean;
	memberCount?: number;
}) => {
	const queries: string[] = [];
	const client = {
		query: async (text: string) => {
			queries.push(text);
			return { rows: [] };
		},
		release: vi.fn(),
	};
	const database = {
		connect: async () => client,
		query: async (text: string) => {
			queries.push(text);
			if (text.includes("SELECT EXISTS")) {
				return { rows: [{ exists: existing }] };
			}
			if (text.includes("SELECT COUNT(*)")) {
				return { rows: [{ count: memberCount }] };
			}
			return { rows: [] };
		},
		end: async () => undefined,
	} as unknown as CinaAuthDatabase;
	return { database, queries };
};

describe("runtime organization member capacity", () => {
	it("rejects a new member at the deployment-default limit before mutation", async () => {
		const { database, queries } = createDatabaseDouble({ memberCount: 100 });
		vi.mocked(createDatabase).mockReturnValue(database);
		const operation = vi.fn(async () => "created");

		await expect(
			withRuntimeOrganizationMemberCapacity(
				{} as CloudflareBindings,
				"organization-1",
				"new-user",
				operation,
			),
		).rejects.toMatchObject({
			status: "CONFLICT",
			body: expect.objectContaining({
				code: "ENTITLEMENT_LIMIT_REACHED",
				current: 100,
				maximum: 100,
			}),
		});
		expect(operation).not.toHaveBeenCalled();
		expect(queries).toContain(
			"SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
		);
	});

	it("allows an existing member without consuming another capacity slot", async () => {
		const { database, queries } = createDatabaseDouble({
			existing: true,
			memberCount: 100,
		});
		vi.mocked(createDatabase).mockReturnValue(database);
		const operation = vi.fn(async () => "unchanged");

		await expect(
			withRuntimeOrganizationMemberCapacity(
				{} as CloudflareBindings,
				"organization-1",
				"existing-user",
				operation,
			),
		).resolves.toBe("unchanged");
		expect(operation).toHaveBeenCalledOnce();
		expect(queries.some((query) => query.includes("SELECT COUNT(*)"))).toBe(
			false,
		);
	});
});
