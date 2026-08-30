"use client";

import { ArrowRight, WalletCards } from "lucide-react";
import Link from "next/link";
import { useDashboardI18n } from "@/components/dashboard/use-dashboard-i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { WalletOverviewSummary } from "@/lib/security-center";
import { formatWalletAddress, formatWalletChain } from "@/lib/security-center";
import { formatDashboardMessage } from "@/lib/dashboard-i18n";

type WalletOverviewCardProps = {
	summary: WalletOverviewSummary;
};

export function WalletOverviewCard({ summary }: WalletOverviewCardProps) {
	const { messages } = useDashboardI18n();
	const hasWallet = summary.available && summary.wallet !== null;
	const actionLabel = hasWallet ? messages.manageWallets : messages.bindWallet;

	return (
		<Card>
			<CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<CardTitle className="flex items-center gap-2">
						<WalletCards className="h-5 w-5" /> {messages.walletTitle}
					</CardTitle>
					<CardDescription className="mt-1.5">
						{messages.walletDescription}
					</CardDescription>
				</div>
				<Badge variant="secondary">
					{summary.available
						? formatDashboardMessage(messages.connectedCount, {
								count: String(summary.count),
							})
						: messages.statusUnavailable}
				</Badge>
			</CardHeader>
			<CardContent>
				{!summary.available ? (
					<p className="text-sm text-muted-foreground">
						{messages.walletStatusUnavailable}
					</p>
				) : summary.wallet ? (
					<div className="rounded-md border bg-canvas-soft p-4">
						<div className="flex flex-wrap items-center gap-2">
							<code className="text-sm font-medium">
								{formatWalletAddress(summary.wallet.address)}
							</code>
							<Badge variant="outline">
								{formatWalletChain(summary.wallet.chainId)}
							</Badge>
							{summary.wallet.isPrimary ? <Badge>{messages.primary}</Badge> : null}
						</div>
						<p className="mt-2 text-xs text-muted-foreground">
							{summary.count === 1
								? messages.walletSignInReady
								: formatDashboardMessage(messages.additionalWallets, {
										count: String(summary.count - 1),
									})}
						</p>
					</div>
				) : (
					<div className="rounded-md border border-dashed p-4">
						<p className="text-sm font-medium">{messages.noWalletLinked}</p>
						<p className="mt-1 text-sm text-muted-foreground">
							{messages.noWalletDescription}
						</p>
					</div>
				)}
			</CardContent>
			<CardFooter>
				<Button asChild variant={hasWallet ? "outline" : "default"}>
					<Link href="/dashboard/security#wallets">
						{actionLabel}
						<ArrowRight className="ml-2 h-4 w-4" aria-hidden />
					</Link>
				</Button>
			</CardFooter>
		</Card>
	);
}
