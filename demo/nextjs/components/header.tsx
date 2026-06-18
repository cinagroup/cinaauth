import Link from "next/link";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

const Header = () => {
	return (
		<header className="h-16 bg-background/80 backdrop-blur-md border-b flex justify-between items-center border-border fixed top-0 z-50 w-full px-6">
			<Link href="/">
				<div className="flex items-center gap-2">
					<Logo />
					<p className="select-none font-semibold tracking-tight">CINAAUTH.</p>
				</div>
			</Link>

			<ThemeToggle />
		</header>
	);
};

export default Header;
