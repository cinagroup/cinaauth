(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
	"object" == typeof document ? document.currentScript : void 0,
	93444,
	(t) => {
		"use strict";
		var e = t.i(92479),
			i = t.i(620),
			s = e.createContext(void 0);
		t.s([
			"QueryClientProvider",
			0,
			({ client: t, children: r }) => (
				e.useEffect(
					() => (
						t.mount(),
						() => {
							t.unmount();
						}
					),
					[t],
				),
				(0, i.jsx)(s.Provider, { value: t, children: r })
			),
			"useQueryClient",
			0,
			(t) => {
				const i = e.useContext(s);
				if (t) return t;
				if (!i)
					throw Error("No QueryClient set, use QueryClientProvider to set one");
				return i;
			},
		]);
	},
	51155,
	(t) => {
		"use strict";
		var e = {
				setTimeout: (t, e) => setTimeout(t, e),
				clearTimeout: (t) => clearTimeout(t),
				setInterval: (t, e) => setInterval(t, e),
				clearInterval: (t) => clearInterval(t),
			},
			i = new (class {
				#t = e;
				#e = !1;
				setTimeoutProvider(t) {
					this.#t = t;
				}
				setTimeout(t, e) {
					return this.#t.setTimeout(t, e);
				}
				clearTimeout(t) {
					this.#t.clearTimeout(t);
				}
				setInterval(t, e) {
					return this.#t.setInterval(t, e);
				}
				clearInterval(t) {
					this.#t.clearInterval(t);
				}
			})();
		t.s([
			"systemSetTimeoutZero",
			0,
			function (t) {
				setTimeout(t, 0);
			},
			"timeoutManager",
			0,
			i,
		]);
	},
	30679,
	(t) => {
		"use strict";
		var e = t.i(51155),
			i = "u" < typeof window || "Deno" in globalThis;
		function s(t, e) {
			return (e?.queryKeyHashFn || r)(t);
		}
		function r(t) {
			return JSON.stringify(t, (t, e) =>
				u(e)
					? Object.keys(e)
							.sort()
							.reduce((t, i) => ((t[i] = e[i]), t), {})
					: e,
			);
		}
		function n(t, e) {
			return (
				t === e ||
				(typeof t == typeof e &&
					!!t &&
					!!e &&
					"object" == typeof t &&
					"object" == typeof e &&
					Object.keys(e).every((i) => n(t[i], e[i])))
			);
		}
		var a = Object.prototype.hasOwnProperty;
		function o(t) {
			return Array.isArray(t) && t.length === Object.keys(t).length;
		}
		function u(t) {
			if (!h(t)) return !1;
			const e = t.constructor;
			if (void 0 === e) return !0;
			const i = e.prototype;
			return (
				!!h(i) &&
				!!i.hasOwnProperty("isPrototypeOf") &&
				Object.getPrototypeOf(t) === Object.prototype
			);
		}
		function h(t) {
			return "[object Object]" === Object.prototype.toString.call(t);
		}
		var c = Symbol();
		t.s([
			"addConsumeAwareSignal",
			0,
			function (t, e, i) {
				let s,
					r = !1;
				return (
					Object.defineProperty(t, "signal", {
						enumerable: !0,
						get: () => (
							(s ??= e()),
							r ||
								((r = !0),
								s.aborted ? i() : s.addEventListener("abort", i, { once: !0 })),
							s
						),
					}),
					t
				);
			},
			"addToEnd",
			0,
			function (t, e, i = 0) {
				const s = [...t, e];
				return i && s.length > i ? s.slice(1) : s;
			},
			"addToStart",
			0,
			function (t, e, i = 0) {
				const s = [e, ...t];
				return i && s.length > i ? s.slice(0, -1) : s;
			},
			"ensureQueryFn",
			0,
			function (t, e) {
				return !t.queryFn && e?.initialPromise
					? () => e.initialPromise
					: t.queryFn && t.queryFn !== c
						? t.queryFn
						: () => Promise.reject(Error(`Missing queryFn: '${t.queryHash}'`));
			},
			"functionalUpdate",
			0,
			function (t, e) {
				return "function" == typeof t ? t(e) : t;
			},
			"hashKey",
			0,
			r,
			"hashQueryKeyByOptions",
			0,
			s,
			"isServer",
			0,
			i,
			"isValidTimeout",
			0,
			function (t) {
				return "number" == typeof t && t >= 0 && t !== 1 / 0;
			},
			"matchMutation",
			0,
			function (t, e) {
				const { exact: i, status: s, predicate: a, mutationKey: o } = t;
				if (o) {
					if (!e.options.mutationKey) return !1;
					if (i) {
						if (r(e.options.mutationKey) !== r(o)) return !1;
					} else if (!n(e.options.mutationKey, o)) return !1;
				}
				return (!s || e.state.status === s) && (!a || !!a(e));
			},
			"matchQuery",
			0,
			function (t, e) {
				const {
					type: i = "all",
					exact: r,
					fetchStatus: a,
					predicate: o,
					queryKey: u,
					stale: h,
				} = t;
				if (u) {
					if (r) {
						if (e.queryHash !== s(u, e.options)) return !1;
					} else if (!n(e.queryKey, u)) return !1;
				}
				if ("all" !== i) {
					const t = e.isActive();
					if (("active" === i && !t) || ("inactive" === i && t)) return !1;
				}
				return (
					("boolean" != typeof h || e.isStale() === h) &&
					(!a || a === e.state.fetchStatus) &&
					(!o || !!o(e))
				);
			},
			"noop",
			0,
			function () {},
			"partialMatchKey",
			0,
			n,
			"replaceData",
			0,
			function (t, e, i) {
				return "function" == typeof i.structuralSharing
					? i.structuralSharing(t, e)
					: !1 !== i.structuralSharing
						? (function t(e, i, s = 0) {
								if (e === i) return e;
								if (s > 500) return i;
								const r = o(e) && o(i);
								if (!r && !(u(e) && u(i))) return i;
								let n = (r ? e : Object.keys(e)).length,
									h = r ? i : Object.keys(i),
									c = h.length,
									l = r ? Array(c) : {},
									d = 0;
								for (let o = 0; o < c; o++) {
									const u = r ? o : h[o],
										c = e[u],
										f = i[u];
									if (c === f) {
										(l[u] = c), (r ? o < n : a.call(e, u)) && d++;
										continue;
									}
									if (
										null === c ||
										null === f ||
										"object" != typeof c ||
										"object" != typeof f
									) {
										l[u] = f;
										continue;
									}
									const p = t(c, f, s + 1);
									(l[u] = p), p === c && d++;
								}
								return n === c && d === n ? e : l;
							})(t, e)
						: e;
			},
			"resolveQueryBoolean",
			0,
			function (t, e) {
				return "function" == typeof t ? t(e) : t;
			},
			"resolveStaleTime",
			0,
			function (t, e) {
				return "function" == typeof t ? t(e) : t;
			},
			"shallowEqualObjects",
			0,
			function (t, e) {
				if (!e || Object.keys(t).length !== Object.keys(e).length) return !1;
				for (const i in t) if (t[i] !== e[i]) return !1;
				return !0;
			},
			"shouldThrowError",
			0,
			function (t, e) {
				return "function" == typeof t ? t(...e) : !!t;
			},
			"skipToken",
			0,
			c,
			"sleep",
			0,
			function (t) {
				return new Promise((i) => {
					e.timeoutManager.setTimeout(i, t);
				});
			},
			"timeUntilStale",
			0,
			function (t, e) {
				return Math.max(t + (e || 0) - Date.now(), 0);
			},
		]);
	},
	25617,
	(t) => {
		"use strict";
		var e = t.i(30679);
		t.s([
			"pendingThenable",
			0,
			function () {
				let t,
					e,
					i = new Promise((i, s) => {
						(t = i), (e = s);
					});
				function s(t) {
					Object.assign(i, t), delete i.resolve, delete i.reject;
				}
				return (
					(i.status = "pending"),
					i.catch(() => {}),
					(i.resolve = (e) => {
						s({ status: "fulfilled", value: e }), t(e);
					}),
					(i.reject = (t) => {
						s({ status: "rejected", reason: t }), e(t);
					}),
					i
				);
			},
			"tryResolveSync",
			0,
			function (t) {
				let i;
				if ((t.then((t) => ((i = t), t), e.noop)?.catch(e.noop), void 0 !== i))
					return { data: i };
			},
		]);
	},
	25999,
	(t) => {
		"use strict";
		let e, i, s, r, n, a;
		var o = t.i(51155).systemSetTimeoutZero,
			u =
				((e = []),
				(i = 0),
				(s = (t) => {
					t();
				}),
				(r = (t) => {
					t();
				}),
				(n = o),
				{
					batch: (t) => {
						let a;
						i++;
						try {
							a = t();
						} finally {
							let t;
							--i ||
								((t = e),
								(e = []),
								t.length &&
									n(() => {
										r(() => {
											t.forEach((t) => {
												s(t);
											});
										});
									}));
						}
						return a;
					},
					batchCalls:
						(t) =>
						(...e) => {
							a(() => {
								t(...e);
							});
						},
					schedule: (a = (t) => {
						i
							? e.push(t)
							: n(() => {
									s(t);
								});
					}),
					setNotifyFunction: (t) => {
						s = t;
					},
					setBatchNotifyFunction: (t) => {
						r = t;
					},
					setScheduler: (t) => {
						n = t;
					},
				});
		t.s(["notifyManager", 0, u]);
	},
	53860,
	94288,
	(t) => {
		"use strict";
		var e = class {
			constructor() {
				(this.listeners = new Set()),
					(this.subscribe = this.subscribe.bind(this));
			}
			subscribe(t) {
				return (
					this.listeners.add(t),
					this.onSubscribe(),
					() => {
						this.listeners.delete(t), this.onUnsubscribe();
					}
				);
			}
			hasListeners() {
				return this.listeners.size > 0;
			}
			onSubscribe() {}
			onUnsubscribe() {}
		};
		t.s(["Subscribable", 0, e], 94288);
		var i = new (class extends e {
			#i;
			#s;
			#r;
			constructor() {
				super(),
					(this.#r = (t) => {
						if ("u" > typeof window && window.addEventListener) {
							const e = () => t();
							return (
								window.addEventListener("visibilitychange", e, !1),
								() => {
									window.removeEventListener("visibilitychange", e);
								}
							);
						}
					});
			}
			onSubscribe() {
				this.#s || this.setEventListener(this.#r);
			}
			onUnsubscribe() {
				this.hasListeners() || (this.#s?.(), (this.#s = void 0));
			}
			setEventListener(t) {
				(this.#r = t),
					this.#s?.(),
					(this.#s = t((t) => {
						"boolean" == typeof t ? this.setFocused(t) : this.onFocus();
					}));
			}
			setFocused(t) {
				this.#i !== t && ((this.#i = t), this.onFocus());
			}
			onFocus() {
				const t = this.isFocused();
				this.listeners.forEach((e) => {
					e(t);
				});
			}
			isFocused() {
				return "boolean" == typeof this.#i
					? this.#i
					: globalThis.document?.visibilityState !== "hidden";
			}
		})();
		t.s(["focusManager", 0, i], 53860);
	},
	8590,
	(t) => {
		"use strict";
		var e = t.i(94288),
			i = new (class extends e.Subscribable {
				#n = !0;
				#s;
				#r;
				constructor() {
					super(),
						(this.#r = (t) => {
							if ("u" > typeof window && window.addEventListener) {
								const e = () => t(!0),
									i = () => t(!1);
								return (
									window.addEventListener("online", e, !1),
									window.addEventListener("offline", i, !1),
									() => {
										window.removeEventListener("online", e),
											window.removeEventListener("offline", i);
									}
								);
							}
						});
				}
				onSubscribe() {
					this.#s || this.setEventListener(this.#r);
				}
				onUnsubscribe() {
					this.hasListeners() || (this.#s?.(), (this.#s = void 0));
				}
				setEventListener(t) {
					(this.#r = t), this.#s?.(), (this.#s = t(this.setOnline.bind(this)));
				}
				setOnline(t) {
					this.#n !== t &&
						((this.#n = t),
						this.listeners.forEach((e) => {
							e(t);
						}));
				}
				isOnline() {
					return this.#n;
				}
			})();
		t.s(["onlineManager", 0, i]);
	},
	9630,
	(t) => {
		"use strict";
		let e;
		var i = t.i(30679),
			s =
				((e = () => i.isServer),
				{
					isServer: () => e(),
					setIsServer(t) {
						e = t;
					},
				});
		t.s(["environmentManager", 0, s]);
	},
	91707,
	(t) => {
		"use strict";
		var e = t.i(53860),
			i = t.i(8590),
			s = t.i(25617),
			r = t.i(9630),
			n = t.i(30679);
		function a(t) {
			return Math.min(1e3 * 2 ** t, 3e4);
		}
		function o(t) {
			return (t ?? "online") !== "online" || i.onlineManager.isOnline();
		}
		var u = class extends Error {
			constructor(t) {
				super("CancelledError"),
					(this.revert = t?.revert),
					(this.silent = t?.silent);
			}
		};
		t.s([
			"CancelledError",
			0,
			u,
			"canFetch",
			0,
			o,
			"createRetryer",
			0,
			function (t) {
				let h,
					c = !1,
					l = 0,
					d = (0, s.pendingThenable)(),
					f = () =>
						e.focusManager.isFocused() &&
						("always" === t.networkMode || i.onlineManager.isOnline()) &&
						t.canRun(),
					p = () => o(t.networkMode) && t.canRun(),
					y = (t) => {
						"pending" === d.status && (h?.(), d.resolve(t));
					},
					m = (t) => {
						"pending" === d.status && (h?.(), d.reject(t));
					},
					v = () =>
						new Promise((e) => {
							(h = (t) => {
								("pending" !== d.status || f()) && e(t);
							}),
								t.onPause?.();
						}).then(() => {
							(h = void 0), "pending" === d.status && t.onContinue?.();
						}),
					g = () => {
						let e;
						if ("pending" !== d.status) return;
						const i = 0 === l ? t.initialPromise : void 0;
						try {
							e = i ?? t.fn();
						} catch (t) {
							e = Promise.reject(t);
						}
						Promise.resolve(e)
							.then(y)
							.catch((e) => {
								if ("pending" !== d.status) return;
								const i = t.retry ?? 3 * !r.environmentManager.isServer(),
									s = t.retryDelay ?? a,
									o = "function" == typeof s ? s(l, e) : s,
									u =
										!0 === i ||
										("number" == typeof i && l < i) ||
										("function" == typeof i && i(l, e));
								c || !u
									? m(e)
									: (l++,
										t.onFail?.(l, e),
										(0, n.sleep)(o)
											.then(() => (f() ? void 0 : v()))
											.then(() => {
												c ? m(e) : g();
											}));
							});
					};
				return {
					promise: d,
					status: () => d.status,
					cancel: (e) => {
						if ("pending" === d.status) {
							const i = new u(e);
							m(i), t.onCancel?.(i);
						}
					},
					continue: () => (h?.(), d),
					cancelRetry: () => {
						c = !0;
					},
					continueRetry: () => {
						c = !1;
					},
					canStart: p,
					start: () => (p() ? g() : v().then(g), d),
				};
			},
		]);
	},
	75444,
	(t) => {
		"use strict";
		var e = t.i(51155),
			i = t.i(9630),
			s = t.i(30679),
			r = class {
				#a;
				destroy() {
					this.clearGcTimeout();
				}
				scheduleGc() {
					this.clearGcTimeout(),
						(0, s.isValidTimeout)(this.gcTime) &&
							(this.#a = e.timeoutManager.setTimeout(() => {
								this.optionalRemove();
							}, this.gcTime));
				}
				updateGcTime(t) {
					this.gcTime = Math.max(
						this.gcTime || 0,
						t ?? (i.environmentManager.isServer() ? 1 / 0 : 3e5),
					);
				}
				clearGcTimeout() {
					void 0 !== this.#a &&
						(e.timeoutManager.clearTimeout(this.#a), (this.#a = void 0));
				}
			};
		t.s(["Removable", 0, r]);
	},
	74338,
	(t) => {
		"use strict";
		t.i(49199);
		var e = t.i(30679),
			i = t.i(25999),
			s = t.i(91707),
			r = t.i(75444);
		function n(t, { pages: e, pageParams: i }) {
			const s = e.length - 1;
			return e.length > 0 ? t.getNextPageParam(e[s], e, i[s], i) : void 0;
		}
		var a = class extends r.Removable {
			#o;
			#u;
			#h;
			#c;
			#l;
			#d;
			#f;
			#p;
			constructor(t) {
				super(),
					(this.#p = !1),
					(this.#f = t.defaultOptions),
					this.setOptions(t.options),
					(this.observers = []),
					(this.#l = t.client),
					(this.#c = this.#l.getQueryCache()),
					(this.queryKey = t.queryKey),
					(this.queryHash = t.queryHash),
					(this.#u = h(this.options)),
					(this.state = t.state ?? this.#u),
					this.scheduleGc();
			}
			get meta() {
				return this.options.meta;
			}
			get queryType() {
				return this.#o;
			}
			get promise() {
				return this.#d?.promise;
			}
			setOptions(t) {
				if (
					((this.options = { ...this.#f, ...t }),
					t?._type && (this.#o = t._type),
					this.updateGcTime(this.options.gcTime),
					this.state && void 0 === this.state.data)
				) {
					const t = h(this.options);
					void 0 !== t.data &&
						(this.setState(u(t.data, t.dataUpdatedAt)), (this.#u = t));
				}
			}
			optionalRemove() {
				this.observers.length ||
					"idle" !== this.state.fetchStatus ||
					this.#c.remove(this);
			}
			setData(t, i) {
				const s = (0, e.replaceData)(this.state.data, t, this.options);
				return (
					this.#y({
						data: s,
						type: "success",
						dataUpdatedAt: i?.updatedAt,
						manual: i?.manual,
					}),
					s
				);
			}
			setState(t) {
				this.#y({ type: "setState", state: t });
			}
			cancel(t) {
				const i = this.#d?.promise;
				return (
					this.#d?.cancel(t),
					i ? i.then(e.noop).catch(e.noop) : Promise.resolve()
				);
			}
			destroy() {
				super.destroy(), this.cancel({ silent: !0 });
			}
			get resetState() {
				return this.#u;
			}
			reset() {
				this.destroy(), this.setState(this.resetState);
			}
			isActive() {
				return this.observers.some(
					(t) => !1 !== (0, e.resolveQueryBoolean)(t.options.enabled, this),
				);
			}
			isDisabled() {
				return this.getObserversCount() > 0
					? !this.isActive()
					: this.options.queryFn === e.skipToken || !this.isFetched();
			}
			isFetched() {
				return this.state.dataUpdateCount + this.state.errorUpdateCount > 0;
			}
			isStatic() {
				return (
					this.getObserversCount() > 0 &&
					this.observers.some(
						(t) =>
							"static" === (0, e.resolveStaleTime)(t.options.staleTime, this),
					)
				);
			}
			isStale() {
				return this.getObserversCount() > 0
					? this.observers.some((t) => t.getCurrentResult().isStale)
					: void 0 === this.state.data || this.state.isInvalidated;
			}
			isStaleByTime(t = 0) {
				return (
					void 0 === this.state.data ||
					("static" !== t &&
						(!!this.state.isInvalidated ||
							!(0, e.timeUntilStale)(this.state.dataUpdatedAt, t)))
				);
			}
			onFocus() {
				const t = this.observers.find((t) => t.shouldFetchOnWindowFocus());
				t?.refetch({ cancelRefetch: !1 }), this.#d?.continue();
			}
			onOnline() {
				const t = this.observers.find((t) => t.shouldFetchOnReconnect());
				t?.refetch({ cancelRefetch: !1 }), this.#d?.continue();
			}
			addObserver(t) {
				this.observers.includes(t) ||
					(this.observers.push(t),
					this.clearGcTimeout(),
					this.#c.notify({ type: "observerAdded", query: this, observer: t }));
			}
			removeObserver(t) {
				this.observers.includes(t) &&
					((this.observers = this.observers.filter((e) => e !== t)),
					this.observers.length ||
						(this.#d &&
							(this.#p || this.#m()
								? this.#d.cancel({ revert: !0 })
								: this.#d.cancelRetry()),
						this.scheduleGc()),
					this.#c.notify({
						type: "observerRemoved",
						query: this,
						observer: t,
					}));
			}
			getObserversCount() {
				return this.observers.length;
			}
			#m() {
				return (
					"paused" === this.state.fetchStatus && "pending" === this.state.status
				);
			}
			invalidate() {
				this.state.isInvalidated || this.#y({ type: "invalidate" });
			}
			async fetch(t, i) {
				var r;
				let a;
				if (
					"idle" !== this.state.fetchStatus &&
					this.#d?.status() !== "rejected"
				) {
					if (void 0 !== this.state.data && i?.cancelRefetch)
						this.cancel({ silent: !0 });
					else if (this.#d) return this.#d.continueRetry(), this.#d.promise;
				}
				if ((t && this.setOptions(t), !this.options.queryFn)) {
					const t = this.observers.find((t) => t.options.queryFn);
					t && this.setOptions(t.options);
				}
				const o = new AbortController(),
					u = (t) => {
						Object.defineProperty(t, "signal", {
							enumerable: !0,
							get: () => ((this.#p = !0), o.signal),
						});
					},
					h = () => {
						let t,
							s = (0, e.ensureQueryFn)(this.options, i),
							r =
								(u(
									(t = {
										client: this.#l,
										queryKey: this.queryKey,
										meta: this.meta,
									}),
								),
								t);
						return ((this.#p = !1), this.options.persister)
							? this.options.persister(s, r, this)
							: s(r);
					},
					c =
						(u(
							(a = {
								fetchOptions: i,
								options: this.options,
								queryKey: this.queryKey,
								client: this.#l,
								state: this.state,
								fetchFn: h,
							}),
						),
						a),
					l =
						"infinite" === this.#o
							? ((r = this.options.pages),
								{
									onFetch: (t, i) => {
										let s = t.options,
											a = t.fetchOptions?.meta?.fetchMore?.direction,
											o = t.state.data?.pages || [],
											u = t.state.data?.pageParams || [],
											h = { pages: [], pageParams: [] },
											c = 0,
											l = async () => {
												let i = !1,
													l = (0, e.ensureQueryFn)(t.options, t.fetchOptions),
													d = async (s, r, n) => {
														let a;
														if (i) return Promise.reject(t.signal.reason);
														if (null == r && s.pages.length)
															return Promise.resolve(s);
														const o =
																((a = {
																	client: t.client,
																	queryKey: t.queryKey,
																	pageParam: r,
																	direction: n ? "backward" : "forward",
																	meta: t.options.meta,
																}),
																(0, e.addConsumeAwareSignal)(
																	a,
																	() => t.signal,
																	() => (i = !0),
																),
																a),
															u = await l(o),
															{ maxPages: h } = t.options,
															c = n ? e.addToStart : e.addToEnd;
														return {
															pages: c(s.pages, u, h),
															pageParams: c(s.pageParams, r, h),
														};
													};
												if (a && o.length) {
													const t = "backward" === a,
														e = { pages: o, pageParams: u },
														i = (
															t
																? function (t, { pages: e, pageParams: i }) {
																		return e.length > 0
																			? t.getPreviousPageParam?.(
																					e[0],
																					e,
																					i[0],
																					i,
																				)
																			: void 0;
																	}
																: n
														)(s, e);
													h = await d(e, i, t);
												} else {
													const t = r ?? o.length;
													do {
														const t =
															0 === c ? (u[0] ?? s.initialPageParam) : n(s, h);
														if (c > 0 && null == t) break;
														(h = await d(h, t)), c++;
													} while (c < t);
												}
												return h;
											};
										t.options.persister
											? (t.fetchFn = () =>
													t.options.persister?.(
														l,
														{
															client: t.client,
															queryKey: t.queryKey,
															meta: t.options.meta,
															signal: t.signal,
														},
														i,
													))
											: (t.fetchFn = l);
									},
								})
							: this.options.behavior;
				l?.onFetch(c, this),
					(this.#h = this.state),
					("idle" === this.state.fetchStatus ||
						this.state.fetchMeta !== c.fetchOptions?.meta) &&
						this.#y({ type: "fetch", meta: c.fetchOptions?.meta }),
					(this.#d = (0, s.createRetryer)({
						initialPromise: i?.initialPromise,
						fn: c.fetchFn,
						onCancel: (t) => {
							t instanceof s.CancelledError &&
								t.revert &&
								this.setState({ ...this.#h, fetchStatus: "idle" }),
								o.abort();
						},
						onFail: (t, e) => {
							this.#y({ type: "failed", failureCount: t, error: e });
						},
						onPause: () => {
							this.#y({ type: "pause" });
						},
						onContinue: () => {
							this.#y({ type: "continue" });
						},
						retry: c.options.retry,
						retryDelay: c.options.retryDelay,
						networkMode: c.options.networkMode,
						canRun: () => !0,
					}));
				try {
					const t = await this.#d.start();
					if (void 0 === t) throw Error(`${this.queryHash} data is undefined`);
					return (
						this.setData(t),
						this.#c.config.onSuccess?.(t, this),
						this.#c.config.onSettled?.(t, this.state.error, this),
						t
					);
				} catch (t) {
					if (t instanceof s.CancelledError) {
						if (t.silent) return this.#d.promise;
						else if (t.revert) {
							if (void 0 === this.state.data) throw t;
							return this.state.data;
						}
					}
					throw (
						(this.#y({ type: "error", error: t }),
						this.#c.config.onError?.(t, this),
						this.#c.config.onSettled?.(this.state.data, t, this),
						t)
					);
				} finally {
					this.scheduleGc();
				}
			}
			#y(t) {
				const e = (e) => {
					switch (t.type) {
						case "failed":
							return {
								...e,
								fetchFailureCount: t.failureCount,
								fetchFailureReason: t.error,
							};
						case "pause":
							return { ...e, fetchStatus: "paused" };
						case "continue":
							return { ...e, fetchStatus: "fetching" };
						case "fetch":
							return {
								...e,
								...o(e.data, this.options),
								fetchMeta: t.meta ?? null,
							};
						case "success":
							const i = {
								...e,
								...u(t.data, t.dataUpdatedAt),
								dataUpdateCount: e.dataUpdateCount + 1,
								...(!t.manual && {
									fetchStatus: "idle",
									fetchFailureCount: 0,
									fetchFailureReason: null,
								}),
							};
							return (this.#h = t.manual ? i : void 0), i;
						case "error":
							const s = t.error;
							return {
								...e,
								error: s,
								errorUpdateCount: e.errorUpdateCount + 1,
								errorUpdatedAt: Date.now(),
								fetchFailureCount: e.fetchFailureCount + 1,
								fetchFailureReason: s,
								fetchStatus: "idle",
								status: "error",
								isInvalidated: !0,
							};
						case "invalidate":
							return { ...e, isInvalidated: !0 };
						case "setState":
							return { ...e, ...t.state };
					}
				};
				(this.state = e(this.state)),
					i.notifyManager.batch(() => {
						this.observers.forEach((t) => {
							t.onQueryUpdate();
						}),
							this.#c.notify({ query: this, type: "updated", action: t });
					});
			}
		};
		function o(t, e) {
			return {
				fetchFailureCount: 0,
				fetchFailureReason: null,
				fetchStatus: (0, s.canFetch)(e.networkMode) ? "fetching" : "paused",
				...(void 0 === t && { error: null, status: "pending" }),
			};
		}
		function u(t, e) {
			return {
				data: t,
				dataUpdatedAt: e ?? Date.now(),
				error: null,
				isInvalidated: !1,
				status: "success",
			};
		}
		function h(t) {
			const e =
					"function" == typeof t.initialData ? t.initialData() : t.initialData,
				i = void 0 !== e,
				s = i
					? "function" == typeof t.initialDataUpdatedAt
						? t.initialDataUpdatedAt()
						: t.initialDataUpdatedAt
					: 0;
			return {
				data: e,
				dataUpdateCount: 0,
				dataUpdatedAt: i ? (s ?? Date.now()) : 0,
				error: null,
				errorUpdateCount: 0,
				errorUpdatedAt: 0,
				fetchFailureCount: 0,
				fetchFailureReason: null,
				fetchMeta: null,
				isInvalidated: !1,
				status: i ? "success" : "pending",
				fetchStatus: "idle",
			};
		}
		t.s(["Query", 0, a, "fetchState", 0, o], 74338);
	},
	74968,
	(t) => {
		"use strict";
		var e = t.i(25999),
			i = t.i(75444),
			s = t.i(91707),
			r = class extends i.Removable {
				#l;
				#v;
				#g;
				#d;
				constructor(t) {
					super(),
						(this.#l = t.client),
						(this.mutationId = t.mutationId),
						(this.#g = t.mutationCache),
						(this.#v = []),
						(this.state = t.state || n()),
						this.setOptions(t.options),
						this.scheduleGc();
				}
				setOptions(t) {
					(this.options = t), this.updateGcTime(this.options.gcTime);
				}
				get meta() {
					return this.options.meta;
				}
				addObserver(t) {
					this.#v.includes(t) ||
						(this.#v.push(t),
						this.clearGcTimeout(),
						this.#g.notify({
							type: "observerAdded",
							mutation: this,
							observer: t,
						}));
				}
				removeObserver(t) {
					(this.#v = this.#v.filter((e) => e !== t)),
						this.scheduleGc(),
						this.#g.notify({
							type: "observerRemoved",
							mutation: this,
							observer: t,
						});
				}
				optionalRemove() {
					this.#v.length ||
						("pending" === this.state.status
							? this.scheduleGc()
							: this.#g.remove(this));
				}
				continue() {
					return this.#d?.continue() ?? this.execute(this.state.variables);
				}
				async execute(t) {
					const e = () => {
							this.#y({ type: "continue" });
						},
						i = {
							client: this.#l,
							meta: this.options.meta,
							mutationKey: this.options.mutationKey,
						};
					this.#d = (0, s.createRetryer)({
						fn: () =>
							this.options.mutationFn
								? this.options.mutationFn(t, i)
								: Promise.reject(Error("No mutationFn found")),
						onFail: (t, e) => {
							this.#y({ type: "failed", failureCount: t, error: e });
						},
						onPause: () => {
							this.#y({ type: "pause" });
						},
						onContinue: e,
						retry: this.options.retry ?? 0,
						retryDelay: this.options.retryDelay,
						networkMode: this.options.networkMode,
						canRun: () => this.#g.canRun(this),
					});
					const r = "pending" === this.state.status,
						n = !this.#d.canStart();
					try {
						if (r) e();
						else {
							this.#y({ type: "pending", variables: t, isPaused: n }),
								this.#g.config.onMutate &&
									(await this.#g.config.onMutate(t, this, i));
							const e = await this.options.onMutate?.(t, i);
							e !== this.state.context &&
								this.#y({
									type: "pending",
									context: e,
									variables: t,
									isPaused: n,
								});
						}
						const s = await this.#d.start();
						return (
							await this.#g.config.onSuccess?.(
								s,
								t,
								this.state.context,
								this,
								i,
							),
							await this.options.onSuccess?.(s, t, this.state.context, i),
							await this.#g.config.onSettled?.(
								s,
								null,
								this.state.variables,
								this.state.context,
								this,
								i,
							),
							await this.options.onSettled?.(s, null, t, this.state.context, i),
							this.#y({ type: "success", data: s }),
							s
						);
					} catch (e) {
						try {
							await this.#g.config.onError?.(e, t, this.state.context, this, i);
						} catch (t) {
							Promise.reject(t);
						}
						try {
							await this.options.onError?.(e, t, this.state.context, i);
						} catch (t) {
							Promise.reject(t);
						}
						try {
							await this.#g.config.onSettled?.(
								void 0,
								e,
								this.state.variables,
								this.state.context,
								this,
								i,
							);
						} catch (t) {
							Promise.reject(t);
						}
						try {
							await this.options.onSettled?.(
								void 0,
								e,
								t,
								this.state.context,
								i,
							);
						} catch (t) {
							Promise.reject(t);
						}
						throw (this.#y({ type: "error", error: e }), e);
					} finally {
						this.#g.runNext(this);
					}
				}
				#y(t) {
					(this.state = ((e) => {
						switch (t.type) {
							case "failed":
								return {
									...e,
									failureCount: t.failureCount,
									failureReason: t.error,
								};
							case "pause":
								return { ...e, isPaused: !0 };
							case "continue":
								return { ...e, isPaused: !1 };
							case "pending":
								return {
									...e,
									context: t.context,
									data: void 0,
									failureCount: 0,
									failureReason: null,
									error: null,
									isPaused: t.isPaused,
									status: "pending",
									variables: t.variables,
									submittedAt: Date.now(),
								};
							case "success":
								return {
									...e,
									data: t.data,
									failureCount: 0,
									failureReason: null,
									error: null,
									status: "success",
									isPaused: !1,
								};
							case "error":
								return {
									...e,
									data: void 0,
									error: t.error,
									failureCount: e.failureCount + 1,
									failureReason: t.error,
									isPaused: !1,
									status: "error",
								};
						}
					})(this.state)),
						e.notifyManager.batch(() => {
							this.#v.forEach((e) => {
								e.onMutationUpdate(t);
							}),
								this.#g.notify({ mutation: this, type: "updated", action: t });
						});
				}
			};
		function n() {
			return {
				context: void 0,
				data: void 0,
				error: null,
				failureCount: 0,
				failureReason: null,
				isPaused: !1,
				status: "idle",
				variables: void 0,
				submittedAt: 0,
			};
		}
		t.s(["Mutation", 0, r, "getDefaultState", 0, n]);
	},
	88038,
	(t) => {
		"use strict";
		let e;
		t.i(49199), t.i(25617);
		var i = t.i(30679),
			s = t.i(74338),
			r = t.i(25999),
			n = t.i(94288),
			a = class extends n.Subscribable {
				constructor(t = {}) {
					super(), (this.config = t), (this.#b = new Map());
				}
				#b;
				build(t, e, r) {
					let n = e.queryKey,
						a = e.queryHash ?? (0, i.hashQueryKeyByOptions)(n, e),
						o = this.get(a);
					return (
						o ||
							((o = new s.Query({
								client: t,
								queryKey: n,
								queryHash: a,
								options: t.defaultQueryOptions(e),
								state: r,
								defaultOptions: t.getQueryDefaults(n),
							})),
							this.add(o)),
						o
					);
				}
				add(t) {
					this.#b.has(t.queryHash) ||
						(this.#b.set(t.queryHash, t),
						this.notify({ type: "added", query: t }));
				}
				remove(t) {
					const e = this.#b.get(t.queryHash);
					e &&
						(t.destroy(),
						e === t && this.#b.delete(t.queryHash),
						this.notify({ type: "removed", query: t }));
				}
				clear() {
					r.notifyManager.batch(() => {
						this.getAll().forEach((t) => {
							this.remove(t);
						});
					});
				}
				get(t) {
					return this.#b.get(t);
				}
				getAll() {
					return [...this.#b.values()];
				}
				find(t) {
					const e = { exact: !0, ...t };
					return this.getAll().find((t) => (0, i.matchQuery)(e, t));
				}
				findAll(t = {}) {
					const e = this.getAll();
					return Object.keys(t).length > 0
						? e.filter((e) => (0, i.matchQuery)(t, e))
						: e;
				}
				notify(t) {
					r.notifyManager.batch(() => {
						this.listeners.forEach((e) => {
							e(t);
						});
					});
				}
				onFocus() {
					r.notifyManager.batch(() => {
						this.getAll().forEach((t) => {
							t.onFocus();
						});
					});
				}
				onOnline() {
					r.notifyManager.batch(() => {
						this.getAll().forEach((t) => {
							t.onOnline();
						});
					});
				}
			},
			o = t.i(74968),
			u = n,
			h = class extends u.Subscribable {
				constructor(t = {}) {
					super(),
						(this.config = t),
						(this.#C = new Set()),
						(this.#O = new Map()),
						(this.#S = 0);
				}
				#C;
				#O;
				#S;
				build(t, e, i) {
					const s = new o.Mutation({
						client: t,
						mutationCache: this,
						mutationId: ++this.#S,
						options: t.defaultMutationOptions(e),
						state: i,
					});
					return this.add(s), s;
				}
				add(t) {
					this.#C.add(t);
					const e = c(t);
					if ("string" == typeof e) {
						const i = this.#O.get(e);
						i ? i.push(t) : this.#O.set(e, [t]);
					}
					this.notify({ type: "added", mutation: t });
				}
				remove(t) {
					if (this.#C.delete(t)) {
						const e = c(t);
						if ("string" == typeof e) {
							const i = this.#O.get(e);
							if (i)
								if (i.length > 1) {
									const e = i.indexOf(t);
									-1 !== e && i.splice(e, 1);
								} else i[0] === t && this.#O.delete(e);
						}
					}
					this.notify({ type: "removed", mutation: t });
				}
				canRun(t) {
					const e = c(t);
					if ("string" != typeof e) return !0;
					{
						const i = this.#O.get(e),
							s = i?.find((t) => "pending" === t.state.status);
						return !s || s === t;
					}
				}
				runNext(t) {
					const e = c(t);
					if ("string" != typeof e) return Promise.resolve();
					{
						const i = this.#O.get(e)?.find((e) => e !== t && e.state.isPaused);
						return i?.continue() ?? Promise.resolve();
					}
				}
				clear() {
					r.notifyManager.batch(() => {
						this.#C.forEach((t) => {
							this.notify({ type: "removed", mutation: t });
						}),
							this.#C.clear(),
							this.#O.clear();
					});
				}
				getAll() {
					return Array.from(this.#C);
				}
				find(t) {
					const e = { exact: !0, ...t };
					return this.getAll().find((t) => (0, i.matchMutation)(e, t));
				}
				findAll(t = {}) {
					return this.getAll().filter((e) => (0, i.matchMutation)(t, e));
				}
				notify(t) {
					r.notifyManager.batch(() => {
						this.listeners.forEach((e) => {
							e(t);
						});
					});
				}
				resumePausedMutations() {
					const t = this.getAll().filter((t) => t.state.isPaused);
					return r.notifyManager.batch(() =>
						Promise.all(t.map((t) => t.continue().catch(i.noop))),
					);
				}
			};
		function c(t) {
			return t.options.scope?.id;
		}
		var l = t.i(53860),
			d = t.i(8590),
			f = class {
				#w;
				#g;
				#f;
				#q;
				#M;
				#P;
				#T;
				#F;
				constructor(t = {}) {
					(this.#w = t.queryCache || new a()),
						(this.#g = t.mutationCache || new h()),
						(this.#f = t.defaultOptions || {}),
						(this.#q = new Map()),
						(this.#M = new Map()),
						(this.#P = 0);
				}
				mount() {
					this.#P++,
						1 === this.#P &&
							((this.#T = l.focusManager.subscribe(async (t) => {
								t && (await this.resumePausedMutations(), this.#w.onFocus());
							})),
							(this.#F = d.onlineManager.subscribe(async (t) => {
								t && (await this.resumePausedMutations(), this.#w.onOnline());
							})));
				}
				unmount() {
					this.#P--,
						0 === this.#P &&
							(this.#T?.(),
							(this.#T = void 0),
							this.#F?.(),
							(this.#F = void 0));
				}
				isFetching(t) {
					return this.#w.findAll({ ...t, fetchStatus: "fetching" }).length;
				}
				isMutating(t) {
					return this.#g.findAll({ ...t, status: "pending" }).length;
				}
				getQueryData(t) {
					const e = this.defaultQueryOptions({ queryKey: t });
					return this.#w.get(e.queryHash)?.state.data;
				}
				ensureQueryData(t) {
					const e = this.defaultQueryOptions(t),
						s = this.#w.build(this, e),
						r = s.state.data;
					return void 0 === r
						? this.fetchQuery(t)
						: (t.revalidateIfStale &&
								s.isStaleByTime((0, i.resolveStaleTime)(e.staleTime, s)) &&
								this.prefetchQuery(e),
							Promise.resolve(r));
				}
				getQueriesData(t) {
					return this.#w
						.findAll(t)
						.map(({ queryKey: t, state: e }) => [t, e.data]);
				}
				setQueryData(t, e, s) {
					const r = this.defaultQueryOptions({ queryKey: t }),
						n = this.#w.get(r.queryHash),
						a = n?.state.data,
						o = (0, i.functionalUpdate)(e, a);
					if (void 0 !== o)
						return this.#w.build(this, r).setData(o, { ...s, manual: !0 });
				}
				setQueriesData(t, e, i) {
					return r.notifyManager.batch(() =>
						this.#w
							.findAll(t)
							.map(({ queryKey: t }) => [t, this.setQueryData(t, e, i)]),
					);
				}
				getQueryState(t) {
					const e = this.defaultQueryOptions({ queryKey: t });
					return this.#w.get(e.queryHash)?.state;
				}
				removeQueries(t) {
					const e = this.#w;
					r.notifyManager.batch(() => {
						e.findAll(t).forEach((t) => {
							e.remove(t);
						});
					});
				}
				resetQueries(t, e) {
					const i = this.#w;
					return r.notifyManager.batch(
						() => (
							i.findAll(t).forEach((t) => {
								t.reset();
							}),
							this.refetchQueries({ type: "active", ...t }, e)
						),
					);
				}
				cancelQueries(t, e = {}) {
					const s = { revert: !0, ...e };
					return Promise.all(
						r.notifyManager.batch(() =>
							this.#w.findAll(t).map((t) => t.cancel(s)),
						),
					)
						.then(i.noop)
						.catch(i.noop);
				}
				invalidateQueries(t, e = {}) {
					return r.notifyManager.batch(() =>
						(this.#w.findAll(t).forEach((t) => {
							t.invalidate();
						}),
						t?.refetchType === "none")
							? Promise.resolve()
							: this.refetchQueries(
									{ ...t, type: t?.refetchType ?? t?.type ?? "active" },
									e,
								),
					);
				}
				refetchQueries(t, e = {}) {
					const s = { ...e, cancelRefetch: e.cancelRefetch ?? !0 };
					return Promise.all(
						r.notifyManager.batch(() =>
							this.#w
								.findAll(t)
								.filter((t) => !t.isDisabled() && !t.isStatic())
								.map((t) => {
									let e = t.fetch(void 0, s);
									return (
										s.throwOnError || (e = e.catch(i.noop)),
										"paused" === t.state.fetchStatus ? Promise.resolve() : e
									);
								}),
						),
					).then(i.noop);
				}
				fetchQuery(t) {
					const e = this.defaultQueryOptions(t);
					void 0 === e.retry && (e.retry = !1);
					const s = this.#w.build(this, e);
					return s.isStaleByTime((0, i.resolveStaleTime)(e.staleTime, s))
						? s.fetch(e)
						: Promise.resolve(s.state.data);
				}
				prefetchQuery(t) {
					return this.fetchQuery(t).then(i.noop).catch(i.noop);
				}
				fetchInfiniteQuery(t) {
					return (t._type = "infinite"), this.fetchQuery(t);
				}
				prefetchInfiniteQuery(t) {
					return this.fetchInfiniteQuery(t).then(i.noop).catch(i.noop);
				}
				ensureInfiniteQueryData(t) {
					return (t._type = "infinite"), this.ensureQueryData(t);
				}
				resumePausedMutations() {
					return d.onlineManager.isOnline()
						? this.#g.resumePausedMutations()
						: Promise.resolve();
				}
				getQueryCache() {
					return this.#w;
				}
				getMutationCache() {
					return this.#g;
				}
				getDefaultOptions() {
					return this.#f;
				}
				setDefaultOptions(t) {
					this.#f = t;
				}
				setQueryDefaults(t, e) {
					this.#q.set((0, i.hashKey)(t), { queryKey: t, defaultOptions: e });
				}
				getQueryDefaults(t) {
					const e = [...this.#q.values()],
						s = {};
					return (
						e.forEach((e) => {
							(0, i.partialMatchKey)(t, e.queryKey) &&
								Object.assign(s, e.defaultOptions);
						}),
						s
					);
				}
				setMutationDefaults(t, e) {
					this.#M.set((0, i.hashKey)(t), { mutationKey: t, defaultOptions: e });
				}
				getMutationDefaults(t) {
					const e = [...this.#M.values()],
						s = {};
					return (
						e.forEach((e) => {
							(0, i.partialMatchKey)(t, e.mutationKey) &&
								Object.assign(s, e.defaultOptions);
						}),
						s
					);
				}
				defaultQueryOptions(t) {
					if (t._defaulted) return t;
					const e = {
						...this.#f.queries,
						...this.getQueryDefaults(t.queryKey),
						...t,
						_defaulted: !0,
					};
					return (
						e.queryHash ||
							(e.queryHash = (0, i.hashQueryKeyByOptions)(e.queryKey, e)),
						void 0 === e.refetchOnReconnect &&
							(e.refetchOnReconnect = "always" !== e.networkMode),
						void 0 === e.throwOnError && (e.throwOnError = !!e.suspense),
						!e.networkMode && e.persister && (e.networkMode = "offlineFirst"),
						e.queryFn === i.skipToken && (e.enabled = !1),
						e
					);
				}
				defaultMutationOptions(t) {
					return t?._defaulted
						? t
						: {
								...this.#f.mutations,
								...(t?.mutationKey && this.getMutationDefaults(t.mutationKey)),
								...t,
								_defaulted: !0,
							};
				}
				clear() {
					this.#w.clear(), this.#g.clear();
				}
			};
		function p() {
			return new f({
				defaultOptions: {
					queries: { staleTime: 18e4, gcTime: 36e4, retry: 0 },
					dehydrate: {
						shouldDehydrateQuery: (t) =>
							"success" === t.state.status || "pending" === t.state.status,
					},
				},
			});
		}
		t.s(
			[
				"getQueryClient",
				0,
				function () {
					return i.isServer ? p() : (e || (e = p()), e);
				},
			],
			88038,
		);
	},
]);
