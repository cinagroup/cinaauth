import type { CinaAuthOptions } from "@cinaauth/core";
import type { DBAdapter } from "@cinaauth/core/db/adapter";

export interface SchemaGeneratorResult {
	code?: string;
	fileName: string;
	overwrite?: boolean;
	append?: boolean;
}

export interface SchemaGenerator {
	<Options extends CinaAuthOptions>(opts: {
		file?: string;
		adapter: DBAdapter;
		options: Options;
	}): Promise<SchemaGeneratorResult>;
}
