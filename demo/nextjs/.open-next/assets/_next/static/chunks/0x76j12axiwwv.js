(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
	"object" == typeof document ? document.currentScript : void 0,
	38699,
	(e) => {
		"use strict";
		var t = e.i(620),
			r = e.i(13732);
		const s = ({ className: e, ...s }) =>
			(0, t.jsx)("div", {
				className: (0, r.cn)(
					"rounded-xl border bg-card text-card-foreground shadow",
					e,
				),
				...s,
			});
		s.displayName = "Card";
		const a = ({ className: e, ...s }) =>
			(0, t.jsx)("div", {
				className: (0, r.cn)("flex flex-col space-y-1.5 p-6", e),
				...s,
			});
		a.displayName = "CardHeader";
		const i = ({ className: e, ...s }) =>
			(0, t.jsx)("h3", {
				className: (0, r.cn)("font-semibold leading-none tracking-tight", e),
				...s,
			});
		i.displayName = "CardTitle";
		const n = ({ className: e, ...s }) =>
			(0, t.jsx)("p", {
				className: (0, r.cn)("text-sm text-muted-foreground", e),
				...s,
			});
		n.displayName = "CardDescription";
		const l = ({ className: e, ...s }) =>
			(0, t.jsx)("div", { className: (0, r.cn)("p-6 pt-0", e), ...s });
		l.displayName = "CardContent";
		const o = ({ className: e, ...s }) =>
			(0, t.jsx)("div", {
				className: (0, r.cn)("flex items-center p-6 pt-0", e),
				...s,
			});
		(o.displayName = "CardFooter"),
			e.s([
				"Card",
				0,
				s,
				"CardContent",
				0,
				l,
				"CardDescription",
				0,
				n,
				"CardFooter",
				0,
				o,
				"CardHeader",
				0,
				a,
				"CardTitle",
				0,
				i,
			]);
	},
	98747,
	(e) => {
		"use strict";
		var t = e.i(620),
			r = e.i(92479),
			s = e.i(95353),
			a = r.forwardRef((e, r) =>
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
		a.displayName = "Label";
		var i = e.i(13732);
		e.s(
			[
				"Label",
				0,
				function ({ className: e, ...r }) {
					return (0, t.jsx)(a, {
						"data-slot": "label",
						className: (0, i.cn)(
							"flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
							e,
						),
						...r,
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
			r = e.i(13732);
		e.s([
			"Input",
			0,
			function ({ className: e, type: s, ...a }) {
				return (0, t.jsx)("input", {
					type: s,
					"data-slot": "input",
					className: (0, r.cn)(
						"border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
						"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
						"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
						e,
					),
					...a,
				});
			},
		]);
	},
	14709,
	(e) => {
		"use strict";
		var t = e.i(67613);
		e.s(["X", () => t.default]);
	},
	77310,
	(e) => {
		"use strict";
		var t = e.i(92479);
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
	21953,
	39304,
	21883,
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
				21953,
			);
		var t = e.i(92479),
			r = e.i(41296);
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
						onChange: a = () => {},
						caller: i,
					}) {
						const [n, l, o] = (function ({ defaultProp: e, onChange: r }) {
								const [a, i] = t.useState(e),
									n = t.useRef(a),
									l = t.useRef(r);
								return (
									s(() => {
										l.current = r;
									}, [r]),
									t.useEffect(() => {
										n.current !== a && (l.current?.(a), (n.current = a));
									}, [a, n]),
									[a, i, l]
								);
							})({ defaultProp: r, onChange: a }),
							d = void 0 !== e,
							c = d ? e : n;
						{
							const r = t.useRef(void 0 !== e);
							t.useEffect(() => {
								const e = r.current;
								if (e !== d) {
									const t = d ? "controlled" : "uncontrolled";
									console.warn(
										`${i} is changing from ${e ? "controlled" : "uncontrolled"} to ${t}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`,
									);
								}
								r.current = d;
							}, [d, i]);
						}
						return [
							c,
							t.useCallback(
								(t) => {
									if (d) {
										const r = "function" == typeof t ? t(e) : t;
										r !== e && o.current?.(r);
									} else l(t);
								},
								[d, e, l, o],
							),
						];
					},
				],
				39304,
			),
			e.s(
				[
					"useSize",
					0,
					function (e) {
						const [s, a] = t.useState(void 0);
						return (
							(0, r.useLayoutEffect)(() => {
								if (e) {
									a({ width: e.offsetWidth, height: e.offsetHeight });
									const t = new ResizeObserver((t) => {
										let r, s;
										if (!Array.isArray(t) || !t.length) return;
										const i = t[0];
										if ("borderBoxSize" in i) {
											const e = i.borderBoxSize,
												t = Array.isArray(e) ? e[0] : e;
											(r = t.inlineSize), (s = t.blockSize);
										} else (r = e.offsetWidth), (s = e.offsetHeight);
										a({ width: r, height: s });
									});
									return (
										t.observe(e, { box: "border-box" }), () => t.unobserve(e)
									);
								}
								a(void 0);
							}, [e]),
							s
						);
					},
				],
				21883,
			);
	},
	7868,
	(e) => {
		"use strict";
		var t = e.i(92479),
			r = e.i(41296),
			s = (e) => {
				var s;
				let n,
					l,
					{ present: o, children: d } = e,
					c = (function (e) {
						var s, a;
						const [n, l] = t.useState(),
							o = t.useRef(null),
							d = t.useRef(e),
							c = t.useRef("none"),
							[u, m] =
								((s = e ? "mounted" : "unmounted"),
								(a = {
									mounted: {
										UNMOUNT: "unmounted",
										ANIMATION_OUT: "unmountSuspended",
									},
									unmountSuspended: {
										MOUNT: "mounted",
										ANIMATION_END: "unmounted",
									},
									unmounted: { MOUNT: "mounted" },
								}),
								t.useReducer((e, t) => a[e][t] ?? e, s));
						return (
							t.useEffect(() => {
								const e = i(o.current);
								c.current = "mounted" === u ? e : "none";
							}, [u]),
							(0, r.useLayoutEffect)(() => {
								const t = o.current,
									r = d.current;
								if (r !== e) {
									const s = c.current,
										a = i(t);
									e
										? m("MOUNT")
										: "none" === a || t?.display === "none"
											? m("UNMOUNT")
											: r && s !== a
												? m("ANIMATION_OUT")
												: m("UNMOUNT"),
										(d.current = e);
								}
							}, [e, m]),
							(0, r.useLayoutEffect)(() => {
								if (n) {
									let e,
										t = n.ownerDocument.defaultView ?? window,
										r = (r) => {
											const s = i(o.current).includes(
												CSS.escape(r.animationName),
											);
											if (
												r.target === n &&
												s &&
												(m("ANIMATION_END"), !d.current)
											) {
												const r = n.style.animationFillMode;
												(n.style.animationFillMode = "forwards"),
													(e = t.setTimeout(() => {
														"forwards" === n.style.animationFillMode &&
															(n.style.animationFillMode = r);
													}));
											}
										},
										s = (e) => {
											e.target === n && (c.current = i(o.current));
										};
									return (
										n.addEventListener("animationstart", s),
										n.addEventListener("animationcancel", r),
										n.addEventListener("animationend", r),
										() => {
											t.clearTimeout(e),
												n.removeEventListener("animationstart", s),
												n.removeEventListener("animationcancel", r),
												n.removeEventListener("animationend", r);
										}
									);
								}
								m("ANIMATION_END");
							}, [n, m]),
							{
								isPresent: ["mounted", "unmountSuspended"].includes(u),
								ref: t.useCallback((e) => {
									(o.current = e ? getComputedStyle(e) : null), l(e);
								}, []),
							}
						);
					})(o),
					u =
						"function" == typeof d
							? d({ present: c.isPresent })
							: t.Children.only(d),
					m = (function (...e) {
						const r = t.useRef(e);
						return (
							(r.current = e),
							t.useCallback((e) => {
								let t = r.current,
									s = !1,
									i = t.map((t) => {
										const r = a(t, e);
										return s || "function" != typeof r || (s = !0), r;
									});
								if (s)
									return () => {
										for (let e = 0; e < i.length; e++) {
											const r = i[e];
											"function" == typeof r ? r() : a(t[e], null);
										}
									};
							}, [])
						);
					})(
						c.ref,
						((s = u),
						(l =
							(n = Object.getOwnPropertyDescriptor(s.props, "ref")?.get) &&
							"isReactWarning" in n &&
							n.isReactWarning)
							? s.ref
							: (l =
										(n = Object.getOwnPropertyDescriptor(s, "ref")?.get) &&
										"isReactWarning" in n &&
										n.isReactWarning)
								? s.props.ref
								: s.props.ref || s.ref),
					);
				return "function" == typeof d || c.isPresent
					? t.cloneElement(u, { ref: m })
					: null;
			};
		function a(e, t) {
			if ("function" == typeof e) return e(t);
			null != e && (e.current = t);
		}
		function i(e) {
			return e?.animationName || "none";
		}
		(s.displayName = "Presence"), e.s(["Presence", 0, s]);
	},
	77833,
	(e) => {
		"use strict";
		var t = e.i(620),
			r = e.i(54762);
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
			a = (0, r.default)("eye-off", [
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
		var i = e.i(92479),
			n = e.i(92192),
			l = e.i(38901),
			o = e.i(13732);
		const d = ({ ref: e, className: r, ...d }) => {
			const [c, u] = i.useState(!1),
				m = "" === d.value || void 0 === d.value || d.disabled;
			return (0, t.jsxs)("div", {
				className: "relative",
				children: [
					(0, t.jsx)(l.Input, {
						...d,
						type: c ? "text" : "password",
						name: "password_fake",
						className: (0, o.cn)("hide-password-toggle pr-10", r),
						ref: e,
					}),
					(0, t.jsxs)(n.Button, {
						type: "button",
						variant: "ghost",
						size: "sm",
						className:
							"absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent",
						onClick: () => u((e) => !e),
						disabled: m,
						children: [
							c && !m
								? (0, t.jsx)(s, { className: "h-4 w-4", "aria-hidden": "true" })
								: (0, t.jsx)(a, {
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
		(d.displayName = "PasswordInput"), e.s(["PasswordInput", 0, d], 77833);
	},
	21340,
	(e) => {
		"use strict";
		var t = e.i(620),
			r = e.i(92479),
			s = e.i(70768),
			a = e.i(44240),
			i = e.i(21953),
			n = e.i(39304),
			l = e.i(77310),
			o = e.i(21883),
			d = e.i(7868),
			c = e.i(95353),
			u = "Checkbox",
			[m, p] = (0, a.createContextScope)(u),
			[h, f] = m(u);
		function x(e) {
			const {
					__scopeCheckbox: s,
					checked: a,
					children: i,
					defaultChecked: l,
					disabled: o,
					form: d,
					name: c,
					onCheckedChange: m,
					required: p,
					value: f = "on",
					internal_do_not_use_render: x,
				} = e,
				[v, g] = (0, n.useControllableState)({
					prop: a,
					defaultProp: l ?? !1,
					onChange: m,
					caller: u,
				}),
				[b, j] = r.useState(null),
				[w, y] = r.useState(null),
				N = r.useRef(!1),
				k = !b || !!d || !!b.closest("form"),
				S = {
					checked: v,
					disabled: o,
					setChecked: g,
					control: b,
					setControl: j,
					name: c,
					form: d,
					value: f,
					hasConsumerStoppedPropagationRef: N,
					required: p,
					defaultChecked: !C(l) && l,
					isFormControl: k,
					bubbleInput: w,
					setBubbleInput: y,
				};
			return (0, t.jsx)(h, {
				scope: s,
				...S,
				children: "function" == typeof x ? x(S) : i,
			});
		}
		var v = "CheckboxTrigger",
			g = r.forwardRef(
				({ __scopeCheckbox: e, onKeyDown: a, onClick: n, ...l }, o) => {
					const {
							control: d,
							value: u,
							disabled: m,
							checked: p,
							required: h,
							setControl: x,
							setChecked: g,
							hasConsumerStoppedPropagationRef: b,
							isFormControl: j,
							bubbleInput: w,
						} = f(v, e),
						y = (0, s.useComposedRefs)(o, x),
						N = r.useRef(p);
					return (
						r.useEffect(() => {
							const e = d?.form;
							if (e) {
								const t = () => g(N.current);
								return (
									e.addEventListener("reset", t),
									() => e.removeEventListener("reset", t)
								);
							}
						}, [d, g]),
						(0, t.jsx)(c.Primitive.button, {
							type: "button",
							role: "checkbox",
							"aria-checked": C(p) ? "mixed" : p,
							"aria-required": h,
							"data-state": k(p),
							"data-disabled": m ? "" : void 0,
							disabled: m,
							value: u,
							...l,
							ref: y,
							onKeyDown: (0, i.composeEventHandlers)(a, (e) => {
								"Enter" === e.key && e.preventDefault();
							}),
							onClick: (0, i.composeEventHandlers)(n, (e) => {
								g((e) => !!C(e) || !e),
									w &&
										j &&
										((b.current = e.isPropagationStopped()),
										b.current || e.stopPropagation());
							}),
						})
					);
				},
			);
		g.displayName = v;
		var b = r.forwardRef((e, r) => {
			const {
				__scopeCheckbox: s,
				name: a,
				checked: i,
				defaultChecked: n,
				required: l,
				disabled: o,
				value: d,
				onCheckedChange: c,
				form: u,
				...m
			} = e;
			return (0, t.jsx)(x, {
				__scopeCheckbox: s,
				checked: i,
				defaultChecked: n,
				disabled: o,
				required: l,
				onCheckedChange: c,
				name: a,
				form: u,
				value: d,
				internal_do_not_use_render: ({ isFormControl: e }) =>
					(0, t.jsxs)(t.Fragment, {
						children: [
							(0, t.jsx)(g, { ...m, ref: r, __scopeCheckbox: s }),
							e && (0, t.jsx)(N, { __scopeCheckbox: s }),
						],
					}),
			});
		});
		b.displayName = u;
		var j = "CheckboxIndicator",
			w = r.forwardRef((e, r) => {
				const { __scopeCheckbox: s, forceMount: a, ...i } = e,
					n = f(j, s);
				return (0, t.jsx)(d.Presence, {
					present: a || C(n.checked) || !0 === n.checked,
					children: (0, t.jsx)(c.Primitive.span, {
						"data-state": k(n.checked),
						"data-disabled": n.disabled ? "" : void 0,
						...i,
						ref: r,
						style: { pointerEvents: "none", ...e.style },
					}),
				});
			});
		w.displayName = j;
		var y = "CheckboxBubbleInput",
			N = r.forwardRef(({ __scopeCheckbox: e, ...a }, i) => {
				const {
						control: n,
						hasConsumerStoppedPropagationRef: d,
						checked: u,
						defaultChecked: m,
						required: p,
						disabled: h,
						name: x,
						value: v,
						form: g,
						bubbleInput: b,
						setBubbleInput: j,
					} = f(y, e),
					w = (0, s.useComposedRefs)(i, j),
					N = (0, l.usePrevious)(u),
					k = (0, o.useSize)(n);
				r.useEffect(() => {
					if (!b) return;
					const e = Object.getOwnPropertyDescriptor(
							window.HTMLInputElement.prototype,
							"checked",
						).set,
						t = !d.current;
					if (N !== u && e) {
						const r = new Event("click", { bubbles: t });
						(b.indeterminate = C(u)), e.call(b, !C(u) && u), b.dispatchEvent(r);
					}
				}, [b, N, u, d]);
				const S = r.useRef(!C(u) && u);
				return (0, t.jsx)(c.Primitive.input, {
					type: "checkbox",
					"aria-hidden": !0,
					defaultChecked: m ?? S.current,
					required: p,
					disabled: h,
					name: x,
					value: v,
					form: g,
					...a,
					tabIndex: -1,
					ref: w,
					style: {
						...a.style,
						...k,
						position: "absolute",
						pointerEvents: "none",
						opacity: 0,
						margin: 0,
						transform: "translateX(-100%)",
					},
				});
			});
		function C(e) {
			return "indeterminate" === e;
		}
		function k(e) {
			return C(e) ? "indeterminate" : e ? "checked" : "unchecked";
		}
		N.displayName = y;
		var S = e.i(52047),
			E = e.i(13732);
		e.s(
			[
				"Checkbox",
				0,
				function ({ className: e, ...r }) {
					return (0, t.jsx)(b, {
						"data-slot": "checkbox",
						className: (0, E.cn)(
							"peer border-input data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
							e,
						),
						...r,
						children: (0, t.jsx)(w, {
							"data-slot": "checkbox-indicator",
							className:
								"flex items-center justify-center text-current transition-none",
							children: (0, t.jsx)(S.CheckIcon, { className: "size-3.5" }),
						}),
					});
				},
			],
			21340,
		);
	},
	83682,
	(e) => {
		"use strict";
		var t = e.i(92479);
		e.s([
			"useImagePreview",
			0,
			function () {
				const [e, r] = (0, t.useState)(null),
					[s, a] = (0, t.useState)(null),
					i = (0, t.useRef)(null);
				(0, t.useEffect)(() => {
					i.current = s;
				}, [s]),
					(0, t.useEffect)(
						() => () => {
							i.current && URL.revokeObjectURL(i.current);
						},
						[],
					);
				const n = (0, t.useCallback)((e) => {
						const t = e.target.files?.[0];
						t &&
							(r(t),
							a((e) => (e && URL.revokeObjectURL(e), URL.createObjectURL(t))));
					}, []),
					l = (0, t.useCallback)(() => {
						s && URL.revokeObjectURL(s), r(null), a(null);
					}, [s]);
				return {
					image: e,
					imagePreview: s,
					handleImageChange: n,
					clearImage: l,
				};
			},
		]);
	},
	99629,
	(e) => {
		"use strict";
		var t = e.i(620),
			r = e.i(37146),
			s = e.i(92479),
			a = e.i(16003);
		const i = (0, e.i(54762).default)("key", [
			[
				"path",
				{
					d: "m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4",
					key: "g0fldk",
				},
			],
			["path", { d: "m21 2-9.6 9.6", key: "1j0ho8" }],
			["circle", { cx: "7.5", cy: "15.5", r: "5.5", key: "yqb3hr" }],
		]);
		var n = e.i(9373),
			l = e.i(4664),
			o = e.i(72811),
			d = e.i(56395),
			c = e.i(57321),
			u = e.i(92192),
			m = e.i(21340),
			p = e.i(30905),
			h = e.i(38901),
			f = e.i(77833),
			x = e.i(30208);
		const v = () =>
				(0, t.jsx)("span", {
					className:
						"ml-auto absolute -right-3 px-2 py-1 text-[0.5rem] bg-blue-200 text-blue-900 dark:bg-blue-600 dark:text-blue-100 rounded-md font-medium pointer-events-none",
					children: "Last Used",
				}),
			g = c.object({
				email: c.email("Please enter a valid email address."),
				password: c.string().min(1, "Password is required."),
				rememberMe: c.boolean(),
			});
		function b({
			onSuccess: e,
			callbackURL: r = "/dashboard",
			showPasswordToggle: i = !1,
			params: c,
		}) {
			const [j, w] = (0, s.useTransition)(),
				[y, N] = (0, s.useState)(!1);
			(0, s.useEffect)(() => {
				N(!0);
			}, []);
			const C = (0, d.useForm)({
				resolver: (0, l.zodResolver)(g),
				defaultValues: { email: "", password: "", rememberMe: !1 },
			});
			return (0, t.jsxs)("form", {
				onSubmit: C.handleSubmit((t) => {
					w(async () => {
						await x.authClient.signIn.email(
							{
								email: t.email,
								password: t.password,
								rememberMe: t.rememberMe,
								callbackURL: r,
							},
							{
								query: c ? Object.fromEntries(c.entries()) : void 0,
								onSuccess() {
									a.toast.success("Successfully signed in"), e?.();
								},
								onError(e) {
									a.toast.error(e.error.message);
								},
							},
						);
					});
				}),
				className: "grid gap-2",
				children: [
					(0, t.jsxs)(p.FieldGroup, {
						children: [
							(0, t.jsx)(d.Controller, {
								name: "email",
								control: C.control,
								render: ({ field: e, fieldState: r }) =>
									(0, t.jsxs)(p.Field, {
										"data-invalid": r.invalid,
										children: [
											(0, t.jsx)(p.FieldLabel, {
												htmlFor: "sign-in-email",
												children: "Email",
											}),
											(0, t.jsx)(h.Input, {
												...e,
												id: "sign-in-email",
												type: "email",
												placeholder: "m@example.com",
												"aria-invalid": r.invalid,
												autoComplete: "email",
											}),
											r.invalid &&
												(0, t.jsx)(p.FieldError, { errors: [r.error] }),
										],
									}),
							}),
							(0, t.jsx)(d.Controller, {
								name: "password",
								control: C.control,
								render: ({ field: e, fieldState: r }) =>
									(0, t.jsxs)(p.Field, {
										"data-invalid": r.invalid,
										children: [
											(0, t.jsxs)("div", {
												className: "flex items-center",
												children: [
													(0, t.jsx)(p.FieldLabel, {
														htmlFor: "sign-in-password",
														children: "Password",
													}),
													(0, t.jsx)(n.default, {
														href: "/forgot-password",
														className:
															"ml-auto inline-block text-sm underline text-foreground",
														children: "Forgot your password?",
													}),
												],
											}),
											i
												? (0, t.jsx)(f.PasswordInput, {
														...e,
														id: "sign-in-password",
														placeholder: "Password",
														"aria-invalid": r.invalid,
														autoComplete: "current-password",
													})
												: (0, t.jsx)(h.Input, {
														...e,
														id: "sign-in-password",
														type: "password",
														placeholder: "password",
														"aria-invalid": r.invalid,
														autoComplete: "current-password",
													}),
											r.invalid &&
												(0, t.jsx)(p.FieldError, { errors: [r.error] }),
										],
									}),
							}),
							(0, t.jsx)(d.Controller, {
								name: "rememberMe",
								control: C.control,
								render: ({ field: e }) =>
									(0, t.jsxs)(p.Field, {
										orientation: "horizontal",
										children: [
											(0, t.jsx)(m.Checkbox, {
												id: "sign-in-remember",
												checked: e.value,
												onCheckedChange: e.onChange,
											}),
											(0, t.jsx)(p.FieldLabel, {
												htmlFor: "sign-in-remember",
												className: "font-normal",
												children: "Remember me",
											}),
										],
									}),
							}),
						],
					}),
					(0, t.jsxs)(u.Button, {
						type: "submit",
						className: "w-full relative",
						disabled: j,
						children: [
							j
								? (0, t.jsx)(o.Loader2, { size: 16, className: "animate-spin" })
								: "Login",
							y &&
								x.authClient.isLastUsedLoginMethod("email") &&
								(0, t.jsx)(v, {}),
						],
					}),
				],
			});
		}
		var j = e.i(38699);
		const w = new Set(["/dashboard", "/device"]),
			y = (e) => {
				const t = e.get("callbackUrl");
				return t && w.has(t) ? t : "/dashboard";
			};
		var N = e.i(13732);
		function C() {
			const [e, l] = (0, s.useState)(!1),
				o = (0, r.useRouter)(),
				d = (0, r.useSearchParams)();
			return (
				(0, s.useEffect)(() => {
					l(!0);
				}, []),
				(0, t.jsxs)(j.Card, {
					className: "w-full rounded-none max-h-[90vh] overflow-y-auto",
					children: [
						(0, t.jsxs)(j.CardHeader, {
							children: [
								(0, t.jsx)(j.CardTitle, {
									className: "text-lg md:text-xl",
									children: "Sign In",
								}),
								(0, t.jsx)(j.CardDescription, {
									className: "text-xs md:text-sm",
									children: "Enter your email below to login to your account",
								}),
							],
						}),
						(0, t.jsx)(j.CardContent, {
							children: (0, t.jsxs)("div", {
								className: "grid gap-4",
								children: [
									(0, t.jsx)(b, {
										params: d,
										onSuccess: () => o.push(y(d)),
										callbackURL: "/dashboard",
									}),
									(0, t.jsxs)("div", {
										className: "grid grid-cols-2 gap-2",
										children: [
											(0, t.jsxs)(u.Button, {
												variant: "outline",
												className: (0, N.cn)("gap-2 flex relative"),
												onClick: async () => {
													await x.authClient.signIn.social({
														provider: "google",
														callbackURL: "/dashboard",
														fetchOptions: { query: d },
													});
												},
												"aria-label": "Sign in with Google",
												children: [
													(0, t.jsxs)("svg", {
														xmlns: "http://www.w3.org/2000/svg",
														width: "0.98em",
														height: "1em",
														viewBox: "0 0 256 262",
														children: [
															(0, t.jsx)("path", {
																fill: "#4285F4",
																d: "M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027",
															}),
															(0, t.jsx)("path", {
																fill: "#34A853",
																d: "M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1",
															}),
															(0, t.jsx)("path", {
																fill: "#FBBC05",
																d: "M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z",
															}),
															(0, t.jsx)("path", {
																fill: "#EB4335",
																d: "M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251",
															}),
														],
													}),
													(0, t.jsx)("span", {
														className: "hidden sm:inline",
														children: "Google",
													}),
													e &&
														x.authClient.isLastUsedLoginMethod("google") &&
														(0, t.jsx)(v, {}),
												],
											}),
											(0, t.jsxs)(u.Button, {
												variant: "outline",
												className: (0, N.cn)(
													"gap-2 flex items-center relative",
												),
												onClick: async () => {
													await x.authClient.signIn.social({
														provider: "github",
														callbackURL: "/dashboard",
														fetchOptions: { query: d },
													});
												},
												"aria-label": "Sign in with GitHub",
												children: [
													(0, t.jsx)("svg", {
														xmlns: "http://www.w3.org/2000/svg",
														width: "1.2em",
														height: "1.2em",
														viewBox: "0 0 24 24",
														children: (0, t.jsx)("path", {
															fill: "currentColor",
															d: "M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2",
														}),
													}),
													(0, t.jsx)("span", {
														className: "hidden sm:inline",
														children: "GitHub",
													}),
													e &&
														x.authClient.isLastUsedLoginMethod("github") &&
														(0, t.jsx)(v, {}),
												],
											}),
											(0, t.jsxs)(u.Button, {
												variant: "outline",
												className: (0, N.cn)(
													"gap-2 flex items-center relative",
												),
												onClick: async () => {
													await x.authClient.signIn.social({
														provider: "microsoft",
														callbackURL: "/dashboard",
														fetchOptions: { query: d },
													});
												},
												"aria-label": "Sign in with Microsoft",
												children: [
													(0, t.jsx)("svg", {
														xmlns: "http://www.w3.org/2000/svg",
														width: "1em",
														height: "1em",
														viewBox: "0 0 24 24",
														children: (0, t.jsx)("path", {
															fill: "currentColor",
															d: "M2 3h9v9H2zm9 19H2v-9h9zM21 3v9h-9V3zm0 19h-9v-9h9z",
														}),
													}),
													(0, t.jsx)("span", {
														className: "hidden sm:inline",
														children: "Microsoft",
													}),
													e &&
														x.authClient.isLastUsedLoginMethod("microsoft") &&
														(0, t.jsx)(v, {}),
												],
											}),
											(0, t.jsxs)(u.Button, {
												variant: "outline",
												className: (0, N.cn)("gap-2 flex relative"),
												onClick: async () => {
													await x.authClient.signIn.social({
														provider: "vercel",
														callbackURL: "/dashboard",
														fetchOptions: { query: d },
													});
												},
												"aria-label": "Sign in with Vercel",
												children: [
													(0, t.jsx)("svg", {
														xmlns: "http://www.w3.org/2000/svg",
														width: "1em",
														height: "1em",
														viewBox: "0 0 256 222",
														className: "dark:fill-white fill-black",
														children: (0, t.jsx)("path", {
															d: "m128 0l128 221.705H0z",
														}),
													}),
													(0, t.jsx)("span", {
														className: "hidden sm:inline",
														children: "Vercel",
													}),
													e &&
														x.authClient.isLastUsedLoginMethod("vercel") &&
														(0, t.jsx)(v, {}),
												],
											}),
										],
									}),
									(0, t.jsxs)("div", {
										className: "relative",
										children: [
											(0, t.jsx)("div", {
												className: "absolute inset-0 flex items-center",
												children: (0, t.jsx)("span", {
													className: "w-full border-t",
												}),
											}),
											(0, t.jsx)("div", {
												className:
													"relative flex justify-center text-xs uppercase",
												children: (0, t.jsx)("span", {
													className: "bg-background px-2 text-muted-foreground",
													children: "Or continue with",
												}),
											}),
										],
									}),
									(0, t.jsxs)(u.Button, {
										variant: "outline",
										className: (0, N.cn)(
											"w-full gap-2 flex items-center relative",
										),
										onClick: async () => {
											await x.authClient.signIn.passkey({
												fetchOptions: {
													query: d,
													onSuccess() {
														a.toast.success("Successfully signed in"),
															o.push(y(d));
													},
													onError(e) {
														a.toast.error(
															"Authentication failed: " + e.error.message,
														);
													},
												},
											});
										},
										children: [
											(0, t.jsx)(i, { size: 16 }),
											(0, t.jsx)("span", { children: "Sign in with Passkey" }),
											e &&
												x.authClient.isLastUsedLoginMethod("passkey") &&
												(0, t.jsx)(v, {}),
										],
									}),
								],
							}),
						}),
						(0, t.jsx)(j.CardFooter, {
							children: (0, t.jsx)("div", {
								className: "flex justify-center w-full border-t pt-4",
								children: (0, t.jsxs)("p", {
									className: "text-center text-xs text-neutral-500",
									children: [
										"built with",
										" ",
										(0, t.jsx)(n.default, {
											href: "https://cinagroup.com",
											className: "underline",
											target: "_blank",
											children: (0, t.jsx)("span", {
												className: "dark:text-white/70 cursor-pointer",
												children: "cinaauth.",
											}),
										}),
									],
								}),
							}),
						}),
					],
				})
			);
		}
		var k = e.i(14709),
			S = e.i(83682);
		const E = c
			.object({
				firstName: c.string().min(1, "First name is required."),
				lastName: c.string().min(1, "Last name is required."),
				email: c.string().email("Please enter a valid email address."),
				password: c.string().min(8, "Password must be at least 8 characters."),
				passwordConfirmation: c
					.string()
					.min(1, "Please confirm your password."),
			})
			.refine((e) => e.password === e.passwordConfirmation, {
				message: "Passwords do not match.",
				path: ["passwordConfirmation"],
			});
		function L({ onSuccess: e, callbackURL: r = "/dashboard", params: i }) {
			const [n, c] = (0, s.useTransition)(),
				{
					image: m,
					imagePreview: f,
					handleImageChange: v,
					clearImage: g,
				} = (0, S.useImagePreview)(),
				b = (0, d.useForm)({
					resolver: (0, l.zodResolver)(E),
					defaultValues: {
						firstName: "",
						lastName: "",
						email: "",
						password: "",
						passwordConfirmation: "",
					},
				});
			return (0, t.jsxs)("form", {
				onSubmit: b.handleSubmit((t) => {
					c(async () => {
						await x.authClient.signUp.email({
							email: t.email,
							password: t.password,
							name: `${t.firstName} ${t.lastName}`,
							image: m ? await (0, N.convertImageToBase64)(m) : "",
							callbackURL: r,
							fetchOptions: {
								query: i ? Object.fromEntries(i.entries()) : void 0,
								onError: (e) => {
									a.toast.error(e.error.message);
								},
								onSuccess: async () => {
									a.toast.success("Successfully signed up"), e?.();
								},
							},
						});
					});
				}),
				className: "grid gap-2",
				children: [
					(0, t.jsxs)(p.FieldGroup, {
						children: [
							(0, t.jsxs)("div", {
								className: "grid grid-cols-2 gap-4",
								children: [
									(0, t.jsx)(d.Controller, {
										name: "firstName",
										control: b.control,
										render: ({ field: e, fieldState: r }) =>
											(0, t.jsxs)(p.Field, {
												"data-invalid": r.invalid,
												children: [
													(0, t.jsx)(p.FieldLabel, {
														htmlFor: "sign-up-first-name",
														children: "First name",
													}),
													(0, t.jsx)(h.Input, {
														...e,
														id: "sign-up-first-name",
														placeholder: "Max",
														"aria-invalid": r.invalid,
														autoComplete: "given-name",
													}),
													r.invalid &&
														(0, t.jsx)(p.FieldError, { errors: [r.error] }),
												],
											}),
									}),
									(0, t.jsx)(d.Controller, {
										name: "lastName",
										control: b.control,
										render: ({ field: e, fieldState: r }) =>
											(0, t.jsxs)(p.Field, {
												"data-invalid": r.invalid,
												children: [
													(0, t.jsx)(p.FieldLabel, {
														htmlFor: "sign-up-last-name",
														children: "Last name",
													}),
													(0, t.jsx)(h.Input, {
														...e,
														id: "sign-up-last-name",
														placeholder: "Robinson",
														"aria-invalid": r.invalid,
														autoComplete: "family-name",
													}),
													r.invalid &&
														(0, t.jsx)(p.FieldError, { errors: [r.error] }),
												],
											}),
									}),
								],
							}),
							(0, t.jsx)(d.Controller, {
								name: "email",
								control: b.control,
								render: ({ field: e, fieldState: r }) =>
									(0, t.jsxs)(p.Field, {
										"data-invalid": r.invalid,
										children: [
											(0, t.jsx)(p.FieldLabel, {
												htmlFor: "sign-up-email",
												children: "Email",
											}),
											(0, t.jsx)(h.Input, {
												...e,
												id: "sign-up-email",
												type: "email",
												placeholder: "m@example.com",
												"aria-invalid": r.invalid,
												autoComplete: "email",
											}),
											r.invalid &&
												(0, t.jsx)(p.FieldError, { errors: [r.error] }),
										],
									}),
							}),
							(0, t.jsxs)("div", {
								className: "grid grid-cols-2 gap-4",
								children: [
									(0, t.jsx)(d.Controller, {
										name: "password",
										control: b.control,
										render: ({ field: e, fieldState: r }) =>
											(0, t.jsxs)(p.Field, {
												"data-invalid": r.invalid,
												children: [
													(0, t.jsx)(p.FieldLabel, {
														htmlFor: "sign-up-password",
														children: "Password",
													}),
													(0, t.jsx)(h.Input, {
														...e,
														id: "sign-up-password",
														type: "password",
														placeholder: "Password",
														"aria-invalid": r.invalid,
														autoComplete: "new-password",
													}),
													r.invalid &&
														(0, t.jsx)(p.FieldError, { errors: [r.error] }),
												],
											}),
									}),
									(0, t.jsx)(d.Controller, {
										name: "passwordConfirmation",
										control: b.control,
										render: ({ field: e, fieldState: r }) =>
											(0, t.jsxs)(p.Field, {
												"data-invalid": r.invalid,
												children: [
													(0, t.jsx)(p.FieldLabel, {
														htmlFor: "sign-up-password-confirmation",
														children: "Confirm Password",
													}),
													(0, t.jsx)(h.Input, {
														...e,
														id: "sign-up-password-confirmation",
														type: "password",
														placeholder: "Confirm Password",
														"aria-invalid": r.invalid,
														autoComplete: "new-password",
													}),
													r.invalid &&
														(0, t.jsx)(p.FieldError, { errors: [r.error] }),
												],
											}),
									}),
								],
							}),
							(0, t.jsxs)(p.Field, {
								children: [
									(0, t.jsx)(p.FieldLabel, {
										htmlFor: "sign-up-image",
										children: "Profile Image (optional)",
									}),
									(0, t.jsxs)("div", {
										className: "flex items-end gap-4",
										children: [
											f &&
												(0, t.jsx)("div", {
													className:
														"relative w-16 h-16 rounded-sm overflow-hidden",
													children: (0, t.jsx)("img", {
														src: f,
														alt: "Profile preview",
														className: "object-cover w-full h-full",
													}),
												}),
											(0, t.jsxs)("div", {
												className: "flex items-center gap-2 w-full",
												children: [
													(0, t.jsx)(h.Input, {
														id: "sign-up-image",
														type: "file",
														accept: "image/*",
														onChange: v,
														className: "w-full",
													}),
													f &&
														(0, t.jsx)(k.X, {
															className: "cursor-pointer",
															onClick: g,
														}),
												],
											}),
										],
									}),
								],
							}),
						],
					}),
					(0, t.jsx)(u.Button, {
						type: "submit",
						className: "w-full",
						disabled: n,
						children: n
							? (0, t.jsx)(o.Loader2, { size: 16, className: "animate-spin" })
							: "Create an account",
					}),
				],
			});
		}
		function F() {
			const e = (0, r.useRouter)(),
				s = (0, r.useSearchParams)();
			return (0, t.jsxs)(j.Card, {
				className: "rounded-md rounded-t-none w-full",
				children: [
					(0, t.jsxs)(j.CardHeader, {
						children: [
							(0, t.jsx)(j.CardTitle, {
								className: "text-lg md:text-xl",
								children: "Sign Up",
							}),
							(0, t.jsx)(j.CardDescription, {
								className: "text-xs md:text-sm",
								children: "Enter your information to create an account",
							}),
						],
					}),
					(0, t.jsx)(j.CardContent, {
						children: (0, t.jsx)(L, {
							params: s,
							onSuccess: () => e.push(y(s)),
							callbackURL: y(s),
						}),
					}),
					(0, t.jsx)(j.CardFooter, {
						children: (0, t.jsx)("div", {
							className: "flex justify-center w-full border-t pt-4",
							children: (0, t.jsxs)("p", {
								className: "text-center text-xs text-neutral-500",
								children: [
									"built with",
									" ",
									(0, t.jsx)(n.default, {
										href: "https://cinagroup.com",
										className: "underline",
										target: "_blank",
										children: (0, t.jsx)("span", {
											className: "dark:text-white/70 cursor-pointer",
											children: "cinaauth.",
										}),
									}),
								],
							}),
						}),
					}),
				],
			});
		}
		var R = e.i(9950);
		const M = ({
				tabs: e,
				containerClassName: r,
				activeTabClassName: a,
				tabClassName: i,
				contentClassName: n,
			}) => {
				const [l, o] = (0, s.useState)(e[0]),
					[d, c] = (0, s.useState)(e),
					[u, m] = (0, s.useState)(!1);
				return (0, t.jsxs)(t.Fragment, {
					children: [
						(0, t.jsx)("div", {
							className: (0, N.cn)(
								"flex flex-row items-center justify-start mt-0 perspective-[1000px] relative overflow-auto sm:overflow-visible no-visible-scrollbar border-x w-full border-t max-w-max bg-opacity-0",
								r,
							),
							children: e.map((r, s) =>
								(0, t.jsxs)(
									"button",
									{
										onClick: () => {
											let t, r;
											(r = (t = [...e]).splice(s, 1)),
												t.unshift(r[0]),
												c(t),
												o(t[0]);
										},
										onMouseEnter: () => m(!0),
										onMouseLeave: () => m(!1),
										className: (0, N.cn)(
											"relative px-4 py-2 rounded-full opacity-80 hover:opacity-100",
											i,
										),
										style: { transformStyle: "preserve-3d" },
										children: [
											l.value === r.value &&
												(0, t.jsx)(R.motion.div, {
													transition: {
														duration: 0.2,
														delay: 0.1,
														type: "keyframes",
													},
													animate: { x: (d.indexOf(r), [0, 0, 0]) },
													className: (0, N.cn)(
														"absolute inset-0 bg-gray-200 dark:bg-zinc-900/90 opacity-100",
														a,
													),
												}),
											(0, t.jsx)("span", {
												className: (0, N.cn)(
													"relative block text-black dark:text-white",
													l.value === r.value
														? "text-opacity-100 font-medium"
														: "opacity-40 ",
												),
												children: r.title,
											}),
										],
									},
									r.title,
								),
							),
						}),
						(0, t.jsx)(
							P,
							{ tabs: d, active: l, hovering: u, className: (0, N.cn)("", n) },
							l.value,
						),
					],
				});
			},
			P = ({ className: e, tabs: r }) =>
				(0, t.jsx)("div", {
					className: "relative w-full h-full",
					children: r.map((s, a) =>
						(0, t.jsx)(
							R.motion.div,
							{
								style: {
									scale: 1 - 0.1 * a,
									zIndex: -a,
									opacity: a < 3 ? 1 - 0.1 * a : 0,
								},
								animate: {
									transition: { duration: 0.2, delay: 0.1, type: "keyframes" },
								},
								className: (0, N.cn)(
									"w-full h-full",
									s.value === r[0].value ? "" : "hidden",
									e,
								),
								children: s.content,
							},
							s.value,
						),
					),
				});
		var I = e.i(48577);
		e.s(
			[
				"default",
				0,
				function () {
					const [e, i] = (0, s.useTransition)(),
						[n, l] = (0, s.useState)(null),
						o = (0, r.useRouter)(),
						d = (0, r.useSearchParams)();
					return (
						(0, s.useEffect)(() => {
							x.authClient.oneTap({
								fetchOptions: {
									query: d,
									onError: ({ error: e }) => {
										a.toast.error(e.message || "An error occurred");
									},
									onSuccess: () => {
										a.toast.success("Successfully signed in"), o.push(y(d));
									},
								},
							});
						}, []),
						(0, s.useEffect)(() => {
							"electron" === d.get("client_id") &&
								i(async () => {
									const { data: e } = await x.authClient.getSession();
									e && l(e);
								});
						}, [d]),
						(0, t.jsx)("div", {
							className: "w-full",
							children: (0, t.jsx)("div", {
								className: (0, N.cn)(
									"flex items-center flex-col justify-center w-full md:py-10",
									(e || null !== n) && "max-h-[calc(100vh-6.4688rem)]",
								),
								children: e
									? (0, t.jsxs)("div", {
											className: "text-center",
											children: [
												(0, t.jsx)("div", {
													className:
														"h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900 mx-auto",
												}),
												(0, t.jsx)("p", {
													className: "mt-4 text-gray-600",
													children: "Loading...",
												}),
											],
										})
									: (0, t.jsx)(t.Fragment, {
											children:
												null !== n
													? (0, t.jsx)(I.ElectronTransferUser, { session: n })
													: (0, t.jsx)("div", {
															className: "w-full max-w-md",
															children: (0, t.jsx)(M, {
																tabs: [
																	{
																		title: "Sign In",
																		value: "sign-in",
																		content: (0, t.jsx)(C, {}),
																	},
																	{
																		title: "Sign Up",
																		value: "sign-up",
																		content: (0, t.jsx)(F, {}),
																	},
																],
															}),
														}),
										}),
							}),
						})
					);
				},
			],
			99629,
		);
	},
]);
