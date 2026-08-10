import { CircleAlert, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/useAuth";

export function Callback() {
	const { error, retryDiscovery } = useAuth();
	return (
		<main className="grid min-h-[calc(100vh-4rem)] place-items-center px-5">
			<div className="w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-xl shadow-black/5">
				{error ? (
					<>
						<CircleAlert className="mx-auto size-9 text-destructive" />
						<h1 className="mt-5 text-xl font-semibold">
							Sign-in could not finish
						</h1>
						<p className="mt-2 text-sm leading-6 text-muted-foreground">
							{error}
						</p>
						<div className="mt-6 flex justify-center gap-3">
							<Button variant="outline" onClick={retryDiscovery}>
								Retry
							</Button>
							<Button onClick={() => window.location.assign("/")}>
								Return home
							</Button>
						</div>
					</>
				) : (
					<>
						<LoaderCircle className="mx-auto size-9 animate-spin" />
						<h1 className="mt-5 text-xl font-semibold">
							Validating OIDC response
						</h1>
						<p className="mt-2 text-sm text-muted-foreground">
							Checking state, PKCE, nonce, signature and UserInfo subject.
						</p>
					</>
				)}
			</div>
		</main>
	);
}
