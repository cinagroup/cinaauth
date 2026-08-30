"use client";

import Link from "next/link";
import { AccountBrand } from "./account-brand";
import { useI18n } from "./i18n-provider";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";

// Marketing-only chrome. The Accounts homepage owns a focused product shell.
const Header = () => {
	const { messages } = useI18n();

	return (
		<header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between bg-canvas px-4 shadow-l1 md:px-6">
			<Link href="/" className="flex shrink-0 items-center gap-2">
				<AccountBrand tagline={messages.accountTagline} priority />
			</Link>

			<nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
				<NavLink href="/pricing">{messages.navPricing}</NavLink>
				<NavLink href="https://www.cinagroup.com/docs">
					{messages.navDocs}
				</NavLink>
				<NavLink href="https://www.cinagroup.com/blog">
					{messages.navBlog}
				</NavLink>
			</nav>

			<div className="flex items-center gap-2">
				<Link
					href="/sign-in"
					className="hidden h-7 items-center justify-center rounded-sm bg-canvas px-2 text-sm font-medium text-ink shadow-inset-hairline transition-colors hover:bg-canvas-soft md:inline-flex"
				>
					{messages.logIn}
				</Link>
				<Button asChild size="sm" className="hidden h-7 md:inline-flex">
					<Link href="/sign-in">{messages.getStarted}</Link>
				</Button>
				<LanguageSwitcher className="hidden sm:flex" />
				<ThemeToggle label={messages.themeToggle} />
			</div>
		</header>
	);
};

const NavLink = ({
	href,
	children,
}: {
	href: string;
	children: React.ReactNode;
}) => (
	<Link
		href={href}
		className="rounded-full px-2 py-1 text-sm text-body transition-colors hover:text-ink"
	>
		{children}
	</Link>
);

export default Header;
