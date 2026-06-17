(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
	"object" == typeof document ? document.currentScript : void 0,
	77422,
	(t) => {
		"use strict";
		var a = t.i(620),
			i = t.i(37146),
			r = t.i(16003),
			e = t.i(92766),
			o = t.i(92192),
			n = t.i(30208);
		t.s([
			"GoBackBtn",
			0,
			function () {
				const t = (0, i.useRouter)();
				return (0, a.jsx)(o.Button, {
					className: "w-full gap-2 h-12",
					variant: "outline",
					onClick: () => t.back(),
					children: "Go Back",
				});
			},
			"SelectOrganizationBtn",
			0,
			function ({ organization: t }) {
				return (0, a.jsxs)(o.Button, {
					className: "w-full gap-2 h-12",
					variant: "outline",
					onClick: async () => {
						try {
							if (!t.id) return void r.toast.error("No organization");
							const { data: a, error: i } =
								await n.authClient.organization.setActive({
									organizationId: t.id,
								});
							if (i || !a)
								return void r.toast.error(
									i?.message ?? "Failed to set active organization",
								);
							const { data: e, error: o } = await n.authClient.oauth2.continue({
								postLogin: !0,
							});
							if (o || !e?.redirect || !e.uri)
								return void r.toast.error(o?.message ?? "Failed to continue");
							window.location.href = e.uri;
						} catch (t) {
							r.toast.error(String(t));
						}
					},
					children: [
						(0, a.jsxs)(e.Avatar, {
							className: "mr-2 h-5 w-5",
							children: [
								(0, a.jsx)(e.AvatarImage, {
									src: t.logo || void 0,
									alt: t?.name,
								}),
								(0, a.jsx)(e.AvatarFallback, { children: t?.name?.charAt(0) }),
							],
						}),
						(0, a.jsx)("div", {
							className: "flex text-start w-full",
							children: (0, a.jsx)("div", {
								children: (0, a.jsx)("p", { children: t?.name }),
							}),
						}),
					],
				});
			},
		]);
	},
]);
