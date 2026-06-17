import type { DBFieldAttribute } from "./type";

export type CinaAuthPluginDBSchema = {
	[table in string]: {
		fields: {
			[field: string]: DBFieldAttribute;
		};
		disableMigration?: boolean | undefined;
		modelName?: string | undefined;
	};
};
