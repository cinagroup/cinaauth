(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
	"object" == typeof document ? document.currentScript : void 0,
	38699,
	(e) => {
		"use strict";
		var s = e.i(620),
			t = e.i(13732);
		const a = ({ className: e, ...a }) =>
			(0, s.jsx)("div", {
				className: (0, t.cn)(
					"rounded-xl border bg-card text-card-foreground shadow",
					e,
				),
				...a,
			});
		a.displayName = "Card";
		const d = ({ className: e, ...a }) =>
			(0, s.jsx)("div", {
				className: (0, t.cn)("flex flex-col space-y-1.5 p-6", e),
				...a,
			});
		d.displayName = "CardHeader";
		const r = ({ className: e, ...a }) =>
			(0, s.jsx)("h3", {
				className: (0, t.cn)("font-semibold leading-none tracking-tight", e),
				...a,
			});
		r.displayName = "CardTitle";
		const l = ({ className: e, ...a }) =>
			(0, s.jsx)("p", {
				className: (0, t.cn)("text-sm text-muted-foreground", e),
				...a,
			});
		l.displayName = "CardDescription";
		const i = ({ className: e, ...a }) =>
			(0, s.jsx)("div", { className: (0, t.cn)("p-6 pt-0", e), ...a });
		i.displayName = "CardContent";
		const c = ({ className: e, ...a }) =>
			(0, s.jsx)("div", {
				className: (0, t.cn)("flex items-center p-6 pt-0", e),
				...a,
			});
		(c.displayName = "CardFooter"),
			e.s([
				"Card",
				0,
				a,
				"CardContent",
				0,
				i,
				"CardDescription",
				0,
				l,
				"CardFooter",
				0,
				c,
				"CardHeader",
				0,
				d,
				"CardTitle",
				0,
				r,
			]);
	},
	14709,
	(e) => {
		"use strict";
		var s = e.i(67613);
		e.s(["X", () => s.default]);
	},
	39075,
	(e) => {
		"use strict";
		var s = e.i(620),
			t = e.i(14709),
			a = e.i(9373),
			d = e.i(92192),
			r = e.i(38699);
		e.s([
			"default",
			0,
			function () {
				return (0, s.jsx)("div", {
					className: "flex min-h-screen items-center justify-center p-4",
					children: (0, s.jsx)(r.Card, {
						className: "w-full max-w-md p-6",
						children: (0, s.jsxs)("div", {
							className: "space-y-4 text-center",
							children: [
								(0, s.jsx)("div", {
									className:
										"mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100",
									children: (0, s.jsx)(t.X, {
										className: "h-6 w-6 text-red-600",
									}),
								}),
								(0, s.jsxs)("div", {
									children: [
										(0, s.jsx)("h1", {
											className: "text-2xl font-bold",
											children: "Device Denied",
										}),
										(0, s.jsx)("p", {
											className: "text-muted-foreground mt-2",
											children:
												"The device authorization request has been denied.",
										}),
									],
								}),
								(0, s.jsx)("p", {
									className: "text-sm text-muted-foreground",
									children:
										"The device will not be able to access your account.",
								}),
								(0, s.jsx)(d.Button, {
									asChild: !0,
									className: "w-full",
									children: (0, s.jsx)(a.default, {
										href: "/",
										children: "Return to Home",
									}),
								}),
							],
						}),
					}),
				});
			},
		]);
	},
]);
