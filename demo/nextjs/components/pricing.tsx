"use client";

import NumberFlow from "@number-flow/react";
import { CheckIcon } from "@radix-ui/react-icons";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

function useMediaQuery(query: string) {
	const [matches, setMatches] = useState(false);

	useEffect(() => {
		const media = window.matchMedia(query);
		if (media.matches !== matches) {
			setMatches(media.matches);
		}

		const listener = () => setMatches(media.matches);
		media.addListener(listener);

		return () => media.removeListener(listener);
	}, [query]);

	return matches;
}

interface PricingPlan {
	name: string;
	price: string;
	yearlyPrice: string;
	period: string;
	features: string[];
	description: string;
	buttonText: string;
	href: string;
	isPopular: boolean;
}

interface PricingProps {
	plans: PricingPlan[];
	title?: string;
	description?: string;
}

export function Pricing({
	plans,
	title = "Simple, transparent pricing.",
	description = "Choose the plan that works for you.",
}: PricingProps) {
	const [isMonthly, setIsMonthly] = useState(true);
	const isDesktop = useMediaQuery("(min-width: 960px)");
	const switchRef = useRef<HTMLButtonElement>(null);

	const handleToggle = (checked: boolean) => {
		setIsMonthly(!checked);
		if (checked && switchRef.current) {
			const rect = switchRef.current.getBoundingClientRect();
			const x = rect.left + rect.width / 2;
			const y = rect.top + rect.height / 2;

			confetti({
				particleCount: 50,
				spread: 60,
				origin: {
					x: x / window.innerWidth,
					y: y / window.innerHeight,
				},
				colors: [
					"hsl(var(--primary))",
					"hsl(var(--accent))",
					"hsl(var(--secondary))",
					"hsl(var(--muted))",
				],
				ticks: 200,
				gravity: 1.2,
				decay: 0.94,
				startVelocity: 30,
				shapes: ["circle"],
			});
		}
	};

	return (
		<div className="py-16 md:py-24 px-4 md:px-6">
			<div className="text-center space-y-2 mb-6 max-w-2xl mx-auto">
				{/* Spec: display-md (24/600/-0.96px), sentence-case period-terminated. */}
				<h2 className="text-[24px] font-semibold leading-[32px] tracking-[-0.96px] text-ink">
					{title}
				</h2>
				<p className="text-body whitespace-pre-line">{description}</p>
			</div>

			<div className="flex justify-center items-center mb-10 gap-2">
				<label className="relative inline-flex items-center cursor-pointer">
					<Label>
						<Switch
							ref={switchRef as React.RefObject<HTMLButtonElement>}
							checked={!isMonthly}
							onCheckedChange={handleToggle}
							className="relative"
						/>
					</Label>
				</label>
				<span className="text-sm font-medium text-ink">
					Annual billing <span className="text-link">(Save 20%)</span>
				</span>
			</div>

			{/* Spec: pricing grid 3-up desktop → 1-up mobile. Removed broken sm:2 class. */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
				{plans.map((plan, index) => (
					<motion.div
						key={index}
						initial={{ y: 30, opacity: 0 }}
						whileInView={{ y: 0, opacity: 1 }}
						viewport={{ once: true }}
						transition={{
							duration: 0.5,
							delay: index * 0.1,
							ease: "easeOut",
						}}
						className={cn(
							// Spec: pricing-card — rounded-lg (12px), p-8 (32px), shadow-l4.
							"rounded-lg p-8 text-center flex flex-col relative",
							plan.isPopular
								? // Spec: pricing-card-featured — polarity-flipped (ink bg, white text).
									"bg-primary text-on-primary shadow-l4"
								: "bg-card text-ink shadow-l3",
						)}
					>
						{plan.isPopular && (
							<div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-link text-white py-0.5 px-3 rounded-full flex items-center">
								<Star className="h-3 w-3 fill-current" />
								<span className="ml-1 text-xs font-medium">Popular</span>
							</div>
						)}
						<div className="flex-1 flex flex-col">
							{/* Spec: caption-mono for tier name. */}
							<p className="text-xs font-mono uppercase tracking-wider mt-2 opacity-70">
								{plan.name}
							</p>
							<div className="mt-6 flex items-center justify-center gap-x-2">
								{/* Spec: display-xl (48/600/-2.4px) for price. */}
								<span className="text-[48px] font-semibold leading-[48px] tracking-[-2.4px]">
									<NumberFlow
										value={
											isMonthly ? Number(plan.price) : Number(plan.yearlyPrice)
										}
										format={{
											style: "currency",
											currency: "USD",
											minimumFractionDigits: 0,
											maximumFractionDigits: 0,
										}}
										transformTiming={{
											duration: 500,
											easing: "ease-out",
										}}
										willChange
										className="font-variant-numeric: tabular-nums"
									/>
								</span>
								{plan.period !== "Next 3 months" && (
									<span className="text-sm font-medium leading-6 tracking-wide opacity-60">
										/ {plan.period}
									</span>
								)}
							</div>

							<p className="text-xs leading-5 opacity-60">
								{isMonthly ? "billed monthly" : "billed annually"}
							</p>

							<ul className="mt-5 gap-2 flex flex-col">
								{plan.features.map((feature, idx) => (
									<li key={idx} className="flex items-start gap-2 text-left">
										<CheckIcon
											className={cn(
												"h-4 w-4 mt-1 shrink-0",
												plan.isPopular ? "text-on-primary" : "text-ink",
											)}
										/>
										<span className="text-sm">{feature}</span>
									</li>
								))}
							</ul>

							<hr
								className={cn(
									"w-full my-6 border-t",
									plan.isPopular ? "border-on-primary/20" : "border-hairline",
								)}
							/>

							{/* Spec: CTA on featured card = button-secondary-sm (white pill on dark).
							 * CTA on default card = button-primary-sm (ink pill on light). */}
							<Button
								onClick={async () => {
									await authClient.subscription.upgrade({
										plan: plan.name.toLowerCase(),
										successUrl: "/dashboard",
									});
								}}
								className={cn(
									"w-full",
									plan.isPopular
										? buttonVariants({ variant: "secondary", size: "pill-sm" })
										: buttonVariants({ variant: "default", size: "pill-sm" }),
								)}
							>
								{plan.buttonText}
							</Button>
							<p className="mt-6 text-xs leading-5 opacity-60">
								{plan.description}
							</p>
						</div>
					</motion.div>
				))}
			</div>
		</div>
	);
}
