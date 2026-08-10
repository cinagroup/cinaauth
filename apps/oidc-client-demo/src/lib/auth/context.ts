import type { AuthorizationServer, Client } from "oauth4webapi";
import { createContext } from "react";
import type { OidcClientConfig } from "./config";
import type { OidcSession } from "./storage";

export type AuthStatus =
	| "discovering"
	| "ready"
	| "authenticating"
	| "authenticated"
	| "error";

export type AuthContextType = {
	config: OidcClientConfig;
	authorizationServer?: AuthorizationServer;
	client: Client;
	session?: OidcSession;
	status: AuthStatus;
	error?: string;
	login: () => Promise<void>;
	logout: () => void;
	retryDiscovery: () => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(
	undefined,
);
