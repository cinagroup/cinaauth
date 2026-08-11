"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export interface FilterState {
	searchField?: string;
	searchValue?: string;
	[key: string]: unknown;
}

/**
 * Field-select + debounced search input. Fires `onChange` (debounced 350ms) so
 * the parent query refetches only after the user stops typing.
 */
export function FilterBar({
	fields,
	onChange,
	searchLabel = "Search…",
}: {
	fields: { label: string; value: string }[];
	onChange: (f: FilterState) => void;
	searchLabel?: string;
}) {
	const [field, setField] = useState(fields[0]?.value ?? "email");
	const [value, setValue] = useState("");

	// Keep the latest onChange in a ref so the debounce effect depends only on
	// [field, value]. Parents pass an inline arrow (new identity every render);
	// depending on it directly would reset the timer each render and fire
	// onChange perpetually, re-rendering the list every 350ms.
	const onChangeRef = useRef(onChange);
	useEffect(() => {
		onChangeRef.current = onChange;
	});

	useEffect(() => {
		const id = setTimeout(
			() => onChangeRef.current({ searchField: field, searchValue: value }),
			350,
		);
		return () => clearTimeout(id);
	}, [field, value]);

	return (
		<div className="mb-4 flex flex-col gap-2 sm:flex-row">
			<Select value={field} onValueChange={setField}>
				<SelectTrigger className="h-10 w-full sm:w-[140px]">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{fields.map((f) => (
						<SelectItem key={f.value} value={f.value}>
							{f.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Input
				value={value}
				onChange={(e) => setValue(e.target.value)}
				placeholder={searchLabel}
				className="sm:flex-1"
			/>
		</div>
	);
}
