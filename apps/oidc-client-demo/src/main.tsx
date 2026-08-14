import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { loadOidcClientConfig } from "./lib/auth/config";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("OIDC application root is missing");
const root = createRoot(rootElement);

const renderConfigurationError = () => {
	root.render(
		<main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
			<section className="max-w-lg rounded-xl border bg-card p-6 shadow-sm">
				<h1 className="text-xl font-semibold">
					OIDC configuration unavailable
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					This deployment does not have a valid authentication profile. No
					sign-in request was started.
				</p>
			</section>
		</main>,
	);
};

void loadOidcClientConfig()
	.then((config) => {
		root.render(
			<StrictMode>
				<App config={config} />
			</StrictMode>,
		);
	})
	.catch(renderConfigurationError);
