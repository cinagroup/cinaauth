(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
	"object" == typeof document ? document.currentScript : void 0,
	88505,
	(e) => {
		"use strict";
		var t = e.i(62613),
			n = e.i(67283),
			r = e.i(49696);
		const o = (0, n.cva)(
			"inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
			{
				variants: {
					variant: {
						default:
							"border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
						secondary:
							"border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
						destructive:
							"border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
						outline: "text-foreground",
					},
				},
				defaultVariants: { variant: "default" },
			},
		);
		e.s([
			"Badge",
			0,
			function ({ className: e, variant: n, ...i }) {
				return (0, t.jsx)("div", {
					className: (0, r.cn)(o({ variant: n }), e),
					...i,
				});
			},
		]);
	},
	72476,
	(e) => {
		"use strict";
		var t = e.i(57319),
			n = e.i(13575),
			r = t[" useId ".trim().toString()] || (() => void 0),
			o = 0;
		e.s([
			"useId",
			0,
			function (e) {
				const [i, a] = t.useState(r());
				return (
					(0, n.useLayoutEffect)(() => {
						e || a((e) => e ?? String(o++));
					}, [e]),
					e || (i ? `radix-${i}` : "")
				);
			},
		]);
	},
	48661,
	(e) => {
		"use strict";
		var t,
			n = e.i(57319),
			r = e.i(97557),
			o = e.i(33833),
			i = e.i(67714),
			a = e.i(9964),
			l = e.i(62613),
			s = "dismissableLayer.update",
			u = n.createContext({
				layers: new Set(),
				layersWithOutsidePointerEventsDisabled: new Set(),
				branches: new Set(),
				dismissableSurfaces: new Set(),
			}),
			c = n.forwardRef((e, c) => {
				const {
						disableOutsidePointerEvents: p = !1,
						deferPointerDownOutside: m = !1,
						onEscapeKeyDown: h,
						onPointerDownOutside: v,
						onFocusOutside: g,
						onInteractOutside: y,
						onDismiss: w,
						...x
					} = e,
					b = n.useContext(u),
					[E, C] = n.useState(null),
					R = E?.ownerDocument ?? globalThis?.document,
					[, S] = n.useState({}),
					P = (0, i.useComposedRefs)(c, (e) => C(e)),
					j = Array.from(b.layers),
					[N] = [...b.layersWithOutsidePointerEventsDisabled].slice(-1),
					k = j.indexOf(N),
					A = E ? j.indexOf(E) : -1,
					T = b.layersWithOutsidePointerEventsDisabled.size > 0,
					D = A >= k,
					O = n.useRef(!1),
					L = (function (e, t) {
						const {
								ownerDocument: r = globalThis?.document,
								deferPointerDownOutside: o = !1,
								isDeferredPointerDownOutsideRef: i,
								dismissableSurfaces: l,
							} = t,
							s = (0, a.useCallbackRef)(e),
							u = n.useRef(!1),
							c = n.useRef(!1),
							d = n.useRef(new Map()),
							p = n.useRef(() => {});
						return (
							n.useEffect(() => {
								function e() {
									(c.current = !1), (i.current = !1), d.current.clear();
								}
								function t(e) {
									if (!c.current) return;
									const t = e.target;
									(t instanceof Node && [...l].some((e) => e.contains(t))) ||
										d.current.set(e.type, !0),
										"click" === e.type &&
											window.setTimeout(() => {
												c.current && p.current();
											}, 0);
								}
								function n(e) {
									c.current && d.current.set(e.type, !1);
								}
								const a = (t) => {
										if (t.target && !u.current) {
											const n = function () {
													r.removeEventListener("click", p.current);
													const t = Array.from(d.current.values()).some(
														Boolean,
													);
													e(),
														t ||
															f("dismissableLayer.pointerDownOutside", s, a, {
																discrete: !0,
															});
												},
												a = { originalEvent: t };
											(c.current = !0),
												(i.current = o && 0 === t.button),
												d.current.clear(),
												o && 0 === t.button
													? (r.removeEventListener("click", p.current),
														(p.current = n),
														r.addEventListener("click", p.current, {
															once: !0,
														}))
													: n();
										} else r.removeEventListener("click", p.current), e();
										u.current = !1;
									},
									m = [
										"pointerup",
										"mousedown",
										"mouseup",
										"touchstart",
										"touchend",
										"click",
									];
								for (const e of m)
									r.addEventListener(e, t, !0), r.addEventListener(e, n);
								const h = window.setTimeout(() => {
									r.addEventListener("pointerdown", a);
								}, 0);
								return () => {
									for (const e of (window.clearTimeout(h),
									r.removeEventListener("pointerdown", a),
									r.removeEventListener("click", p.current),
									m))
										r.removeEventListener(e, t, !0),
											r.removeEventListener(e, n);
								};
							}, [r, s, o, i, l]),
							{ onPointerDownCapture: () => (u.current = !0) }
						);
					})(
						(e) => {
							const t = e.target;
							if (!(t instanceof Node)) return;
							const n = [...b.branches].some((e) => e.contains(t));
							D && !n && (v?.(e), y?.(e), e.defaultPrevented || w?.());
						},
						{
							ownerDocument: R,
							deferPointerDownOutside: m,
							isDeferredPointerDownOutsideRef: O,
							dismissableSurfaces: b.dismissableSurfaces,
						},
					),
					M = (function (e, t = globalThis?.document) {
						const r = (0, a.useCallbackRef)(e),
							o = n.useRef(!1);
						return (
							n.useEffect(() => {
								const e = (e) => {
									e.target &&
										!o.current &&
										f(
											"dismissableLayer.focusOutside",
											r,
											{ originalEvent: e },
											{ discrete: !1 },
										);
								};
								return (
									t.addEventListener("focusin", e),
									() => t.removeEventListener("focusin", e)
								);
							}, [t, r]),
							{
								onFocusCapture: () => (o.current = !0),
								onBlurCapture: () => (o.current = !1),
							}
						);
					})((e) => {
						if (m && O.current) return;
						const t = e.target;
						![...b.branches].some((e) => e.contains(t)) &&
							(g?.(e), y?.(e), e.defaultPrevented || w?.());
					}, R);
				return (
					!(function (e, t = globalThis?.document) {
						const r = (0, a.useCallbackRef)(e);
						n.useEffect(() => {
							const e = (e) => {
								"Escape" === e.key && r(e);
							};
							return (
								t.addEventListener("keydown", e, { capture: !0 }),
								() => t.removeEventListener("keydown", e, { capture: !0 })
							);
						}, [r, t]);
					})((e) => {
						A === b.layers.size - 1 &&
							(h?.(e), !e.defaultPrevented && w && (e.preventDefault(), w()));
					}, R),
					n.useEffect(() => {
						if (E)
							return (
								p &&
									(0 === b.layersWithOutsidePointerEventsDisabled.size &&
										((t = R.body.style.pointerEvents),
										(R.body.style.pointerEvents = "none")),
									b.layersWithOutsidePointerEventsDisabled.add(E)),
								b.layers.add(E),
								d(),
								() => {
									p &&
										(b.layersWithOutsidePointerEventsDisabled.delete(E),
										0 === b.layersWithOutsidePointerEventsDisabled.size &&
											(R.body.style.pointerEvents = t));
								}
							);
					}, [E, R, p, b]),
					n.useEffect(
						() => () => {
							E &&
								(b.layers.delete(E),
								b.layersWithOutsidePointerEventsDisabled.delete(E),
								d());
						},
						[E, b],
					),
					n.useEffect(() => {
						const e = () => S({});
						return (
							document.addEventListener(s, e),
							() => document.removeEventListener(s, e)
						);
					}, []),
					(0, l.jsx)(o.Primitive.div, {
						...x,
						ref: P,
						style: {
							pointerEvents: T ? (D ? "auto" : "none") : void 0,
							...e.style,
						},
						onFocusCapture: (0, r.composeEventHandlers)(
							e.onFocusCapture,
							M.onFocusCapture,
						),
						onBlurCapture: (0, r.composeEventHandlers)(
							e.onBlurCapture,
							M.onBlurCapture,
						),
						onPointerDownCapture: (0, r.composeEventHandlers)(
							e.onPointerDownCapture,
							L.onPointerDownCapture,
						),
					})
				);
			});
		function d() {
			const e = new CustomEvent(s);
			document.dispatchEvent(e);
		}
		function f(e, t, n, { discrete: r }) {
			const i = n.originalEvent.target,
				a = new CustomEvent(e, { bubbles: !1, cancelable: !0, detail: n });
			t && i.addEventListener(e, t, { once: !0 }),
				r ? (0, o.dispatchDiscreteCustomEvent)(i, a) : i.dispatchEvent(a);
		}
		(c.displayName = "DismissableLayer"),
			(n.forwardRef((e, t) => {
				const r = n.useContext(u),
					a = n.useRef(null),
					s = (0, i.useComposedRefs)(t, a);
				return (
					n.useEffect(() => {
						const e = a.current;
						if (e)
							return (
								r.branches.add(e),
								() => {
									r.branches.delete(e);
								}
							);
					}, [r.branches]),
					(0, l.jsx)(o.Primitive.div, { ...e, ref: s })
				);
			}).displayName = "DismissableLayerBranch"),
			e.s(
				[
					"DismissableLayer",
					0,
					c,
					"useDismissableLayerSurface",
					0,
					function () {
						const e = n.useContext(u),
							[t, r] = n.useState(null);
						return (
							n.useEffect(() => {
								if (t)
									return (
										e.dismissableSurfaces.add(t),
										() => {
											e.dismissableSurfaces.delete(t);
										}
									);
							}, [t, e.dismissableSurfaces]),
							r
						);
					},
				],
				48661,
			);
	},
	88866,
	(e) => {
		"use strict";
		let t;
		var n = e.i(57319),
			r = e.i(67714),
			o = e.i(33833),
			i = e.i(9964),
			a = e.i(62613),
			l = "focusScope.autoFocusOnMount",
			s = "focusScope.autoFocusOnUnmount",
			u = { bubbles: !1, cancelable: !0 },
			c = n.forwardRef((e, t) => {
				const {
						loop: c = !1,
						trapped: h = !1,
						onMountAutoFocus: v,
						onUnmountAutoFocus: g,
						...y
					} = e,
					[w, x] = n.useState(null),
					b = (0, i.useCallbackRef)(v),
					E = (0, i.useCallbackRef)(g),
					C = n.useRef(null),
					R = (0, r.useComposedRefs)(t, (e) => x(e)),
					S = n.useRef({
						paused: !1,
						pause() {
							this.paused = !0;
						},
						resume() {
							this.paused = !1;
						},
					}).current;
				n.useEffect(() => {
					if (h) {
						const e = function (e) {
								if (S.paused || !w) return;
								const t = e.target;
								w.contains(t) ? (C.current = t) : p(C.current, { select: !0 });
							},
							t = function (e) {
								if (S.paused || !w) return;
								const t = e.relatedTarget;
								null !== t && (w.contains(t) || p(C.current, { select: !0 }));
							};
						document.addEventListener("focusin", e),
							document.addEventListener("focusout", t);
						const n = new MutationObserver(function (e) {
							if (document.activeElement === document.body)
								for (const t of e) t.removedNodes.length > 0 && p(w);
						});
						return (
							w && n.observe(w, { childList: !0, subtree: !0 }),
							() => {
								document.removeEventListener("focusin", e),
									document.removeEventListener("focusout", t),
									n.disconnect();
							}
						);
					}
				}, [h, w, S.paused]),
					n.useEffect(() => {
						if (w) {
							m.add(S);
							const e = document.activeElement;
							if (!w.contains(e)) {
								const t = new CustomEvent(l, u);
								w.addEventListener(l, b),
									w.dispatchEvent(t),
									t.defaultPrevented ||
										((function (e, { select: t = !1 } = {}) {
											const n = document.activeElement;
											for (const r of e)
												if ((p(r, { select: t }), document.activeElement !== n))
													return;
										})(
											d(w).filter((e) => "A" !== e.tagName),
											{ select: !0 },
										),
										document.activeElement === e && p(w));
							}
							return () => {
								w.removeEventListener(l, b),
									setTimeout(() => {
										const t = new CustomEvent(s, u);
										w.addEventListener(s, E),
											w.dispatchEvent(t),
											t.defaultPrevented ||
												p(e ?? document.body, { select: !0 }),
											w.removeEventListener(s, E),
											m.remove(S);
									}, 0);
							};
						}
					}, [w, b, E, S]);
				const P = n.useCallback(
					(e) => {
						if ((!c && !h) || S.paused) return;
						const t = "Tab" === e.key && !e.altKey && !e.ctrlKey && !e.metaKey,
							n = document.activeElement;
						if (t && n) {
							var r;
							let t,
								o = e.currentTarget,
								[i, a] = [f((t = d((r = o))), r), f(t.reverse(), r)];
							i && a
								? e.shiftKey || n !== a
									? e.shiftKey &&
										n === i &&
										(e.preventDefault(), c && p(a, { select: !0 }))
									: (e.preventDefault(), c && p(i, { select: !0 }))
								: n === o && e.preventDefault();
						}
					},
					[c, h, S.paused],
				);
				return (0, a.jsx)(o.Primitive.div, {
					tabIndex: -1,
					...y,
					ref: R,
					onKeyDown: P,
				});
			});
		function d(e) {
			const t = [],
				n = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, {
					acceptNode: (e) => {
						const t = "INPUT" === e.tagName && "hidden" === e.type;
						return e.disabled || e.hidden || t
							? NodeFilter.FILTER_SKIP
							: e.tabIndex >= 0
								? NodeFilter.FILTER_ACCEPT
								: NodeFilter.FILTER_SKIP;
					},
				});
			for (; n.nextNode(); ) t.push(n.currentNode);
			return t;
		}
		function f(e, t) {
			for (const n of e)
				if (
					!(function (e, { upTo: t }) {
						if ("hidden" === getComputedStyle(e).visibility) return !0;
						for (; e && (void 0 === t || e !== t); ) {
							if ("none" === getComputedStyle(e).display) return !0;
							e = e.parentElement;
						}
						return !1;
					})(n, { upTo: t })
				)
					return n;
		}
		function p(e, { select: t = !1 } = {}) {
			if (e && e.focus) {
				var n;
				const r = document.activeElement;
				e.focus({ preventScroll: !0 }),
					e !== r &&
						(n = e) instanceof HTMLInputElement &&
						"select" in n &&
						t &&
						e.select();
			}
		}
		c.displayName = "FocusScope";
		var m =
			((t = []),
			{
				add(e) {
					const n = t[0];
					e !== n && n?.pause(), (t = h(t, e)).unshift(e);
				},
				remove(e) {
					(t = h(t, e)), t[0]?.resume();
				},
			});
		function h(e, t) {
			const n = [...e],
				r = n.indexOf(t);
			return -1 !== r && n.splice(r, 1), n;
		}
		e.s(["FocusScope", 0, c]);
	},
	51168,
	(e) => {
		"use strict";
		var t = e.i(57319),
			n = e.i(86460),
			r = e.i(33833),
			o = e.i(13575),
			i = e.i(62613),
			a = t.forwardRef((e, a) => {
				const { container: l, ...s } = e,
					[u, c] = t.useState(!1);
				(0, o.useLayoutEffect)(() => c(!0), []);
				const d = l || (u && globalThis?.document?.body);
				return d
					? n.createPortal((0, i.jsx)(r.Primitive.div, { ...s, ref: a }), d)
					: null;
			});
		(a.displayName = "Portal"), e.s(["Portal", 0, a]);
	},
	49674,
	(e) => {
		"use strict";
		var t = e.i(57319),
			n = e.i(13575),
			r = (e) => {
				var r;
				let a,
					l,
					{ present: s, children: u } = e,
					c = (function (e) {
						var r, o;
						const [a, l] = t.useState(),
							s = t.useRef(null),
							u = t.useRef(e),
							c = t.useRef("none"),
							[d, f] =
								((r = e ? "mounted" : "unmounted"),
								(o = {
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
								t.useReducer((e, t) => o[e][t] ?? e, r));
						return (
							t.useEffect(() => {
								const e = i(s.current);
								c.current = "mounted" === d ? e : "none";
							}, [d]),
							(0, n.useLayoutEffect)(() => {
								const t = s.current,
									n = u.current;
								if (n !== e) {
									const r = c.current,
										o = i(t);
									e
										? f("MOUNT")
										: "none" === o || t?.display === "none"
											? f("UNMOUNT")
											: n && r !== o
												? f("ANIMATION_OUT")
												: f("UNMOUNT"),
										(u.current = e);
								}
							}, [e, f]),
							(0, n.useLayoutEffect)(() => {
								if (a) {
									let e,
										t = a.ownerDocument.defaultView ?? window,
										n = (n) => {
											const r = i(s.current).includes(
												CSS.escape(n.animationName),
											);
											if (
												n.target === a &&
												r &&
												(f("ANIMATION_END"), !u.current)
											) {
												const n = a.style.animationFillMode;
												(a.style.animationFillMode = "forwards"),
													(e = t.setTimeout(() => {
														"forwards" === a.style.animationFillMode &&
															(a.style.animationFillMode = n);
													}));
											}
										},
										r = (e) => {
											e.target === a && (c.current = i(s.current));
										};
									return (
										a.addEventListener("animationstart", r),
										a.addEventListener("animationcancel", n),
										a.addEventListener("animationend", n),
										() => {
											t.clearTimeout(e),
												a.removeEventListener("animationstart", r),
												a.removeEventListener("animationcancel", n),
												a.removeEventListener("animationend", n);
										}
									);
								}
								f("ANIMATION_END");
							}, [a, f]),
							{
								isPresent: ["mounted", "unmountSuspended"].includes(d),
								ref: t.useCallback((e) => {
									(s.current = e ? getComputedStyle(e) : null), l(e);
								}, []),
							}
						);
					})(s),
					d =
						"function" == typeof u
							? u({ present: c.isPresent })
							: t.Children.only(u),
					f = (function (...e) {
						const n = t.useRef(e);
						return (
							(n.current = e),
							t.useCallback((e) => {
								let t = n.current,
									r = !1,
									i = t.map((t) => {
										const n = o(t, e);
										return r || "function" != typeof n || (r = !0), n;
									});
								if (r)
									return () => {
										for (let e = 0; e < i.length; e++) {
											const n = i[e];
											"function" == typeof n ? n() : o(t[e], null);
										}
									};
							}, [])
						);
					})(
						c.ref,
						((r = d),
						(l =
							(a = Object.getOwnPropertyDescriptor(r.props, "ref")?.get) &&
							"isReactWarning" in a &&
							a.isReactWarning)
							? r.ref
							: (l =
										(a = Object.getOwnPropertyDescriptor(r, "ref")?.get) &&
										"isReactWarning" in a &&
										a.isReactWarning)
								? r.props.ref
								: r.props.ref || r.ref),
					);
				return "function" == typeof u || c.isPresent
					? t.cloneElement(d, { ref: f })
					: null;
			};
		function o(e, t) {
			if ("function" == typeof e) return e(t);
			null != e && (e.current = t);
		}
		function i(e) {
			return e?.animationName || "none";
		}
		(r.displayName = "Presence"), e.s(["Presence", 0, r]);
	},
	16066,
	37381,
	10035,
	62876,
	63366,
	(e) => {
		"use strict";
		var t,
			n,
			r,
			o,
			i,
			a,
			l,
			s = e.i(62613),
			u = e.i(57319),
			c = e.i(97557),
			d = e.i(67714),
			f = e.i(15246),
			p = e.i(72476),
			m = e.i(5396),
			h = e.i(48661),
			v = e.i(88866),
			g = e.i(51168),
			y = e.i(49674),
			w = e.i(33833),
			x = 0,
			b = null;
		function E() {
			u.useEffect(() => {
				b || (b = { start: C(), end: C() });
				const { start: e, end: t } = b;
				return (
					document.body.firstElementChild !== e &&
						document.body.insertAdjacentElement("afterbegin", e),
					document.body.lastElementChild !== t &&
						document.body.insertAdjacentElement("beforeend", t),
					x++,
					() => {
						1 === x && (b?.start.remove(), b?.end.remove(), (b = null)),
							(x = Math.max(0, x - 1));
					}
				);
			}, []);
		}
		function C() {
			const e = document.createElement("span");
			return (
				e.setAttribute("data-radix-focus-guard", ""),
				(e.tabIndex = 0),
				(e.style.outline = "none"),
				(e.style.opacity = "0"),
				(e.style.position = "fixed"),
				(e.style.pointerEvents = "none"),
				e
			);
		}
		e.s(["useFocusGuards", 0, E], 37381);
		var R = function () {
			return (R =
				Object.assign ||
				function (e) {
					for (var t, n = 1, r = arguments.length; n < r; n++)
						for (var o in (t = arguments[n]))
							Object.prototype.hasOwnProperty.call(t, o) && (e[o] = t[o]);
					return e;
				}).apply(this, arguments);
		};
		function S(e, t) {
			var n = {};
			for (var r in e)
				Object.prototype.hasOwnProperty.call(e, r) &&
					0 > t.indexOf(r) &&
					(n[r] = e[r]);
			if (null != e && "function" == typeof Object.getOwnPropertySymbols)
				for (var o = 0, r = Object.getOwnPropertySymbols(e); o < r.length; o++)
					0 > t.indexOf(r[o]) &&
						Object.prototype.propertyIsEnumerable.call(e, r[o]) &&
						(n[r[o]] = e[r[o]]);
			return n;
		}
		var P =
				("function" == typeof SuppressedError && SuppressedError,
				"right-scroll-bar-position"),
			j = "width-before-scroll-bar";
		function N(e, t) {
			return "function" == typeof e ? e(t) : e && (e.current = t), e;
		}
		var k = "u" > typeof window ? u.useLayoutEffect : u.useEffect,
			A = new WeakMap(),
			T =
				(void 0 === t && (t = {}),
				((void 0 === n &&
					(n = function (e) {
						return e;
					}),
				(r = []),
				(o = !1),
				(i = {
					read: function () {
						if (o)
							throw Error(
								"Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.",
							);
						return r.length ? r[r.length - 1] : null;
					},
					useMedium: function (e) {
						var t = n(e, o);
						return (
							r.push(t),
							function () {
								r = r.filter(function (e) {
									return e !== t;
								});
							}
						);
					},
					assignSyncMedium: function (e) {
						for (o = !0; r.length; ) {
							var t = r;
							(r = []), t.forEach(e);
						}
						r = {
							push: function (t) {
								return e(t);
							},
							filter: function () {
								return r;
							},
						};
					},
					assignMedium: function (e) {
						o = !0;
						var t = [];
						if (r.length) {
							var n = r;
							(r = []), n.forEach(e), (t = r);
						}
						var i = function () {
								var n = t;
								(t = []), n.forEach(e);
							},
							a = function () {
								return Promise.resolve().then(i);
							};
						a(),
							(r = {
								push: function (e) {
									t.push(e), a();
								},
								filter: function (e) {
									return (t = t.filter(e)), r;
								},
							});
					},
				})).options = R({ async: !0, ssr: !1 }, t)),
				i),
			D = function () {},
			O = u.forwardRef(function (e, t) {
				var n,
					r,
					o,
					i,
					a = u.useRef(null),
					l = u.useState({
						onScrollCapture: D,
						onWheelCapture: D,
						onTouchMoveCapture: D,
					}),
					s = l[0],
					c = l[1],
					d = e.forwardProps,
					f = e.children,
					p = e.className,
					m = e.removeScrollBar,
					h = e.enabled,
					v = e.shards,
					g = e.sideCar,
					y = e.noRelative,
					w = e.noIsolation,
					x = e.inert,
					b = e.allowPinchZoom,
					E = e.as,
					C = e.gapMode,
					P = S(e, [
						"forwardProps",
						"children",
						"className",
						"removeScrollBar",
						"enabled",
						"shards",
						"sideCar",
						"noRelative",
						"noIsolation",
						"inert",
						"allowPinchZoom",
						"as",
						"gapMode",
					]),
					j =
						((n = [a, t]),
						(r = function (e) {
							return n.forEach(function (t) {
								return N(t, e);
							});
						}),
						((o = (0, u.useState)(function () {
							return {
								value: null,
								callback: r,
								facade: {
									get current() {
										return o.value;
									},
									set current(value) {
										var e = o.value;
										e !== value && ((o.value = value), o.callback(value, e));
									},
								},
							};
						})[0]).callback = r),
						(i = o.facade),
						k(
							function () {
								var e = A.get(i);
								if (e) {
									var t = new Set(e),
										r = new Set(n),
										o = i.current;
									t.forEach(function (e) {
										r.has(e) || N(e, null);
									}),
										r.forEach(function (e) {
											t.has(e) || N(e, o);
										});
								}
								A.set(i, n);
							},
							[n],
						),
						i),
					O = R(R({}, P), s);
				return u.createElement(
					u.Fragment,
					null,
					h &&
						u.createElement(g, {
							sideCar: T,
							removeScrollBar: m,
							shards: v,
							noRelative: y,
							noIsolation: w,
							inert: x,
							setCallbacks: c,
							allowPinchZoom: !!b,
							lockRef: a,
							gapMode: C,
						}),
					d
						? u.cloneElement(u.Children.only(f), R(R({}, O), { ref: j }))
						: u.createElement(
								void 0 === E ? "div" : E,
								R({}, O, { className: p, ref: j }),
								f,
							),
				);
			});
		(O.defaultProps = { enabled: !0, removeScrollBar: !0, inert: !1 }),
			(O.classNames = { fullWidth: j, zeroRight: P });
		var L = function (e) {
			var t = e.sideCar,
				n = S(e, ["sideCar"]);
			if (!t)
				throw Error(
					"Sidecar: please provide `sideCar` property to import the right car",
				);
			var r = t.read();
			if (!r) throw Error("Sidecar medium not found");
			return u.createElement(r, R({}, n));
		};
		L.isSideCarExport = !0;
		var M = function () {
				var e = 0,
					t = null;
				return {
					add: function (n) {
						if (
							0 == e &&
							(t = (function () {
								if (!document) return null;
								var e = document.createElement("style");
								e.type = "text/css";
								var t =
									l ||
									("u" > typeof __webpack_nonce__ ? __webpack_nonce__ : void 0);
								return t && e.setAttribute("nonce", t), e;
							})())
						) {
							var r, o;
							(r = t).styleSheet
								? (r.styleSheet.cssText = n)
								: r.appendChild(document.createTextNode(n)),
								(o = t),
								(
									document.head || document.getElementsByTagName("head")[0]
								).appendChild(o);
						}
						e++;
					},
					remove: function () {
						--e ||
							!t ||
							(t.parentNode && t.parentNode.removeChild(t), (t = null));
					},
				};
			},
			I = function () {
				var e = M();
				return function (t, n) {
					u.useEffect(
						function () {
							return (
								e.add(t),
								function () {
									e.remove();
								}
							);
						},
						[t && n],
					);
				};
			},
			F = function () {
				var e = I();
				return function (t) {
					return e(t.styles, t.dynamic), null;
				};
			},
			H = { left: 0, top: 0, right: 0, gap: 0 },
			_ = function (e) {
				return parseInt(e || "", 10) || 0;
			},
			W = function (e) {
				var t = window.getComputedStyle(document.body),
					n = t["padding" === e ? "paddingLeft" : "marginLeft"],
					r = t["padding" === e ? "paddingTop" : "marginTop"],
					o = t["padding" === e ? "paddingRight" : "marginRight"];
				return [_(n), _(r), _(o)];
			},
			z = function (e) {
				if ((void 0 === e && (e = "margin"), "u" < typeof window)) return H;
				var t = W(e),
					n = document.documentElement.clientWidth,
					r = window.innerWidth;
				return {
					left: t[0],
					top: t[1],
					right: t[2],
					gap: Math.max(0, r - n + t[2] - t[0]),
				};
			},
			B = F(),
			V = "data-scroll-locked",
			U = function (e, t, n, r) {
				var o = e.left,
					i = e.top,
					a = e.right,
					l = e.gap;
				return (
					void 0 === n && (n = "margin"),
					"\n  ."
						.concat("with-scroll-bars-hidden", " {\n   overflow: hidden ")
						.concat(r, ";\n   padding-right: ")
						.concat(l, "px ")
						.concat(r, ";\n  }\n  body[")
						.concat(V, "] {\n    overflow: hidden ")
						.concat(r, ";\n    overscroll-behavior: contain;\n    ")
						.concat(
							[
								t && "position: relative ".concat(r, ";"),
								"margin" === n &&
									"\n    padding-left: "
										.concat(o, "px;\n    padding-top: ")
										.concat(i, "px;\n    padding-right: ")
										.concat(
											a,
											"px;\n    margin-left:0;\n    margin-top:0;\n    margin-right: ",
										)
										.concat(l, "px ")
										.concat(r, ";\n    "),
								"padding" === n &&
									"padding-right: ".concat(l, "px ").concat(r, ";"),
							]
								.filter(Boolean)
								.join(""),
							"\n  }\n  \n  .",
						)
						.concat(P, " {\n    right: ")
						.concat(l, "px ")
						.concat(r, ";\n  }\n  \n  .")
						.concat(j, " {\n    margin-right: ")
						.concat(l, "px ")
						.concat(r, ";\n  }\n  \n  .")
						.concat(P, " .")
						.concat(P, " {\n    right: 0 ")
						.concat(r, ";\n  }\n  \n  .")
						.concat(j, " .")
						.concat(j, " {\n    margin-right: 0 ")
						.concat(r, ";\n  }\n  \n  body[")
						.concat(V, "] {\n    ")
						.concat("--removed-body-scroll-bar-size", ": ")
						.concat(l, "px;\n  }\n")
				);
			},
			K = function () {
				var e = parseInt(document.body.getAttribute(V) || "0", 10);
				return isFinite(e) ? e : 0;
			},
			$ = function () {
				u.useEffect(function () {
					return (
						document.body.setAttribute(V, (K() + 1).toString()),
						function () {
							var e = K() - 1;
							e <= 0
								? document.body.removeAttribute(V)
								: document.body.setAttribute(V, e.toString());
						}
					);
				}, []);
			},
			Y = function (e) {
				var t = e.noRelative,
					n = e.noImportant,
					r = e.gapMode,
					o = void 0 === r ? "margin" : r;
				$();
				var i = u.useMemo(
					function () {
						return z(o);
					},
					[o],
				);
				return u.createElement(B, {
					styles: U(i, !t, o, n ? "" : "!important"),
				});
			},
			X = !1;
		if ("u" > typeof window)
			try {
				var q = Object.defineProperty({}, "passive", {
					get: function () {
						return (X = !0), !0;
					},
				});
				window.addEventListener("test", q, q),
					window.removeEventListener("test", q, q);
			} catch (e) {
				X = !1;
			}
		var Z = !!X && { passive: !1 },
			G = function (e, t) {
				if (!(e instanceof Element)) return !1;
				var n = window.getComputedStyle(e);
				return (
					"hidden" !== n[t] &&
					(n.overflowY !== n.overflowX ||
						"TEXTAREA" === e.tagName ||
						"visible" !== n[t])
				);
			},
			J = function (e, t) {
				var n = t.ownerDocument,
					r = t;
				do {
					if (
						("u" > typeof ShadowRoot && r instanceof ShadowRoot && (r = r.host),
						Q(e, r))
					) {
						var o = ee(e, r);
						if (o[1] > o[2]) return !0;
					}
					r = r.parentNode;
				} while (r && r !== n.body);
				return !1;
			},
			Q = function (e, t) {
				return "v" === e ? G(t, "overflowY") : G(t, "overflowX");
			},
			ee = function (e, t) {
				return "v" === e
					? [t.scrollTop, t.scrollHeight, t.clientHeight]
					: [t.scrollLeft, t.scrollWidth, t.clientWidth];
			},
			et = function (e, t, n, r, o) {
				var i,
					a =
						((i = window.getComputedStyle(t).direction),
						"h" === e && "rtl" === i ? -1 : 1),
					l = a * r,
					s = n.target,
					u = t.contains(s),
					c = !1,
					d = l > 0,
					f = 0,
					p = 0;
				do {
					if (!s) break;
					var m = ee(e, s),
						h = m[0],
						v = m[1] - m[2] - a * h;
					(h || v) && Q(e, s) && ((f += v), (p += h));
					var g = s.parentNode;
					s = g && g.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? g.host : g;
				} while (
					(!u && s !== document.body) ||
					(u && (t.contains(s) || t === s))
				);
				return (
					d && ((o && 1 > Math.abs(f)) || (!o && l > f))
						? (c = !0)
						: !d && ((o && 1 > Math.abs(p)) || (!o && -l > p)) && (c = !0),
					c
				);
			},
			en = function (e) {
				return "changedTouches" in e
					? [e.changedTouches[0].clientX, e.changedTouches[0].clientY]
					: [0, 0];
			},
			er = function (e) {
				return [e.deltaX, e.deltaY];
			},
			eo = function (e) {
				return e && "current" in e ? e.current : e;
			},
			ei = 0,
			ea = [];
		const el =
			((a = function (e) {
				var t = u.useRef([]),
					n = u.useRef([0, 0]),
					r = u.useRef(),
					o = u.useState(ei++)[0],
					i = u.useState(F)[0],
					a = u.useRef(e);
				u.useEffect(
					function () {
						a.current = e;
					},
					[e],
				),
					u.useEffect(
						function () {
							if (e.inert) {
								document.body.classList.add("block-interactivity-".concat(o));
								var t = (function (e, t, n) {
									if (n || 2 == arguments.length)
										for (var r, o = 0, i = t.length; o < i; o++)
											(!r && o in t) ||
												(r || (r = Array.prototype.slice.call(t, 0, o)),
												(r[o] = t[o]));
									return e.concat(r || Array.prototype.slice.call(t));
								})([e.lockRef.current], (e.shards || []).map(eo), !0).filter(
									Boolean,
								);
								return (
									t.forEach(function (e) {
										return e.classList.add("allow-interactivity-".concat(o));
									}),
									function () {
										document.body.classList.remove(
											"block-interactivity-".concat(o),
										),
											t.forEach(function (e) {
												return e.classList.remove(
													"allow-interactivity-".concat(o),
												);
											});
									}
								);
							}
						},
						[e.inert, e.lockRef.current, e.shards],
					);
				var l = u.useCallback(function (e, t) {
						if (
							("touches" in e && 2 === e.touches.length) ||
							("wheel" === e.type && e.ctrlKey)
						)
							return !a.current.allowPinchZoom;
						var o,
							i = en(e),
							l = n.current,
							s = "deltaX" in e ? e.deltaX : l[0] - i[0],
							u = "deltaY" in e ? e.deltaY : l[1] - i[1],
							c = e.target,
							d = Math.abs(s) > Math.abs(u) ? "h" : "v";
						if ("touches" in e && "h" === d && "range" === c.type) return !1;
						var f = window.getSelection(),
							p = f && f.anchorNode;
						if (p && (p === c || p.contains(c))) return !1;
						var m = J(d, c);
						if (!m) return !0;
						if (
							(m ? (o = d) : ((o = "v" === d ? "h" : "v"), (m = J(d, c))), !m)
						)
							return !1;
						if (
							(!r.current &&
								"changedTouches" in e &&
								(s || u) &&
								(r.current = o),
							!o)
						)
							return !0;
						var h = r.current || o;
						return et(h, t, e, "h" === h ? s : u, !0);
					}, []),
					s = u.useCallback(function (e) {
						if (ea.length && ea[ea.length - 1] === i) {
							var n = "deltaY" in e ? er(e) : en(e),
								r = t.current.filter(function (t) {
									var r;
									return (
										t.name === e.type &&
										(t.target === e.target || e.target === t.shadowParent) &&
										((r = t.delta), r[0] === n[0] && r[1] === n[1])
									);
								})[0];
							if (r && r.should) {
								e.cancelable && e.preventDefault();
								return;
							}
							if (!r) {
								var o = (a.current.shards || [])
									.map(eo)
									.filter(Boolean)
									.filter(function (t) {
										return t.contains(e.target);
									});
								(o.length > 0 ? l(e, o[0]) : !a.current.noIsolation) &&
									e.cancelable &&
									e.preventDefault();
							}
						}
					}, []),
					c = u.useCallback(function (e, n, r, o) {
						var i = {
							name: e,
							delta: n,
							target: r,
							should: o,
							shadowParent: (function (e) {
								for (var t = null; null !== e; )
									e instanceof ShadowRoot && ((t = e.host), (e = e.host)),
										(e = e.parentNode);
								return t;
							})(r),
						};
						t.current.push(i),
							setTimeout(function () {
								t.current = t.current.filter(function (e) {
									return e !== i;
								});
							}, 1);
					}, []),
					d = u.useCallback(function (e) {
						(n.current = en(e)), (r.current = void 0);
					}, []),
					f = u.useCallback(function (t) {
						c(t.type, er(t), t.target, l(t, e.lockRef.current));
					}, []),
					p = u.useCallback(function (t) {
						c(t.type, en(t), t.target, l(t, e.lockRef.current));
					}, []);
				u.useEffect(function () {
					return (
						ea.push(i),
						e.setCallbacks({
							onScrollCapture: f,
							onWheelCapture: f,
							onTouchMoveCapture: p,
						}),
						document.addEventListener("wheel", s, Z),
						document.addEventListener("touchmove", s, Z),
						document.addEventListener("touchstart", d, Z),
						function () {
							(ea = ea.filter(function (e) {
								return e !== i;
							})),
								document.removeEventListener("wheel", s, Z),
								document.removeEventListener("touchmove", s, Z),
								document.removeEventListener("touchstart", d, Z);
						}
					);
				}, []);
				var m = e.removeScrollBar,
					h = e.inert;
				return u.createElement(
					u.Fragment,
					null,
					h
						? u.createElement(i, {
								styles: "\n  .block-interactivity-"
									.concat(
										o,
										" {pointer-events: none;}\n  .allow-interactivity-",
									)
									.concat(o, " {pointer-events: all;}\n"),
							})
						: null,
					m
						? u.createElement(Y, {
								noRelative: e.noRelative,
								gapMode: e.gapMode,
							})
						: null,
				);
			}),
			T.useMedium(a),
			L);
		var es = u.forwardRef(function (e, t) {
			return u.createElement(O, R({}, e, { ref: t, sideCar: el }));
		});
		(es.classNames = O.classNames), e.s(["RemoveScroll", 0, es], 10035);
		var eu = new WeakMap(),
			ec = new WeakMap(),
			ed = {},
			ef = 0,
			ep = function (e) {
				return e && (e.host || ep(e.parentNode));
			},
			em = function (e, t, n, r) {
				var o = (Array.isArray(e) ? e : [e])
					.map(function (e) {
						if (t.contains(e)) return e;
						var n = ep(e);
						return n && t.contains(n)
							? n
							: (console.error(
									"aria-hidden",
									e,
									"in not contained inside",
									t,
									". Doing nothing",
								),
								null);
					})
					.filter(function (e) {
						return !!e;
					});
				ed[n] || (ed[n] = new WeakMap());
				var i = ed[n],
					a = [],
					l = new Set(),
					s = new Set(o),
					u = function (e) {
						!e || l.has(e) || (l.add(e), u(e.parentNode));
					};
				o.forEach(u);
				var c = function (e) {
					!e ||
						s.has(e) ||
						Array.prototype.forEach.call(e.children, function (e) {
							if (l.has(e)) c(e);
							else
								try {
									var t = e.getAttribute(r),
										o = null !== t && "false" !== t,
										s = (eu.get(e) || 0) + 1,
										u = (i.get(e) || 0) + 1;
									eu.set(e, s),
										i.set(e, u),
										a.push(e),
										1 === s && o && ec.set(e, !0),
										1 === u && e.setAttribute(n, "true"),
										o || e.setAttribute(r, "true");
								} catch (t) {
									console.error("aria-hidden: cannot operate on ", e, t);
								}
						});
				};
				return (
					c(t),
					l.clear(),
					ef++,
					function () {
						a.forEach(function (e) {
							var t = eu.get(e) - 1,
								o = i.get(e) - 1;
							eu.set(e, t),
								i.set(e, o),
								t || (ec.has(e) || e.removeAttribute(r), ec.delete(e)),
								o || e.removeAttribute(n);
						}),
							--ef ||
								((eu = new WeakMap()),
								(eu = new WeakMap()),
								(ec = new WeakMap()),
								(ed = {}));
					}
				);
			},
			eh = function (e, t, n) {
				void 0 === n && (n = "data-aria-hidden");
				var r = Array.from(Array.isArray(e) ? e : [e]),
					o =
						t ||
						("u" < typeof document
							? null
							: (Array.isArray(e) ? e[0] : e).ownerDocument.body);
				return o
					? (r.push.apply(
							r,
							Array.from(o.querySelectorAll("[aria-live], script")),
						),
						em(r, o, n, "aria-hidden"))
					: function () {
							return null;
						};
			};
		e.s(["hideOthers", 0, eh], 62876);
		var ev = e.i(9671),
			eg = "Dialog",
			[ey, ew] = (0, f.createContextScope)(eg),
			[ex, eb] = ey(eg),
			eE = (e) => {
				const {
						__scopeDialog: t,
						children: n,
						open: r,
						defaultOpen: o,
						onOpenChange: i,
						modal: a = !0,
					} = e,
					l = u.useRef(null),
					c = u.useRef(null),
					[d, f] = (0, m.useControllableState)({
						prop: r,
						defaultProp: o ?? !1,
						onChange: i,
						caller: eg,
					});
				return (0, s.jsx)(ex, {
					scope: t,
					triggerRef: l,
					contentRef: c,
					contentId: (0, p.useId)(),
					titleId: (0, p.useId)(),
					descriptionId: (0, p.useId)(),
					open: d,
					onOpenChange: f,
					onOpenToggle: u.useCallback(() => f((e) => !e), [f]),
					modal: a,
					children: n,
				});
			};
		eE.displayName = eg;
		var eC = "DialogTrigger",
			eR = u.forwardRef((e, t) => {
				const { __scopeDialog: n, ...r } = e,
					o = eb(eC, n),
					i = (0, d.useComposedRefs)(t, o.triggerRef);
				return (0, s.jsx)(w.Primitive.button, {
					type: "button",
					"aria-haspopup": "dialog",
					"aria-expanded": o.open,
					"aria-controls": o.open ? o.contentId : void 0,
					"data-state": eU(o.open),
					...r,
					ref: i,
					onClick: (0, c.composeEventHandlers)(e.onClick, o.onOpenToggle),
				});
			});
		eR.displayName = eC;
		var eS = "DialogPortal",
			[eP, ej] = ey(eS, { forceMount: void 0 }),
			eN = (e) => {
				const {
						__scopeDialog: t,
						forceMount: n,
						children: r,
						container: o,
					} = e,
					i = eb(eS, t);
				return (0, s.jsx)(eP, {
					scope: t,
					forceMount: n,
					children: u.Children.map(r, (e) =>
						(0, s.jsx)(y.Presence, {
							present: n || i.open,
							children: (0, s.jsx)(g.Portal, {
								asChild: !0,
								container: o,
								children: e,
							}),
						}),
					),
				});
			};
		eN.displayName = eS;
		var ek = "DialogOverlay",
			eA = u.forwardRef((e, t) => {
				const n = ej(ek, e.__scopeDialog),
					{ forceMount: r = n.forceMount, ...o } = e,
					i = eb(ek, e.__scopeDialog);
				return i.modal
					? (0, s.jsx)(y.Presence, {
							present: r || i.open,
							children: (0, s.jsx)(eD, { ...o, ref: t }),
						})
					: null;
			});
		eA.displayName = ek;
		var eT = (0, ev.createSlot)("DialogOverlay.RemoveScroll"),
			eD = u.forwardRef((e, t) => {
				const { __scopeDialog: n, ...r } = e,
					o = eb(ek, n),
					i = (0, h.useDismissableLayerSurface)(),
					a = (0, d.useComposedRefs)(t, i);
				return (0, s.jsx)(es, {
					as: eT,
					allowPinchZoom: !0,
					shards: [o.contentRef],
					children: (0, s.jsx)(w.Primitive.div, {
						"data-state": eU(o.open),
						...r,
						ref: a,
						style: { pointerEvents: "auto", ...r.style },
					}),
				});
			}),
			eO = "DialogContent",
			eL = u.forwardRef((e, t) => {
				const n = ej(eO, e.__scopeDialog),
					{ forceMount: r = n.forceMount, ...o } = e,
					i = eb(eO, e.__scopeDialog);
				return (0, s.jsx)(y.Presence, {
					present: r || i.open,
					children: i.modal
						? (0, s.jsx)(eM, { ...o, ref: t })
						: (0, s.jsx)(eI, { ...o, ref: t }),
				});
			});
		eL.displayName = eO;
		var eM = u.forwardRef((e, t) => {
				const n = eb(eO, e.__scopeDialog),
					r = u.useRef(null),
					o = (0, d.useComposedRefs)(t, n.contentRef, r);
				return (
					u.useEffect(() => {
						const e = r.current;
						if (e) return eh(e);
					}, []),
					(0, s.jsx)(eF, {
						...e,
						ref: o,
						trapFocus: n.open,
						disableOutsidePointerEvents: n.open,
						onCloseAutoFocus: (0, c.composeEventHandlers)(
							e.onCloseAutoFocus,
							(e) => {
								e.preventDefault(), n.triggerRef.current?.focus();
							},
						),
						onPointerDownOutside: (0, c.composeEventHandlers)(
							e.onPointerDownOutside,
							(e) => {
								const t = e.detail.originalEvent,
									n = 0 === t.button && !0 === t.ctrlKey;
								(2 === t.button || n) && e.preventDefault();
							},
						),
						onFocusOutside: (0, c.composeEventHandlers)(e.onFocusOutside, (e) =>
							e.preventDefault(),
						),
					})
				);
			}),
			eI = u.forwardRef((e, t) => {
				const n = eb(eO, e.__scopeDialog),
					r = u.useRef(!1),
					o = u.useRef(!1);
				return (0, s.jsx)(eF, {
					...e,
					ref: t,
					trapFocus: !1,
					disableOutsidePointerEvents: !1,
					onCloseAutoFocus: (t) => {
						e.onCloseAutoFocus?.(t),
							t.defaultPrevented ||
								(r.current || n.triggerRef.current?.focus(),
								t.preventDefault()),
							(r.current = !1),
							(o.current = !1);
					},
					onInteractOutside: (t) => {
						e.onInteractOutside?.(t),
							t.defaultPrevented ||
								((r.current = !0),
								"pointerdown" === t.detail.originalEvent.type &&
									(o.current = !0));
						const i = t.target;
						n.triggerRef.current?.contains(i) && t.preventDefault(),
							"focusin" === t.detail.originalEvent.type &&
								o.current &&
								t.preventDefault();
					},
				});
			}),
			eF = u.forwardRef((e, t) => {
				const {
						__scopeDialog: n,
						trapFocus: r,
						onOpenAutoFocus: o,
						onCloseAutoFocus: i,
						...a
					} = e,
					l = eb(eO, n);
				return (
					E(),
					(0, s.jsx)(s.Fragment, {
						children: (0, s.jsx)(v.FocusScope, {
							asChild: !0,
							loop: !0,
							trapped: r,
							onMountAutoFocus: o,
							onUnmountAutoFocus: i,
							children: (0, s.jsx)(h.DismissableLayer, {
								role: "dialog",
								id: l.contentId,
								"aria-describedby": l.descriptionId,
								"aria-labelledby": l.titleId,
								"data-state": eU(l.open),
								...a,
								ref: t,
								deferPointerDownOutside: !0,
								onDismiss: () => l.onOpenChange(!1),
							}),
						}),
					})
				);
			}),
			eH = "DialogTitle",
			e_ = u.forwardRef((e, t) => {
				const { __scopeDialog: n, ...r } = e,
					o = eb(eH, n);
				return (0, s.jsx)(w.Primitive.h2, { id: o.titleId, ...r, ref: t });
			});
		e_.displayName = eH;
		var eW = "DialogDescription",
			ez = u.forwardRef((e, t) => {
				const { __scopeDialog: n, ...r } = e,
					o = eb(eW, n);
				return (0, s.jsx)(w.Primitive.p, { id: o.descriptionId, ...r, ref: t });
			});
		ez.displayName = eW;
		var eB = "DialogClose",
			eV = u.forwardRef((e, t) => {
				const { __scopeDialog: n, ...r } = e,
					o = eb(eB, n);
				return (0, s.jsx)(w.Primitive.button, {
					type: "button",
					...r,
					ref: t,
					onClick: (0, c.composeEventHandlers)(e.onClick, () =>
						o.onOpenChange(!1),
					),
				});
			});
		function eU(e) {
			return e ? "open" : "closed";
		}
		(eV.displayName = eB),
			e.s(
				[
					"Close",
					0,
					eV,
					"Content",
					0,
					eL,
					"Description",
					0,
					ez,
					"Overlay",
					0,
					eA,
					"Portal",
					0,
					eN,
					"Root",
					0,
					eE,
					"Title",
					0,
					e_,
					"Trigger",
					0,
					eR,
				],
				63366,
			);
		var eK = e.i(69708),
			e$ = e.i(49696);
		function eY({ ...e }) {
			return (0, s.jsx)(eN, { "data-slot": "dialog-portal", ...e });
		}
		function eX({ className: e, ...t }) {
			return (0, s.jsx)(eA, {
				"data-slot": "dialog-overlay",
				className: (0, e$.cn)(
					"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80",
					e,
				),
				...t,
			});
		}
		e.s(
			[
				"Dialog",
				0,
				function ({ ...e }) {
					return (0, s.jsx)(eE, { "data-slot": "dialog", ...e });
				},
				"DialogContent",
				0,
				function ({ className: e, children: t, ...n }) {
					return (0, s.jsxs)(eY, {
						"data-slot": "dialog-portal",
						children: [
							(0, s.jsx)(eX, {}),
							(0, s.jsxs)(eL, {
								"data-slot": "dialog-content",
								className: (0, e$.cn)(
									"fixed left-[50%] top-[50%] z-50 grid max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg w-11/12",
									e,
								),
								...n,
								children: [
									t,
									(0, s.jsxs)(eV, {
										className:
											"ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
										children: [
											(0, s.jsx)(eK.XIcon, {}),
											(0, s.jsx)("span", {
												className: "sr-only",
												children: "Close",
											}),
										],
									}),
								],
							}),
						],
					});
				},
				"DialogDescription",
				0,
				function ({ className: e, ...t }) {
					return (0, s.jsx)(ez, {
						"data-slot": "dialog-description",
						className: (0, e$.cn)("text-muted-foreground text-sm", e),
						...t,
					});
				},
				"DialogFooter",
				0,
				function ({ className: e, ...t }) {
					return (0, s.jsx)("div", {
						"data-slot": "dialog-footer",
						className: (0, e$.cn)(
							"flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
							e,
						),
						...t,
					});
				},
				"DialogHeader",
				0,
				function ({ className: e, ...t }) {
					return (0, s.jsx)("div", {
						"data-slot": "dialog-header",
						className: (0, e$.cn)(
							"flex flex-col gap-2 text-center sm:text-left",
							e,
						),
						...t,
					});
				},
				"DialogTitle",
				0,
				function ({ className: e, ...t }) {
					return (0, s.jsx)(e_, {
						"data-slot": "dialog-title",
						className: (0, e$.cn)("text-lg leading-none font-semibold", e),
						...t,
					});
				},
				"DialogTrigger",
				0,
				function ({ ...e }) {
					return (0, s.jsx)(eR, { "data-slot": "dialog-trigger", ...e });
				},
			],
			16066,
		);
	},
	82976,
	(e) => {
		"use strict";
		let t;
		var n = e.i(57319);
		const r = ["top", "right", "bottom", "left"],
			o = Math.min,
			i = Math.max,
			a = Math.round,
			l = Math.floor,
			s = (e) => ({ x: e, y: e }),
			u = { left: "right", right: "left", bottom: "top", top: "bottom" };
		function c(e, t) {
			return "function" == typeof e ? e(t) : e;
		}
		function d(e) {
			return e.split("-")[0];
		}
		function f(e) {
			return e.split("-")[1];
		}
		function p(e) {
			return "x" === e ? "y" : "x";
		}
		function m(e) {
			return "y" === e ? "height" : "width";
		}
		function h(e) {
			const t = e[0];
			return "t" === t || "b" === t ? "y" : "x";
		}
		function v(e) {
			return e.includes("start")
				? e.replace("start", "end")
				: e.replace("end", "start");
		}
		const g = ["left", "right"],
			y = ["right", "left"],
			w = ["top", "bottom"],
			x = ["bottom", "top"];
		function b(e) {
			const t = d(e);
			return u[t] + e.slice(t.length);
		}
		function E(e) {
			return "number" != typeof e
				? { top: 0, right: 0, bottom: 0, left: 0, ...e }
				: { top: e, right: e, bottom: e, left: e };
		}
		function C(e) {
			const { x: t, y: n, width: r, height: o } = e;
			return {
				width: r,
				height: o,
				top: n,
				left: t,
				right: t + r,
				bottom: n + o,
				x: t,
				y: n,
			};
		}
		function R(e, t, n) {
			let r,
				{ reference: o, floating: i } = e,
				a = h(t),
				l = p(h(t)),
				s = m(l),
				u = d(t),
				c = "y" === a,
				v = o.x + o.width / 2 - i.width / 2,
				g = o.y + o.height / 2 - i.height / 2,
				y = o[s] / 2 - i[s] / 2;
			switch (u) {
				case "top":
					r = { x: v, y: o.y - i.height };
					break;
				case "bottom":
					r = { x: v, y: o.y + o.height };
					break;
				case "right":
					r = { x: o.x + o.width, y: g };
					break;
				case "left":
					r = { x: o.x - i.width, y: g };
					break;
				default:
					r = { x: o.x, y: o.y };
			}
			switch (f(t)) {
				case "start":
					r[l] -= y * (n && c ? -1 : 1);
					break;
				case "end":
					r[l] += y * (n && c ? -1 : 1);
			}
			return r;
		}
		async function S(e, t) {
			var n;
			void 0 === t && (t = {});
			const { x: r, y: o, platform: i, rects: a, elements: l, strategy: s } = e,
				{
					boundary: u = "clippingAncestors",
					rootBoundary: d = "viewport",
					elementContext: f = "floating",
					altBoundary: p = !1,
					padding: m = 0,
				} = c(t, e),
				h = E(m),
				v = l[p ? ("floating" === f ? "reference" : "floating") : f],
				g = C(
					await i.getClippingRect({
						element:
							null ==
								(n = await (null == i.isElement ? void 0 : i.isElement(v))) || n
								? v
								: v.contextElement ||
									(await (null == i.getDocumentElement
										? void 0
										: i.getDocumentElement(l.floating))),
						boundary: u,
						rootBoundary: d,
						strategy: s,
					}),
				),
				y =
					"floating" === f
						? { x: r, y: o, width: a.floating.width, height: a.floating.height }
						: a.reference,
				w = await (null == i.getOffsetParent
					? void 0
					: i.getOffsetParent(l.floating)),
				x = ((await (null == i.isElement ? void 0 : i.isElement(w))) &&
					(await (null == i.getScale ? void 0 : i.getScale(w)))) || {
					x: 1,
					y: 1,
				},
				b = C(
					i.convertOffsetParentRelativeRectToViewportRelativeRect
						? await i.convertOffsetParentRelativeRectToViewportRelativeRect({
								elements: l,
								rect: y,
								offsetParent: w,
								strategy: s,
							})
						: y,
				);
			return {
				top: (g.top - b.top + h.top) / x.y,
				bottom: (b.bottom - g.bottom + h.bottom) / x.y,
				left: (g.left - b.left + h.left) / x.x,
				right: (b.right - g.right + h.right) / x.x,
			};
		}
		const P = async (e, t, n) => {
			let {
					placement: r = "bottom",
					strategy: o = "absolute",
					middleware: i = [],
					platform: a,
				} = n,
				l = a.detectOverflow ? a : { ...a, detectOverflow: S },
				s = await (null == a.isRTL ? void 0 : a.isRTL(t)),
				u = await a.getElementRects({ reference: e, floating: t, strategy: o }),
				{ x: c, y: d } = R(u, r, s),
				f = r,
				p = 0,
				m = {};
			for (let n = 0; n < i.length; n++) {
				const h = i[n];
				if (!h) continue;
				const { name: v, fn: g } = h,
					{
						x: y,
						y: w,
						data: x,
						reset: b,
					} = await g({
						x: c,
						y: d,
						initialPlacement: r,
						placement: f,
						strategy: o,
						middlewareData: m,
						rects: u,
						platform: l,
						elements: { reference: e, floating: t },
					});
				(c = null != y ? y : c),
					(d = null != w ? w : d),
					(m[v] = { ...m[v], ...x }),
					b &&
						p < 50 &&
						(p++,
						"object" == typeof b &&
							(b.placement && (f = b.placement),
							b.rects &&
								(u =
									!0 === b.rects
										? await a.getElementRects({
												reference: e,
												floating: t,
												strategy: o,
											})
										: b.rects),
							({ x: c, y: d } = R(u, f, s))),
						(n = -1));
			}
			return { x: c, y: d, placement: f, strategy: o, middlewareData: m };
		};
		function j(e, t) {
			return {
				top: e.top - t.height,
				right: e.right - t.width,
				bottom: e.bottom - t.height,
				left: e.left - t.width,
			};
		}
		function N(e) {
			return r.some((t) => e[t] >= 0);
		}
		const k = new Set(["left", "top"]);
		async function A(e, t) {
			let { placement: n, platform: r, elements: o } = e,
				i = await (null == r.isRTL ? void 0 : r.isRTL(o.floating)),
				a = d(n),
				l = f(n),
				s = "y" === h(n),
				u = k.has(a) ? -1 : 1,
				p = i && s ? -1 : 1,
				m = c(t, e),
				{
					mainAxis: v,
					crossAxis: g,
					alignmentAxis: y,
				} = "number" == typeof m
					? { mainAxis: m, crossAxis: 0, alignmentAxis: null }
					: {
							mainAxis: m.mainAxis || 0,
							crossAxis: m.crossAxis || 0,
							alignmentAxis: m.alignmentAxis,
						};
			return (
				l && "number" == typeof y && (g = "end" === l ? -1 * y : y),
				s ? { x: g * p, y: v * u } : { x: v * u, y: g * p }
			);
		}
		function T() {
			return "u" > typeof window;
		}
		function D(e) {
			return M(e) ? (e.nodeName || "").toLowerCase() : "#document";
		}
		function O(e) {
			var t;
			return (
				(null == e || null == (t = e.ownerDocument) ? void 0 : t.defaultView) ||
				window
			);
		}
		function L(e) {
			var t;
			return null ==
				(t = (M(e) ? e.ownerDocument : e.document) || window.document)
				? void 0
				: t.documentElement;
		}
		function M(e) {
			return !!T() && (e instanceof Node || e instanceof O(e).Node);
		}
		function I(e) {
			return !!T() && (e instanceof Element || e instanceof O(e).Element);
		}
		function F(e) {
			return (
				!!T() && (e instanceof HTMLElement || e instanceof O(e).HTMLElement)
			);
		}
		function H(e) {
			return (
				!(!T() || "u" < typeof ShadowRoot) &&
				(e instanceof ShadowRoot || e instanceof O(e).ShadowRoot)
			);
		}
		function _(e) {
			const { overflow: t, overflowX: n, overflowY: r, display: o } = Y(e);
			return (
				/auto|scroll|overlay|hidden|clip/.test(t + r + n) &&
				"inline" !== o &&
				"contents" !== o
			);
		}
		function W(e) {
			try {
				if (e.matches(":popover-open")) return !0;
			} catch (e) {}
			try {
				return e.matches(":modal");
			} catch (e) {
				return !1;
			}
		}
		const z = /transform|translate|scale|rotate|perspective|filter/,
			B = /paint|layout|strict|content/,
			V = (e) => !!e && "none" !== e;
		function U(e) {
			const t = I(e) ? Y(e) : e;
			return (
				V(t.transform) ||
				V(t.translate) ||
				V(t.scale) ||
				V(t.rotate) ||
				V(t.perspective) ||
				(!K() && (V(t.backdropFilter) || V(t.filter))) ||
				z.test(t.willChange || "") ||
				B.test(t.contain || "")
			);
		}
		function K() {
			return (
				null == t &&
					(t =
						"u" > typeof CSS &&
						CSS.supports &&
						CSS.supports("-webkit-backdrop-filter", "none")),
				t
			);
		}
		function $(e) {
			return /^(html|body|#document)$/.test(D(e));
		}
		function Y(e) {
			return O(e).getComputedStyle(e);
		}
		function X(e) {
			return I(e)
				? { scrollLeft: e.scrollLeft, scrollTop: e.scrollTop }
				: { scrollLeft: e.scrollX, scrollTop: e.scrollY };
		}
		function q(e) {
			if ("html" === D(e)) return e;
			const t = e.assignedSlot || e.parentNode || (H(e) && e.host) || L(e);
			return H(t) ? t.host : t;
		}
		function Z(e, t, n) {
			var r;
			void 0 === t && (t = []), void 0 === n && (n = !0);
			const o = (function e(t) {
					const n = q(t);
					return $(n)
						? t.ownerDocument
							? t.ownerDocument.body
							: t.body
						: F(n) && _(n)
							? n
							: e(n);
				})(e),
				i = o === (null == (r = e.ownerDocument) ? void 0 : r.body),
				a = O(o);
			if (!i) return t.concat(o, Z(o, [], n));
			{
				const e = G(a);
				return t.concat(
					a,
					a.visualViewport || [],
					_(o) ? o : [],
					e && n ? Z(e) : [],
				);
			}
		}
		function G(e) {
			return e.parent && Object.getPrototypeOf(e.parent)
				? e.frameElement
				: null;
		}
		function J(e) {
			let t = Y(e),
				n = parseFloat(t.width) || 0,
				r = parseFloat(t.height) || 0,
				o = F(e),
				i = o ? e.offsetWidth : n,
				l = o ? e.offsetHeight : r,
				s = a(n) !== i || a(r) !== l;
			return s && ((n = i), (r = l)), { width: n, height: r, $: s };
		}
		function Q(e) {
			return I(e) ? e : e.contextElement;
		}
		function ee(e) {
			const t = Q(e);
			if (!F(t)) return s(1);
			let n = t.getBoundingClientRect(),
				{ width: r, height: o, $: i } = J(t),
				l = (i ? a(n.width) : n.width) / r,
				u = (i ? a(n.height) : n.height) / o;
			return (
				(l && Number.isFinite(l)) || (l = 1),
				(u && Number.isFinite(u)) || (u = 1),
				{ x: l, y: u }
			);
		}
		const et = s(0);
		function en(e) {
			const t = O(e);
			return K() && t.visualViewport
				? { x: t.visualViewport.offsetLeft, y: t.visualViewport.offsetTop }
				: et;
		}
		function er(e, t, n, r) {
			var o;
			void 0 === t && (t = !1), void 0 === n && (n = !1);
			let i = e.getBoundingClientRect(),
				a = Q(e),
				l = s(1);
			t && (r ? I(r) && (l = ee(r)) : (l = ee(e)));
			let u = (void 0 === (o = n) && (o = !1), r && (!o || r === O(a)) && o)
					? en(a)
					: s(0),
				c = (i.left + u.x) / l.x,
				d = (i.top + u.y) / l.y,
				f = i.width / l.x,
				p = i.height / l.y;
			if (a) {
				let e = O(a),
					t = r && I(r) ? O(r) : r,
					n = e,
					o = G(n);
				for (; o && r && t !== n; ) {
					const e = ee(o),
						t = o.getBoundingClientRect(),
						r = Y(o),
						i = t.left + (o.clientLeft + parseFloat(r.paddingLeft)) * e.x,
						a = t.top + (o.clientTop + parseFloat(r.paddingTop)) * e.y;
					(c *= e.x),
						(d *= e.y),
						(f *= e.x),
						(p *= e.y),
						(c += i),
						(d += a),
						(o = G((n = O(o))));
				}
			}
			return C({ width: f, height: p, x: c, y: d });
		}
		function eo(e, t) {
			const n = X(e).scrollLeft;
			return t ? t.left + n : er(L(e)).left + n;
		}
		function ei(e, t) {
			const n = e.getBoundingClientRect();
			return { x: n.left + t.scrollLeft - eo(e, n), y: n.top + t.scrollTop };
		}
		function ea(e, t, n) {
			var r;
			let o;
			if ("viewport" === t)
				o = (function (e, t) {
					let n = O(e),
						r = L(e),
						o = n.visualViewport,
						i = r.clientWidth,
						a = r.clientHeight,
						l = 0,
						s = 0;
					if (o) {
						(i = o.width), (a = o.height);
						const e = K();
						(!e || (e && "fixed" === t)) &&
							((l = o.offsetLeft), (s = o.offsetTop));
					}
					const u = eo(r);
					if (u <= 0) {
						const e = r.ownerDocument,
							t = e.body,
							n = getComputedStyle(t),
							o =
								("CSS1Compat" === e.compatMode &&
									parseFloat(n.marginLeft) + parseFloat(n.marginRight)) ||
								0,
							a = Math.abs(r.clientWidth - t.clientWidth - o);
						a <= 25 && (i -= a);
					} else u <= 25 && (i += u);
					return { width: i, height: a, x: l, y: s };
				})(e, n);
			else if ("document" === t) {
				let t, n, a, l, s, u, c;
				(r = L(e)),
					(t = L(r)),
					(n = X(r)),
					(a = r.ownerDocument.body),
					(l = i(t.scrollWidth, t.clientWidth, a.scrollWidth, a.clientWidth)),
					(s = i(
						t.scrollHeight,
						t.clientHeight,
						a.scrollHeight,
						a.clientHeight,
					)),
					(u = -n.scrollLeft + eo(r)),
					(c = -n.scrollTop),
					"rtl" === Y(a).direction &&
						(u += i(t.clientWidth, a.clientWidth) - l),
					(o = { width: l, height: s, x: u, y: c });
			} else if (I(t)) {
				let e, r, i, a, l, u;
				(r = (e = er(t, !0, "fixed" === n)).top + t.clientTop),
					(i = e.left + t.clientLeft),
					(a = F(t) ? ee(t) : s(1)),
					(l = t.clientWidth * a.x),
					(u = t.clientHeight * a.y),
					(o = { width: l, height: u, x: i * a.x, y: r * a.y });
			} else {
				const n = en(e);
				o = { x: t.x - n.x, y: t.y - n.y, width: t.width, height: t.height };
			}
			return C(o);
		}
		function el(e) {
			return "static" === Y(e).position;
		}
		function es(e, t) {
			if (!F(e) || "fixed" === Y(e).position) return null;
			if (t) return t(e);
			let n = e.offsetParent;
			return L(e) === n && (n = n.ownerDocument.body), n;
		}
		function eu(e, t) {
			var n;
			const r = O(e);
			if (W(e)) return r;
			if (!F(e)) {
				let t = q(e);
				for (; t && !$(t); ) {
					if (I(t) && !el(t)) return t;
					t = q(t);
				}
				return r;
			}
			let o = es(e, t);
			for (; o && ((n = o), /^(table|td|th)$/.test(D(n))) && el(o); )
				o = es(o, t);
			return o && $(o) && el(o) && !U(o)
				? r
				: o ||
						(function (e) {
							let t = q(e);
							for (; F(t) && !$(t); ) {
								if (U(t)) return t;
								if (W(t)) break;
								t = q(t);
							}
							return null;
						})(e) ||
						r;
		}
		const ec = async function (e) {
				const t = this.getOffsetParent || eu,
					n = this.getDimensions,
					r = await n(e.floating);
				return {
					reference: (function (e, t, n) {
						let r = F(t),
							o = L(t),
							i = "fixed" === n,
							a = er(e, !0, i, t),
							l = { scrollLeft: 0, scrollTop: 0 },
							u = s(0);
						if (r || (!r && !i))
							if ((("body" !== D(t) || _(o)) && (l = X(t)), r)) {
								const e = er(t, !0, i, t);
								(u.x = e.x + t.clientLeft), (u.y = e.y + t.clientTop);
							} else o && (u.x = eo(o));
						i && !r && o && (u.x = eo(o));
						const c = !o || r || i ? s(0) : ei(o, l);
						return {
							x: a.left + l.scrollLeft - u.x - c.x,
							y: a.top + l.scrollTop - u.y - c.y,
							width: a.width,
							height: a.height,
						};
					})(e.reference, await t(e.floating), e.strategy),
					floating: { x: 0, y: 0, width: r.width, height: r.height },
				};
			},
			ed = {
				convertOffsetParentRelativeRectToViewportRelativeRect: function (e) {
					const { elements: t, rect: n, offsetParent: r, strategy: o } = e,
						i = "fixed" === o,
						a = L(r),
						l = !!t && W(t.floating);
					if (r === a || (l && i)) return n;
					let u = { scrollLeft: 0, scrollTop: 0 },
						c = s(1),
						d = s(0),
						f = F(r);
					if (
						(f || (!f && !i)) &&
						(("body" !== D(r) || _(a)) && (u = X(r)), f)
					) {
						const e = er(r);
						(c = ee(r)), (d.x = e.x + r.clientLeft), (d.y = e.y + r.clientTop);
					}
					const p = !a || f || i ? s(0) : ei(a, u);
					return {
						width: n.width * c.x,
						height: n.height * c.y,
						x: n.x * c.x - u.scrollLeft * c.x + d.x + p.x,
						y: n.y * c.y - u.scrollTop * c.y + d.y + p.y,
					};
				},
				getDocumentElement: L,
				getClippingRect: function (e) {
					let { element: t, boundary: n, rootBoundary: r, strategy: a } = e,
						l = [
							...("clippingAncestors" === n
								? W(t)
									? []
									: (function (e, t) {
											const n = t.get(e);
											if (n) return n;
											let r = Z(e, [], !1).filter(
													(e) => I(e) && "body" !== D(e),
												),
												o = null,
												i = "fixed" === Y(e).position,
												a = i ? q(e) : e;
											for (; I(a) && !$(a); ) {
												const t = Y(a),
													n = U(a);
												n || "fixed" !== t.position || (o = null),
													(
														i
															? n || o
															: !(
																	(!n &&
																		"static" === t.position &&
																		o &&
																		("absolute" === o.position ||
																			"fixed" === o.position)) ||
																	(_(a) &&
																		!n &&
																		(function e(t, n) {
																			const r = q(t);
																			return (
																				!(r === n || !I(r) || $(r)) &&
																				("fixed" === Y(r).position || e(r, n))
																			);
																		})(e, a))
																)
													)
														? (o = t)
														: (r = r.filter((e) => e !== a)),
													(a = q(a));
											}
											return t.set(e, r), r;
										})(t, this._c)
								: [].concat(n)),
							r,
						],
						s = ea(t, l[0], a),
						u = s.top,
						c = s.right,
						d = s.bottom,
						f = s.left;
					for (let e = 1; e < l.length; e++) {
						const n = ea(t, l[e], a);
						(u = i(n.top, u)),
							(c = o(n.right, c)),
							(d = o(n.bottom, d)),
							(f = i(n.left, f));
					}
					return { width: c - f, height: d - u, x: f, y: u };
				},
				getOffsetParent: eu,
				getElementRects: ec,
				getClientRects: function (e) {
					return Array.from(e.getClientRects());
				},
				getDimensions: function (e) {
					const { width: t, height: n } = J(e);
					return { width: t, height: n };
				},
				getScale: ee,
				isElement: I,
				isRTL: function (e) {
					return "rtl" === Y(e).direction;
				},
			};
		function ef(e, t) {
			return (
				e.x === t.x &&
				e.y === t.y &&
				e.width === t.width &&
				e.height === t.height
			);
		}
		const ep = (e) => ({
			name: "arrow",
			options: e,
			async fn(t) {
				const {
						x: n,
						y: r,
						placement: a,
						rects: l,
						platform: s,
						elements: u,
						middlewareData: d,
					} = t,
					{ element: v, padding: g = 0 } = c(e, t) || {};
				if (null == v) return {};
				let y = E(g),
					w = { x: n, y: r },
					x = p(h(a)),
					b = m(x),
					C = await s.getDimensions(v),
					R = "y" === x,
					S = R ? "clientHeight" : "clientWidth",
					P = l.reference[b] + l.reference[x] - w[x] - l.floating[b],
					j = w[x] - l.reference[x],
					N = await (null == s.getOffsetParent ? void 0 : s.getOffsetParent(v)),
					k = N ? N[S] : 0;
				(k && (await (null == s.isElement ? void 0 : s.isElement(N)))) ||
					(k = u.floating[S] || l.floating[b]);
				const A = k / 2 - C[b] / 2 - 1,
					T = o(y[R ? "top" : "left"], A),
					D = o(y[R ? "bottom" : "right"], A),
					O = k - C[b] - D,
					L = k / 2 - C[b] / 2 + (P / 2 - j / 2),
					M = i(T, o(L, O)),
					I =
						!d.arrow &&
						null != f(a) &&
						L !== M &&
						l.reference[b] / 2 - (L < T ? T : D) - C[b] / 2 < 0,
					F = I ? (L < T ? L - T : L - O) : 0;
				return {
					[x]: w[x] + F,
					data: {
						[x]: M,
						centerOffset: L - M - F,
						...(I && { alignmentOffset: F }),
					},
					reset: I,
				};
			},
		});
		var em = e.i(86460),
			eh = "u" > typeof document ? n.useLayoutEffect : function () {};
		function ev(e, t) {
			let n, r, o;
			if (e === t) return !0;
			if (typeof e != typeof t) return !1;
			if ("function" == typeof e && e.toString() === t.toString()) return !0;
			if (e && t && "object" == typeof e) {
				if (Array.isArray(e)) {
					if ((n = e.length) !== t.length) return !1;
					for (r = n; 0 != r--; ) if (!ev(e[r], t[r])) return !1;
					return !0;
				}
				if ((n = (o = Object.keys(e)).length) !== Object.keys(t).length)
					return !1;
				for (r = n; 0 != r--; ) if (!{}.hasOwnProperty.call(t, o[r])) return !1;
				for (r = n; 0 != r--; ) {
					const n = o[r];
					if (("_owner" !== n || !e.$$typeof) && !ev(e[n], t[n])) return !1;
				}
				return !0;
			}
			return e != e && t != t;
		}
		function eg(e) {
			return "u" < typeof window
				? 1
				: (e.ownerDocument.defaultView || window).devicePixelRatio || 1;
		}
		function ey(e, t) {
			const n = eg(e);
			return Math.round(t * n) / n;
		}
		function ew(e) {
			const t = n.useRef(e);
			return (
				eh(() => {
					t.current = e;
				}),
				t
			);
		}
		var ex = e.i(33833),
			eb = e.i(62613),
			eE = n.forwardRef((e, t) => {
				const { children: n, width: r = 10, height: o = 5, ...i } = e;
				return (0, eb.jsx)(ex.Primitive.svg, {
					...i,
					ref: t,
					width: r,
					height: o,
					viewBox: "0 0 30 10",
					preserveAspectRatio: "none",
					children: e.asChild
						? n
						: (0, eb.jsx)("polygon", { points: "0,0 30,0 15,10" }),
				});
			});
		eE.displayName = "Arrow";
		var eC = e.i(67714),
			eR = e.i(15246),
			eS = e.i(9964),
			eP = e.i(13575),
			ej = e.i(65221),
			eN = "Popper",
			[ek, eA] = (0, eR.createContextScope)(eN),
			[eT, eD] = ek(eN),
			eO = (e) => {
				const { __scopePopper: t, children: r } = e,
					[o, i] = n.useState(null),
					[a, l] = n.useState(void 0);
				return (0, eb.jsx)(eT, {
					scope: t,
					anchor: o,
					onAnchorChange: i,
					placementState: a,
					setPlacementState: l,
					children: r,
				});
			};
		eO.displayName = eN;
		var eL = "PopperAnchor",
			eM = n.forwardRef((e, t) => {
				const { __scopePopper: r, virtualRef: o, ...i } = e,
					a = eD(eL, r),
					l = n.useRef(null),
					s = a.onAnchorChange,
					u = n.useCallback(
						(e) => {
							(l.current = e), e && s(e);
						},
						[s],
					),
					c = (0, eC.useComposedRefs)(t, u),
					d = n.useRef(null);
				n.useEffect(() => {
					if (!o) return;
					const e = d.current;
					(d.current = o.current), e !== d.current && s(d.current);
				});
				const f = a.placementState && eK(a.placementState),
					p = f?.[0],
					m = f?.[1];
				return o
					? null
					: (0, eb.jsx)(ex.Primitive.div, {
							"data-radix-popper-side": p,
							"data-radix-popper-align": m,
							...i,
							ref: c,
						});
			});
		eM.displayName = eL;
		var eI = "PopperContent",
			[eF, eH] = ek(eI),
			e_ = n.forwardRef((e, t) => {
				var r, a, s, u, E, C, R, S, T, D, O, M, I, F, H, _, W, z, B, V, U;
				let K,
					$,
					Y,
					X,
					q,
					G,
					{
						__scopePopper: J,
						side: ee = "bottom",
						sideOffset: et = 0,
						align: en = "center",
						alignOffset: eo = 0,
						arrowPadding: ei = 0,
						avoidCollisions: ea = !0,
						collisionBoundary: el = [],
						collisionPadding: es = 0,
						sticky: eu = "partial",
						hideWhenDetached: ec = !1,
						updatePositionStrategy: eE = "optimized",
						onPlaced: eR,
						...eN
					} = e,
					ek = eD(eI, J),
					[eA, eT] = n.useState(null),
					eO = (0, eC.useComposedRefs)(t, (e) => eT(e)),
					[eL, eM] = n.useState(null),
					eH = (0, ej.useSize)(eL),
					e_ = eH?.width ?? 0,
					eW = eH?.height ?? 0,
					ez =
						"number" == typeof es
							? es
							: { top: 0, right: 0, bottom: 0, left: 0, ...es },
					eB = Array.isArray(el) ? el : [el],
					e$ = eB.length > 0,
					eY = { padding: ez, boundary: eB.filter(eV), altBoundary: e$ },
					{
						refs: eX,
						floatingStyles: eq,
						placement: eZ,
						isPositioned: eG,
						middlewareData: eJ,
					} = (function (e) {
						void 0 === e && (e = {});
						const {
								placement: t = "bottom",
								strategy: r = "absolute",
								middleware: o = [],
								platform: i,
								elements: { reference: a, floating: l } = {},
								transform: s = !0,
								whileElementsMounted: u,
								open: c,
							} = e,
							[d, f] = n.useState({
								x: 0,
								y: 0,
								strategy: r,
								placement: t,
								middlewareData: {},
								isPositioned: !1,
							}),
							[p, m] = n.useState(o);
						ev(p, o) || m(o);
						const [h, v] = n.useState(null),
							[g, y] = n.useState(null),
							w = n.useCallback((e) => {
								e !== C.current && ((C.current = e), v(e));
							}, []),
							x = n.useCallback((e) => {
								e !== R.current && ((R.current = e), y(e));
							}, []),
							b = a || h,
							E = l || g,
							C = n.useRef(null),
							R = n.useRef(null),
							S = n.useRef(d),
							j = null != u,
							N = ew(u),
							k = ew(i),
							A = ew(c),
							T = n.useCallback(() => {
								var e, n;
								let o, i, a;
								if (!C.current || !R.current) return;
								const l = { placement: t, strategy: r, middleware: p };
								k.current && (l.platform = k.current),
									((e = C.current),
									(n = R.current),
									(o = new Map()),
									(a = { ...(i = { platform: ed, ...l }).platform, _c: o }),
									P(e, n, { ...i, platform: a })).then((e) => {
										const t = { ...e, isPositioned: !1 !== A.current };
										D.current &&
											!ev(S.current, t) &&
											((S.current = t),
											em.flushSync(() => {
												f(t);
											}));
									});
							}, [p, t, r, k, A]);
						eh(() => {
							!1 === c &&
								S.current.isPositioned &&
								((S.current.isPositioned = !1),
								f((e) => ({ ...e, isPositioned: !1 })));
						}, [c]);
						const D = n.useRef(!1);
						eh(
							() => (
								(D.current = !0),
								() => {
									D.current = !1;
								}
							),
							[],
						),
							eh(() => {
								if ((b && (C.current = b), E && (R.current = E), b && E)) {
									if (N.current) return N.current(b, E, T);
									T();
								}
							}, [b, E, T, N, j]);
						const O = n.useMemo(
								() => ({
									reference: C,
									floating: R,
									setReference: w,
									setFloating: x,
								}),
								[w, x],
							),
							L = n.useMemo(() => ({ reference: b, floating: E }), [b, E]),
							M = n.useMemo(() => {
								const e = { position: r, left: 0, top: 0 };
								if (!L.floating) return e;
								const t = ey(L.floating, d.x),
									n = ey(L.floating, d.y);
								return s
									? {
											...e,
											transform: "translate(" + t + "px, " + n + "px)",
											...(eg(L.floating) >= 1.5 && { willChange: "transform" }),
										}
									: { position: r, left: t, top: n };
							}, [r, s, L.floating, d.x, d.y]);
						return n.useMemo(
							() => ({
								...d,
								update: T,
								refs: O,
								elements: L,
								floatingStyles: M,
							}),
							[d, T, O, L, M],
						);
					})({
						strategy: "fixed",
						placement: ee + ("center" !== en ? "-" + en : ""),
						whileElementsMounted: (...e) =>
							(function (e, t, n, r) {
								let a;
								void 0 === r && (r = {});
								const {
										ancestorScroll: s = !0,
										ancestorResize: u = !0,
										elementResize: c = "function" == typeof ResizeObserver,
										layoutShift: d = "function" == typeof IntersectionObserver,
										animationFrame: f = !1,
									} = r,
									p = Q(e),
									m = s || u ? [...(p ? Z(p) : []), ...(t ? Z(t) : [])] : [];
								m.forEach((e) => {
									s && e.addEventListener("scroll", n, { passive: !0 }),
										u && e.addEventListener("resize", n);
								});
								let h =
										p && d
											? (function (e, t) {
													let n,
														r = null,
														a = L(e);
													function s() {
														var e;
														clearTimeout(n),
															null == (e = r) || e.disconnect(),
															(r = null);
													}
													return (
														!(function u(c, d) {
															void 0 === c && (c = !1),
																void 0 === d && (d = 1),
																s();
															const f = e.getBoundingClientRect(),
																{ left: p, top: m, width: h, height: v } = f;
															if ((c || t(), !h || !v)) return;
															let g = {
																	rootMargin:
																		-l(m) +
																		"px " +
																		-l(a.clientWidth - (p + h)) +
																		"px " +
																		-l(a.clientHeight - (m + v)) +
																		"px " +
																		-l(p) +
																		"px",
																	threshold: i(0, o(1, d)) || 1,
																},
																y = !0;
															function w(t) {
																const r = t[0].intersectionRatio;
																if (r !== d) {
																	if (!y) return u();
																	r
																		? u(!1, r)
																		: (n = setTimeout(() => {
																				u(!1, 1e-7);
																			}, 1e3));
																}
																1 !== r ||
																	ef(f, e.getBoundingClientRect()) ||
																	u(),
																	(y = !1);
															}
															try {
																r = new IntersectionObserver(w, {
																	...g,
																	root: a.ownerDocument,
																});
															} catch (e) {
																r = new IntersectionObserver(w, g);
															}
															r.observe(e);
														})(!0),
														s
													);
												})(p, n)
											: null,
									v = -1,
									g = null;
								c &&
									((g = new ResizeObserver((e) => {
										const [r] = e;
										r &&
											r.target === p &&
											g &&
											t &&
											(g.unobserve(t),
											cancelAnimationFrame(v),
											(v = requestAnimationFrame(() => {
												var e;
												null == (e = g) || e.observe(t);
											}))),
											n();
									})),
									p && !f && g.observe(p),
									t && g.observe(t));
								let y = f ? er(e) : null;
								return (
									f &&
										(function t() {
											const r = er(e);
											y && !ef(y, r) && n(),
												(y = r),
												(a = requestAnimationFrame(t));
										})(),
									n(),
									() => {
										var e;
										m.forEach((e) => {
											s && e.removeEventListener("scroll", n),
												u && e.removeEventListener("resize", n);
										}),
											null == h || h(),
											null == (e = g) || e.disconnect(),
											(g = null),
											f && cancelAnimationFrame(a);
									}
								);
							})(...e, { animationFrame: "always" === eE }),
						elements: { reference: ek.anchor },
						middleware: [
							{
								name: (K = {
									name: "offset",
									options: (s = r = { mainAxis: et + eW, alignmentAxis: eo }),
									async fn(e) {
										var t, n;
										const { x: r, y: o, placement: i, middlewareData: a } = e,
											l = await A(e, s);
										return i ===
											(null == (t = a.offset) ? void 0 : t.placement) &&
											null != (n = a.arrow) &&
											n.alignmentOffset
											? {}
											: {
													x: r + l.x,
													y: o + l.y,
													data: { ...l, placement: i },
												};
									},
								}).name,
								fn: K.fn,
								options: [r, a],
							},
							ea && {
								name: ($ = {
									name: "shift",
									options:
										(T = R =
											{
												mainAxis: !0,
												crossAxis: !1,
												limiter:
													"partial" === eu
														? {
																fn: (void 0 === (C = u) && (C = {}),
																{
																	options: C,
																	fn(e) {
																		let {
																				x: t,
																				y: n,
																				placement: r,
																				rects: o,
																				middlewareData: i,
																			} = e,
																			{
																				offset: a = 0,
																				mainAxis: l = !0,
																				crossAxis: s = !0,
																			} = c(C, e),
																			u = { x: t, y: n },
																			f = h(r),
																			m = p(f),
																			v = u[m],
																			g = u[f],
																			y = c(a, e),
																			w =
																				"number" == typeof y
																					? { mainAxis: y, crossAxis: 0 }
																					: { mainAxis: 0, crossAxis: 0, ...y };
																		if (l) {
																			const e = "y" === m ? "height" : "width",
																				t =
																					o.reference[m] -
																					o.floating[e] +
																					w.mainAxis,
																				n =
																					o.reference[m] +
																					o.reference[e] -
																					w.mainAxis;
																			v < t ? (v = t) : v > n && (v = n);
																		}
																		if (s) {
																			var x, b;
																			const e = "y" === m ? "width" : "height",
																				t = k.has(d(r)),
																				n =
																					o.reference[f] -
																					o.floating[e] +
																					((t &&
																						(null == (x = i.offset)
																							? void 0
																							: x[f])) ||
																						0) +
																					(t ? 0 : w.crossAxis),
																				a =
																					o.reference[f] +
																					o.reference[e] +
																					(t
																						? 0
																						: (null == (b = i.offset)
																								? void 0
																								: b[f]) || 0) -
																					(t ? w.crossAxis : 0);
																			g < n ? (g = n) : g > a && (g = a);
																		}
																		return { [m]: v, [f]: g };
																	},
																}).fn,
																options: [u, E],
															}
														: void 0,
												...eY,
											}),
									async fn(e) {
										let { x: t, y: n, placement: r, platform: a } = e,
											{
												mainAxis: l = !0,
												crossAxis: s = !1,
												limiter: u = {
													fn: (e) => {
														const { x: t, y: n } = e;
														return { x: t, y: n };
													},
												},
												...f
											} = c(T, e),
											m = { x: t, y: n },
											v = await a.detectOverflow(e, f),
											g = h(d(r)),
											y = p(g),
											w = m[y],
											x = m[g];
										if (l) {
											const e = "y" === y ? "top" : "left",
												t = "y" === y ? "bottom" : "right",
												n = w + v[e],
												r = w - v[t];
											w = i(n, o(w, r));
										}
										if (s) {
											const e = "y" === g ? "top" : "left",
												t = "y" === g ? "bottom" : "right",
												n = x + v[e],
												r = x - v[t];
											x = i(n, o(x, r));
										}
										const b = u.fn({ ...e, [y]: w, [g]: x });
										return {
											...b,
											data: {
												x: b.x - t,
												y: b.y - n,
												enabled: { [y]: l, [g]: s },
											},
										};
									},
								}).name,
								fn: $.fn,
								options: [R, S],
							},
							ea && {
								name: (Y = {
									name: "flip",
									options: (M = D = { ...eY }),
									async fn(e) {
										var t, n, r, o, i, a, l, s;
										let u,
											E,
											C,
											{
												placement: R,
												middlewareData: S,
												rects: P,
												initialPlacement: j,
												platform: N,
												elements: k,
											} = e,
											{
												mainAxis: A = !0,
												crossAxis: T = !0,
												fallbackPlacements: D,
												fallbackStrategy: O = "bestFit",
												fallbackAxisSideDirection: L = "none",
												flipAlignment: I = !0,
												...F
											} = c(M, e);
										if (null != (t = S.arrow) && t.alignmentOffset) return {};
										const H = d(R),
											_ = h(j),
											W = d(j) === j,
											z = await (null == N.isRTL
												? void 0
												: N.isRTL(k.floating)),
											B =
												D || (W || !I ? [b(j)] : ((u = b(j)), [v(j), u, v(u)])),
											V = "none" !== L;
										!D &&
											V &&
											B.push(
												...((E = f(j)),
												(C = (function (e, t, n) {
													switch (e) {
														case "top":
														case "bottom":
															if (n) return t ? y : g;
															return t ? g : y;
														case "left":
														case "right":
															return t ? w : x;
														default:
															return [];
													}
												})(d(j), "start" === L, z)),
												E &&
													((C = C.map((e) => e + "-" + E)),
													I && (C = C.concat(C.map(v)))),
												C),
											);
										let U = [j, ...B],
											K = await N.detectOverflow(e, F),
											$ = [],
											Y = (null == (n = S.flip) ? void 0 : n.overflows) || [];
										if ((A && $.push(K[H]), T)) {
											let e,
												t,
												n,
												r,
												o =
													((a = R),
													(l = P),
													void 0 === (s = z) && (s = !1),
													(e = f(a)),
													(n = m((t = p(h(a))))),
													(r =
														"x" === t
															? e === (s ? "end" : "start")
																? "right"
																: "left"
															: "start" === e
																? "bottom"
																: "top"),
													l.reference[n] > l.floating[n] && (r = b(r)),
													[r, b(r)]);
											$.push(K[o[0]], K[o[1]]);
										}
										if (
											((Y = [...Y, { placement: R, overflows: $ }]),
											!$.every((e) => e <= 0))
										) {
											const e =
													((null == (r = S.flip) ? void 0 : r.index) || 0) + 1,
												t = U[e];
											if (
												t &&
												("alignment" !== T ||
													_ === h(t) ||
													Y.every(
														(e) => h(e.placement) !== _ || e.overflows[0] > 0,
													))
											)
												return {
													data: { index: e, overflows: Y },
													reset: { placement: t },
												};
											let n =
												null ==
												(o = Y.filter((e) => e.overflows[0] <= 0).sort(
													(e, t) => e.overflows[1] - t.overflows[1],
												)[0])
													? void 0
													: o.placement;
											if (!n)
												switch (O) {
													case "bestFit": {
														const e =
															null ==
															(i = Y.filter((e) => {
																if (V) {
																	const t = h(e.placement);
																	return t === _ || "y" === t;
																}
																return !0;
															})
																.map((e) => [
																	e.placement,
																	e.overflows
																		.filter((e) => e > 0)
																		.reduce((e, t) => e + t, 0),
																])
																.sort((e, t) => e[1] - t[1])[0])
																? void 0
																: i[0];
														e && (n = e);
														break;
													}
													case "initialPlacement":
														n = j;
												}
											if (R !== n) return { reset: { placement: n } };
										}
										return {};
									},
								}).name,
								fn: Y.fn,
								options: [D, O],
							},
							{
								name: (X = {
									name: "size",
									options:
										(H = I =
											{
												...eY,
												apply: ({
													elements: e,
													rects: t,
													availableWidth: n,
													availableHeight: r,
												}) => {
													const { width: o, height: i } = t.reference,
														a = e.floating.style;
													a.setProperty(
														"--radix-popper-available-width",
														`${n}px`,
													),
														a.setProperty(
															"--radix-popper-available-height",
															`${r}px`,
														),
														a.setProperty(
															"--radix-popper-anchor-width",
															`${o}px`,
														),
														a.setProperty(
															"--radix-popper-anchor-height",
															`${i}px`,
														);
												},
											}),
									async fn(e) {
										var t, n;
										let r,
											a,
											{ placement: l, rects: s, platform: u, elements: p } = e,
											{ apply: m = () => {}, ...v } = c(H, e),
											g = await u.detectOverflow(e, v),
											y = d(l),
											w = f(l),
											x = "y" === h(l),
											{ width: b, height: E } = s.floating;
										"top" === y || "bottom" === y
											? ((r = y),
												(a =
													w ===
													((await (null == u.isRTL
														? void 0
														: u.isRTL(p.floating)))
														? "start"
														: "end")
														? "left"
														: "right"))
											: ((a = y), (r = "end" === w ? "top" : "bottom"));
										let C = E - g.top - g.bottom,
											R = b - g.left - g.right,
											S = o(E - g[r], C),
											P = o(b - g[a], R),
											j = !e.middlewareData.shift,
											N = S,
											k = P;
										if (
											(null != (t = e.middlewareData.shift) &&
												t.enabled.x &&
												(k = R),
											null != (n = e.middlewareData.shift) &&
												n.enabled.y &&
												(N = C),
											j && !w)
										) {
											const e = i(g.left, 0),
												t = i(g.right, 0),
												n = i(g.top, 0),
												r = i(g.bottom, 0);
											x
												? (k =
														b -
														2 *
															(0 !== e || 0 !== t ? e + t : i(g.left, g.right)))
												: (N =
														E -
														2 *
															(0 !== n || 0 !== r
																? n + r
																: i(g.top, g.bottom)));
										}
										await m({ ...e, availableWidth: k, availableHeight: N });
										const A = await u.getDimensions(p.floating);
										return b !== A.width || E !== A.height
											? { reset: { rects: !0 } }
											: {};
									},
								}).name,
								fn: X.fn,
								options: [I, F],
							},
							eL && {
								name: (q = {
									name: "arrow",
									options: (z = _ = { element: eL, padding: ei }),
									fn(e) {
										const { element: t, padding: n } =
											"function" == typeof z ? z(e) : z;
										return t && {}.hasOwnProperty.call(t, "current")
											? null != t.current
												? ep({ element: t.current, padding: n }).fn(e)
												: {}
											: t
												? ep({ element: t, padding: n }).fn(e)
												: {};
									},
								}).name,
								fn: q.fn,
								options: [_, W],
							},
							eU({ arrowWidth: e_, arrowHeight: eW }),
							ec && {
								name: (G = {
									name: "hide",
									options:
										(U = B =
											{
												strategy: "referenceHidden",
												...eY,
												boundary: e$ ? eY.boundary : void 0,
											}),
									async fn(e) {
										const { rects: t, platform: n } = e,
											{ strategy: r = "referenceHidden", ...o } = c(U, e);
										switch (r) {
											case "referenceHidden": {
												const r = j(
													await n.detectOverflow(e, {
														...o,
														elementContext: "reference",
													}),
													t.reference,
												);
												return {
													data: {
														referenceHiddenOffsets: r,
														referenceHidden: N(r),
													},
												};
											}
											case "escaped": {
												const r = j(
													await n.detectOverflow(e, { ...o, altBoundary: !0 }),
													t.floating,
												);
												return { data: { escapedOffsets: r, escaped: N(r) } };
											}
											default:
												return {};
										}
									},
								}).name,
								fn: G.fn,
								options: [B, V],
							},
						],
					}),
					eQ = ek.setPlacementState;
				(0, eP.useLayoutEffect)(
					() => (
						eQ(eZ),
						() => {
							eQ(void 0);
						}
					),
					[eZ, eQ],
				);
				const [e0, e1] = eK(eZ),
					e6 = (0, eS.useCallbackRef)(eR);
				(0, eP.useLayoutEffect)(() => {
					eG && e6?.();
				}, [eG, e6]);
				const e2 = eJ.arrow?.x,
					e3 = eJ.arrow?.y,
					e5 = eJ.arrow?.centerOffset !== 0,
					[e7, e8] = n.useState();
				return (
					(0, eP.useLayoutEffect)(() => {
						eA && e8(window.getComputedStyle(eA).zIndex);
					}, [eA]),
					(0, eb.jsx)("div", {
						ref: eX.setFloating,
						"data-radix-popper-content-wrapper": "",
						style: {
							...eq,
							transform: eG ? eq.transform : "translate(0, -200%)",
							minWidth: "max-content",
							zIndex: e7,
							"--radix-popper-transform-origin": [
								eJ.transformOrigin?.x,
								eJ.transformOrigin?.y,
							].join(" "),
							...(eJ.hide?.referenceHidden && {
								visibility: "hidden",
								pointerEvents: "none",
							}),
						},
						dir: e.dir,
						children: (0, eb.jsx)(eF, {
							scope: J,
							placedSide: e0,
							placedAlign: e1,
							onArrowChange: eM,
							arrowX: e2,
							arrowY: e3,
							shouldHideArrow: e5,
							children: (0, eb.jsx)(ex.Primitive.div, {
								"data-side": e0,
								"data-align": e1,
								...eN,
								ref: eO,
								style: { ...eN.style, animation: eG ? void 0 : "none" },
							}),
						}),
					})
				);
			});
		e_.displayName = eI;
		var eW = "PopperArrow",
			ez = { top: "bottom", right: "left", bottom: "top", left: "right" },
			eB = n.forwardRef(function (e, t) {
				const { __scopePopper: n, ...r } = e,
					o = eH(eW, n),
					i = ez[o.placedSide];
				return (0, eb.jsx)("span", {
					ref: o.onArrowChange,
					style: {
						position: "absolute",
						left: o.arrowX,
						top: o.arrowY,
						[i]: 0,
						transformOrigin: {
							top: "",
							right: "0 0",
							bottom: "center 0",
							left: "100% 0",
						}[o.placedSide],
						transform: {
							top: "translateY(100%)",
							right: "translateY(50%) rotate(90deg) translateX(-50%)",
							bottom: "rotate(180deg)",
							left: "translateY(50%) rotate(-90deg) translateX(50%)",
						}[o.placedSide],
						visibility: o.shouldHideArrow ? "hidden" : void 0,
					},
					children: (0, eb.jsx)(eE, {
						...r,
						ref: t,
						style: { ...r.style, display: "block" },
					}),
				});
			});
		function eV(e) {
			return null !== e;
		}
		eB.displayName = eW;
		var eU = (e) => ({
			name: "transformOrigin",
			options: e,
			fn(t) {
				let { placement: n, rects: r, middlewareData: o } = t,
					i = o.arrow?.centerOffset !== 0,
					a = i ? 0 : e.arrowWidth,
					l = i ? 0 : e.arrowHeight,
					[s, u] = eK(n),
					c = { start: "0%", center: "50%", end: "100%" }[u],
					d = (o.arrow?.x ?? 0) + a / 2,
					f = (o.arrow?.y ?? 0) + l / 2,
					p = "",
					m = "";
				return (
					"bottom" === s
						? ((p = i ? c : `${d}px`), (m = `${-l}px`))
						: "top" === s
							? ((p = i ? c : `${d}px`), (m = `${r.floating.height + l}px`))
							: "right" === s
								? ((p = `${-l}px`), (m = i ? c : `${f}px`))
								: "left" === s &&
									((p = `${r.floating.width + l}px`), (m = i ? c : `${f}px`)),
					{ data: { x: p, y: m } }
				);
			},
		});
		function eK(e) {
			const [t, n = "center"] = e.split("-");
			return [t, n];
		}
		e.s(
			[
				"Anchor",
				0,
				eM,
				"Arrow",
				0,
				eB,
				"Content",
				0,
				e_,
				"Root",
				0,
				eO,
				"createPopperScope",
				0,
				eA,
			],
			82976,
		);
	},
	37250,
	(e) => {
		"use strict";
		var t = e.i(62613),
			n = e.i(57319),
			r = e.i(97557),
			o = e.i(67714),
			i = e.i(15246),
			a = e.i(48661),
			l = e.i(37381),
			s = e.i(88866),
			u = e.i(72476),
			c = e.i(82976),
			d = e.i(51168),
			f = e.i(49674),
			p = e.i(33833),
			m = e.i(9671),
			h = e.i(5396),
			v = e.i(62876),
			g = e.i(10035),
			y = "Popover",
			[w, x] = (0, i.createContextScope)(y, [c.createPopperScope]),
			b = (0, c.createPopperScope)(),
			[E, C] = w(y),
			R = (e) => {
				const {
						__scopePopover: r,
						children: o,
						open: i,
						defaultOpen: a,
						onOpenChange: l,
						modal: s = !1,
					} = e,
					d = b(r),
					f = n.useRef(null),
					[p, m] = n.useState(!1),
					[v, g] = (0, h.useControllableState)({
						prop: i,
						defaultProp: a ?? !1,
						onChange: l,
						caller: y,
					});
				return (0, t.jsx)(c.Root, {
					...d,
					children: (0, t.jsx)(E, {
						scope: r,
						contentId: (0, u.useId)(),
						triggerRef: f,
						open: v,
						onOpenChange: g,
						onOpenToggle: n.useCallback(() => g((e) => !e), [g]),
						hasCustomAnchor: p,
						onCustomAnchorAdd: n.useCallback(() => m(!0), []),
						onCustomAnchorRemove: n.useCallback(() => m(!1), []),
						modal: s,
						children: o,
					}),
				});
			};
		R.displayName = y;
		var S = "PopoverAnchor";
		n.forwardRef((e, r) => {
			const { __scopePopover: o, ...i } = e,
				a = C(S, o),
				l = b(o),
				{ onCustomAnchorAdd: s, onCustomAnchorRemove: u } = a;
			return (
				n.useEffect(() => (s(), () => u()), [s, u]),
				(0, t.jsx)(c.Anchor, { ...l, ...i, ref: r })
			);
		}).displayName = S;
		var P = "PopoverTrigger",
			j = n.forwardRef((e, n) => {
				const { __scopePopover: i, ...a } = e,
					l = C(P, i),
					s = b(i),
					u = (0, o.useComposedRefs)(n, l.triggerRef),
					d = (0, t.jsx)(p.Primitive.button, {
						type: "button",
						"aria-haspopup": "dialog",
						"aria-expanded": l.open,
						"aria-controls": l.open ? l.contentId : void 0,
						"data-state": _(l.open),
						...a,
						ref: u,
						onClick: (0, r.composeEventHandlers)(e.onClick, l.onOpenToggle),
					});
				return l.hasCustomAnchor
					? d
					: (0, t.jsx)(c.Anchor, { asChild: !0, ...s, children: d });
			});
		j.displayName = P;
		var N = "PopoverPortal",
			[k, A] = w(N, { forceMount: void 0 }),
			T = (e) => {
				const {
						__scopePopover: n,
						forceMount: r,
						children: o,
						container: i,
					} = e,
					a = C(N, n);
				return (0, t.jsx)(k, {
					scope: n,
					forceMount: r,
					children: (0, t.jsx)(f.Presence, {
						present: r || a.open,
						children: (0, t.jsx)(d.Portal, {
							asChild: !0,
							container: i,
							children: o,
						}),
					}),
				});
			};
		T.displayName = N;
		var D = "PopoverContent",
			O = n.forwardRef((e, n) => {
				const r = A(D, e.__scopePopover),
					{ forceMount: o = r.forceMount, ...i } = e,
					a = C(D, e.__scopePopover);
				return (0, t.jsx)(f.Presence, {
					present: o || a.open,
					children: a.modal
						? (0, t.jsx)(M, { ...i, ref: n })
						: (0, t.jsx)(I, { ...i, ref: n }),
				});
			});
		O.displayName = D;
		var L = (0, m.createSlot)("PopoverContent.RemoveScroll"),
			M = n.forwardRef((e, i) => {
				const a = C(D, e.__scopePopover),
					l = n.useRef(null),
					s = (0, o.useComposedRefs)(i, l),
					u = n.useRef(!1);
				return (
					n.useEffect(() => {
						const e = l.current;
						if (e) return (0, v.hideOthers)(e);
					}, []),
					(0, t.jsx)(g.RemoveScroll, {
						as: L,
						allowPinchZoom: !0,
						children: (0, t.jsx)(F, {
							...e,
							ref: s,
							trapFocus: a.open,
							disableOutsidePointerEvents: !0,
							onCloseAutoFocus: (0, r.composeEventHandlers)(
								e.onCloseAutoFocus,
								(e) => {
									e.preventDefault(),
										u.current || a.triggerRef.current?.focus();
								},
							),
							onPointerDownOutside: (0, r.composeEventHandlers)(
								e.onPointerDownOutside,
								(e) => {
									const t = e.detail.originalEvent,
										n = 0 === t.button && !0 === t.ctrlKey;
									u.current = 2 === t.button || n;
								},
								{ checkForDefaultPrevented: !1 },
							),
							onFocusOutside: (0, r.composeEventHandlers)(
								e.onFocusOutside,
								(e) => e.preventDefault(),
								{ checkForDefaultPrevented: !1 },
							),
						}),
					})
				);
			}),
			I = n.forwardRef((e, r) => {
				const o = C(D, e.__scopePopover),
					i = n.useRef(!1),
					a = n.useRef(!1);
				return (0, t.jsx)(F, {
					...e,
					ref: r,
					trapFocus: !1,
					disableOutsidePointerEvents: !1,
					onCloseAutoFocus: (t) => {
						e.onCloseAutoFocus?.(t),
							t.defaultPrevented ||
								(i.current || o.triggerRef.current?.focus(),
								t.preventDefault()),
							(i.current = !1),
							(a.current = !1);
					},
					onInteractOutside: (t) => {
						e.onInteractOutside?.(t),
							t.defaultPrevented ||
								((i.current = !0),
								"pointerdown" === t.detail.originalEvent.type &&
									(a.current = !0));
						const n = t.target;
						o.triggerRef.current?.contains(n) && t.preventDefault(),
							"focusin" === t.detail.originalEvent.type &&
								a.current &&
								t.preventDefault();
					},
				});
			}),
			F = n.forwardRef((e, n) => {
				const {
						__scopePopover: r,
						trapFocus: o,
						onOpenAutoFocus: i,
						onCloseAutoFocus: u,
						disableOutsidePointerEvents: d,
						onEscapeKeyDown: f,
						onPointerDownOutside: p,
						onFocusOutside: m,
						onInteractOutside: h,
						...v
					} = e,
					g = C(D, r),
					y = b(r);
				return (
					(0, l.useFocusGuards)(),
					(0, t.jsx)(s.FocusScope, {
						asChild: !0,
						loop: !0,
						trapped: o,
						onMountAutoFocus: i,
						onUnmountAutoFocus: u,
						children: (0, t.jsx)(a.DismissableLayer, {
							asChild: !0,
							disableOutsidePointerEvents: d,
							onInteractOutside: h,
							onEscapeKeyDown: f,
							onPointerDownOutside: p,
							onFocusOutside: m,
							onDismiss: () => g.onOpenChange(!1),
							deferPointerDownOutside: !0,
							children: (0, t.jsx)(c.Content, {
								"data-state": _(g.open),
								role: "dialog",
								id: g.contentId,
								...y,
								...v,
								ref: n,
								style: {
									...v.style,
									"--radix-popover-content-transform-origin":
										"var(--radix-popper-transform-origin)",
									"--radix-popover-content-available-width":
										"var(--radix-popper-available-width)",
									"--radix-popover-content-available-height":
										"var(--radix-popper-available-height)",
									"--radix-popover-trigger-width":
										"var(--radix-popper-anchor-width)",
									"--radix-popover-trigger-height":
										"var(--radix-popper-anchor-height)",
								},
							}),
						}),
					})
				);
			}),
			H = "PopoverClose";
		function _(e) {
			return e ? "open" : "closed";
		}
		(n.forwardRef((e, n) => {
			const { __scopePopover: o, ...i } = e,
				a = C(H, o);
			return (0, t.jsx)(p.Primitive.button, {
				type: "button",
				...i,
				ref: n,
				onClick: (0, r.composeEventHandlers)(e.onClick, () =>
					a.onOpenChange(!1),
				),
			});
		}).displayName = H),
			(n.forwardRef((e, n) => {
				const { __scopePopover: r, ...o } = e,
					i = b(r);
				return (0, t.jsx)(c.Arrow, { ...i, ...o, ref: n });
			}).displayName = "PopoverArrow");
		var W = e.i(49696);
		e.s(
			[
				"Popover",
				0,
				function ({ ...e }) {
					return (0, t.jsx)(R, { "data-slot": "popover", ...e });
				},
				"PopoverContent",
				0,
				function ({
					className: e,
					align: n = "center",
					sideOffset: r = 4,
					...o
				}) {
					return (0, t.jsx)(T, {
						children: (0, t.jsx)(O, {
							"data-slot": "popover-content",
							align: n,
							sideOffset: r,
							className: (0, W.cn)(
								"bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 rounded-md border p-4 shadow-md outline-hidden",
								e,
							),
							...o,
						}),
					});
				},
				"PopoverTrigger",
				0,
				function ({ ...e }) {
					return (0, t.jsx)(j, { "data-slot": "popover-trigger", ...e });
				},
			],
			37250,
		);
	},
	28139,
	53212,
	(e) => {
		"use strict";
		var t = e.i(57319),
			n = e.i(15246),
			r = e.i(67714),
			o = e.i(9671),
			i = e.i(62613),
			a = new WeakMap();
		function l(e, t) {
			var n, r;
			let o, i, a;
			if ("at" in Array.prototype) return Array.prototype.at.call(e, t);
			const l =
				((n = e),
				(r = t),
				(o = n.length),
				(a = (i = s(r)) >= 0 ? i : o + i) < 0 || a >= o ? -1 : a);
			return -1 === l ? void 0 : e[l];
		}
		function s(e) {
			return e != e || 0 === e ? 0 : Math.trunc(e);
		}
		(class e extends Map {
			#e;
			constructor(e) {
				super(e), (this.#e = [...super.keys()]), a.set(this, !0);
			}
			set(e, t) {
				return (
					a.get(this) &&
						(this.has(e) ? (this.#e[this.#e.indexOf(e)] = e) : this.#e.push(e)),
					super.set(e, t),
					this
				);
			}
			insert(e, t, n) {
				let r,
					o = this.has(t),
					i = this.#e.length,
					a = s(e),
					l = a >= 0 ? a : i + a,
					u = l < 0 || l >= i ? -1 : l;
				if (u === this.size || (o && u === this.size - 1) || -1 === u)
					return this.set(t, n), this;
				const c = this.size + +!o;
				a < 0 && l++;
				let d = [...this.#e],
					f = !1;
				for (let e = l; e < c; e++)
					if (l === e) {
						let i = d[e];
						d[e] === t && (i = d[e + 1]),
							o && this.delete(t),
							(r = this.get(i)),
							this.set(t, n);
					} else {
						f || d[e - 1] !== t || (f = !0);
						const n = d[f ? e : e - 1],
							o = r;
						(r = this.get(n)), this.delete(n), this.set(n, o);
					}
				return this;
			}
			with(t, n, r) {
				const o = new e(this);
				return o.insert(t, n, r), o;
			}
			before(e) {
				const t = this.#e.indexOf(e) - 1;
				if (!(t < 0)) return this.entryAt(t);
			}
			setBefore(e, t, n) {
				const r = this.#e.indexOf(e);
				return -1 === r ? this : this.insert(r, t, n);
			}
			after(e) {
				let t = this.#e.indexOf(e);
				if (-1 !== (t = -1 === t || t === this.size - 1 ? -1 : t + 1))
					return this.entryAt(t);
			}
			setAfter(e, t, n) {
				const r = this.#e.indexOf(e);
				return -1 === r ? this : this.insert(r + 1, t, n);
			}
			first() {
				return this.entryAt(0);
			}
			last() {
				return this.entryAt(-1);
			}
			clear() {
				return (this.#e = []), super.clear();
			}
			delete(e) {
				const t = super.delete(e);
				return t && this.#e.splice(this.#e.indexOf(e), 1), t;
			}
			deleteAt(e) {
				const t = this.keyAt(e);
				return void 0 !== t && this.delete(t);
			}
			at(e) {
				const t = l(this.#e, e);
				if (void 0 !== t) return this.get(t);
			}
			entryAt(e) {
				const t = l(this.#e, e);
				if (void 0 !== t) return [t, this.get(t)];
			}
			indexOf(e) {
				return this.#e.indexOf(e);
			}
			keyAt(e) {
				return l(this.#e, e);
			}
			from(e, t) {
				const n = this.indexOf(e);
				if (-1 === n) return;
				let r = n + t;
				return (
					r < 0 && (r = 0), r >= this.size && (r = this.size - 1), this.at(r)
				);
			}
			keyFrom(e, t) {
				const n = this.indexOf(e);
				if (-1 === n) return;
				let r = n + t;
				return (
					r < 0 && (r = 0), r >= this.size && (r = this.size - 1), this.keyAt(r)
				);
			}
			find(e, t) {
				let n = 0;
				for (const r of this) {
					if (Reflect.apply(e, t, [r, n, this])) return r;
					n++;
				}
			}
			findIndex(e, t) {
				let n = 0;
				for (const r of this) {
					if (Reflect.apply(e, t, [r, n, this])) return n;
					n++;
				}
				return -1;
			}
			filter(t, n) {
				let r = [],
					o = 0;
				for (const e of this)
					Reflect.apply(t, n, [e, o, this]) && r.push(e), o++;
				return new e(r);
			}
			map(t, n) {
				let r = [],
					o = 0;
				for (const e of this)
					r.push([e[0], Reflect.apply(t, n, [e, o, this])]), o++;
				return new e(r);
			}
			reduce(...e) {
				let [t, n] = e,
					r = 0,
					o = n ?? this.at(0);
				for (const n of this)
					(o =
						0 === r && 1 === e.length
							? n
							: Reflect.apply(t, this, [o, n, r, this])),
						r++;
				return o;
			}
			reduceRight(...e) {
				let [t, n] = e,
					r = n ?? this.at(-1);
				for (let n = this.size - 1; n >= 0; n--) {
					const o = this.at(n);
					r =
						n === this.size - 1 && 1 === e.length
							? o
							: Reflect.apply(t, this, [r, o, n, this]);
				}
				return r;
			}
			toSorted(t) {
				return new e([...this.entries()].sort(t));
			}
			toReversed() {
				const t = new e();
				for (let e = this.size - 1; e >= 0; e--) {
					const n = this.keyAt(e),
						r = this.get(n);
					t.set(n, r);
				}
				return t;
			}
			toSpliced(...t) {
				const n = [...this.entries()];
				return n.splice(...t), new e(n);
			}
			slice(t, n) {
				let r = new e(),
					o = this.size - 1;
				if (void 0 === t) return r;
				t < 0 && (t += this.size), void 0 !== n && n > 0 && (o = n - 1);
				for (let e = t; e <= o; e++) {
					const t = this.keyAt(e),
						n = this.get(t);
					r.set(t, n);
				}
				return r;
			}
			every(e, t) {
				let n = 0;
				for (const r of this) {
					if (!Reflect.apply(e, t, [r, n, this])) return !1;
					n++;
				}
				return !0;
			}
			some(e, t) {
				let n = 0;
				for (const r of this) {
					if (Reflect.apply(e, t, [r, n, this])) return !0;
					n++;
				}
				return !1;
			}
		}),
			e.s(
				[
					"createCollection",
					0,
					function (e) {
						const a = e + "CollectionProvider",
							[l, s] = (0, n.createContextScope)(a),
							[u, c] = l(a, {
								collectionRef: { current: null },
								itemMap: new Map(),
							}),
							d = (e) => {
								const { scope: n, children: r } = e,
									o = t.useRef(null),
									a = t.useRef(new Map()).current;
								return (0, i.jsx)(u, {
									scope: n,
									itemMap: a,
									collectionRef: o,
									children: r,
								});
							};
						d.displayName = a;
						const f = e + "CollectionSlot",
							p = (0, o.createSlot)(f),
							m = t.forwardRef((e, t) => {
								const { scope: n, children: o } = e,
									a = c(f, n),
									l = (0, r.useComposedRefs)(t, a.collectionRef);
								return (0, i.jsx)(p, { ref: l, children: o });
							});
						m.displayName = f;
						const h = e + "CollectionItemSlot",
							v = "data-radix-collection-item",
							g = (0, o.createSlot)(h),
							y = t.forwardRef((e, n) => {
								const { scope: o, children: a, ...l } = e,
									s = t.useRef(null),
									u = (0, r.useComposedRefs)(n, s),
									d = c(h, o);
								return (
									t.useEffect(
										() => (
											d.itemMap.set(s, { ref: s, ...l }),
											() => void d.itemMap.delete(s)
										),
									),
									(0, i.jsx)(g, { ...{ [v]: "" }, ref: u, children: a })
								);
							});
						return (
							(y.displayName = h),
							[
								{ Provider: d, Slot: m, ItemSlot: y },
								function (n) {
									const r = c(e + "CollectionConsumer", n);
									return t.useCallback(() => {
										const e = r.collectionRef.current;
										if (!e) return [];
										const t = Array.from(e.querySelectorAll(`[${v}]`));
										return Array.from(r.itemMap.values()).sort(
											(e, n) =>
												t.indexOf(e.ref.current) - t.indexOf(n.ref.current),
										);
									}, [r.collectionRef, r.itemMap]);
								},
								s,
							]
						);
					},
				],
				28139,
			);
		var u = t.createContext(void 0);
		e.s(
			[
				"useDirection",
				0,
				function (e) {
					const n = t.useContext(u);
					return e || n || "ltr";
				},
			],
			53212,
		);
	},
	19202,
	(e) => {
		"use strict";
		var t = e.i(57319),
			n = e.i(33833),
			r = e.i(62613),
			o = Object.freeze({
				position: "absolute",
				border: 0,
				width: 1,
				height: 1,
				padding: 0,
				margin: -1,
				overflow: "hidden",
				clip: "rect(0, 0, 0, 0)",
				whiteSpace: "nowrap",
				wordWrap: "normal",
			}),
			i = t.forwardRef((e, t) =>
				(0, r.jsx)(n.Primitive.span, {
					...e,
					ref: t,
					style: { ...o, ...e.style },
				}),
			);
		(i.displayName = "VisuallyHidden"),
			e.s(["Root", 0, i, "VISUALLY_HIDDEN_STYLES", 0, o]);
	},
	81,
	(e) => {
		"use strict";
		const t = (0, e.i(10283).default)("chevron-down", [
			["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }],
		]);
		e.s(["ChevronDown", 0, t], 81);
	},
	78363,
	(e) => {
		"use strict";
		var t = e.i(62613),
			n = e.i(57319),
			r = e.i(86460);
		function o(e, [t, n]) {
			return Math.min(n, Math.max(t, e));
		}
		var i = e.i(97557),
			a = e.i(28139),
			l = e.i(67714),
			s = e.i(15246),
			u = e.i(53212),
			c = e.i(48661),
			d = e.i(37381),
			f = e.i(88866),
			p = e.i(72476),
			m = e.i(82976),
			h = e.i(51168),
			v = e.i(49674),
			g = e.i(33833),
			y = e.i(9671),
			w = e.i(9964),
			x = e.i(5396),
			b = e.i(13575),
			E = e.i(42902),
			C = e.i(19202),
			R = e.i(62876),
			S = e.i(10035),
			P = [" ", "Enter", "ArrowUp", "ArrowDown"],
			j = [" ", "Enter"],
			N = "Select",
			[k, A, T] = (0, a.createCollection)(N),
			[D, O] = (0, s.createContextScope)(N, [T, m.createPopperScope]),
			L = (0, m.createPopperScope)(),
			[M, I] = D(N),
			[F, H] = D(N);
		function _(e) {
			const {
					__scopeSelect: r,
					children: o,
					open: i,
					defaultOpen: a,
					onOpenChange: l,
					value: s,
					defaultValue: c,
					onValueChange: d,
					dir: f,
					name: h,
					autoComplete: v,
					disabled: g,
					required: y,
					form: w,
					internal_do_not_use_render: b,
				} = e,
				E = L(r),
				[C, R] = n.useState(null),
				[S, P] = n.useState(null),
				[j, A] = n.useState(!1),
				T = (0, u.useDirection)(f),
				[D, O] = (0, x.useControllableState)({
					prop: i,
					defaultProp: a ?? !1,
					onChange: l,
					caller: N,
				}),
				[I, H] = (0, x.useControllableState)({
					prop: s,
					defaultProp: c,
					onChange: d,
					caller: N,
				}),
				_ = n.useRef(null),
				W = !C || !!w || !!C.closest("form"),
				[z, B] = n.useState(new Set()),
				V = (0, p.useId)(),
				U = Array.from(z)
					.map((e) => e.props.value)
					.join(";"),
				K = n.useCallback((e) => {
					B((t) => new Set(t).add(e));
				}, []),
				$ = n.useCallback((e) => {
					B((t) => {
						const n = new Set(t);
						return n.delete(e), n;
					});
				}, []),
				Y = {
					required: y,
					trigger: C,
					onTriggerChange: R,
					valueNode: S,
					onValueNodeChange: P,
					valueNodeHasChildren: j,
					onValueNodeHasChildrenChange: A,
					contentId: V,
					value: I,
					onValueChange: H,
					open: D,
					onOpenChange: O,
					dir: T,
					triggerPointerDownPosRef: _,
					disabled: g,
					name: h,
					autoComplete: v,
					form: w,
					nativeOptions: z,
					nativeSelectKey: U,
					isFormControl: W,
				};
			return (0, t.jsx)(m.Root, {
				...E,
				children: (0, t.jsx)(M, {
					scope: r,
					...Y,
					children: (0, t.jsx)(k.Provider, {
						scope: r,
						children: (0, t.jsx)(F, {
							scope: r,
							onNativeOptionAdd: K,
							onNativeOptionRemove: $,
							children: "function" == typeof b ? b(Y) : o,
						}),
					}),
				}),
			});
		}
		_.displayName = "SelectProvider";
		var W = (e) => {
			const { __scopeSelect: n, children: r, ...o } = e;
			return (0, t.jsx)(_, {
				__scopeSelect: n,
				...o,
				internal_do_not_use_render: ({ isFormControl: e }) =>
					(0, t.jsxs)(t.Fragment, {
						children: [r, e ? (0, t.jsx)(eA, { __scopeSelect: n }) : null],
					}),
			});
		};
		W.displayName = N;
		var z = "SelectTrigger",
			B = n.forwardRef((e, r) => {
				const { __scopeSelect: o, disabled: a = !1, ...s } = e,
					u = L(o),
					c = I(z, o),
					d = c.disabled || a,
					f = (0, l.useComposedRefs)(r, c.onTriggerChange),
					p = A(o),
					h = n.useRef("touch"),
					[v, y, w] = eD((e) => {
						const t = p().filter((e) => !e.disabled),
							n = t.find((e) => e.value === c.value),
							r = eO(t, e, n);
						void 0 !== r && c.onValueChange(r.value);
					}),
					x = (e) => {
						d || (c.onOpenChange(!0), w()),
							e &&
								(c.triggerPointerDownPosRef.current = {
									x: Math.round(e.pageX),
									y: Math.round(e.pageY),
								});
					};
				return (0, t.jsx)(m.Anchor, {
					asChild: !0,
					...u,
					children: (0, t.jsx)(g.Primitive.button, {
						type: "button",
						role: "combobox",
						"aria-controls": c.open ? c.contentId : void 0,
						"aria-expanded": c.open,
						"aria-required": c.required,
						"aria-autocomplete": "none",
						dir: c.dir,
						"data-state": c.open ? "open" : "closed",
						disabled: d,
						"data-disabled": d ? "" : void 0,
						"data-placeholder": eT(c.value) ? "" : void 0,
						...s,
						ref: f,
						onClick: (0, i.composeEventHandlers)(s.onClick, (e) => {
							e.currentTarget.focus(), "mouse" !== h.current && x(e);
						}),
						onPointerDown: (0, i.composeEventHandlers)(s.onPointerDown, (e) => {
							h.current = e.pointerType;
							const t = e.target;
							t.hasPointerCapture(e.pointerId) &&
								t.releasePointerCapture(e.pointerId),
								0 === e.button &&
									!1 === e.ctrlKey &&
									"mouse" === e.pointerType &&
									(x(e), e.preventDefault());
						}),
						onKeyDown: (0, i.composeEventHandlers)(s.onKeyDown, (e) => {
							const t = "" !== v.current;
							e.ctrlKey ||
								e.altKey ||
								e.metaKey ||
								1 !== e.key.length ||
								y(e.key),
								(!t || " " !== e.key) &&
									P.includes(e.key) &&
									(x(), e.preventDefault());
						}),
					}),
				});
			});
		B.displayName = z;
		var V = "SelectValue",
			U = n.forwardRef((e, r) => {
				const {
						__scopeSelect: o,
						className: i,
						style: a,
						children: s,
						placeholder: u = "",
						...c
					} = e,
					d = I(V, o),
					{ onValueNodeHasChildrenChange: f } = d,
					p = void 0 !== s,
					m = (0, l.useComposedRefs)(r, d.onValueNodeChange);
				(0, b.useLayoutEffect)(() => {
					f(p);
				}, [f, p]);
				const h = eT(d.value);
				return (0, t.jsx)(g.Primitive.span, {
					...c,
					asChild: !h && c.asChild,
					ref: m,
					style: { pointerEvents: "none" },
					children: (0, t.jsx)(
						n.Fragment,
						{ children: h ? u : s },
						h ? "placeholder" : "value",
					),
				});
			});
		U.displayName = V;
		var K = n.forwardRef((e, n) => {
			const { __scopeSelect: r, children: o, ...i } = e;
			return (0, t.jsx)(g.Primitive.span, {
				"aria-hidden": !0,
				...i,
				ref: n,
				children: o || "▼",
			});
		});
		K.displayName = "SelectIcon";
		var $ = "SelectPortal",
			[Y, X] = D($, { forceMount: void 0 }),
			q = (e) => {
				const { __scopeSelect: n, forceMount: r, ...o } = e;
				return (0, t.jsx)(Y, {
					scope: e.__scopeSelect,
					forceMount: r,
					children: (0, t.jsx)(h.Portal, { asChild: !0, ...o }),
				});
			};
		q.displayName = $;
		var Z = "SelectContent",
			G = n.forwardRef((e, r) => {
				const o = X(Z, e.__scopeSelect),
					{ forceMount: i = o.forceMount, ...a } = e,
					l = I(Z, e.__scopeSelect),
					[s, u] = n.useState();
				return (
					(0, b.useLayoutEffect)(() => {
						u(new DocumentFragment());
					}, []),
					(0, t.jsx)(v.Presence, {
						present: i || l.open,
						children: ({ present: e }) =>
							e
								? (0, t.jsx)(en, { ...a, ref: r })
								: (0, t.jsx)(J, { ...a, fragment: s }),
					})
				);
			});
		G.displayName = Z;
		var J = n.forwardRef((e, n) => {
			const { __scopeSelect: o, children: i, fragment: a } = e;
			return a
				? r.createPortal(
						(0, t.jsx)(Q, {
							scope: o,
							children: (0, t.jsx)(k.Slot, {
								scope: o,
								children: (0, t.jsx)("div", { ref: n, children: i }),
							}),
						}),
						a,
					)
				: null;
		});
		J.displayName = "SelectContentFragment";
		var [Q, ee] = D(Z),
			et = (0, y.createSlot)("SelectContent.RemoveScroll"),
			en = n.forwardRef((e, r) => {
				const { __scopeSelect: o } = e,
					{
						position: a = "item-aligned",
						onCloseAutoFocus: s,
						onEscapeKeyDown: u,
						onPointerDownOutside: p,
						side: m,
						sideOffset: h,
						align: v,
						alignOffset: g,
						arrowPadding: y,
						collisionBoundary: w,
						collisionPadding: x,
						sticky: b,
						hideWhenDetached: E,
						avoidCollisions: C,
						...P
					} = e,
					j = I(Z, o),
					[N, k] = n.useState(null),
					[T, D] = n.useState(null),
					O = (0, l.useComposedRefs)(r, (e) => k(e)),
					[L, M] = n.useState(null),
					[F, H] = n.useState(null),
					_ = A(o),
					[W, z] = n.useState(!1),
					B = n.useRef(!1);
				n.useEffect(() => {
					if (N) return (0, R.hideOthers)(N);
				}, [N]),
					(0, d.useFocusGuards)();
				const V = n.useCallback(
						(e) => {
							const [t, ...n] = _().map((e) => e.ref.current),
								[r] = n.slice(-1),
								o = document.activeElement;
							for (const n of e)
								if (
									n === o ||
									(n?.scrollIntoView({ block: "nearest" }),
									n === t && T && (T.scrollTop = 0),
									n === r && T && (T.scrollTop = T.scrollHeight),
									n?.focus(),
									document.activeElement !== o)
								)
									return;
						},
						[_, T],
					),
					U = n.useCallback(() => V([L, N]), [V, L, N]);
				n.useEffect(() => {
					W && U();
				}, [W, U]);
				const { onOpenChange: K, triggerPointerDownPosRef: $ } = j;
				n.useEffect(() => {
					if (N) {
						let e = { x: 0, y: 0 },
							t = (t) => {
								e = {
									x: Math.abs(Math.round(t.pageX) - ($.current?.x ?? 0)),
									y: Math.abs(Math.round(t.pageY) - ($.current?.y ?? 0)),
								};
							},
							n = (n) => {
								e.x <= 10 && e.y <= 10
									? n.preventDefault()
									: n.composedPath().includes(N) || K(!1),
									document.removeEventListener("pointermove", t),
									($.current = null);
							};
						return (
							null !== $.current &&
								(document.addEventListener("pointermove", t),
								document.addEventListener("pointerup", n, {
									capture: !0,
									once: !0,
								})),
							() => {
								document.removeEventListener("pointermove", t),
									document.removeEventListener("pointerup", n, { capture: !0 });
							}
						);
					}
				}, [N, K, $]),
					n.useEffect(() => {
						const e = () => K(!1);
						return (
							window.addEventListener("blur", e),
							window.addEventListener("resize", e),
							() => {
								window.removeEventListener("blur", e),
									window.removeEventListener("resize", e);
							}
						);
					}, [K]);
				const [Y, X] = eD((e) => {
						const t = _().filter((e) => !e.disabled),
							n = t.find((e) => e.ref.current === document.activeElement),
							r = eO(t, e, n);
						r && setTimeout(() => r.ref.current?.focus());
					}),
					q = n.useCallback(
						(e, t, n) => {
							const r = !B.current && !n;
							((void 0 !== j.value && j.value === t) || r) &&
								(M(e), r && (B.current = !0));
						},
						[j.value],
					),
					G = n.useCallback(() => N?.focus(), [N]),
					J = n.useCallback(
						(e, t, n) => {
							const r = !B.current && !n;
							((void 0 !== j.value && j.value === t) || r) && H(e);
						},
						[j.value],
					),
					ee = "popper" === a ? eo : er,
					en =
						ee === eo
							? {
									side: m,
									sideOffset: h,
									align: v,
									alignOffset: g,
									arrowPadding: y,
									collisionBoundary: w,
									collisionPadding: x,
									sticky: b,
									hideWhenDetached: E,
									avoidCollisions: C,
								}
							: {};
				return (0, t.jsx)(Q, {
					scope: o,
					content: N,
					viewport: T,
					onViewportChange: D,
					itemRefCallback: q,
					selectedItem: L,
					onItemLeave: G,
					itemTextRefCallback: J,
					focusSelectedItem: U,
					selectedItemText: F,
					position: a,
					isPositioned: W,
					searchRef: Y,
					children: (0, t.jsx)(S.RemoveScroll, {
						as: et,
						allowPinchZoom: !0,
						children: (0, t.jsx)(f.FocusScope, {
							asChild: !0,
							trapped: j.open,
							onMountAutoFocus: (e) => {
								e.preventDefault();
							},
							onUnmountAutoFocus: (0, i.composeEventHandlers)(s, (e) => {
								j.trigger?.focus({ preventScroll: !0 }), e.preventDefault();
							}),
							children: (0, t.jsx)(c.DismissableLayer, {
								asChild: !0,
								disableOutsidePointerEvents: !0,
								onEscapeKeyDown: u,
								onPointerDownOutside: p,
								onFocusOutside: (e) => e.preventDefault(),
								onDismiss: () => j.onOpenChange(!1),
								children: (0, t.jsx)(ee, {
									role: "listbox",
									id: j.contentId,
									"data-state": j.open ? "open" : "closed",
									dir: j.dir,
									onContextMenu: (e) => e.preventDefault(),
									...P,
									...en,
									onPlaced: () => z(!0),
									ref: O,
									style: {
										display: "flex",
										flexDirection: "column",
										outline: "none",
										...P.style,
									},
									onKeyDown: (0, i.composeEventHandlers)(P.onKeyDown, (e) => {
										const t = e.ctrlKey || e.altKey || e.metaKey;
										if (
											("Tab" === e.key && e.preventDefault(),
											t || 1 !== e.key.length || X(e.key),
											["ArrowUp", "ArrowDown", "Home", "End"].includes(e.key))
										) {
											let t = _()
												.filter((e) => !e.disabled)
												.map((e) => e.ref.current);
											if (
												(["ArrowUp", "End"].includes(e.key) &&
													(t = t.slice().reverse()),
												["ArrowUp", "ArrowDown"].includes(e.key))
											) {
												const n = e.target,
													r = t.indexOf(n);
												t = t.slice(r + 1);
											}
											setTimeout(() => V(t)), e.preventDefault();
										}
									}),
								}),
							}),
						}),
					}),
				});
			});
		en.displayName = "SelectContentImpl";
		var er = n.forwardRef((e, r) => {
			const { __scopeSelect: i, onPlaced: a, ...s } = e,
				u = I(Z, i),
				c = ee(Z, i),
				[d, f] = n.useState(null),
				[p, m] = n.useState(null),
				h = (0, l.useComposedRefs)(r, (e) => m(e)),
				v = A(i),
				y = n.useRef(!1),
				w = n.useRef(!0),
				{
					viewport: x,
					selectedItem: E,
					selectedItemText: C,
					focusSelectedItem: R,
				} = c,
				S = n.useCallback(() => {
					if (u.trigger && u.valueNode && d && p && x && E && C) {
						const e = u.trigger.getBoundingClientRect(),
							t = p.getBoundingClientRect(),
							n = u.valueNode.getBoundingClientRect(),
							r = C.getBoundingClientRect();
						if ("rtl" !== u.dir) {
							const i = r.left - t.left,
								a = n.left - i,
								l = e.left - a,
								s = e.width + l,
								u = Math.max(s, t.width),
								c = o(a, [10, Math.max(10, window.innerWidth - 10 - u)]);
							(d.style.minWidth = s + "px"), (d.style.left = c + "px");
						} else {
							const i = t.right - r.right,
								a = window.innerWidth - n.right - i,
								l = window.innerWidth - e.right - a,
								s = e.width + l,
								u = Math.max(s, t.width),
								c = o(a, [10, Math.max(10, window.innerWidth - 10 - u)]);
							(d.style.minWidth = s + "px"), (d.style.right = c + "px");
						}
						const i = v(),
							l = window.innerHeight - 20,
							s = x.scrollHeight,
							c = window.getComputedStyle(p),
							f = parseInt(c.borderTopWidth, 10),
							m = parseInt(c.paddingTop, 10),
							h = parseInt(c.borderBottomWidth, 10),
							g = f + m + s + parseInt(c.paddingBottom, 10) + h,
							w = Math.min(5 * E.offsetHeight, g),
							b = window.getComputedStyle(x),
							R = parseInt(b.paddingTop, 10),
							S = parseInt(b.paddingBottom, 10),
							P = e.top + e.height / 2 - 10,
							j = E.offsetHeight / 2,
							N = f + m + (E.offsetTop + j);
						if (N <= P) {
							const e = i.length > 0 && E === i[i.length - 1].ref.current;
							d.style.bottom = "0px";
							const t = Math.max(
								l - P,
								j +
									(e ? S : 0) +
									(p.clientHeight - x.offsetTop - x.offsetHeight) +
									h,
							);
							d.style.height = N + t + "px";
						} else {
							const e = i.length > 0 && E === i[0].ref.current;
							d.style.top = "0px";
							const t = Math.max(P, f + x.offsetTop + (e ? R : 0) + j);
							(d.style.height = t + (g - N) + "px"),
								(x.scrollTop = N - P + x.offsetTop);
						}
						(d.style.margin = "10px 0"),
							(d.style.minHeight = w + "px"),
							(d.style.maxHeight = l + "px"),
							a?.(),
							requestAnimationFrame(() => (y.current = !0));
					}
				}, [v, u.trigger, u.valueNode, d, p, x, E, C, u.dir, a]);
			(0, b.useLayoutEffect)(() => S(), [S]);
			const [P, j] = n.useState();
			(0, b.useLayoutEffect)(() => {
				p && j(window.getComputedStyle(p).zIndex);
			}, [p]);
			const N = n.useCallback(
				(e) => {
					e && !0 === w.current && (S(), R?.(), (w.current = !1));
				},
				[S, R],
			);
			return (0, t.jsx)(ei, {
				scope: i,
				contentWrapper: d,
				shouldExpandOnScrollRef: y,
				onScrollButtonChange: N,
				children: (0, t.jsx)("div", {
					ref: f,
					style: {
						display: "flex",
						flexDirection: "column",
						position: "fixed",
						zIndex: P,
					},
					children: (0, t.jsx)(g.Primitive.div, {
						...s,
						ref: h,
						style: { boxSizing: "border-box", maxHeight: "100%", ...s.style },
					}),
				}),
			});
		});
		er.displayName = "SelectItemAlignedPosition";
		var eo = n.forwardRef((e, n) => {
			const {
					__scopeSelect: r,
					align: o = "start",
					collisionPadding: i = 10,
					...a
				} = e,
				l = L(r);
			return (0, t.jsx)(m.Content, {
				...l,
				...a,
				ref: n,
				align: o,
				collisionPadding: i,
				style: {
					boxSizing: "border-box",
					...a.style,
					"--radix-select-content-transform-origin":
						"var(--radix-popper-transform-origin)",
					"--radix-select-content-available-width":
						"var(--radix-popper-available-width)",
					"--radix-select-content-available-height":
						"var(--radix-popper-available-height)",
					"--radix-select-trigger-width": "var(--radix-popper-anchor-width)",
					"--radix-select-trigger-height": "var(--radix-popper-anchor-height)",
				},
			});
		});
		eo.displayName = "SelectPopperPosition";
		var [ei, ea] = D(Z, {}),
			el = "SelectViewport",
			es = n.forwardRef((e, r) => {
				const { __scopeSelect: o, nonce: a, ...s } = e,
					u = ee(el, o),
					c = ea(el, o),
					d = (0, l.useComposedRefs)(r, u.onViewportChange),
					f = n.useRef(0);
				return (0, t.jsxs)(t.Fragment, {
					children: [
						(0, t.jsx)("style", {
							dangerouslySetInnerHTML: {
								__html:
									"[data-radix-select-viewport]{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}[data-radix-select-viewport]::-webkit-scrollbar{display:none}",
							},
							nonce: a,
						}),
						(0, t.jsx)(k.Slot, {
							scope: o,
							children: (0, t.jsx)(g.Primitive.div, {
								"data-radix-select-viewport": "",
								role: "presentation",
								...s,
								ref: d,
								style: {
									position: "relative",
									flex: 1,
									overflow: "hidden auto",
									...s.style,
								},
								onScroll: (0, i.composeEventHandlers)(s.onScroll, (e) => {
									const t = e.currentTarget,
										{ contentWrapper: n, shouldExpandOnScrollRef: r } = c;
									if (r?.current && n) {
										const e = Math.abs(f.current - t.scrollTop);
										if (e > 0) {
											const r = window.innerHeight - 20,
												o = Math.max(
													parseFloat(n.style.minHeight),
													parseFloat(n.style.height),
												);
											if (o < r) {
												const i = o + e,
													a = Math.min(r, i),
													l = i - a;
												(n.style.height = a + "px"),
													"0px" === n.style.bottom &&
														((t.scrollTop = l > 0 ? l : 0),
														(n.style.justifyContent = "flex-end"));
											}
										}
									}
									f.current = t.scrollTop;
								}),
							}),
						}),
					],
				});
			});
		es.displayName = el;
		var eu = "SelectGroup",
			[ec, ed] = D(eu);
		n.forwardRef((e, n) => {
			const { __scopeSelect: r, ...o } = e,
				i = (0, p.useId)();
			return (0, t.jsx)(ec, {
				scope: r,
				id: i,
				children: (0, t.jsx)(g.Primitive.div, {
					role: "group",
					"aria-labelledby": i,
					...o,
					ref: n,
				}),
			});
		}).displayName = eu;
		var ef = "SelectLabel",
			ep = n.forwardRef((e, n) => {
				const { __scopeSelect: r, ...o } = e,
					i = ed(ef, r);
				return (0, t.jsx)(g.Primitive.div, { id: i.id, ...o, ref: n });
			});
		ep.displayName = ef;
		var em = "SelectItem",
			[eh, ev] = D(em),
			eg = n.forwardRef((e, r) => {
				const {
						__scopeSelect: o,
						value: a,
						disabled: s = !1,
						textValue: u,
						...c
					} = e,
					d = I(em, o),
					f = ee(em, o),
					m = d.value === a,
					[h, v] = n.useState(u ?? ""),
					[y, w] = n.useState(!1),
					x = (0, l.useComposedRefs)(r, (e) => f.itemRefCallback?.(e, a, s)),
					b = (0, p.useId)(),
					E = n.useRef("touch"),
					C = () => {
						s || (d.onValueChange(a), d.onOpenChange(!1));
					};
				return (0, t.jsx)(eh, {
					scope: o,
					value: a,
					disabled: s,
					textId: b,
					isSelected: m,
					onItemTextChange: n.useCallback((e) => {
						v((t) => t || (e?.textContent ?? "").trim());
					}, []),
					children: (0, t.jsx)(k.ItemSlot, {
						scope: o,
						value: a,
						disabled: s,
						textValue: h,
						children: (0, t.jsx)(g.Primitive.div, {
							role: "option",
							"aria-labelledby": b,
							"data-highlighted": y ? "" : void 0,
							"aria-selected": m && y,
							"data-state": m ? "checked" : "unchecked",
							"aria-disabled": s || void 0,
							"data-disabled": s ? "" : void 0,
							tabIndex: s ? void 0 : -1,
							...c,
							ref: x,
							onFocus: (0, i.composeEventHandlers)(c.onFocus, () => w(!0)),
							onBlur: (0, i.composeEventHandlers)(c.onBlur, () => w(!1)),
							onClick: (0, i.composeEventHandlers)(c.onClick, () => {
								"mouse" !== E.current && C();
							}),
							onPointerUp: (0, i.composeEventHandlers)(c.onPointerUp, () => {
								"mouse" === E.current && C();
							}),
							onPointerDown: (0, i.composeEventHandlers)(
								c.onPointerDown,
								(e) => {
									E.current = e.pointerType;
								},
							),
							onPointerMove: (0, i.composeEventHandlers)(
								c.onPointerMove,
								(e) => {
									(E.current = e.pointerType),
										s
											? f.onItemLeave?.()
											: "mouse" === E.current &&
												e.currentTarget.focus({ preventScroll: !0 });
								},
							),
							onPointerLeave: (0, i.composeEventHandlers)(
								c.onPointerLeave,
								(e) => {
									e.currentTarget === document.activeElement &&
										f.onItemLeave?.();
								},
							),
							onKeyDown: (0, i.composeEventHandlers)(c.onKeyDown, (e) => {
								(f.searchRef?.current === "" || " " !== e.key) &&
									(j.includes(e.key) && C(),
									" " === e.key && e.preventDefault());
							}),
						}),
					}),
				});
			});
		eg.displayName = em;
		var ey = "SelectItemText",
			ew = n.forwardRef((e, o) => {
				const { __scopeSelect: i, className: a, style: s, ...u } = e,
					c = I(ey, i),
					d = ee(ey, i),
					f = ev(ey, i),
					p = H(ey, i),
					[m, h] = n.useState(null),
					v = (0, l.useComposedRefs)(
						o,
						(e) => h(e),
						f.onItemTextChange,
						(e) => d.itemTextRefCallback?.(e, f.value, f.disabled),
					),
					y = m?.textContent,
					w = n.useMemo(
						() =>
							(0, t.jsx)(
								"option",
								{ value: f.value, disabled: f.disabled, children: y },
								f.value,
							),
						[f.disabled, f.value, y],
					),
					{ onNativeOptionAdd: x, onNativeOptionRemove: E } = p;
				return (
					(0, b.useLayoutEffect)(() => (x(w), () => E(w)), [x, E, w]),
					(0, t.jsxs)(t.Fragment, {
						children: [
							(0, t.jsx)(g.Primitive.span, { id: f.textId, ...u, ref: v }),
							f.isSelected &&
							c.valueNode &&
							!c.valueNodeHasChildren &&
							!eT(c.value)
								? r.createPortal(u.children, c.valueNode)
								: null,
						],
					})
				);
			});
		ew.displayName = ey;
		var ex = "SelectItemIndicator",
			eb = n.forwardRef((e, n) => {
				const { __scopeSelect: r, ...o } = e;
				return ev(ex, r).isSelected
					? (0, t.jsx)(g.Primitive.span, { "aria-hidden": !0, ...o, ref: n })
					: null;
			});
		eb.displayName = ex;
		var eE = "SelectScrollUpButton",
			eC = n.forwardRef((e, r) => {
				const o = ee(eE, e.__scopeSelect),
					i = ea(eE, e.__scopeSelect),
					[a, s] = n.useState(!1),
					u = (0, l.useComposedRefs)(r, i.onScrollButtonChange);
				return (
					(0, b.useLayoutEffect)(() => {
						if (o.viewport && o.isPositioned) {
							const e = function () {
									s(t.scrollTop > 0);
								},
								t = o.viewport;
							return (
								e(),
								t.addEventListener("scroll", e),
								() => t.removeEventListener("scroll", e)
							);
						}
					}, [o.viewport, o.isPositioned]),
					a
						? (0, t.jsx)(eP, {
								...e,
								ref: u,
								onAutoScroll: () => {
									const { viewport: e, selectedItem: t } = o;
									e && t && (e.scrollTop = e.scrollTop - t.offsetHeight);
								},
							})
						: null
				);
			});
		eC.displayName = eE;
		var eR = "SelectScrollDownButton",
			eS = n.forwardRef((e, r) => {
				const o = ee(eR, e.__scopeSelect),
					i = ea(eR, e.__scopeSelect),
					[a, s] = n.useState(!1),
					u = (0, l.useComposedRefs)(r, i.onScrollButtonChange);
				return (
					(0, b.useLayoutEffect)(() => {
						if (o.viewport && o.isPositioned) {
							const e = function () {
									const e = t.scrollHeight - t.clientHeight;
									s(Math.ceil(t.scrollTop) < e);
								},
								t = o.viewport;
							return (
								e(),
								t.addEventListener("scroll", e),
								() => t.removeEventListener("scroll", e)
							);
						}
					}, [o.viewport, o.isPositioned]),
					a
						? (0, t.jsx)(eP, {
								...e,
								ref: u,
								onAutoScroll: () => {
									const { viewport: e, selectedItem: t } = o;
									e && t && (e.scrollTop = e.scrollTop + t.offsetHeight);
								},
							})
						: null
				);
			});
		eS.displayName = eR;
		var eP = n.forwardRef((e, r) => {
				const { __scopeSelect: o, onAutoScroll: a, ...l } = e,
					s = ee("SelectScrollButton", o),
					u = n.useRef(null),
					c = A(o),
					d = n.useCallback(() => {
						null !== u.current &&
							(window.clearInterval(u.current), (u.current = null));
					}, []);
				return (
					n.useEffect(() => () => d(), [d]),
					(0, b.useLayoutEffect)(() => {
						const e = c().find((e) => e.ref.current === document.activeElement);
						e?.ref.current?.scrollIntoView({ block: "nearest" });
					}, [c]),
					(0, t.jsx)(g.Primitive.div, {
						"aria-hidden": !0,
						...l,
						ref: r,
						style: { flexShrink: 0, ...l.style },
						onPointerDown: (0, i.composeEventHandlers)(l.onPointerDown, () => {
							null === u.current && (u.current = window.setInterval(a, 50));
						}),
						onPointerMove: (0, i.composeEventHandlers)(l.onPointerMove, () => {
							s.onItemLeave?.(),
								null === u.current && (u.current = window.setInterval(a, 50));
						}),
						onPointerLeave: (0, i.composeEventHandlers)(
							l.onPointerLeave,
							() => {
								d();
							},
						),
					})
				);
			}),
			ej = n.forwardRef((e, n) => {
				const { __scopeSelect: r, ...o } = e;
				return (0, t.jsx)(g.Primitive.div, { "aria-hidden": !0, ...o, ref: n });
			});
		ej.displayName = "SelectSeparator";
		var eN = "SelectArrow";
		n.forwardRef((e, n) => {
			const { __scopeSelect: r, ...o } = e,
				i = L(r);
			return "popper" === ee(eN, r).position
				? (0, t.jsx)(m.Arrow, { ...i, ...o, ref: n })
				: null;
		}).displayName = eN;
		var ek = "SelectBubbleInput",
			eA = n.forwardRef(({ __scopeSelect: e, ...r }, o) => {
				const i = I(ek, e),
					{
						value: a,
						onValueChange: s,
						required: u,
						disabled: c,
						name: d,
						autoComplete: f,
						form: p,
					} = i,
					{ nativeOptions: m, nativeSelectKey: h } = i,
					v = n.useRef(null),
					y = (0, l.useComposedRefs)(o, v),
					w = a ?? "",
					x = (0, E.usePrevious)(w),
					b = Array.from(m).some((e) => (e.props.value ?? "") === "");
				return (
					n.useEffect(() => {
						const e = v.current;
						if (!e) return;
						const t = Object.getOwnPropertyDescriptor(
							window.HTMLSelectElement.prototype,
							"value",
						).set;
						if (x !== w && t) {
							const n = new Event("change", { bubbles: !0 });
							t.call(e, w), e.dispatchEvent(n);
						}
					}, [x, w]),
					(0, t.jsxs)(
						g.Primitive.select,
						{
							"aria-hidden": !0,
							required: u,
							tabIndex: -1,
							name: d,
							autoComplete: f,
							disabled: c,
							form: p,
							onChange: (e) => s(e.target.value),
							...r,
							style: { ...C.VISUALLY_HIDDEN_STYLES, ...r.style },
							ref: y,
							defaultValue: w,
							children: [
								eT(a) && !b ? (0, t.jsx)("option", { value: "" }) : null,
								Array.from(m),
							],
						},
						h,
					)
				);
			});
		function eT(e) {
			return "" === e || void 0 === e;
		}
		function eD(e) {
			const t = (0, w.useCallbackRef)(e),
				r = n.useRef(""),
				o = n.useRef(0),
				i = n.useCallback(
					(e) => {
						const n = r.current + e;
						t(n),
							(function e(t) {
								(r.current = t),
									window.clearTimeout(o.current),
									"" !== t && (o.current = window.setTimeout(() => e(""), 1e3));
							})(n);
					},
					[t],
				),
				a = n.useCallback(() => {
					(r.current = ""), window.clearTimeout(o.current);
				}, []);
			return (
				n.useEffect(() => () => window.clearTimeout(o.current), []), [r, i, a]
			);
		}
		function eO(e, t, n) {
			var r, o;
			let i = t.length > 1 && Array.from(t).every((e) => e === t[0]) ? t[0] : t,
				a = n ? e.indexOf(n) : -1,
				l =
					((r = e),
					(o = Math.max(a, 0)),
					r.map((e, t) => r[(o + t) % r.length]));
			1 === i.length && (l = l.filter((e) => e !== n));
			const s = l.find((e) =>
				e.textValue.toLowerCase().startsWith(i.toLowerCase()),
			);
			return s !== n ? s : void 0;
		}
		eA.displayName = ek;
		var eL = e.i(81799),
			eM = e.i(81),
			eI = e.i(10283);
		const eF = (0, eI.default)("chevrons-up-down", [
				["path", { d: "m7 15 5 5 5-5", key: "1hf1tw" }],
				["path", { d: "m7 9 5-5 5 5", key: "sgt6xg" }],
			]),
			eH = (0, eI.default)("chevron-up", [
				["path", { d: "m18 15-6-6-6 6", key: "153udz" }],
			]);
		var e_ = e.i(49696);
		const eW = n.forwardRef(({ className: e, children: n, ...r }, o) =>
			(0, t.jsxs)(B, {
				ref: o,
				className: (0, e_.cn)(
					"flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
					e,
				),
				...r,
				children: [
					n,
					(0, t.jsx)(K, {
						asChild: !0,
						children: (0, t.jsx)(eF, { className: "size-4 opacity-50" }),
					}),
				],
			}),
		);
		eW.displayName = B.displayName;
		const ez = n.forwardRef(({ className: e, ...n }, r) =>
			(0, t.jsx)(eC, {
				ref: r,
				className: (0, e_.cn)(
					"flex cursor-default items-center justify-center py-1",
					e,
				),
				...n,
				children: (0, t.jsx)(eH, { className: "h-4 w-4" }),
			}),
		);
		ez.displayName = eC.displayName;
		const eB = n.forwardRef(({ className: e, ...n }, r) =>
			(0, t.jsx)(eS, {
				ref: r,
				className: (0, e_.cn)(
					"flex cursor-default items-center justify-center py-1",
					e,
				),
				...n,
				children: (0, t.jsx)(eM.ChevronDown, { className: "h-4 w-4" }),
			}),
		);
		eB.displayName = eS.displayName;
		const eV = n.forwardRef(
			({ className: e, children: n, position: r = "popper", ...o }, i) =>
				(0, t.jsx)(q, {
					children: (0, t.jsxs)(G, {
						ref: i,
						className: (0, e_.cn)(
							"relative z-50 max-h-96 min-w-32 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
							"popper" === r &&
								"data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
							e,
						),
						position: r,
						...o,
						children: [
							(0, t.jsx)(ez, {}),
							(0, t.jsx)(es, {
								className: (0, e_.cn)(
									"p-1",
									"popper" === r &&
										"h-(--radix-select-trigger-height) w-full min-w-(--radix-select-trigger-width)",
								),
								children: n,
							}),
							(0, t.jsx)(eB, {}),
						],
					}),
				}),
		);
		(eV.displayName = G.displayName),
			(n.forwardRef(({ className: e, ...n }, r) =>
				(0, t.jsx)(ep, {
					ref: r,
					className: (0, e_.cn)("px-2 py-1.5 text-sm font-semibold", e),
					...n,
				}),
			).displayName = ep.displayName);
		const eU = n.forwardRef(({ className: e, children: n, ...r }, o) =>
			(0, t.jsxs)(eg, {
				ref: o,
				className: (0, e_.cn)(
					"relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
					e,
				),
				...r,
				children: [
					(0, t.jsx)("span", {
						className:
							"absolute right-2 flex h-3.5 w-3.5 items-center justify-center",
						children: (0, t.jsx)(eb, {
							children: (0, t.jsx)(eL.Check, { className: "h-4 w-4" }),
						}),
					}),
					(0, t.jsx)(ew, { children: n }),
				],
			}),
		);
		(eU.displayName = eg.displayName),
			(n.forwardRef(({ className: e, ...n }, r) =>
				(0, t.jsx)(ej, {
					ref: r,
					className: (0, e_.cn)("-mx-1 my-1 h-px bg-muted", e),
					...n,
				}),
			).displayName = ej.displayName),
			e.s(
				[
					"Select",
					0,
					W,
					"SelectContent",
					0,
					eV,
					"SelectItem",
					0,
					eU,
					"SelectTrigger",
					0,
					eW,
					"SelectValue",
					0,
					U,
				],
				78363,
			);
	},
	18041,
	60167,
	43058,
	(e) => {
		"use strict";
		var t = e.i(10283);
		const n = (0, t.default)("plus", [
			["path", { d: "M5 12h14", key: "1ays0h" }],
			["path", { d: "M12 5v14", key: "s699le" }],
		]);
		e.s(["Plus", 0, n], 18041);
		const r = (0, t.default)("trash", [
			[
				"path",
				{ d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6", key: "miytrc" },
			],
			["path", { d: "M3 6h18", key: "d0wm0j" }],
			["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", key: "e791ji" }],
		]);
		e.s(["Trash", 0, r], 60167);
		var o = e.i(62613),
			i = e.i(49696);
		e.s(
			[
				"Table",
				0,
				function ({ className: e, ...t }) {
					return (0, o.jsx)("div", {
						"data-slot": "table-container",
						className: "relative w-full overflow-x-auto",
						children: (0, o.jsx)("table", {
							"data-slot": "table",
							className: (0, i.cn)("w-full caption-bottom text-sm", e),
							...t,
						}),
					});
				},
				"TableBody",
				0,
				function ({ className: e, ...t }) {
					return (0, o.jsx)("tbody", {
						"data-slot": "table-body",
						className: (0, i.cn)("[&_tr:last-child]:border-0", e),
						...t,
					});
				},
				"TableCell",
				0,
				function ({ className: e, ...t }) {
					return (0, o.jsx)("td", {
						"data-slot": "table-cell",
						className: (0, i.cn)(
							"p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
							e,
						),
						...t,
					});
				},
				"TableHead",
				0,
				function ({ className: e, ...t }) {
					return (0, o.jsx)("th", {
						"data-slot": "table-head",
						className: (0, i.cn)(
							"text-muted-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
							e,
						),
						...t,
					});
				},
				"TableHeader",
				0,
				function ({ className: e, ...t }) {
					return (0, o.jsx)("thead", {
						"data-slot": "table-header",
						className: (0, i.cn)("[&_tr]:border-b", e),
						...t,
					});
				},
				"TableRow",
				0,
				function ({ className: e, ...t }) {
					return (0, o.jsx)("tr", {
						"data-slot": "table-row",
						className: (0, i.cn)(
							"hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
							e,
						),
						...t,
					});
				},
			],
			43058,
		);
	},
]);
