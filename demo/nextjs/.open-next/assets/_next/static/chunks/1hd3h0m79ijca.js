(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
	"object" == typeof document ? document.currentScript : void 0,
	38699,
	(e) => {
		"use strict";
		var t = e.i(620),
			i = e.i(13732);
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
	98747,
	(e) => {
		"use strict";
		var t = e.i(620),
			i = e.i(92479),
			r = e.i(95353),
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
		var s = e.i(13732);
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
			function ({ className: e, type: r, ...a }) {
				return (0, t.jsx)("input", {
					type: r,
					"data-slot": "input",
					className: (0, i.cn)(
						"border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
						"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
						"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
						e,
					),
					...a,
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
	82938,
	(e) => {
		"use strict";
		var t = e.i(620),
			i = e.i(9373),
			r = e.i(37146),
			a = e.i(4664),
			s = e.i(30248),
			d = e.i(72811),
			l = e.i(92479),
			n = e.i(56395),
			o = e.i(57321),
			c = e.i(92192),
			u = e.i(30905),
			m = e.i(38901),
			x = e.i(30208);
		const p = o.object({
			code: o
				.string()
				.length(6, "TOTP code must be 6 digits.")
				.regex(/^\d+$/, "TOTP code must be digits only."),
		});
		function f({ onSuccess: e, onError: i }) {
			const [r, o] = (0, l.useTransition)(),
				[h, b] = (0, l.useState)(!1),
				g = (0, n.useForm)({
					resolver: (0, a.zodResolver)(p),
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
						onSubmit: g.handleSubmit((t) => {
							o(async () => {
								const r = await x.authClient.twoFactor.verifyTotp({
									code: t.code,
								});
								r.data?.token
									? (b(!0), e?.())
									: (i?.("Invalid TOTP code"),
										g.setError("code", { message: "Invalid TOTP code" }));
							});
						}),
						className: "grid gap-4",
						children: [
							(0, t.jsx)(u.FieldGroup, {
								children: (0, t.jsx)(n.Controller, {
									name: "code",
									control: g.control,
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
		var h = e.i(38699);
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
			82938,
		);
	},
]);
