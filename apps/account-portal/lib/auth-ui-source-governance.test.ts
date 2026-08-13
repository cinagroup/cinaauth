import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const accountPortalRoot = resolve(import.meta.dirname, "..");
const repositoryRoot = resolve(accountPortalRoot, "../..");

const isForbiddenAuthUiPackage = (packageName: string) =>
	packageName === "better-auth" ||
	packageName.startsWith("@better-auth/") ||
	packageName.startsWith("@better-auth-ui/") ||
	packageName === "heroui" ||
	packageName.startsWith("@heroui/");

const collectSourceFiles = (directory: string): string[] =>
	readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) return collectSourceFiles(path);

		return [".js", ".jsx", ".mjs", ".mts", ".ts", ".tsx"].includes(
			extname(entry.name),
		)
			? [path]
			: [];
	});

const collectImportSpecifiers = (source: string) => {
	const specifiers: string[] = [];
	const staticImportPattern =
		/^\s*(?:import|export)\s+(?:type\s+)?(?:[^"'`]*?\s+from\s+)?["']([^"']+)["']/gm;
	const dynamicImportPattern = /\bimport\(\s*["']([^"']+)["']\s*\)/g;

	for (const match of source.matchAll(staticImportPattern)) {
		if (match[1]) specifiers.push(match[1]);
	}
	for (const match of source.matchAll(dynamicImportPattern)) {
		if (match[1]) specifiers.push(match[1]);
	}

	return specifiers;
};

describe("cinaauth-ui source-only governance", () => {
	it("keeps Better Auth UI and HeroUI out of direct Accounts dependencies", () => {
		const packageJson = JSON.parse(
			readFileSync(join(accountPortalRoot, "package.json"), "utf8"),
		) as {
			dependencies?: Record<string, string>;
			devDependencies?: Record<string, string>;
			optionalDependencies?: Record<string, string>;
			peerDependencies?: Record<string, string>;
		};
		const dependencyNames = [
			...Object.keys(packageJson.dependencies ?? {}),
			...Object.keys(packageJson.devDependencies ?? {}),
			...Object.keys(packageJson.optionalDependencies ?? {}),
			...Object.keys(packageJson.peerDependencies ?? {}),
		];

		expect(dependencyNames.filter(isForbiddenAuthUiPackage)).toEqual([]);
	});

	it("keeps Better Auth UI and HeroUI imports out of Accounts source", () => {
		const sourceRoots = ["app", "components", "data", "hooks", "lib"]
			.map((path) => join(accountPortalRoot, path))
			.filter(existsSync);
		const violations = sourceRoots.flatMap((root) =>
			collectSourceFiles(root).flatMap((path) =>
				collectImportSpecifiers(readFileSync(path, "utf8"))
					.filter(isForbiddenAuthUiPackage)
					.map((specifier) => ({
						path: relative(accountPortalRoot, path).replaceAll("\\", "/"),
						specifier,
					})),
			),
		);

		expect(violations).toEqual([]);
	});

	it("pins the reviewed source and records no direct code imports", () => {
		const requiredGovernanceFiles = [
			join(repositoryRoot, "docs/CINAAUTH_UI_SOURCE_GOVERNANCE.md"),
			join(repositoryRoot, "third_party/better-auth-ui/LICENSE"),
			join(repositoryRoot, "third_party/better-auth-ui/UPSTREAM.lock.json"),
			join(repositoryRoot, "third_party/better-auth-ui/IMPORTS.json"),
		];
		const missingFiles = requiredGovernanceFiles
			.filter((path) => !existsSync(path))
			.map((path) => relative(repositoryRoot, path).replaceAll("\\", "/"));

		expect(missingFiles).toEqual([]);
		if (missingFiles.length > 0) return;

		const upstream = JSON.parse(
			readFileSync(requiredGovernanceFiles[2] as string, "utf8"),
		) as {
			commit: string;
			usage: string;
			version: string;
		};
		const imports = JSON.parse(
			readFileSync(requiredGovernanceFiles[3] as string, "utf8"),
		) as {
			behavioralReferences: Array<{
				copied: boolean;
				id: string;
				sourcePaths: string[];
			}>;
			copiedSemantics: string;
			directCodeImports: unknown[];
		};

		expect(upstream).toMatchObject({
			commit: "d52ec3dc178cd861d8f658d92e4a0fc15472ce71",
			usage: "behavioral-reference-only",
			version: "1.6.45",
		});
		expect(imports.directCodeImports).toEqual([]);
		expect(imports.copiedSemantics).toContain("no verbatim source");
		expect(imports.behavioralReferences.length).toBeGreaterThan(0);
		expect(imports.behavioralReferences.every(({ copied }) => !copied)).toBe(
			true,
		);
		expect(
			imports.behavioralReferences.find(
				({ id }) => id === "otp-and-two-factor-interaction-patterns",
			)?.sourcePaths,
		).toContain("packages/core/src/lib/backup-codes.ts");
		expect(
			imports.behavioralReferences.find(
				({ id }) => id === "oauth-presentation-patterns",
			)?.sourcePaths,
		).toContain(
			"packages/core/src/plugins/oauth-provider/oauth-scope-metadata.ts",
		);
	});
});
