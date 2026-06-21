"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Page() {
	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-md p-6">
				<div className="space-y-4 text-center">
					{/* Spec: off-palette bg-green-100/text-green-600 → success/cyan-soft tokens. */}
					<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-soft">
						<Check className="h-6 w-6 text-cyan-deep" />
					</div>

					<div>
						{/* Spec: display-md (24/600/-0.96px), sentence-case + period. */}
						<h1 className="text-[24px] font-semibold leading-[32px] tracking-[-0.96px] text-ink">
							Device approved.
						</h1>
						<p className="text-body mt-2">
							The device has been successfully authorized to access your
							account.
						</p>
					</div>

					<p className="text-sm text-body">
						You can now return to your device to continue.
					</p>

					<Button asChild className="w-full">
						<Link href="/">Return to home.</Link>
					</Button>
				</div>
			</Card>
		</div>
	);
}
