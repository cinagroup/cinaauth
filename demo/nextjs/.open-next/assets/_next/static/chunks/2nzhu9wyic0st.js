(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
	"object" == typeof document ? document.currentScript : void 0,
	49139,
	(e) => {
		"use strict";
		var t = e.i(62613),
			r = e.i(49696);
		const a = ({ className: e, ...a }) =>
			(0, t.jsx)("div", {
				className: (0, r.cn)(
					"rounded-xl border bg-card text-card-foreground shadow",
					e,
				),
				...a,
			});
		a.displayName = "Card";
		const i = ({ className: e, ...a }) =>
			(0, t.jsx)("div", {
				className: (0, r.cn)("flex flex-col space-y-1.5 p-6", e),
				...a,
			});
		i.displayName = "CardHeader";
		const s = ({ className: e, ...a }) =>
			(0, t.jsx)("h3", {
				className: (0, r.cn)("font-semibold leading-none tracking-tight", e),
				...a,
			});
		s.displayName = "CardTitle";
		const l = ({ className: e, ...a }) =>
			(0, t.jsx)("p", {
				className: (0, r.cn)("text-sm text-muted-foreground", e),
				...a,
			});
		l.displayName = "CardDescription";
		const n = ({ className: e, ...a }) =>
			(0, t.jsx)("div", { className: (0, r.cn)("p-6 pt-0", e), ...a });
		n.displayName = "CardContent";
		const d = ({ className: e, ...a }) =>
			(0, t.jsx)("div", {
				className: (0, r.cn)("flex items-center p-6 pt-0", e),
				...a,
			});
		(d.displayName = "CardFooter"),
			e.s([
				"Card",
				0,
				a,
				"CardContent",
				0,
				n,
				"CardDescription",
				0,
				l,
				"CardFooter",
				0,
				d,
				"CardHeader",
				0,
				i,
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
			r = e.i(49696);
		e.s([
			"Input",
			0,
			function ({ className: e, type: a, ...i }) {
				return (0, t.jsx)("input", {
					type: a,
					"data-slot": "input",
					className: (0, r.cn)(
						"border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-10 w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
						"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
						"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
						e,
					),
					...i,
				});
			},
		]);
	},
	42603,
	(e) => {
		"use strict";
		var t = e.i(62613),
			r = e.i(57319),
			a = e.i(33833),
			i = r.forwardRef((e, r) =>
				(0, t.jsx)(a.Primitive.label, {
					...e,
					ref: r,
					onMouseDown: (t) => {
						t.target.closest("button, input, select, textarea") ||
							(e.onMouseDown?.(t),
							!t.defaultPrevented && t.detail > 1 && t.preventDefault());
					},
				}),
			);
		i.displayName = "Label";
		var s = e.i(49696);
		e.s(
			[
				"Label",
				0,
				function ({ className: e, ...r }) {
					return (0, t.jsx)(i, {
						"data-slot": "label",
						className: (0, s.cn)(
							"flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
							e,
						),
						...r,
					});
				},
			],
			42603,
		);
	},
	77542,
	(e) => {
		"use strict";
		var t = e.i(62613),
			r = e.i(67283),
			a = e.i(49696);
		const i = (0, r.cva)(
			"relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
			{
				variants: {
					variant: {
						default: "bg-background text-foreground",
						destructive:
							"text-destructive-foreground [&>svg]:text-current *:data-[slot=alert-description]:text-destructive-foreground/80",
					},
				},
				defaultVariants: { variant: "default" },
			},
		);
		e.s([
			"Alert",
			0,
			function ({ className: e, variant: r, ...s }) {
				return (0, t.jsx)("div", {
					"data-slot": "alert",
					role: "alert",
					className: (0, a.cn)(i({ variant: r }), e),
					...s,
				});
			},
			"AlertDescription",
			0,
			function ({ className: e, ...r }) {
				return (0, t.jsx)("div", {
					"data-slot": "alert-description",
					className: (0, a.cn)(
						"text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
						e,
					),
					...r,
				});
			},
			"AlertTitle",
			0,
			function ({ className: e, ...r }) {
				return (0, t.jsx)("div", {
					"data-slot": "alert-title",
					className: (0, a.cn)(
						"col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
						e,
					),
					...r,
				});
			},
		]);
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
	38571,
	(e) => {
		"use strict";
		const t = (0, e.i(10283).default)("arrow-left", [
			["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
			["path", { d: "M19 12H5", key: "x3x0zl" }],
		]);
		e.s(["ArrowLeft", 0, t], 38571);
	},
	8002,
	(e) => {
		"use strict";
		var t = e.i(62613),
			r = e.i(38571),
			a = e.i(82468),
			i = e.i(78592),
			s = e.i(57319),
			l = e.i(26735),
			n = e.i(69016),
			d = e.i(79007),
			o = e.i(26638),
			c = e.i(88642),
			u = e.i(3390),
			m = e.i(1359),
			x = e.i(76706);
		const p = o.object({
			email: o.email("Please enter a valid email address."),
		});
		function f({
			onSuccess: e,
			onError: r,
			redirectTo: a = "/reset-password",
		}) {
			const [i, o] = (0, s.useTransition)(),
				g = (0, d.useForm)({
					resolver: (0, l.zodResolver)(p),
					defaultValues: { email: "" },
				});
			return (0, t.jsxs)("form", {
				onSubmit: g.handleSubmit((t) => {
					o(async () => {
						try {
							await x.authClient.requestPasswordReset({
								email: t.email,
								redirectTo: a,
							}),
								e?.();
						} catch {
							r?.("An error occurred. Please try again.");
						}
					});
				}),
				className: "grid gap-4",
				children: [
					(0, t.jsx)(u.FieldGroup, {
						children: (0, t.jsx)(d.Controller, {
							name: "email",
							control: g.control,
							render: ({ field: e, fieldState: r }) =>
								(0, t.jsxs)(u.Field, {
									"data-invalid": r.invalid,
									children: [
										(0, t.jsx)(u.FieldLabel, {
											htmlFor: "forgot-email",
											children: "Email",
										}),
										(0, t.jsx)(m.Input, {
											...e,
											id: "forgot-email",
											type: "email",
											placeholder: "Enter your email",
											"aria-invalid": r.invalid,
											autoComplete: "email",
										}),
										r.invalid &&
											(0, t.jsx)(u.FieldError, { errors: [r.error] }),
									],
								}),
						}),
					}),
					(0, t.jsx)(c.Button, {
						type: "submit",
						className: "w-full",
						disabled: i,
						children: i
							? (0, t.jsx)(n.Loader2, { size: 16, className: "animate-spin" })
							: "Send reset link",
					}),
				],
			});
		}
		var g = e.i(77542),
			h = e.i(49139);
		e.s(
			[
				"default",
				0,
				function () {
					const [e, l] = (0, s.useState)(!1);
					return e
						? (0, t.jsx)("main", {
								className:
									"flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]",
								children: (0, t.jsxs)(h.Card, {
									className: "w-[350px]",
									children: [
										(0, t.jsxs)(h.CardHeader, {
											children: [
												(0, t.jsx)(h.CardTitle, {
													children: "Check your email",
												}),
												(0, t.jsx)(h.CardDescription, {
													children:
														"We've sent a password reset link to your email.",
												}),
											],
										}),
										(0, t.jsx)(h.CardContent, {
											children: (0, t.jsxs)(g.Alert, {
												variant: "default",
												children: [
													(0, t.jsx)(a.CheckCircle2, { className: "h-4 w-4" }),
													(0, t.jsx)(g.AlertDescription, {
														children:
															"If you don't see the email, check your spam folder.",
													}),
												],
											}),
										}),
										(0, t.jsx)(h.CardFooter, {
											className: "flex justify-center",
											children: (0, t.jsx)(i.default, {
												href: "/sign-in",
												children: (0, t.jsxs)(c.Button, {
													variant: "link",
													className: "px-0 gap-2",
													children: [
														(0, t.jsx)(r.ArrowLeft, { size: 15 }),
														"Back to sign in",
													],
												}),
											}),
										}),
									],
								}),
							})
						: (0, t.jsx)("main", {
								className:
									"flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]",
								children: (0, t.jsxs)(h.Card, {
									className: "w-[350px]",
									children: [
										(0, t.jsxs)(h.CardHeader, {
											children: [
												(0, t.jsx)(h.CardTitle, {
													children: "Forgot password",
												}),
												(0, t.jsx)(h.CardDescription, {
													children: "Enter your email to reset your password",
												}),
											],
										}),
										(0, t.jsx)(h.CardContent, {
											children: (0, t.jsx)(f, { onSuccess: () => l(!0) }),
										}),
										(0, t.jsx)(h.CardFooter, {
											className: "flex justify-center",
											children: (0, t.jsx)(i.default, {
												href: "/sign-in",
												children: (0, t.jsxs)(c.Button, {
													variant: "link",
													className: "px-0 gap-2",
													children: [
														(0, t.jsx)(r.ArrowLeft, { size: 15 }),
														"Back to sign in",
													],
												}),
											}),
										}),
									],
								}),
							});
				},
			],
			8002,
		);
	},
]);
