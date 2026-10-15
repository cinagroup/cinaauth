import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";
import * as matchers from "@testing-library/jest-dom/matchers";
import { expect } from "vitest";

// Register against this workspace's Vitest instance under strict pnpm resolution.
expect.extend(matchers);

declare module "vitest" {
	interface Matchers<R, T> extends TestingLibraryMatchers<unknown, R> {}
}
