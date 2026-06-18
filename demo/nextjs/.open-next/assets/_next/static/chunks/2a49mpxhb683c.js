(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
	"object" == typeof document ? document.currentScript : void 0,
	56255,
	(e) => {
		"use strict";
		var t = e.i(62613),
			s = e.i(78592),
			r = e.i(95360),
			i = e.i(61645),
			n = e.i(11185),
			a = e.i(88642),
			o = e.i(76706);
		e.s([
			"AnotherAccountBtn",
			0,
			function () {
				const e = (0, r.useSearchParams)();
				return (0, t.jsx)(s.default, {
					href: `/sign-in${e ? `?${e.toString()}` : ""}`,
					children: (0, t.jsx)(a.Button, {
						className: "w-full gap-2 h-12",
						variant: "outline",
						children: "Another Account",
					}),
				});
			},
			"SelectAccountBtn",
			0,
			function ({ session: e }) {
				return (0, t.jsxs)(a.Button, {
					className: "w-full gap-2 h-12",
					variant: "outline",
					onClick: async () => {
						try {
							if (!e.session?.token) return void i.toast.error("No session");
							const { data: t, error: s } =
								await o.authClient.multiSession.setActive({
									sessionToken: e.session.token,
								});
							if (s || !t?.session)
								return void i.toast.error(
									s?.message ?? "Failed to set active session",
								);
							const { data: r, error: n } = await o.authClient.oauth2.continue({
								selected: !0,
							});
							if (n || !t?.session || !r.redirect || !r?.uri)
								return void i.toast.error(n?.message ?? "Failed to continue");
							window.location.href = r.uri;
						} catch (e) {
							i.toast.error(String(e));
						}
					},
					children: [
						(0, t.jsxs)(n.Avatar, {
							className: "mr-2 h-5 w-5",
							children: [
								(0, t.jsx)(n.AvatarImage, {
									src: e.user?.image || void 0,
									alt: e.user?.name,
								}),
								(0, t.jsx)(n.AvatarFallback, {
									children: e.user?.name?.charAt(0),
								}),
							],
						}),
						(0, t.jsx)("div", {
							className: "flex text-start w-full",
							children: (0, t.jsxs)("div", {
								children: [
									(0, t.jsx)("p", { children: e.user?.name }),
									(0, t.jsx)("p", {
										className: "text-xs",
										children: e.user?.email,
									}),
								],
							}),
						}),
					],
				});
			},
		]);
	},
]);
