import { ShieldCheck } from "lucide-react";
import { Toaster } from "sonner";
import { Route, Router, Switch } from "wouter";
import { Logo } from "@/components/logo";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { getOidcClientConfig } from "@/lib/auth/config";
import { Callback } from "@/pages/Callback";
import { Dashboard } from "@/pages/Dashboard";
import { Home } from "@/pages/Home";

const config = getOidcClientConfig();

function App() {
	return (
		<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
			<AuthProvider config={config}>
				<div className="min-h-screen bg-background text-foreground">
					<header className="border-b bg-background/90 backdrop-blur">
						<div className="container mx-auto flex h-16 items-center justify-between px-5">
							<a className="flex items-center gap-3" href="/">
								<span className="grid size-10 place-items-center overflow-hidden rounded-xl border bg-white shadow-sm">
									<Logo className="size-full object-cover" />
								</span>
								<span>
									<span className="block text-sm font-semibold leading-none">
										CinaSeek
									</span>
									<span className="text-xs text-muted-foreground">
										OIDC Lab
									</span>
								</span>
							</a>
							<div className="flex items-center gap-2">
								<span className="hidden items-center gap-1.5 rounded-full border px-3 py-1 text-xs text-muted-foreground sm:flex">
									<ShieldCheck className="size-3.5 text-emerald-500" />
									Public client · PKCE S256
								</span>
								<ThemeToggle />
							</div>
						</div>
					</header>

					<Router>
						<Switch>
							<Route path="/" component={Home} />
							<Route path="/callback" component={Callback} />
							<Route path="/dashboard" component={Dashboard} />
							<Route component={Home} />
						</Switch>
					</Router>
					<Toaster richColors closeButton />
				</div>
			</AuthProvider>
		</ThemeProvider>
	);
}

export default App;
