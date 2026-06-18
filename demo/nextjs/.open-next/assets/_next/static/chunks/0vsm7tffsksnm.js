(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
	"object" == typeof document ? document.currentScript : void 0,
	49139,
	(e) => {
		"use strict";
		var t = e.i(62613),
			r = e.i(49696);
		const s = ({ className: e, ...s }) =>
			(0, t.jsx)("div", {
				className: (0, r.cn)(
					"rounded-xl border bg-card text-card-foreground shadow",
					e,
				),
				...s,
			});
		s.displayName = "Card";
		const i = ({ className: e, ...s }) =>
			(0, t.jsx)("div", {
				className: (0, r.cn)("flex flex-col space-y-1.5 p-6", e),
				...s,
			});
		i.displayName = "CardHeader";
		const n = ({ className: e, ...s }) =>
			(0, t.jsx)("h3", {
				className: (0, r.cn)("font-semibold leading-none tracking-tight", e),
				...s,
			});
		n.displayName = "CardTitle";
		const a = ({ className: e, ...s }) =>
			(0, t.jsx)("p", {
				className: (0, r.cn)("text-sm text-muted-foreground", e),
				...s,
			});
		a.displayName = "CardDescription";
		const o = ({ className: e, ...s }) =>
			(0, t.jsx)("div", { className: (0, r.cn)("p-6 pt-0", e), ...s });
		o.displayName = "CardContent";
		const u = ({ className: e, ...s }) =>
			(0, t.jsx)("div", {
				className: (0, r.cn)("flex items-center p-6 pt-0", e),
				...s,
			});
		(u.displayName = "CardFooter"),
			e.s([
				"Card",
				0,
				s,
				"CardContent",
				0,
				o,
				"CardDescription",
				0,
				a,
				"CardFooter",
				0,
				u,
				"CardHeader",
				0,
				i,
				"CardTitle",
				0,
				n,
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
			function ({ className: e, type: s, ...i }) {
				return (0, t.jsx)("input", {
					type: s,
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
			s = e.i(33833),
			i = r.forwardRef((e, r) =>
				(0, t.jsx)(s.Primitive.label, {
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
		var n = e.i(49696);
		e.s(
			[
				"Label",
				0,
				function ({ className: e, ...r }) {
					return (0, t.jsx)(i, {
						"data-slot": "label",
						className: (0, n.cn)(
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
	59597,
	(e) => {
		"use strict";
		let t;
		var r = e.i(28529),
			s = e.i(71790),
			i = e.i(61286),
			n = e.i(16339),
			a = e.i(84520),
			o = e.i(71335),
			u = e.i(89498),
			l = e.i(49479),
			c = class extends a.Subscribable {
				constructor(e, t) {
					super(),
						(this.options = t),
						(this.#e = e),
						(this.#t = null),
						(this.#r = (0, o.pendingThenable)()),
						this.bindMethods(),
						this.setOptions(t);
				}
				#e;
				#s = void 0;
				#i = void 0;
				#n = void 0;
				#a;
				#o;
				#r;
				#t;
				#u;
				#l;
				#c;
				#h;
				#d;
				#f;
				#p = new Set();
				bindMethods() {
					this.refetch = this.refetch.bind(this);
				}
				onSubscribe() {
					1 === this.listeners.size &&
						(this.#s.addObserver(this),
						h(this.#s, this.options) ? this.#y() : this.updateResult(),
						this.#v());
				}
				onUnsubscribe() {
					this.hasListeners() || this.destroy();
				}
				shouldFetchOnReconnect() {
					return d(this.#s, this.options, this.options.refetchOnReconnect);
				}
				shouldFetchOnWindowFocus() {
					return d(this.#s, this.options, this.options.refetchOnWindowFocus);
				}
				destroy() {
					(this.listeners = new Set()),
						this.#m(),
						this.#b(),
						this.#s.removeObserver(this);
				}
				setOptions(e) {
					const t = this.options,
						r = this.#s;
					if (
						((this.options = this.#e.defaultQueryOptions(e)),
						void 0 !== this.options.enabled &&
							"boolean" != typeof this.options.enabled &&
							"function" != typeof this.options.enabled &&
							"boolean" !=
								typeof (0, u.resolveQueryBoolean)(
									this.options.enabled,
									this.#s,
								))
					)
						throw Error(
							"Expected enabled to be a boolean or a callback that returns a boolean",
						);
					this.#R(),
						this.#s.setOptions(this.options),
						t._defaulted &&
							!(0, u.shallowEqualObjects)(this.options, t) &&
							this.#e.getQueryCache().notify({
								type: "observerOptionsUpdated",
								query: this.#s,
								observer: this,
							});
					const s = this.hasListeners();
					s && f(this.#s, r, this.options, t) && this.#y(),
						this.updateResult(),
						s &&
							(this.#s !== r ||
								(0, u.resolveQueryBoolean)(this.options.enabled, this.#s) !==
									(0, u.resolveQueryBoolean)(t.enabled, this.#s) ||
								(0, u.resolveStaleTime)(this.options.staleTime, this.#s) !==
									(0, u.resolveStaleTime)(t.staleTime, this.#s)) &&
							this.#g();
					const i = this.#Q();
					s &&
						(this.#s !== r ||
							(0, u.resolveQueryBoolean)(this.options.enabled, this.#s) !==
								(0, u.resolveQueryBoolean)(t.enabled, this.#s) ||
							i !== this.#f) &&
						this.#S(i);
				}
				getOptimisticResult(e) {
					var t, r;
					const s = this.#e.getQueryCache().build(this.#e, e),
						i = this.createResult(s, e);
					return (
						(t = this),
						(r = i),
						(0, u.shallowEqualObjects)(t.getCurrentResult(), r) ||
							((this.#n = i),
							(this.#o = this.options),
							(this.#a = this.#s.state)),
						i
					);
				}
				getCurrentResult() {
					return this.#n;
				}
				trackResult(e, t) {
					return new Proxy(e, {
						get: (e, r) => (
							this.trackProp(r),
							t?.(r),
							"promise" === r &&
								(this.trackProp("data"),
								this.options.experimental_prefetchInRender ||
									"pending" !== this.#r.status ||
									this.#r.reject(
										Error(
											"experimental_prefetchInRender feature flag is not enabled",
										),
									)),
							Reflect.get(e, r)
						),
					});
				}
				trackProp(e) {
					this.#p.add(e);
				}
				getCurrentQuery() {
					return this.#s;
				}
				refetch({ ...e } = {}) {
					return this.fetch({ ...e });
				}
				fetchOptimistic(e) {
					const t = this.#e.defaultQueryOptions(e),
						r = this.#e.getQueryCache().build(this.#e, t);
					return r.fetch().then(() => this.createResult(r, t));
				}
				fetch(e) {
					return this.#y({ ...e, cancelRefetch: e.cancelRefetch ?? !0 }).then(
						() => (this.updateResult(), this.#n),
					);
				}
				#y(e) {
					this.#R();
					let t = this.#s.fetch(this.options, e);
					return e?.throwOnError || (t = t.catch(u.noop)), t;
				}
				#g() {
					this.#m();
					const e = (0, u.resolveStaleTime)(this.options.staleTime, this.#s);
					if (
						s.environmentManager.isServer() ||
						this.#n.isStale ||
						!(0, u.isValidTimeout)(e)
					)
						return;
					const t = (0, u.timeUntilStale)(this.#n.dataUpdatedAt, e);
					this.#h = l.timeoutManager.setTimeout(() => {
						this.#n.isStale || this.updateResult();
					}, t + 1);
				}
				#Q() {
					return (
						("function" == typeof this.options.refetchInterval
							? this.options.refetchInterval(this.#s)
							: this.options.refetchInterval) ?? !1
					);
				}
				#S(e) {
					this.#b(),
						(this.#f = e),
						!s.environmentManager.isServer() &&
							!1 !==
								(0, u.resolveQueryBoolean)(this.options.enabled, this.#s) &&
							(0, u.isValidTimeout)(this.#f) &&
							0 !== this.#f &&
							(this.#d = l.timeoutManager.setInterval(() => {
								(this.options.refetchIntervalInBackground ||
									r.focusManager.isFocused()) &&
									this.#y();
							}, this.#f));
				}
				#v() {
					this.#g(), this.#S(this.#Q());
				}
				#m() {
					void 0 !== this.#h &&
						(l.timeoutManager.clearTimeout(this.#h), (this.#h = void 0));
				}
				#b() {
					void 0 !== this.#d &&
						(l.timeoutManager.clearInterval(this.#d), (this.#d = void 0));
				}
				createResult(e, t) {
					let r,
						s = this.#s,
						i = this.options,
						a = this.#n,
						l = this.#a,
						c = this.#o,
						d = e !== s ? e.state : this.#i,
						{ state: y } = e,
						v = { ...y },
						m = !1;
					if (t._optimisticResults) {
						const r = this.hasListeners(),
							a = !r && h(e, t),
							o = r && f(e, s, t, i);
						(a || o) && (v = { ...v, ...(0, n.fetchState)(y.data, e.options) }),
							"isRestoring" === t._optimisticResults &&
								(v.fetchStatus = "idle");
					}
					let { error: b, errorUpdatedAt: R, status: g } = v;
					r = v.data;
					let Q = !1;
					if (void 0 !== t.placeholderData && void 0 === r && "pending" === g) {
						let e;
						a?.isPlaceholderData && t.placeholderData === c?.placeholderData
							? ((e = a.data), (Q = !0))
							: (e =
									"function" == typeof t.placeholderData
										? t.placeholderData(this.#c?.state.data, this.#c)
										: t.placeholderData),
							void 0 !== e &&
								((g = "success"),
								(r = (0, u.replaceData)(a?.data, e, t)),
								(m = !0));
					}
					if (t.select && void 0 !== r && !Q)
						if (a && r === l?.data && t.select === this.#u) r = this.#l;
						else
							try {
								(this.#u = t.select),
									(r = t.select(r)),
									(r = (0, u.replaceData)(a?.data, r, t)),
									(this.#l = r),
									(this.#t = null);
							} catch (e) {
								this.#t = e;
							}
					this.#t &&
						((b = this.#t), (r = this.#l), (R = Date.now()), (g = "error"));
					const S = "fetching" === v.fetchStatus,
						x = "pending" === g,
						T = "error" === g,
						I = x && S,
						C = void 0 !== r,
						w = {
							status: g,
							fetchStatus: v.fetchStatus,
							isPending: x,
							isSuccess: "success" === g,
							isError: T,
							isInitialLoading: I,
							isLoading: I,
							data: r,
							dataUpdatedAt: v.dataUpdatedAt,
							error: b,
							errorUpdatedAt: R,
							failureCount: v.fetchFailureCount,
							failureReason: v.fetchFailureReason,
							errorUpdateCount: v.errorUpdateCount,
							isFetched: e.isFetched(),
							isFetchedAfterMount:
								v.dataUpdateCount > d.dataUpdateCount ||
								v.errorUpdateCount > d.errorUpdateCount,
							isFetching: S,
							isRefetching: S && !x,
							isLoadingError: T && !C,
							isPaused: "paused" === v.fetchStatus,
							isPlaceholderData: m,
							isRefetchError: T && C,
							isStale: p(e, t),
							refetch: this.refetch,
							promise: this.#r,
							isEnabled: !1 !== (0, u.resolveQueryBoolean)(t.enabled, e),
						};
					if (this.options.experimental_prefetchInRender) {
						const t = void 0 !== w.data,
							r = "error" === w.status && !t,
							i = (e) => {
								r ? e.reject(w.error) : t && e.resolve(w.data);
							},
							n = () => {
								i((this.#r = w.promise = (0, o.pendingThenable)()));
							},
							a = this.#r;
						switch (a.status) {
							case "pending":
								e.queryHash === s.queryHash && i(a);
								break;
							case "fulfilled":
								(r || w.data !== a.value) && n();
								break;
							case "rejected":
								(r && w.error === a.reason) || n();
						}
					}
					return w;
				}
				updateResult() {
					const e = this.#n,
						t = this.createResult(this.#s, this.options);
					if (
						((this.#a = this.#s.state),
						(this.#o = this.options),
						void 0 !== this.#a.data && (this.#c = this.#s),
						(0, u.shallowEqualObjects)(t, e))
					)
						return;
					this.#n = t;
					const r = () => {
						if (!e) return !0;
						const { notifyOnChangeProps: t } = this.options,
							r = "function" == typeof t ? t() : t;
						if ("all" === r || (!r && !this.#p.size)) return !0;
						const s = new Set(r ?? this.#p);
						return (
							this.options.throwOnError && s.add("error"),
							Object.keys(this.#n).some((t) => this.#n[t] !== e[t] && s.has(t))
						);
					};
					this.#x({ listeners: r() });
				}
				#R() {
					const e = this.#e.getQueryCache().build(this.#e, this.options);
					if (e === this.#s) return;
					const t = this.#s;
					(this.#s = e),
						(this.#i = e.state),
						this.hasListeners() &&
							(t?.removeObserver(this), e.addObserver(this));
				}
				onQueryUpdate() {
					this.updateResult(), this.hasListeners() && this.#v();
				}
				#x(e) {
					i.notifyManager.batch(() => {
						e.listeners &&
							this.listeners.forEach((e) => {
								e(this.#n);
							}),
							this.#e
								.getQueryCache()
								.notify({ query: this.#s, type: "observerResultsUpdated" });
					});
				}
			};
		function h(e, t) {
			return (
				(!1 !== (0, u.resolveQueryBoolean)(t.enabled, e) &&
					void 0 === e.state.data &&
					("error" !== e.state.status ||
						!1 !== (0, u.resolveQueryBoolean)(t.retryOnMount, e))) ||
				(void 0 !== e.state.data && d(e, t, t.refetchOnMount))
			);
		}
		function d(e, t, r) {
			if (
				!1 !== (0, u.resolveQueryBoolean)(t.enabled, e) &&
				"static" !== (0, u.resolveStaleTime)(t.staleTime, e)
			) {
				const s = "function" == typeof r ? r(e) : r;
				return "always" === s || (!1 !== s && p(e, t));
			}
			return !1;
		}
		function f(e, t, r, s) {
			return (
				(e !== t || !1 === (0, u.resolveQueryBoolean)(s.enabled, e)) &&
				(!r.suspense || "error" !== e.state.status) &&
				p(e, r)
			);
		}
		function p(e, t) {
			return (
				!1 !== (0, u.resolveQueryBoolean)(t.enabled, e) &&
				e.isStaleByTime((0, u.resolveStaleTime)(t.staleTime, e))
			);
		}
		e.i(8343);
		var y = e.i(57319),
			v = e.i(82537);
		e.i(62613);
		var m = y.createContext(
				((t = !1),
				{
					clearReset: () => {
						t = !1;
					},
					reset: () => {
						t = !0;
					},
					isReset: () => t,
				}),
			),
			b = y.createContext(!1);
		b.Provider;
		var R = (e, t, r) =>
			t.fetchOptimistic(e).catch(() => {
				r.clearReset();
			});
		e.s(
			[
				"useQuery",
				0,
				function (e, t) {
					return (function (e, t, r) {
						let n,
							a = y.useContext(b),
							o = y.useContext(m),
							l = (0, v.useQueryClient)(r),
							c = l.defaultQueryOptions(e);
						l.getDefaultOptions().queries?._experimental_beforeQuery?.(c);
						const h = l.getQueryCache().get(c.queryHash),
							d = !1 !== e.subscribed;
						if (
							((c._optimisticResults = a
								? "isRestoring"
								: d
									? "optimistic"
									: void 0),
							c.suspense)
						) {
							const e = (e) => ("static" === e ? e : Math.max(e ?? 1e3, 1e3)),
								t = c.staleTime;
							(c.staleTime =
								"function" == typeof t ? (...r) => e(t(...r)) : e(t)),
								"number" == typeof c.gcTime &&
									(c.gcTime = Math.max(c.gcTime, 1e3));
						}
						(n =
							h?.state.error && "function" == typeof c.throwOnError
								? (0, u.shouldThrowError)(c.throwOnError, [h.state.error, h])
								: c.throwOnError),
							(c.suspense || c.experimental_prefetchInRender || n) &&
								!o.isReset() &&
								(c.retryOnMount = !1),
							y.useEffect(() => {
								o.clearReset();
							}, [o]);
						const f = !l.getQueryCache().get(c.queryHash),
							[p] = y.useState(() => new t(l, c)),
							g = p.getOptimisticResult(c),
							Q = !a && d;
						if (
							(y.useSyncExternalStore(
								y.useCallback(
									(e) => {
										const t = Q
											? p.subscribe(i.notifyManager.batchCalls(e))
											: u.noop;
										return p.updateResult(), t;
									},
									[p, Q],
								),
								() => p.getCurrentResult(),
								() => p.getCurrentResult(),
							),
							y.useEffect(() => {
								p.setOptions(c);
							}, [c, p]),
							c?.suspense && g.isPending)
						)
							throw R(c, p, o);
						if (
							(({
								result: e,
								errorResetBoundary: t,
								throwOnError: r,
								query: s,
								suspense: i,
							}) =>
								e.isError &&
								!t.isReset() &&
								!e.isFetching &&
								s &&
								((i && void 0 === e.data) ||
									(0, u.shouldThrowError)(r, [e.error, s])))({
								result: g,
								errorResetBoundary: o,
								throwOnError: c.throwOnError,
								query: h,
								suspense: c.suspense,
							})
						)
							throw g.error;
						if (
							(l.getDefaultOptions().queries?._experimental_afterQuery?.(c, g),
							c.experimental_prefetchInRender &&
								!s.environmentManager.isServer() &&
								g.isLoading &&
								g.isFetching &&
								!a)
						) {
							const e = f ? R(c, p, o) : h?.promise;
							e?.catch(u.noop).finally(() => {
								p.updateResult();
							});
						}
						return c.notifyOnChangeProps ? g : p.trackResult(g);
					})(e, c, t);
				},
			],
			59597,
		);
	},
	81799,
	(e) => {
		"use strict";
		var t = e.i(98591);
		e.s(["Check", () => t.default]);
	},
	97557,
	5396,
	65221,
	(e) => {
		"use strict";
		"u" > typeof window && window.document && window.document.createElement,
			e.s(
				[
					"composeEventHandlers",
					0,
					function (e, t, { checkForDefaultPrevented: r = !0 } = {}) {
						return function (s) {
							if ((e?.(s), !1 === r || !s.defaultPrevented)) return t?.(s);
						};
					},
				],
				97557,
			);
		var t = e.i(57319),
			r = e.i(13575);
		t[" useEffectEvent ".trim().toString()],
			t[" useInsertionEffect ".trim().toString()];
		var s = t[" useInsertionEffect ".trim().toString()] || r.useLayoutEffect;
		Symbol("RADIX:SYNC_STATE"),
			e.s(
				[
					"useControllableState",
					0,
					function ({
						prop: e,
						defaultProp: r,
						onChange: i = () => {},
						caller: n,
					}) {
						const [a, o, u] = (function ({ defaultProp: e, onChange: r }) {
								const [i, n] = t.useState(e),
									a = t.useRef(i),
									o = t.useRef(r);
								return (
									s(() => {
										o.current = r;
									}, [r]),
									t.useEffect(() => {
										a.current !== i && (o.current?.(i), (a.current = i));
									}, [i, a]),
									[i, n, o]
								);
							})({ defaultProp: r, onChange: i }),
							l = void 0 !== e,
							c = l ? e : a;
						{
							const r = t.useRef(void 0 !== e);
							t.useEffect(() => {
								const e = r.current;
								if (e !== l) {
									const t = l ? "controlled" : "uncontrolled";
									console.warn(
										`${n} is changing from ${e ? "controlled" : "uncontrolled"} to ${t}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`,
									);
								}
								r.current = l;
							}, [l, n]);
						}
						return [
							c,
							t.useCallback(
								(t) => {
									if (l) {
										const r = "function" == typeof t ? t(e) : t;
										r !== e && u.current?.(r);
									} else o(t);
								},
								[l, e, o, u],
							),
						];
					},
				],
				5396,
			),
			e.s(
				[
					"useSize",
					0,
					function (e) {
						const [s, i] = t.useState(void 0);
						return (
							(0, r.useLayoutEffect)(() => {
								if (e) {
									i({ width: e.offsetWidth, height: e.offsetHeight });
									const t = new ResizeObserver((t) => {
										let r, s;
										if (!Array.isArray(t) || !t.length) return;
										const n = t[0];
										if ("borderBoxSize" in n) {
											const e = n.borderBoxSize,
												t = Array.isArray(e) ? e[0] : e;
											(r = t.inlineSize), (s = t.blockSize);
										} else (r = e.offsetWidth), (s = e.offsetHeight);
										i({ width: r, height: s });
									});
									return (
										t.observe(e, { box: "border-box" }), () => t.unobserve(e)
									);
								}
								i(void 0);
							}, [e]),
							s
						);
					},
				],
				65221,
			);
	},
	42902,
	(e) => {
		"use strict";
		var t = e.i(57319);
		e.s([
			"usePrevious",
			0,
			function (e) {
				const r = t.useRef({ value: e, previous: e });
				return t.useMemo(
					() => (
						r.current.value !== e &&
							((r.current.previous = r.current.value), (r.current.value = e)),
						r.current.previous
					),
					[e],
				);
			},
		]);
	},
]);
