"use client";

import Script from "next/script";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthCapabilities } from "@/hooks/use-auth-capabilities";
import { getCaptchaRequestHeaders } from "@/lib/auth-capabilities";

type TurnstileRenderOptions = {
	sitekey: string;
	action: string;
	theme: "auto";
	size: "flexible";
	callback: (token: string) => void;
	"error-callback": () => void;
	"expired-callback": () => void;
	"timeout-callback": () => void;
};

type TurnstileApi = {
	render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
	remove: (widgetId: string) => void;
};

declare global {
	interface Window {
		turnstile?: TurnstileApi;
	}
}

export type TurnstileChallengeState = {
	enabled: boolean;
	canSubmit: boolean;
	headers: { "x-captcha-response": string } | undefined;
	resetKey: number;
	siteKey: string | null;
	action: string | null;
	setToken: Dispatch<SetStateAction<string | null>>;
	reset: () => void;
};

export const useTurnstileChallenge = (): TurnstileChallengeState => {
	const capabilities = useAuthCapabilities();
	const [token, setToken] = useState<string | null>(null);
	const [resetKey, setResetKey] = useState(0);
	const captcha = capabilities.data?.captcha;
	const enabled = captcha?.enabled === true;
	const siteKey = enabled ? captcha.siteKey : null;
	const action = enabled ? captcha.action : null;

	useEffect(() => {
		setToken(null);
	}, [siteKey, action]);

	const reset = useCallback(() => {
		setToken(null);
		setResetKey((value) => value + 1);
	}, []);

	return {
		enabled,
		canSubmit:
			!capabilities.isPending &&
			(!enabled || Boolean(siteKey && action && token)),
		headers: getCaptchaRequestHeaders(token),
		resetKey,
		siteKey,
		action,
		setToken,
		reset,
	};
};

export function TurnstileChallenge({
	challenge,
}: {
	challenge: TurnstileChallengeState;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [scriptReady, setScriptReady] = useState(false);
	const [scriptFailed, setScriptFailed] = useState(false);

	useEffect(() => {
		if (
			!challenge.enabled ||
			!challenge.siteKey ||
			!challenge.action ||
			!scriptReady ||
			!containerRef.current ||
			!window.turnstile
		) {
			return;
		}

		challenge.setToken(null);
		const widgetId = window.turnstile.render(containerRef.current, {
			sitekey: challenge.siteKey,
			action: challenge.action,
			theme: "auto",
			size: "flexible",
			callback: (token) => challenge.setToken(token),
			"error-callback": () => challenge.setToken(null),
			"expired-callback": () => challenge.setToken(null),
			"timeout-callback": () => challenge.setToken(null),
		});

		return () => {
			window.turnstile?.remove(widgetId);
		};
	}, [
		challenge.action,
		challenge.enabled,
		challenge.resetKey,
		challenge.setToken,
		challenge.siteKey,
		scriptReady,
	]);

	if (!challenge.enabled) return null;

	return (
		<div className="grid gap-2">
			<Script
				id="cloudflare-turnstile"
				src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
				strategy="afterInteractive"
				onReady={() => {
					setScriptFailed(false);
					setScriptReady(true);
				}}
				onError={() => {
					setScriptFailed(true);
					setScriptReady(false);
					challenge.setToken(null);
				}}
			/>
			<div ref={containerRef} className="min-h-16 w-full" />
			<p className="text-xs text-muted-foreground" aria-live="polite">
				{scriptFailed
					? "Human verification could not load. Refresh the page and try again."
					: "Complete the human verification before continuing."}
			</p>
		</div>
	);
}
