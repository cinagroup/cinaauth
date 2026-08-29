"use client";

import { Check, Loader2, ShieldCheck, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSessionQuery } from "@/data/user/session-query";
import {
	buildAgentApprovalStepUpPath,
	getAgentFlowError,
} from "@/lib/agent-authorization-flow";

type AgentApprovalPreview = {
	agent: {
		id: string;
		name: string;
		mode: string;
		hostName: string | null;
	};
	capabilities: Array<{
		name: string;
		description: string;
	}>;
};

type Resolution = "approved" | "denied" | null;

export default function Page() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const agentId = searchParams.get("agent_id") ?? "";
	const userCode =
		searchParams.get("code") ?? searchParams.get("user_code") ?? "";
	const { data: session } = useSessionQuery();
	const [preview, setPreview] = useState<AgentApprovalPreview | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [needsFreshSession, setNeedsFreshSession] = useState(false);
	const [resolution, setResolution] = useState<Resolution>(null);
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		if (!agentId || !userCode) {
			setError("This approval link is incomplete.");
			setLoading(false);
			return;
		}

		const controller = new AbortController();
		const query = new URLSearchParams({
			agent_id: agentId,
			user_code: userCode,
		});
		fetch(`/api/auth/agent/approval-preview?${query.toString()}`, {
			cache: "no-store",
			signal: controller.signal,
		})
			.then(async (response) => {
				const body = (await response.json().catch(() => null)) as unknown;
				if (!response.ok) {
					throw new Error(
						getAgentFlowError(
							body,
							"This approval request is invalid or expired.",
						).message,
					);
				}
				setPreview(body as AgentApprovalPreview);
			})
			.catch((caughtError: unknown) => {
				if (controller.signal.aborted) return;
				setError(
					caughtError instanceof Error
						? caughtError.message
						: "Unable to load this approval request.",
				);
			})
			.finally(() => {
				if (!controller.signal.aborted) setLoading(false);
			});

		return () => controller.abort();
	}, [agentId, userCode]);

	const resolveApproval = (action: "approve" | "deny") => {
		setError(null);
		setNeedsFreshSession(false);
		startTransition(async () => {
			try {
				const response = await fetch("/api/auth/agent/approve-capability", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						agent_id: agentId,
						user_code: userCode,
						action,
					}),
				});
				const body = (await response.json().catch(() => null)) as unknown;
				if (!response.ok) {
					const approvalError = getAgentFlowError(body, "Approval failed.");
					setError(approvalError.message);
					setNeedsFreshSession(approvalError.code === "fresh_session_required");
					return;
				}
				setResolution(action === "approve" ? "approved" : "denied");
			} catch (caughtError: unknown) {
				setError(
					caughtError instanceof Error
						? caughtError.message
						: "Approval failed.",
				);
			}
		});
	};

	const stepUp = () => {
		const query = searchParams.toString();
		const currentPath = `/device/capabilities${query ? `?${query}` : ""}`;
		router.push(buildAgentApprovalStepUpPath(currentPath));
	};

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center p-4">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (resolution) {
		return (
			<div className="flex min-h-screen items-center justify-center p-4">
				<Card className="w-full max-w-md space-y-4 p-6 text-center">
					<ShieldCheck className="mx-auto h-10 w-10 text-emerald-600" />
					<h1 className="text-[24px] font-semibold leading-[32px] tracking-[-0.96px] text-ink">
						Access {resolution}.
					</h1>
					<p className="text-body">
						{resolution === "approved"
							? "The agent can use only the capabilities shown on the approval screen."
							: "The agent was not granted access."}
					</p>
				</Card>
			</div>
		);
	}

	if (!preview) {
		return (
			<div className="flex min-h-screen items-center justify-center p-4">
				<Card className="w-full max-w-md space-y-4 p-6">
					<h1 className="text-[24px] font-semibold leading-[32px] tracking-[-0.96px] text-ink">
						Approval unavailable.
					</h1>
					<Alert variant="destructive">
						<AlertDescription>
							{error ?? "This approval request is invalid or expired."}
						</AlertDescription>
					</Alert>
				</Card>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-md space-y-5 p-6">
				<div className="space-y-2 text-center">
					<ShieldCheck className="mx-auto h-9 w-9 text-primary" />
					<h1 className="text-[24px] font-semibold leading-[32px] tracking-[-0.96px] text-ink">
						Approve agent access.
					</h1>
					<p className="text-body">
						Review exactly what this AI agent is requesting.
					</p>
				</div>

				<div className="space-y-3 rounded-md bg-canvas-soft p-4">
					<div>
						<p className="text-sm font-medium text-ink">Agent</p>
						<p className="text-body">{preview.agent.name}</p>
					</div>
					<div>
						<p className="text-sm font-medium text-ink">Host</p>
						<p className="text-body">
							{preview.agent.hostName ?? "Unnamed agent host"} ·{" "}
							{preview.agent.mode}
						</p>
					</div>
					<div>
						<p className="text-sm font-medium text-ink">Verification code</p>
						<p className="font-mono text-lg tracking-wider text-ink">
							{userCode}
						</p>
					</div>
				</div>

				<div className="space-y-2">
					<p className="text-sm font-medium text-ink">Requested capabilities</p>
					{preview.capabilities.length > 0 ? (
						preview.capabilities.map((capability) => (
							<div
								key={capability.name}
								className="rounded-md border border-border p-3"
							>
								<p className="font-mono text-sm text-ink">{capability.name}</p>
								<p className="text-body mt-1">{capability.description}</p>
							</div>
						))
					) : (
						<p className="text-body rounded-md border border-border p-3">
							No data capability was requested. Approval only activates this
							agent.
						</p>
					)}
				</div>

				<div className="rounded-md bg-canvas-soft p-4">
					<p className="text-sm font-medium text-ink">Signed in as</p>
					<p className="text-body">{session?.user.email}</p>
				</div>

				{error && (
					<Alert variant="destructive">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				{needsFreshSession && (
					<Button onClick={stepUp} variant="outline" className="w-full">
						Sign in again to approve
					</Button>
				)}

				<div className="flex gap-3">
					<Button
						onClick={() => resolveApproval("deny")}
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
						onClick={() => resolveApproval("approve")}
						className="flex-1"
						disabled={isPending || needsFreshSession}
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
			</Card>
		</div>
	);
}
