import Link from "next/link";
import { Button } from "./ui/button";

type Props = {
	authenticated: boolean;
	signInLabel: string;
	dashboardLabel: string;
};

const EntryButton = ({ authenticated, signInLabel, dashboardLabel }: Props) => {
	return authenticated ? (
		<DashboardButton label={dashboardLabel} />
	) : (
		<SignInButton label={signInLabel} />
	);
};

export default EntryButton;

const SignInButton = ({ label }: { label: string }) => {
	return (
		<Button className="gap-2" variant="default" size="pill" asChild>
			<Link href="/sign-in">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="1.1em"
					height="1.1em"
					viewBox="0 0 24 24"
				>
					<path
						fill="currentColor"
						d="M5 3H3v4h2V5h14v14H5v-2H3v4h18V3zm12 8h-2V9h-2V7h-2v2h2v2H3v2h10v2h-2v2h2v-2h2v-2h2z"
					/>
				</svg>
				<span>{label}</span>
			</Link>
		</Button>
	);
};

const DashboardButton = ({ label }: { label: string }) => {
	return (
		<Button className="gap-2" variant="default" size="pill" asChild>
			<Link href="/dashboard">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="1.1em"
					height="1.1em"
					viewBox="0 0 24 24"
				>
					<path fill="currentColor" d="M2 3h20v18H2zm18 16V7H4v12z" />
				</svg>
				<span>{label}</span>
			</Link>
		</Button>
	);
};
