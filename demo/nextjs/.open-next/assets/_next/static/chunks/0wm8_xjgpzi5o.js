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
	81799,
	(e) => {
		"use strict";
		var t = e.i(98591);
		e.s(["Check", () => t.default]);
	},
	77542,
	(e) => {
		"use strict";
		var t = e.i(62613),
			r = e.i(67283),
			s = e.i(49696);
		const i = (0, r.cva)(
			"relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
			{
				variants: {
					variant: {
						default: "bg-background text-foreground",
						destructive:
							"text-destructive-foreground [&>svg]:text-current *:data-[slot=alert-description]:text-destructive-foreground/80",
					},
				},
				defaultVariants: { variant: "default" },
			},
		);
		e.s([
			"Alert",
			0,
			function ({ className: e, variant: r, ...n }) {
				return (0, t.jsx)("div", {
					"data-slot": "alert",
					role: "alert",
					className: (0, s.cn)(i({ variant: r }), e),
					...n,
				});
			},
			"AlertDescription",
			0,
			function ({ className: e, ...r }) {
				return (0, t.jsx)("div", {
					"data-slot": "alert-description",
					className: (0, s.cn)(
						"text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
						e,
					),
					...r,
				});
			},
			"AlertTitle",
			0,
			function ({ className: e, ...r }) {
				return (0, t.jsx)("div", {
					"data-slot": "alert-title",
					className: (0, s.cn)(
						"col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
						e,
					),
					...r,
				});
			},
		]);
	},
	25653,
	(e) => {
		"use strict";
		var t = e.i(40798);
		e.s(["X", () => t.default]);
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
	53723,
	(e) => {
		"use strict";
		var t = e.i(62613),
			r = e.i(10283);
		const s = (0, r.default)("eye", [
				[
					"path",
					{
						d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
						key: "1nclc0",
					},
				],
				["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }],
			]),
			i = (0, r.default)("eye-off", [
				[
					"path",
					{
						d: "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",
						key: "ct8e1f",
					},
				],
				["path", { d: "M14.084 14.158a3 3 0 0 1-4.242-4.242", key: "151rxh" }],
				[
					"path",
					{
						d: "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",
						key: "13bj9a",
					},
				],
				["path", { d: "m2 2 20 20", key: "1ooewy" }],
			]);
		var n = e.i(57319),
			a = e.i(88642),
			o = e.i(1359),
			u = e.i(49696);
		const l = ({ ref: e, className: r, ...l }) => {
			const [c, h] = n.useState(!1),
				d = "" === l.value || void 0 === l.value || l.disabled;
			return (0, t.jsxs)("div", {
				className: "relative",
				children: [
					(0, t.jsx)(o.Input, {
						...l,
						type: c ? "text" : "password",
						name: "password_fake",
						className: (0, u.cn)("hide-password-toggle pr-10", r),
						ref: e,
					}),
					(0, t.jsxs)(a.Button, {
						type: "button",
						variant: "ghost",
						size: "sm",
						className:
							"absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent",
						onClick: () => h((e) => !e),
						disabled: d,
						children: [
							c && !d
								? (0, t.jsx)(s, { className: "h-4 w-4", "aria-hidden": "true" })
								: (0, t.jsx)(i, {
										className: "h-4 w-4",
										"aria-hidden": "true",
									}),
							(0, t.jsx)("span", {
								className: "sr-only",
								children: c ? "Hide password" : "Show password",
							}),
						],
					}),
					(0, t.jsx)("style", {
						children: `
                .hide-password-toggle::-ms-reveal,
                .hide-password-toggle::-ms-clear {
                    visibility: hidden;
                    pointer-events: none;
                    display: none;
                }
            `,
					}),
				],
			});
		};
		(l.displayName = "PasswordInput"), e.s(["PasswordInput", 0, l], 53723);
	},
	95869,
	(e) => {
		"use strict";
		var t = e.i(57319),
			r = e.i(22903),
			s = e.i(61286),
			i = e.i(84520),
			n = e.i(89498),
			a = class extends i.Subscribable {
				#e;
				#t = void 0;
				#r;
				#s;
				constructor(e, t) {
					super(),
						(this.#e = e),
						this.setOptions(t),
						this.bindMethods(),
						this.#i();
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
								mutation: this.#r,
								observer: this,
							}),
						t?.mutationKey &&
						this.options.mutationKey &&
						(0, n.hashKey)(t.mutationKey) !==
							(0, n.hashKey)(this.options.mutationKey)
							? this.reset()
							: this.#r?.state.status === "pending" &&
								this.#r.setOptions(this.options);
				}
				onUnsubscribe() {
					this.hasListeners() || this.#r?.removeObserver(this);
				}
				onMutationUpdate(e) {
					this.#i(), this.#n(e);
				}
				getCurrentResult() {
					return this.#t;
				}
				reset() {
					this.#r?.removeObserver(this),
						(this.#r = void 0),
						this.#i(),
						this.#n();
				}
				mutate(e, t) {
					return (
						(this.#s = t),
						this.#r?.removeObserver(this),
						(this.#r = this.#e.getMutationCache().build(this.#e, this.options)),
						this.#r.addObserver(this),
						this.#r.execute(e)
					);
				}
				#i() {
					const e = this.#r?.state ?? (0, r.getDefaultState)();
					this.#t = {
						...e,
						isPending: "pending" === e.status,
						isSuccess: "success" === e.status,
						isError: "error" === e.status,
						isIdle: "idle" === e.status,
						mutate: this.mutate,
						reset: this.reset,
					};
				}
				#n(e) {
					s.notifyManager.batch(() => {
						if (this.#s && this.hasListeners()) {
							const t = this.#t.variables,
								r = this.#t.context,
								s = {
									client: this.#e,
									meta: this.options.meta,
									mutationKey: this.options.mutationKey,
								};
							if (e?.type === "success") {
								try {
									this.#s.onSuccess?.(e.data, t, r, s);
								} catch (e) {
									Promise.reject(e);
								}
								try {
									this.#s.onSettled?.(e.data, null, t, r, s);
								} catch (e) {
									Promise.reject(e);
								}
							} else if (e?.type === "error") {
								try {
									this.#s.onError?.(e.error, t, r, s);
								} catch (e) {
									Promise.reject(e);
								}
								try {
									this.#s.onSettled?.(void 0, e.error, t, r, s);
								} catch (e) {
									Promise.reject(e);
								}
							}
						}
						this.listeners.forEach((e) => {
							e(this.#t);
						});
					});
				}
			},
			o = e.i(82537);
		e.s(
			[
				"useMutation",
				0,
				function (e, r) {
					const i = (0, o.useQueryClient)(r),
						[u] = t.useState(() => new a(i, e));
					t.useEffect(() => {
						u.setOptions(e);
					}, [u, e]);
					const l = t.useSyncExternalStore(
							t.useCallback(
								(e) => u.subscribe(s.notifyManager.batchCalls(e)),
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
			95869,
		);
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
	73979,
	(e) => {
		"use strict";
		var t = e.i(62613),
			r = e.i(49696);
		e.s([
			"Skeleton",
			0,
			function ({ className: e, ...s }) {
				return (0, t.jsx)("div", {
					className: (0, r.cn)("animate-pulse rounded-md bg-primary/10", e),
					...s,
				});
			},
		]);
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
						(this.#a = null),
						(this.#o = (0, o.pendingThenable)()),
						this.bindMethods(),
						this.setOptions(t);
				}
				#e;
				#u = void 0;
				#l = void 0;
				#t = void 0;
				#c;
				#h;
				#o;
				#a;
				#d;
				#p;
				#f;
				#y;
				#v;
				#m;
				#b = new Set();
				bindMethods() {
					this.refetch = this.refetch.bind(this);
				}
				onSubscribe() {
					1 === this.listeners.size &&
						(this.#u.addObserver(this),
						h(this.#u, this.options) ? this.#g() : this.updateResult(),
						this.#R());
				}
				onUnsubscribe() {
					this.hasListeners() || this.destroy();
				}
				shouldFetchOnReconnect() {
					return d(this.#u, this.options, this.options.refetchOnReconnect);
				}
				shouldFetchOnWindowFocus() {
					return d(this.#u, this.options, this.options.refetchOnWindowFocus);
				}
				destroy() {
					(this.listeners = new Set()),
						this.#x(),
						this.#Q(),
						this.#u.removeObserver(this);
				}
				setOptions(e) {
					const t = this.options,
						r = this.#u;
					if (
						((this.options = this.#e.defaultQueryOptions(e)),
						void 0 !== this.options.enabled &&
							"boolean" != typeof this.options.enabled &&
							"function" != typeof this.options.enabled &&
							"boolean" !=
								typeof (0, u.resolveQueryBoolean)(
									this.options.enabled,
									this.#u,
								))
					)
						throw Error(
							"Expected enabled to be a boolean or a callback that returns a boolean",
						);
					this.#S(),
						this.#u.setOptions(this.options),
						t._defaulted &&
							!(0, u.shallowEqualObjects)(this.options, t) &&
							this.#e.getQueryCache().notify({
								type: "observerOptionsUpdated",
								query: this.#u,
								observer: this,
							});
					const s = this.hasListeners();
					s && p(this.#u, r, this.options, t) && this.#g(),
						this.updateResult(),
						s &&
							(this.#u !== r ||
								(0, u.resolveQueryBoolean)(this.options.enabled, this.#u) !==
									(0, u.resolveQueryBoolean)(t.enabled, this.#u) ||
								(0, u.resolveStaleTime)(this.options.staleTime, this.#u) !==
									(0, u.resolveStaleTime)(t.staleTime, this.#u)) &&
							this.#w();
					const i = this.#O();
					s &&
						(this.#u !== r ||
							(0, u.resolveQueryBoolean)(this.options.enabled, this.#u) !==
								(0, u.resolveQueryBoolean)(t.enabled, this.#u) ||
							i !== this.#m) &&
						this.#C(i);
				}
				getOptimisticResult(e) {
					var t, r;
					const s = this.#e.getQueryCache().build(this.#e, e),
						i = this.createResult(s, e);
					return (
						(t = this),
						(r = i),
						(0, u.shallowEqualObjects)(t.getCurrentResult(), r) ||
							((this.#t = i),
							(this.#h = this.options),
							(this.#c = this.#u.state)),
						i
					);
				}
				getCurrentResult() {
					return this.#t;
				}
				trackResult(e, t) {
					return new Proxy(e, {
						get: (e, r) => (
							this.trackProp(r),
							t?.(r),
							"promise" === r &&
								(this.trackProp("data"),
								this.options.experimental_prefetchInRender ||
									"pending" !== this.#o.status ||
									this.#o.reject(
										Error(
											"experimental_prefetchInRender feature flag is not enabled",
										),
									)),
							Reflect.get(e, r)
						),
					});
				}
				trackProp(e) {
					this.#b.add(e);
				}
				getCurrentQuery() {
					return this.#u;
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
					return this.#g({ ...e, cancelRefetch: e.cancelRefetch ?? !0 }).then(
						() => (this.updateResult(), this.#t),
					);
				}
				#g(e) {
					this.#S();
					let t = this.#u.fetch(this.options, e);
					return e?.throwOnError || (t = t.catch(u.noop)), t;
				}
				#w() {
					this.#x();
					const e = (0, u.resolveStaleTime)(this.options.staleTime, this.#u);
					if (
						s.environmentManager.isServer() ||
						this.#t.isStale ||
						!(0, u.isValidTimeout)(e)
					)
						return;
					const t = (0, u.timeUntilStale)(this.#t.dataUpdatedAt, e);
					this.#y = l.timeoutManager.setTimeout(() => {
						this.#t.isStale || this.updateResult();
					}, t + 1);
				}
				#O() {
					return (
						("function" == typeof this.options.refetchInterval
							? this.options.refetchInterval(this.#u)
							: this.options.refetchInterval) ?? !1
					);
				}
				#C(e) {
					this.#Q(),
						(this.#m = e),
						!s.environmentManager.isServer() &&
							!1 !==
								(0, u.resolveQueryBoolean)(this.options.enabled, this.#u) &&
							(0, u.isValidTimeout)(this.#m) &&
							0 !== this.#m &&
							(this.#v = l.timeoutManager.setInterval(() => {
								(this.options.refetchIntervalInBackground ||
									r.focusManager.isFocused()) &&
									this.#g();
							}, this.#m));
				}
				#R() {
					this.#w(), this.#C(this.#O());
				}
				#x() {
					void 0 !== this.#y &&
						(l.timeoutManager.clearTimeout(this.#y), (this.#y = void 0));
				}
				#Q() {
					void 0 !== this.#v &&
						(l.timeoutManager.clearInterval(this.#v), (this.#v = void 0));
				}
				createResult(e, t) {
					let r,
						s = this.#u,
						i = this.options,
						a = this.#t,
						l = this.#c,
						c = this.#h,
						d = e !== s ? e.state : this.#l,
						{ state: y } = e,
						v = { ...y },
						m = !1;
					if (t._optimisticResults) {
						const r = this.hasListeners(),
							a = !r && h(e, t),
							o = r && p(e, s, t, i);
						(a || o) && (v = { ...v, ...(0, n.fetchState)(y.data, e.options) }),
							"isRestoring" === t._optimisticResults &&
								(v.fetchStatus = "idle");
					}
					let { error: b, errorUpdatedAt: g, status: R } = v;
					r = v.data;
					let x = !1;
					if (void 0 !== t.placeholderData && void 0 === r && "pending" === R) {
						let e;
						a?.isPlaceholderData && t.placeholderData === c?.placeholderData
							? ((e = a.data), (x = !0))
							: (e =
									"function" == typeof t.placeholderData
										? t.placeholderData(this.#f?.state.data, this.#f)
										: t.placeholderData),
							void 0 !== e &&
								((R = "success"),
								(r = (0, u.replaceData)(a?.data, e, t)),
								(m = !0));
					}
					if (t.select && void 0 !== r && !x)
						if (a && r === l?.data && t.select === this.#d) r = this.#p;
						else
							try {
								(this.#d = t.select),
									(r = t.select(r)),
									(r = (0, u.replaceData)(a?.data, r, t)),
									(this.#p = r),
									(this.#a = null);
							} catch (e) {
								this.#a = e;
							}
					this.#a &&
						((b = this.#a), (r = this.#p), (g = Date.now()), (R = "error"));
					const Q = "fetching" === v.fetchStatus,
						S = "pending" === R,
						w = "error" === R,
						O = S && Q,
						C = void 0 !== r,
						T = {
							status: R,
							fetchStatus: v.fetchStatus,
							isPending: S,
							isSuccess: "success" === R,
							isError: w,
							isInitialLoading: O,
							isLoading: O,
							data: r,
							dataUpdatedAt: v.dataUpdatedAt,
							error: b,
							errorUpdatedAt: g,
							failureCount: v.fetchFailureCount,
							failureReason: v.fetchFailureReason,
							errorUpdateCount: v.errorUpdateCount,
							isFetched: e.isFetched(),
							isFetchedAfterMount:
								v.dataUpdateCount > d.dataUpdateCount ||
								v.errorUpdateCount > d.errorUpdateCount,
							isFetching: Q,
							isRefetching: Q && !S,
							isLoadingError: w && !C,
							isPaused: "paused" === v.fetchStatus,
							isPlaceholderData: m,
							isRefetchError: w && C,
							isStale: f(e, t),
							refetch: this.refetch,
							promise: this.#o,
							isEnabled: !1 !== (0, u.resolveQueryBoolean)(t.enabled, e),
						};
					if (this.options.experimental_prefetchInRender) {
						const t = void 0 !== T.data,
							r = "error" === T.status && !t,
							i = (e) => {
								r ? e.reject(T.error) : t && e.resolve(T.data);
							},
							n = () => {
								i((this.#o = T.promise = (0, o.pendingThenable)()));
							},
							a = this.#o;
						switch (a.status) {
							case "pending":
								e.queryHash === s.queryHash && i(a);
								break;
							case "fulfilled":
								(r || T.data !== a.value) && n();
								break;
							case "rejected":
								(r && T.error === a.reason) || n();
						}
					}
					return T;
				}
				updateResult() {
					const e = this.#t,
						t = this.createResult(this.#u, this.options);
					if (
						((this.#c = this.#u.state),
						(this.#h = this.options),
						void 0 !== this.#c.data && (this.#f = this.#u),
						(0, u.shallowEqualObjects)(t, e))
					)
						return;
					this.#t = t;
					const r = () => {
						if (!e) return !0;
						const { notifyOnChangeProps: t } = this.options,
							r = "function" == typeof t ? t() : t;
						if ("all" === r || (!r && !this.#b.size)) return !0;
						const s = new Set(r ?? this.#b);
						return (
							this.options.throwOnError && s.add("error"),
							Object.keys(this.#t).some((t) => this.#t[t] !== e[t] && s.has(t))
						);
					};
					this.#n({ listeners: r() });
				}
				#S() {
					const e = this.#e.getQueryCache().build(this.#e, this.options);
					if (e === this.#u) return;
					const t = this.#u;
					(this.#u = e),
						(this.#l = e.state),
						this.hasListeners() &&
							(t?.removeObserver(this), e.addObserver(this));
				}
				onQueryUpdate() {
					this.updateResult(), this.hasListeners() && this.#R();
				}
				#n(e) {
					i.notifyManager.batch(() => {
						e.listeners &&
							this.listeners.forEach((e) => {
								e(this.#t);
							}),
							this.#e
								.getQueryCache()
								.notify({ query: this.#u, type: "observerResultsUpdated" });
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
				return "always" === s || (!1 !== s && f(e, t));
			}
			return !1;
		}
		function p(e, t, r, s) {
			return (
				(e !== t || !1 === (0, u.resolveQueryBoolean)(s.enabled, e)) &&
				(!r.suspense || "error" !== e.state.status) &&
				f(e, r)
			);
		}
		function f(e, t) {
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
		var g = (e, t, r) =>
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
						const p = !l.getQueryCache().get(c.queryHash),
							[f] = y.useState(() => new t(l, c)),
							R = f.getOptimisticResult(c),
							x = !a && d;
						if (
							(y.useSyncExternalStore(
								y.useCallback(
									(e) => {
										const t = x
											? f.subscribe(i.notifyManager.batchCalls(e))
											: u.noop;
										return f.updateResult(), t;
									},
									[f, x],
								),
								() => f.getCurrentResult(),
								() => f.getCurrentResult(),
							),
							y.useEffect(() => {
								f.setOptions(c);
							}, [c, f]),
							c?.suspense && R.isPending)
						)
							throw g(c, f, o);
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
								result: R,
								errorResetBoundary: o,
								throwOnError: c.throwOnError,
								query: h,
								suspense: c.suspense,
							})
						)
							throw R.error;
						if (
							(l.getDefaultOptions().queries?._experimental_afterQuery?.(c, R),
							c.experimental_prefetchInRender &&
								!s.environmentManager.isServer() &&
								R.isLoading &&
								R.isFetching &&
								!a)
						) {
							const e = p ? g(c, f, o) : h?.promise;
							e?.catch(u.noop).finally(() => {
								f.updateResult();
							});
						}
						return c.notifyOnChangeProps ? R : f.trackResult(R);
					})(e, c, t);
				},
			],
			59597,
		);
	},
	46483,
	40609,
	(e) => {
		"use strict";
		var t = e.i(59597),
			r = e.i(76706);
		const s = { all: () => ["user"], session: () => [...s.all(), "session"] };
		async function i() {
			const { data: e, error: t } = await r.authClient.getSession();
			if (t) throw Error(t.message);
			return e;
		}
		e.s(["userKeys", 0, s], 40609),
			e.s(
				[
					"useSessionQuery",
					0,
					(e) =>
						(0, t.useQuery)({
							queryFn: async () => await i(),
							queryKey: s.session(),
							initialData: e,
							retry: 1,
						}),
				],
				46483,
			);
	},
	84086,
	(e) => {
		"use strict";
		var t = e.i(95869),
			r = e.i(61645),
			s = e.i(76706),
			i = e.i(93181);
		async function n() {
			const { data: e, error: t } = await s.authClient.signOut();
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
						r.toast.success("Successfully signed out!");
					},
					onError: (e) => {
						r.toast.error(e.message || "Failed to sign out");
					},
				});
			},
		]);
	},
]);
