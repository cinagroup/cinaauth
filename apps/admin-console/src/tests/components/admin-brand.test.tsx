import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminBrand } from "@/components/layout/admin-brand";

describe("AdminBrand", () => {
	it("uses the CinaSeek logo and the canonical admin product name", () => {
		const { container } = render(<AdminBrand />);

		expect(
			screen.getByLabelText("CinaSeek Admin — Identity operations"),
		).toBeInTheDocument();
		expect(screen.getByText("CinaSeek Admin")).toBeInTheDocument();
		expect(screen.getByText("Identity operations")).toBeInTheDocument();
		expect(container.querySelector("img")?.getAttribute("src")).toContain(
			"%2Flogo.png",
		);
	});

	it("keeps an accessible product label when the sidebar is collapsed", () => {
		render(<AdminBrand compact />);

		expect(
			screen.getByLabelText("CinaSeek Admin — Identity operations"),
		).toBeInTheDocument();
		expect(screen.queryByText("CinaSeek Admin")).not.toBeInTheDocument();
	});
});
