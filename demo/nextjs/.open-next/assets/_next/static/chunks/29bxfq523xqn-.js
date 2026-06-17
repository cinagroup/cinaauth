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
		const r = ({ className: e, ...a }) =>
			(0, s.jsx)("div", {
				className: (0, t.cn)("flex flex-col space-y-1.5 p-6", e),
				...a,
			});
		r.displayName = "CardHeader";
		const d = ({ className: e, ...a }) =>
			(0, s.jsx)("h3", {
				className: (0, t.cn)("font-semibold leading-none tracking-tight", e),
				...a,
			});
		d.displayName = "CardTitle";
		const c = ({ className: e, ...a }) =>
			(0, s.jsx)("p", {
				className: (0, t.cn)("text-sm text-muted-foreground", e),
				...a,
			});
		c.displayName = "CardDescription";
		const l = ({ className: e, ...a }) =>
			(0, s.jsx)("div", { className: (0, t.cn)("p-6 pt-0", e), ...a });
		l.displayName = "CardContent";
		const i = ({ className: e, ...a }) =>
			(0, s.jsx)("div", {
				className: (0, t.cn)("flex items-center p-6 pt-0", e),
				...a,
			});
		(i.displayName = "CardFooter"),
			e.s([
				"Card",
				0,
				a,
				"CardContent",
				0,
				l,
				"CardDescription",
				0,
				c,
				"CardFooter",
				0,
				i,
				"CardHeader",
				0,
				r,
				"CardTitle",
				0,
				d,
			]);
	},
	95875,
	(e) => {
		"use strict";
		var s = e.i(44435);
		e.s(["Check", () => s.default]);
	},
	5577,
	(e) => {
		"use strict";
		var s = e.i(620),
			t = e.i(95875),
			a = e.i(9373),
			r = e.i(92192),
			d = e.i(38699);
		e.s([
			"default",
			0,
			function () {
				return (0, s.jsx)("div", {
					className: "flex min-h-screen items-center justify-center p-4",
					children: (0, s.jsx)(d.Card, {
						className: "w-full max-w-md p-6",
						children: (0, s.jsxs)("div", {
							className: "space-y-4 text-center",
							children: [
								(0, s.jsx)("div", {
									className:
										"mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100",
									children: (0, s.jsx)(t.Check, {
										className: "h-6 w-6 text-green-600",
									}),
								}),
								(0, s.jsxs)("div", {
									children: [
										(0, s.jsx)("h1", {
											className: "text-2xl font-bold",
											children: "Device Approved",
										}),
										(0, s.jsx)("p", {
											className: "text-muted-foreground mt-2",
											children:
												"The device has been successfully authorized to access your account.",
										}),
									],
								}),
								(0, s.jsx)("p", {
									className: "text-sm text-muted-foreground",
									children: "You can now return to your device to continue.",
								}),
								(0, s.jsx)(r.Button, {
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
