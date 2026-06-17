(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
	"object" == typeof document ? document.currentScript : void 0,
	38699,
	(e) => {
		"use strict";
		var t = e.i(620),
			i = e.i(13732);
		const a = ({ className: e, ...a }) =>
			(0, t.jsx)("div", {
				className: (0, i.cn)(
					"rounded-xl border bg-card text-card-foreground shadow",
					e,
				),
				...a,
			});
		a.displayName = "Card";
		const s = ({ className: e, ...a }) =>
			(0, t.jsx)("div", {
				className: (0, i.cn)("flex flex-col space-y-1.5 p-6", e),
				...a,
			});
		s.displayName = "CardHeader";
		const r = ({ className: e, ...a }) =>
			(0, t.jsx)("h3", {
				className: (0, i.cn)("font-semibold leading-none tracking-tight", e),
				...a,
			});
		r.displayName = "CardTitle";
		const l = ({ className: e, ...a }) =>
			(0, t.jsx)("p", {
				className: (0, i.cn)("text-sm text-muted-foreground", e),
				...a,
			});
		l.displayName = "CardDescription";
		const d = ({ className: e, ...a }) =>
			(0, t.jsx)("div", { className: (0, i.cn)("p-6 pt-0", e), ...a });
		d.displayName = "CardContent";
		const n = ({ className: e, ...a }) =>
			(0, t.jsx)("div", {
				className: (0, i.cn)("flex items-center p-6 pt-0", e),
				...a,
			});
		(n.displayName = "CardFooter"),
			e.s([
				"Card",
				0,
				a,
				"CardContent",
				0,
				d,
				"CardDescription",
				0,
				l,
				"CardFooter",
				0,
				n,
				"CardHeader",
				0,
				s,
				"CardTitle",
				0,
				r,
			]);
	},
	98747,
	(e) => {
		"use strict";
		var t = e.i(620),
			i = e.i(92479),
			a = e.i(95353),
			s = i.forwardRef((e, i) =>
				(0, t.jsx)(a.Primitive.label, {
					...e,
					ref: i,
					onMouseDown: (t) => {
						t.target.closest("button, input, select, textarea") ||
							(e.onMouseDown?.(t),
							!t.defaultPrevented && t.detail > 1 && t.preventDefault());
					},
				}),
			);
		s.displayName = "Label";
		var r = e.i(13732);
		e.s(
			[
				"Label",
				0,
				function ({ className: e, ...i }) {
					return (0, t.jsx)(s, {
						"data-slot": "label",
						className: (0, r.cn)(
							"flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
							e,
						),
						...i,
					});
				},
			],
			98747,
		);
	},
	38901,
	(e) => {
		"use strict";
		var t = e.i(620),
			i = e.i(13732);
		e.s([
			"Input",
			0,
			function ({ className: e, type: a, ...s }) {
				return (0, t.jsx)("input", {
					type: a,
					"data-slot": "input",
					className: (0, i.cn)(
						"border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
						"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
						"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
						e,
					),
					...s,
				});
			},
		]);
	},
	30248,
	(e) => {
		"use strict";
		const t = (0, e.i(54762).default)("circle-check", [
			["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
			["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }],
		]);
		e.s(["CheckCircle2", 0, t], 30248);
	},
	99022,
	(e) => {
		"use strict";
		var t = e.i(620),
			i = e.i(37146),
			a = e.i(4664),
			s = e.i(30248),
			r = e.i(72811);
		const l = (0, e.i(54762).default)("mail", [
			["path", { d: "m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7", key: "132q7q" }],
			[
				"rect",
				{ x: "2", y: "4", width: "20", height: "16", rx: "2", key: "izxlao" },
			],
		]);
		var d = e.i(92479),
			n = e.i(56395),
			o = e.i(57321),
			c = e.i(92192),
			u = e.i(30905),
			m = e.i(38901),
			x = e.i(30208);
		const p = o.object({
			code: o
				.string()
				.length(6, "OTP code must be 6 digits.")
				.regex(/^\d+$/, "OTP code must be digits only."),
		});
		function f({ onSuccess: e, onError: i, userEmail: o = "your email" }) {
			const [h, g] = (0, d.useTransition)(),
				[b, v] = (0, d.useState)(!1),
				[j, y] = (0, d.useState)(!1),
				[C, N] = (0, d.useState)(""),
				w = (0, n.useForm)({
					resolver: (0, a.zodResolver)(p),
					defaultValues: { code: "" },
				});
			return j
				? (0, t.jsxs)("div", {
						className:
							"flex flex-col items-center justify-center space-y-2 py-4",
						children: [
							(0, t.jsx)(s.CheckCircle2, {
								className: "w-12 h-12 text-green-500",
							}),
							(0, t.jsx)("p", {
								className: "text-lg font-semibold",
								children: "Verification Successful",
							}),
						],
					})
				: b
					? (0, t.jsxs)("form", {
							onSubmit: w.handleSubmit((t) => {
								g(async () => {
									(await x.authClient.twoFactor.verifyOtp({ code: t.code }))
										.data
										? (y(!0), N("OTP validated successfully"), e?.())
										: (i?.("Invalid OTP"),
											w.setError("code", { message: "Invalid OTP" }));
								});
							}),
							className: "grid gap-4",
							children: [
								(0, t.jsx)(u.FieldGroup, {
									children: (0, t.jsx)(n.Controller, {
										name: "code",
										control: w.control,
										render: ({ field: e, fieldState: i }) =>
											(0, t.jsxs)(u.Field, {
												"data-invalid": i.invalid,
												children: [
													(0, t.jsx)(u.FieldLabel, {
														htmlFor: "email-otp-code",
														children: "One-Time Password",
													}),
													C &&
														(0, t.jsxs)("p", {
															className:
																"text-sm text-muted-foreground flex items-center gap-1 py-1",
															children: [
																(0, t.jsx)(s.CheckCircle2, {
																	className: "w-4 h-4 text-green-500",
																}),
																C,
															],
														}),
													(0, t.jsx)(m.Input, {
														...e,
														id: "email-otp-code",
														type: "text",
														inputMode: "numeric",
														maxLength: 6,
														placeholder: "Enter 6-digit OTP",
														"aria-invalid": i.invalid,
														autoComplete: "one-time-code",
													}),
													i.invalid &&
														(0, t.jsx)(u.FieldError, { errors: [i.error] }),
												],
											}),
									}),
								}),
								(0, t.jsx)(c.Button, {
									type: "submit",
									className: "w-full",
									disabled: h || j,
									children: h
										? (0, t.jsx)(r.Loader2, {
												size: 16,
												className: "animate-spin",
											})
										: "Validate OTP",
								}),
							],
						})
					: (0, t.jsx)("div", {
							className: "grid gap-4",
							children: (0, t.jsx)(c.Button, {
								onClick: () => {
									g(async () => {
										await x.authClient.twoFactor.sendOtp(),
											v(!0),
											N(`OTP sent to ${o}`);
									});
								},
								className: "w-full",
								disabled: h,
								children: h
									? (0, t.jsx)(r.Loader2, {
											size: 16,
											className: "animate-spin",
										})
									: (0, t.jsxs)(t.Fragment, {
											children: [
												(0, t.jsx)(l, { className: "w-4 h-4 mr-2" }),
												" Send OTP to Email",
											],
										}),
							}),
						});
		}
		var h = e.i(38699);
		e.s(
			[
				"default",
				0,
				function () {
					const e = (0, i.useRouter)();
					return (0, t.jsx)("main", {
						className:
							"flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]",
						children: (0, t.jsxs)(h.Card, {
							className: "w-[350px]",
							children: [
								(0, t.jsxs)(h.CardHeader, {
									children: [
										(0, t.jsx)(h.CardTitle, {
											children: "Two-Factor Authentication",
										}),
										(0, t.jsx)(h.CardDescription, {
											children: "Verify your identity with a one-time password",
										}),
									],
								}),
								(0, t.jsx)(h.CardContent, {
									children: (0, t.jsx)(f, {
										onSuccess: () => e.push("/dashboard"),
									}),
								}),
							],
						}),
					});
				},
			],
			99022,
		);
	},
]);
