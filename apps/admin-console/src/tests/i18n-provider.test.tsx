import { cleanup, render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { I18nProvider, useI18n } from "@/lib/i18n/i18n-context";

function SelectChinese() {
	const { setLang } = useI18n();
	useEffect(() => setLang("zh"), [setLang]);
	return null;
}

describe("I18nProvider", () => {
	afterEach(() => {
		cleanup();
		localStorage.clear();
		document.documentElement.lang = "en";
	});

	it("keeps the document language in sync", async () => {
		render(
			<I18nProvider>
				<SelectChinese />
			</I18nProvider>,
		);

		await waitFor(() => expect(document.documentElement.lang).toBe("zh-CN"));
	});
});
