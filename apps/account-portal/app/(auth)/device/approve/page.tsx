"use client";

import { Check, Loader2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSessionQuery } from "@/data/user/session-query";
import { authClient } from "@/lib/auth-client";
import {
	buildDeviceFlowPath,
	getDeviceFlowResponseError,
	getDeviceFlowThrownError,
} from "@/lib/device-authorization-flow";

export default function Page() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const userCode = searchParams.get("user_code");
	const { data: session } = useSessionQuery();
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);

	const handleApprove = () => {
		if (!userCode) return;

		setError(null);

		startTransition(async () => {
			try {
				const response = await authClient.device.approve({
					userCode,
				});
				const responseError = getDeviceFlowResponseError(
					response,
					"Failed to approve device",
				);
				if (responseError) {
					setError(responseError);
					return;
				}
				router.push(buildDeviceFlowPath("/device/success", searchParams));
			} catch (caughtError: unknown) {
				setError(
					getDeviceFlowThrownError(caughtError, "Failed to approve device"),
				);
			}
		});
	};

	const handleDeny = () => {
		if (!userCode) return;

		setError(null);

		startTransition(async () => {
			try {
				const response = await authClient.device.deny({
					userCode,
				});
				const responseError = getDeviceFlowResponseError(
					response,
					"Failed to deny device",
				);
				if (responseError) {
					setError(responseError);
					return;
				}
				router.push(buildDeviceFlowPath("/device/denied", searchParams));
			} catch (caughtError: unknown) {
				setError(
					getDeviceFlowThrownError(caughtError, "Failed to deny device"),
				);
			}
		});
	};

	if (!session) {
		return null;
	}

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-md p-6">
				<div className="space-y-4">
					<div className="text-center">
						{/* Spec: display-md (24/600/-0.96px), sentence-case + period. */}
						<h1 className="text-[24px] font-semibold leading-[32px] tracking-[-0.96px] text-ink">
							Approve device.
						</h1>
						<p className="text-body mt-2">
							A device is requesting access to your account.
						</p>
					</div>

					<div className="space-y-4">
						<div className="rounded-md bg-canvas-soft p-4">
							<p className="text-sm font-medium text-ink">Device code</p>
							<p className="font-mono text-lg text-ink">{userCode}</p>
						</div>

						<div className="rounded-md bg-canvas-soft p-4">
							<p className="text-sm font-medium text-ink">Signed in as</p>
							<p className="text-body">{session.user.email}</p>
						</div>

						{error && (
							<Alert variant="destructive">
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}

						<div className="flex gap-3">
							<Button
								onClick={handleDeny}
								variant="outline"
								className="flex-1"
								disabled={isPending}
							>
								{isPending ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<>
										<X className="mr-2 h-4 w-4" />
										Deny
									</>
								)}
							</Button>
							<Button
								onClick={handleApprove}
								className="flex-1"
								disabled={isPending}
							>
								{isPending ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<>
										<Check className="mr-2 h-4 w-4" />
										Approve
									</>
								)}
							</Button>
						</div>
					</div>
				</div>
			</Card>
		</div>
	);
}
