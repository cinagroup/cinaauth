(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
	"object" == typeof document ? document.currentScript : void 0,
	49139,
	(e) => {
		"use strict";
		var a = e.i(62613),
			t = e.i(49696);
		const r = ({ className: e, ...r }) =>
			(0, a.jsx)("div", {
				className: (0, t.cn)(
					"rounded-xl border bg-card text-card-foreground shadow",
					e,
				),
				...r,
			});
		r.displayName = "Card";
		const i = ({ className: e, ...r }) =>
			(0, a.jsx)("div", {
				className: (0, t.cn)("flex flex-col space-y-1.5 p-6", e),
				...r,
			});
		i.displayName = "CardHeader";
		const s = ({ className: e, ...r }) =>
			(0, a.jsx)("h3", {
				className: (0, t.cn)("font-semibold leading-none tracking-tight", e),
				...r,
			});
		s.displayName = "CardTitle";
		const d = ({ className: e, ...r }) =>
			(0, a.jsx)("p", {
				className: (0, t.cn)("text-sm text-muted-foreground", e),
				...r,
			});
		d.displayName = "CardDescription";
		const n = ({ className: e, ...r }) =>
			(0, a.jsx)("div", { className: (0, t.cn)("p-6 pt-0", e), ...r });
		n.displayName = "CardContent";
		const l = ({ className: e, ...r }) =>
			(0, a.jsx)("div", {
				className: (0, t.cn)("flex items-center p-6 pt-0", e),
				...r,
			});
		(l.displayName = "CardFooter"),
			e.s([
				"Card",
				0,
				r,
				"CardContent",
				0,
				n,
				"CardDescription",
				0,
				d,
				"CardFooter",
				0,
				l,
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
		const a = (0, e.i(10283).default)("loader-circle", [
			["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }],
		]);
		e.s(["Loader2", 0, a], 69016);
	},
	51660,
	(e) => {
		"use strict";
		var a = e.i(62613),
			t = e.i(69016),
			r = e.i(57319),
			i = e.i(61645),
			s = e.i(88642),
			d = e.i(49139),
			n = e.i(76706);
		e.s([
			"ConsentBtns",
			0,
			function () {
				const [e, l] = (0, r.useState)(!1);
				return (0, a.jsxs)(d.CardFooter, {
					className: "flex items-center gap-2",
					children: [
						(0, a.jsx)(s.Button, {
							onClick: async () => {
								l(!0);
								const e = await n.authClient.oauth2.consent({ accept: !0 });
								if ((l(!1), e.data?.redirect && e.data?.uri)) {
									window.location.href = e.data?.uri;
									return;
								}
								i.toast.error("Failed to authorize");
							},
							children: e
								? (0, a.jsx)(t.Loader2, { size: 15, className: "animate-spin" })
								: "Authorize",
						}),
						(0, a.jsx)(s.Button, {
							variant: "outline",
							onClick: async () => {
								const e = await n.authClient.oauth2.consent({ accept: !1 });
								if (e.data?.redirect && e.data?.uri) {
									window.location.href = e.data?.uri;
									return;
								}
								i.toast.error("Failed to cancel");
							},
							children: "Cancel",
						}),
					],
				});
			},
		]);
	},
]);
