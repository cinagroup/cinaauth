(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
	"object" == typeof document ? document.currentScript : void 0,
	38699,
	(e) => {
		"use strict";
		var a = e.i(620),
			t = e.i(13732);
		const i = ({ className: e, ...i }) =>
			(0, a.jsx)("div", {
				className: (0, t.cn)(
					"rounded-xl border bg-card text-card-foreground shadow",
					e,
				),
				...i,
			});
		i.displayName = "Card";
		const r = ({ className: e, ...i }) =>
			(0, a.jsx)("div", {
				className: (0, t.cn)("flex flex-col space-y-1.5 p-6", e),
				...i,
			});
		r.displayName = "CardHeader";
		const s = ({ className: e, ...i }) =>
			(0, a.jsx)("h3", {
				className: (0, t.cn)("font-semibold leading-none tracking-tight", e),
				...i,
			});
		s.displayName = "CardTitle";
		const n = ({ className: e, ...i }) =>
			(0, a.jsx)("p", {
				className: (0, t.cn)("text-sm text-muted-foreground", e),
				...i,
			});
		n.displayName = "CardDescription";
		const d = ({ className: e, ...i }) =>
			(0, a.jsx)("div", { className: (0, t.cn)("p-6 pt-0", e), ...i });
		d.displayName = "CardContent";
		const o = ({ className: e, ...i }) =>
			(0, a.jsx)("div", {
				className: (0, t.cn)("flex items-center p-6 pt-0", e),
				...i,
			});
		(o.displayName = "CardFooter"),
			e.s([
				"Card",
				0,
				i,
				"CardContent",
				0,
				d,
				"CardDescription",
				0,
				n,
				"CardFooter",
				0,
				o,
				"CardHeader",
				0,
				r,
				"CardTitle",
				0,
				s,
			]);
	},
	43406,
	(e) => {
		"use strict";
		var a = e.i(620),
			t = e.i(72811),
			i = e.i(92479),
			r = e.i(16003),
			s = e.i(92192),
			n = e.i(38699),
			d = e.i(30208);
		e.s([
			"ConsentBtns",
			0,
			function () {
				const [e, o] = (0, i.useState)(!1);
				return (0, a.jsxs)(n.CardFooter, {
					className: "flex items-center gap-2",
					children: [
						(0, a.jsx)(s.Button, {
							onClick: async () => {
								o(!0);
								const e = await d.authClient.oauth2.consent({ accept: !0 });
								if ((o(!1), e.data?.redirect && e.data?.uri)) {
									window.location.href = e.data?.uri;
									return;
								}
								r.toast.error("Failed to authorize");
							},
							children: e
								? (0, a.jsx)(t.Loader2, { size: 15, className: "animate-spin" })
								: "Authorize",
						}),
						(0, a.jsx)(s.Button, {
							variant: "outline",
							onClick: async () => {
								const e = await d.authClient.oauth2.consent({ accept: !1 });
								if (e.data?.redirect && e.data?.uri) {
									window.location.href = e.data?.uri;
									return;
								}
								r.toast.error("Failed to cancel");
							},
							children: "Cancel",
						}),
					],
				});
			},
		]);
	},
]);
