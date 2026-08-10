import { Skeleton } from "@/components/ui/skeleton";

/** Route-level loading fallback for the admin shell. Shown while a page's
 *  RSC payload streams in, giving instant feedback on navigation. */
export default function AdminLoading() {
	return (
		<div className="space-y-6">
			{/* Header skeleton */}
			<div className="space-y-2">
				<Skeleton className="h-7 w-48" />
				<Skeleton className="h-4 w-32" />
			</div>
			{/* KPI tile row skeleton */}
			<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<div
						key={i}
						className="rounded-[var(--radius-lg)] border border-hairline bg-canvas p-5 shadow-card"
					>
						<Skeleton className="mb-3 h-3 w-20" />
						<Skeleton className="h-7 w-16" />
					</div>
				))}
			</div>
			{/* Table skeleton */}
			<div className="space-y-2">
				{Array.from({ length: 6 }).map((_, i) => (
					<Skeleton key={i} className="h-10 w-full" />
				))}
			</div>
		</div>
	);
}
