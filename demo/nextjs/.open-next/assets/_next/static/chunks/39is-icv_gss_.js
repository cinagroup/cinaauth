(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
	"object" == typeof document ? document.currentScript : void 0,
	49139,
	(e) => {
		"use strict";
		var t = e.i(62613),
			s = e.i(49696);
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
		const l = ({ className: e, ...r }) =>
			(0, t.jsx)("div", {
				className: (0, s.cn)("flex items-center p-6 pt-0", e),
				...r,
			});
		(l.displayName = "CardFooter"),
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
				l,
				"CardHeader",
				0,
				i,
				"CardTitle",
				0,
				n,
			]);
	},
	59597,
	(e) => {
		"use strict";
		let t;
		var s = e.i(28529),
			r = e.i(71790),
			i = e.i(61286),
			n = e.i(16339),
			a = e.i(84520),
			o = e.i(71335),
			l = e.i(89498),
			u = e.i(49479),
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
				#l;
				#u;
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
						this.#x(),
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
								typeof (0, l.resolveQueryBoolean)(
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
							!(0, l.shallowEqualObjects)(this.options, t) &&
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
								(0, l.resolveQueryBoolean)(this.options.enabled, this.#r) !==
									(0, l.resolveQueryBoolean)(t.enabled, this.#r) ||
								(0, l.resolveStaleTime)(this.options.staleTime, this.#r) !==
									(0, l.resolveStaleTime)(t.staleTime, this.#r)) &&
							this.#g();
					const i = this.#R();
					r &&
						(this.#r !== s ||
							(0, l.resolveQueryBoolean)(this.options.enabled, this.#r) !==
								(0, l.resolveQueryBoolean)(t.enabled, this.#r) ||
							i !== this.#p) &&
						this.#j(i);
				}
				getOptimisticResult(e) {
					var t, s;
					const r = this.#e.getQueryCache().build(this.#e, e),
						i = this.createResult(r, e);
					return (
						(t = this),
						(s = i),
						(0, l.shallowEqualObjects)(t.getCurrentResult(), s) ||
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
					return e?.throwOnError || (t = t.catch(l.noop)), t;
				}
				#g() {
					this.#v();
					const e = (0, l.resolveStaleTime)(this.options.staleTime, this.#r);
					if (
						r.environmentManager.isServer() ||
						this.#n.isStale ||
						!(0, l.isValidTimeout)(e)
					)
						return;
					const t = (0, l.timeUntilStale)(this.#n.dataUpdatedAt, e);
					this.#h = u.timeoutManager.setTimeout(() => {
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
				#j(e) {
					this.#x(),
						(this.#p = e),
						!r.environmentManager.isServer() &&
							!1 !==
								(0, l.resolveQueryBoolean)(this.options.enabled, this.#r) &&
							(0, l.isValidTimeout)(this.#p) &&
							0 !== this.#p &&
							(this.#d = u.timeoutManager.setInterval(() => {
								(this.options.refetchIntervalInBackground ||
									s.focusManager.isFocused()) &&
									this.#f();
							}, this.#p));
				}
				#y() {
					this.#g(), this.#j(this.#R());
				}
				#v() {
					void 0 !== this.#h &&
						(u.timeoutManager.clearTimeout(this.#h), (this.#h = void 0));
				}
				#x() {
					void 0 !== this.#d &&
						(u.timeoutManager.clearInterval(this.#d), (this.#d = void 0));
				}
				createResult(e, t) {
					let s,
						r = this.#r,
						i = this.options,
						a = this.#n,
						u = this.#a,
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
					let { error: x, errorUpdatedAt: b, status: g } = y;
					s = y.data;
					let R = !1;
					if (void 0 !== t.placeholderData && void 0 === s && "pending" === g) {
						let e;
						a?.isPlaceholderData && t.placeholderData === c?.placeholderData
							? ((e = a.data), (R = !0))
							: (e =
									"function" == typeof t.placeholderData
										? t.placeholderData(this.#c?.state.data, this.#c)
										: t.placeholderData),
							void 0 !== e &&
								((g = "success"),
								(s = (0, l.replaceData)(a?.data, e, t)),
								(v = !0));
					}
					if (t.select && void 0 !== s && !R)
						if (a && s === u?.data && t.select === this.#l) s = this.#u;
						else
							try {
								(this.#l = t.select),
									(s = t.select(s)),
									(s = (0, l.replaceData)(a?.data, s, t)),
									(this.#u = s),
									(this.#t = null);
							} catch (e) {
								this.#t = e;
							}
					this.#t &&
						((x = this.#t), (s = this.#u), (b = Date.now()), (g = "error"));
					const j = "fetching" === y.fetchStatus,
						C = "pending" === g,
						Q = "error" === g,
						w = C && j,
						S = void 0 !== s,
						I = {
							status: g,
							fetchStatus: y.fetchStatus,
							isPending: C,
							isSuccess: "success" === g,
							isError: Q,
							isInitialLoading: w,
							isLoading: w,
							data: s,
							dataUpdatedAt: y.dataUpdatedAt,
							error: x,
							errorUpdatedAt: b,
							failureCount: y.fetchFailureCount,
							failureReason: y.fetchFailureReason,
							errorUpdateCount: y.errorUpdateCount,
							isFetched: e.isFetched(),
							isFetchedAfterMount:
								y.dataUpdateCount > d.dataUpdateCount ||
								y.errorUpdateCount > d.errorUpdateCount,
							isFetching: j,
							isRefetching: j && !C,
							isLoadingError: Q && !S,
							isPaused: "paused" === y.fetchStatus,
							isPlaceholderData: v,
							isRefetchError: Q && S,
							isStale: m(e, t),
							refetch: this.refetch,
							promise: this.#s,
							isEnabled: !1 !== (0, l.resolveQueryBoolean)(t.enabled, e),
						};
					if (this.options.experimental_prefetchInRender) {
						const t = void 0 !== I.data,
							s = "error" === I.status && !t,
							i = (e) => {
								s ? e.reject(I.error) : t && e.resolve(I.data);
							},
							n = () => {
								i((this.#s = I.promise = (0, o.pendingThenable)()));
							},
							a = this.#s;
						switch (a.status) {
							case "pending":
								e.queryHash === r.queryHash && i(a);
								break;
							case "fulfilled":
								(s || I.data !== a.value) && n();
								break;
							case "rejected":
								(s && I.error === a.reason) || n();
						}
					}
					return I;
				}
				updateResult() {
					const e = this.#n,
						t = this.createResult(this.#r, this.options);
					if (
						((this.#a = this.#r.state),
						(this.#o = this.options),
						void 0 !== this.#a.data && (this.#c = this.#r),
						(0, l.shallowEqualObjects)(t, e))
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
					this.#C({ listeners: s() });
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
				#C(e) {
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
				(!1 !== (0, l.resolveQueryBoolean)(t.enabled, e) &&
					void 0 === e.state.data &&
					("error" !== e.state.status ||
						!1 !== (0, l.resolveQueryBoolean)(t.retryOnMount, e))) ||
				(void 0 !== e.state.data && d(e, t, t.refetchOnMount))
			);
		}
		function d(e, t, s) {
			if (
				!1 !== (0, l.resolveQueryBoolean)(t.enabled, e) &&
				"static" !== (0, l.resolveStaleTime)(t.staleTime, e)
			) {
				const r = "function" == typeof s ? s(e) : s;
				return "always" === r || (!1 !== r && m(e, t));
			}
			return !1;
		}
		function p(e, t, s, r) {
			return (
				(e !== t || !1 === (0, l.resolveQueryBoolean)(r.enabled, e)) &&
				(!s.suspense || "error" !== e.state.status) &&
				m(e, s)
			);
		}
		function m(e, t) {
			return (
				!1 !== (0, l.resolveQueryBoolean)(t.enabled, e) &&
				e.isStaleByTime((0, l.resolveStaleTime)(t.staleTime, e))
			);
		}
		e.i(8343);
		var f = e.i(57319),
			y = e.i(82537);
		e.i(62613);
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
			x = f.createContext(!1);
		x.Provider;
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
							a = f.useContext(x),
							o = f.useContext(v),
							u = (0, y.useQueryClient)(s),
							c = u.defaultQueryOptions(e);
						u.getDefaultOptions().queries?._experimental_beforeQuery?.(c);
						const h = u.getQueryCache().get(c.queryHash),
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
								? (0, l.shouldThrowError)(c.throwOnError, [h.state.error, h])
								: c.throwOnError),
							(c.suspense || c.experimental_prefetchInRender || n) &&
								!o.isReset() &&
								(c.retryOnMount = !1),
							f.useEffect(() => {
								o.clearReset();
							}, [o]);
						const p = !u.getQueryCache().get(c.queryHash),
							[m] = f.useState(() => new t(u, c)),
							g = m.getOptimisticResult(c),
							R = !a && d;
						if (
							(f.useSyncExternalStore(
								f.useCallback(
									(e) => {
										const t = R
											? m.subscribe(i.notifyManager.batchCalls(e))
											: l.noop;
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
							c?.suspense && g.isPending)
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
									(0, l.shouldThrowError)(s, [e.error, r])))({
								result: g,
								errorResetBoundary: o,
								throwOnError: c.throwOnError,
								query: h,
								suspense: c.suspense,
							})
						)
							throw g.error;
						if (
							(u.getDefaultOptions().queries?._experimental_afterQuery?.(c, g),
							c.experimental_prefetchInRender &&
								!r.environmentManager.isServer() &&
								g.isLoading &&
								g.isFetching &&
								!a)
						) {
							const e = p ? b(c, m, o) : h?.promise;
							e?.catch(l.noop).finally(() => {
								m.updateResult();
							});
						}
						return c.notifyOnChangeProps ? g : m.trackResult(g);
					})(e, c, t);
				},
			],
			59597,
		);
	},
	95869,
	(e) => {
		"use strict";
		var t = e.i(57319),
			s = e.i(22903),
			r = e.i(61286),
			i = e.i(84520),
			n = e.i(89498),
			a = class extends i.Subscribable {
				#e;
				#n = void 0;
				#Q;
				#w;
				constructor(e, t) {
					super(),
						(this.#e = e),
						this.setOptions(t),
						this.bindMethods(),
						this.#S();
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
								mutation: this.#Q,
								observer: this,
							}),
						t?.mutationKey &&
						this.options.mutationKey &&
						(0, n.hashKey)(t.mutationKey) !==
							(0, n.hashKey)(this.options.mutationKey)
							? this.reset()
							: this.#Q?.state.status === "pending" &&
								this.#Q.setOptions(this.options);
				}
				onUnsubscribe() {
					this.hasListeners() || this.#Q?.removeObserver(this);
				}
				onMutationUpdate(e) {
					this.#S(), this.#C(e);
				}
				getCurrentResult() {
					return this.#n;
				}
				reset() {
					this.#Q?.removeObserver(this),
						(this.#Q = void 0),
						this.#S(),
						this.#C();
				}
				mutate(e, t) {
					return (
						(this.#w = t),
						this.#Q?.removeObserver(this),
						(this.#Q = this.#e.getMutationCache().build(this.#e, this.options)),
						this.#Q.addObserver(this),
						this.#Q.execute(e)
					);
				}
				#S() {
					const e = this.#Q?.state ?? (0, s.getDefaultState)();
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
				#C(e) {
					r.notifyManager.batch(() => {
						if (this.#w && this.hasListeners()) {
							const t = this.#n.variables,
								s = this.#n.context,
								r = {
									client: this.#e,
									meta: this.options.meta,
									mutationKey: this.options.mutationKey,
								};
							if (e?.type === "success") {
								try {
									this.#w.onSuccess?.(e.data, t, s, r);
								} catch (e) {
									Promise.reject(e);
								}
								try {
									this.#w.onSettled?.(e.data, null, t, s, r);
								} catch (e) {
									Promise.reject(e);
								}
							} else if (e?.type === "error") {
								try {
									this.#w.onError?.(e.error, t, s, r);
								} catch (e) {
									Promise.reject(e);
								}
								try {
									this.#w.onSettled?.(void 0, e.error, t, s, r);
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
			o = e.i(82537);
		e.s(
			[
				"useMutation",
				0,
				function (e, s) {
					const i = (0, o.useQueryClient)(s),
						[l] = t.useState(() => new a(i, e));
					t.useEffect(() => {
						l.setOptions(e);
					}, [l, e]);
					const u = t.useSyncExternalStore(
							t.useCallback(
								(e) => l.subscribe(r.notifyManager.batchCalls(e)),
								[l],
							),
							() => l.getCurrentResult(),
							() => l.getCurrentResult(),
						),
						c = t.useCallback(
							(e, t) => {
								l.mutate(e, t).catch(n.noop);
							},
							[l],
						);
					if (
						u.error &&
						(0, n.shouldThrowError)(l.options.throwOnError, [u.error])
					)
						throw u.error;
					return { ...u, mutate: c, mutateAsync: u.mutate };
				},
			],
			95869,
		);
	},
	73979,
	(e) => {
		"use strict";
		var t = e.i(62613),
			s = e.i(49696);
		e.s([
			"Skeleton",
			0,
			function ({ className: e, ...r }) {
				return (0, t.jsx)("div", {
					className: (0, s.cn)("animate-pulse rounded-md bg-primary/10", e),
					...r,
				});
			},
		]);
	},
	62020,
	(e) => {
		"use strict";
		const t = {
			all: () => ["organization"],
			list: () => [...t.all(), "list"],
			detail: () => [...t.all(), "detail"],
			invitationDetail: (e) => [...t.all(), "invitation", e],
		};
		e.s(["organizationKeys", 0, t]);
	},
	81906,
	(e) => {
		"use strict";
		var t = e.i(62613);
		const s = (0, e.i(10283).default)("circle-alert", [
			["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
			["line", { x1: "12", x2: "12", y1: "8", y2: "12", key: "1pkeuh" }],
			["line", { x1: "12", x2: "12.01", y1: "16", y2: "16", key: "4dfq90" }],
		]);
		var r = e.i(93207),
			i = e.i(69708),
			n = e.i(78592),
			a = e.i(95360),
			o = e.i(57319),
			l = e.i(88642),
			u = e.i(49139),
			c = e.i(73979),
			h = e.i(95869),
			d = e.i(82537),
			p = e.i(61645),
			m = e.i(76706),
			f = e.i(62020);
		async function y(e) {
			const { data: t, error: s } =
				await m.authClient.organization.acceptInvitation({
					invitationId: e.invitationId,
				});
			if (s) throw Error(s.message);
			return t;
		}
		var v = e.i(59597);
		async function x(e) {
			const { data: t, error: s } =
				await m.authClient.organization.getInvitation({
					query: { id: e.invitationId },
				});
			if (s) throw Error(s.message);
			return t;
		}
		var b = e.i(93181);
		async function g(e) {
			const { data: t, error: s } =
				await m.authClient.organization.rejectInvitation({
					invitationId: e.invitationId,
				});
			if (s) throw Error(s.message);
			return t;
		}
		function R() {
			return (0, t.jsxs)(u.Card, {
				className: "w-full max-w-md mx-auto",
				children: [
					(0, t.jsxs)(u.CardHeader, {
						children: [
							(0, t.jsxs)("div", {
								className: "flex items-center space-x-2",
								children: [
									(0, t.jsx)(c.Skeleton, { className: "w-6 h-6 rounded-full" }),
									(0, t.jsx)(c.Skeleton, { className: "h-6 w-24" }),
								],
							}),
							(0, t.jsx)(c.Skeleton, { className: "h-4 w-full mt-2" }),
						],
					}),
					(0, t.jsx)(u.CardContent, {
						children: (0, t.jsxs)("div", {
							className: "space-y-2",
							children: [
								(0, t.jsx)(c.Skeleton, { className: "h-4 w-full" }),
								(0, t.jsx)(c.Skeleton, { className: "h-4 w-full" }),
								(0, t.jsx)(c.Skeleton, { className: "h-4 w-2/3" }),
							],
						}),
					}),
					(0, t.jsx)(u.CardFooter, {
						className: "flex justify-end",
						children: (0, t.jsx)(c.Skeleton, { className: "h-8 w-full" }),
					}),
				],
			});
		}
		function j() {
			return (0, t.jsxs)(u.Card, {
				className: "w-full max-w-md mx-auto",
				children: [
					(0, t.jsxs)(u.CardHeader, {
						children: [
							(0, t.jsxs)("div", {
								className: "flex items-center space-x-2",
								children: [
									(0, t.jsx)(s, { className: "w-6 h-6 text-destructive" }),
									(0, t.jsx)(u.CardTitle, {
										className: "text-xl text-destructive",
										children: "Invitation Error",
									}),
								],
							}),
							(0, t.jsx)(u.CardDescription, {
								children: "There was an issue with your invitation.",
							}),
						],
					}),
					(0, t.jsx)(u.CardContent, {
						children: (0, t.jsx)("p", {
							className: "mb-4 text-sm text-muted-foreground",
							children:
								"The invitation you're trying to access is either invalid or you don't have the correct permissions. Please check your email for a valid invitation or contact the person who sent it.",
						}),
					}),
					(0, t.jsx)(u.CardFooter, {
						children: (0, t.jsx)(n.default, {
							href: "/",
							className: "w-full",
							children: (0, t.jsx)(l.Button, {
								variant: "outline",
								className: "w-full",
								children: "Go back to home",
							}),
						}),
					}),
				],
			});
		}
		e.s(
			[
				"default",
				0,
				function () {
					let e,
						s,
						n,
						c = (0, a.useParams)(),
						m = (0, a.useRouter)(),
						[C, Q] = (0, o.useState)(!1),
						{
							data: w,
							isLoading: S,
							error: I,
						} = ((e = c.id),
						(0, v.useQuery)({
							queryKey: f.organizationKeys.invitationDetail(e),
							queryFn: async () => await x({ invitationId: e }),
							enabled: !!e,
						})),
						O =
							((s = (0, d.useQueryClient)()),
							(0, h.useMutation)({
								mutationFn: y,
								onSuccess: async () => {
									await s.invalidateQueries({
										queryKey: f.organizationKeys.all(),
									}),
										p.toast.success("You have accepted the invitation");
								},
								onError: (e) => {
									p.toast.error(e.message || "Failed to accept the invitation");
								},
							})),
						T =
							((n = (0, b.getQueryClient)()),
							(0, h.useMutation)({
								mutationFn: g,
								onSuccess: async () => {
									await n.invalidateQueries({
										queryKey: f.organizationKeys.all(),
									}),
										p.toast.success("You have declined the invitation");
								},
								onError: (e) => {
									p.toast.error(
										e.message || "Failed to decline the invitation",
									);
								},
							}));
					return S || C
						? (0, t.jsxs)("div", {
								className: "min-h-[80vh] flex items-center justify-center",
								children: [
									(0, t.jsx)("div", {
										className:
											"absolute pointer-events-none inset-0 flex items-center justify-center dark:bg-black bg-white mask-[radial-gradient(ellipse_at_center,transparent_20%,black)]",
									}),
									(0, t.jsx)(R, {}),
								],
							})
						: !w || I
							? (0, t.jsxs)("div", {
									className: "min-h-[80vh] flex items-center justify-center",
									children: [
										(0, t.jsx)("div", {
											className:
												"absolute pointer-events-none inset-0 flex items-center justify-center dark:bg-black bg-white mask-[radial-gradient(ellipse_at_center,transparent_20%,black)]",
										}),
										(0, t.jsx)(j, {}),
									],
								})
							: (0, t.jsxs)("div", {
									className: "min-h-[80vh] flex items-center justify-center",
									children: [
										(0, t.jsx)("div", {
											className:
												"absolute pointer-events-none inset-0 flex items-center justify-center dark:bg-black bg-white mask-[radial-gradient(ellipse_at_center,transparent_20%,black)]",
										}),
										w &&
											(0, t.jsxs)(u.Card, {
												className: "w-full max-w-md",
												children: [
													(0, t.jsxs)(u.CardHeader, {
														children: [
															(0, t.jsx)(u.CardTitle, {
																children: "Organization Invitation",
															}),
															(0, t.jsx)(u.CardDescription, {
																children:
																	"You've been invited to join an organization",
															}),
														],
													}),
													(0, t.jsx)(u.CardContent, {
														children:
															"accepted" === w.status
																? (0, t.jsxs)("div", {
																		className: "space-y-4",
																		children: [
																			(0, t.jsx)("div", {
																				className:
																					"flex items-center justify-center w-16 h-16 mx-auto bg-green-100 rounded-full",
																				children: (0, t.jsx)(r.CheckIcon, {
																					className: "w-8 h-8 text-green-600",
																				}),
																			}),
																			(0, t.jsxs)("h2", {
																				className:
																					"text-2xl font-bold text-center",
																				children: [
																					"Welcome to ",
																					w.organizationName,
																					"!",
																				],
																			}),
																			(0, t.jsx)("p", {
																				className: "text-center",
																				children:
																					"You've successfully joined the organization. We're excited to have you on board!",
																			}),
																		],
																	})
																: "rejected" === w.status
																	? (0, t.jsxs)("div", {
																			className: "space-y-4",
																			children: [
																				(0, t.jsx)("div", {
																					className:
																						"flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full",
																					children: (0, t.jsx)(i.XIcon, {
																						className: "w-8 h-8 text-red-600",
																					}),
																				}),
																				(0, t.jsx)("h2", {
																					className:
																						"text-2xl font-bold text-center",
																					children: "Invitation Declined",
																				}),
																				(0, t.jsxs)("p", {
																					className: "text-center",
																					children: [
																						"You‘ve declined the invitation to join",
																						" ",
																						w.organizationName,
																						".",
																					],
																				}),
																			],
																		})
																	: (0, t.jsxs)("div", {
																			className: "space-y-4",
																			children: [
																				(0, t.jsxs)("p", {
																					children: [
																						(0, t.jsx)("strong", {
																							children: w.inviterEmail,
																						}),
																						" has invited you to join ",
																						(0, t.jsx)("strong", {
																							children: w.organizationName,
																						}),
																						".",
																					],
																				}),
																				(0, t.jsxs)("p", {
																					children: [
																						"This invitation was sent to",
																						" ",
																						(0, t.jsx)("strong", {
																							children: w.email,
																						}),
																						".",
																					],
																				}),
																			],
																		}),
													}),
													"pending" === w.status &&
														(0, t.jsxs)(u.CardFooter, {
															className: "flex justify-between",
															children: [
																(0, t.jsx)(l.Button, {
																	variant: "outline",
																	onClick: () => {
																		T.mutate(
																			{ invitationId: c.id },
																			{
																				onSuccess: () => {
																					Q(!0), m.push("/dashboard");
																				},
																			},
																		);
																	},
																	disabled: T.isPending,
																	children: T.isPending
																		? "Declining..."
																		: "Decline",
																}),
																(0, t.jsx)(l.Button, {
																	onClick: () => {
																		O.mutate(
																			{ invitationId: c.id },
																			{
																				onSuccess: () => {
																					Q(!0), m.push("/dashboard");
																				},
																			},
																		);
																	},
																	disabled: O.isPending,
																	children: O.isPending
																		? "Accepting..."
																		: "Accept Invitation",
																}),
															],
														}),
												],
											}),
									],
								});
				},
			],
			81906,
		);
	},
]);
