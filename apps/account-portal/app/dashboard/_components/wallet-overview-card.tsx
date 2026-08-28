import { ArrowRight, WalletCards } from "lucide-react";
import Link from "next/link";
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
import {
	formatWalletAddress,
	formatWalletChain,
	type WalletOverviewSummary,
} from "@/lib/security-center";

type WalletOverviewCardProps = {
	summary: WalletOverviewSummary;
};

export function WalletOverviewCard({ summary }: WalletOverviewCardProps) {
	const hasWallet = summary.available && summary.wallet !== null;
	const actionLabel = hasWallet ? "Manage wallets" : "Bind wallet";

	return (
		<Card>
			<CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<CardTitle className="flex items-center gap-2">
						<WalletCards className="h-5 w-5" /> Wallet
					</CardTitle>
					<CardDescription className="mt-1.5">
						Link an Ethereum wallet for secure wallet sign-in.
					</CardDescription>
				</div>
				<Badge variant="secondary">
					{summary.available
						? `${summary.count} connected`
						: "Status unavailable"}
				</Badge>
			</CardHeader>
			<CardContent>
				{!summary.available ? (
					<p className="text-sm text-muted-foreground">
						Wallet status is temporarily unavailable. Open Security to retry.
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
							{summary.wallet.isPrimary ? <Badge>Primary</Badge> : null}
						</div>
						<p className="mt-2 text-xs text-muted-foreground">
							{summary.count === 1
								? "This wallet can be used to sign in."
								: `${summary.count - 1} additional wallet${summary.count === 2 ? "" : "s"} linked.`}
						</p>
					</div>
				) : (
					<div className="rounded-md border border-dashed p-4">
						<p className="text-sm font-medium">No wallet linked</p>
						<p className="mt-1 text-sm text-muted-foreground">
							Connect a wallet once, then use it as an existing-account sign-in
							method.
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
