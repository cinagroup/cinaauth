export const OPENAPI_METHODS = [
	"get",
	"post",
	"put",
	"patch",
	"delete",
	"options",
	"head",
] as const;

export type OpenApiMethod = (typeof OPENAPI_METHODS)[number];

export interface OpenApiParameter {
	name?: string;
	in?: string;
	required?: boolean;
	description?: string;
}

export interface OpenApiResponse {
	description?: string;
}

export interface OpenApiOperation {
	summary?: string;
	description?: string;
	tags?: string[];
	parameters?: OpenApiParameter[];
	responses?: Record<string, OpenApiResponse>;
}

export type OpenApiPathItem = Partial<Record<OpenApiMethod, OpenApiOperation>>;

export interface OpenApiDocument {
	openapi?: string;
	info?: { title?: string; version?: string; description?: string };
	paths?: Record<string, OpenApiPathItem>;
	components?: { schemas?: Record<string, unknown> };
}

export interface OpenApiOperationEntry extends OpenApiOperation {
	method: OpenApiMethod;
	path: string;
}

/** Flatten an OpenAPI paths map into stable, searchable endpoint entries. */
export function collectOpenApiOperations(
	document: OpenApiDocument | undefined,
): OpenApiOperationEntry[] {
	const entries: OpenApiOperationEntry[] = [];
	for (const [path, pathItem] of Object.entries(document?.paths ?? {})) {
		for (const method of OPENAPI_METHODS) {
			const operation = pathItem[method];
			if (operation) entries.push({ ...operation, method, path });
		}
	}
	return entries.sort(
		(left, right) =>
			left.path.localeCompare(right.path) ||
			OPENAPI_METHODS.indexOf(left.method) -
				OPENAPI_METHODS.indexOf(right.method),
	);
}

/** Match the endpoint's path, method, summary, description, or tags. */
export function matchesOpenApiSearch(
	entry: OpenApiOperationEntry,
	search: string,
): boolean {
	const query = search.trim().toLocaleLowerCase();
	if (!query) return true;
	return [
		entry.method,
		entry.path,
		entry.summary,
		entry.description,
		...(entry.tags ?? []),
	]
		.filter((value): value is string => typeof value === "string")
		.some((value) => value.toLocaleLowerCase().includes(query));
}
