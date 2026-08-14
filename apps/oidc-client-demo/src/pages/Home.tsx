import { ArrowRight, Check, CircleAlert, LoaderCircle } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/useAuth";

const standards = [
	["Discovery", "Provider metadata is resolved and validated at runtime."],
	["Authorization Code", "No token is returned through the browser URL."],
	["PKCE S256", "A fresh verifier protects every authorization transaction."],
	[
		"OIDC validation",
		"State, nonce, issuer, signature and subject are checked.",
	],
] as const;

export function Home() {
	const {
		login,
		session,
		status,
		error,
		retryDiscovery,
		config,
		authorizationServer,
	} = useAuth();
	const [, setLocation] = useLocation();
	const isBusy = status === "discovering" || status === "authenticating";

	return (
		<main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-12 px-5 py-14 lg:grid-cols-[1.1fr_.9fr] lg:py-20">
			<section>
				<div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium">
					<span className="size-1.5 rounded-full bg-emerald-500" />
					Online acceptance client
				</div>
				<h1 className="max-w-3xl text-balance text-5xl font-semibold tracking-[-0.05em] sm:text-6xl">
					One click through the complete CinaSeek OIDC flow.
				</h1>
				<p className="mt-6 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
					This first-party public client proves Discovery, Authorization Code +
					PKCE, ES256 ID token validation, UserInfo and RP-initiated logout
					against the configured issuer.
				</p>

				{error ? (
					<div className="mt-7 max-w-xl rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
						<div className="flex gap-3">
							<CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
							<div>
								<p className="font-medium">OIDC readiness check failed</p>
								<p className="mt-1 text-sm text-muted-foreground">{error}</p>
								<Button
									className="mt-3"
									variant="outline"
									onClick={retryDiscovery}
								>
									Retry Discovery
								</Button>
							</div>
						</div>
					</div>
				) : null}

				<div className="mt-8 flex flex-wrap items-center gap-3">
					<Button
						size="lg"
						disabled={isBusy || status === "error"}
						onClick={() => (session ? setLocation("/dashboard") : void login())}
						className="min-w-56 rounded-xl"
					>
						{isBusy ? (
							<LoaderCircle className="mr-2 size-4 animate-spin" />
						) : null}
						{session ? "Open verified session" : "Sign in with CinaSeek"}
						{!isBusy ? <ArrowRight className="ml-2 size-4" /> : null}
					</Button>
					<a
						className="text-sm text-muted-foreground underline-offset-4 hover:underline"
						href={`${config.issuer}/.well-known/openid-configuration`}
						target="_blank"
						rel="noreferrer"
					>
						Inspect Discovery
					</a>
				</div>
			</section>

			<section className="rounded-3xl border bg-card p-3 shadow-2xl shadow-black/5">
				<div className="rounded-2xl border bg-background p-6 sm:p-8">
					<div className="flex items-center justify-between border-b pb-5">
						<div>
							<p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
								Protocol readiness
							</p>
							<p className="mt-2 font-mono text-sm">{config.clientId}</p>
						</div>
						<span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
							{authorizationServer ? "Ready" : "Checking"}
						</span>
					</div>
					<div className="divide-y">
						{standards.map(([name, description]) => (
							<div className="flex gap-3 py-4" key={name}>
								<span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
									<Check className="size-3" />
								</span>
								<div>
									<p className="text-sm font-medium">{name}</p>
									<p className="mt-1 text-xs leading-5 text-muted-foreground">
										{description}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>
		</main>
	);
}
