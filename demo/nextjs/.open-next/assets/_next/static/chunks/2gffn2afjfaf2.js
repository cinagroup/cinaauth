(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
	"object" == typeof document ? document.currentScript : void 0,
	49139,
	(e) => {
		"use strict";
		var t = e.i(62613),
			a = e.i(49696);
		const r = ({ className: e, ...r }) =>
			(0, t.jsx)("div", {
				className: (0, a.cn)(
					"rounded-xl border bg-card text-card-foreground shadow",
					e,
				),
				...r,
			});
		r.displayName = "Card";
		const s = ({ className: e, ...r }) =>
			(0, t.jsx)("div", {
				className: (0, a.cn)("flex flex-col space-y-1.5 p-6", e),
				...r,
			});
		s.displayName = "CardHeader";
		const i = ({ className: e, ...r }) =>
			(0, t.jsx)("h3", {
				className: (0, a.cn)("font-semibold leading-none tracking-tight", e),
				...r,
			});
		i.displayName = "CardTitle";
		const l = ({ className: e, ...r }) =>
			(0, t.jsx)("p", {
				className: (0, a.cn)("text-sm text-muted-foreground", e),
				...r,
			});
		l.displayName = "CardDescription";
		const n = ({ className: e, ...r }) =>
			(0, t.jsx)("div", { className: (0, a.cn)("p-6 pt-0", e), ...r });
		n.displayName = "CardContent";
		const d = ({ className: e, ...r }) =>
			(0, t.jsx)("div", {
				className: (0, a.cn)("flex items-center p-6 pt-0", e),
				...r,
			});
		(d.displayName = "CardFooter"),
			e.s([
				"Card",
				0,
				r,
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
				s,
				"CardTitle",
				0,
				i,
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
			a = e.i(49696);
		e.s([
			"Input",
			0,
			function ({ className: e, type: r, ...s }) {
				return (0, t.jsx)("input", {
					type: r,
					"data-slot": "input",
					className: (0, a.cn)(
						"border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-10 w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
						"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
						"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
						e,
					),
					...s,
				});
			},
		]);
	},
	42603,
	(e) => {
		"use strict";
		var t = e.i(62613),
			a = e.i(57319),
			r = e.i(33833),
			s = a.forwardRef((e, a) =>
				(0, t.jsx)(r.Primitive.label, {
					...e,
					ref: a,
					onMouseDown: (t) => {
						t.target.closest("button, input, select, textarea") ||
							(e.onMouseDown?.(t),
							!t.defaultPrevented && t.detail > 1 && t.preventDefault());
					},
				}),
			);
		s.displayName = "Label";
		var i = e.i(49696);
		e.s(
			[
				"Label",
				0,
				function ({ className: e, ...a }) {
					return (0, t.jsx)(s, {
						"data-slot": "label",
						className: (0, i.cn)(
							"flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
							e,
						),
						...a,
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
			a = e.i(67283),
			r = e.i(49696);
		const s = (0, a.cva)(
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
			function ({ className: e, variant: a, ...i }) {
				return (0, t.jsx)("div", {
					"data-slot": "alert",
					role: "alert",
					className: (0, r.cn)(s({ variant: a }), e),
					...i,
				});
			},
			"AlertDescription",
			0,
			function ({ className: e, ...a }) {
				return (0, t.jsx)("div", {
					"data-slot": "alert-description",
					className: (0, r.cn)(
						"text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
						e,
					),
					...a,
				});
			},
			"AlertTitle",
			0,
			function ({ className: e, ...a }) {
				return (0, t.jsx)("div", {
					"data-slot": "alert-title",
					className: (0, r.cn)(
						"col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
						e,
					),
					...a,
				});
			},
		]);
	},
	15691,
	(e) => {
		"use strict";
		var t = e.i(62613),
			a = e.i(69016),
			r = e.i(95360),
			s = e.i(57319),
			i = e.i(77542),
			l = e.i(88642),
			n = e.i(49139),
			d = e.i(1359),
			o = e.i(42603),
			c = e.i(76706);
		e.s([
			"default",
			0,
			function () {
				const e = (0, r.useRouter)(),
					u = (0, r.useSearchParams)().get("user_code"),
					[p, m] = (0, s.useState)(u || ""),
					[x, f] = (0, s.useTransition)(),
					[g, v] = (0, s.useState)(null);
				return (0, t.jsx)("div", {
					className: "flex min-h-screen items-center justify-center p-4",
					children: (0, t.jsx)(n.Card, {
						className: "w-full max-w-md p-6",
						children: (0, t.jsxs)("div", {
							className: "space-y-4",
							children: [
								(0, t.jsxs)("div", {
									className: "text-center",
									children: [
										(0, t.jsx)("h1", {
											className: "text-2xl font-bold",
											children: "Device Authorization",
										}),
										(0, t.jsx)("p", {
											className: "text-muted-foreground mt-2",
											children: "Enter the code displayed on your device",
										}),
									],
								}),
								(0, t.jsxs)("form", {
									onSubmit: (t) => {
										t.preventDefault(),
											v(null),
											f(async () => {
												try {
													const t = p.trim().replaceAll(/-/g, "").toUpperCase();
													(
														await c.authClient.device({
															query: { user_code: t },
														})
													).data && e.push(`/device/approve?user_code=${t}`);
												} catch (e) {
													v(
														e.error?.message ||
															"Invalid code. Please check and try again.",
													);
												}
											});
									},
									className: "space-y-4",
									children: [
										(0, t.jsxs)("div", {
											className: "space-y-2",
											children: [
												(0, t.jsx)(o.Label, {
													htmlFor: "userCode",
													children: "Device Code",
												}),
												(0, t.jsx)(d.Input, {
													id: "userCode",
													type: "text",
													placeholder: "XXXX-XXXX",
													value: p,
													onChange: (e) => m(e.target.value),
													className: "text-center text-lg font-mono uppercase",
													maxLength: 9,
													disabled: x,
													required: !0,
												}),
											],
										}),
										g &&
											(0, t.jsx)(i.Alert, {
												variant: "destructive",
												children: (0, t.jsx)(i.AlertDescription, {
													children: g,
												}),
											}),
										(0, t.jsx)(l.Button, {
											type: "submit",
											className: "w-full",
											disabled: x,
											children: x
												? (0, t.jsxs)(t.Fragment, {
														children: [
															(0, t.jsx)(a.Loader2, {
																className: "mr-2 h-4 w-4 animate-spin",
															}),
															"Verifying...",
														],
													})
												: "Continue",
										}),
									],
								}),
							],
						}),
					}),
				});
			},
		]);
	},
]);
