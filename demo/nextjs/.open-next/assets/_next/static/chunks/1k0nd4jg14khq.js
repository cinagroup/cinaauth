(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
	"object" == typeof document ? document.currentScript : void 0,
	49139,
	(e) => {
		"use strict";
		var t = e.i(62613),
			i = e.i(49696);
		const r = ({ className: e, ...r }) =>
			(0, t.jsx)("div", {
				className: (0, i.cn)(
					"rounded-xl border bg-card text-card-foreground shadow",
					e,
				),
				...r,
			});
		r.displayName = "Card";
		const a = ({ className: e, ...r }) =>
			(0, t.jsx)("div", {
				className: (0, i.cn)("flex flex-col space-y-1.5 p-6", e),
				...r,
			});
		a.displayName = "CardHeader";
		const s = ({ className: e, ...r }) =>
			(0, t.jsx)("h3", {
				className: (0, i.cn)("font-semibold leading-none tracking-tight", e),
				...r,
			});
		s.displayName = "CardTitle";
		const d = ({ className: e, ...r }) =>
			(0, t.jsx)("p", {
				className: (0, i.cn)("text-sm text-muted-foreground", e),
				...r,
			});
		d.displayName = "CardDescription";
		const l = ({ className: e, ...r }) =>
			(0, t.jsx)("div", { className: (0, i.cn)("p-6 pt-0", e), ...r });
		l.displayName = "CardContent";
		const n = ({ className: e, ...r }) =>
			(0, t.jsx)("div", {
				className: (0, i.cn)("flex items-center p-6 pt-0", e),
				...r,
			});
		(n.displayName = "CardFooter"),
			e.s([
				"Card",
				0,
				r,
				"CardContent",
				0,
				l,
				"CardDescription",
				0,
				d,
				"CardFooter",
				0,
				n,
				"CardHeader",
				0,
				a,
				"CardTitle",
				0,
				s,
			]);
	},
	69016,
	(e) => {
		"use strict";
		const t = (0, e.i(10283).default)("loader-circle", [
			["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }],
		]);
		e.s(["Loader2", 0, t], 69016);
	},
	1359,
	(e) => {
		"use strict";
		var t = e.i(62613),
			i = e.i(49696);
		e.s([
			"Input",
			0,
			function ({ className: e, type: r, ...a }) {
				return (0, t.jsx)("input", {
					type: r,
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
	42603,
	(e) => {
		"use strict";
		var t = e.i(62613),
			i = e.i(57319),
			r = e.i(33833),
			a = i.forwardRef((e, i) =>
				(0, t.jsx)(r.Primitive.label, {
					...e,
					ref: i,
					onMouseDown: (t) => {
						t.target.closest("button, input, select, textarea") ||
							(e.onMouseDown?.(t),
							!t.defaultPrevented && t.detail > 1 && t.preventDefault());
					},
				}),
			);
		a.displayName = "Label";
		var s = e.i(49696);
		e.s(
			[
				"Label",
				0,
				function ({ className: e, ...i }) {
					return (0, t.jsx)(a, {
						"data-slot": "label",
						className: (0, s.cn)(
							"flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
							e,
						),
						...i,
					});
				},
			],
			42603,
		);
	},
	82468,
	(e) => {
		"use strict";
		const t = (0, e.i(10283).default)("circle-check", [
			["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
			["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }],
		]);
		e.s(["CheckCircle2", 0, t], 82468);
	},
	4690,
	(e) => {
		"use strict";
		var t = e.i(62613),
			i = e.i(78592),
			r = e.i(95360),
			a = e.i(26735),
			s = e.i(82468),
			d = e.i(69016),
			l = e.i(57319),
			n = e.i(79007),
			o = e.i(26638),
			c = e.i(88642),
			u = e.i(3390),
			m = e.i(1359),
			p = e.i(76706);
		const x = o.object({
			code: o
				.string()
				.length(6, "TOTP code must be 6 digits.")
				.regex(/^\d+$/, "TOTP code must be digits only."),
		});
		function f({ onSuccess: e, onError: i }) {
			const [r, o] = (0, l.useTransition)(),
				[h, g] = (0, l.useState)(!1),
				b = (0, n.useForm)({
					resolver: (0, a.zodResolver)(x),
					defaultValues: { code: "" },
				});
			return h
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
				: (0, t.jsxs)("form", {
						onSubmit: b.handleSubmit((t) => {
							o(async () => {
								const r = await p.authClient.twoFactor.verifyTotp({
									code: t.code,
								});
								r.data?.token
									? (g(!0), e?.())
									: (i?.("Invalid TOTP code"),
										b.setError("code", { message: "Invalid TOTP code" }));
							});
						}),
						className: "grid gap-4",
						children: [
							(0, t.jsx)(u.FieldGroup, {
								children: (0, t.jsx)(n.Controller, {
									name: "code",
									control: b.control,
									render: ({ field: e, fieldState: i }) =>
										(0, t.jsxs)(u.Field, {
											"data-invalid": i.invalid,
											children: [
												(0, t.jsx)(u.FieldLabel, {
													htmlFor: "totp-code",
													children: "TOTP Code",
												}),
												(0, t.jsx)(m.Input, {
													...e,
													id: "totp-code",
													type: "text",
													inputMode: "numeric",
													maxLength: 6,
													placeholder: "Enter 6-digit code",
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
								disabled: r,
								children: r
									? (0, t.jsx)(d.Loader2, {
											size: 16,
											className: "animate-spin",
										})
									: "Verify",
							}),
						],
					});
		}
		var h = e.i(49139);
		e.s(
			[
				"default",
				0,
				function () {
					const e = (0, r.useRouter)();
					return (0, t.jsx)("main", {
						className:
							"flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]",
						children: (0, t.jsxs)(h.Card, {
							className: "w-[350px]",
							children: [
								(0, t.jsxs)(h.CardHeader, {
									children: [
										(0, t.jsx)(h.CardTitle, { children: "TOTP Verification" }),
										(0, t.jsx)(h.CardDescription, {
											children: "Enter your 6-digit TOTP code to authenticate",
										}),
									],
								}),
								(0, t.jsx)(h.CardContent, {
									children: (0, t.jsx)(f, {
										onSuccess: () => e.push("/dashboard"),
									}),
								}),
								(0, t.jsx)(h.CardFooter, {
									className: "text-sm text-muted-foreground gap-2",
									children: (0, t.jsx)(i.default, {
										href: "/two-factor/otp",
										children: (0, t.jsx)(c.Button, {
											variant: "link",
											size: "sm",
											children: "Switch to Email Verification",
										}),
									}),
								}),
							],
						}),
					});
				},
			],
			4690,
		);
	},
]);
