"use client";

import type { EntitlementSnapshot } from "@cinaauth/auth-web-contract";
import { ArrowUpFromLine, CreditCard, RefreshCcw } from "lucide-react";
import { useId, useState } from "react";
import { useDashboardI18n } from "@/components/dashboard/use-dashboard-i18n";
import { SubscriptionTierLabel } from "@/components/subscription-tier";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscriptionCancelMutation } from "@/data/subscription/subscription-cancel-mutation";
import { useSubscriptionListQuery } from "@/data/subscription/subscription-list-query";
import { useSubscriptionRestoreMutation } from "@/data/subscription/subscription-restore-mutation";
import { useSubscriptionUpgradeMutation } from "@/data/subscription/subscription-upgrade-mutation";
import { formatDashboardMessage } from "@/lib/dashboard-i18n";

const SubscriptionCard = ({
	billingEnabled,
	entitlements,
}: {
	billingEnabled: boolean;
	entitlements: EntitlementSnapshot | null;
}) => {
	const { messages, locale } = useDashboardI18n();
	const { data: subscriptions, isLoading } =
		useSubscriptionListQuery(billingEnabled);

	const currentSubscription =
		subscriptions?.find(
			(sub) => sub.status === "active" || sub.status === "trialing",
		) || null;

	if (!billingEnabled) {
		const unavailable = entitlements === null;
		return (
			<Card className="border-hairline">
				<CardHeader className="pb-3">
					<CardTitle className="text-base font-medium text-ink">
						{messages.subscription}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2 text-sm text-mute">
					<p>
						{unavailable
							? messages.entitlementsUnavailable
							: messages.unmeteredAccess}
					</p>
					<p>{messages.billingNotReady}</p>
				</CardContent>
			</Card>
		);
	}

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{messages.subscription}</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex items-center justify-between">
						<Skeleton className="h-5 w-20" />
						<Skeleton className="h-8 w-28" />
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="border-hairline">
			<CardHeader className="pb-3">
				<CardTitle className="text-base font-medium text-ink">
					{messages.subscription}
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						{!!currentSubscription && (
							<Badge
								className="w-min p-px rounded-full bg-canvas-soft border-hairline text-body"
								variant="outline"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="1.2em"
									height="1.2em"
									viewBox="0 0 24 24"
								>
									<path
										fill="currentColor"
										d="m9.023 21.23l-1.67-2.814l-3.176-.685l.312-3.277L2.346 12L4.49 9.546L4.177 6.27l3.177-.685L9.023 2.77L12 4.027l2.977-1.258l1.67 2.816l3.176.684l-.312 3.277L21.655 12l-2.142 2.454l.311 3.277l-3.177.684l-1.669 2.816L12 19.973zm1.927-6.372L15.908 9.9l-.708-.72l-4.25 4.25l-2.15-2.138l-.708.708z"
									></path>
								</svg>
							</Badge>
						)}
						<SubscriptionTierLabel
							tier={currentSubscription?.plan?.toLowerCase()}
						/>
					</div>
					<ChangePlanDialog
						currentPlan={currentSubscription?.plan?.toLowerCase()}
						isTrial={currentSubscription?.status === "trialing"}
						cancelAtPeriodEnd={currentSubscription?.cancelAtPeriodEnd}
					/>
				</div>

				{currentSubscription && (
					<div className="space-y-2 text-sm bg-canvas-soft-2 rounded-md p-3 border border-hairline">
						<div className="flex justify-between items-center">
							<span className="text-mute">{messages.status}</span>
							<span className="font-medium text-ink capitalize">
								{currentSubscription.cancelAtPeriodEnd
									? messages.canceling
									: currentSubscription.status === "trialing"
										? messages.trialing
										: messages.active}
							</span>
						</div>
						{currentSubscription.periodEnd && (
							<div className="flex justify-between items-center">
								<span className="text-mute">
									{currentSubscription.cancelAtPeriodEnd
										? messages.cancelsOn
										: currentSubscription.status === "trialing"
											? messages.trialEnds
											: messages.renews}
								</span>
								<span className="font-medium text-ink">
									{new Date(currentSubscription.periodEnd).toLocaleDateString(
										locale,
									)}
								</span>
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
};
export default SubscriptionCard;

function ChangePlanDialog(props: {
	currentPlan?: string;
	isTrial?: boolean;
	cancelAtPeriodEnd?: boolean;
}) {
	const { messages } = useDashboardI18n();
	const id = useId();
	const [selectedPlan, setSelectedPlan] = useState("plus");

	const upgradeMutation = useSubscriptionUpgradeMutation();
	const cancelMutation = useSubscriptionCancelMutation();
	const restoreMutation = useSubscriptionRestoreMutation();

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					variant={"outline"}
					size="sm"
					className="gap-2 bg-canvas-soft border-hairline text-ink hover:bg-canvas-soft-2"
				>
					{props.currentPlan ? (
						<RefreshCcw size={14} strokeWidth={2} />
					) : (
						<ArrowUpFromLine size={14} strokeWidth={2} />
					)}
					{props.currentPlan ? messages.changePlan : messages.upgradePlan}
				</Button>
			</DialogTrigger>
			<DialogContent>
				<div className="mb-2 flex flex-col gap-2">
					<div
						className="flex size-11 shrink-0 items-center justify-center rounded-full border border-hairline bg-canvas-soft text-mute"
						aria-hidden="true"
					>
						{props.currentPlan ? (
							<RefreshCcw size={16} strokeWidth={2} />
						) : (
							<CreditCard size={16} strokeWidth={2} />
						)}
					</div>
					<DialogHeader>
						<DialogTitle className="text-left">
							{!props.currentPlan
								? messages.upgradeYourPlan
								: messages.changeYourPlan}
						</DialogTitle>
						<DialogDescription className="text-left">
							{messages.pickPlan}
						</DialogDescription>
					</DialogHeader>
				</div>

				<form className="space-y-5">
					<RadioGroup
						className="gap-2"
						defaultValue="2"
						value={selectedPlan}
						onValueChange={(value) => setSelectedPlan(value)}
					>
						<div className="relative flex w-full items-center gap-2 rounded-lg border border-hairline bg-canvas-soft px-4 py-3 has-data-[state=checked]:border-mute has-data-[state=checked]:bg-canvas-soft-2">
							<RadioGroupItem
								value="plus"
								id={`${id}-1`}
								aria-describedby={`${id}-1-description`}
								className="order-1 after:absolute after:inset-0"
							/>
							<div className="grid grow gap-1">
								<Label htmlFor={`${id}-1`} className="text-ink">
									Plus
								</Label>
								<p id={`${id}-1-description`} className="text-xs text-mute">
									{formatDashboardMessage(messages.pricePerMonth, {
										price: "20",
									})}
								</p>
							</div>
						</div>
						<div className="relative flex w-full items-center gap-2 rounded-lg border border-hairline bg-canvas-soft px-4 py-3 has-data-[state=checked]:border-mute has-data-[state=checked]:bg-canvas-soft-2">
							<RadioGroupItem
								value="pro"
								id={`${id}-2`}
								aria-describedby={`${id}-2-description`}
								className="order-1 after:absolute after:inset-0"
							/>
							<div className="grid grow gap-1">
								<Label htmlFor={`${id}-2`} className="text-ink">
									Pro
								</Label>
								<p id={`${id}-2-description`} className="text-xs text-mute">
									{formatDashboardMessage(messages.pricePerMonth, {
										price: "200",
									})}
								</p>
							</div>
						</div>
						<div className="relative flex w-full items-center gap-2 rounded-lg border border-hairline bg-canvas-soft px-4 py-3 has-data-[state=checked]:border-mute has-data-[state=checked]:bg-canvas-soft-2">
							<RadioGroupItem
								value="enterprise"
								id={`${id}-3`}
								aria-describedby={`${id}-3-description`}
								className="order-1 after:absolute after:inset-0"
							/>
							<div className="grid grow gap-1">
								<Label htmlFor={`${id}-3`} className="text-ink">
									Enterprise
								</Label>
								<p id={`${id}-3-description`} className="text-xs text-mute">
									{messages.contactSales}
								</p>
							</div>
						</div>
					</RadioGroup>

					<div className="space-y-3">
						<p className="text-xs text-mute text-center">
							{messages.upgradeNote}
						</p>
					</div>

					<div className="grid gap-2">
						<Button
							type="button"
							className="w-full"
							disabled={
								(selectedPlan === props.currentPlan?.toLowerCase() &&
									!props.isTrial &&
									!props.cancelAtPeriodEnd) ||
								upgradeMutation.isPending ||
								restoreMutation.isPending
							}
							onClick={() => {
								if (selectedPlan === "enterprise") {
									window.open("https://www.cinagroup.com/enterprise", "_blank");
									return;
								}
								// Resume if canceling and selecting same plan
								if (
									props.cancelAtPeriodEnd &&
									selectedPlan === props.currentPlan?.toLowerCase()
								) {
									restoreMutation.mutate();
									return;
								}
								upgradeMutation.mutate(selectedPlan);
							}}
						>
							{selectedPlan === props.currentPlan?.toLowerCase()
								? props.isTrial
									? messages.upgrade
									: props.cancelAtPeriodEnd
										? messages.resumePlan
										: messages.currentPlan
								: selectedPlan === "plus"
									? !props.currentPlan
										? messages.upgrade
										: messages.downgrade
									: selectedPlan === "pro"
										? messages.upgrade
										: messages.contactUs}
						</Button>
						{props.currentPlan && !props.cancelAtPeriodEnd && (
							<Button
								type="button"
								variant="destructive"
								className="w-full"
								disabled={cancelMutation.isPending}
								onClick={() => {
									cancelMutation.mutate("/dashboard");
								}}
							>
								{messages.cancelPlan}
							</Button>
						)}
						{props.cancelAtPeriodEnd && (
							<p className="text-sm text-center text-body">
								{messages.cancelAtPeriodEnd}
							</p>
						)}
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
