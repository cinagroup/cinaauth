(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
	"object" == typeof document ? document.currentScript : void 0,
	38699,
	(e) => {
		"use strict";
		var t = e.i(620),
			s = e.i(13732);
		const r = ({ className: e, ...r }) =>
			(0, t.jsx)("div", {
				className: (0, s.cn)(
					"rounded-xl border bg-card text-card-foreground shadow",
					e,
				),
				...r,
			});
		r.displayName = "Card";
		const i = ({ className: e, ...r }) =>
			(0, t.jsx)("div", {
				className: (0, s.cn)("flex flex-col space-y-1.5 p-6", e),
				...r,
			});
		i.displayName = "CardHeader";
		const n = ({ className: e, ...r }) =>
			(0, t.jsx)("h3", {
				className: (0, s.cn)("font-semibold leading-none tracking-tight", e),
				...r,
			});
		n.displayName = "CardTitle";
		const a = ({ className: e, ...r }) =>
			(0, t.jsx)("p", {
				className: (0, s.cn)("text-sm text-muted-foreground", e),
				...r,
			});
		a.displayName = "CardDescription";
		const o = ({ className: e, ...r }) =>
			(0, t.jsx)("div", { className: (0, s.cn)("p-6 pt-0", e), ...r });
		o.displayName = "CardContent";
		const u = ({ className: e, ...r }) =>
			(0, t.jsx)("div", {
				className: (0, s.cn)("flex items-center p-6 pt-0", e),
				...r,
			});
		(u.displayName = "CardFooter"),
			e.s([
				"Card",
				0,
				r,
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
	98747,
	(e) => {
		"use strict";
		var t = e.i(620),
			s = e.i(92479),
			r = e.i(95353),
			i = s.forwardRef((e, s) =>
				(0, t.jsx)(r.Primitive.label, {
					...e,
					ref: s,
					onMouseDown: (t) => {
						t.target.closest("button, input, select, textarea") ||
							(e.onMouseDown?.(t),
							!t.defaultPrevented && t.detail > 1 && t.preventDefault());
					},
				}),
			);
		i.displayName = "Label";
		var n = e.i(13732);
		e.s(
			[
				"Label",
				0,
				function ({ className: e, ...s }) {
					return (0, t.jsx)(i, {
						"data-slot": "label",
						className: (0, n.cn)(
							"flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
							e,
						),
						...s,
					});
				},
			],
			98747,
		);
	},
	38901,
	(e) => {
		"use strict";
		var t = e.i(620),
			s = e.i(13732);
		e.s([
			"Input",
			0,
			function ({ className: e, type: r, ...i }) {
				return (0, t.jsx)("input", {
					type: r,
					"data-slot": "input",
					className: (0, s.cn)(
						"border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
						"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
						"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
						e,
					),
					...i,
				});
			},
		]);
	},
	20927,
	(e) => {
		"use strict";
		let t;
		var s = e.i(53860),
			r = e.i(9630),
			i = e.i(25999),
			n = e.i(74338),
			a = e.i(94288),
			o = e.i(25617),
			u = e.i(30679),
			l = e.i(51155),
			c = class extends a.Subscribable {
				constructor(e, t) {
					super(),
						(this.options = t),
						(this.#e = e),
						(this.#t = null),
						(this.#s = (0, o.pendingThenable)()),
						this.bindMethods(),
						this.setOptions(t);
				}
				#e;
				#r = void 0;
				#i = void 0;
				#n = void 0;
				#a;
				#o;
				#s;
				#t;
				#u;
				#l;
				#c;
				#h;
				#d;
				#p;
				#m = new Set();
				bindMethods() {
					this.refetch = this.refetch.bind(this);
				}
				onSubscribe() {
					1 === this.listeners.size &&
						(this.#r.addObserver(this),
						h(this.#r, this.options) ? this.#f() : this.updateResult(),
						this.#y());
				}
				onUnsubscribe() {
					this.hasListeners() || this.destroy();
				}
				shouldFetchOnReconnect() {
					return d(this.#r, this.options, this.options.refetchOnReconnect);
				}
				shouldFetchOnWindowFocus() {
					return d(this.#r, this.options, this.options.refetchOnWindowFocus);
				}
				destroy() {
					(this.listeners = new Set()),
						this.#v(),
						this.#g(),
						this.#r.removeObserver(this);
				}
				setOptions(e) {
					const t = this.options,
						s = this.#r;
					if (
						((this.options = this.#e.defaultQueryOptions(e)),
						void 0 !== this.options.enabled &&
							"boolean" != typeof this.options.enabled &&
							"function" != typeof this.options.enabled &&
							"boolean" !=
								typeof (0, u.resolveQueryBoolean)(
									this.options.enabled,
									this.#r,
								))
					)
						throw Error(
							"Expected enabled to be a boolean or a callback that returns a boolean",
						);
					this.#b(),
						this.#r.setOptions(this.options),
						t._defaulted &&
							!(0, u.shallowEqualObjects)(this.options, t) &&
							this.#e.getQueryCache().notify({
								type: "observerOptionsUpdated",
								query: this.#r,
								observer: this,
							});
					const r = this.hasListeners();
					r && p(this.#r, s, this.options, t) && this.#f(),
						this.updateResult(),
						r &&
							(this.#r !== s ||
								(0, u.resolveQueryBoolean)(this.options.enabled, this.#r) !==
									(0, u.resolveQueryBoolean)(t.enabled, this.#r) ||
								(0, u.resolveStaleTime)(this.options.staleTime, this.#r) !==
									(0, u.resolveStaleTime)(t.staleTime, this.#r)) &&
							this.#x();
					const i = this.#R();
					r &&
						(this.#r !== s ||
							(0, u.resolveQueryBoolean)(this.options.enabled, this.#r) !==
								(0, u.resolveQueryBoolean)(t.enabled, this.#r) ||
							i !== this.#p) &&
						this.#C(i);
				}
				getOptimisticResult(e) {
					var t, s;
					const r = this.#e.getQueryCache().build(this.#e, e),
						i = this.createResult(r, e);
					return (
						(t = this),
						(s = i),
						(0, u.shallowEqualObjects)(t.getCurrentResult(), s) ||
							((this.#n = i),
							(this.#o = this.options),
							(this.#a = this.#r.state)),
						i
					);
				}
				getCurrentResult() {
					return this.#n;
				}
				trackResult(e, t) {
					return new Proxy(e, {
						get: (e, s) => (
							this.trackProp(s),
							t?.(s),
							"promise" === s &&
								(this.trackProp("data"),
								this.options.experimental_prefetchInRender ||
									"pending" !== this.#s.status ||
									this.#s.reject(
										Error(
											"experimental_prefetchInRender feature flag is not enabled",
										),
									)),
							Reflect.get(e, s)
						),
					});
				}
				trackProp(e) {
					this.#m.add(e);
				}
				getCurrentQuery() {
					return this.#r;
				}
				refetch({ ...e } = {}) {
					return this.fetch({ ...e });
				}
				fetchOptimistic(e) {
					const t = this.#e.defaultQueryOptions(e),
						s = this.#e.getQueryCache().build(this.#e, t);
					return s.fetch().then(() => this.createResult(s, t));
				}
				fetch(e) {
					return this.#f({ ...e, cancelRefetch: e.cancelRefetch ?? !0 }).then(
						() => (this.updateResult(), this.#n),
					);
				}
				#f(e) {
					this.#b();
					let t = this.#r.fetch(this.options, e);
					return e?.throwOnError || (t = t.catch(u.noop)), t;
				}
				#x() {
					this.#v();
					const e = (0, u.resolveStaleTime)(this.options.staleTime, this.#r);
					if (
						r.environmentManager.isServer() ||
						this.#n.isStale ||
						!(0, u.isValidTimeout)(e)
					)
						return;
					const t = (0, u.timeUntilStale)(this.#n.dataUpdatedAt, e);
					this.#h = l.timeoutManager.setTimeout(() => {
						this.#n.isStale || this.updateResult();
					}, t + 1);
				}
				#R() {
					return (
						("function" == typeof this.options.refetchInterval
							? this.options.refetchInterval(this.#r)
							: this.options.refetchInterval) ?? !1
					);
				}
				#C(e) {
					this.#g(),
						(this.#p = e),
						!r.environmentManager.isServer() &&
							!1 !==
								(0, u.resolveQueryBoolean)(this.options.enabled, this.#r) &&
							(0, u.isValidTimeout)(this.#p) &&
							0 !== this.#p &&
							(this.#d = l.timeoutManager.setInterval(() => {
								(this.options.refetchIntervalInBackground ||
									s.focusManager.isFocused()) &&
									this.#f();
							}, this.#p));
				}
				#y() {
					this.#x(), this.#C(this.#R());
				}
				#v() {
					void 0 !== this.#h &&
						(l.timeoutManager.clearTimeout(this.#h), (this.#h = void 0));
				}
				#g() {
					void 0 !== this.#d &&
						(l.timeoutManager.clearInterval(this.#d), (this.#d = void 0));
				}
				createResult(e, t) {
					let s,
						r = this.#r,
						i = this.options,
						a = this.#n,
						l = this.#a,
						c = this.#o,
						d = e !== r ? e.state : this.#i,
						{ state: f } = e,
						y = { ...f },
						v = !1;
					if (t._optimisticResults) {
						const s = this.hasListeners(),
							a = !s && h(e, t),
							o = s && p(e, r, t, i);
						(a || o) && (y = { ...y, ...(0, n.fetchState)(f.data, e.options) }),
							"isRestoring" === t._optimisticResults &&
								(y.fetchStatus = "idle");
					}
					let { error: g, errorUpdatedAt: b, status: x } = y;
					s = y.data;
					let R = !1;
					if (void 0 !== t.placeholderData && void 0 === s && "pending" === x) {
						let e;
						a?.isPlaceholderData && t.placeholderData === c?.placeholderData
							? ((e = a.data), (R = !0))
							: (e =
									"function" == typeof t.placeholderData
										? t.placeholderData(this.#c?.state.data, this.#c)
										: t.placeholderData),
							void 0 !== e &&
								((x = "success"),
								(s = (0, u.replaceData)(a?.data, e, t)),
								(v = !0));
					}
					if (t.select && void 0 !== s && !R)
						if (a && s === l?.data && t.select === this.#u) s = this.#l;
						else
							try {
								(this.#u = t.select),
									(s = t.select(s)),
									(s = (0, u.replaceData)(a?.data, s, t)),
									(this.#l = s),
									(this.#t = null);
							} catch (e) {
								this.#t = e;
							}
					this.#t &&
						((g = this.#t), (s = this.#l), (b = Date.now()), (x = "error"));
					const C = "fetching" === y.fetchStatus,
						Q = "pending" === x,
						S = "error" === x,
						j = Q && C,
						O = void 0 !== s,
						w = {
							status: x,
							fetchStatus: y.fetchStatus,
							isPending: Q,
							isSuccess: "success" === x,
							isError: S,
							isInitialLoading: j,
							isLoading: j,
							data: s,
							dataUpdatedAt: y.dataUpdatedAt,
							error: g,
							errorUpdatedAt: b,
							failureCount: y.fetchFailureCount,
							failureReason: y.fetchFailureReason,
							errorUpdateCount: y.errorUpdateCount,
							isFetched: e.isFetched(),
							isFetchedAfterMount:
								y.dataUpdateCount > d.dataUpdateCount ||
								y.errorUpdateCount > d.errorUpdateCount,
							isFetching: C,
							isRefetching: C && !Q,
							isLoadingError: S && !O,
							isPaused: "paused" === y.fetchStatus,
							isPlaceholderData: v,
							isRefetchError: S && O,
							isStale: m(e, t),
							refetch: this.refetch,
							promise: this.#s,
							isEnabled: !1 !== (0, u.resolveQueryBoolean)(t.enabled, e),
						};
					if (this.options.experimental_prefetchInRender) {
						const t = void 0 !== w.data,
							s = "error" === w.status && !t,
							i = (e) => {
								s ? e.reject(w.error) : t && e.resolve(w.data);
							},
							n = () => {
								i((this.#s = w.promise = (0, o.pendingThenable)()));
							},
							a = this.#s;
						switch (a.status) {
							case "pending":
								e.queryHash === r.queryHash && i(a);
								break;
							case "fulfilled":
								(s || w.data !== a.value) && n();
								break;
							case "rejected":
								(s && w.error === a.reason) || n();
						}
					}
					return w;
				}
				updateResult() {
					const e = this.#n,
						t = this.createResult(this.#r, this.options);
					if (
						((this.#a = this.#r.state),
						(this.#o = this.options),
						void 0 !== this.#a.data && (this.#c = this.#r),
						(0, u.shallowEqualObjects)(t, e))
					)
						return;
					this.#n = t;
					const s = () => {
						if (!e) return !0;
						const { notifyOnChangeProps: t } = this.options,
							s = "function" == typeof t ? t() : t;
						if ("all" === s || (!s && !this.#m.size)) return !0;
						const r = new Set(s ?? this.#m);
						return (
							this.options.throwOnError && r.add("error"),
							Object.keys(this.#n).some((t) => this.#n[t] !== e[t] && r.has(t))
						);
					};
					this.#Q({ listeners: s() });
				}
				#b() {
					const e = this.#e.getQueryCache().build(this.#e, this.options);
					if (e === this.#r) return;
					const t = this.#r;
					(this.#r = e),
						(this.#i = e.state),
						this.hasListeners() &&
							(t?.removeObserver(this), e.addObserver(this));
				}
				onQueryUpdate() {
					this.updateResult(), this.hasListeners() && this.#y();
				}
				#Q(e) {
					i.notifyManager.batch(() => {
						e.listeners &&
							this.listeners.forEach((e) => {
								e(this.#n);
							}),
							this.#e
								.getQueryCache()
								.notify({ query: this.#r, type: "observerResultsUpdated" });
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
		function d(e, t, s) {
			if (
				!1 !== (0, u.resolveQueryBoolean)(t.enabled, e) &&
				"static" !== (0, u.resolveStaleTime)(t.staleTime, e)
			) {
				const r = "function" == typeof s ? s(e) : s;
				return "always" === r || (!1 !== r && m(e, t));
			}
			return !1;
		}
		function p(e, t, s, r) {
			return (
				(e !== t || !1 === (0, u.resolveQueryBoolean)(r.enabled, e)) &&
				(!s.suspense || "error" !== e.state.status) &&
				m(e, s)
			);
		}
		function m(e, t) {
			return (
				!1 !== (0, u.resolveQueryBoolean)(t.enabled, e) &&
				e.isStaleByTime((0, u.resolveStaleTime)(t.staleTime, e))
			);
		}
		e.i(49199);
		var f = e.i(92479),
			y = e.i(93444);
		e.i(620);
		var v = f.createContext(
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
			g = f.createContext(!1);
		g.Provider;
		var b = (e, t, s) =>
			t.fetchOptimistic(e).catch(() => {
				s.clearReset();
			});
		e.s(
			[
				"useQuery",
				0,
				function (e, t) {
					return (function (e, t, s) {
						let n,
							a = f.useContext(g),
							o = f.useContext(v),
							l = (0, y.useQueryClient)(s),
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
								"function" == typeof t ? (...s) => e(t(...s)) : e(t)),
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
							f.useEffect(() => {
								o.clearReset();
							}, [o]);
						const p = !l.getQueryCache().get(c.queryHash),
							[m] = f.useState(() => new t(l, c)),
							x = m.getOptimisticResult(c),
							R = !a && d;
						if (
							(f.useSyncExternalStore(
								f.useCallback(
									(e) => {
										const t = R
											? m.subscribe(i.notifyManager.batchCalls(e))
											: u.noop;
										return m.updateResult(), t;
									},
									[m, R],
								),
								() => m.getCurrentResult(),
								() => m.getCurrentResult(),
							),
							f.useEffect(() => {
								m.setOptions(c);
							}, [c, m]),
							c?.suspense && x.isPending)
						)
							throw b(c, m, o);
						if (
							(({
								result: e,
								errorResetBoundary: t,
								throwOnError: s,
								query: r,
								suspense: i,
							}) =>
								e.isError &&
								!t.isReset() &&
								!e.isFetching &&
								r &&
								((i && void 0 === e.data) ||
									(0, u.shouldThrowError)(s, [e.error, r])))({
								result: x,
								errorResetBoundary: o,
								throwOnError: c.throwOnError,
								query: h,
								suspense: c.suspense,
							})
						)
							throw x.error;
						if (
							(l.getDefaultOptions().queries?._experimental_afterQuery?.(c, x),
							c.experimental_prefetchInRender &&
								!r.environmentManager.isServer() &&
								x.isLoading &&
								x.isFetching &&
								!a)
						) {
							const e = p ? b(c, m, o) : h?.promise;
							e?.catch(u.noop).finally(() => {
								m.updateResult();
							});
						}
						return c.notifyOnChangeProps ? x : m.trackResult(x);
					})(e, c, t);
				},
			],
			20927,
		);
	},
	3196,
	11930,
	(e) => {
		"use strict";
		var t = e.i(20927),
			s = e.i(30208);
		const r = { all: () => ["user"], session: () => [...r.all(), "session"] };
		async function i() {
			const { data: e, error: t } = await s.authClient.getSession();
			if (t) throw Error(t.message);
			return e;
		}
		e.s(["userKeys", 0, r], 11930),
			e.s(
				[
					"useSessionQuery",
					0,
					(e) =>
						(0, t.useQuery)({
							queryFn: async () => await i(),
							queryKey: r.session(),
							initialData: e,
							retry: 1,
						}),
				],
				3196,
			);
	},
	57097,
	(e) => {
		"use strict";
		var t = e.i(92479),
			s = e.i(74968),
			r = e.i(25999),
			i = e.i(94288),
			n = e.i(30679),
			a = class extends i.Subscribable {
				#e;
				#n = void 0;
				#S;
				#j;
				constructor(e, t) {
					super(),
						(this.#e = e),
						this.setOptions(t),
						this.bindMethods(),
						this.#O();
				}
				bindMethods() {
					(this.mutate = this.mutate.bind(this)),
						(this.reset = this.reset.bind(this));
				}
				setOptions(e) {
					const t = this.options;
					(this.options = this.#e.defaultMutationOptions(e)),
						(0, n.shallowEqualObjects)(this.options, t) ||
							this.#e.getMutationCache().notify({
								type: "observerOptionsUpdated",
								mutation: this.#S,
								observer: this,
							}),
						t?.mutationKey &&
						this.options.mutationKey &&
						(0, n.hashKey)(t.mutationKey) !==
							(0, n.hashKey)(this.options.mutationKey)
							? this.reset()
							: this.#S?.state.status === "pending" &&
								this.#S.setOptions(this.options);
				}
				onUnsubscribe() {
					this.hasListeners() || this.#S?.removeObserver(this);
				}
				onMutationUpdate(e) {
					this.#O(), this.#Q(e);
				}
				getCurrentResult() {
					return this.#n;
				}
				reset() {
					this.#S?.removeObserver(this),
						(this.#S = void 0),
						this.#O(),
						this.#Q();
				}
				mutate(e, t) {
					return (
						(this.#j = t),
						this.#S?.removeObserver(this),
						(this.#S = this.#e.getMutationCache().build(this.#e, this.options)),
						this.#S.addObserver(this),
						this.#S.execute(e)
					);
				}
				#O() {
					const e = this.#S?.state ?? (0, s.getDefaultState)();
					this.#n = {
						...e,
						isPending: "pending" === e.status,
						isSuccess: "success" === e.status,
						isError: "error" === e.status,
						isIdle: "idle" === e.status,
						mutate: this.mutate,
						reset: this.reset,
					};
				}
				#Q(e) {
					r.notifyManager.batch(() => {
						if (this.#j && this.hasListeners()) {
							const t = this.#n.variables,
								s = this.#n.context,
								r = {
									client: this.#e,
									meta: this.options.meta,
									mutationKey: this.options.mutationKey,
								};
							if (e?.type === "success") {
								try {
									this.#j.onSuccess?.(e.data, t, s, r);
								} catch (e) {
									Promise.reject(e);
								}
								try {
									this.#j.onSettled?.(e.data, null, t, s, r);
								} catch (e) {
									Promise.reject(e);
								}
							} else if (e?.type === "error") {
								try {
									this.#j.onError?.(e.error, t, s, r);
								} catch (e) {
									Promise.reject(e);
								}
								try {
									this.#j.onSettled?.(void 0, e.error, t, s, r);
								} catch (e) {
									Promise.reject(e);
								}
							}
						}
						this.listeners.forEach((e) => {
							e(this.#n);
						});
					});
				}
			},
			o = e.i(93444);
		e.s(
			[
				"useMutation",
				0,
				function (e, s) {
					const i = (0, o.useQueryClient)(s),
						[u] = t.useState(() => new a(i, e));
					t.useEffect(() => {
						u.setOptions(e);
					}, [u, e]);
					const l = t.useSyncExternalStore(
							t.useCallback(
								(e) => u.subscribe(r.notifyManager.batchCalls(e)),
								[u],
							),
							() => u.getCurrentResult(),
							() => u.getCurrentResult(),
						),
						c = t.useCallback(
							(e, t) => {
								u.mutate(e, t).catch(n.noop);
							},
							[u],
						);
					if (
						l.error &&
						(0, n.shouldThrowError)(u.options.throwOnError, [l.error])
					)
						throw l.error;
					return { ...l, mutate: c, mutateAsync: l.mutate };
				},
			],
			57097,
		);
	},
	68191,
	(e) => {
		"use strict";
		var t = e.i(57097),
			s = e.i(16003),
			r = e.i(30208),
			i = e.i(88038);
		async function n() {
			const { data: e, error: t } = await r.authClient.signOut();
			if (t) throw Error(t.message);
			return e;
		}
		e.s([
			"useSignOutMutation",
			0,
			() => {
				const e = (0, i.getQueryClient)();
				return (0, t.useMutation)({
					mutationFn: n,
					onSettled: () => {
						e.clear();
					},
					onSuccess: () => {
						s.toast.success("Successfully signed out!");
					},
					onError: (e) => {
						s.toast.error(e.message || "Failed to sign out");
					},
				});
			},
		]);
	},
	46921,
	(e) => {
		"use strict";
		var t = e.i(620),
			s = e.i(72811),
			r = e.i(92479),
			i = e.i(16003),
			n = e.i(92192),
			a = e.i(38699),
			o = e.i(38901),
			u = e.i(98747),
			l = e.i(3196),
			c = e.i(68191),
			h = e.i(30208);
		e.s([
			"default",
			0,
			function () {
				const [e, d] = (0, r.useState)(""),
					[p, m] = (0, r.useState)(""),
					[f, y] = (0, r.useTransition)(),
					{ data: v, isPending: g, error: b } = (0, l.useSessionQuery)(),
					x = (0, c.useSignOutMutation)(),
					R = async () => {
						y(async () => {
							await h.authClient.signIn.email(
								{ email: e, password: p, callbackURL: "/client-test" },
								{
									onError: (e) => {
										i.toast.error(e.error.message);
									},
									onSuccess: () => {
										i.toast.success("Successfully logged in!"), d(""), m("");
									},
								},
							);
						});
					};
				return (0, t.jsxs)("div", {
					className: "container mx-auto py-10 space-y-8",
					children: [
						(0, t.jsx)("h1", {
							className: "text-2xl font-bold text-center",
							children: "Client Authentication Test",
						}),
						(0, t.jsxs)("div", {
							className: "grid grid-cols-1 md:grid-cols-2 gap-8",
							children: [
								(0, t.jsxs)(a.Card, {
									children: [
										(0, t.jsxs)(a.CardHeader, {
											children: [
												(0, t.jsx)(a.CardTitle, { children: "Sign In" }),
												(0, t.jsx)(a.CardDescription, {
													children: "Enter your email and password to sign in",
												}),
											],
										}),
										(0, t.jsx)(a.CardContent, {
											children: (0, t.jsxs)("div", {
												className: "grid gap-4",
												children: [
													(0, t.jsxs)("div", {
														className: "grid gap-2",
														children: [
															(0, t.jsx)(u.Label, {
																htmlFor: "email",
																children: "Email",
															}),
															(0, t.jsx)(o.Input, {
																id: "email",
																type: "email",
																placeholder: "m@example.com",
																value: e,
																onChange: (e) => d(e.target.value),
															}),
														],
													}),
													(0, t.jsxs)("div", {
														className: "grid gap-2",
														children: [
															(0, t.jsx)(u.Label, {
																htmlFor: "password",
																children: "Password",
															}),
															(0, t.jsx)(o.Input, {
																id: "password",
																type: "password",
																placeholder: "••••••••",
																value: p,
																onChange: (e) => m(e.target.value),
															}),
														],
													}),
												],
											}),
										}),
										(0, t.jsx)(a.CardFooter, {
											children: (0, t.jsx)(n.Button, {
												className: "w-full",
												onClick: R,
												disabled: f,
												children: f
													? (0, t.jsxs)(t.Fragment, {
															children: [
																(0, t.jsx)(s.Loader2, {
																	size: 16,
																	className: "mr-2 animate-spin",
																}),
																"Signing in...",
															],
														})
													: "Sign In",
											}),
										}),
									],
								}),
								(0, t.jsxs)(a.Card, {
									children: [
										(0, t.jsxs)(a.CardHeader, {
											children: [
												(0, t.jsx)(a.CardTitle, {
													children: "Session Information",
												}),
												(0, t.jsx)(a.CardDescription, {
													children: g
														? "Loading session..."
														: v
															? "You are currently logged in"
															: "You are not logged in",
												}),
											],
										}),
										(0, t.jsx)(a.CardContent, {
											children: g
												? (0, t.jsx)("div", {
														className: "flex justify-center py-4",
														children: (0, t.jsx)(s.Loader2, {
															className:
																"h-8 w-8 animate-spin text-muted-foreground",
														}),
													})
												: b
													? (0, t.jsxs)("div", {
															className:
																"p-4 bg-destructive/10 text-destructive rounded-md",
															children: ["Error: ", b.message],
														})
													: v
														? (0, t.jsxs)("div", {
																className: "space-y-4",
																children: [
																	(0, t.jsxs)("div", {
																		className: "flex items-center gap-4",
																		children: [
																			v.user.image
																				? (0, t.jsx)("img", {
																						src: v.user.image,
																						alt: "Profile",
																						className:
																							"h-12 w-12 rounded-full object-cover",
																					})
																				: (0, t.jsx)("div", {
																						className:
																							"h-12 w-12 rounded-full bg-muted flex items-center justify-center",
																						children: (0, t.jsx)("span", {
																							className: "text-lg font-medium",
																							children:
																								v.user.name?.charAt(0) ||
																								v.user.email?.charAt(0),
																						}),
																					}),
																			(0, t.jsxs)("div", {
																				children: [
																					(0, t.jsx)("p", {
																						className: "font-medium",
																						children: v.user.name,
																					}),
																					(0, t.jsx)("p", {
																						className:
																							"text-sm text-muted-foreground",
																						children: v.user.email,
																					}),
																				],
																			}),
																		],
																	}),
																	(0, t.jsxs)("div", {
																		className: "rounded-md bg-muted p-4",
																		children: [
																			(0, t.jsx)("p", {
																				className: "text-sm font-medium mb-2",
																				children: "Session Details:",
																			}),
																			(0, t.jsx)("pre", {
																				className:
																					"text-xs overflow-auto max-h-40",
																				children: JSON.stringify(v, null, 2),
																			}),
																		],
																	}),
																],
															})
														: (0, t.jsx)("div", {
																className:
																	"py-8 text-center text-muted-foreground",
																children: (0, t.jsx)("p", {
																	children:
																		"Sign in to view your session information",
																}),
															}),
										}),
										v &&
											(0, t.jsx)(a.CardFooter, {
												children: (0, t.jsx)(n.Button, {
													variant: "outline",
													className: "w-full",
													onClick: () => x.mutate(),
													disabled: x.isPending,
													children: x.isPending
														? (0, t.jsx)(s.Loader2, {
																className: "animate-spin",
																size: 16,
															})
														: "Sign Out",
												}),
											}),
									],
								}),
							],
						}),
					],
				});
			},
		]);
	},
]);
