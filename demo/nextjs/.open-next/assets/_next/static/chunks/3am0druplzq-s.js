(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
	"object" == typeof document ? document.currentScript : void 0,
	1359,
	(e) => {
		"use strict";
		var t = e.i(62613),
			i = e.i(49696);
		e.s([
			"Input",
			0,
			function ({ className: e, type: s, ...a }) {
				return (0, t.jsx)("input", {
					type: s,
					"data-slot": "input",
					className: (0, i.cn)(
						"border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-10 w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
						"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
						"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
						e,
					),
					...a,
				});
			},
		]);
	},
	38571,
	(e) => {
		"use strict";
		const t = (0, e.i(10283).default)("arrow-left", [
			["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
			["path", { d: "M19 12H5", key: "x3x0zl" }],
		]);
		e.s(["ArrowLeft", 0, t], 38571);
	},
	53465,
	(e) => {
		"use strict";
		var t = e.i(62613),
			i = e.i(57319),
			s = e.i(88642),
			a = e.i(1359),
			n = e.i(76706),
			l = e.i(49696),
			r = e.i(61645);
		e.s([
			"EmailOtpForm",
			0,
			function ({ onSuccess: e }) {
				const [o, d] = (0, i.useState)(""),
					[c, u] = (0, i.useState)(""),
					[m, f] = (0, i.useState)("email"),
					[x, p] = (0, i.useState)(!1),
					[g, h] = (0, i.useState)(0),
					b = async (e) => {
						if ((e.preventDefault(), o)) {
							p(!0);
							try {
								await n.authClient.emailOtp.sendVerificationOtp({
									email: o,
									type: "sign-in",
								}),
									r.toast.success("Verification code sent to your email"),
									f("otp"),
									h(60),
									y(60);
							} catch (e) {
								r.toast.error(e?.message || "Failed to send verification code");
							} finally {
								p(!1);
							}
						}
					},
					v = async (t) => {
						if ((t.preventDefault(), o && c)) {
							p(!0);
							try {
								await n.authClient.signIn.emailOtp({ email: o, otp: c }),
									r.toast.success("Successfully signed in"),
									e?.();
							} catch (e) {
								r.toast.error(e?.message || "Invalid verification code");
							} finally {
								p(!1);
							}
						}
					},
					y = (e) => {
						const t = setInterval(() => {
							h((e) => (e <= 1 ? (clearInterval(t), 0) : e - 1));
						}, 1e3);
					},
					j = async () => {
						if (!(g > 0)) {
							p(!0);
							try {
								await n.authClient.emailOtp.sendVerificationOtp({
									email: o,
									type: "sign-in",
								}),
									r.toast.success("Verification code resent"),
									h(60),
									y(60);
							} catch (e) {
								r.toast.error(
									e?.message || "Failed to resend verification code",
								);
							} finally {
								p(!1);
							}
						}
					};
				return "email" === m
					? (0, t.jsxs)("form", {
							onSubmit: b,
							className: "flex flex-col gap-3",
							children: [
								(0, t.jsxs)("div", {
									className: "flex flex-col gap-2",
									children: [
										(0, t.jsx)("label", {
											htmlFor: "email",
											className: "text-sm font-medium",
											children: "Email",
										}),
										(0, t.jsx)(a.Input, {
											id: "email",
											type: "email",
											placeholder: "you@example.com",
											value: o,
											onChange: (e) => d(e.target.value),
											required: !0,
											disabled: x,
											autoComplete: "email",
										}),
									],
								}),
								(0, t.jsx)(s.Button, {
									type: "submit",
									className: "w-full",
									disabled: x,
									children: x ? "Sending..." : "Send verification code",
								}),
							],
						})
					: (0, t.jsxs)("form", {
							onSubmit: v,
							className: "flex flex-col gap-3",
							children: [
								(0, t.jsxs)("div", {
									className: "flex flex-col gap-2",
									children: [
										(0, t.jsx)("label", {
											htmlFor: "otp",
											className: "text-sm font-medium",
											children: "Enter verification code",
										}),
										(0, t.jsxs)("p", {
											className: "text-xs text-muted-foreground",
											children: [
												"We sent a 6-digit code to",
												" ",
												(0, t.jsx)("span", {
													className: "font-medium text-foreground",
													children: o,
												}),
											],
										}),
										(0, t.jsx)(a.Input, {
											id: "otp",
											type: "text",
											inputMode: "numeric",
											pattern: "[0-9]*",
											maxLength: 6,
											placeholder: "000000",
											value: c,
											onChange: (e) => u(e.target.value.replace(/\D/g, "")),
											required: !0,
											disabled: x,
											className: (0, l.cn)(
												"text-center text-lg tracking-[0.5em] font-mono",
											),
											autoFocus: !0,
										}),
									],
								}),
								(0, t.jsx)(s.Button, {
									type: "submit",
									className: "w-full",
									disabled: x || 6 !== c.length,
									children: x ? "Verifying..." : "Verify and sign in",
								}),
								(0, t.jsxs)("div", {
									className: "flex items-center justify-between text-xs",
									children: [
										(0, t.jsx)("button", {
											type: "button",
											onClick: j,
											disabled: x || g > 0,
											className:
												"text-muted-foreground hover:text-foreground underline underline-offset-4 disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed",
											children: g > 0 ? `Resend in ${g}s` : "Resend code",
										}),
										(0, t.jsx)("button", {
											type: "button",
											onClick: () => {
												f("email"), u("");
											},
											disabled: x,
											className:
												"text-muted-foreground hover:text-foreground underline underline-offset-4 disabled:opacity-50",
											children: "Change email",
										}),
									],
								}),
							],
						});
			},
		]);
	},
	60158,
	(e) => {
		"use strict";
		var t = e.i(62613),
			i = e.i(78592),
			s = e.i(38571),
			a = e.i(53465);
		e.s([
			"default",
			0,
			function () {
				return (0, t.jsx)("div", {
					className:
						"min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12",
					children: (0, t.jsx)("div", {
						className: "w-full max-w-[400px]",
						children: (0, t.jsxs)("div", {
							className: "flex flex-col gap-6",
							children: [
								(0, t.jsxs)(i.default, {
									href: "/sign-in",
									className:
										"text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 w-fit",
									children: [
										(0, t.jsx)(s.ArrowLeft, { size: 16 }),
										"Back to sign in",
									],
								}),
								(0, t.jsx)("h1", {
									className: "text-3xl font-semibold tracking-tight",
									children: "Sign in with Email",
								}),
								(0, t.jsx)("p", {
									className: "text-sm text-muted-foreground",
									children:
										"We'll send you a verification code to sign in without a password.",
								}),
								(0, t.jsx)(a.EmailOtpForm, {
									onSuccess: () => (window.location.href = "/dashboard"),
								}),
							],
						}),
					}),
				});
			},
		]);
	},
]);
