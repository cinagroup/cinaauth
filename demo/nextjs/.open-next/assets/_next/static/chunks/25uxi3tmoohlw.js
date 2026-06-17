(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
	"object" == typeof document ? document.currentScript : void 0,
	28406,
	(e) => {
		"use strict";
		const t = (0, e.i(54762).default)("chevron-down", [
			["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }],
		]);
		e.s(["ChevronDown", 0, t], 28406);
	},
	48799,
	(e) => {
		"use strict";
		var t = e.i(92479),
			n = e.i(41296),
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
	11988,
	(e) => {
		"use strict";
		var t,
			n = e.i(92479),
			r = e.i(21953),
			o = e.i(95353),
			i = e.i(70768),
			a = e.i(40093),
			l = e.i(620),
			s = "dismissableLayer.update",
			c = n.createContext({
				layers: new Set(),
				layersWithOutsidePointerEventsDisabled: new Set(),
				branches: new Set(),
				dismissableSurfaces: new Set(),
			}),
			u = n.forwardRef((e, u) => {
				const {
						disableOutsidePointerEvents: p = !1,
						deferPointerDownOutside: h = !1,
						onEscapeKeyDown: m,
						onPointerDownOutside: v,
						onFocusOutside: g,
						onInteractOutside: y,
						onDismiss: w,
						...x
					} = e,
					b = n.useContext(c),
					[C, E] = n.useState(null),
					R = C?.ownerDocument ?? globalThis?.document,
					[, S] = n.useState({}),
					P = (0, i.useComposedRefs)(u, (e) => E(e)),
					j = Array.from(b.layers),
					[k] = [...b.layersWithOutsidePointerEventsDisabled].slice(-1),
					N = j.indexOf(k),
					A = C ? j.indexOf(C) : -1,
					D = b.layersWithOutsidePointerEventsDisabled.size > 0,
					T = A >= N,
					L = n.useRef(!1),
					O = (function (e, t) {
						const {
								ownerDocument: r = globalThis?.document,
								deferPointerDownOutside: o = !1,
								isDeferredPointerDownOutsideRef: i,
								dismissableSurfaces: l,
							} = t,
							s = (0, a.useCallbackRef)(e),
							c = n.useRef(!1),
							u = n.useRef(!1),
							d = n.useRef(new Map()),
							p = n.useRef(() => {});
						return (
							n.useEffect(() => {
								function e() {
									(u.current = !1), (i.current = !1), d.current.clear();
								}
								function t(e) {
									if (!u.current) return;
									const t = e.target;
									(t instanceof Node && [...l].some((e) => e.contains(t))) ||
										d.current.set(e.type, !0),
										"click" === e.type &&
											window.setTimeout(() => {
												u.current && p.current();
											}, 0);
								}
								function n(e) {
									u.current && d.current.set(e.type, !1);
								}
								const a = (t) => {
										if (t.target && !c.current) {
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
											(u.current = !0),
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
										c.current = !1;
									},
									h = [
										"pointerup",
										"mousedown",
										"mouseup",
										"touchstart",
										"touchend",
										"click",
									];
								for (const e of h)
									r.addEventListener(e, t, !0), r.addEventListener(e, n);
								const m = window.setTimeout(() => {
									r.addEventListener("pointerdown", a);
								}, 0);
								return () => {
									for (const e of (window.clearTimeout(m),
									r.removeEventListener("pointerdown", a),
									r.removeEventListener("click", p.current),
									h))
										r.removeEventListener(e, t, !0),
											r.removeEventListener(e, n);
								};
							}, [r, s, o, i, l]),
							{ onPointerDownCapture: () => (c.current = !0) }
						);
					})(
						(e) => {
							const t = e.target;
							if (!(t instanceof Node)) return;
							const n = [...b.branches].some((e) => e.contains(t));
							T && !n && (v?.(e), y?.(e), e.defaultPrevented || w?.());
						},
						{
							ownerDocument: R,
							deferPointerDownOutside: h,
							isDeferredPointerDownOutsideRef: L,
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
						if (h && L.current) return;
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
							(m?.(e), !e.defaultPrevented && w && (e.preventDefault(), w()));
					}, R),
					n.useEffect(() => {
						if (C)
							return (
								p &&
									(0 === b.layersWithOutsidePointerEventsDisabled.size &&
										((t = R.body.style.pointerEvents),
										(R.body.style.pointerEvents = "none")),
									b.layersWithOutsidePointerEventsDisabled.add(C)),
								b.layers.add(C),
								d(),
								() => {
									p &&
										(b.layersWithOutsidePointerEventsDisabled.delete(C),
										0 === b.layersWithOutsidePointerEventsDisabled.size &&
											(R.body.style.pointerEvents = t));
								}
							);
					}, [C, R, p, b]),
					n.useEffect(
						() => () => {
							C &&
								(b.layers.delete(C),
								b.layersWithOutsidePointerEventsDisabled.delete(C),
								d());
						},
						[C, b],
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
							pointerEvents: D ? (T ? "auto" : "none") : void 0,
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
							O.onPointerDownCapture,
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
		(u.displayName = "DismissableLayer"),
			(n.forwardRef((e, t) => {
				const r = n.useContext(c),
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
					u,
					"useDismissableLayerSurface",
					0,
					function () {
						const e = n.useContext(c),
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
				11988,
			);
	},
	88184,
	(e) => {
		"use strict";
		let t;
		var n = e.i(92479),
			r = e.i(70768),
			o = e.i(95353),
			i = e.i(40093),
			a = e.i(620),
			l = "focusScope.autoFocusOnMount",
			s = "focusScope.autoFocusOnUnmount",
			c = { bubbles: !1, cancelable: !0 },
			u = n.forwardRef((e, t) => {
				const {
						loop: u = !1,
						trapped: m = !1,
						onMountAutoFocus: v,
						onUnmountAutoFocus: g,
						...y
					} = e,
					[w, x] = n.useState(null),
					b = (0, i.useCallbackRef)(v),
					C = (0, i.useCallbackRef)(g),
					E = n.useRef(null),
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
					if (m) {
						const e = function (e) {
								if (S.paused || !w) return;
								const t = e.target;
								w.contains(t) ? (E.current = t) : p(E.current, { select: !0 });
							},
							t = function (e) {
								if (S.paused || !w) return;
								const t = e.relatedTarget;
								null !== t && (w.contains(t) || p(E.current, { select: !0 }));
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
				}, [m, w, S.paused]),
					n.useEffect(() => {
						if (w) {
							h.add(S);
							const e = document.activeElement;
							if (!w.contains(e)) {
								const t = new CustomEvent(l, c);
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
										const t = new CustomEvent(s, c);
										w.addEventListener(s, C),
											w.dispatchEvent(t),
											t.defaultPrevented ||
												p(e ?? document.body, { select: !0 }),
											w.removeEventListener(s, C),
											h.remove(S);
									}, 0);
							};
						}
					}, [w, b, C, S]);
				const P = n.useCallback(
					(e) => {
						if ((!u && !m) || S.paused) return;
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
										(e.preventDefault(), u && p(a, { select: !0 }))
									: (e.preventDefault(), u && p(i, { select: !0 }))
								: n === o && e.preventDefault();
						}
					},
					[u, m, S.paused],
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
		u.displayName = "FocusScope";
		var h =
			((t = []),
			{
				add(e) {
					const n = t[0];
					e !== n && n?.pause(), (t = m(t, e)).unshift(e);
				},
				remove(e) {
					(t = m(t, e)), t[0]?.resume();
				},
			});
		function m(e, t) {
			const n = [...e],
				r = n.indexOf(t);
			return -1 !== r && n.splice(r, 1), n;
		}
		e.s(["FocusScope", 0, u]);
	},
	74701,
	(e) => {
		"use strict";
		var t = e.i(92479),
			n = e.i(93908),
			r = e.i(95353),
			o = e.i(41296),
			i = e.i(620),
			a = t.forwardRef((e, a) => {
				const { container: l, ...s } = e,
					[c, u] = t.useState(!1);
				(0, o.useLayoutEffect)(() => u(!0), []);
				const d = l || (c && globalThis?.document?.body);
				return d
					? n.createPortal((0, i.jsx)(r.Primitive.div, { ...s, ref: a }), d)
					: null;
			});
		(a.displayName = "Portal"), e.s(["Portal", 0, a]);
	},
	20209,
	7057,
	21647,
	65999,
	10584,
	(e) => {
		"use strict";
		var t,
			n,
			r,
			o,
			i,
			a,
			l,
			s = e.i(620),
			c = e.i(92479),
			u = e.i(21953),
			d = e.i(70768),
			f = e.i(44240),
			p = e.i(48799),
			h = e.i(39304),
			m = e.i(11988),
			v = e.i(88184),
			g = e.i(74701),
			y = e.i(7868),
			w = e.i(95353),
			x = 0,
			b = null;
		function C() {
			c.useEffect(() => {
				b || (b = { start: E(), end: E() });
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
		function E() {
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
		e.s(["useFocusGuards", 0, C], 7057);
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
		function k(e, t) {
			return "function" == typeof e ? e(t) : e && (e.current = t), e;
		}
		var N = "u" > typeof window ? c.useLayoutEffect : c.useEffect,
			A = new WeakMap(),
			D =
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
			T = function () {},
			L = c.forwardRef(function (e, t) {
				var n,
					r,
					o,
					i,
					a = c.useRef(null),
					l = c.useState({
						onScrollCapture: T,
						onWheelCapture: T,
						onTouchMoveCapture: T,
					}),
					s = l[0],
					u = l[1],
					d = e.forwardProps,
					f = e.children,
					p = e.className,
					h = e.removeScrollBar,
					m = e.enabled,
					v = e.shards,
					g = e.sideCar,
					y = e.noRelative,
					w = e.noIsolation,
					x = e.inert,
					b = e.allowPinchZoom,
					C = e.as,
					E = e.gapMode,
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
								return k(t, e);
							});
						}),
						((o = (0, c.useState)(function () {
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
						N(
							function () {
								var e = A.get(i);
								if (e) {
									var t = new Set(e),
										r = new Set(n),
										o = i.current;
									t.forEach(function (e) {
										r.has(e) || k(e, null);
									}),
										r.forEach(function (e) {
											t.has(e) || k(e, o);
										});
								}
								A.set(i, n);
							},
							[n],
						),
						i),
					L = R(R({}, P), s);
				return c.createElement(
					c.Fragment,
					null,
					m &&
						c.createElement(g, {
							sideCar: D,
							removeScrollBar: h,
							shards: v,
							noRelative: y,
							noIsolation: w,
							inert: x,
							setCallbacks: u,
							allowPinchZoom: !!b,
							lockRef: a,
							gapMode: E,
						}),
					d
						? c.cloneElement(c.Children.only(f), R(R({}, L), { ref: j }))
						: c.createElement(
								void 0 === C ? "div" : C,
								R({}, L, { className: p, ref: j }),
								f,
							),
				);
			});
		(L.defaultProps = { enabled: !0, removeScrollBar: !0, inert: !1 }),
			(L.classNames = { fullWidth: j, zeroRight: P });
		var O = function (e) {
			var t = e.sideCar,
				n = S(e, ["sideCar"]);
			if (!t)
				throw Error(
					"Sidecar: please provide `sideCar` property to import the right car",
				);
			var r = t.read();
			if (!r) throw Error("Sidecar medium not found");
			return c.createElement(r, R({}, n));
		};
		O.isSideCarExport = !0;
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
					c.useEffect(
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
			K = function (e, t, n, r) {
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
			$ = function () {
				var e = parseInt(document.body.getAttribute(V) || "0", 10);
				return isFinite(e) ? e : 0;
			},
			U = function () {
				c.useEffect(function () {
					return (
						document.body.setAttribute(V, ($() + 1).toString()),
						function () {
							var e = $() - 1;
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
				U();
				var i = c.useMemo(
					function () {
						return z(o);
					},
					[o],
				);
				return c.createElement(B, {
					styles: K(i, !t, o, n ? "" : "!important"),
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
					c = t.contains(s),
					u = !1,
					d = l > 0,
					f = 0,
					p = 0;
				do {
					if (!s) break;
					var h = ee(e, s),
						m = h[0],
						v = h[1] - h[2] - a * m;
					(m || v) && Q(e, s) && ((f += v), (p += m));
					var g = s.parentNode;
					s = g && g.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? g.host : g;
				} while (
					(!c && s !== document.body) ||
					(c && (t.contains(s) || t === s))
				);
				return (
					d && ((o && 1 > Math.abs(f)) || (!o && l > f))
						? (u = !0)
						: !d && ((o && 1 > Math.abs(p)) || (!o && -l > p)) && (u = !0),
					u
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
				var t = c.useRef([]),
					n = c.useRef([0, 0]),
					r = c.useRef(),
					o = c.useState(ei++)[0],
					i = c.useState(F)[0],
					a = c.useRef(e);
				c.useEffect(
					function () {
						a.current = e;
					},
					[e],
				),
					c.useEffect(
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
				var l = c.useCallback(function (e, t) {
						if (
							("touches" in e && 2 === e.touches.length) ||
							("wheel" === e.type && e.ctrlKey)
						)
							return !a.current.allowPinchZoom;
						var o,
							i = en(e),
							l = n.current,
							s = "deltaX" in e ? e.deltaX : l[0] - i[0],
							c = "deltaY" in e ? e.deltaY : l[1] - i[1],
							u = e.target,
							d = Math.abs(s) > Math.abs(c) ? "h" : "v";
						if ("touches" in e && "h" === d && "range" === u.type) return !1;
						var f = window.getSelection(),
							p = f && f.anchorNode;
						if (p && (p === u || p.contains(u))) return !1;
						var h = J(d, u);
						if (!h) return !0;
						if (
							(h ? (o = d) : ((o = "v" === d ? "h" : "v"), (h = J(d, u))), !h)
						)
							return !1;
						if (
							(!r.current &&
								"changedTouches" in e &&
								(s || c) &&
								(r.current = o),
							!o)
						)
							return !0;
						var m = r.current || o;
						return et(m, t, e, "h" === m ? s : c, !0);
					}, []),
					s = c.useCallback(function (e) {
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
					u = c.useCallback(function (e, n, r, o) {
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
					d = c.useCallback(function (e) {
						(n.current = en(e)), (r.current = void 0);
					}, []),
					f = c.useCallback(function (t) {
						u(t.type, er(t), t.target, l(t, e.lockRef.current));
					}, []),
					p = c.useCallback(function (t) {
						u(t.type, en(t), t.target, l(t, e.lockRef.current));
					}, []);
				c.useEffect(function () {
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
				var h = e.removeScrollBar,
					m = e.inert;
				return c.createElement(
					c.Fragment,
					null,
					m
						? c.createElement(i, {
								styles: "\n  .block-interactivity-"
									.concat(
										o,
										" {pointer-events: none;}\n  .allow-interactivity-",
									)
									.concat(o, " {pointer-events: all;}\n"),
							})
						: null,
					h
						? c.createElement(Y, {
								noRelative: e.noRelative,
								gapMode: e.gapMode,
							})
						: null,
				);
			}),
			D.useMedium(a),
			O);
		var es = c.forwardRef(function (e, t) {
			return c.createElement(L, R({}, e, { ref: t, sideCar: el }));
		});
		(es.classNames = L.classNames), e.s(["RemoveScroll", 0, es], 21647);
		var ec = new WeakMap(),
			eu = new WeakMap(),
			ed = {},
			ef = 0,
			ep = function (e) {
				return e && (e.host || ep(e.parentNode));
			},
			eh = function (e, t, n, r) {
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
					c = function (e) {
						!e || l.has(e) || (l.add(e), c(e.parentNode));
					};
				o.forEach(c);
				var u = function (e) {
					!e ||
						s.has(e) ||
						Array.prototype.forEach.call(e.children, function (e) {
							if (l.has(e)) u(e);
							else
								try {
									var t = e.getAttribute(r),
										o = null !== t && "false" !== t,
										s = (ec.get(e) || 0) + 1,
										c = (i.get(e) || 0) + 1;
									ec.set(e, s),
										i.set(e, c),
										a.push(e),
										1 === s && o && eu.set(e, !0),
										1 === c && e.setAttribute(n, "true"),
										o || e.setAttribute(r, "true");
								} catch (t) {
									console.error("aria-hidden: cannot operate on ", e, t);
								}
						});
				};
				return (
					u(t),
					l.clear(),
					ef++,
					function () {
						a.forEach(function (e) {
							var t = ec.get(e) - 1,
								o = i.get(e) - 1;
							ec.set(e, t),
								i.set(e, o),
								t || (eu.has(e) || e.removeAttribute(r), eu.delete(e)),
								o || e.removeAttribute(n);
						}),
							--ef ||
								((ec = new WeakMap()),
								(ec = new WeakMap()),
								(eu = new WeakMap()),
								(ed = {}));
					}
				);
			},
			em = function (e, t, n) {
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
						eh(r, o, n, "aria-hidden"))
					: function () {
							return null;
						};
			};
		e.s(["hideOthers", 0, em], 65999);
		var ev = e.i(62910),
			eg = "Dialog",
			[ey, ew] = (0, f.createContextScope)(eg),
			[ex, eb] = ey(eg),
			eC = (e) => {
				const {
						__scopeDialog: t,
						children: n,
						open: r,
						defaultOpen: o,
						onOpenChange: i,
						modal: a = !0,
					} = e,
					l = c.useRef(null),
					u = c.useRef(null),
					[d, f] = (0, h.useControllableState)({
						prop: r,
						defaultProp: o ?? !1,
						onChange: i,
						caller: eg,
					});
				return (0, s.jsx)(ex, {
					scope: t,
					triggerRef: l,
					contentRef: u,
					contentId: (0, p.useId)(),
					titleId: (0, p.useId)(),
					descriptionId: (0, p.useId)(),
					open: d,
					onOpenChange: f,
					onOpenToggle: c.useCallback(() => f((e) => !e), [f]),
					modal: a,
					children: n,
				});
			};
		eC.displayName = eg;
		var eE = "DialogTrigger",
			eR = c.forwardRef((e, t) => {
				const { __scopeDialog: n, ...r } = e,
					o = eb(eE, n),
					i = (0, d.useComposedRefs)(t, o.triggerRef);
				return (0, s.jsx)(w.Primitive.button, {
					type: "button",
					"aria-haspopup": "dialog",
					"aria-expanded": o.open,
					"aria-controls": o.open ? o.contentId : void 0,
					"data-state": eK(o.open),
					...r,
					ref: i,
					onClick: (0, u.composeEventHandlers)(e.onClick, o.onOpenToggle),
				});
			});
		eR.displayName = eE;
		var eS = "DialogPortal",
			[eP, ej] = ey(eS, { forceMount: void 0 }),
			ek = (e) => {
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
					children: c.Children.map(r, (e) =>
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
		ek.displayName = eS;
		var eN = "DialogOverlay",
			eA = c.forwardRef((e, t) => {
				const n = ej(eN, e.__scopeDialog),
					{ forceMount: r = n.forceMount, ...o } = e,
					i = eb(eN, e.__scopeDialog);
				return i.modal
					? (0, s.jsx)(y.Presence, {
							present: r || i.open,
							children: (0, s.jsx)(eT, { ...o, ref: t }),
						})
					: null;
			});
		eA.displayName = eN;
		var eD = (0, ev.createSlot)("DialogOverlay.RemoveScroll"),
			eT = c.forwardRef((e, t) => {
				const { __scopeDialog: n, ...r } = e,
					o = eb(eN, n),
					i = (0, m.useDismissableLayerSurface)(),
					a = (0, d.useComposedRefs)(t, i);
				return (0, s.jsx)(es, {
					as: eD,
					allowPinchZoom: !0,
					shards: [o.contentRef],
					children: (0, s.jsx)(w.Primitive.div, {
						"data-state": eK(o.open),
						...r,
						ref: a,
						style: { pointerEvents: "auto", ...r.style },
					}),
				});
			}),
			eL = "DialogContent",
			eO = c.forwardRef((e, t) => {
				const n = ej(eL, e.__scopeDialog),
					{ forceMount: r = n.forceMount, ...o } = e,
					i = eb(eL, e.__scopeDialog);
				return (0, s.jsx)(y.Presence, {
					present: r || i.open,
					children: i.modal
						? (0, s.jsx)(eM, { ...o, ref: t })
						: (0, s.jsx)(eI, { ...o, ref: t }),
				});
			});
		eO.displayName = eL;
		var eM = c.forwardRef((e, t) => {
				const n = eb(eL, e.__scopeDialog),
					r = c.useRef(null),
					o = (0, d.useComposedRefs)(t, n.contentRef, r);
				return (
					c.useEffect(() => {
						const e = r.current;
						if (e) return em(e);
					}, []),
					(0, s.jsx)(eF, {
						...e,
						ref: o,
						trapFocus: n.open,
						disableOutsidePointerEvents: n.open,
						onCloseAutoFocus: (0, u.composeEventHandlers)(
							e.onCloseAutoFocus,
							(e) => {
								e.preventDefault(), n.triggerRef.current?.focus();
							},
						),
						onPointerDownOutside: (0, u.composeEventHandlers)(
							e.onPointerDownOutside,
							(e) => {
								const t = e.detail.originalEvent,
									n = 0 === t.button && !0 === t.ctrlKey;
								(2 === t.button || n) && e.preventDefault();
							},
						),
						onFocusOutside: (0, u.composeEventHandlers)(e.onFocusOutside, (e) =>
							e.preventDefault(),
						),
					})
				);
			}),
			eI = c.forwardRef((e, t) => {
				const n = eb(eL, e.__scopeDialog),
					r = c.useRef(!1),
					o = c.useRef(!1);
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
			eF = c.forwardRef((e, t) => {
				const {
						__scopeDialog: n,
						trapFocus: r,
						onOpenAutoFocus: o,
						onCloseAutoFocus: i,
						...a
					} = e,
					l = eb(eL, n);
				return (
					C(),
					(0, s.jsx)(s.Fragment, {
						children: (0, s.jsx)(v.FocusScope, {
							asChild: !0,
							loop: !0,
							trapped: r,
							onMountAutoFocus: o,
							onUnmountAutoFocus: i,
							children: (0, s.jsx)(m.DismissableLayer, {
								role: "dialog",
								id: l.contentId,
								"aria-describedby": l.descriptionId,
								"aria-labelledby": l.titleId,
								"data-state": eK(l.open),
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
			e_ = c.forwardRef((e, t) => {
				const { __scopeDialog: n, ...r } = e,
					o = eb(eH, n);
				return (0, s.jsx)(w.Primitive.h2, { id: o.titleId, ...r, ref: t });
			});
		e_.displayName = eH;
		var eW = "DialogDescription",
			ez = c.forwardRef((e, t) => {
				const { __scopeDialog: n, ...r } = e,
					o = eb(eW, n);
				return (0, s.jsx)(w.Primitive.p, { id: o.descriptionId, ...r, ref: t });
			});
		ez.displayName = eW;
		var eB = "DialogClose",
			eV = c.forwardRef((e, t) => {
				const { __scopeDialog: n, ...r } = e,
					o = eb(eB, n);
				return (0, s.jsx)(w.Primitive.button, {
					type: "button",
					...r,
					ref: t,
					onClick: (0, u.composeEventHandlers)(e.onClick, () =>
						o.onOpenChange(!1),
					),
				});
			});
		function eK(e) {
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
					eO,
					"Description",
					0,
					ez,
					"Overlay",
					0,
					eA,
					"Portal",
					0,
					ek,
					"Root",
					0,
					eC,
					"Title",
					0,
					e_,
					"Trigger",
					0,
					eR,
				],
				10584,
			);
		var e$ = e.i(82265),
			eU = e.i(13732);
		function eY({ ...e }) {
			return (0, s.jsx)(ek, { "data-slot": "dialog-portal", ...e });
		}
		function eX({ className: e, ...t }) {
			return (0, s.jsx)(eA, {
				"data-slot": "dialog-overlay",
				className: (0, eU.cn)(
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
					return (0, s.jsx)(eC, { "data-slot": "dialog", ...e });
				},
				"DialogContent",
				0,
				function ({ className: e, children: t, ...n }) {
					return (0, s.jsxs)(eY, {
						"data-slot": "dialog-portal",
						children: [
							(0, s.jsx)(eX, {}),
							(0, s.jsxs)(eO, {
								"data-slot": "dialog-content",
								className: (0, eU.cn)(
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
											(0, s.jsx)(e$.XIcon, {}),
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
						className: (0, eU.cn)("text-muted-foreground text-sm", e),
						...t,
					});
				},
				"DialogFooter",
				0,
				function ({ className: e, ...t }) {
					return (0, s.jsx)("div", {
						"data-slot": "dialog-footer",
						className: (0, eU.cn)(
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
						className: (0, eU.cn)(
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
						className: (0, eU.cn)("text-lg leading-none font-semibold", e),
						...t,
					});
				},
				"DialogTrigger",
				0,
				function ({ ...e }) {
					return (0, s.jsx)(eR, { "data-slot": "dialog-trigger", ...e });
				},
			],
			20209,
		);
	},
	65357,
	(e) => {
		"use strict";
		let t;
		var n = e.i(92479);
		const r = ["top", "right", "bottom", "left"],
			o = Math.min,
			i = Math.max,
			a = Math.round,
			l = Math.floor,
			s = (e) => ({ x: e, y: e }),
			c = { left: "right", right: "left", bottom: "top", top: "bottom" };
		function u(e, t) {
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
		function h(e) {
			return "y" === e ? "height" : "width";
		}
		function m(e) {
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
			return c[t] + e.slice(t.length);
		}
		function C(e) {
			return "number" != typeof e
				? { top: 0, right: 0, bottom: 0, left: 0, ...e }
				: { top: e, right: e, bottom: e, left: e };
		}
		function E(e) {
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
				a = m(t),
				l = p(m(t)),
				s = h(l),
				c = d(t),
				u = "y" === a,
				v = o.x + o.width / 2 - i.width / 2,
				g = o.y + o.height / 2 - i.height / 2,
				y = o[s] / 2 - i[s] / 2;
			switch (c) {
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
					r[l] -= y * (n && u ? -1 : 1);
					break;
				case "end":
					r[l] += y * (n && u ? -1 : 1);
			}
			return r;
		}
		async function S(e, t) {
			var n;
			void 0 === t && (t = {});
			const { x: r, y: o, platform: i, rects: a, elements: l, strategy: s } = e,
				{
					boundary: c = "clippingAncestors",
					rootBoundary: d = "viewport",
					elementContext: f = "floating",
					altBoundary: p = !1,
					padding: h = 0,
				} = u(t, e),
				m = C(h),
				v = l[p ? ("floating" === f ? "reference" : "floating") : f],
				g = E(
					await i.getClippingRect({
						element:
							null ==
								(n = await (null == i.isElement ? void 0 : i.isElement(v))) || n
								? v
								: v.contextElement ||
									(await (null == i.getDocumentElement
										? void 0
										: i.getDocumentElement(l.floating))),
						boundary: c,
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
				b = E(
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
				top: (g.top - b.top + m.top) / x.y,
				bottom: (b.bottom - g.bottom + m.bottom) / x.y,
				left: (g.left - b.left + m.left) / x.x,
				right: (b.right - g.right + m.right) / x.x,
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
				c = await a.getElementRects({ reference: e, floating: t, strategy: o }),
				{ x: u, y: d } = R(c, r, s),
				f = r,
				p = 0,
				h = {};
			for (let n = 0; n < i.length; n++) {
				const m = i[n];
				if (!m) continue;
				const { name: v, fn: g } = m,
					{
						x: y,
						y: w,
						data: x,
						reset: b,
					} = await g({
						x: u,
						y: d,
						initialPlacement: r,
						placement: f,
						strategy: o,
						middlewareData: h,
						rects: c,
						platform: l,
						elements: { reference: e, floating: t },
					});
				(u = null != y ? y : u),
					(d = null != w ? w : d),
					(h[v] = { ...h[v], ...x }),
					b &&
						p < 50 &&
						(p++,
						"object" == typeof b &&
							(b.placement && (f = b.placement),
							b.rects &&
								(c =
									!0 === b.rects
										? await a.getElementRects({
												reference: e,
												floating: t,
												strategy: o,
											})
										: b.rects),
							({ x: u, y: d } = R(c, f, s))),
						(n = -1));
			}
			return { x: u, y: d, placement: f, strategy: o, middlewareData: h };
		};
		function j(e, t) {
			return {
				top: e.top - t.height,
				right: e.right - t.width,
				bottom: e.bottom - t.height,
				left: e.left - t.width,
			};
		}
		function k(e) {
			return r.some((t) => e[t] >= 0);
		}
		const N = new Set(["left", "top"]);
		async function A(e, t) {
			let { placement: n, platform: r, elements: o } = e,
				i = await (null == r.isRTL ? void 0 : r.isRTL(o.floating)),
				a = d(n),
				l = f(n),
				s = "y" === m(n),
				c = N.has(a) ? -1 : 1,
				p = i && s ? -1 : 1,
				h = u(t, e),
				{
					mainAxis: v,
					crossAxis: g,
					alignmentAxis: y,
				} = "number" == typeof h
					? { mainAxis: h, crossAxis: 0, alignmentAxis: null }
					: {
							mainAxis: h.mainAxis || 0,
							crossAxis: h.crossAxis || 0,
							alignmentAxis: h.alignmentAxis,
						};
			return (
				l && "number" == typeof y && (g = "end" === l ? -1 * y : y),
				s ? { x: g * p, y: v * c } : { x: v * c, y: g * p }
			);
		}
		function D() {
			return "u" > typeof window;
		}
		function T(e) {
			return M(e) ? (e.nodeName || "").toLowerCase() : "#document";
		}
		function L(e) {
			var t;
			return (
				(null == e || null == (t = e.ownerDocument) ? void 0 : t.defaultView) ||
				window
			);
		}
		function O(e) {
			var t;
			return null ==
				(t = (M(e) ? e.ownerDocument : e.document) || window.document)
				? void 0
				: t.documentElement;
		}
		function M(e) {
			return !!D() && (e instanceof Node || e instanceof L(e).Node);
		}
		function I(e) {
			return !!D() && (e instanceof Element || e instanceof L(e).Element);
		}
		function F(e) {
			return (
				!!D() && (e instanceof HTMLElement || e instanceof L(e).HTMLElement)
			);
		}
		function H(e) {
			return (
				!(!D() || "u" < typeof ShadowRoot) &&
				(e instanceof ShadowRoot || e instanceof L(e).ShadowRoot)
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
		function K(e) {
			const t = I(e) ? Y(e) : e;
			return (
				V(t.transform) ||
				V(t.translate) ||
				V(t.scale) ||
				V(t.rotate) ||
				V(t.perspective) ||
				(!$() && (V(t.backdropFilter) || V(t.filter))) ||
				z.test(t.willChange || "") ||
				B.test(t.contain || "")
			);
		}
		function $() {
			return (
				null == t &&
					(t =
						"u" > typeof CSS &&
						CSS.supports &&
						CSS.supports("-webkit-backdrop-filter", "none")),
				t
			);
		}
		function U(e) {
			return /^(html|body|#document)$/.test(T(e));
		}
		function Y(e) {
			return L(e).getComputedStyle(e);
		}
		function X(e) {
			return I(e)
				? { scrollLeft: e.scrollLeft, scrollTop: e.scrollTop }
				: { scrollLeft: e.scrollX, scrollTop: e.scrollY };
		}
		function q(e) {
			if ("html" === T(e)) return e;
			const t = e.assignedSlot || e.parentNode || (H(e) && e.host) || O(e);
			return H(t) ? t.host : t;
		}
		function Z(e, t, n) {
			var r;
			void 0 === t && (t = []), void 0 === n && (n = !0);
			const o = (function e(t) {
					const n = q(t);
					return U(n)
						? t.ownerDocument
							? t.ownerDocument.body
							: t.body
						: F(n) && _(n)
							? n
							: e(n);
				})(e),
				i = o === (null == (r = e.ownerDocument) ? void 0 : r.body),
				a = L(o);
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
				c = (i ? a(n.height) : n.height) / o;
			return (
				(l && Number.isFinite(l)) || (l = 1),
				(c && Number.isFinite(c)) || (c = 1),
				{ x: l, y: c }
			);
		}
		const et = s(0);
		function en(e) {
			const t = L(e);
			return $() && t.visualViewport
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
			let c = (void 0 === (o = n) && (o = !1), r && (!o || r === L(a)) && o)
					? en(a)
					: s(0),
				u = (i.left + c.x) / l.x,
				d = (i.top + c.y) / l.y,
				f = i.width / l.x,
				p = i.height / l.y;
			if (a) {
				let e = L(a),
					t = r && I(r) ? L(r) : r,
					n = e,
					o = G(n);
				for (; o && r && t !== n; ) {
					const e = ee(o),
						t = o.getBoundingClientRect(),
						r = Y(o),
						i = t.left + (o.clientLeft + parseFloat(r.paddingLeft)) * e.x,
						a = t.top + (o.clientTop + parseFloat(r.paddingTop)) * e.y;
					(u *= e.x),
						(d *= e.y),
						(f *= e.x),
						(p *= e.y),
						(u += i),
						(d += a),
						(o = G((n = L(o))));
				}
			}
			return E({ width: f, height: p, x: u, y: d });
		}
		function eo(e, t) {
			const n = X(e).scrollLeft;
			return t ? t.left + n : er(O(e)).left + n;
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
					let n = L(e),
						r = O(e),
						o = n.visualViewport,
						i = r.clientWidth,
						a = r.clientHeight,
						l = 0,
						s = 0;
					if (o) {
						(i = o.width), (a = o.height);
						const e = $();
						(!e || (e && "fixed" === t)) &&
							((l = o.offsetLeft), (s = o.offsetTop));
					}
					const c = eo(r);
					if (c <= 0) {
						const e = r.ownerDocument,
							t = e.body,
							n = getComputedStyle(t),
							o =
								("CSS1Compat" === e.compatMode &&
									parseFloat(n.marginLeft) + parseFloat(n.marginRight)) ||
								0,
							a = Math.abs(r.clientWidth - t.clientWidth - o);
						a <= 25 && (i -= a);
					} else c <= 25 && (i += c);
					return { width: i, height: a, x: l, y: s };
				})(e, n);
			else if ("document" === t) {
				let t, n, a, l, s, c, u;
				(r = O(e)),
					(t = O(r)),
					(n = X(r)),
					(a = r.ownerDocument.body),
					(l = i(t.scrollWidth, t.clientWidth, a.scrollWidth, a.clientWidth)),
					(s = i(
						t.scrollHeight,
						t.clientHeight,
						a.scrollHeight,
						a.clientHeight,
					)),
					(c = -n.scrollLeft + eo(r)),
					(u = -n.scrollTop),
					"rtl" === Y(a).direction &&
						(c += i(t.clientWidth, a.clientWidth) - l),
					(o = { width: l, height: s, x: c, y: u });
			} else if (I(t)) {
				let e, r, i, a, l, c;
				(r = (e = er(t, !0, "fixed" === n)).top + t.clientTop),
					(i = e.left + t.clientLeft),
					(a = F(t) ? ee(t) : s(1)),
					(l = t.clientWidth * a.x),
					(c = t.clientHeight * a.y),
					(o = { width: l, height: c, x: i * a.x, y: r * a.y });
			} else {
				const n = en(e);
				o = { x: t.x - n.x, y: t.y - n.y, width: t.width, height: t.height };
			}
			return E(o);
		}
		function el(e) {
			return "static" === Y(e).position;
		}
		function es(e, t) {
			if (!F(e) || "fixed" === Y(e).position) return null;
			if (t) return t(e);
			let n = e.offsetParent;
			return O(e) === n && (n = n.ownerDocument.body), n;
		}
		function ec(e, t) {
			var n;
			const r = L(e);
			if (W(e)) return r;
			if (!F(e)) {
				let t = q(e);
				for (; t && !U(t); ) {
					if (I(t) && !el(t)) return t;
					t = q(t);
				}
				return r;
			}
			let o = es(e, t);
			for (; o && ((n = o), /^(table|td|th)$/.test(T(n))) && el(o); )
				o = es(o, t);
			return o && U(o) && el(o) && !K(o)
				? r
				: o ||
						(function (e) {
							let t = q(e);
							for (; F(t) && !U(t); ) {
								if (K(t)) return t;
								if (W(t)) break;
								t = q(t);
							}
							return null;
						})(e) ||
						r;
		}
		const eu = async function (e) {
				const t = this.getOffsetParent || ec,
					n = this.getDimensions,
					r = await n(e.floating);
				return {
					reference: (function (e, t, n) {
						let r = F(t),
							o = O(t),
							i = "fixed" === n,
							a = er(e, !0, i, t),
							l = { scrollLeft: 0, scrollTop: 0 },
							c = s(0);
						if (r || (!r && !i))
							if ((("body" !== T(t) || _(o)) && (l = X(t)), r)) {
								const e = er(t, !0, i, t);
								(c.x = e.x + t.clientLeft), (c.y = e.y + t.clientTop);
							} else o && (c.x = eo(o));
						i && !r && o && (c.x = eo(o));
						const u = !o || r || i ? s(0) : ei(o, l);
						return {
							x: a.left + l.scrollLeft - c.x - u.x,
							y: a.top + l.scrollTop - c.y - u.y,
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
						a = O(r),
						l = !!t && W(t.floating);
					if (r === a || (l && i)) return n;
					let c = { scrollLeft: 0, scrollTop: 0 },
						u = s(1),
						d = s(0),
						f = F(r);
					if (
						(f || (!f && !i)) &&
						(("body" !== T(r) || _(a)) && (c = X(r)), f)
					) {
						const e = er(r);
						(u = ee(r)), (d.x = e.x + r.clientLeft), (d.y = e.y + r.clientTop);
					}
					const p = !a || f || i ? s(0) : ei(a, c);
					return {
						width: n.width * u.x,
						height: n.height * u.y,
						x: n.x * u.x - c.scrollLeft * u.x + d.x + p.x,
						y: n.y * u.y - c.scrollTop * u.y + d.y + p.y,
					};
				},
				getDocumentElement: O,
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
													(e) => I(e) && "body" !== T(e),
												),
												o = null,
												i = "fixed" === Y(e).position,
												a = i ? q(e) : e;
											for (; I(a) && !U(a); ) {
												const t = Y(a),
													n = K(a);
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
																				!(r === n || !I(r) || U(r)) &&
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
						c = s.top,
						u = s.right,
						d = s.bottom,
						f = s.left;
					for (let e = 1; e < l.length; e++) {
						const n = ea(t, l[e], a);
						(c = i(n.top, c)),
							(u = o(n.right, u)),
							(d = o(n.bottom, d)),
							(f = i(n.left, f));
					}
					return { width: u - f, height: d - c, x: f, y: c };
				},
				getOffsetParent: ec,
				getElementRects: eu,
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
						elements: c,
						middlewareData: d,
					} = t,
					{ element: v, padding: g = 0 } = u(e, t) || {};
				if (null == v) return {};
				let y = C(g),
					w = { x: n, y: r },
					x = p(m(a)),
					b = h(x),
					E = await s.getDimensions(v),
					R = "y" === x,
					S = R ? "clientHeight" : "clientWidth",
					P = l.reference[b] + l.reference[x] - w[x] - l.floating[b],
					j = w[x] - l.reference[x],
					k = await (null == s.getOffsetParent ? void 0 : s.getOffsetParent(v)),
					N = k ? k[S] : 0;
				(N && (await (null == s.isElement ? void 0 : s.isElement(k)))) ||
					(N = c.floating[S] || l.floating[b]);
				const A = N / 2 - E[b] / 2 - 1,
					D = o(y[R ? "top" : "left"], A),
					T = o(y[R ? "bottom" : "right"], A),
					L = N - E[b] - T,
					O = N / 2 - E[b] / 2 + (P / 2 - j / 2),
					M = i(D, o(O, L)),
					I =
						!d.arrow &&
						null != f(a) &&
						O !== M &&
						l.reference[b] / 2 - (O < D ? D : T) - E[b] / 2 < 0,
					F = I ? (O < D ? O - D : O - L) : 0;
				return {
					[x]: w[x] + F,
					data: {
						[x]: M,
						centerOffset: O - M - F,
						...(I && { alignmentOffset: F }),
					},
					reset: I,
				};
			},
		});
		var eh = e.i(93908),
			em = "u" > typeof document ? n.useLayoutEffect : function () {};
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
				em(() => {
					t.current = e;
				}),
				t
			);
		}
		var ex = e.i(95353),
			eb = e.i(620),
			eC = n.forwardRef((e, t) => {
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
		eC.displayName = "Arrow";
		var eE = e.i(70768),
			eR = e.i(44240),
			eS = e.i(40093),
			eP = e.i(41296),
			ej = e.i(21883),
			ek = "Popper",
			[eN, eA] = (0, eR.createContextScope)(ek),
			[eD, eT] = eN(ek),
			eL = (e) => {
				const { __scopePopper: t, children: r } = e,
					[o, i] = n.useState(null),
					[a, l] = n.useState(void 0);
				return (0, eb.jsx)(eD, {
					scope: t,
					anchor: o,
					onAnchorChange: i,
					placementState: a,
					setPlacementState: l,
					children: r,
				});
			};
		eL.displayName = ek;
		var eO = "PopperAnchor",
			eM = n.forwardRef((e, t) => {
				const { __scopePopper: r, virtualRef: o, ...i } = e,
					a = eT(eO, r),
					l = n.useRef(null),
					s = a.onAnchorChange,
					c = n.useCallback(
						(e) => {
							(l.current = e), e && s(e);
						},
						[s],
					),
					u = (0, eE.useComposedRefs)(t, c),
					d = n.useRef(null);
				n.useEffect(() => {
					if (!o) return;
					const e = d.current;
					(d.current = o.current), e !== d.current && s(d.current);
				});
				const f = a.placementState && e$(a.placementState),
					p = f?.[0],
					h = f?.[1];
				return o
					? null
					: (0, eb.jsx)(ex.Primitive.div, {
							"data-radix-popper-side": p,
							"data-radix-popper-align": h,
							...i,
							ref: u,
						});
			});
		eM.displayName = eO;
		var eI = "PopperContent",
			[eF, eH] = eN(eI),
			e_ = n.forwardRef((e, t) => {
				var r, a, s, c, C, E, R, S, D, T, L, M, I, F, H, _, W, z, B, V, K;
				let $,
					U,
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
						sticky: ec = "partial",
						hideWhenDetached: eu = !1,
						updatePositionStrategy: eC = "optimized",
						onPlaced: eR,
						...ek
					} = e,
					eN = eT(eI, J),
					[eA, eD] = n.useState(null),
					eL = (0, eE.useComposedRefs)(t, (e) => eD(e)),
					[eO, eM] = n.useState(null),
					eH = (0, ej.useSize)(eO),
					e_ = eH?.width ?? 0,
					eW = eH?.height ?? 0,
					ez =
						"number" == typeof es
							? es
							: { top: 0, right: 0, bottom: 0, left: 0, ...es },
					eB = Array.isArray(el) ? el : [el],
					eU = eB.length > 0,
					eY = { padding: ez, boundary: eB.filter(eV), altBoundary: eU },
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
								whileElementsMounted: c,
								open: u,
							} = e,
							[d, f] = n.useState({
								x: 0,
								y: 0,
								strategy: r,
								placement: t,
								middlewareData: {},
								isPositioned: !1,
							}),
							[p, h] = n.useState(o);
						ev(p, o) || h(o);
						const [m, v] = n.useState(null),
							[g, y] = n.useState(null),
							w = n.useCallback((e) => {
								e !== E.current && ((E.current = e), v(e));
							}, []),
							x = n.useCallback((e) => {
								e !== R.current && ((R.current = e), y(e));
							}, []),
							b = a || m,
							C = l || g,
							E = n.useRef(null),
							R = n.useRef(null),
							S = n.useRef(d),
							j = null != c,
							k = ew(c),
							N = ew(i),
							A = ew(u),
							D = n.useCallback(() => {
								var e, n;
								let o, i, a;
								if (!E.current || !R.current) return;
								const l = { placement: t, strategy: r, middleware: p };
								N.current && (l.platform = N.current),
									((e = E.current),
									(n = R.current),
									(o = new Map()),
									(a = { ...(i = { platform: ed, ...l }).platform, _c: o }),
									P(e, n, { ...i, platform: a })).then((e) => {
										const t = { ...e, isPositioned: !1 !== A.current };
										T.current &&
											!ev(S.current, t) &&
											((S.current = t),
											eh.flushSync(() => {
												f(t);
											}));
									});
							}, [p, t, r, N, A]);
						em(() => {
							!1 === u &&
								S.current.isPositioned &&
								((S.current.isPositioned = !1),
								f((e) => ({ ...e, isPositioned: !1 })));
						}, [u]);
						const T = n.useRef(!1);
						em(
							() => (
								(T.current = !0),
								() => {
									T.current = !1;
								}
							),
							[],
						),
							em(() => {
								if ((b && (E.current = b), C && (R.current = C), b && C)) {
									if (k.current) return k.current(b, C, D);
									D();
								}
							}, [b, C, D, k, j]);
						const L = n.useMemo(
								() => ({
									reference: E,
									floating: R,
									setReference: w,
									setFloating: x,
								}),
								[w, x],
							),
							O = n.useMemo(() => ({ reference: b, floating: C }), [b, C]),
							M = n.useMemo(() => {
								const e = { position: r, left: 0, top: 0 };
								if (!O.floating) return e;
								const t = ey(O.floating, d.x),
									n = ey(O.floating, d.y);
								return s
									? {
											...e,
											transform: "translate(" + t + "px, " + n + "px)",
											...(eg(O.floating) >= 1.5 && { willChange: "transform" }),
										}
									: { position: r, left: t, top: n };
							}, [r, s, O.floating, d.x, d.y]);
						return n.useMemo(
							() => ({
								...d,
								update: D,
								refs: L,
								elements: O,
								floatingStyles: M,
							}),
							[d, D, L, O, M],
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
										ancestorResize: c = !0,
										elementResize: u = "function" == typeof ResizeObserver,
										layoutShift: d = "function" == typeof IntersectionObserver,
										animationFrame: f = !1,
									} = r,
									p = Q(e),
									h = s || c ? [...(p ? Z(p) : []), ...(t ? Z(t) : [])] : [];
								h.forEach((e) => {
									s && e.addEventListener("scroll", n, { passive: !0 }),
										c && e.addEventListener("resize", n);
								});
								let m =
										p && d
											? (function (e, t) {
													let n,
														r = null,
														a = O(e);
													function s() {
														var e;
														clearTimeout(n),
															null == (e = r) || e.disconnect(),
															(r = null);
													}
													return (
														!(function c(u, d) {
															void 0 === u && (u = !1),
																void 0 === d && (d = 1),
																s();
															const f = e.getBoundingClientRect(),
																{ left: p, top: h, width: m, height: v } = f;
															if ((u || t(), !m || !v)) return;
															let g = {
																	rootMargin:
																		-l(h) +
																		"px " +
																		-l(a.clientWidth - (p + m)) +
																		"px " +
																		-l(a.clientHeight - (h + v)) +
																		"px " +
																		-l(p) +
																		"px",
																	threshold: i(0, o(1, d)) || 1,
																},
																y = !0;
															function w(t) {
																const r = t[0].intersectionRatio;
																if (r !== d) {
																	if (!y) return c();
																	r
																		? c(!1, r)
																		: (n = setTimeout(() => {
																				c(!1, 1e-7);
																			}, 1e3));
																}
																1 !== r ||
																	ef(f, e.getBoundingClientRect()) ||
																	c(),
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
								u &&
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
										h.forEach((e) => {
											s && e.removeEventListener("scroll", n),
												c && e.removeEventListener("resize", n);
										}),
											null == m || m(),
											null == (e = g) || e.disconnect(),
											(g = null),
											f && cancelAnimationFrame(a);
									}
								);
							})(...e, { animationFrame: "always" === eC }),
						elements: { reference: eN.anchor },
						middleware: [
							{
								name: ($ = {
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
								fn: $.fn,
								options: [r, a],
							},
							ea && {
								name: (U = {
									name: "shift",
									options:
										(D = R =
											{
												mainAxis: !0,
												crossAxis: !1,
												limiter:
													"partial" === ec
														? {
																fn: (void 0 === (E = c) && (E = {}),
																{
																	options: E,
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
																			} = u(E, e),
																			c = { x: t, y: n },
																			f = m(r),
																			h = p(f),
																			v = c[h],
																			g = c[f],
																			y = u(a, e),
																			w =
																				"number" == typeof y
																					? { mainAxis: y, crossAxis: 0 }
																					: { mainAxis: 0, crossAxis: 0, ...y };
																		if (l) {
																			const e = "y" === h ? "height" : "width",
																				t =
																					o.reference[h] -
																					o.floating[e] +
																					w.mainAxis,
																				n =
																					o.reference[h] +
																					o.reference[e] -
																					w.mainAxis;
																			v < t ? (v = t) : v > n && (v = n);
																		}
																		if (s) {
																			var x, b;
																			const e = "y" === h ? "width" : "height",
																				t = N.has(d(r)),
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
																		return { [h]: v, [f]: g };
																	},
																}).fn,
																options: [c, C],
															}
														: void 0,
												...eY,
											}),
									async fn(e) {
										let { x: t, y: n, placement: r, platform: a } = e,
											{
												mainAxis: l = !0,
												crossAxis: s = !1,
												limiter: c = {
													fn: (e) => {
														const { x: t, y: n } = e;
														return { x: t, y: n };
													},
												},
												...f
											} = u(D, e),
											h = { x: t, y: n },
											v = await a.detectOverflow(e, f),
											g = m(d(r)),
											y = p(g),
											w = h[y],
											x = h[g];
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
										const b = c.fn({ ...e, [y]: w, [g]: x });
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
								fn: U.fn,
								options: [R, S],
							},
							ea && {
								name: (Y = {
									name: "flip",
									options: (M = T = { ...eY }),
									async fn(e) {
										var t, n, r, o, i, a, l, s;
										let c,
											C,
											E,
											{
												placement: R,
												middlewareData: S,
												rects: P,
												initialPlacement: j,
												platform: k,
												elements: N,
											} = e,
											{
												mainAxis: A = !0,
												crossAxis: D = !0,
												fallbackPlacements: T,
												fallbackStrategy: L = "bestFit",
												fallbackAxisSideDirection: O = "none",
												flipAlignment: I = !0,
												...F
											} = u(M, e);
										if (null != (t = S.arrow) && t.alignmentOffset) return {};
										const H = d(R),
											_ = m(j),
											W = d(j) === j,
											z = await (null == k.isRTL
												? void 0
												: k.isRTL(N.floating)),
											B =
												T || (W || !I ? [b(j)] : ((c = b(j)), [v(j), c, v(c)])),
											V = "none" !== O;
										!T &&
											V &&
											B.push(
												...((C = f(j)),
												(E = (function (e, t, n) {
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
												})(d(j), "start" === O, z)),
												C &&
													((E = E.map((e) => e + "-" + C)),
													I && (E = E.concat(E.map(v)))),
												E),
											);
										let K = [j, ...B],
											$ = await k.detectOverflow(e, F),
											U = [],
											Y = (null == (n = S.flip) ? void 0 : n.overflows) || [];
										if ((A && U.push($[H]), D)) {
											let e,
												t,
												n,
												r,
												o =
													((a = R),
													(l = P),
													void 0 === (s = z) && (s = !1),
													(e = f(a)),
													(n = h((t = p(m(a))))),
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
											U.push($[o[0]], $[o[1]]);
										}
										if (
											((Y = [...Y, { placement: R, overflows: U }]),
											!U.every((e) => e <= 0))
										) {
											const e =
													((null == (r = S.flip) ? void 0 : r.index) || 0) + 1,
												t = K[e];
											if (
												t &&
												("alignment" !== D ||
													_ === m(t) ||
													Y.every(
														(e) => m(e.placement) !== _ || e.overflows[0] > 0,
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
												switch (L) {
													case "bestFit": {
														const e =
															null ==
															(i = Y.filter((e) => {
																if (V) {
																	const t = m(e.placement);
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
								options: [T, L],
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
											{ placement: l, rects: s, platform: c, elements: p } = e,
											{ apply: h = () => {}, ...v } = u(H, e),
											g = await c.detectOverflow(e, v),
											y = d(l),
											w = f(l),
											x = "y" === m(l),
											{ width: b, height: C } = s.floating;
										"top" === y || "bottom" === y
											? ((r = y),
												(a =
													w ===
													((await (null == c.isRTL
														? void 0
														: c.isRTL(p.floating)))
														? "start"
														: "end")
														? "left"
														: "right"))
											: ((a = y), (r = "end" === w ? "top" : "bottom"));
										let E = C - g.top - g.bottom,
											R = b - g.left - g.right,
											S = o(C - g[r], E),
											P = o(b - g[a], R),
											j = !e.middlewareData.shift,
											k = S,
											N = P;
										if (
											(null != (t = e.middlewareData.shift) &&
												t.enabled.x &&
												(N = R),
											null != (n = e.middlewareData.shift) &&
												n.enabled.y &&
												(k = E),
											j && !w)
										) {
											const e = i(g.left, 0),
												t = i(g.right, 0),
												n = i(g.top, 0),
												r = i(g.bottom, 0);
											x
												? (N =
														b -
														2 *
															(0 !== e || 0 !== t ? e + t : i(g.left, g.right)))
												: (k =
														C -
														2 *
															(0 !== n || 0 !== r
																? n + r
																: i(g.top, g.bottom)));
										}
										await h({ ...e, availableWidth: N, availableHeight: k });
										const A = await c.getDimensions(p.floating);
										return b !== A.width || C !== A.height
											? { reset: { rects: !0 } }
											: {};
									},
								}).name,
								fn: X.fn,
								options: [I, F],
							},
							eO && {
								name: (q = {
									name: "arrow",
									options: (z = _ = { element: eO, padding: ei }),
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
							eK({ arrowWidth: e_, arrowHeight: eW }),
							eu && {
								name: (G = {
									name: "hide",
									options:
										(K = B =
											{
												strategy: "referenceHidden",
												...eY,
												boundary: eU ? eY.boundary : void 0,
											}),
									async fn(e) {
										const { rects: t, platform: n } = e,
											{ strategy: r = "referenceHidden", ...o } = u(K, e);
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
														referenceHidden: k(r),
													},
												};
											}
											case "escaped": {
												const r = j(
													await n.detectOverflow(e, { ...o, altBoundary: !0 }),
													t.floating,
												);
												return { data: { escapedOffsets: r, escaped: k(r) } };
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
					eQ = eN.setPlacementState;
				(0, eP.useLayoutEffect)(
					() => (
						eQ(eZ),
						() => {
							eQ(void 0);
						}
					),
					[eZ, eQ],
				);
				const [e0, e1] = e$(eZ),
					e2 = (0, eS.useCallbackRef)(eR);
				(0, eP.useLayoutEffect)(() => {
					eG && e2?.();
				}, [eG, e2]);
				const e9 = eJ.arrow?.x,
					e5 = eJ.arrow?.y,
					e4 = eJ.arrow?.centerOffset !== 0,
					[e6, e7] = n.useState();
				return (
					(0, eP.useLayoutEffect)(() => {
						eA && e7(window.getComputedStyle(eA).zIndex);
					}, [eA]),
					(0, eb.jsx)("div", {
						ref: eX.setFloating,
						"data-radix-popper-content-wrapper": "",
						style: {
							...eq,
							transform: eG ? eq.transform : "translate(0, -200%)",
							minWidth: "max-content",
							zIndex: e6,
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
							arrowX: e9,
							arrowY: e5,
							shouldHideArrow: e4,
							children: (0, eb.jsx)(ex.Primitive.div, {
								"data-side": e0,
								"data-align": e1,
								...ek,
								ref: eL,
								style: { ...ek.style, animation: eG ? void 0 : "none" },
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
					children: (0, eb.jsx)(eC, {
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
		var eK = (e) => ({
			name: "transformOrigin",
			options: e,
			fn(t) {
				let { placement: n, rects: r, middlewareData: o } = t,
					i = o.arrow?.centerOffset !== 0,
					a = i ? 0 : e.arrowWidth,
					l = i ? 0 : e.arrowHeight,
					[s, c] = e$(n),
					u = { start: "0%", center: "50%", end: "100%" }[c],
					d = (o.arrow?.x ?? 0) + a / 2,
					f = (o.arrow?.y ?? 0) + l / 2,
					p = "",
					h = "";
				return (
					"bottom" === s
						? ((p = i ? u : `${d}px`), (h = `${-l}px`))
						: "top" === s
							? ((p = i ? u : `${d}px`), (h = `${r.floating.height + l}px`))
							: "right" === s
								? ((p = `${-l}px`), (h = i ? u : `${f}px`))
								: "left" === s &&
									((p = `${r.floating.width + l}px`), (h = i ? u : `${f}px`)),
					{ data: { x: p, y: h } }
				);
			},
		});
		function e$(e) {
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
				eL,
				"createPopperScope",
				0,
				eA,
			],
			65357,
		);
	},
	10421,
	(e) => {
		"use strict";
		var t = e.i(620),
			n = e.i(92479),
			r = e.i(21953),
			o = e.i(70768),
			i = e.i(44240),
			a = e.i(11988),
			l = e.i(7057),
			s = e.i(88184),
			c = e.i(48799),
			u = e.i(65357),
			d = e.i(74701),
			f = e.i(7868),
			p = e.i(95353),
			h = e.i(62910),
			m = e.i(39304),
			v = e.i(65999),
			g = e.i(21647),
			y = "Popover",
			[w, x] = (0, i.createContextScope)(y, [u.createPopperScope]),
			b = (0, u.createPopperScope)(),
			[C, E] = w(y),
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
					[p, h] = n.useState(!1),
					[v, g] = (0, m.useControllableState)({
						prop: i,
						defaultProp: a ?? !1,
						onChange: l,
						caller: y,
					});
				return (0, t.jsx)(u.Root, {
					...d,
					children: (0, t.jsx)(C, {
						scope: r,
						contentId: (0, c.useId)(),
						triggerRef: f,
						open: v,
						onOpenChange: g,
						onOpenToggle: n.useCallback(() => g((e) => !e), [g]),
						hasCustomAnchor: p,
						onCustomAnchorAdd: n.useCallback(() => h(!0), []),
						onCustomAnchorRemove: n.useCallback(() => h(!1), []),
						modal: s,
						children: o,
					}),
				});
			};
		R.displayName = y;
		var S = "PopoverAnchor";
		n.forwardRef((e, r) => {
			const { __scopePopover: o, ...i } = e,
				a = E(S, o),
				l = b(o),
				{ onCustomAnchorAdd: s, onCustomAnchorRemove: c } = a;
			return (
				n.useEffect(() => (s(), () => c()), [s, c]),
				(0, t.jsx)(u.Anchor, { ...l, ...i, ref: r })
			);
		}).displayName = S;
		var P = "PopoverTrigger",
			j = n.forwardRef((e, n) => {
				const { __scopePopover: i, ...a } = e,
					l = E(P, i),
					s = b(i),
					c = (0, o.useComposedRefs)(n, l.triggerRef),
					d = (0, t.jsx)(p.Primitive.button, {
						type: "button",
						"aria-haspopup": "dialog",
						"aria-expanded": l.open,
						"aria-controls": l.open ? l.contentId : void 0,
						"data-state": _(l.open),
						...a,
						ref: c,
						onClick: (0, r.composeEventHandlers)(e.onClick, l.onOpenToggle),
					});
				return l.hasCustomAnchor
					? d
					: (0, t.jsx)(u.Anchor, { asChild: !0, ...s, children: d });
			});
		j.displayName = P;
		var k = "PopoverPortal",
			[N, A] = w(k, { forceMount: void 0 }),
			D = (e) => {
				const {
						__scopePopover: n,
						forceMount: r,
						children: o,
						container: i,
					} = e,
					a = E(k, n);
				return (0, t.jsx)(N, {
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
		D.displayName = k;
		var T = "PopoverContent",
			L = n.forwardRef((e, n) => {
				const r = A(T, e.__scopePopover),
					{ forceMount: o = r.forceMount, ...i } = e,
					a = E(T, e.__scopePopover);
				return (0, t.jsx)(f.Presence, {
					present: o || a.open,
					children: a.modal
						? (0, t.jsx)(M, { ...i, ref: n })
						: (0, t.jsx)(I, { ...i, ref: n }),
				});
			});
		L.displayName = T;
		var O = (0, h.createSlot)("PopoverContent.RemoveScroll"),
			M = n.forwardRef((e, i) => {
				const a = E(T, e.__scopePopover),
					l = n.useRef(null),
					s = (0, o.useComposedRefs)(i, l),
					c = n.useRef(!1);
				return (
					n.useEffect(() => {
						const e = l.current;
						if (e) return (0, v.hideOthers)(e);
					}, []),
					(0, t.jsx)(g.RemoveScroll, {
						as: O,
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
										c.current || a.triggerRef.current?.focus();
								},
							),
							onPointerDownOutside: (0, r.composeEventHandlers)(
								e.onPointerDownOutside,
								(e) => {
									const t = e.detail.originalEvent,
										n = 0 === t.button && !0 === t.ctrlKey;
									c.current = 2 === t.button || n;
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
				const o = E(T, e.__scopePopover),
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
						onCloseAutoFocus: c,
						disableOutsidePointerEvents: d,
						onEscapeKeyDown: f,
						onPointerDownOutside: p,
						onFocusOutside: h,
						onInteractOutside: m,
						...v
					} = e,
					g = E(T, r),
					y = b(r);
				return (
					(0, l.useFocusGuards)(),
					(0, t.jsx)(s.FocusScope, {
						asChild: !0,
						loop: !0,
						trapped: o,
						onMountAutoFocus: i,
						onUnmountAutoFocus: c,
						children: (0, t.jsx)(a.DismissableLayer, {
							asChild: !0,
							disableOutsidePointerEvents: d,
							onInteractOutside: m,
							onEscapeKeyDown: f,
							onPointerDownOutside: p,
							onFocusOutside: h,
							onDismiss: () => g.onOpenChange(!1),
							deferPointerDownOutside: !0,
							children: (0, t.jsx)(u.Content, {
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
				a = E(H, o);
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
				return (0, t.jsx)(u.Arrow, { ...i, ...o, ref: n });
			}).displayName = "PopoverArrow");
		var W = e.i(13732);
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
					return (0, t.jsx)(D, {
						children: (0, t.jsx)(L, {
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
			10421,
		);
	},
	86721,
	69915,
	(e) => {
		"use strict";
		var t = e.i(92479),
			n = e.i(44240),
			r = e.i(70768),
			o = e.i(62910),
			i = e.i(620),
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
					c = l < 0 || l >= i ? -1 : l;
				if (c === this.size || (o && c === this.size - 1) || -1 === c)
					return this.set(t, n), this;
				const u = this.size + +!o;
				a < 0 && l++;
				let d = [...this.#e],
					f = !1;
				for (let e = l; e < u; e++)
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
							[c, u] = l(a, {
								collectionRef: { current: null },
								itemMap: new Map(),
							}),
							d = (e) => {
								const { scope: n, children: r } = e,
									o = t.useRef(null),
									a = t.useRef(new Map()).current;
								return (0, i.jsx)(c, {
									scope: n,
									itemMap: a,
									collectionRef: o,
									children: r,
								});
							};
						d.displayName = a;
						const f = e + "CollectionSlot",
							p = (0, o.createSlot)(f),
							h = t.forwardRef((e, t) => {
								const { scope: n, children: o } = e,
									a = u(f, n),
									l = (0, r.useComposedRefs)(t, a.collectionRef);
								return (0, i.jsx)(p, { ref: l, children: o });
							});
						h.displayName = f;
						const m = e + "CollectionItemSlot",
							v = "data-radix-collection-item",
							g = (0, o.createSlot)(m),
							y = t.forwardRef((e, n) => {
								const { scope: o, children: a, ...l } = e,
									s = t.useRef(null),
									c = (0, r.useComposedRefs)(n, s),
									d = u(m, o);
								return (
									t.useEffect(
										() => (
											d.itemMap.set(s, { ref: s, ...l }),
											() => void d.itemMap.delete(s)
										),
									),
									(0, i.jsx)(g, { ...{ [v]: "" }, ref: c, children: a })
								);
							});
						return (
							(y.displayName = m),
							[
								{ Provider: d, Slot: h, ItemSlot: y },
								function (n) {
									const r = u(e + "CollectionConsumer", n);
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
				86721,
			);
		var c = t.createContext(void 0);
		e.s(
			[
				"useDirection",
				0,
				function (e) {
					const n = t.useContext(c);
					return e || n || "ltr";
				},
			],
			69915,
		);
	},
	25072,
	(e) => {
		"use strict";
		var t = e.i(92479),
			n = e.i(95353),
			r = e.i(620),
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
	61516,
	(e) => {
		"use strict";
		var t = e.i(620),
			n = e.i(92479),
			r = e.i(93908);
		function o(e, [t, n]) {
			return Math.min(n, Math.max(t, e));
		}
		var i = e.i(21953),
			a = e.i(86721),
			l = e.i(70768),
			s = e.i(44240),
			c = e.i(69915),
			u = e.i(11988),
			d = e.i(7057),
			f = e.i(88184),
			p = e.i(48799),
			h = e.i(65357),
			m = e.i(74701),
			v = e.i(7868),
			g = e.i(95353),
			y = e.i(62910),
			w = e.i(40093),
			x = e.i(39304),
			b = e.i(41296),
			C = e.i(77310),
			E = e.i(25072),
			R = e.i(65999),
			S = e.i(21647),
			P = [" ", "Enter", "ArrowUp", "ArrowDown"],
			j = [" ", "Enter"],
			k = "Select",
			[N, A, D] = (0, a.createCollection)(k),
			[T, L] = (0, s.createContextScope)(k, [D, h.createPopperScope]),
			O = (0, h.createPopperScope)(),
			[M, I] = T(k),
			[F, H] = T(k);
		function _(e) {
			const {
					__scopeSelect: r,
					children: o,
					open: i,
					defaultOpen: a,
					onOpenChange: l,
					value: s,
					defaultValue: u,
					onValueChange: d,
					dir: f,
					name: m,
					autoComplete: v,
					disabled: g,
					required: y,
					form: w,
					internal_do_not_use_render: b,
				} = e,
				C = O(r),
				[E, R] = n.useState(null),
				[S, P] = n.useState(null),
				[j, A] = n.useState(!1),
				D = (0, c.useDirection)(f),
				[T, L] = (0, x.useControllableState)({
					prop: i,
					defaultProp: a ?? !1,
					onChange: l,
					caller: k,
				}),
				[I, H] = (0, x.useControllableState)({
					prop: s,
					defaultProp: u,
					onChange: d,
					caller: k,
				}),
				_ = n.useRef(null),
				W = !E || !!w || !!E.closest("form"),
				[z, B] = n.useState(new Set()),
				V = (0, p.useId)(),
				K = Array.from(z)
					.map((e) => e.props.value)
					.join(";"),
				$ = n.useCallback((e) => {
					B((t) => new Set(t).add(e));
				}, []),
				U = n.useCallback((e) => {
					B((t) => {
						const n = new Set(t);
						return n.delete(e), n;
					});
				}, []),
				Y = {
					required: y,
					trigger: E,
					onTriggerChange: R,
					valueNode: S,
					onValueNodeChange: P,
					valueNodeHasChildren: j,
					onValueNodeHasChildrenChange: A,
					contentId: V,
					value: I,
					onValueChange: H,
					open: T,
					onOpenChange: L,
					dir: D,
					triggerPointerDownPosRef: _,
					disabled: g,
					name: m,
					autoComplete: v,
					form: w,
					nativeOptions: z,
					nativeSelectKey: K,
					isFormControl: W,
				};
			return (0, t.jsx)(h.Root, {
				...C,
				children: (0, t.jsx)(M, {
					scope: r,
					...Y,
					children: (0, t.jsx)(N.Provider, {
						scope: r,
						children: (0, t.jsx)(F, {
							scope: r,
							onNativeOptionAdd: $,
							onNativeOptionRemove: U,
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
		W.displayName = k;
		var z = "SelectTrigger",
			B = n.forwardRef((e, r) => {
				const { __scopeSelect: o, disabled: a = !1, ...s } = e,
					c = O(o),
					u = I(z, o),
					d = u.disabled || a,
					f = (0, l.useComposedRefs)(r, u.onTriggerChange),
					p = A(o),
					m = n.useRef("touch"),
					[v, y, w] = eT((e) => {
						const t = p().filter((e) => !e.disabled),
							n = t.find((e) => e.value === u.value),
							r = eL(t, e, n);
						void 0 !== r && u.onValueChange(r.value);
					}),
					x = (e) => {
						d || (u.onOpenChange(!0), w()),
							e &&
								(u.triggerPointerDownPosRef.current = {
									x: Math.round(e.pageX),
									y: Math.round(e.pageY),
								});
					};
				return (0, t.jsx)(h.Anchor, {
					asChild: !0,
					...c,
					children: (0, t.jsx)(g.Primitive.button, {
						type: "button",
						role: "combobox",
						"aria-controls": u.open ? u.contentId : void 0,
						"aria-expanded": u.open,
						"aria-required": u.required,
						"aria-autocomplete": "none",
						dir: u.dir,
						"data-state": u.open ? "open" : "closed",
						disabled: d,
						"data-disabled": d ? "" : void 0,
						"data-placeholder": eD(u.value) ? "" : void 0,
						...s,
						ref: f,
						onClick: (0, i.composeEventHandlers)(s.onClick, (e) => {
							e.currentTarget.focus(), "mouse" !== m.current && x(e);
						}),
						onPointerDown: (0, i.composeEventHandlers)(s.onPointerDown, (e) => {
							m.current = e.pointerType;
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
			K = n.forwardRef((e, r) => {
				const {
						__scopeSelect: o,
						className: i,
						style: a,
						children: s,
						placeholder: c = "",
						...u
					} = e,
					d = I(V, o),
					{ onValueNodeHasChildrenChange: f } = d,
					p = void 0 !== s,
					h = (0, l.useComposedRefs)(r, d.onValueNodeChange);
				(0, b.useLayoutEffect)(() => {
					f(p);
				}, [f, p]);
				const m = eD(d.value);
				return (0, t.jsx)(g.Primitive.span, {
					...u,
					asChild: !m && u.asChild,
					ref: h,
					style: { pointerEvents: "none" },
					children: (0, t.jsx)(
						n.Fragment,
						{ children: m ? c : s },
						m ? "placeholder" : "value",
					),
				});
			});
		K.displayName = V;
		var $ = n.forwardRef((e, n) => {
			const { __scopeSelect: r, children: o, ...i } = e;
			return (0, t.jsx)(g.Primitive.span, {
				"aria-hidden": !0,
				...i,
				ref: n,
				children: o || "▼",
			});
		});
		$.displayName = "SelectIcon";
		var U = "SelectPortal",
			[Y, X] = T(U, { forceMount: void 0 }),
			q = (e) => {
				const { __scopeSelect: n, forceMount: r, ...o } = e;
				return (0, t.jsx)(Y, {
					scope: e.__scopeSelect,
					forceMount: r,
					children: (0, t.jsx)(m.Portal, { asChild: !0, ...o }),
				});
			};
		q.displayName = U;
		var Z = "SelectContent",
			G = n.forwardRef((e, r) => {
				const o = X(Z, e.__scopeSelect),
					{ forceMount: i = o.forceMount, ...a } = e,
					l = I(Z, e.__scopeSelect),
					[s, c] = n.useState();
				return (
					(0, b.useLayoutEffect)(() => {
						c(new DocumentFragment());
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
							children: (0, t.jsx)(N.Slot, {
								scope: o,
								children: (0, t.jsx)("div", { ref: n, children: i }),
							}),
						}),
						a,
					)
				: null;
		});
		J.displayName = "SelectContentFragment";
		var [Q, ee] = T(Z),
			et = (0, y.createSlot)("SelectContent.RemoveScroll"),
			en = n.forwardRef((e, r) => {
				const { __scopeSelect: o } = e,
					{
						position: a = "item-aligned",
						onCloseAutoFocus: s,
						onEscapeKeyDown: c,
						onPointerDownOutside: p,
						side: h,
						sideOffset: m,
						align: v,
						alignOffset: g,
						arrowPadding: y,
						collisionBoundary: w,
						collisionPadding: x,
						sticky: b,
						hideWhenDetached: C,
						avoidCollisions: E,
						...P
					} = e,
					j = I(Z, o),
					[k, N] = n.useState(null),
					[D, T] = n.useState(null),
					L = (0, l.useComposedRefs)(r, (e) => N(e)),
					[O, M] = n.useState(null),
					[F, H] = n.useState(null),
					_ = A(o),
					[W, z] = n.useState(!1),
					B = n.useRef(!1);
				n.useEffect(() => {
					if (k) return (0, R.hideOthers)(k);
				}, [k]),
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
									n === t && D && (D.scrollTop = 0),
									n === r && D && (D.scrollTop = D.scrollHeight),
									n?.focus(),
									document.activeElement !== o)
								)
									return;
						},
						[_, D],
					),
					K = n.useCallback(() => V([O, k]), [V, O, k]);
				n.useEffect(() => {
					W && K();
				}, [W, K]);
				const { onOpenChange: $, triggerPointerDownPosRef: U } = j;
				n.useEffect(() => {
					if (k) {
						let e = { x: 0, y: 0 },
							t = (t) => {
								e = {
									x: Math.abs(Math.round(t.pageX) - (U.current?.x ?? 0)),
									y: Math.abs(Math.round(t.pageY) - (U.current?.y ?? 0)),
								};
							},
							n = (n) => {
								e.x <= 10 && e.y <= 10
									? n.preventDefault()
									: n.composedPath().includes(k) || $(!1),
									document.removeEventListener("pointermove", t),
									(U.current = null);
							};
						return (
							null !== U.current &&
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
				}, [k, $, U]),
					n.useEffect(() => {
						const e = () => $(!1);
						return (
							window.addEventListener("blur", e),
							window.addEventListener("resize", e),
							() => {
								window.removeEventListener("blur", e),
									window.removeEventListener("resize", e);
							}
						);
					}, [$]);
				const [Y, X] = eT((e) => {
						const t = _().filter((e) => !e.disabled),
							n = t.find((e) => e.ref.current === document.activeElement),
							r = eL(t, e, n);
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
					G = n.useCallback(() => k?.focus(), [k]),
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
									side: h,
									sideOffset: m,
									align: v,
									alignOffset: g,
									arrowPadding: y,
									collisionBoundary: w,
									collisionPadding: x,
									sticky: b,
									hideWhenDetached: C,
									avoidCollisions: E,
								}
							: {};
				return (0, t.jsx)(Q, {
					scope: o,
					content: k,
					viewport: D,
					onViewportChange: T,
					itemRefCallback: q,
					selectedItem: O,
					onItemLeave: G,
					itemTextRefCallback: J,
					focusSelectedItem: K,
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
							children: (0, t.jsx)(u.DismissableLayer, {
								asChild: !0,
								disableOutsidePointerEvents: !0,
								onEscapeKeyDown: c,
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
									ref: L,
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
				c = I(Z, i),
				u = ee(Z, i),
				[d, f] = n.useState(null),
				[p, h] = n.useState(null),
				m = (0, l.useComposedRefs)(r, (e) => h(e)),
				v = A(i),
				y = n.useRef(!1),
				w = n.useRef(!0),
				{
					viewport: x,
					selectedItem: C,
					selectedItemText: E,
					focusSelectedItem: R,
				} = u,
				S = n.useCallback(() => {
					if (c.trigger && c.valueNode && d && p && x && C && E) {
						const e = c.trigger.getBoundingClientRect(),
							t = p.getBoundingClientRect(),
							n = c.valueNode.getBoundingClientRect(),
							r = E.getBoundingClientRect();
						if ("rtl" !== c.dir) {
							const i = r.left - t.left,
								a = n.left - i,
								l = e.left - a,
								s = e.width + l,
								c = Math.max(s, t.width),
								u = o(a, [10, Math.max(10, window.innerWidth - 10 - c)]);
							(d.style.minWidth = s + "px"), (d.style.left = u + "px");
						} else {
							const i = t.right - r.right,
								a = window.innerWidth - n.right - i,
								l = window.innerWidth - e.right - a,
								s = e.width + l,
								c = Math.max(s, t.width),
								u = o(a, [10, Math.max(10, window.innerWidth - 10 - c)]);
							(d.style.minWidth = s + "px"), (d.style.right = u + "px");
						}
						const i = v(),
							l = window.innerHeight - 20,
							s = x.scrollHeight,
							u = window.getComputedStyle(p),
							f = parseInt(u.borderTopWidth, 10),
							h = parseInt(u.paddingTop, 10),
							m = parseInt(u.borderBottomWidth, 10),
							g = f + h + s + parseInt(u.paddingBottom, 10) + m,
							w = Math.min(5 * C.offsetHeight, g),
							b = window.getComputedStyle(x),
							R = parseInt(b.paddingTop, 10),
							S = parseInt(b.paddingBottom, 10),
							P = e.top + e.height / 2 - 10,
							j = C.offsetHeight / 2,
							k = f + h + (C.offsetTop + j);
						if (k <= P) {
							const e = i.length > 0 && C === i[i.length - 1].ref.current;
							d.style.bottom = "0px";
							const t = Math.max(
								l - P,
								j +
									(e ? S : 0) +
									(p.clientHeight - x.offsetTop - x.offsetHeight) +
									m,
							);
							d.style.height = k + t + "px";
						} else {
							const e = i.length > 0 && C === i[0].ref.current;
							d.style.top = "0px";
							const t = Math.max(P, f + x.offsetTop + (e ? R : 0) + j);
							(d.style.height = t + (g - k) + "px"),
								(x.scrollTop = k - P + x.offsetTop);
						}
						(d.style.margin = "10px 0"),
							(d.style.minHeight = w + "px"),
							(d.style.maxHeight = l + "px"),
							a?.(),
							requestAnimationFrame(() => (y.current = !0));
					}
				}, [v, c.trigger, c.valueNode, d, p, x, C, E, c.dir, a]);
			(0, b.useLayoutEffect)(() => S(), [S]);
			const [P, j] = n.useState();
			(0, b.useLayoutEffect)(() => {
				p && j(window.getComputedStyle(p).zIndex);
			}, [p]);
			const k = n.useCallback(
				(e) => {
					e && !0 === w.current && (S(), R?.(), (w.current = !1));
				},
				[S, R],
			);
			return (0, t.jsx)(ei, {
				scope: i,
				contentWrapper: d,
				shouldExpandOnScrollRef: y,
				onScrollButtonChange: k,
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
						ref: m,
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
				l = O(r);
			return (0, t.jsx)(h.Content, {
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
		var [ei, ea] = T(Z, {}),
			el = "SelectViewport",
			es = n.forwardRef((e, r) => {
				const { __scopeSelect: o, nonce: a, ...s } = e,
					c = ee(el, o),
					u = ea(el, o),
					d = (0, l.useComposedRefs)(r, c.onViewportChange),
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
						(0, t.jsx)(N.Slot, {
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
										{ contentWrapper: n, shouldExpandOnScrollRef: r } = u;
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
		var ec = "SelectGroup",
			[eu, ed] = T(ec);
		n.forwardRef((e, n) => {
			const { __scopeSelect: r, ...o } = e,
				i = (0, p.useId)();
			return (0, t.jsx)(eu, {
				scope: r,
				id: i,
				children: (0, t.jsx)(g.Primitive.div, {
					role: "group",
					"aria-labelledby": i,
					...o,
					ref: n,
				}),
			});
		}).displayName = ec;
		var ef = "SelectLabel",
			ep = n.forwardRef((e, n) => {
				const { __scopeSelect: r, ...o } = e,
					i = ed(ef, r);
				return (0, t.jsx)(g.Primitive.div, { id: i.id, ...o, ref: n });
			});
		ep.displayName = ef;
		var eh = "SelectItem",
			[em, ev] = T(eh),
			eg = n.forwardRef((e, r) => {
				const {
						__scopeSelect: o,
						value: a,
						disabled: s = !1,
						textValue: c,
						...u
					} = e,
					d = I(eh, o),
					f = ee(eh, o),
					h = d.value === a,
					[m, v] = n.useState(c ?? ""),
					[y, w] = n.useState(!1),
					x = (0, l.useComposedRefs)(r, (e) => f.itemRefCallback?.(e, a, s)),
					b = (0, p.useId)(),
					C = n.useRef("touch"),
					E = () => {
						s || (d.onValueChange(a), d.onOpenChange(!1));
					};
				return (0, t.jsx)(em, {
					scope: o,
					value: a,
					disabled: s,
					textId: b,
					isSelected: h,
					onItemTextChange: n.useCallback((e) => {
						v((t) => t || (e?.textContent ?? "").trim());
					}, []),
					children: (0, t.jsx)(N.ItemSlot, {
						scope: o,
						value: a,
						disabled: s,
						textValue: m,
						children: (0, t.jsx)(g.Primitive.div, {
							role: "option",
							"aria-labelledby": b,
							"data-highlighted": y ? "" : void 0,
							"aria-selected": h && y,
							"data-state": h ? "checked" : "unchecked",
							"aria-disabled": s || void 0,
							"data-disabled": s ? "" : void 0,
							tabIndex: s ? void 0 : -1,
							...u,
							ref: x,
							onFocus: (0, i.composeEventHandlers)(u.onFocus, () => w(!0)),
							onBlur: (0, i.composeEventHandlers)(u.onBlur, () => w(!1)),
							onClick: (0, i.composeEventHandlers)(u.onClick, () => {
								"mouse" !== C.current && E();
							}),
							onPointerUp: (0, i.composeEventHandlers)(u.onPointerUp, () => {
								"mouse" === C.current && E();
							}),
							onPointerDown: (0, i.composeEventHandlers)(
								u.onPointerDown,
								(e) => {
									C.current = e.pointerType;
								},
							),
							onPointerMove: (0, i.composeEventHandlers)(
								u.onPointerMove,
								(e) => {
									(C.current = e.pointerType),
										s
											? f.onItemLeave?.()
											: "mouse" === C.current &&
												e.currentTarget.focus({ preventScroll: !0 });
								},
							),
							onPointerLeave: (0, i.composeEventHandlers)(
								u.onPointerLeave,
								(e) => {
									e.currentTarget === document.activeElement &&
										f.onItemLeave?.();
								},
							),
							onKeyDown: (0, i.composeEventHandlers)(u.onKeyDown, (e) => {
								(f.searchRef?.current === "" || " " !== e.key) &&
									(j.includes(e.key) && E(),
									" " === e.key && e.preventDefault());
							}),
						}),
					}),
				});
			});
		eg.displayName = eh;
		var ey = "SelectItemText",
			ew = n.forwardRef((e, o) => {
				const { __scopeSelect: i, className: a, style: s, ...c } = e,
					u = I(ey, i),
					d = ee(ey, i),
					f = ev(ey, i),
					p = H(ey, i),
					[h, m] = n.useState(null),
					v = (0, l.useComposedRefs)(
						o,
						(e) => m(e),
						f.onItemTextChange,
						(e) => d.itemTextRefCallback?.(e, f.value, f.disabled),
					),
					y = h?.textContent,
					w = n.useMemo(
						() =>
							(0, t.jsx)(
								"option",
								{ value: f.value, disabled: f.disabled, children: y },
								f.value,
							),
						[f.disabled, f.value, y],
					),
					{ onNativeOptionAdd: x, onNativeOptionRemove: C } = p;
				return (
					(0, b.useLayoutEffect)(() => (x(w), () => C(w)), [x, C, w]),
					(0, t.jsxs)(t.Fragment, {
						children: [
							(0, t.jsx)(g.Primitive.span, { id: f.textId, ...c, ref: v }),
							f.isSelected &&
							u.valueNode &&
							!u.valueNodeHasChildren &&
							!eD(u.value)
								? r.createPortal(c.children, u.valueNode)
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
		var eC = "SelectScrollUpButton",
			eE = n.forwardRef((e, r) => {
				const o = ee(eC, e.__scopeSelect),
					i = ea(eC, e.__scopeSelect),
					[a, s] = n.useState(!1),
					c = (0, l.useComposedRefs)(r, i.onScrollButtonChange);
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
								ref: c,
								onAutoScroll: () => {
									const { viewport: e, selectedItem: t } = o;
									e && t && (e.scrollTop = e.scrollTop - t.offsetHeight);
								},
							})
						: null
				);
			});
		eE.displayName = eC;
		var eR = "SelectScrollDownButton",
			eS = n.forwardRef((e, r) => {
				const o = ee(eR, e.__scopeSelect),
					i = ea(eR, e.__scopeSelect),
					[a, s] = n.useState(!1),
					c = (0, l.useComposedRefs)(r, i.onScrollButtonChange);
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
								ref: c,
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
					c = n.useRef(null),
					u = A(o),
					d = n.useCallback(() => {
						null !== c.current &&
							(window.clearInterval(c.current), (c.current = null));
					}, []);
				return (
					n.useEffect(() => () => d(), [d]),
					(0, b.useLayoutEffect)(() => {
						const e = u().find((e) => e.ref.current === document.activeElement);
						e?.ref.current?.scrollIntoView({ block: "nearest" });
					}, [u]),
					(0, t.jsx)(g.Primitive.div, {
						"aria-hidden": !0,
						...l,
						ref: r,
						style: { flexShrink: 0, ...l.style },
						onPointerDown: (0, i.composeEventHandlers)(l.onPointerDown, () => {
							null === c.current && (c.current = window.setInterval(a, 50));
						}),
						onPointerMove: (0, i.composeEventHandlers)(l.onPointerMove, () => {
							s.onItemLeave?.(),
								null === c.current && (c.current = window.setInterval(a, 50));
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
		var ek = "SelectArrow";
		n.forwardRef((e, n) => {
			const { __scopeSelect: r, ...o } = e,
				i = O(r);
			return "popper" === ee(ek, r).position
				? (0, t.jsx)(h.Arrow, { ...i, ...o, ref: n })
				: null;
		}).displayName = ek;
		var eN = "SelectBubbleInput",
			eA = n.forwardRef(({ __scopeSelect: e, ...r }, o) => {
				const i = I(eN, e),
					{
						value: a,
						onValueChange: s,
						required: c,
						disabled: u,
						name: d,
						autoComplete: f,
						form: p,
					} = i,
					{ nativeOptions: h, nativeSelectKey: m } = i,
					v = n.useRef(null),
					y = (0, l.useComposedRefs)(o, v),
					w = a ?? "",
					x = (0, C.usePrevious)(w),
					b = Array.from(h).some((e) => (e.props.value ?? "") === "");
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
							required: c,
							tabIndex: -1,
							name: d,
							autoComplete: f,
							disabled: u,
							form: p,
							onChange: (e) => s(e.target.value),
							...r,
							style: { ...E.VISUALLY_HIDDEN_STYLES, ...r.style },
							ref: y,
							defaultValue: w,
							children: [
								eD(a) && !b ? (0, t.jsx)("option", { value: "" }) : null,
								Array.from(h),
							],
						},
						m,
					)
				);
			});
		function eD(e) {
			return "" === e || void 0 === e;
		}
		function eT(e) {
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
		function eL(e, t, n) {
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
		eA.displayName = eN;
		var eO = e.i(95875),
			eM = e.i(28406),
			eI = e.i(54762);
		const eF = (0, eI.default)("chevrons-up-down", [
				["path", { d: "m7 15 5 5 5-5", key: "1hf1tw" }],
				["path", { d: "m7 9 5-5 5 5", key: "sgt6xg" }],
			]),
			eH = (0, eI.default)("chevron-up", [
				["path", { d: "m18 15-6-6-6 6", key: "153udz" }],
			]);
		var e_ = e.i(13732);
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
					(0, t.jsx)($, {
						asChild: !0,
						children: (0, t.jsx)(eF, { className: "size-4 opacity-50" }),
					}),
				],
			}),
		);
		eW.displayName = B.displayName;
		const ez = n.forwardRef(({ className: e, ...n }, r) =>
			(0, t.jsx)(eE, {
				ref: r,
				className: (0, e_.cn)(
					"flex cursor-default items-center justify-center py-1",
					e,
				),
				...n,
				children: (0, t.jsx)(eH, { className: "h-4 w-4" }),
			}),
		);
		ez.displayName = eE.displayName;
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
		const eK = n.forwardRef(({ className: e, children: n, ...r }, o) =>
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
							children: (0, t.jsx)(eO.Check, { className: "h-4 w-4" }),
						}),
					}),
					(0, t.jsx)(ew, { children: n }),
				],
			}),
		);
		(eK.displayName = eg.displayName),
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
					eK,
					"SelectTrigger",
					0,
					eW,
					"SelectValue",
					0,
					K,
				],
				61516,
			);
	},
	25996,
	(e) => {
		"use strict";
		var t = e.i(620),
			n = e.i(98822),
			r = e.i(13732);
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
	9008,
	92663,
	21252,
	(e) => {
		"use strict";
		var t = e.i(54762);
		const n = (0, t.default)("plus", [
			["path", { d: "M5 12h14", key: "1ays0h" }],
			["path", { d: "M12 5v14", key: "s699le" }],
		]);
		e.s(["Plus", 0, n], 9008);
		const r = (0, t.default)("trash", [
			[
				"path",
				{ d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6", key: "miytrc" },
			],
			["path", { d: "M3 6h18", key: "d0wm0j" }],
			["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", key: "e791ji" }],
		]);
		e.s(["Trash", 0, r], 92663);
		var o = e.i(620),
			i = e.i(13732);
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
			21252,
		);
	},
]);
