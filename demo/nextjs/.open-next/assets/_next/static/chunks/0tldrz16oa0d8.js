(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
	"object" == typeof document ? document.currentScript : void 0,
	50517,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 }),
			Object.defineProperty(r, "warnOnce", {
				enumerable: !0,
				get: function () {
					return n;
				},
			});
		const n = (e) => {};
	},
	92025,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 });
		var n = {
			assign: function () {
				return s;
			},
			searchParamsToUrlQuery: function () {
				return i;
			},
			urlQueryToSearchParams: function () {
				return l;
			},
		};
		for (var o in n) Object.defineProperty(r, o, { enumerable: !0, get: n[o] });
		function i(e) {
			const t = {};
			for (const [r, n] of e.entries()) {
				const e = t[r];
				void 0 === e
					? (t[r] = n)
					: Array.isArray(e)
						? e.push(n)
						: (t[r] = [e, n]);
			}
			return t;
		}
		function a(e) {
			return "string" == typeof e
				? e
				: ("number" != typeof e || isNaN(e)) && "boolean" != typeof e
					? ""
					: String(e);
		}
		function l(e) {
			const t = new URLSearchParams();
			for (const [r, n] of Object.entries(e))
				if (Array.isArray(n)) for (const e of n) t.append(r, a(e));
				else t.set(r, a(n));
			return t;
		}
		function s(e, ...t) {
			for (const r of t) {
				for (const t of r.keys()) e.delete(t);
				for (const [t, n] of r.entries()) e.append(t, n);
			}
			return e;
		}
	},
	80868,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 });
		var n = {
			DecodeError: function () {
				return y;
			},
			MiddlewareNotFoundError: function () {
				return x;
			},
			MissingStaticPage: function () {
				return w;
			},
			NormalizeError: function () {
				return v;
			},
			PageNotFoundError: function () {
				return b;
			},
			SP: function () {
				return h;
			},
			ST: function () {
				return g;
			},
			WEB_VITALS: function () {
				return i;
			},
			execOnce: function () {
				return a;
			},
			getDisplayName: function () {
				return d;
			},
			getLocationOrigin: function () {
				return u;
			},
			getURL: function () {
				return c;
			},
			isAbsoluteUrl: function () {
				return s;
			},
			isResSent: function () {
				return f;
			},
			loadGetInitialProps: function () {
				return m;
			},
			normalizeRepeatedSlashes: function () {
				return p;
			},
			stringifyError: function () {
				return _;
			},
		};
		for (var o in n) Object.defineProperty(r, o, { enumerable: !0, get: n[o] });
		const i = ["CLS", "FCP", "FID", "INP", "LCP", "TTFB"];
		function a(e) {
			let t,
				r = !1;
			return (...n) => (r || ((r = !0), (t = e(...n))), t);
		}
		const l = /^[a-zA-Z][a-zA-Z\d+\-.]*?:/,
			s = (e) => l.test(e);
		function u() {
			const { protocol: e, hostname: t, port: r } = window.location;
			return `${e}//${t}${r ? ":" + r : ""}`;
		}
		function c() {
			const { href: e } = window.location,
				t = u();
			return e.substring(t.length);
		}
		function d(e) {
			return "string" == typeof e ? e : e.displayName || e.name || "Unknown";
		}
		function f(e) {
			return e.finished || e.headersSent;
		}
		function p(e) {
			const t = e.split("?");
			return (
				t[0].replace(/\\/g, "/").replace(/\/\/+/g, "/") +
				(t[1] ? `?${t.slice(1).join("?")}` : "")
			);
		}
		async function m(e, t) {
			const r = t.res || (t.ctx && t.ctx.res);
			if (!e.getInitialProps)
				return t.ctx && t.Component
					? { pageProps: await m(t.Component, t.ctx) }
					: {};
			const n = await e.getInitialProps(t);
			if (r && f(r)) return n;
			if (!n)
				throw Object.defineProperty(
					Error(
						`"${d(e)}.getInitialProps()" should resolve to an object. But found "${n}" instead.`,
					),
					"__NEXT_ERROR_CODE",
					{ value: "E1025", enumerable: !1, configurable: !0 },
				);
			return n;
		}
		const h = "u" > typeof performance,
			g =
				h &&
				["mark", "measure", "getEntriesByName"].every(
					(e) => "function" == typeof performance[e],
				);
		class y extends Error {}
		class v extends Error {}
		class b extends Error {
			constructor(e) {
				super(),
					(this.code = "ENOENT"),
					(this.name = "PageNotFoundError"),
					(this.message = `Cannot find module for page: ${e}`);
			}
		}
		class w extends Error {
			constructor(e, t) {
				super(),
					(this.message = `Failed to load static file for page: ${e} ${t}`);
			}
		}
		class x extends Error {
			constructor() {
				super(),
					(this.code = "ENOENT"),
					(this.message = "Cannot find the middleware module");
			}
		}
		function _(e) {
			return JSON.stringify({ message: e.message, stack: e.stack });
		}
	},
	43746,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 }),
			Object.defineProperty(r, "useMergedRef", {
				enumerable: !0,
				get: function () {
					return o;
				},
			});
		const n = e.r(57319);
		function o(e, t) {
			const r = (0, n.useRef)(null),
				o = (0, n.useRef)(null);
			return (0, n.useCallback)(
				(n) => {
					if (null === n) {
						const e = r.current;
						e && ((r.current = null), e());
						const t = o.current;
						t && ((o.current = null), t());
					} else e && (r.current = i(e, n)), t && (o.current = i(t, n));
				},
				[e, t],
			);
		}
		function i(e, t) {
			if ("function" != typeof e)
				return (
					(e.current = t),
					() => {
						e.current = null;
					}
				);
			{
				const r = e(t);
				return "function" == typeof r ? r : () => e(null);
			}
		}
		("function" == typeof r.default ||
			("object" == typeof r.default && null !== r.default)) &&
			void 0 === r.default.__esModule &&
			(Object.defineProperty(r.default, "__esModule", { value: !0 }),
			Object.assign(r.default, r),
			(t.exports = r.default));
	},
	62312,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 });
		var n = {
			formatUrl: function () {
				return l;
			},
			formatWithValidation: function () {
				return u;
			},
			urlObjectKeys: function () {
				return s;
			},
		};
		for (var o in n) Object.defineProperty(r, o, { enumerable: !0, get: n[o] });
		const i = e.r(43148)._(e.r(92025)),
			a = /https?|ftp|gopher|file/;
		function l(e) {
			let { auth: t, hostname: r } = e,
				n = e.protocol || "",
				o = e.pathname || "",
				l = e.hash || "",
				s = e.query || "",
				u = !1;
			(t = t ? encodeURIComponent(t).replace(/%3A/i, ":") + "@" : ""),
				e.host
					? (u = t + e.host)
					: r &&
						((u = t + (~r.indexOf(":") ? `[${r}]` : r)),
						e.port && (u += ":" + e.port)),
				s && "object" == typeof s && (s = String(i.urlQueryToSearchParams(s)));
			let c = e.search || (s && `?${s}`) || "";
			return (
				n && !n.endsWith(":") && (n += ":"),
				e.slashes || ((!n || a.test(n)) && !1 !== u)
					? ((u = "//" + (u || "")), o && "/" !== o[0] && (o = "/" + o))
					: u || (u = ""),
				l && "#" !== l[0] && (l = "#" + l),
				c && "?" !== c[0] && (c = "?" + c),
				(o = o.replace(/[?#]/g, encodeURIComponent)),
				(c = c.replace("#", "%23")),
				`${n}${u}${o}${c}${l}`
			);
		}
		const s = [
			"auth",
			"hash",
			"host",
			"hostname",
			"href",
			"path",
			"pathname",
			"port",
			"protocol",
			"query",
			"search",
			"slashes",
		];
		function u(e) {
			return l(e);
		}
	},
	41232,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 }),
			Object.defineProperty(r, "isLocalURL", {
				enumerable: !0,
				get: function () {
					return i;
				},
			});
		const n = e.r(80868),
			o = e.r(82655);
		function i(e) {
			if (!(0, n.isAbsoluteUrl)(e)) return !0;
			try {
				const t = (0, n.getLocationOrigin)(),
					r = new URL(e, t);
				return r.origin === t && (0, o.hasBasePath)(r.pathname);
			} catch (e) {
				return !1;
			}
		}
	},
	63055,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 }),
			Object.defineProperty(r, "errorOnce", {
				enumerable: !0,
				get: function () {
					return n;
				},
			});
		const n = (e) => {};
	},
	78592,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 });
		var n = {
			default: function () {
				return y;
			},
			useLinkStatus: function () {
				return b;
			},
		};
		for (var o in n) Object.defineProperty(r, o, { enumerable: !0, get: n[o] });
		const i = e.r(43148),
			a = e.r(62613),
			l = i._(e.r(57319)),
			s = e.r(62312),
			u = e.r(25703),
			c = e.r(43746),
			d = e.r(80868),
			f = e.r(30263);
		e.r(50517);
		const p = e.r(93241),
			m = e.r(62451),
			h = e.r(41232),
			g = e.r(17171);
		function y(t) {
			var r, n;
			let o,
				i,
				y,
				[b, w] = (0, l.useOptimistic)(m.IDLE_LINK_STATUS),
				x = (0, l.useRef)(null),
				{
					href: _,
					as: j,
					children: C,
					prefetch: E = null,
					passHref: P,
					replace: S,
					shallow: O,
					scroll: k,
					onClick: R,
					onMouseEnter: N,
					onTouchStart: T,
					legacyBehavior: M = !1,
					onNavigate: $,
					transitionTypes: L,
					ref: A,
					unstable_dynamicOnHover: I,
					...z
				} = t;
			(o = C),
				M &&
					("string" == typeof o || "number" == typeof o) &&
					(o = (0, a.jsx)("a", { children: o }));
			const D = l.default.useContext(u.AppRouterContext),
				U = !1 !== E,
				B =
					!1 !== E
						? null === (n = E) || "auto" === n
							? g.FetchStrategy.PPR
							: g.FetchStrategy.Full
						: g.FetchStrategy.PPR,
				F = "string" == typeof (r = j || _) ? r : (0, s.formatUrl)(r);
			if (M) {
				if (o?.$$typeof === Symbol.for("react.lazy"))
					throw Object.defineProperty(
						Error(
							"`<Link legacyBehavior>` received a direct child that is either a Server Component, or JSX that was loaded with React.lazy(). This is not supported. Either remove legacyBehavior, or make the direct child a Client Component that renders the Link's `<a>` tag.",
						),
						"__NEXT_ERROR_CODE",
						{ value: "E863", enumerable: !1, configurable: !0 },
					);
				i = l.default.Children.only(o);
			}
			const W = M ? i && "object" == typeof i && i.ref : A,
				q = l.default.useCallback(
					(e) => (
						null !== D &&
							(x.current = (0, m.mountLinkInstance)(e, F, D, B, U, w)),
						() => {
							x.current &&
								((0, m.unmountLinkForCurrentNavigation)(x.current),
								(x.current = null)),
								(0, m.unmountPrefetchableInstance)(e);
						}
					),
					[U, F, D, B, w],
				),
				K = {
					ref: (0, c.useMergedRef)(q, W),
					onClick(t) {
						M || "function" != typeof R || R(t),
							M &&
								i.props &&
								"function" == typeof i.props.onClick &&
								i.props.onClick(t),
							!D ||
								t.defaultPrevented ||
								(function (t, r, n, o, i, a, s) {
									if ("u" > typeof window) {
										let u,
											{ nodeName: c } = t.currentTarget;
										if (
											("A" === c.toUpperCase() &&
												(((u = t.currentTarget.getAttribute("target")) &&
													"_self" !== u) ||
													t.metaKey ||
													t.ctrlKey ||
													t.shiftKey ||
													t.altKey ||
													(t.nativeEvent && 2 === t.nativeEvent.which))) ||
											t.currentTarget.hasAttribute("download")
										)
											return;
										if (!(0, h.isLocalURL)(r)) {
											o && (t.preventDefault(), location.replace(r));
											return;
										}
										if ((t.preventDefault(), a)) {
											let e = !1;
											if (
												(a({
													preventDefault: () => {
														e = !0;
													},
												}),
												e)
											)
												return;
										}
										const { dispatchNavigateAction: d } = e.r(91308);
										l.default.startTransition(() => {
											d(
												r,
												o ? "replace" : "push",
												!1 === i
													? p.ScrollBehavior.NoScroll
													: p.ScrollBehavior.Default,
												n.current,
												s,
											);
										});
									}
								})(t, F, x, S, k, $, L);
					},
					onMouseEnter(e) {
						M || "function" != typeof N || N(e),
							M &&
								i.props &&
								"function" == typeof i.props.onMouseEnter &&
								i.props.onMouseEnter(e),
							D && U && (0, m.onNavigationIntent)(e.currentTarget, !0 === I);
					},
					onTouchStart: function (e) {
						M || "function" != typeof T || T(e),
							M &&
								i.props &&
								"function" == typeof i.props.onTouchStart &&
								i.props.onTouchStart(e),
							D && U && (0, m.onNavigationIntent)(e.currentTarget, !0 === I);
					},
				};
			return (
				(0, d.isAbsoluteUrl)(F)
					? (K.href = F)
					: (M && !P && ("a" !== i.type || "href" in i.props)) ||
						(K.href = (0, f.addBasePath)(F)),
				(y = M
					? l.default.cloneElement(i, K)
					: (0, a.jsx)("a", { ...z, ...K, children: o })),
				(0, a.jsx)(v.Provider, { value: b, children: y })
			);
		}
		e.r(63055);
		const v = (0, l.createContext)(m.IDLE_LINK_STATUS),
			b = () => (0, l.useContext)(v);
		("function" == typeof r.default ||
			("object" == typeof r.default && null !== r.default)) &&
			void 0 === r.default.__esModule &&
			(Object.defineProperty(r.default, "__esModule", { value: !0 }),
			Object.assign(r.default, r),
			(t.exports = r.default));
	},
	10283,
	(e) => {
		"use strict";
		var t = e.i(57319);
		const r = (...e) =>
				e
					.filter((e, t, r) => !!e && "" !== e.trim() && r.indexOf(e) === t)
					.join(" ")
					.trim(),
			n = (e) => {
				const t = e.replace(/^([A-Z])|[\s-_]+(\w)/g, (e, t, r) =>
					r ? r.toUpperCase() : t.toLowerCase(),
				);
				return t.charAt(0).toUpperCase() + t.slice(1);
			};
		var o = {
			xmlns: "http://www.w3.org/2000/svg",
			width: 24,
			height: 24,
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: 2,
			strokeLinecap: "round",
			strokeLinejoin: "round",
		};
		const i = (0, t.forwardRef)(
			(
				{
					color: e = "currentColor",
					size: n = 24,
					strokeWidth: i = 2,
					absoluteStrokeWidth: a,
					className: l = "",
					children: s,
					iconNode: u,
					...c
				},
				d,
			) =>
				(0, t.createElement)(
					"svg",
					{
						ref: d,
						...o,
						width: n,
						height: n,
						stroke: e,
						strokeWidth: a ? (24 * Number(i)) / Number(n) : i,
						className: r("lucide", l),
						...(!s &&
							!((e) => {
								for (const t in e)
									if (t.startsWith("aria-") || "role" === t || "title" === t)
										return !0;
								return !1;
							})(c) && { "aria-hidden": "true" }),
						...c,
					},
					[
						...u.map(([e, r]) => (0, t.createElement)(e, r)),
						...(Array.isArray(s) ? s : [s]),
					],
				),
		);
		e.s(
			[
				"default",
				0,
				(e, o) => {
					const a = (0, t.forwardRef)(({ className: a, ...l }, s) =>
						(0, t.createElement)(i, {
							ref: s,
							iconNode: o,
							className: r(
								`lucide-${n(e)
									.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
									.toLowerCase()}`,
								`lucide-${e}`,
								a,
							),
							...l,
						}),
					);
					return (a.displayName = n(e)), a;
				},
			],
			10283,
		);
	},
	33833,
	(e) => {
		"use strict";
		var t = e.i(57319),
			r = e.i(86460),
			n = e.i(9671),
			o = e.i(62613),
			i = [
				"a",
				"button",
				"div",
				"form",
				"h2",
				"h3",
				"img",
				"input",
				"label",
				"li",
				"nav",
				"ol",
				"p",
				"select",
				"span",
				"svg",
				"ul",
			].reduce((e, r) => {
				const i = (0, n.createSlot)(`Primitive.${r}`),
					a = t.forwardRef((e, t) => {
						const { asChild: n, ...a } = e;
						return (
							"u" > typeof window && (window[Symbol.for("radix-ui")] = !0),
							(0, o.jsx)(n ? i : r, { ...a, ref: t })
						);
					});
				return (a.displayName = `Primitive.${r}`), { ...e, [r]: a };
			}, {});
		e.s([
			"Primitive",
			0,
			i,
			"dispatchDiscreteCustomEvent",
			0,
			function (e, t) {
				e && r.flushSync(() => e.dispatchEvent(t));
			},
		]);
	},
	31589,
	(e) => {
		"use strict";
		var t = e.i(62613),
			r = e.i(57319),
			n = e.i(33833),
			o = "horizontal",
			i = ["horizontal", "vertical"],
			a = r.forwardRef((e, r) => {
				var a;
				const { decorative: l, orientation: s = o, ...u } = e,
					c = ((a = s), i.includes(a)) ? s : o;
				return (0, t.jsx)(n.Primitive.div, {
					"data-orientation": c,
					...(l
						? { role: "none" }
						: {
								"aria-orientation": "vertical" === c ? c : void 0,
								role: "separator",
							}),
					...u,
					ref: r,
				});
			});
		a.displayName = "Separator";
		var l = e.i(49696);
		e.s(
			[
				"Separator",
				0,
				function ({
					className: e,
					orientation: r = "horizontal",
					decorative: n = !0,
					...o
				}) {
					return (0, t.jsx)(a, {
						"data-slot": "separator",
						decorative: n,
						orientation: r,
						className: (0, l.cn)(
							"bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
							e,
						),
						...o,
					});
				},
			],
			31589,
		);
	},
	15246,
	13575,
	(e) => {
		"use strict";
		var t = e.i(57319),
			r = e.i(62613);
		e.s(
			[
				"createContextScope",
				0,
				function (e, n = []) {
					let o = [],
						i = () => {
							const r = o.map((e) => t.createContext(e));
							return function (n) {
								const o = n?.[e] || r;
								return t.useMemo(
									() => ({ [`__scope${e}`]: { ...n, [e]: o } }),
									[n, o],
								);
							};
						};
					return (
						(i.scopeName = e),
						[
							function (n, i) {
								const a = t.createContext(i);
								a.displayName = n + "Context";
								const l = o.length;
								o = [...o, i];
								const s = (n) => {
									const { scope: o, children: i, ...s } = n,
										u = o?.[e]?.[l] || a,
										c = t.useMemo(() => s, Object.values(s));
									return (0, r.jsx)(u.Provider, { value: c, children: i });
								};
								return (
									(s.displayName = n + "Provider"),
									[
										s,
										function (r, o) {
											const s = o?.[e]?.[l] || a,
												u = t.useContext(s);
											if (u) return u;
											if (void 0 !== i) return i;
											throw Error(`\`${r}\` must be used within \`${n}\``);
										},
									]
								);
							},
							(function (...e) {
								const r = e[0];
								if (1 === e.length) return r;
								const n = () => {
									const n = e.map((e) => ({
										useScope: e(),
										scopeName: e.scopeName,
									}));
									return function (e) {
										const o = n.reduce((t, { useScope: r, scopeName: n }) => {
											const o = r(e)[`__scope${n}`];
											return { ...t, ...o };
										}, {});
										return t.useMemo(
											() => ({ [`__scope${r.scopeName}`]: o }),
											[o],
										);
									};
								};
								return (n.scopeName = r.scopeName), n;
							})(i, ...n),
						]
					);
				},
			],
			15246,
		);
		var n = globalThis?.document ? t.useLayoutEffect : () => {};
		e.s(["useLayoutEffect", 0, n], 13575);
	},
	9964,
	(e) => {
		"use strict";
		var t = e.i(57319);
		e.s([
			"useCallbackRef",
			0,
			function (e) {
				const r = t.useRef(e);
				return (
					t.useEffect(() => {
						r.current = e;
					}),
					t.useMemo(
						() =>
							(...e) =>
								r.current?.(...e),
						[],
					)
				);
			},
		]);
	},
	11185,
	(e) => {
		"use strict";
		var t = e.i(62613),
			r = e.i(57319),
			n = e.i(15246),
			o = e.i(9964),
			i = e.i(13575),
			a = e.i(33833),
			l = "Avatar",
			[s, u] = (0, n.createContextScope)(l),
			c = [0, () => void 0],
			[d, f] = s(l),
			p = r.forwardRef((e, n) => {
				const { __scopeAvatar: o, ...i } = e,
					[l, s] = r.useState("idle"),
					[u, f] = (function () {
						let e = c;
						{
							const [t] = (e = r.useState(0)),
								n = r.useRef(!1);
							r.useEffect(() => {
								t > 1 &&
									!n.current &&
									((n.current = !0),
									console.warn(
										"Avatar: Only one `Avatar.Image` component should be rendered per `Avatar.Root`, but multiple were detected. This will lead to unexpected behavior.",
									));
							}, [t]);
						}
						return e;
					})();
				return (0, t.jsx)(d, {
					scope: o,
					imageLoadingStatus: l,
					setImageLoadingStatus: s,
					imageCount: u,
					setImageCount: f,
					children: (0, t.jsx)(a.Primitive.span, { ...i, ref: n }),
				});
			});
		p.displayName = l;
		var m = "AvatarImage",
			h = r.forwardRef((e, n) => {
				var l;
				const { __scopeAvatar: s, src: u, onLoadingStatusChange: c, ...d } = e,
					p = f(m, s);
				(l = p.setImageCount),
					r.useEffect(
						() => (
							l((e) => e + 1),
							() => {
								l((e) => e - 1);
							}
						),
						[l],
					);
				const h = (function (
						e,
						{
							loadingStatus: t,
							setLoadingStatus: r,
							referrerPolicy: n,
							crossOrigin: o,
						},
					) {
						return (
							(0, i.useLayoutEffect)(() => {
								if (!e) return void r("error");
								const t = new window.Image(),
									i = (e) => {
										r(v(e.currentTarget));
									},
									a = () => r("error");
								return (
									t.addEventListener("load", i),
									t.addEventListener("error", a),
									n && (t.referrerPolicy = n),
									(t.crossOrigin = o ?? null),
									(t.src = e),
									r(v(t)),
									() => {
										t.removeEventListener("load", i),
											t.removeEventListener("error", a),
											r("idle");
									}
								);
							}, [e, o, n, r]),
							t
						);
					})(u, {
						referrerPolicy: d.referrerPolicy,
						crossOrigin: d.crossOrigin,
						loadingStatus: p.imageLoadingStatus,
						setLoadingStatus: p.setImageLoadingStatus,
					}),
					g = (0, o.useCallbackRef)((e) => {
						c?.(e);
					}),
					y = r.useRef(h);
				return (
					(0, i.useLayoutEffect)(() => {
						const e = y.current;
						(y.current = h), h !== e && g(h);
					}, [h, g]),
					"loaded" === h
						? (0, t.jsx)(a.Primitive.img, { ...d, ref: n, src: u })
						: null
				);
			});
		h.displayName = m;
		var g = "AvatarFallback",
			y = r.forwardRef((e, n) => {
				const { __scopeAvatar: o, delayMs: i, ...l } = e,
					s = f(g, o),
					[u, c] = r.useState(void 0 === i);
				return (
					r.useEffect(() => {
						if (void 0 !== i) {
							const e = window.setTimeout(() => c(!0), i);
							return () => window.clearTimeout(e);
						}
					}, [i]),
					u && "loaded" !== s.imageLoadingStatus
						? (0, t.jsx)(a.Primitive.span, { ...l, ref: n })
						: null
				);
			});
		function v(e) {
			return e.complete ? (e.naturalWidth > 0 ? "loaded" : "error") : "loading";
		}
		y.displayName = g;
		var b = e.i(49696);
		e.s(
			[
				"Avatar",
				0,
				function ({ className: e, ...r }) {
					return (0, t.jsx)(p, {
						"data-slot": "avatar",
						className: (0, b.cn)(
							"relative flex size-8 shrink-0 overflow-hidden rounded-full",
							e,
						),
						...r,
					});
				},
				"AvatarFallback",
				0,
				function ({ className: e, ...r }) {
					return (0, t.jsx)(y, {
						"data-slot": "avatar-fallback",
						className: (0, b.cn)(
							"bg-muted flex size-full items-center justify-center rounded-full",
							e,
						),
						...r,
					});
				},
				"AvatarImage",
				0,
				function ({ className: e, ...r }) {
					return (0, t.jsx)(h, {
						"data-slot": "avatar-image",
						className: (0, b.cn)("aspect-square size-full", e),
						...r,
					});
				},
			],
			11185,
		);
	},
	29574,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 }),
			Object.defineProperty(r, "default", {
				enumerable: !0,
				get: function () {
					return l;
				},
			});
		const n = e.r(57319),
			o = "u" < typeof window,
			i = o ? () => {} : n.useLayoutEffect,
			a = o ? () => {} : n.useEffect;
		function l(e) {
			const { headManager: t, reduceComponentsToState: r } = e;
			function l() {
				if (t && t.mountedInstances) {
					const e = n.Children.toArray(
						Array.from(t.mountedInstances).filter(Boolean),
					);
					t.updateHead(r(e));
				}
			}
			return (
				o && (t?.mountedInstances?.add(e.children), l()),
				i(
					() => (
						t?.mountedInstances?.add(e.children),
						() => {
							t?.mountedInstances?.delete(e.children);
						}
					),
				),
				i(
					() => (
						t && (t._pendingUpdate = l),
						() => {
							t && (t._pendingUpdate = l);
						}
					),
				),
				a(
					() => (
						t &&
							t._pendingUpdate &&
							(t._pendingUpdate(), (t._pendingUpdate = null)),
						() => {
							t &&
								t._pendingUpdate &&
								(t._pendingUpdate(), (t._pendingUpdate = null));
						}
					),
				),
				null
			);
		}
	},
	49171,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 });
		var n = {
			default: function () {
				return h;
			},
			defaultHead: function () {
				return d;
			},
		};
		for (var o in n) Object.defineProperty(r, o, { enumerable: !0, get: n[o] });
		const i = e.r(81210),
			a = e.r(43148),
			l = e.r(62613),
			s = a._(e.r(57319)),
			u = i._(e.r(29574)),
			c = e.r(28118);
		function d() {
			return [
				(0, l.jsx)("meta", { charSet: "utf-8" }, "charset"),
				(0, l.jsx)(
					"meta",
					{ name: "viewport", content: "width=device-width" },
					"viewport",
				),
			];
		}
		function f(e, t) {
			return "string" == typeof t || "number" == typeof t
				? e
				: t.type === s.default.Fragment
					? e.concat(
							s.default.Children.toArray(t.props.children).reduce(
								(e, t) =>
									"string" == typeof t || "number" == typeof t
										? e
										: e.concat(t),
								[],
							),
						)
					: e.concat(t);
		}
		e.r(50517);
		const p = ["name", "httpEquiv", "charSet", "itemProp"];
		function m(e) {
			let t, r, n, o;
			return e
				.reduce(f, [])
				.reverse()
				.concat(d().reverse())
				.filter(
					((t = new Set()),
					(r = new Set()),
					(n = new Set()),
					(o = {}),
					(e) => {
						let i = !0,
							a = !1;
						if (e.key && "number" != typeof e.key && e.key.indexOf("$") > 0) {
							a = !0;
							const r = e.key.slice(e.key.indexOf("$") + 1);
							t.has(r) ? (i = !1) : t.add(r);
						}
						switch (e.type) {
							case "title":
							case "base":
								r.has(e.type) ? (i = !1) : r.add(e.type);
								break;
							case "meta":
								for (let t = 0, r = p.length; t < r; t++) {
									const r = p[t];
									if (e.props.hasOwnProperty(r))
										if ("charSet" === r) n.has(r) ? (i = !1) : n.add(r);
										else {
											const t = e.props[r],
												n = o[r] || new Set();
											("name" !== r || !a) && n.has(t)
												? (i = !1)
												: (n.add(t), (o[r] = n));
										}
								}
						}
						return i;
					}),
				)
				.reverse()
				.map((e, t) => {
					const r = e.key || t;
					return s.default.cloneElement(e, { key: r });
				});
		}
		const h = function ({ children: e }) {
			const t = (0, s.useContext)(c.HeadManagerContext);
			return (0, l.jsx)(u.default, {
				reduceComponentsToState: m,
				headManager: t,
				children: e,
			});
		};
		("function" == typeof r.default ||
			("object" == typeof r.default && null !== r.default)) &&
			void 0 === r.default.__esModule &&
			(Object.defineProperty(r.default, "__esModule", { value: !0 }),
			Object.assign(r.default, r),
			(t.exports = r.default));
	},
	5611,
	(e, t, r) => {
		"use strict";
		function n({
			widthInt: e,
			heightInt: t,
			blurWidth: r,
			blurHeight: o,
			blurDataURL: i,
			objectFit: a,
		}) {
			const l = r ? 40 * r : e,
				s = o ? 40 * o : t,
				u = l && s ? `viewBox='0 0 ${l} ${s}'` : "";
			return `%3Csvg xmlns='http://www.w3.org/2000/svg' ${u}%3E%3Cfilter id='b' color-interpolation-filters='sRGB'%3E%3CfeGaussianBlur stdDeviation='20'/%3E%3CfeColorMatrix values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 100 -1' result='s'/%3E%3CfeFlood x='0' y='0' width='100%25' height='100%25'/%3E%3CfeComposite operator='out' in='s'/%3E%3CfeComposite in2='SourceGraphic'/%3E%3CfeGaussianBlur stdDeviation='20'/%3E%3C/filter%3E%3Cimage width='100%25' height='100%25' x='0' y='0' preserveAspectRatio='${u ? "none" : "contain" === a ? "xMidYMid" : "cover" === a ? "xMidYMid slice" : "none"}' style='filter: url(%23b);' href='${i}'/%3E%3C/svg%3E`;
		}
		Object.defineProperty(r, "__esModule", { value: !0 }),
			Object.defineProperty(r, "getImageBlurSvg", {
				enumerable: !0,
				get: function () {
					return n;
				},
			});
	},
	52669,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 });
		var n = {
			VALID_LOADERS: function () {
				return i;
			},
			imageConfigDefault: function () {
				return a;
			},
		};
		for (var o in n) Object.defineProperty(r, o, { enumerable: !0, get: n[o] });
		const i = ["default", "imgix", "cloudinary", "akamai", "custom"],
			a = {
				deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
				imageSizes: [32, 48, 64, 96, 128, 256, 384],
				path: "/_next/image",
				loader: "default",
				loaderFile: "",
				domains: [],
				disableStaticImages: !1,
				minimumCacheTTL: 14400,
				formats: ["image/webp"],
				maximumDiskCacheSize: void 0,
				maximumRedirects: 3,
				maximumResponseBody: 5e7,
				dangerouslyAllowLocalIP: !1,
				dangerouslyAllowSVG: !1,
				contentSecurityPolicy: "script-src 'none'; frame-src 'none'; sandbox;",
				contentDispositionType: "attachment",
				localPatterns: void 0,
				remotePatterns: [],
				qualities: [75],
				unoptimized: !1,
				customCacheHandler: !1,
			};
	},
	51003,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 }),
			Object.defineProperty(r, "getImgProps", {
				enumerable: !0,
				get: function () {
					return u;
				},
			}),
			e.r(50517);
		const n = e.r(53832),
			o = e.r(5611),
			i = e.r(52669),
			a = ["-moz-initial", "fill", "none", "scale-down", void 0];
		function l(e) {
			return void 0 !== e.default;
		}
		function s(e) {
			return void 0 === e
				? e
				: "number" == typeof e
					? Number.isFinite(e)
						? e
						: NaN
					: "string" == typeof e && /^[0-9]+$/.test(e)
						? parseInt(e, 10)
						: NaN;
		}
		function u(
			{
				src: e,
				sizes: t,
				unoptimized: r = !1,
				priority: c = !1,
				preload: d = !1,
				loading: f,
				className: p,
				quality: m,
				width: h,
				height: g,
				fill: y = !1,
				style: v,
				overrideSrc: b,
				onLoad: w,
				onLoadingComplete: x,
				placeholder: _ = "empty",
				blurDataURL: j,
				fetchPriority: C,
				decoding: E = "async",
				layout: P,
				objectFit: S,
				objectPosition: O,
				lazyBoundary: k,
				lazyRoot: R,
				...N
			},
			T,
		) {
			var M;
			let $,
				L,
				A,
				{ imgConf: I, showAltText: z, blurComplete: D, defaultLoader: U } = T,
				B = I || i.imageConfigDefault;
			if ("allSizes" in B) $ = B;
			else {
				const e = [...B.deviceSizes, ...B.imageSizes].sort((e, t) => e - t),
					t = B.deviceSizes.sort((e, t) => e - t),
					r = B.qualities?.sort((e, t) => e - t);
				$ = { ...B, allSizes: e, deviceSizes: t, qualities: r };
			}
			if (void 0 === U)
				throw Object.defineProperty(
					Error(
						"images.loaderFile detected but the file is missing default export.\nRead more: https://nextjs.org/docs/messages/invalid-images-config",
					),
					"__NEXT_ERROR_CODE",
					{ value: "E163", enumerable: !1, configurable: !0 },
				);
			let F = N.loader || U;
			delete N.loader, delete N.srcSet;
			const W = "__next_img_default" in F;
			if (W) {
				if ("custom" === $.loader)
					throw Object.defineProperty(
						Error(`Image with src "${e}" is missing "loader" prop.
Read more: https://nextjs.org/docs/messages/next-image-missing-loader`),
						"__NEXT_ERROR_CODE",
						{ value: "E252", enumerable: !1, configurable: !0 },
					);
			} else {
				const e = F;
				F = (t) => {
					const { config: r, ...n } = t;
					return e(n);
				};
			}
			if (P) {
				"fill" === P && (y = !0);
				const e = {
					intrinsic: { maxWidth: "100%", height: "auto" },
					responsive: { width: "100%", height: "auto" },
				}[P];
				e && (v = { ...v, ...e });
				const r = { responsive: "100vw", fill: "100vw" }[P];
				r && !t && (t = r);
			}
			let q = "",
				K = s(h),
				H = s(g);
			if ((M = e) && "object" == typeof M && (l(M) || void 0 !== M.src)) {
				const t = l(e) ? e.default : e;
				if (!t.src)
					throw Object.defineProperty(
						Error(
							`An object should only be passed to the image component src parameter if it comes from a static image import. It must include src. Received ${JSON.stringify(t)}`,
						),
						"__NEXT_ERROR_CODE",
						{ value: "E460", enumerable: !1, configurable: !0 },
					);
				if (!t.height || !t.width)
					throw Object.defineProperty(
						Error(
							`An object should only be passed to the image component src parameter if it comes from a static image import. It must include height and width. Received ${JSON.stringify(t)}`,
						),
						"__NEXT_ERROR_CODE",
						{ value: "E48", enumerable: !1, configurable: !0 },
					);
				if (
					((L = t.blurWidth),
					(A = t.blurHeight),
					(j = j || t.blurDataURL),
					(q = t.src),
					!y)
				)
					if (K || H) {
						if (K && !H) {
							const e = K / t.width;
							H = Math.round(t.height * e);
						} else if (!K && H) {
							const e = H / t.height;
							K = Math.round(t.width * e);
						}
					} else (K = t.width), (H = t.height);
			}
			let V = !c && !d && ("lazy" === f || void 0 === f);
			(!(e = "string" == typeof e ? e : q) ||
				e.startsWith("data:") ||
				e.startsWith("blob:")) &&
				((r = !0), (V = !1)),
				$.unoptimized && (r = !0),
				W &&
					!$.dangerouslyAllowSVG &&
					e.split("?", 1)[0].endsWith(".svg") &&
					(r = !0);
			const X = s(m),
				G = Object.assign(
					y
						? {
								position: "absolute",
								height: "100%",
								width: "100%",
								left: 0,
								top: 0,
								right: 0,
								bottom: 0,
								objectFit: S,
								objectPosition: O,
							}
						: {},
					z ? {} : { color: "transparent" },
					v,
				),
				Q =
					D || "empty" === _
						? null
						: "blur" === _
							? `url("data:image/svg+xml;charset=utf-8,${(0, o.getImageBlurSvg)({ widthInt: K, heightInt: H, blurWidth: L, blurHeight: A, blurDataURL: j || "", objectFit: G.objectFit })}")`
							: `url("${_}")`,
				J = a.includes(G.objectFit)
					? "fill" === G.objectFit
						? "100% 100%"
						: "cover"
					: G.objectFit,
				Z = Q
					? {
							backgroundSize: J,
							backgroundPosition: G.objectPosition || "50% 50%",
							backgroundRepeat: "no-repeat",
							backgroundImage: Q,
						}
					: {},
				Y = (function ({
					config: e,
					src: t,
					unoptimized: r,
					width: o,
					quality: i,
					sizes: a,
					loader: l,
				}) {
					if (r) {
						if (t.startsWith("/") && !t.startsWith("//")) {
							const e = (0, n.getDeploymentId)();
							if (e) {
								const r = t.indexOf("?");
								if (-1 !== r) {
									const n = new URLSearchParams(t.slice(r + 1));
									n.get("dpl") ||
										(n.append("dpl", e),
										(t = t.slice(0, r) + "?" + n.toString()));
								} else t += `?dpl=${e}`;
							}
						}
						return { src: t, srcSet: void 0, sizes: void 0 };
					}
					const { widths: s, kind: u } = (function (
							{ deviceSizes: e, allSizes: t },
							r,
							n,
						) {
							if (n) {
								const r = /(^|\s)(1?\d?\d)vw/g,
									o = [];
								for (let e; (e = r.exec(n)); ) o.push(parseInt(e[2]));
								if (o.length) {
									const r = 0.01 * Math.min(...o);
									return { widths: t.filter((t) => t >= e[0] * r), kind: "w" };
								}
								return { widths: t, kind: "w" };
							}
							return "number" != typeof r
								? { widths: e, kind: "w" }
								: {
										widths: [
											...new Set(
												[r, 2 * r].map(
													(e) => t.find((t) => t >= e) || t[t.length - 1],
												),
											),
										],
										kind: "x",
									};
						})(e, o, a),
						c = s.length - 1;
					return {
						sizes: a || "w" !== u ? a : "100vw",
						srcSet: s
							.map(
								(r, n) =>
									`${l({ config: e, src: t, quality: i, width: r })} ${"w" === u ? r : n + 1}${u}`,
							)
							.join(", "),
						src: l({ config: e, src: t, quality: i, width: s[c] }),
					};
				})({
					config: $,
					src: e,
					unoptimized: r,
					width: K,
					quality: X,
					sizes: t,
					loader: F,
				}),
				ee = V ? "lazy" : f;
			return {
				props: {
					...N,
					loading: ee,
					fetchPriority: C,
					width: K,
					height: H,
					decoding: E,
					className: p,
					style: { ...G, ...Z },
					sizes: Y.sizes,
					srcSet: Y.srcSet,
					src: b || Y.src,
				},
				meta: { unoptimized: r, preload: d || c, placeholder: _, fill: y },
			};
		}
	},
	70480,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 }),
			Object.defineProperty(r, "ImageConfigContext", {
				enumerable: !0,
				get: function () {
					return i;
				},
			});
		const n = e.r(81210)._(e.r(57319)),
			o = e.r(52669),
			i = n.default.createContext(o.imageConfigDefault);
	},
	1349,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 }),
			Object.defineProperty(r, "RouterContext", {
				enumerable: !0,
				get: function () {
					return n;
				},
			});
		const n = e.r(81210)._(e.r(57319)).default.createContext(null);
	},
	35784,
	(e, t, r) => {
		"use strict";
		function n(e, t) {
			const r = e || 75;
			return t?.qualities?.length
				? t.qualities.reduce(
						(e, t) => (Math.abs(t - r) < Math.abs(e - r) ? t : e),
						t.qualities[0],
					)
				: r;
		}
		Object.defineProperty(r, "__esModule", { value: !0 }),
			Object.defineProperty(r, "findClosestQuality", {
				enumerable: !0,
				get: function () {
					return n;
				},
			});
	},
	97664,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 }),
			Object.defineProperty(r, "default", {
				enumerable: !0,
				get: function () {
					return a;
				},
			});
		const n = e.r(35784),
			o = e.r(53832);
		function i({ config: e, src: t, width: r, quality: a }) {
			let l = (0, o.getDeploymentId)();
			if (t.startsWith("/") && !t.startsWith("//")) {
				const e = t.indexOf("?");
				if (-1 !== e) {
					const r = new URLSearchParams(t.slice(e + 1)),
						n = r.get("dpl");
					if (n) {
						(l = n), r.delete("dpl");
						const o = r.toString();
						t = t.slice(0, e) + (o ? "?" + o : "");
					}
				}
			}
			if (
				t.startsWith("/") &&
				t.includes("?") &&
				e.localPatterns?.length === 1 &&
				"**" === e.localPatterns[0].pathname &&
				"" === e.localPatterns[0].search
			)
				throw Object.defineProperty(
					Error(`Image with src "${t}" is using a query string which is not configured in images.localPatterns.
Read more: https://nextjs.org/docs/messages/next-image-unconfigured-localpatterns`),
					"__NEXT_ERROR_CODE",
					{ value: "E871", enumerable: !1, configurable: !0 },
				);
			const s = (0, n.findClosestQuality)(a, e);
			return `${e.path}?url=${encodeURIComponent(t)}&w=${r}&q=${s}${t.startsWith("/") && l ? `&dpl=${l}` : ""}`;
		}
		i.__next_img_default = !0;
		const a = i;
	},
	56744,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 }),
			Object.defineProperty(r, "Image", {
				enumerable: !0,
				get: function () {
					return w;
				},
			});
		const n = e.r(81210),
			o = e.r(43148),
			i = e.r(62613),
			a = o._(e.r(57319)),
			l = n._(e.r(86460)),
			s = n._(e.r(49171)),
			u = e.r(51003),
			c = e.r(52669),
			d = e.r(70480);
		e.r(50517);
		const f = e.r(1349),
			p = n._(e.r(97664)),
			m = e.r(43746),
			h = {
				deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
				imageSizes: [32, 48, 64, 96, 128, 256, 384],
				qualities: [75],
				path: "/_next/image",
				loader: "default",
				dangerouslyAllowSVG: !1,
				unoptimized: !1,
			};
		function g(e, t, r, n, o, i, a) {
			const l = e?.src;
			e &&
				e["data-loaded-src"] !== l &&
				((e["data-loaded-src"] = l),
				("decode" in e ? e.decode() : Promise.resolve())
					.catch(() => {})
					.then(() => {
						if (e.parentElement && e.isConnected) {
							if (("empty" !== t && o(!0), r?.current)) {
								const t = new Event("load");
								Object.defineProperty(t, "target", { writable: !1, value: e });
								let n = !1,
									o = !1;
								r.current({
									...t,
									nativeEvent: t,
									currentTarget: e,
									target: e,
									isDefaultPrevented: () => n,
									isPropagationStopped: () => o,
									persist: () => {},
									preventDefault: () => {
										(n = !0), t.preventDefault();
									},
									stopPropagation: () => {
										(o = !0), t.stopPropagation();
									},
								});
							}
							n?.current && n.current(e);
						}
					}));
		}
		function y(e) {
			return a.use ? { fetchPriority: e } : { fetchpriority: e };
		}
		"u" < typeof window && (globalThis.__NEXT_IMAGE_IMPORTED = !0);
		const v = (0, a.forwardRef)(
			(
				{
					src: e,
					srcSet: t,
					sizes: r,
					height: n,
					width: o,
					decoding: l,
					className: s,
					style: u,
					fetchPriority: c,
					placeholder: d,
					loading: f,
					unoptimized: p,
					fill: h,
					onLoadRef: v,
					onLoadingCompleteRef: b,
					setBlurComplete: w,
					setShowAltText: x,
					sizesInput: _,
					onLoad: j,
					onError: C,
					...E
				},
				P,
			) => {
				const S = (0, a.useCallback)(
						(e) => {
							e && (C && (e.src = e.src), e.complete && g(e, d, v, b, w, p, _));
						},
						[e, d, v, b, w, C, p, _],
					),
					O = (0, m.useMergedRef)(P, S);
				return (0, i.jsx)("img", {
					...E,
					...y(c),
					loading: f,
					width: o,
					height: n,
					decoding: l,
					"data-nimg": h ? "fill" : "1",
					className: s,
					style: u,
					sizes: r,
					srcSet: t,
					src: e,
					ref: O,
					onLoad: (e) => {
						g(e.currentTarget, d, v, b, w, p, _);
					},
					onError: (e) => {
						x(!0), "empty" !== d && w(!0), C && C(e);
					},
				});
			},
		);
		function b({ isAppRouter: e, imgAttributes: t }) {
			const r = {
				as: "image",
				imageSrcSet: t.srcSet,
				imageSizes: t.sizes,
				crossOrigin: t.crossOrigin,
				referrerPolicy: t.referrerPolicy,
				...y(t.fetchPriority),
			};
			return e && l.default.preload
				? (l.default.preload(t.src, r), null)
				: (0, i.jsx)(s.default, {
						children: (0, i.jsx)(
							"link",
							{ rel: "preload", href: t.srcSet ? void 0 : t.src, ...r },
							"__nimg-" + t.src + t.srcSet + t.sizes,
						),
					});
		}
		const w = (0, a.forwardRef)((e, t) => {
			const r = (0, a.useContext)(f.RouterContext),
				n = (0, a.useContext)(d.ImageConfigContext),
				o = (0, a.useMemo)(() => {
					const e = h || n || c.imageConfigDefault,
						t = [...e.deviceSizes, ...e.imageSizes].sort((e, t) => e - t),
						r = e.deviceSizes.sort((e, t) => e - t),
						o = e.qualities?.sort((e, t) => e - t);
					return {
						...e,
						allSizes: t,
						deviceSizes: r,
						qualities: o,
						localPatterns:
							"u" < typeof window ? n?.localPatterns : e.localPatterns,
					};
				}, [n]),
				{ onLoad: l, onLoadingComplete: s } = e,
				m = (0, a.useRef)(l);
			(0, a.useEffect)(() => {
				m.current = l;
			}, [l]);
			const g = (0, a.useRef)(s);
			(0, a.useEffect)(() => {
				g.current = s;
			}, [s]);
			const [y, w] = (0, a.useState)(!1),
				[x, _] = (0, a.useState)(!1),
				{ props: j, meta: C } = (0, u.getImgProps)(e, {
					defaultLoader: p.default,
					imgConf: o,
					blurComplete: y,
					showAltText: x,
				});
			return (0, i.jsxs)(i.Fragment, {
				children: [
					(0, i.jsx)(v, {
						...j,
						unoptimized: C.unoptimized,
						placeholder: C.placeholder,
						fill: C.fill,
						onLoadRef: m,
						onLoadingCompleteRef: g,
						setBlurComplete: w,
						setShowAltText: _,
						sizesInput: e.sizes,
						ref: t,
					}),
					C.preload
						? (0, i.jsx)(b, { isAppRouter: !r, imgAttributes: j })
						: null,
				],
			});
		});
		("function" == typeof r.default ||
			("object" == typeof r.default && null !== r.default)) &&
			void 0 === r.default.__esModule &&
			(Object.defineProperty(r.default, "__esModule", { value: !0 }),
			Object.assign(r.default, r),
			(t.exports = r.default));
	},
	2190,
	(e) => {
		"use strict";
		const t = (0, e.i(10283).default)("copy", [
			[
				"rect",
				{
					width: "14",
					height: "14",
					x: "8",
					y: "8",
					rx: "2",
					ry: "2",
					key: "17jyea",
				},
			],
			[
				"path",
				{
					d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",
					key: "zix9uf",
				},
			],
		]);
		e.s(["default", 0, t]);
	},
	16247,
	(e) => {
		"use strict";
		var t = e.i(62613),
			r = e.i(57319),
			n = e.i(49696);
		const o = ({
			className: e,
			rows: o = 7,
			cols: i = 30,
			cellSize: a = 56,
			borderColor: l = "#3f3f46",
			fillColor: s = "rgba(14,165,233,0.3)",
			clickedCell: u = null,
			onCellClick: c = () => {},
			interactive: d = !0,
		}) => {
			const f = (0, r.useMemo)(
					() => Array.from({ length: o * i }, (e, t) => t),
					[o, i],
				),
				p = {
					display: "grid",
					gridTemplateColumns: `repeat(${i}, ${a}px)`,
					gridTemplateRows: `repeat(${o}, ${a}px)`,
					width: i * a,
					height: o * a,
					marginInline: "auto",
				};
			return (0, t.jsx)("div", {
				className: (0, n.cn)("relative z-[3]", e),
				style: p,
				children: f.map((e) => {
					const r = Math.floor(e / i),
						o = e % i,
						a = u ? Math.hypot(u.row - r, u.col - o) : 0,
						f = u ? Math.max(0, 55 * a) : 0,
						p = u
							? { "--delay": `${f}ms`, "--duration": `${200 + 80 * a}ms` }
							: {};
					return (0, t.jsx)(
						"div",
						{
							className: (0, n.cn)(
								"cell relative border-[0.5px] opacity-50 transition-opacity duration-150 will-change-transform hover:opacity-80",
								u && "animate-cell-ripple [animation-fill-mode:none]",
								!d && "pointer-events-none",
							),
							style: { backgroundColor: s, borderColor: l, ...p },
							onClick: d ? () => c?.(r, o) : void 0,
						},
						e,
					);
				}),
			});
		};
		e.s([
			"BackgroundRippleEffect",
			0,
			({ rows: e = 8, cols: i = 27, cellSize: a = 56 }) => {
				const [l, s] = (0, r.useState)(null),
					[u, c] = (0, r.useState)(0),
					d = (0, r.useRef)(null);
				return (0, t.jsx)("div", {
					ref: d,
					className: (0, n.cn)(
						"absolute inset-0 h-full w-full pointer-events-none",
						"[--cell-border-color:hsl(0_0%_92%)] [--cell-fill-color:hsl(0_0%_96%)] [--cell-shadow-color:hsl(0_0%_88%)]",
						"dark:[--cell-border-color:hsl(0_0%_15%)] dark:[--cell-fill-color:hsl(0_0%_9%)] dark:[--cell-shadow-color:hsl(0_0%_12%)]",
					),
					children: (0, t.jsxs)("div", {
						className:
							"relative h-auto w-auto overflow-hidden pointer-events-auto",
						children: [
							(0, t.jsx)("div", {
								className:
									"pointer-events-none absolute inset-0 z-[2] h-full w-full overflow-hidden",
							}),
							(0, t.jsx)(
								o,
								{
									className: "mask-radial-from-20% mask-radial-at-top",
									rows: e,
									cols: i,
									cellSize: a,
									borderColor: "var(--cell-border-color)",
									fillColor: "var(--cell-fill-color)",
									clickedCell: l,
									onCellClick: (e, t) => {
										s({ row: e, col: t }), c((e) => e + 1);
									},
									interactive: !0,
								},
								`base-${u}`,
							),
						],
					}),
				});
			},
		]);
	},
	80952,
	(e) => {
		"use strict";
		var t = e.i(57319),
			r = (e, t, r, n, o, i, a, l) => {
				const s = document.documentElement,
					u = ["light", "dark"];
				function c(t) {
					var r;
					(Array.isArray(e) ? e : [e]).forEach((e) => {
						const r = "class" === e,
							n = r && i ? o.map((e) => i[e] || e) : o;
						r
							? (s.classList.remove(...n),
								s.classList.add(i && i[t] ? i[t] : t))
							: s.setAttribute(e, t);
					}),
						(r = t),
						l && u.includes(r) && (s.style.colorScheme = r);
				}
				if (n) c(n);
				else
					try {
						const e = localStorage.getItem(t) || r,
							n =
								a && "system" === e
									? window.matchMedia("(prefers-color-scheme: dark)").matches
										? "dark"
										: "light"
									: e;
						c(n);
					} catch (e) {}
			},
			n = ["light", "dark"],
			o = "(prefers-color-scheme: dark)",
			i = "u" < typeof window,
			a = t.createContext(void 0),
			l = { setTheme: (e) => {}, themes: [] },
			s = ["light", "dark"],
			u = ({
				forcedTheme: e,
				disableTransitionOnChange: r = !1,
				enableSystem: i = !0,
				enableColorScheme: l = !0,
				storageKey: u = "theme",
				themes: m = s,
				defaultTheme: h = i ? "system" : "light",
				attribute: g = "data-theme",
				value: y,
				children: v,
				nonce: b,
				scriptProps: w,
			}) => {
				const [x, _] = t.useState(() => d(u, h)),
					[j, C] = t.useState(() => ("system" === x ? p() : x)),
					E = y ? Object.values(y) : m,
					P = t.useCallback(
						(e) => {
							let t = e;
							if (!t) return;
							"system" === e && i && (t = p());
							const o = y ? y[t] : t,
								a = r ? f(b) : null,
								s = document.documentElement,
								u = (e) => {
									"class" === e
										? (s.classList.remove(...E), o && s.classList.add(o))
										: e.startsWith("data-") &&
											(o ? s.setAttribute(e, o) : s.removeAttribute(e));
								};
							if ((Array.isArray(g) ? g.forEach(u) : u(g), l)) {
								const e = n.includes(h) ? h : null,
									r = n.includes(t) ? t : e;
								s.style.colorScheme = r;
							}
							null == a || a();
						},
						[b],
					),
					S = t.useCallback(
						(e) => {
							const t = "function" == typeof e ? e(x) : e;
							_(t);
							try {
								localStorage.setItem(u, t);
							} catch (e) {}
						},
						[x],
					),
					O = t.useCallback(
						(t) => {
							C(p(t)), "system" === x && i && !e && P("system");
						},
						[x, e],
					);
				t.useEffect(() => {
					const e = window.matchMedia(o);
					return e.addListener(O), O(e), () => e.removeListener(O);
				}, [O]),
					t.useEffect(() => {
						const e = (e) => {
							e.key === u && (e.newValue ? _(e.newValue) : S(h));
						};
						return (
							window.addEventListener("storage", e),
							() => window.removeEventListener("storage", e)
						);
					}, [S]),
					t.useEffect(() => {
						P(null != e ? e : x);
					}, [e, x]);
				const k = t.useMemo(
					() => ({
						theme: x,
						setTheme: S,
						forcedTheme: e,
						resolvedTheme: "system" === x ? j : x,
						themes: i ? [...m, "system"] : m,
						systemTheme: i ? j : void 0,
					}),
					[x, S, e, j, i, m],
				);
				return t.createElement(
					a.Provider,
					{ value: k },
					t.createElement(c, {
						forcedTheme: e,
						storageKey: u,
						attribute: g,
						enableSystem: i,
						enableColorScheme: l,
						defaultTheme: h,
						value: y,
						themes: m,
						nonce: b,
						scriptProps: w,
					}),
					v,
				);
			},
			c = t.memo(
				({
					forcedTheme: e,
					storageKey: n,
					attribute: o,
					enableSystem: i,
					enableColorScheme: a,
					defaultTheme: l,
					value: s,
					themes: u,
					nonce: c,
					scriptProps: d,
				}) => {
					const f = JSON.stringify([o, n, l, e, u, s, i, a]).slice(1, -1);
					return t.createElement("script", {
						...d,
						suppressHydrationWarning: !0,
						nonce: "u" < typeof window ? c : "",
						dangerouslySetInnerHTML: { __html: `(${r.toString()})(${f})` },
					});
				},
			),
			d = (e, t) => {
				let r;
				if (!i) {
					try {
						r = localStorage.getItem(e) || void 0;
					} catch (e) {}
					return r || t;
				}
			},
			f = (e) => {
				const t = document.createElement("style");
				return (
					e && t.setAttribute("nonce", e),
					t.appendChild(
						document.createTextNode(
							"*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}",
						),
					),
					document.head.appendChild(t),
					() => {
						window.getComputedStyle(document.body),
							setTimeout(() => {
								document.head.removeChild(t);
							}, 1);
					}
				);
			},
			p = (e) => (
				e || (e = window.matchMedia(o)), e.matches ? "dark" : "light"
			);
		e.s([
			"ThemeProvider",
			0,
			(e) =>
				t.useContext(a)
					? t.createElement(t.Fragment, null, e.children)
					: t.createElement(u, { ...e }),
			"useTheme",
			0,
			() => {
				var e;
				return null != (e = t.useContext(a)) ? e : l;
			},
		]);
	},
	53578,
	(e) => {
		"use strict";
		var t = e.i(62613),
			r = e.i(80952),
			n = e.i(88642);
		e.s([
			"ThemeToggle",
			0,
			function () {
				const { setTheme: e, resolvedTheme: o } = (0, r.useTheme)();
				return (0, t.jsxs)(n.Button, {
					variant: "link",
					size: "icon",
					onClick: () => e("light" === o ? "dark" : "light"),
					suppressHydrationWarning: !0,
					children: [
						(0, t.jsxs)("svg", {
							xmlns: "http://www.w3.org/2000/svg",
							width: "1em",
							height: "1em",
							viewBox: "0 0 24 24",
							className: "dark:hidden",
							suppressHydrationWarning: !0,
							children: [
								(0, t.jsxs)("g", {
									fill: "none",
									stroke: "#888888",
									strokeLinecap: "round",
									strokeLinejoin: "round",
									strokeWidth: "2",
									children: [
										(0, t.jsx)("path", {
											strokeDasharray: "2",
											strokeDashoffset: "0",
											d: "M12 21v1M21 12h1M12 3v-1M3 12h-1",
										}),
										(0, t.jsx)("path", {
											strokeDasharray: "2",
											strokeDashoffset: "0",
											d: "M18.5 18.5l0.5 0.5M18.5 5.5l0.5 -0.5M5.5 5.5l-0.5 -0.5M5.5 18.5l-0.5 0.5",
										}),
										(0, t.jsx)("animateTransform", {
											attributeName: "transform",
											dur: "30s",
											repeatCount: "indefinite",
											type: "rotate",
											values: "0 12 12;360 12 12",
										}),
									],
								}),
								(0, t.jsx)("circle", {
									cx: "12",
									cy: "12",
									r: "6",
									fill: "#424242",
								}),
							],
						}),
						(0, t.jsx)("svg", {
							className: "hidden dark:block h-6 w-5",
							viewBox: "0 0 32 32",
							fill: "none",
							xmlns: "http://www.w3.org/2000/svg",
							suppressHydrationWarning: !0,
							children: (0, t.jsx)("path", {
								d: "M16 2.66667V29.3333C19.5362 29.3333 22.9276 27.9286 25.4281 25.4281C27.9286 22.9276 29.3333 19.5362 29.3333 16C29.3333 12.4638 27.9286 9.07239 25.4281 6.57191C22.9276 4.07142 19.5362 2.66667 16 2.66667Z",
								fill: "#fff",
							}),
						}),
						(0, t.jsx)("span", {
							className: "sr-only",
							children: "Toggle theme",
						}),
					],
				});
			},
		]);
	},
	52271,
	(e) => {
		"use strict";
		var t = e.i(62613),
			r = e.i(82537);
		e.i(8343);
		var n = function () {
				return null;
			},
			o = e.i(57319),
			i = e.i(61645),
			a = e.i(93207),
			l = e.i(2190),
			l = l,
			s = e.i(69708);
		e.i(95360), e.i(11185), e.i(88642), e.i(31589);
		var u = e.i(76706);
		function c({ t: e, authorizationCode: r }) {
			const [n, u] = (0, o.useState)(!1);
			return (0, t.jsxs)("div", {
				className: "flex items-start gap-2 border bg-background p-4 rounded-lg",
				children: [
					(0, t.jsxs)("div", {
						className: "flex flex-col gap-2 text-xs",
						children: [
							(0, t.jsx)("p", {
								className: "font-semibold",
								children: "Having trouble being redirected?",
							}),
							(0, t.jsx)("p", {
								className: "text-muted-foreground",
								children: "Copy and paste the code into the app to continue.",
							}),
							(0, t.jsxs)("button", {
								onClick: () => {
									navigator.clipboard.writeText(r),
										u(!0),
										setTimeout(() => u(!1), 2e3);
								},
								className:
									"inline-flex items-center gap-2 text-muted-foreground pointer-events-auto! hover:text-foreground focus-visible:text-foreground transition-colors",
								children: [
									r,
									n
										? (0, t.jsx)(a.CheckIcon, { className: "size-3.5" })
										: (0, t.jsx)(l.default, { className: "size-3.5" }),
								],
							}),
						],
					}),
					(0, t.jsx)("button", {
						onClick: () => i.toast.dismiss(e),
						children: (0, t.jsx)(s.XIcon, { className: "size-3.5" }),
					}),
				],
			});
		}
		var d = e.i(93181),
			f = e.i(80952);
		function p({ children: e, ...r }) {
			return (0, t.jsx)(f.ThemeProvider, { ...r, children: e });
		}
		const m = ({ ...e }) => {
			const { theme: r = "system" } = (0, f.useTheme)();
			return (0, t.jsx)(i.Toaster, {
				theme: r,
				className: "toaster group",
				toastOptions: {
					classNames: {
						toast:
							"group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
						description: "group-[.toast]:text-muted-foreground",
						actionButton:
							"group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
						cancelButton:
							"group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
					},
				},
				...e,
			});
		};
		e.s(
			[
				"default",
				0,
				({ children: e }) => {
					const a = (0, d.getQueryClient)();
					return (
						(0, o.useEffect)(() => {
							try {
								const e = u.authClient.electron.getAuthorizationCode();
								e &&
									setTimeout(() => {
										i.toast.custom(
											(r) => (0, t.jsx)(c, { t: r, authorizationCode: e }),
											{ duration: 4e3 },
										);
									}, 1e3);
							} catch (e) {}
						}, []),
						(0, o.useEffect)(() => {
							try {
								const e = u.authClient.ensureElectronRedirect();
								return () => clearInterval(e);
							} catch (e) {}
						}, []),
						(0, t.jsx)(p, {
							attribute: "class",
							defaultTheme: "dark",
							children: (0, t.jsxs)(r.QueryClientProvider, {
								client: a,
								children: [
									(0, t.jsx)(n, {
										client: a,
										initialIsOpen: !1,
										buttonPosition: "bottom-right",
										position: "bottom",
									}),
									(0, t.jsx)(m, { richColors: !0, closeButton: !0 }),
									e,
								],
							}),
						})
					);
				},
			],
			52271,
		);
	},
]);
