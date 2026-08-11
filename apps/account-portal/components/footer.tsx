import Link from "next/link";

// Spec: footer — bg canvas, text body, body-sm, py-16 px-6.
// Uses caption-mono uppercase mono for column eyebrows (per spec).
const Footer = () => {
	return (
		<footer className="bg-canvas text-body py-16 px-4 md:px-6">
			<div className="max-w-[1400px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
				<FooterColumn
					eyebrow="Product"
					links={[
						{ label: "Features", href: "https://www.cinagroup.com/docs" },
						{ label: "Pricing", href: "/pricing" },
						{ label: "Documentation", href: "https://www.cinagroup.com/docs" },
						{ label: "Changelog", href: "https://www.cinagroup.com/changelog" },
					]}
				/>
				<FooterColumn
					eyebrow="Company"
					links={[
						{ label: "About", href: "https://www.cinagroup.com/about" },
						{ label: "Blog", href: "https://www.cinagroup.com/blog" },
						{ label: "Careers", href: "https://www.cinagroup.com/careers" },
						{ label: "Contact", href: "https://www.cinagroup.com/contact" },
					]}
				/>
				<FooterColumn
					eyebrow="Resources"
					links={[
						{ label: "Community", href: "https://www.cinagroup.com/community" },
						{ label: "Support", href: "https://www.cinagroup.com/support" },
						{ label: "Status", href: "https://www.cinagroup.com/status" },
						{ label: "Security", href: "https://www.cinagroup.com/security" },
					]}
				/>
				<FooterColumn
					eyebrow="Legal"
					links={[
						{
							label: "Terms of Service",
							href: "https://www.cinagroup.com/terms",
						},
						{
							label: "Privacy Policy",
							href: "https://www.cinagroup.com/privacy",
						},
						{
							label: "Cookie Policy",
							href: "https://www.cinagroup.com/cookies",
						},
						{ label: "DPA", href: "https://www.cinagroup.com/dpa" },
					]}
				/>
			</div>
			<div className="max-w-[1400px] mx-auto mt-12 pt-6 border-t border-hairline flex flex-col md:flex-row justify-between items-center gap-4">
				<p className="text-sm text-mute">
					&copy; {new Date().getFullYear()} CinaSeek. A Cina Group service.
				</p>
				<p className="text-xs font-mono text-mute">accounts.cinaseek.ai</p>
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
			{/* Spec: caption-mono uppercase mono for column eyebrows. */}
			<h3 className="text-xs font-mono uppercase tracking-wider text-ink">
				{eyebrow}
			</h3>
			<ul className="flex flex-col gap-2">
				{links.map((link) => (
					<li key={link.label}>
						<Link
							href={link.href}
							className="text-sm text-body hover:text-ink transition-colors"
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
