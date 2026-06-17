import type { CinaAuthClientPlugin } from "cinaauth/client";
import { adminClient, inferAdditionalFields } from "cinaauth/client/plugins";
import { createAccessControl } from "cinaauth/plugins/access";
import { defaultStatements } from "cinaauth/plugins/admin/access";
import { createAuthClient } from "cinaauth/react";
import { atom } from "nanostores";

const statement = {
	...defaultStatements,
	blog: ["create", "read", "update", "delete", "publish"],
} as const;

const ac = createAccessControl(statement);

const adminRole = ac.newRole({
	user: [
		"create",
		"list",
		"set-role",
		"ban",
		"impersonate",
		"delete",
		"set-password",
		"get",
		"update",
	],
	session: ["list", "revoke", "delete"],
	blog: ["create", "read", "update", "delete", "publish"],
});

const writerRole = ac.newRole({
	blog: ["create", "read", "update", "delete", "publish"],
});

const userRole = ac.newRole({
	blog: [],
	user: [],
	session: [],
});

const fixtureAtomClient = () =>
	({
		id: "fixture-atom-client",
		getAtoms() {
			return {
				fixtureCounter: atom(0),
			};
		},
	}) satisfies CinaAuthClientPlugin;

/**
 * @see https://github.com/cinagroup/cinaauth/issues/9189
 */
export const authClient = createAuthClient({
	baseURL: "http://localhost:3000",
	basePath: "/api/auth",
	plugins: [
		adminClient({
			ac,
			roles: {
				admin: adminRole,
				writer: writerRole,
				user: userRole,
			},
		}),
		fixtureAtomClient(),
		inferAdditionalFields({
			user: {
				role: { type: "string", required: false },
			},
			session: {
				impersonatedBy: { type: "string", required: false },
			},
		}),
	],
});

authClient.admin.checkRolePermission({
	role: "writer",
	permissions: {
		blog: ["publish"],
	},
});
authClient.useFixtureCounter();

type Session = typeof authClient.$Infer.Session;

export type Issue9189Role = Session["user"]["role"];
export type Issue9189ImpersonatedBy = Session["session"]["impersonatedBy"];
