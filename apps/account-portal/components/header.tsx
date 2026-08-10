import Link from "next/link";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";

// Spec: nav-bar — bg canvas, ink text, h-16, px-4 mobile / md:px-6 desktop.
// Layout: logo left, nav-link row centre, CTAs right.
const Header = () => {
	return (
		<header className="h-16 bg-canvas flex items-center justify-between fixed top-0 z-50 w-full px-4 md:px-6 shadow-l1">
			{/* Logo + wordmark */}
			<Link href="/" className="flex items-center gap-2 shrink-0">
				<Logo />
				<p className="select-none text-[20px] font-semibold leading-[28px] tracking-[-0.6px] text-ink">
					CinaAuth.
				</p>
			</Link>

			{/* Spec: nav-link row — centre, body-sm, body text, rounded-full.
			 * Hidden on mobile (tucked behind hamburger later). */}
			<nav
				aria-label="Primary"
				className="hidden md:flex items-center gap-1"
			>
				<NavLink href="/pricing">Pricing</NavLink>
				<NavLink href="https://www.cinagroup.com/docs">Docs</NavLink>
				<NavLink href="https://www.cinagroup.com/blog">Blog</NavLink>
			</nav>

			{/* Spec: nav CTA cluster — right.
			 * Mobile: theme toggle only. Desktop: full CTA row. */}
			<div className="flex items-center gap-2">
				<Link
					href="/sign-in"
					className="hidden md:inline-flex items-center justify-center h-7 px-2 text-sm font-medium rounded-sm text-ink bg-canvas shadow-inset-hairline hover:bg-canvas-soft transition-colors"
				>
					Log in
				</Link>
				<Button asChild size="sm" className="hidden md:inline-flex h-7">
					<Link href="/sign-up">Sign up</Link>
				</Button>
				<ThemeToggle />
			</div>
		</header>
	);
};

// Spec: nav-link — body text, body-sm, rounded-full, px-2 py-1.
const NavLink = ({
	href,
	children,
}: {
	href: string;
	children: React.ReactNode;
}) => (
	<Link
		href={href}
		className="px-2 py-1 text-sm text-body hover:text-ink rounded-full transition-colors"
	>
		{children}
	</Link>
);

export default Header;
