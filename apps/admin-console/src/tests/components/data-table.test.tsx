import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";

function Harness<T>({
	data,
	columns,
	rowClassName,
	isLoading,
	isError,
	onRetry,
	onRowClick,
}: {
	data: T[];
	columns: ColumnDef<T>[];
	rowClassName?: (row: T) => string | undefined;
	isLoading?: boolean;
	isError?: boolean;
	onRetry?: () => void;
	onRowClick?: (row: T) => void;
}) {
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});
	return (
		<DataTable
			table={table}
			rowClassName={rowClassName}
			isLoading={isLoading}
			isError={isError}
			onRetry={onRetry}
			onRowClick={onRowClick}
		/>
	);
}

describe("DataTable", () => {
	it("renders header and rows", () => {
		const data = [{ a: "x" }, { a: "y" }];
		const cols: ColumnDef<{ a: string }>[] = [
			{ accessorKey: "a", header: "A" },
		];
		render(<Harness data={data} columns={cols} />);
		expect(screen.getByText("A")).toBeTruthy();
		expect(screen.getByText("x")).toBeTruthy();
		expect(screen.getByText("y")).toBeTruthy();
	});

	it("renders empty label when no rows", () => {
		const cols: ColumnDef<{ a: string }>[] = [
			{ accessorKey: "a", header: "A" },
		];
		render(<Harness data={[]} columns={cols} />);
		expect(screen.getByText("暂无数据")).toBeTruthy();
	});

	it("applies per-row className via rowClassName", () => {
		const data = [{ a: "x", bad: true }];
		const cols: ColumnDef<{ a: string; bad: boolean }>[] = [
			{ accessorKey: "a", header: "A" },
		];
		const { container } = render(
			<Harness
				data={data}
				columns={cols}
				rowClassName={(r) => (r.bad ? "row-danger" : undefined)}
			/>,
		);
		expect(container.querySelector("tbody tr")?.className).toContain(
			"row-danger",
		);
	});

	it("renders a retryable error without calling it empty data", () => {
		const retry = vi.fn();
		const cols: ColumnDef<{ a: string }>[] = [
			{ accessorKey: "a", header: "A" },
		];
		render(<Harness data={[]} columns={cols} isError onRetry={retry} />);
		expect(screen.queryByText("暂无数据")).toBeNull();
		fireEvent.click(screen.getByText("重试"));
		expect(retry).toHaveBeenCalledTimes(1);
	});

	it("opens a row with Enter but ignores nested action clicks", () => {
		const onRowClick = vi.fn();
		const data = [{ a: "x" }];
		const cols: ColumnDef<{ a: string }>[] = [
			{ accessorKey: "a", header: "A" },
			{ id: "action", cell: () => <button type="button">Action</button> },
		];
		const { container } = render(
			<Harness data={data} columns={cols} onRowClick={onRowClick} />,
		);
		fireEvent.click(screen.getByText("Action"));
		expect(onRowClick).not.toHaveBeenCalled();
		fireEvent.keyDown(container.querySelector("tbody tr")!, { key: "Enter" });
		expect(onRowClick).toHaveBeenCalledWith(data[0]);
	});
});

describe("Badge", () => {
	it("renders children with the danger variant class", () => {
		const { container } = render(<Badge variant="danger">失败</Badge>);
		const span = container.querySelector("span");
		expect(span?.textContent).toBe("失败");
		expect(span?.className).toContain("text-error");
	});
});
