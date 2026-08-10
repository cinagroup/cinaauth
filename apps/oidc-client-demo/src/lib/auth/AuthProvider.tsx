import * as oauth from "oauth4webapi";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OidcClientConfig } from "./config";
import type { AuthContextType, AuthStatus } from "./context";
import { AuthContext } from "./context";
import type { OidcSession } from "./storage";
import {
	clearOidcSession,
	loadOidcSession,
	saveAuthorizationTransaction,
	saveOidcSession,
	takeAuthorizationTransaction,
} from "./storage";

type AuthProviderProps = {
	config: OidcClientConfig;
	children: React.ReactNode;
};

const getSafeErrorMessage = (error: unknown) => {
	if (error instanceof oauth.AuthorizationResponseError) {
		return error.error_description || `Authorization failed: ${error.error}`;
	}
	if (error instanceof oauth.ResponseBodyError) {
		return error.error_description || `Token request failed: ${error.error}`;
	}
	if (error instanceof oauth.WWWAuthenticateChallengeError) {
		return "The authorization server rejected the client request.";
	}
	if (error instanceof Error) return error.message;
	return "The OpenID Connect request failed.";
};

export const AuthProvider = ({ children, config }: AuthProviderProps) => {
	const client = useMemo<oauth.Client>(
		() => ({
			client_id: config.clientId,
			token_endpoint_auth_method: "none",
			redirect_uris: [config.redirectUri],
		}),
		[config.clientId, config.redirectUri],
	);
	const [authorizationServer, setAuthorizationServer] =
		useState<oauth.AuthorizationServer>();
	const [session, setSession] = useState<OidcSession | undefined>(() =>
		loadOidcSession(sessionStorage, config),
	);
	const [status, setStatus] = useState<AuthStatus>(
		session ? "authenticated" : "discovering",
	);
	const [error, setError] = useState<string>();
	const [discoveryAttempt, setDiscoveryAttempt] = useState(0);
	const callbackStarted = useRef(false);

	useEffect(() => {
		const issuer = new URL(config.issuer);
		let cancelled = false;
		setError(undefined);
		if (!session) setStatus("discovering");

		void oauth
			.discoveryRequest(issuer, { algorithm: "oidc" })
			.then((response) => oauth.processDiscoveryResponse(issuer, response))
			.then((metadata) => {
				if (cancelled) return;
				if (!metadata.authorization_endpoint || !metadata.token_endpoint) {
					throw new Error("OIDC Discovery is missing required endpoints");
				}
				if (!metadata.token_endpoint_auth_methods_supported?.includes("none")) {
					throw new Error(
						"The issuer does not advertise public client support",
					);
				}
				setAuthorizationServer(metadata);
				setStatus(session ? "authenticated" : "ready");
			})
			.catch((cause: unknown) => {
				if (cancelled) return;
				setError(getSafeErrorMessage(cause));
				setStatus("error");
			});

		return () => {
			cancelled = true;
		};
	}, [config, discoveryAttempt, session]);

	const login = useCallback(async () => {
		if (!authorizationServer?.authorization_endpoint) {
			setError("OIDC Discovery has not completed yet.");
			return;
		}
		const codeVerifier = oauth.generateRandomCodeVerifier();
		const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier);
		const state = oauth.generateRandomState();
		const nonce = oauth.generateRandomNonce();
		const authorizationUrl = new URL(
			authorizationServer.authorization_endpoint,
		);
		authorizationUrl.searchParams.set("client_id", client.client_id);
		authorizationUrl.searchParams.set("redirect_uri", config.redirectUri);
		authorizationUrl.searchParams.set("response_type", "code");
		authorizationUrl.searchParams.set("scope", config.scope);
		authorizationUrl.searchParams.set("code_challenge", codeChallenge);
		authorizationUrl.searchParams.set("code_challenge_method", "S256");
		authorizationUrl.searchParams.set("state", state);
		authorizationUrl.searchParams.set("nonce", nonce);

		saveAuthorizationTransaction(sessionStorage, {
			codeVerifier,
			state,
			nonce,
			redirectUri: config.redirectUri,
			createdAt: Date.now(),
		});
		setStatus("authenticating");
		window.location.assign(authorizationUrl);
	}, [authorizationServer, client, config]);

	useEffect(() => {
		if (
			!authorizationServer ||
			callbackStarted.current ||
			window.location.pathname !== new URL(config.redirectUri).pathname
		) {
			return;
		}
		callbackStarted.current = true;
		setStatus("authenticating");

		void (async () => {
			const transaction = takeAuthorizationTransaction(sessionStorage);
			if (!transaction || transaction.redirectUri !== config.redirectUri) {
				throw new Error("The authorization transaction is missing or expired.");
			}
			const parameters = oauth.validateAuthResponse(
				authorizationServer,
				client,
				new URL(window.location.href),
				transaction.state,
			);
			const tokenResponse = await oauth.authorizationCodeGrantRequest(
				authorizationServer,
				client,
				oauth.None(),
				parameters,
				transaction.redirectUri,
				transaction.codeVerifier,
			);
			const tokens = await oauth.processAuthorizationCodeResponse(
				authorizationServer,
				client,
				tokenResponse,
				{ expectedNonce: transaction.nonce, requireIdToken: true },
			);
			const claims = oauth.getValidatedIdTokenClaims(tokens);
			if (!claims?.sub || !tokens.id_token) {
				throw new Error("The validated ID token is missing required claims.");
			}
			const userInfoResponse = await oauth.userInfoRequest(
				authorizationServer,
				client,
				tokens.access_token,
			);
			const user = await oauth.processUserInfoResponse(
				authorizationServer,
				client,
				claims.sub,
				userInfoResponse,
			);
			const nextSession: OidcSession = {
				accessToken: tokens.access_token,
				idToken: tokens.id_token,
				tokenType: tokens.token_type,
				expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000,
				issuer: config.issuer,
				clientId: config.clientId,
				user,
			};
			saveOidcSession(sessionStorage, nextSession);
			setSession(nextSession);
			setError(undefined);
			setStatus("authenticated");
			window.location.replace("/dashboard");
		})().catch((cause: unknown) => {
			clearOidcSession(sessionStorage);
			setSession(undefined);
			setError(getSafeErrorMessage(cause));
			setStatus("error");
		});
	}, [authorizationServer, client, config]);

	const logout = useCallback(() => {
		const endSessionEndpoint = authorizationServer?.end_session_endpoint;
		const idToken = session?.idToken;
		clearOidcSession(sessionStorage);
		setSession(undefined);
		setStatus("ready");
		if (endSessionEndpoint && idToken) {
			const endSessionUrl = new URL(endSessionEndpoint);
			endSessionUrl.searchParams.set("id_token_hint", idToken);
			endSessionUrl.searchParams.set(
				"post_logout_redirect_uri",
				config.postLogoutRedirectUri,
			);
			window.location.assign(endSessionUrl);
			return;
		}
		window.location.assign(config.postLogoutRedirectUri);
	}, [authorizationServer, config.postLogoutRedirectUri, session]);

	const value = useMemo<AuthContextType>(
		() => ({
			config,
			authorizationServer,
			client,
			session,
			status,
			error,
			login,
			logout,
			retryDiscovery: () => setDiscoveryAttempt((attempt) => attempt + 1),
		}),
		[
			authorizationServer,
			client,
			config,
			error,
			login,
			logout,
			session,
			status,
		],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
