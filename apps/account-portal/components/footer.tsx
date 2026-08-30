"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";

const Footer = () => {
	const { messages } = useI18n();

	return (
		<footer className="bg-canvas px-4 py-16 text-body md:px-6">
			<div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-8 md:grid-cols-4">
				<FooterColumn
					eyebrow={messages.footerProduct}
					links={[
						{
							label: messages.footerFeatures,
							href: "https://www.cinagroup.com/docs",
						},
						{ label: messages.navPricing, href: "/pricing" },
						{
							label: messages.footerDocumentation,
							href: "https://www.cinagroup.com/docs",
						},
						{
							label: messages.footerChangelog,
							href: "https://www.cinagroup.com/changelog",
						},
					]}
				/>
				<FooterColumn
					eyebrow={messages.footerCompany}
					links={[
						{
							label: messages.footerAbout,
							href: "https://www.cinagroup.com/about",
						},
						{
							label: messages.navBlog,
							href: "https://www.cinagroup.com/blog",
						},
						{
							label: messages.footerCareers,
							href: "https://www.cinagroup.com/careers",
						},
						{
							label: messages.footerContact,
							href: "https://www.cinagroup.com/contact",
						},
					]}
				/>
				<FooterColumn
					eyebrow={messages.footerResources}
					links={[
						{
							label: messages.footerCommunity,
							href: "https://www.cinagroup.com/community",
						},
						{
							label: messages.footerSupport,
							href: "https://www.cinagroup.com/support",
						},
						{
							label: messages.footerStatus,
							href: "https://www.cinagroup.com/status",
						},
						{
							label: messages.footerSecurity,
							href: "https://www.cinagroup.com/security",
						},
					]}
				/>
				<FooterColumn
					eyebrow={messages.footerLegal}
					links={[
						{
							label: messages.footerTerms,
							href: "https://www.cinagroup.com/terms",
						},
						{
							label: messages.footerPrivacy,
							href: "https://www.cinagroup.com/privacy",
						},
						{
							label: messages.footerCookies,
							href: "https://www.cinagroup.com/cookies",
						},
						{ label: "DPA", href: "https://www.cinagroup.com/dpa" },
					]}
				/>
			</div>
			<div className="mx-auto mt-12 flex max-w-[1400px] flex-col items-center justify-between gap-4 border-t border-hairline pt-6 md:flex-row">
				<p className="text-sm text-mute">
					&copy; {new Date().getFullYear()} CinaSeek. {messages.footerService}
				</p>
				<p className="font-mono text-xs text-mute">accounts.cinaseek.ai</p>
			</div>
		</footer>
	);
};

const FooterColumn = ({
	eyebrow,
	links,
}: {
	eyebrow: string;
	links: { label: string; href: string }[];
}) => {
	return (
		<div className="flex flex-col gap-3">
			<h3 className="font-mono text-xs tracking-wider text-ink uppercase">
				{eyebrow}
			</h3>
			<ul className="flex flex-col gap-2">
				{links.map((link) => (
					<li key={link.label}>
						<Link
							href={link.href}
							className="text-sm text-body transition-colors hover:text-ink"
						>
							{link.label}
						</Link>
					</li>
				))}
			</ul>
		</div>
	);
};

export default Footer;
