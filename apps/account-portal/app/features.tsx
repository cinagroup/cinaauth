"use client";

import { AnimatePresence, motion } from "framer-motion";
import React from "react";
import { Logo } from "@/components/logo";

export function Features() {
	return (
		<>
			<div className="flex flex-col lg:flex-row bg-canvas dark:bg-ink w-full gap-4 mx-auto px-8">
				<Card title="CinaAuth" icon={<Logo className="w-44" />}></Card>
			</div>
		</>
	);
}

const Card = ({
	title,
	icon,
	children,
}: {
	title: string;
	icon: React.ReactNode;
	children?: React.ReactNode;
}) => {
	const [hovered, setHovered] = React.useState(false);
	return (
		<div
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			// Spec: card-marketing — rounded-md, shadow-l2, canvas bg, hairline border.
			className="border border-hairline group/canvas-card flex items-center justify-center dark:border-hairline-strong max-w-sm w-full mx-auto p-4 relative h-72 rounded-md bg-canvas shadow-l2"
		>
			<Icon className="absolute h-6 w-6 -top-3 -left-3 text-ink" />
			<Icon className="absolute h-6 w-6 -bottom-3 -left-3 text-ink" />
			<Icon className="absolute h-6 w-6 -top-3 -right-3 text-ink" />
			<Icon className="absolute h-6 w-6 -bottom-3 -right-3 text-ink" />

			<AnimatePresence>
				{hovered && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="h-full w-full absolute inset-0"
					>
						{children}
					</motion.div>
				)}
			</AnimatePresence>

			<div className="relative z-20">
				<div className="text-center group-hover/canvas-card:-translate-y-4 group-hover/canvas-card:opacity-0 transition duration-200 w-full mx-auto flex items-center justify-center">
					{icon}
				</div>
				{/* Spec: display-sm (20/600/-0.6px). */}
				<h2 className="text-[20px] font-semibold leading-[28px] tracking-[-0.6px] opacity-0 group-hover/canvas-card:opacity-100 relative z-10 mt-4 text-ink group-hover/canvas-card:text-on-primary group-hover/canvas-card:-translate-y-2 transition duration-200">
					{title}
				</h2>
			</div>
		</div>
	);
};

export const Icon = ({
	className,
	...rest
}: React.SVGProps<SVGSVGElement>) => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth="1.5"
			stroke="currentColor"
			className={className}
			{...rest}
		>
			<path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
		</svg>
	);
};
