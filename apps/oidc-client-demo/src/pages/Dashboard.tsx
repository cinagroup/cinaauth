import {
	CheckCircle2,
	Clock3,
	Fingerprint,
	LogOut,
	Shield,
} from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/lib/auth/useAuth";

const readClaim = (value: unknown) =>
	typeof value === "string" ? value : undefined;

export function Dashboard() {
	const { session, logout, status, authorizationServer } = useAuth();
	const [, setLocation] = useLocation();

	useEffect(() => {
		if (status !== "discovering" && !session) setLocation("/");
	}, [session, setLocation, status]);

	if (!session) return null;
	const name =
		readClaim(session.user.name) || readClaim(session.user.email) || "User";
	const email = readClaim(session.user.email);
	const picture = readClaim(session.user.picture);
	const subject = readClaim(session.user.sub);
	const initials = name
		.split(" ")
		.map((part) => part.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2);
	const signingAlgorithms =
		authorizationServer?.id_token_signing_alg_values_supported?.join(", ") ||
		"Validated from Discovery";

	return (
		<main className="mx-auto min-h-[calc(100vh-4rem)] max-w-5xl px-5 py-10 sm:py-14">
			<div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
				<div>
					<div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
						<CheckCircle2 className="size-3.5" />
						OIDC session verified
					</div>
					<h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
						Acceptance dashboard
					</h1>
					<p className="mt-2 text-muted-foreground">
						The complete production authorization flow finished successfully.
					</p>
				</div>
				<Button onClick={logout} variant="outline" className="rounded-xl">
					<LogOut className="mr-2 size-4" />
					Sign out at issuer
				</Button>
			</div>

			<div className="mt-8 grid gap-5 lg:grid-cols-[1fr_1.25fr]">
				<Card className="rounded-2xl">
					<CardHeader>
						<CardTitle>Verified identity</CardTitle>
						<CardDescription>
							Claims returned by the UserInfo endpoint
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex items-center gap-4">
							<Avatar className="size-14">
								<AvatarImage src={picture} alt="" />
								<AvatarFallback>{initials}</AvatarFallback>
							</Avatar>
							<div className="min-w-0">
								<p className="truncate font-medium">{name}</p>
								{email ? (
									<p className="truncate text-sm text-muted-foreground">
										{email}
									</p>
								) : null}
							</div>
						</div>
						<div className="mt-6 rounded-xl border bg-muted/40 p-4">
							<div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
								<Fingerprint className="size-4" /> Subject
							</div>
							<p className="mt-2 break-all font-mono text-xs">
								{subject || "Unavailable"}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card className="rounded-2xl">
					<CardHeader>
						<CardTitle>Protocol evidence</CardTitle>
						<CardDescription>
							No bearer token value is rendered or logged.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-3 sm:grid-cols-2">
						<div className="rounded-xl border p-4">
							<Shield className="size-4 text-emerald-500" />
							<p className="mt-3 text-sm font-medium">ID token signature</p>
							<p className="mt-1 text-xs text-muted-foreground">
								{signingAlgorithms}
							</p>
						</div>
						<div className="rounded-xl border p-4">
							<Clock3 className="size-4 text-emerald-500" />
							<p className="mt-3 text-sm font-medium">Access token expiry</p>
							<p className="mt-1 text-xs text-muted-foreground">
								{new Date(session.expiresAt).toLocaleString()}
							</p>
						</div>
						<div className="rounded-xl border p-4">
							<p className="text-xs uppercase tracking-wider text-muted-foreground">
								Client auth
							</p>
							<p className="mt-2 font-mono text-sm">none (public client)</p>
						</div>
						<div className="rounded-xl border p-4">
							<p className="text-xs uppercase tracking-wider text-muted-foreground">
								Token type
							</p>
							<p className="mt-2 font-mono text-sm uppercase">
								{session.tokenType}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card className="mt-5 rounded-2xl">
				<CardHeader>
					<CardTitle>Validated UserInfo claims</CardTitle>
					<CardDescription>
						The response subject was matched to the signed ID token before
						display.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<pre className="max-h-80 overflow-auto rounded-xl bg-muted p-4 text-xs leading-6">
						{JSON.stringify(session.user, null, 2)}
					</pre>
				</CardContent>
			</Card>
		</main>
	);
}
