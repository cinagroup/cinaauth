(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
	"object" == typeof document ? document.currentScript : void 0,
	35954,
	(e) => {
		"use strict";
		var l = e.i(62613),
			t = e.i(78592),
			s = e.i(88642),
			i = e.i(76706),
			n = e.i(49696);
		function r() {
			return (0, l.jsxs)("div", {
				className: "flex flex-col gap-3",
				children: [
					(0, l.jsx)(t.default, {
						href: "/sign-up/email",
						children: (0, l.jsxs)(s.Button, {
							variant: "outline",
							className: (0, n.cn)("w-full gap-2 flex relative justify-center"),
							children: [
								(0, l.jsxs)("svg", {
									xmlns: "http://www.w3.org/2000/svg",
									width: "1em",
									height: "1em",
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "currentColor",
									strokeWidth: "2",
									children: [
										(0, l.jsx)("path", {
											d: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z",
										}),
										(0, l.jsx)("polyline", { points: "22,6 12,13 2,6" }),
									],
								}),
								(0, l.jsx)("span", { children: "Continue with Email" }),
							],
						}),
					}),
					(0, l.jsxs)("div", {
						className: "relative flex items-center my-2",
						children: [
							(0, l.jsx)("div", {
								className: "flex-grow border-t border-border",
							}),
							(0, l.jsx)("span", {
								className: "flex-shrink mx-4 text-xs text-muted-foreground",
								children: "or",
							}),
							(0, l.jsx)("div", {
								className: "flex-grow border-t border-border",
							}),
						],
					}),
					(0, l.jsxs)(s.Button, {
						variant: "outline",
						className: (0, n.cn)("w-full gap-2 flex relative justify-center"),
						onClick: async () => {
							await i.authClient.signIn.social({
								provider: "google",
								callbackURL: "/dashboard",
							});
						},
						children: [
							(0, l.jsxs)("svg", {
								xmlns: "http://www.w3.org/2000/svg",
								width: "1em",
								height: "1em",
								viewBox: "0 0 256 262",
								children: [
									(0, l.jsx)("path", {
										fill: "#4285F4",
										d: "M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027",
									}),
									(0, l.jsx)("path", {
										fill: "#34A853",
										d: "M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1",
									}),
									(0, l.jsx)("path", {
										fill: "#FBBC05",
										d: "M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z",
									}),
									(0, l.jsx)("path", {
										fill: "#EB4335",
										d: "M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251",
									}),
								],
							}),
							(0, l.jsx)("span", { children: "Continue with Google" }),
						],
					}),
					(0, l.jsxs)(s.Button, {
						variant: "outline",
						className: (0, n.cn)("w-full gap-2 flex relative justify-center"),
						onClick: async () => {
							await i.authClient.signIn.social({
								provider: "github",
								callbackURL: "/dashboard",
							});
						},
						children: [
							(0, l.jsx)("svg", {
								xmlns: "http://www.w3.org/2000/svg",
								width: "1em",
								height: "1em",
								viewBox: "0 0 24 24",
								children: (0, l.jsx)("path", {
									fill: "currentColor",
									d: "M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2",
								}),
							}),
							(0, l.jsx)("span", { children: "Continue with GitHub" }),
						],
					}),
					(0, l.jsxs)(s.Button, {
						variant: "outline",
						className: (0, n.cn)("w-full gap-2 flex relative justify-center"),
						onClick: async () => {
							await i.authClient.signIn.social({
								provider: "microsoft",
								callbackURL: "/dashboard",
							});
						},
						children: [
							(0, l.jsx)("svg", {
								xmlns: "http://www.w3.org/2000/svg",
								width: "1em",
								height: "1em",
								viewBox: "0 0 24 24",
								children: (0, l.jsx)("path", {
									fill: "currentColor",
									d: "M2 3h9v9H2zm9 19H2v-9h9zM21 3v9h-9V3zm0 19h-9v-9h9z",
								}),
							}),
							(0, l.jsx)("span", { children: "Continue with Microsoft" }),
						],
					}),
					(0, l.jsxs)(s.Button, {
						variant: "outline",
						className: (0, n.cn)("w-full gap-2 flex relative justify-center"),
						onClick: async () => {
							await i.authClient.signIn.social({
								provider: "vercel",
								callbackURL: "/dashboard",
							});
						},
						children: [
							(0, l.jsx)("svg", {
								xmlns: "http://www.w3.org/2000/svg",
								width: "1em",
								height: "1em",
								viewBox: "0 0 256 222",
								className: "dark:fill-white fill-black",
								children: (0, l.jsx)("path", { d: "m128 0l128 221.705H0z" }),
							}),
							(0, l.jsx)("span", { children: "Continue with Vercel" }),
						],
					}),
				],
			});
		}
		e.s(
			[
				"default",
				0,
				function () {
					return (0, l.jsx)("div", {
						className:
							"min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12",
						children: (0, l.jsx)("div", {
							className: "w-full max-w-[400px]",
							children: (0, l.jsxs)("div", {
								className: "flex flex-col gap-6",
								children: [
									(0, l.jsx)("div", {
										className: "text-center",
										children: (0, l.jsx)("h1", {
											className: "text-3xl font-semibold tracking-tight",
											children: "Your first deploy is just a sign-up away.",
										}),
									}),
									(0, l.jsx)(r, {}),
									(0, l.jsxs)("p", {
										className: "text-xs text-center text-muted-foreground",
										children: [
											"By joining, you agree to our",
											" ",
											(0, l.jsx)(t.default, {
												href: "https://www.cinagroup.com/terms",
												className:
													"text-foreground underline underline-offset-4 hover:no-underline",
												target: "_blank",
												children: "Terms of Service",
											}),
											" ",
											"and",
											" ",
											(0, l.jsx)(t.default, {
												href: "https://www.cinagroup.com/privacy",
												className:
													"text-foreground underline underline-offset-4 hover:no-underline",
												target: "_blank",
												children: "Privacy Policy",
											}),
										],
									}),
									(0, l.jsxs)("div", {
										className: "text-center text-sm text-muted-foreground",
										children: [
											"Already have an account?",
											" ",
											(0, l.jsx)(t.default, {
												href: "/sign-in",
												className:
													"text-foreground underline underline-offset-4 hover:no-underline",
												children: "Log In",
											}),
										],
									}),
								],
							}),
						}),
					});
				},
			],
			35954,
		);
	},
]);
