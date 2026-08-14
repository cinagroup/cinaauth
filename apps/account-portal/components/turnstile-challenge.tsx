"use client";

import Script from "next/script";
import { useTheme } from "next-themes";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthCapabilities } from "@/hooks/use-auth-capabilities";
import { getCaptchaRequestHeaders } from "@/lib/auth-capabilities";

type TurnstileRenderOptions = {
	sitekey: string;
	action: string;
	theme: "auto" | "light" | "dark";
	size: "compact" | "flexible";
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

type TurnstileSubmissionReadiness = {
	hasCapabilities: boolean;
	hasCapabilityError: boolean;
	enabled: boolean;
	siteKey: string | null;
	action: string | null;
	token: string | null;
};

/** Cloudflare's flexible widget requires at least 300 CSS pixels. */
export const getTurnstileSize = (containerWidth: number) =>
	containerWidth < 300 ? ("compact" as const) : ("flexible" as const);

/** Mirrors the resolved application theme and falls back during hydration. */
export const getTurnstileTheme = (resolvedTheme: string | undefined) =>
	resolvedTheme === "light" || resolvedTheme === "dark"
		? resolvedTheme
		: ("auto" as const);

/** Never enables submission from an absent or failed capability snapshot. */
export const isTurnstileSubmissionReady = ({
	hasCapabilities,
	hasCapabilityError,
	enabled,
	siteKey,
	action,
	token,
}: TurnstileSubmissionReadiness) =>
	hasCapabilities &&
	!hasCapabilityError &&
	(!enabled || Boolean(siteKey && action && token));

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
		canSubmit: isTurnstileSubmissionReady({
			hasCapabilities: capabilities.data !== undefined,
			hasCapabilityError: capabilities.isError,
			enabled,
			siteKey,
			action,
			token,
		}),
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
	const { resolvedTheme } = useTheme();
	const containerRef = useRef<HTMLDivElement>(null);
	const [scriptReady, setScriptReady] = useState(false);
	const [scriptFailed, setScriptFailed] = useState(false);
	const [widgetSize, setWidgetSize] = useState<"compact" | "flexible">();
	const turnstileTheme = getTurnstileTheme(resolvedTheme);

	useEffect(() => {
		const container = containerRef.current;
		if (!challenge.enabled || !container) return;

		const updateSize = () => {
			const nextSize = getTurnstileSize(container.clientWidth);
			setWidgetSize((currentSize) =>
				currentSize === nextSize ? currentSize : nextSize,
			);
		};
		updateSize();
		const observer = new ResizeObserver(updateSize);
		observer.observe(container);
		return () => observer.disconnect();
	}, [challenge.enabled]);

	useEffect(() => {
		const container = containerRef.current;
		if (
			!challenge.enabled ||
			!challenge.siteKey ||
			!challenge.action ||
			!scriptReady ||
			!widgetSize ||
			!container ||
			!window.turnstile
		) {
			return;
		}

		challenge.setToken(null);
		const widgetId = window.turnstile.render(container, {
			sitekey: challenge.siteKey,
			action: challenge.action,
			theme: turnstileTheme,
			size: widgetSize,
			callback: (token) => challenge.setToken(token),
			"error-callback": () => {
				setScriptFailed(true);
				setScriptReady(false);
				challenge.setToken(null);
			},
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
		turnstileTheme,
		widgetSize,
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
			<div
				ref={containerRef}
				className={scriptFailed ? "hidden" : "min-h-16 w-full"}
			/>
			<p
				className="text-xs text-body"
				role={scriptFailed ? "alert" : "status"}
				aria-live={scriptFailed ? "assertive" : "polite"}
			>
				{scriptFailed
					? "Human verification could not load. Refresh the page and try again."
					: "Complete the human verification before continuing."}
			</p>
		</div>
	);
}
