(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
	"object" == typeof document ? document.currentScript : void 0,
	46743,
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
	66744,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 });
		var n = {
			assign: function () {
				return l;
			},
			searchParamsToUrlQuery: function () {
				return i;
			},
			urlQueryToSearchParams: function () {
				return s;
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
		function s(e) {
			const t = new URLSearchParams();
			for (const [r, n] of Object.entries(e))
				if (Array.isArray(n)) for (const e of n) t.append(r, a(e));
				else t.set(r, a(n));
			return t;
		}
		function l(e, ...t) {
			for (const r of t) {
				for (const t of r.keys()) e.delete(t);
				for (const [t, n] of r.entries()) e.append(t, n);
			}
			return e;
		}
	},
	21313,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 });
		var n = {
			DecodeError: function () {
				return v;
			},
			MiddlewareNotFoundError: function () {
				return w;
			},
			MissingStaticPage: function () {
				return x;
			},
			NormalizeError: function () {
				return y;
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
				return l;
			},
			isResSent: function () {
				return f;
			},
			loadGetInitialProps: function () {
				return p;
			},
			normalizeRepeatedSlashes: function () {
				return m;
			},
			stringifyError: function () {
				return j;
			},
		};
		for (var o in n) Object.defineProperty(r, o, { enumerable: !0, get: n[o] });
		const i = ["CLS", "FCP", "FID", "INP", "LCP", "TTFB"];
		function a(e) {
			let t,
				r = !1;
			return (...n) => (r || ((r = !0), (t = e(...n))), t);
		}
		const s = /^[a-zA-Z][a-zA-Z\d+\-.]*?:/,
			l = (e) => s.test(e);
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
		function m(e) {
			const t = e.split("?");
			return (
				t[0].replace(/\\/g, "/").replace(/\/\/+/g, "/") +
				(t[1] ? `?${t.slice(1).join("?")}` : "")
			);
		}
		async function p(e, t) {
			const r = t.res || (t.ctx && t.ctx.res);
			if (!e.getInitialProps)
				return t.ctx && t.Component
					? { pageProps: await p(t.Component, t.ctx) }
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
		class v extends Error {}
		class y extends Error {}
		class b extends Error {
			constructor(e) {
				super(),
					(this.code = "ENOENT"),
					(this.name = "PageNotFoundError"),
					(this.message = `Cannot find module for page: ${e}`);
			}
		}
		class x extends Error {
			constructor(e, t) {
				super(),
					(this.message = `Failed to load static file for page: ${e} ${t}`);
			}
		}
		class w extends Error {
			constructor() {
				super(),
					(this.code = "ENOENT"),
					(this.message = "Cannot find the middleware module");
			}
		}
		function j(e) {
			return JSON.stringify({ message: e.message, stack: e.stack });
		}
	},
	48921,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 }),
			Object.defineProperty(r, "useMergedRef", {
				enumerable: !0,
				get: function () {
					return o;
				},
			});
		const n = e.r(92479);
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
	41323,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 });
		var n = {
			formatUrl: function () {
				return s;
			},
			formatWithValidation: function () {
				return u;
			},
			urlObjectKeys: function () {
				return l;
			},
		};
		for (var o in n) Object.defineProperty(r, o, { enumerable: !0, get: n[o] });
		const i = e.r(34691)._(e.r(66744)),
			a = /https?|ftp|gopher|file/;
		function s(e) {
			let { auth: t, hostname: r } = e,
				n = e.protocol || "",
				o = e.pathname || "",
				s = e.hash || "",
				l = e.query || "",
				u = !1;
			(t = t ? encodeURIComponent(t).replace(/%3A/i, ":") + "@" : ""),
				e.host
					? (u = t + e.host)
					: r &&
						((u = t + (~r.indexOf(":") ? `[${r}]` : r)),
						e.port && (u += ":" + e.port)),
				l && "object" == typeof l && (l = String(i.urlQueryToSearchParams(l)));
			let c = e.search || (l && `?${l}`) || "";
			return (
				n && !n.endsWith(":") && (n += ":"),
				e.slashes || ((!n || a.test(n)) && !1 !== u)
					? ((u = "//" + (u || "")), o && "/" !== o[0] && (o = "/" + o))
					: u || (u = ""),
				s && "#" !== s[0] && (s = "#" + s),
				c && "?" !== c[0] && (c = "?" + c),
				(o = o.replace(/[?#]/g, encodeURIComponent)),
				(c = c.replace("#", "%23")),
				`${n}${u}${o}${c}${s}`
			);
		}
		const l = [
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
			return s(e);
		}
	},
	85202,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 }),
			Object.defineProperty(r, "isLocalURL", {
				enumerable: !0,
				get: function () {
					return i;
				},
			});
		const n = e.r(21313),
			o = e.r(97266);
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
	23796,
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
	9373,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 });
		var n = {
			default: function () {
				return v;
			},
			useLinkStatus: function () {
				return b;
			},
		};
		for (var o in n) Object.defineProperty(r, o, { enumerable: !0, get: n[o] });
		const i = e.r(34691),
			a = e.r(620),
			s = i._(e.r(92479)),
			l = e.r(41323),
			u = e.r(30563),
			c = e.r(48921),
			d = e.r(21313),
			f = e.r(90851);
		e.r(46743);
		const m = e.r(50164),
			p = e.r(50022),
			h = e.r(85202),
			g = e.r(51220);
		function v(t) {
			var r, n;
			let o,
				i,
				v,
				[b, x] = (0, s.useOptimistic)(p.IDLE_LINK_STATUS),
				w = (0, s.useRef)(null),
				{
					href: j,
					as: C,
					children: _,
					prefetch: S = null,
					passHref: E,
					replace: P,
					shallow: k,
					scroll: O,
					onClick: N,
					onMouseEnter: T,
					onTouchStart: R,
					legacyBehavior: M = !1,
					onNavigate: z,
					transitionTypes: A,
					ref: I,
					unstable_dynamicOnHover: L,
					...$
				} = t;
			(o = _),
				M &&
					("string" == typeof o || "number" == typeof o) &&
					(o = (0, a.jsx)("a", { children: o }));
			const D = s.default.useContext(u.AppRouterContext),
				U = !1 !== S,
				B =
					!1 !== S
						? null === (n = S) || "auto" === n
							? g.FetchStrategy.PPR
							: g.FetchStrategy.Full
						: g.FetchStrategy.PPR,
				F = "string" == typeof (r = C || j) ? r : (0, l.formatUrl)(r);
			if (M) {
				if (o?.$$typeof === Symbol.for("react.lazy"))
					throw Object.defineProperty(
						Error(
							"`<Link legacyBehavior>` received a direct child that is either a Server Component, or JSX that was loaded with React.lazy(). This is not supported. Either remove legacyBehavior, or make the direct child a Client Component that renders the Link's `<a>` tag.",
						),
						"__NEXT_ERROR_CODE",
						{ value: "E863", enumerable: !1, configurable: !0 },
					);
				i = s.default.Children.only(o);
			}
			const W = M ? i && "object" == typeof i && i.ref : I,
				q = s.default.useCallback(
					(e) => (
						null !== D &&
							(w.current = (0, p.mountLinkInstance)(e, F, D, B, U, x)),
						() => {
							w.current &&
								((0, p.unmountLinkForCurrentNavigation)(w.current),
								(w.current = null)),
								(0, p.unmountPrefetchableInstance)(e);
						}
					),
					[U, F, D, B, x],
				),
				H = {
					ref: (0, c.useMergedRef)(q, W),
					onClick(t) {
						M || "function" != typeof N || N(t),
							M &&
								i.props &&
								"function" == typeof i.props.onClick &&
								i.props.onClick(t),
							!D ||
								t.defaultPrevented ||
								(function (t, r, n, o, i, a, l) {
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
										const { dispatchNavigateAction: d } = e.r(21241);
										s.default.startTransition(() => {
											d(
												r,
												o ? "replace" : "push",
												!1 === i
													? m.ScrollBehavior.NoScroll
													: m.ScrollBehavior.Default,
												n.current,
												l,
											);
										});
									}
								})(t, F, w, P, O, z, A);
					},
					onMouseEnter(e) {
						M || "function" != typeof T || T(e),
							M &&
								i.props &&
								"function" == typeof i.props.onMouseEnter &&
								i.props.onMouseEnter(e),
							D && U && (0, p.onNavigationIntent)(e.currentTarget, !0 === L);
					},
					onTouchStart: function (e) {
						M || "function" != typeof R || R(e),
							M &&
								i.props &&
								"function" == typeof i.props.onTouchStart &&
								i.props.onTouchStart(e),
							D && U && (0, p.onNavigationIntent)(e.currentTarget, !0 === L);
					},
				};
			return (
				(0, d.isAbsoluteUrl)(F)
					? (H.href = F)
					: (M && !E && ("a" !== i.type || "href" in i.props)) ||
						(H.href = (0, f.addBasePath)(F)),
				(v = M
					? s.default.cloneElement(i, H)
					: (0, a.jsx)("a", { ...$, ...H, children: o })),
				(0, a.jsx)(y.Provider, { value: b, children: v })
			);
		}
		e.r(23796);
		const y = (0, s.createContext)(p.IDLE_LINK_STATUS),
			b = () => (0, s.useContext)(y);
		("function" == typeof r.default ||
			("object" == typeof r.default && null !== r.default)) &&
			void 0 === r.default.__esModule &&
			(Object.defineProperty(r.default, "__esModule", { value: !0 }),
			Object.assign(r.default, r),
			(t.exports = r.default));
	},
	13236,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 }),
			Object.defineProperty(r, "default", {
				enumerable: !0,
				get: function () {
					return s;
				},
			});
		const n = e.r(92479),
			o = "u" < typeof window,
			i = o ? () => {} : n.useLayoutEffect,
			a = o ? () => {} : n.useEffect;
		function s(e) {
			const { headManager: t, reduceComponentsToState: r } = e;
			function s() {
				if (t && t.mountedInstances) {
					const e = n.Children.toArray(
						Array.from(t.mountedInstances).filter(Boolean),
					);
					t.updateHead(r(e));
				}
			}
			return (
				o && (t?.mountedInstances?.add(e.children), s()),
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
						t && (t._pendingUpdate = s),
						() => {
							t && (t._pendingUpdate = s);
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
	21277,
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
		const i = e.r(7658),
			a = e.r(34691),
			s = e.r(620),
			l = a._(e.r(92479)),
			u = i._(e.r(13236)),
			c = e.r(55808);
		function d() {
			return [
				(0, s.jsx)("meta", { charSet: "utf-8" }, "charset"),
				(0, s.jsx)(
					"meta",
					{ name: "viewport", content: "width=device-width" },
					"viewport",
				),
			];
		}
		function f(e, t) {
			return "string" == typeof t || "number" == typeof t
				? e
				: t.type === l.default.Fragment
					? e.concat(
							l.default.Children.toArray(t.props.children).reduce(
								(e, t) =>
									"string" == typeof t || "number" == typeof t
										? e
										: e.concat(t),
								[],
							),
						)
					: e.concat(t);
		}
		e.r(46743);
		const m = ["name", "httpEquiv", "charSet", "itemProp"];
		function p(e) {
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
								for (let t = 0, r = m.length; t < r; t++) {
									const r = m[t];
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
					return l.default.cloneElement(e, { key: r });
				});
		}
		const h = function ({ children: e }) {
			const t = (0, l.useContext)(c.HeadManagerContext);
			return (0, s.jsx)(u.default, {
				reduceComponentsToState: p,
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
	90075,
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
			const s = r ? 40 * r : e,
				l = o ? 40 * o : t,
				u = s && l ? `viewBox='0 0 ${s} ${l}'` : "";
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
	38112,
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
	96716,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 }),
			Object.defineProperty(r, "getImgProps", {
				enumerable: !0,
				get: function () {
					return u;
				},
			}),
			e.r(46743);
		const n = e.r(50841),
			o = e.r(90075),
			i = e.r(38112),
			a = ["-moz-initial", "fill", "none", "scale-down", void 0];
		function s(e) {
			return void 0 !== e.default;
		}
		function l(e) {
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
				className: m,
				quality: p,
				width: h,
				height: g,
				fill: v = !1,
				style: y,
				overrideSrc: b,
				onLoad: x,
				onLoadingComplete: w,
				placeholder: j = "empty",
				blurDataURL: C,
				fetchPriority: _,
				decoding: S = "async",
				layout: E,
				objectFit: P,
				objectPosition: k,
				lazyBoundary: O,
				lazyRoot: N,
				...T
			},
			R,
		) {
			var M;
			let z,
				A,
				I,
				{ imgConf: L, showAltText: $, blurComplete: D, defaultLoader: U } = R,
				B = L || i.imageConfigDefault;
			if ("allSizes" in B) z = B;
			else {
				const e = [...B.deviceSizes, ...B.imageSizes].sort((e, t) => e - t),
					t = B.deviceSizes.sort((e, t) => e - t),
					r = B.qualities?.sort((e, t) => e - t);
				z = { ...B, allSizes: e, deviceSizes: t, qualities: r };
			}
			if (void 0 === U)
				throw Object.defineProperty(
					Error(
						"images.loaderFile detected but the file is missing default export.\nRead more: https://nextjs.org/docs/messages/invalid-images-config",
					),
					"__NEXT_ERROR_CODE",
					{ value: "E163", enumerable: !1, configurable: !0 },
				);
			let F = T.loader || U;
			delete T.loader, delete T.srcSet;
			const W = "__next_img_default" in F;
			if (W) {
				if ("custom" === z.loader)
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
			if (E) {
				"fill" === E && (v = !0);
				const e = {
					intrinsic: { maxWidth: "100%", height: "auto" },
					responsive: { width: "100%", height: "auto" },
				}[E];
				e && (y = { ...y, ...e });
				const r = { responsive: "100vw", fill: "100vw" }[E];
				r && !t && (t = r);
			}
			let q = "",
				H = l(h),
				K = l(g);
			if ((M = e) && "object" == typeof M && (s(M) || void 0 !== M.src)) {
				const t = s(e) ? e.default : e;
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
					((A = t.blurWidth),
					(I = t.blurHeight),
					(C = C || t.blurDataURL),
					(q = t.src),
					!v)
				)
					if (H || K) {
						if (H && !K) {
							const e = H / t.width;
							K = Math.round(t.height * e);
						} else if (!H && K) {
							const e = K / t.height;
							H = Math.round(t.width * e);
						}
					} else (H = t.width), (K = t.height);
			}
			let V = !c && !d && ("lazy" === f || void 0 === f);
			(!(e = "string" == typeof e ? e : q) ||
				e.startsWith("data:") ||
				e.startsWith("blob:")) &&
				((r = !0), (V = !1)),
				z.unoptimized && (r = !0),
				W &&
					!z.dangerouslyAllowSVG &&
					e.split("?", 1)[0].endsWith(".svg") &&
					(r = !0);
			const X = l(p),
				G = Object.assign(
					v
						? {
								position: "absolute",
								height: "100%",
								width: "100%",
								left: 0,
								top: 0,
								right: 0,
								bottom: 0,
								objectFit: P,
								objectPosition: k,
							}
						: {},
					$ ? {} : { color: "transparent" },
					y,
				),
				Q =
					D || "empty" === j
						? null
						: "blur" === j
							? `url("data:image/svg+xml;charset=utf-8,${(0, o.getImageBlurSvg)({ widthInt: H, heightInt: K, blurWidth: A, blurHeight: I, blurDataURL: C || "", objectFit: G.objectFit })}")`
							: `url("${j}")`,
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
					loader: s,
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
					const { widths: l, kind: u } = (function (
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
						c = l.length - 1;
					return {
						sizes: a || "w" !== u ? a : "100vw",
						srcSet: l
							.map(
								(r, n) =>
									`${s({ config: e, src: t, quality: i, width: r })} ${"w" === u ? r : n + 1}${u}`,
							)
							.join(", "),
						src: s({ config: e, src: t, quality: i, width: l[c] }),
					};
				})({
					config: z,
					src: e,
					unoptimized: r,
					width: H,
					quality: X,
					sizes: t,
					loader: F,
				}),
				ee = V ? "lazy" : f;
			return {
				props: {
					...T,
					loading: ee,
					fetchPriority: _,
					width: H,
					height: K,
					decoding: S,
					className: m,
					style: { ...G, ...Z },
					sizes: Y.sizes,
					srcSet: Y.srcSet,
					src: b || Y.src,
				},
				meta: { unoptimized: r, preload: d || c, placeholder: j, fill: v },
			};
		}
	},
	16277,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 }),
			Object.defineProperty(r, "ImageConfigContext", {
				enumerable: !0,
				get: function () {
					return i;
				},
			});
		const n = e.r(7658)._(e.r(92479)),
			o = e.r(38112),
			i = n.default.createContext(o.imageConfigDefault);
	},
	26714,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 }),
			Object.defineProperty(r, "RouterContext", {
				enumerable: !0,
				get: function () {
					return n;
				},
			});
		const n = e.r(7658)._(e.r(92479)).default.createContext(null);
	},
	50815,
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
	57028,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 }),
			Object.defineProperty(r, "default", {
				enumerable: !0,
				get: function () {
					return a;
				},
			});
		const n = e.r(50815),
			o = e.r(50841);
		function i({ config: e, src: t, width: r, quality: a }) {
			let s = (0, o.getDeploymentId)();
			if (t.startsWith("/") && !t.startsWith("//")) {
				const e = t.indexOf("?");
				if (-1 !== e) {
					const r = new URLSearchParams(t.slice(e + 1)),
						n = r.get("dpl");
					if (n) {
						(s = n), r.delete("dpl");
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
			const l = (0, n.findClosestQuality)(a, e);
			return `${e.path}?url=${encodeURIComponent(t)}&w=${r}&q=${l}${t.startsWith("/") && s ? `&dpl=${s}` : ""}`;
		}
		i.__next_img_default = !0;
		const a = i;
	},
	44317,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 }),
			Object.defineProperty(r, "Image", {
				enumerable: !0,
				get: function () {
					return x;
				},
			});
		const n = e.r(7658),
			o = e.r(34691),
			i = e.r(620),
			a = o._(e.r(92479)),
			s = n._(e.r(93908)),
			l = n._(e.r(21277)),
			u = e.r(96716),
			c = e.r(38112),
			d = e.r(16277);
		e.r(46743);
		const f = e.r(26714),
			m = n._(e.r(57028)),
			p = e.r(48921),
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
			const s = e?.src;
			e &&
				e["data-loaded-src"] !== s &&
				((e["data-loaded-src"] = s),
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
		function v(e) {
			return a.use ? { fetchPriority: e } : { fetchpriority: e };
		}
		"u" < typeof window && (globalThis.__NEXT_IMAGE_IMPORTED = !0);
		const y = (0, a.forwardRef)(
			(
				{
					src: e,
					srcSet: t,
					sizes: r,
					height: n,
					width: o,
					decoding: s,
					className: l,
					style: u,
					fetchPriority: c,
					placeholder: d,
					loading: f,
					unoptimized: m,
					fill: h,
					onLoadRef: y,
					onLoadingCompleteRef: b,
					setBlurComplete: x,
					setShowAltText: w,
					sizesInput: j,
					onLoad: C,
					onError: _,
					...S
				},
				E,
			) => {
				const P = (0, a.useCallback)(
						(e) => {
							e && (_ && (e.src = e.src), e.complete && g(e, d, y, b, x, m, j));
						},
						[e, d, y, b, x, _, m, j],
					),
					k = (0, p.useMergedRef)(E, P);
				return (0, i.jsx)("img", {
					...S,
					...v(c),
					loading: f,
					width: o,
					height: n,
					decoding: s,
					"data-nimg": h ? "fill" : "1",
					className: l,
					style: u,
					sizes: r,
					srcSet: t,
					src: e,
					ref: k,
					onLoad: (e) => {
						g(e.currentTarget, d, y, b, x, m, j);
					},
					onError: (e) => {
						w(!0), "empty" !== d && x(!0), _ && _(e);
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
				...v(t.fetchPriority),
			};
			return e && s.default.preload
				? (s.default.preload(t.src, r), null)
				: (0, i.jsx)(l.default, {
						children: (0, i.jsx)(
							"link",
							{ rel: "preload", href: t.srcSet ? void 0 : t.src, ...r },
							"__nimg-" + t.src + t.srcSet + t.sizes,
						),
					});
		}
		const x = (0, a.forwardRef)((e, t) => {
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
				{ onLoad: s, onLoadingComplete: l } = e,
				p = (0, a.useRef)(s);
			(0, a.useEffect)(() => {
				p.current = s;
			}, [s]);
			const g = (0, a.useRef)(l);
			(0, a.useEffect)(() => {
				g.current = l;
			}, [l]);
			const [v, x] = (0, a.useState)(!1),
				[w, j] = (0, a.useState)(!1),
				{ props: C, meta: _ } = (0, u.getImgProps)(e, {
					defaultLoader: m.default,
					imgConf: o,
					blurComplete: v,
					showAltText: w,
				});
			return (0, i.jsxs)(i.Fragment, {
				children: [
					(0, i.jsx)(y, {
						...C,
						unoptimized: _.unoptimized,
						placeholder: _.placeholder,
						fill: _.fill,
						onLoadRef: p,
						onLoadingCompleteRef: g,
						setBlurComplete: x,
						setShowAltText: j,
						sizesInput: e.sizes,
						ref: t,
					}),
					_.preload
						? (0, i.jsx)(b, { isAppRouter: !r, imgAttributes: C })
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
	44240,
	41296,
	(e) => {
		"use strict";
		var t = e.i(92479),
			r = e.i(620);
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
								const s = o.length;
								o = [...o, i];
								const l = (n) => {
									const { scope: o, children: i, ...l } = n,
										u = o?.[e]?.[s] || a,
										c = t.useMemo(() => l, Object.values(l));
									return (0, r.jsx)(u.Provider, { value: c, children: i });
								};
								return (
									(l.displayName = n + "Provider"),
									[
										l,
										function (r, o) {
											const l = o?.[e]?.[s] || a,
												u = t.useContext(l);
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
			44240,
		);
		var n = globalThis?.document ? t.useLayoutEffect : () => {};
		e.s(["useLayoutEffect", 0, n], 41296);
	},
	40093,
	(e) => {
		"use strict";
		var t = e.i(92479);
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
	92766,
	(e) => {
		"use strict";
		var t = e.i(620),
			r = e.i(92479),
			n = e.i(44240),
			o = e.i(40093),
			i = e.i(41296),
			a = e.i(95353),
			s = "Avatar",
			[l, u] = (0, n.createContextScope)(s),
			c = [0, () => void 0],
			[d, f] = l(s),
			m = r.forwardRef((e, n) => {
				const { __scopeAvatar: o, ...i } = e,
					[s, l] = r.useState("idle"),
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
					imageLoadingStatus: s,
					setImageLoadingStatus: l,
					imageCount: u,
					setImageCount: f,
					children: (0, t.jsx)(a.Primitive.span, { ...i, ref: n }),
				});
			});
		m.displayName = s;
		var p = "AvatarImage",
			h = r.forwardRef((e, n) => {
				var s;
				const { __scopeAvatar: l, src: u, onLoadingStatusChange: c, ...d } = e,
					m = f(p, l);
				(s = m.setImageCount),
					r.useEffect(
						() => (
							s((e) => e + 1),
							() => {
								s((e) => e - 1);
							}
						),
						[s],
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
										r(y(e.currentTarget));
									},
									a = () => r("error");
								return (
									t.addEventListener("load", i),
									t.addEventListener("error", a),
									n && (t.referrerPolicy = n),
									(t.crossOrigin = o ?? null),
									(t.src = e),
									r(y(t)),
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
						loadingStatus: m.imageLoadingStatus,
						setLoadingStatus: m.setImageLoadingStatus,
					}),
					g = (0, o.useCallbackRef)((e) => {
						c?.(e);
					}),
					v = r.useRef(h);
				return (
					(0, i.useLayoutEffect)(() => {
						const e = v.current;
						(v.current = h), h !== e && g(h);
					}, [h, g]),
					"loaded" === h
						? (0, t.jsx)(a.Primitive.img, { ...d, ref: n, src: u })
						: null
				);
			});
		h.displayName = p;
		var g = "AvatarFallback",
			v = r.forwardRef((e, n) => {
				const { __scopeAvatar: o, delayMs: i, ...s } = e,
					l = f(g, o),
					[u, c] = r.useState(void 0 === i);
				return (
					r.useEffect(() => {
						if (void 0 !== i) {
							const e = window.setTimeout(() => c(!0), i);
							return () => window.clearTimeout(e);
						}
					}, [i]),
					u && "loaded" !== l.imageLoadingStatus
						? (0, t.jsx)(a.Primitive.span, { ...s, ref: n })
						: null
				);
			});
		function y(e) {
			return e.complete ? (e.naturalWidth > 0 ? "loaded" : "error") : "loading";
		}
		v.displayName = g;
		var b = e.i(13732);
		e.s(
			[
				"Avatar",
				0,
				function ({ className: e, ...r }) {
					return (0, t.jsx)(m, {
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
					return (0, t.jsx)(v, {
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
			92766,
		);
	},
	37146,
	(e, t, r) => {
		t.exports = e.r(25471);
	},
	95353,
	(e) => {
		"use strict";
		var t = e.i(92479),
			r = e.i(93908),
			n = e.i(62910),
			o = e.i(620),
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
	54762,
	(e) => {
		"use strict";
		var t = e.i(92479);
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
					className: s = "",
					children: l,
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
						className: r("lucide", s),
						...(!l &&
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
						...(Array.isArray(l) ? l : [l]),
					],
				),
		);
		e.s(
			[
				"default",
				0,
				(e, o) => {
					const a = (0, t.forwardRef)(({ className: a, ...s }, l) =>
						(0, t.createElement)(i, {
							ref: l,
							iconNode: o,
							className: r(
								`lucide-${n(e)
									.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
									.toLowerCase()}`,
								`lucide-${e}`,
								a,
							),
							...s,
						}),
					);
					return (a.displayName = n(e)), a;
				},
			],
			54762,
		);
	},
	72811,
	(e) => {
		"use strict";
		const t = (0, e.i(54762).default)("loader-circle", [
			["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }],
		]);
		e.s(["Loader2", 0, t], 72811);
	},
	79817,
	(e) => {
		"use strict";
		var t = e.i(620),
			r = e.i(92479),
			n = e.i(95353),
			o = "horizontal",
			i = ["horizontal", "vertical"],
			a = r.forwardRef((e, r) => {
				var a;
				const { decorative: s, orientation: l = o, ...u } = e,
					c = ((a = l), i.includes(a)) ? l : o;
				return (0, t.jsx)(n.Primitive.div, {
					"data-orientation": c,
					...(s
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
		var s = e.i(13732);
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
						className: (0, s.cn)(
							"bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
							e,
						),
						...o,
					});
				},
			],
			79817,
		);
	},
	44435,
	(e) => {
		"use strict";
		const t = (0, e.i(54762).default)("check", [
			["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }],
		]);
		e.s(["default", 0, t]);
	},
	67613,
	(e) => {
		"use strict";
		const t = (0, e.i(54762).default)("x", [
			["path", { d: "M18 6 6 18", key: "1bl5f8" }],
			["path", { d: "m6 6 12 12", key: "d8bk6v" }],
		]);
		e.s(["default", 0, t]);
	},
	82265,
	(e) => {
		"use strict";
		var t = e.i(67613);
		e.s(["XIcon", () => t.default]);
	},
	52047,
	(e) => {
		"use strict";
		var t = e.i(44435);
		e.s(["CheckIcon", () => t.default]);
	},
	36397,
	(e) => {
		"use strict";
		const t = (0, e.i(54762).default)("copy", [
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
	48577,
	(e) => {
		"use strict";
		var t = e.i(620),
			r = e.i(52047),
			n = e.i(36397),
			n = n,
			o = e.i(72811);
		const i = (0, e.i(54762).default)("log-in", [
			["path", { d: "m10 17 5-5-5-5", key: "1bsop3" }],
			["path", { d: "M15 12H3", key: "6jk70r" }],
			[
				"path",
				{ d: "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4", key: "u53s6r" },
			],
		]);
		var a = e.i(82265),
			s = e.i(37146),
			l = e.i(92479),
			u = e.i(16003),
			c = e.i(92766),
			d = e.i(92192),
			f = e.i(79817),
			m = e.i(30208);
		function p({ session: e, isLoading: r, onContinue: n }) {
			return (0, t.jsxs)("button", {
				type: "button",
				className:
					"group flex w-full items-center gap-2.5 bg-background p-2.5 border border-border rounded-md drop-shadow-md hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-left disabled:pointer-events-none",
				"aria-label": `Continue as ${e.user.name}`,
				disabled: r,
				onClick: n,
				children: [
					(0, t.jsxs)(c.Avatar, {
						className: "size-9 shrink-0",
						children: [
							(0, t.jsx)(c.AvatarImage, {
								src: e.user.image ?? void 0,
								alt: e.user.name,
							}),
							(0, t.jsx)(c.AvatarFallback, {
								children: e.user.name
									.normalize("NFD")
									.split(" ", 2)
									.map((e) => e.charAt(0))
									.join("")
									.toUpperCase(),
							}),
						],
					}),
					(0, t.jsxs)("div", {
						className: "min-w-0 flex-1 truncate max-w-46 overflow-hidden",
						children: [
							(0, t.jsx)("p", {
								className: "truncate text-sm font-medium",
								children: e.user.name,
							}),
							(0, t.jsx)("p", {
								className: "truncate text-xs text-muted-foreground",
								children: e.user.email,
							}),
						],
					}),
					(0, t.jsx)("div", {
						className: (0, d.buttonVariants)({
							variant: "outline",
							size: "icon",
							className:
								"ms-auto size-8! group-hover:bg-accent group-hover:text-accent-foreground",
						}),
						children: r
							? (0, t.jsx)(o.Loader2, { className: "size-3.5 animate-spin" })
							: (0, t.jsx)(i, { className: "size-3.5" }),
					}),
				],
			});
		}
		e.s(
			[
				"ElectronManualSignInToast",
				0,
				function ({ t: e, authorizationCode: o }) {
					const [i, s] = (0, l.useState)(!1);
					return (0, t.jsxs)("div", {
						className:
							"flex items-start gap-2 border bg-background p-4 rounded-lg",
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
										children:
											"Copy and paste the code into the app to continue.",
									}),
									(0, t.jsxs)("button", {
										onClick: () => {
											navigator.clipboard.writeText(o),
												s(!0),
												setTimeout(() => s(!1), 2e3);
										},
										className:
											"inline-flex items-center gap-2 text-muted-foreground pointer-events-auto! hover:text-foreground focus-visible:text-foreground transition-colors",
										children: [
											o,
											i
												? (0, t.jsx)(r.CheckIcon, { className: "size-3.5" })
												: (0, t.jsx)(n.default, { className: "size-3.5" }),
										],
									}),
								],
							}),
							(0, t.jsx)("button", {
								onClick: () => u.toast.dismiss(e),
								children: (0, t.jsx)(a.XIcon, { className: "size-3.5" }),
							}),
						],
					});
				},
				"ElectronTransferUser",
				0,
				function ({ session: e }) {
					const o = Object.fromEntries((0, s.useSearchParams)().entries()),
						[i, a] = (0, l.useTransition)(),
						[u, c] = (0, l.useState)([e]),
						[d, h] = (0, l.useState)(null),
						[g, v] = (0, l.useState)(!1);
					(0, l.useEffect)(() => {
						a(async () => {
							const { data: t } =
								await m.authClient.multiSession.listDeviceSessions();
							t?.length &&
								c((r) => {
									const n = new Set(r.map((e) => e.user.id));
									return [
										...r,
										...t.filter(
											(t) =>
												!(t.user.id === e.user.id || n.has(t.user.id)) &&
												(n.add(t.user.id), !0),
										),
									];
								});
						});
					}, []);
					const y = (0, l.useCallback)(
						(t) => () =>
							a(async () => {
								if ((h(null), t.user.id === e.user.id))
									return void (await m.authClient.electron.transferUser({
										fetchOptions: {
											query: o,
											onSuccess: (e) => {
												h(e.data?.electron_authorization_code ?? null);
											},
										},
									}));
								const r = e.session.token;
								await m.authClient.multiSession.setActive({
									sessionToken: t.session.token,
								});
								const n = m.authClient.electron.transferUser({
									fetchOptions: {
										query: o,
										onSuccess: (e) => {
											h(e.data?.electron_authorization_code ?? null);
										},
									},
								});
								await m.authClient.multiSession.setActive({ sessionToken: r }),
									await n;
							}),
						[o, e],
					);
					return (0, t.jsxs)("div", {
						className: "space-y-2 max-w-sm min-w-3xs",
						children: [
							(0, t.jsx)("p", {
								className: "text-sm font-medium",
								children: "Continue as:",
							}),
							(0, t.jsx)(f.Separator, {}),
							u.map((e) =>
								(0, t.jsx)(
									p,
									{ session: e, isLoading: i, onContinue: y(e) },
									e.user.id,
								),
							),
							d &&
								(0, t.jsxs)("p", {
									className: "text-xs text-muted-foreground leading-relaxed",
									children: [
										(0, t.jsx)("span", {
											className: "font-medium",
											children: "Having trouble being redirected?",
										}),
										" ",
										"Paste the code into the app:",
										" ",
										(0, t.jsxs)("button", {
											onClick: () => {
												navigator.clipboard.writeText(d),
													v(!0),
													setTimeout(() => v(!1), 2e3);
											},
											className:
												"inline-flex items-center gap-2 hover:text-foreground focus-visible:text-foreground transition-colors",
											children: [
												d,
												g
													? (0, t.jsx)(r.CheckIcon, { className: "size-3.5" })
													: (0, t.jsx)(n.default, { className: "size-3.5" }),
											],
										}),
									],
								}),
						],
					});
				},
			],
			48577,
		);
	},
	38099,
	(e) => {
		"use strict";
		var t = e.i(620),
			r = e.i(92479),
			n = e.i(13732);
		const o = ({
			className: e,
			rows: o = 7,
			cols: i = 30,
			cellSize: a = 56,
			borderColor: s = "#3f3f46",
			fillColor: l = "rgba(14,165,233,0.3)",
			clickedCell: u = null,
			onCellClick: c = () => {},
			interactive: d = !0,
		}) => {
			const f = (0, r.useMemo)(
					() => Array.from({ length: o * i }, (e, t) => t),
					[o, i],
				),
				m = {
					display: "grid",
					gridTemplateColumns: `repeat(${i}, ${a}px)`,
					gridTemplateRows: `repeat(${o}, ${a}px)`,
					width: i * a,
					height: o * a,
					marginInline: "auto",
				};
			return (0, t.jsx)("div", {
				className: (0, n.cn)("relative z-[3]", e),
				style: m,
				children: f.map((e) => {
					const r = Math.floor(e / i),
						o = e % i,
						a = u ? Math.hypot(u.row - r, u.col - o) : 0,
						f = u ? Math.max(0, 55 * a) : 0,
						m = u
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
							style: { backgroundColor: l, borderColor: s, ...m },
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
				const [s, l] = (0, r.useState)(null),
					[u, c] = (0, r.useState)(0),
					d = (0, r.useRef)(null);
				return (0, t.jsx)("div", {
					ref: d,
					className: (0, n.cn)(
						"absolute inset-0 h-full w-full pointer-events-none",
						"[--cell-border-color:hsl(0_0%_85%)] [--cell-fill-color:hsl(0_0%_97%)] [--cell-shadow-color:hsl(0_0%_80%)]",
						"dark:[--cell-border-color:hsl(20_14.3%_15%)] dark:[--cell-fill-color:hsl(20_14.3%_7%)] dark:[--cell-shadow-color:hsl(20_14.3%_12%)]",
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
									clickedCell: s,
									onCellClick: (e, t) => {
										l({ row: e, col: t }), c((e) => e + 1);
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
	42123,
	(e) => {
		"use strict";
		var t = e.i(92479),
			r = (e, t, r, n, o, i, a, s) => {
				const l = document.documentElement,
					u = ["light", "dark"];
				function c(t) {
					var r;
					(Array.isArray(e) ? e : [e]).forEach((e) => {
						const r = "class" === e,
							n = r && i ? o.map((e) => i[e] || e) : o;
						r
							? (l.classList.remove(...n),
								l.classList.add(i && i[t] ? i[t] : t))
							: l.setAttribute(e, t);
					}),
						(r = t),
						s && u.includes(r) && (l.style.colorScheme = r);
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
			s = { setTheme: (e) => {}, themes: [] },
			l = ["light", "dark"],
			u = ({
				forcedTheme: e,
				disableTransitionOnChange: r = !1,
				enableSystem: i = !0,
				enableColorScheme: s = !0,
				storageKey: u = "theme",
				themes: p = l,
				defaultTheme: h = i ? "system" : "light",
				attribute: g = "data-theme",
				value: v,
				children: y,
				nonce: b,
				scriptProps: x,
			}) => {
				const [w, j] = t.useState(() => d(u, h)),
					[C, _] = t.useState(() => ("system" === w ? m() : w)),
					S = v ? Object.values(v) : p,
					E = t.useCallback(
						(e) => {
							let t = e;
							if (!t) return;
							"system" === e && i && (t = m());
							const o = v ? v[t] : t,
								a = r ? f(b) : null,
								l = document.documentElement,
								u = (e) => {
									"class" === e
										? (l.classList.remove(...S), o && l.classList.add(o))
										: e.startsWith("data-") &&
											(o ? l.setAttribute(e, o) : l.removeAttribute(e));
								};
							if ((Array.isArray(g) ? g.forEach(u) : u(g), s)) {
								const e = n.includes(h) ? h : null,
									r = n.includes(t) ? t : e;
								l.style.colorScheme = r;
							}
							null == a || a();
						},
						[b],
					),
					P = t.useCallback(
						(e) => {
							const t = "function" == typeof e ? e(w) : e;
							j(t);
							try {
								localStorage.setItem(u, t);
							} catch (e) {}
						},
						[w],
					),
					k = t.useCallback(
						(t) => {
							_(m(t)), "system" === w && i && !e && E("system");
						},
						[w, e],
					);
				t.useEffect(() => {
					const e = window.matchMedia(o);
					return e.addListener(k), k(e), () => e.removeListener(k);
				}, [k]),
					t.useEffect(() => {
						const e = (e) => {
							e.key === u && (e.newValue ? j(e.newValue) : P(h));
						};
						return (
							window.addEventListener("storage", e),
							() => window.removeEventListener("storage", e)
						);
					}, [P]),
					t.useEffect(() => {
						E(null != e ? e : w);
					}, [e, w]);
				const O = t.useMemo(
					() => ({
						theme: w,
						setTheme: P,
						forcedTheme: e,
						resolvedTheme: "system" === w ? C : w,
						themes: i ? [...p, "system"] : p,
						systemTheme: i ? C : void 0,
					}),
					[w, P, e, C, i, p],
				);
				return t.createElement(
					a.Provider,
					{ value: O },
					t.createElement(c, {
						forcedTheme: e,
						storageKey: u,
						attribute: g,
						enableSystem: i,
						enableColorScheme: s,
						defaultTheme: h,
						value: v,
						themes: p,
						nonce: b,
						scriptProps: x,
					}),
					y,
				);
			},
			c = t.memo(
				({
					forcedTheme: e,
					storageKey: n,
					attribute: o,
					enableSystem: i,
					enableColorScheme: a,
					defaultTheme: s,
					value: l,
					themes: u,
					nonce: c,
					scriptProps: d,
				}) => {
					const f = JSON.stringify([o, n, s, e, u, l, i, a]).slice(1, -1);
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
			m = (e) => (
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
				return null != (e = t.useContext(a)) ? e : s;
			},
		]);
	},
	98433,
	(e) => {
		"use strict";
		var t = e.i(620),
			r = e.i(42123),
			n = e.i(92192);
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
	13858,
	(e) => {
		"use strict";
		var t = e.i(620),
			r = e.i(93444);
		e.i(49199);
		var n = function () {
				return null;
			},
			o = e.i(92479),
			i = e.i(16003),
			a = e.i(48577),
			s = e.i(88038),
			l = e.i(30208),
			u = e.i(42123);
		function c({ children: e, ...r }) {
			return (0, t.jsx)(u.ThemeProvider, { ...r, children: e });
		}
		const d = ({ ...e }) => {
			const { theme: r = "system" } = (0, u.useTheme)();
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
					const u = (0, s.getQueryClient)();
					return (
						(0, o.useEffect)(() => {
							const e = l.authClient.electron.getAuthorizationCode();
							e &&
								setTimeout(() => {
									i.toast.custom(
										(r) =>
											(0, t.jsx)(a.ElectronManualSignInToast, {
												t: r,
												authorizationCode: e,
											}),
										{ duration: 4e3 },
									);
								}, 1e3);
						}, []),
						(0, o.useEffect)(() => {
							const e = l.authClient.ensureElectronRedirect();
							return () => clearInterval(e);
						}, []),
						(0, t.jsx)(c, {
							attribute: "class",
							defaultTheme: "dark",
							children: (0, t.jsxs)(r.QueryClientProvider, {
								client: u,
								children: [
									(0, t.jsx)(n, {
										client: u,
										initialIsOpen: !1,
										buttonPosition: "bottom-right",
										position: "bottom",
									}),
									(0, t.jsx)(d, { richColors: !0, closeButton: !0 }),
									e,
								],
							}),
						})
					);
				},
			],
			13858,
		);
	},
]);
