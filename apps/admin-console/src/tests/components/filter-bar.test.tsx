import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FilterBar } from "@/components/data-table/filter-bar";

const FIELDS = [
	{ label: "Email", value: "email" },
	{ label: "Name", value: "name" },
];

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("FilterBar", () => {
	it("debounces and fires onChange once with the typed value", () => {
		vi.useFakeTimers();
		const onChange = vi.fn();
		render(<FilterBar fields={FIELDS} onChange={onChange} searchLabel="Search…" />);

		// Initial debounced fire (empty search) after mount.
		act(() => vi.advanceTimersByTime(350));
		onChange.mockClear();

		const input = screen.getByPlaceholderText("Search…");
		fireEvent.change(input, { target: { value: "ab" } });
		fireEvent.change(input, { target: { value: "abc" } });

		// Nothing yet — still within the debounce window.
		expect(onChange).not.toHaveBeenCalled();

		act(() => vi.advanceTimersByTime(350));
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith({ searchField: "email", searchValue: "abc" });
	});

	it("does not fire perpetually when the parent passes a new onChange each render", () => {
		vi.useFakeTimers();
		const onChange = vi.fn();
		const { rerender } = render(
			<FilterBar fields={FIELDS} onChange={onChange} searchLabel="Search…" />,
		);
		act(() => vi.advanceTimersByTime(350)); // initial fire
		onChange.mockClear();

		// Re-render with a brand-new onChange identity but unchanged field/value.
		// The old bug reset the timer every render and fired onChange endlessly;
		// with the ref fix, no input change means no new debounced call.
		rerender(
			<FilterBar
				fields={FIELDS}
				onChange={() => onChange("stale")}
				searchLabel="Search…"
			/>,
		);
		act(() => vi.advanceTimersByTime(1000));
		expect(onChange).not.toHaveBeenCalled();
	});

	it("uses the latest onChange when the debounce fires", () => {
		vi.useFakeTimers();
		const first = vi.fn();
		const second = vi.fn();
		const { rerender } = render(
			<FilterBar fields={FIELDS} onChange={first} searchLabel="Search…" />,
		);
		act(() => vi.advanceTimersByTime(350));
		first.mockClear();

		const input = screen.getByPlaceholderText("Search…");
		fireEvent.change(input, { target: { value: "x" } });
		// Swap the handler before the debounce elapses.
		rerender(<FilterBar fields={FIELDS} onChange={second} searchLabel="Search…" />);
		act(() => vi.advanceTimersByTime(350));

		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledWith({ searchField: "email", searchValue: "x" });
	});
});
