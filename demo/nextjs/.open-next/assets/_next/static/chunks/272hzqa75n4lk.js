(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
	"object" == typeof document ? document.currentScript : void 0,
	96811,
	(e) => {
		"use strict";
		var t = e.i(62613),
			r = e.i(81),
			n = e.i(10283);
		const i = (0, n.default)("circle-plus", [
			["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
			["path", { d: "M8 12h8", key: "1wcyev" }],
			["path", { d: "M12 8v8", key: "napkw2" }],
		]);
		var a = e.i(95360),
			s = e.i(57319),
			o = e.i(11185),
			l = e.i(88642),
			c = /[\\\/_+.#"@\[\(\{&]/,
			d = /[\\\/_+.#"@\[\(\{&]/g,
			u = /[\s-]/,
			f = /[\s-]/g;
		function p(e) {
			return e.toLowerCase().replace(f, " ");
		}
		var m = e.i(63366),
			h = e.i(33833),
			g = e.i(72476),
			x = e.i(67714),
			v = '[cmdk-group=""]',
			w = '[cmdk-group-items=""]',
			b = '[cmdk-item=""]',
			y = `${b}:not([aria-disabled="true"])`,
			j = "cmdk-item-select",
			k = "data-value",
			C = (e, t, r) => {
				var n;
				return (
					(n = e),
					(function e(t, r, n, i, a, s, o) {
						if (s === r.length) return a === t.length ? 1 : 0.99;
						var l = `${a},${s}`;
						if (void 0 !== o[l]) return o[l];
						for (
							var p, m, h, g, x = i.charAt(s), v = n.indexOf(x, a), w = 0;
							v >= 0;
						)
							(p = e(t, r, n, i, v + 1, s + 1, o)) > w &&
								(v === a
									? (p *= 1)
									: c.test(t.charAt(v - 1))
										? ((p *= 0.8),
											(h = t.slice(a, v - 1).match(d)) &&
												a > 0 &&
												(p *= Math.pow(0.999, h.length)))
										: u.test(t.charAt(v - 1))
											? ((p *= 0.9),
												(g = t.slice(a, v - 1).match(f)) &&
													a > 0 &&
													(p *= Math.pow(0.999, g.length)))
											: ((p *= 0.17), a > 0 && (p *= Math.pow(0.999, v - a))),
								t.charAt(v) !== r.charAt(s) && (p *= 0.9999)),
								((p < 0.1 && n.charAt(v - 1) === i.charAt(s + 1)) ||
									(i.charAt(s + 1) === i.charAt(s) &&
										n.charAt(v - 1) !== i.charAt(s))) &&
									0.1 * (m = e(t, r, n, i, v + 1, s + 2, o)) > p &&
									(p = 0.1 * m),
								p > w && (w = p),
								(v = n.indexOf(x, v + 1));
						return (o[l] = w), w;
					})(
						(n = r && r.length > 0 ? `${n + " " + r.join(" ")}` : n),
						t,
						p(n),
						p(t),
						0,
						0,
						{},
					)
				);
			},
			N = s.createContext(void 0),
			E = s.createContext(void 0),
			S = s.createContext(void 0),
			P = s.forwardRef((e, t) => {
				const r = O(() => {
						var t, r;
						return {
							search: "",
							value:
								null != (r = null != (t = e.value) ? t : e.defaultValue)
									? r
									: "",
							selectedItemId: void 0,
							filtered: { count: 0, items: new Map(), groups: new Set() },
						};
					}),
					n = O(() => new Set()),
					i = O(() => new Map()),
					a = O(() => new Map()),
					o = O(() => new Set()),
					l = T(e),
					{
						label: c,
						children: d,
						value: u,
						onValueChange: f,
						filter: p,
						shouldFilter: m,
						loop: x,
						disablePointerSelection: S = !1,
						vimBindings: P = !0,
						...R
					} = e,
					z = (0, g.useId)(),
					M = (0, g.useId)(),
					D = (0, g.useId)(),
					I = s.useRef(null),
					F = H();
				L(() => {
					if (void 0 !== u) {
						const e = u.trim();
						(r.current.value = e), A.emit();
					}
				}, [u]),
					L(() => {
						F(6, G);
					}, []);
				const A = s.useMemo(
						() => ({
							subscribe: (e) => (o.current.add(e), () => o.current.delete(e)),
							snapshot: () => r.current,
							setState: (e, t, n) => {
								var i, a, s, o;
								if (!Object.is(r.current[e], t)) {
									if (((r.current[e] = t), "search" === e)) $(), V(), F(1, K);
									else if ("value" === e) {
										if (
											document.activeElement.hasAttribute("cmdk-input") ||
											document.activeElement.hasAttribute("cmdk-root")
										) {
											const e = document.getElementById(D);
											e
												? e.focus()
												: null == (i = document.getElementById(z)) || i.focus();
										}
										if (
											(F(7, () => {
												var e;
												(r.current.selectedItemId =
													null == (e = Q()) ? void 0 : e.id),
													A.emit();
											}),
											n || F(5, G),
											(null == (a = l.current) ? void 0 : a.value) !== void 0)
										) {
											null == (o = (s = l.current).onValueChange) ||
												o.call(s, null != t ? t : "");
											return;
										}
									}
									A.emit();
								}
							},
							emit: () => {
								o.current.forEach((e) => e());
							},
						}),
						[],
					),
					B = s.useMemo(
						() => ({
							value: (e, t, n) => {
								var i;
								t !== (null == (i = a.current.get(e)) ? void 0 : i.value) &&
									(a.current.set(e, { value: t, keywords: n }),
									r.current.filtered.items.set(e, _(t, n)),
									F(2, () => {
										V(), A.emit();
									}));
							},
							item: (e, t) => (
								n.current.add(e),
								t &&
									(i.current.has(t)
										? i.current.get(t).add(e)
										: i.current.set(t, new Set([e]))),
								F(3, () => {
									$(), V(), r.current.value || K(), A.emit();
								}),
								() => {
									a.current.delete(e),
										n.current.delete(e),
										r.current.filtered.items.delete(e);
									const t = Q();
									F(4, () => {
										$(),
											(null == t ? void 0 : t.getAttribute("id")) === e && K(),
											A.emit();
									});
								}
							),
							group: (e) => (
								i.current.has(e) || i.current.set(e, new Set()),
								() => {
									a.current.delete(e), i.current.delete(e);
								}
							),
							filter: () => l.current.shouldFilter,
							label: c || e["aria-label"],
							getDisablePointerSelection: () =>
								l.current.disablePointerSelection,
							listId: z,
							inputId: D,
							labelId: M,
							listInnerRef: I,
						}),
						[],
					);
				function _(e, t) {
					var n, i;
					const a =
						null != (i = null == (n = l.current) ? void 0 : n.filter) ? i : C;
					return e ? a(e, r.current.search, t) : 0;
				}
				function V() {
					if (!r.current.search || !1 === l.current.shouldFilter) return;
					const e = r.current.filtered.items,
						t = [];
					r.current.filtered.groups.forEach((r) => {
						let n = i.current.get(r),
							a = 0;
						n.forEach((t) => {
							a = Math.max(e.get(t), a);
						}),
							t.push([r, a]);
					});
					const n = I.current;
					W()
						.sort((t, r) => {
							var n, i;
							const a = t.getAttribute("id"),
								s = r.getAttribute("id");
							return (
								(null != (n = e.get(s)) ? n : 0) -
								(null != (i = e.get(a)) ? i : 0)
							);
						})
						.forEach((e) => {
							const t = e.closest(w);
							t
								? t.appendChild(
										e.parentElement === t ? e : e.closest(`${w} > *`),
									)
								: n.appendChild(
										e.parentElement === n ? e : e.closest(`${w} > *`),
									);
						}),
						t
							.sort((e, t) => t[1] - e[1])
							.forEach((e) => {
								var t;
								const r =
									null == (t = I.current)
										? void 0
										: t.querySelector(
												`${v}[${k}="${encodeURIComponent(e[0])}"]`,
											);
								null == r || r.parentElement.appendChild(r);
							});
				}
				function K() {
					const e = W().find((e) => "true" !== e.getAttribute("aria-disabled")),
						t = null == e ? void 0 : e.getAttribute(k);
					A.setState("value", t || void 0);
				}
				function $() {
					var e, t, s, o;
					if (!r.current.search || !1 === l.current.shouldFilter) {
						r.current.filtered.count = n.current.size;
						return;
					}
					r.current.filtered.groups = new Set();
					let c = 0;
					for (const i of n.current) {
						const n = _(
							null != (t = null == (e = a.current.get(i)) ? void 0 : e.value)
								? t
								: "",
							null != (o = null == (s = a.current.get(i)) ? void 0 : s.keywords)
								? o
								: [],
						);
						r.current.filtered.items.set(i, n), n > 0 && c++;
					}
					for (const [e, t] of i.current)
						for (const n of t)
							if (r.current.filtered.items.get(n) > 0) {
								r.current.filtered.groups.add(e);
								break;
							}
					r.current.filtered.count = c;
				}
				function G() {
					var e, t, r;
					const n = Q();
					n &&
						((null == (e = n.parentElement) ? void 0 : e.firstChild) === n &&
							(null ==
								(r =
									null == (t = n.closest(v))
										? void 0
										: t.querySelector('[cmdk-group-heading=""]')) ||
								r.scrollIntoView({ block: "nearest" })),
						n.scrollIntoView({ block: "nearest" }));
				}
				function Q() {
					var e;
					return null == (e = I.current)
						? void 0
						: e.querySelector(`${b}[aria-selected="true"]`);
				}
				function W() {
					var e;
					return Array.from(
						(null == (e = I.current) ? void 0 : e.querySelectorAll(y)) || [],
					);
				}
				function X(e) {
					const t = W()[e];
					t && A.setState("value", t.getAttribute(k));
				}
				function Y(e) {
					var t;
					let r = Q(),
						n = W(),
						i = n.findIndex((e) => e === r),
						a = n[i + e];
					null != (t = l.current) &&
						t.loop &&
						(a =
							i + e < 0
								? n[n.length - 1]
								: i + e === n.length
									? n[0]
									: n[i + e]),
						a && A.setState("value", a.getAttribute(k));
				}
				function Z(e) {
					let t = Q(),
						r = null == t ? void 0 : t.closest(v),
						n;
					for (; r && !n; )
						n =
							null ==
							(r =
								e > 0
									? (function (e, t) {
											let r = e.nextElementSibling;
											for (; r; ) {
												if (r.matches(t)) return r;
												r = r.nextElementSibling;
											}
										})(r, v)
									: (function (e, t) {
											let r = e.previousElementSibling;
											for (; r; ) {
												if (r.matches(t)) return r;
												r = r.previousElementSibling;
											}
										})(r, v))
								? void 0
								: r.querySelector(y);
					n ? A.setState("value", n.getAttribute(k)) : Y(e);
				}
				const J = () => X(W().length - 1),
					ee = (e) => {
						e.preventDefault(), e.metaKey ? J() : e.altKey ? Z(1) : Y(1);
					},
					et = (e) => {
						e.preventDefault(), e.metaKey ? X(0) : e.altKey ? Z(-1) : Y(-1);
					};
				return s.createElement(
					h.Primitive.div,
					{
						ref: t,
						tabIndex: -1,
						...R,
						"cmdk-root": "",
						onKeyDown: (e) => {
							var t;
							null == (t = R.onKeyDown) || t.call(R, e);
							const r = e.nativeEvent.isComposing || 229 === e.keyCode;
							if (!(e.defaultPrevented || r))
								switch (e.key) {
									case "n":
									case "j":
										P && e.ctrlKey && ee(e);
										break;
									case "ArrowDown":
										ee(e);
										break;
									case "p":
									case "k":
										P && e.ctrlKey && et(e);
										break;
									case "ArrowUp":
										et(e);
										break;
									case "Home":
										e.preventDefault(), X(0);
										break;
									case "End":
										e.preventDefault(), J();
										break;
									case "Enter": {
										e.preventDefault();
										const t = Q();
										if (t) {
											const e = new Event(j);
											t.dispatchEvent(e);
										}
									}
								}
						},
					},
					s.createElement(
						"label",
						{ "cmdk-label": "", htmlFor: B.inputId, id: B.labelId, style: U },
						c,
					),
					q(e, (e) =>
						s.createElement(
							E.Provider,
							{ value: A },
							s.createElement(N.Provider, { value: B }, e),
						),
					),
				);
			}),
			R = s.forwardRef((e, t) => {
				var r, n;
				const i = (0, g.useId)(),
					a = s.useRef(null),
					o = s.useContext(S),
					l = s.useContext(N),
					c = T(e),
					d =
						null != (n = null == (r = c.current) ? void 0 : r.forceMount)
							? n
							: null == o
								? void 0
								: o.forceMount;
				L(() => {
					if (!d) return l.item(i, null == o ? void 0 : o.id);
				}, [d]);
				const u = _(i, a, [e.value, e.children, a], e.keywords),
					f = s.useContext(E),
					p = B((e) => e.value && e.value === u.current),
					m = B(
						(e) =>
							!!d ||
							!1 === l.filter() ||
							!e.search ||
							e.filtered.items.get(i) > 0,
					);
				function v() {
					var e, t;
					w(), null == (t = (e = c.current).onSelect) || t.call(e, u.current);
				}
				function w() {
					f.setState("value", u.current, !0);
				}
				if (
					(s.useEffect(() => {
						const t = a.current;
						if (!(!t || e.disabled))
							return (
								t.addEventListener(j, v), () => t.removeEventListener(j, v)
							);
					}, [m, e.onSelect, e.disabled]),
					!m)
				)
					return null;
				const {
					disabled: b,
					value: y,
					onSelect: k,
					forceMount: C,
					keywords: P,
					...R
				} = e;
				return s.createElement(
					h.Primitive.div,
					{
						ref: (0, x.composeRefs)(a, t),
						...R,
						id: i,
						"cmdk-item": "",
						role: "option",
						"aria-disabled": !!b,
						"aria-selected": !!p,
						"data-disabled": !!b,
						"data-selected": !!p,
						onPointerMove: b || l.getDisablePointerSelection() ? void 0 : w,
						onClick: b ? void 0 : v,
					},
					e.children,
				);
			}),
			z = s.forwardRef((e, t) => {
				const { heading: r, children: n, forceMount: i, ...a } = e,
					o = (0, g.useId)(),
					l = s.useRef(null),
					c = s.useRef(null),
					d = (0, g.useId)(),
					u = s.useContext(N),
					f = B(
						(e) =>
							!!i || !1 === u.filter() || !e.search || e.filtered.groups.has(o),
					);
				L(() => u.group(o), []), _(o, l, [e.value, e.heading, c]);
				const p = s.useMemo(() => ({ id: o, forceMount: i }), [i]);
				return s.createElement(
					h.Primitive.div,
					{
						ref: (0, x.composeRefs)(l, t),
						...a,
						"cmdk-group": "",
						role: "presentation",
						hidden: !f || void 0,
					},
					r &&
						s.createElement(
							"div",
							{ ref: c, "cmdk-group-heading": "", "aria-hidden": !0, id: d },
							r,
						),
					q(e, (e) =>
						s.createElement(
							"div",
							{
								"cmdk-group-items": "",
								role: "group",
								"aria-labelledby": r ? d : void 0,
							},
							s.createElement(S.Provider, { value: p }, e),
						),
					),
				);
			}),
			M = s.forwardRef((e, t) => {
				const { alwaysRender: r, ...n } = e,
					i = s.useRef(null),
					a = B((e) => !e.search);
				return r || a
					? s.createElement(h.Primitive.div, {
							ref: (0, x.composeRefs)(i, t),
							...n,
							"cmdk-separator": "",
							role: "separator",
						})
					: null;
			}),
			D = s.forwardRef((e, t) => {
				const { onValueChange: r, ...n } = e,
					i = null != e.value,
					a = s.useContext(E),
					o = B((e) => e.search),
					l = B((e) => e.selectedItemId),
					c = s.useContext(N);
				return (
					s.useEffect(() => {
						null != e.value && a.setState("search", e.value);
					}, [e.value]),
					s.createElement(h.Primitive.input, {
						ref: t,
						...n,
						"cmdk-input": "",
						autoComplete: "off",
						autoCorrect: "off",
						spellCheck: !1,
						"aria-autocomplete": "list",
						role: "combobox",
						"aria-expanded": !0,
						"aria-controls": c.listId,
						"aria-labelledby": c.labelId,
						"aria-activedescendant": l,
						id: c.inputId,
						type: "text",
						value: i ? e.value : o,
						onChange: (e) => {
							i || a.setState("search", e.target.value),
								null == r || r(e.target.value);
						},
					})
				);
			}),
			I = s.forwardRef((e, t) => {
				const { children: r, label: n = "Suggestions", ...i } = e,
					a = s.useRef(null),
					o = s.useRef(null),
					l = B((e) => e.selectedItemId),
					c = s.useContext(N);
				return (
					s.useEffect(() => {
						if (o.current && a.current) {
							let e = o.current,
								t = a.current,
								r,
								n = new ResizeObserver(() => {
									r = requestAnimationFrame(() => {
										const r = e.offsetHeight;
										t.style.setProperty(
											"--cmdk-list-height",
											r.toFixed(1) + "px",
										);
									});
								});
							return (
								n.observe(e),
								() => {
									cancelAnimationFrame(r), n.unobserve(e);
								}
							);
						}
					}, []),
					s.createElement(
						h.Primitive.div,
						{
							ref: (0, x.composeRefs)(a, t),
							...i,
							"cmdk-list": "",
							role: "listbox",
							tabIndex: -1,
							"aria-activedescendant": l,
							"aria-label": n,
							id: c.listId,
						},
						q(e, (e) =>
							s.createElement(
								"div",
								{
									ref: (0, x.composeRefs)(o, c.listInnerRef),
									"cmdk-list-sizer": "",
								},
								e,
							),
						),
					)
				);
			}),
			F = s.forwardRef((e, t) => {
				const {
					open: r,
					onOpenChange: n,
					overlayClassName: i,
					contentClassName: a,
					container: o,
					...l
				} = e;
				return s.createElement(
					m.Root,
					{ open: r, onOpenChange: n },
					s.createElement(
						m.Portal,
						{ container: o },
						s.createElement(m.Overlay, { "cmdk-overlay": "", className: i }),
						s.createElement(
							m.Content,
							{ "aria-label": e.label, "cmdk-dialog": "", className: a },
							s.createElement(P, { ref: t, ...l }),
						),
					),
				);
			}),
			A = Object.assign(P, {
				List: I,
				Item: R,
				Input: D,
				Group: z,
				Separator: M,
				Dialog: F,
				Empty: s.forwardRef((e, t) =>
					B((e) => 0 === e.filtered.count)
						? s.createElement(h.Primitive.div, {
								ref: t,
								...e,
								"cmdk-empty": "",
								role: "presentation",
							})
						: null,
				),
				Loading: s.forwardRef((e, t) => {
					const { progress: r, children: n, label: i = "Loading...", ...a } = e;
					return s.createElement(
						h.Primitive.div,
						{
							ref: t,
							...a,
							"cmdk-loading": "",
							role: "progressbar",
							"aria-valuenow": r,
							"aria-valuemin": 0,
							"aria-valuemax": 100,
							"aria-label": i,
						},
						q(e, (e) => s.createElement("div", { "aria-hidden": !0 }, e)),
					);
				}),
			});
		function T(e) {
			const t = s.useRef(e);
			return (
				L(() => {
					t.current = e;
				}),
				t
			);
		}
		var L = "u" < typeof window ? s.useEffect : s.useLayoutEffect;
		function O(e) {
			const t = s.useRef();
			return void 0 === t.current && (t.current = e()), t;
		}
		function B(e) {
			const t = s.useContext(E),
				r = () => e(t.snapshot());
			return s.useSyncExternalStore(t.subscribe, r, r);
		}
		function _(e, t, r, n = []) {
			const i = s.useRef(),
				a = s.useContext(N);
			return (
				L(() => {
					var s;
					const o = (() => {
							var e;
							for (const t of r) {
								if ("string" == typeof t) return t.trim();
								if ("object" == typeof t && "current" in t)
									return t.current
										? null == (e = t.current.textContent)
											? void 0
											: e.trim()
										: i.current;
							}
						})(),
						l = n.map((e) => e.trim());
					a.value(e, o, l),
						null == (s = t.current) || s.setAttribute(k, o),
						(i.current = o);
				}),
				i
			);
		}
		var H = () => {
			const [e, t] = s.useState(),
				r = O(() => new Map());
			return (
				L(() => {
					r.current.forEach((e) => e()), (r.current = new Map());
				}, [e]),
				(e, n) => {
					r.current.set(e, n), t({});
				}
			);
		};
		function q({ asChild: e, children: t }, r) {
			let n;
			return e && s.isValidElement(t)
				? s.cloneElement(
						"function" == typeof (n = t.type)
							? n(t.props)
							: "render" in n
								? n.render(t.props)
								: t,
						{ ref: t.ref },
						r(t.props.children),
					)
				: r(t);
		}
		var U = {
			position: "absolute",
			width: "1px",
			height: "1px",
			padding: "0",
			margin: "-1px",
			overflow: "hidden",
			clip: "rect(0, 0, 0, 0)",
			whiteSpace: "nowrap",
			borderWidth: "0",
		};
		(0, n.default)("search", [
			["path", { d: "m21 21-4.34-4.34", key: "14j7rj" }],
			["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
		]),
			e.i(16066);
		var V = e.i(49696);
		function K({ className: e, ...r }) {
			return (0, t.jsx)(A, {
				"data-slot": "command",
				className: (0, V.cn)(
					"bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md",
					e,
				),
				...r,
			});
		}
		function $({ className: e, ...r }) {
			return (0, t.jsx)(A.List, {
				"data-slot": "command-list",
				className: (0, V.cn)(
					"max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto",
					e,
				),
				...r,
			});
		}
		function G({ className: e, ...r }) {
			return (0, t.jsx)(A.Group, {
				"data-slot": "command-group",
				className: (0, V.cn)(
					"text-foreground [&_[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium",
					e,
				),
				...r,
			});
		}
		function Q({ className: e, ...r }) {
			return (0, t.jsx)(A.Separator, {
				"data-slot": "command-separator",
				className: (0, V.cn)("bg-border -mx-1 h-px", e),
				...r,
			});
		}
		function W({ className: e, ...r }) {
			return (0, t.jsx)(A.Item, {
				"data-slot": "command-item",
				className: (0, V.cn)(
					"data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
					e,
				),
				...r,
			});
		}
		var X = e.i(37250),
			Y = e.i(93181),
			Z = e.i(40609),
			J = e.i(46483),
			ee = e.i(76706);
		e.s(
			[
				"default",
				0,
				function ({ deviceSessions: e, initialSession: n }) {
					const c = (0, Y.getQueryClient)(),
						{ data: d } = (0, J.useSessionQuery)(n),
						[u, f] = (0, s.useState)(!1),
						p = (0, a.useRouter)();
					return (0, t.jsxs)(X.Popover, {
						open: u,
						onOpenChange: f,
						children: [
							(0, t.jsx)(X.PopoverTrigger, {
								asChild: !0,
								children: (0, t.jsxs)(l.Button, {
									variant: "outline",
									role: "combobox",
									"aria-expanded": u,
									"aria-label": "Select a user",
									className: "w-[250px] justify-between",
									children: [
										(0, t.jsxs)(o.Avatar, {
											className: "mr-2 h-6 w-6",
											children: [
												(0, t.jsx)(o.AvatarImage, {
													src: d?.user.image || void 0,
													alt: d?.user.name,
												}),
												(0, t.jsx)(o.AvatarFallback, {
													children: d?.user.name.charAt(0),
												}),
											],
										}),
										d?.user.name,
										(0, t.jsx)(r.ChevronDown, {
											className: "ml-auto h-4 w-4 shrink-0 opacity-50",
										}),
									],
								}),
							}),
							(0, t.jsx)(X.PopoverContent, {
								className: "w-[250px] p-0",
								children: (0, t.jsxs)(K, {
									children: [
										(0, t.jsxs)($, {
											children: [
												(0, t.jsx)(G, {
													heading: "Current Account",
													children: (0, t.jsx)(
														W,
														{
															onSelect: () => {},
															className: "text-sm w-full justify-between",
															children: (0, t.jsxs)("div", {
																className: "flex items-center",
																children: [
																	(0, t.jsxs)(o.Avatar, {
																		className: "mr-2 h-5 w-5",
																		children: [
																			(0, t.jsx)(o.AvatarImage, {
																				src: d?.user.image || void 0,
																				alt: d?.user.name,
																			}),
																			(0, t.jsx)(o.AvatarFallback, {
																				children: d?.user.name.charAt(0),
																			}),
																		],
																	}),
																	d?.user.name,
																],
															}),
														},
														d?.user.id,
													),
												}),
												(0, t.jsx)(Q, {}),
												(0, t.jsx)(G, {
													heading: "Switch Account",
													children: e
														.filter((e) => e.user.id !== d?.user.id)
														.map((e, r) =>
															(0, t.jsxs)(
																W,
																{
																	onSelect: async () => {
																		try {
																			await ee.authClient.multiSession.setActive(
																				{ sessionToken: e.session.token },
																			),
																				await c.invalidateQueries({
																					queryKey: Z.userKeys.all(),
																				}),
																				f(!1),
																				p.refresh();
																		} catch (e) {
																			console.error(
																				"Failed to switch account:",
																				e,
																			);
																		}
																	},
																	className: "text-sm",
																	children: [
																		(0, t.jsxs)(o.Avatar, {
																			className: "mr-2 h-5 w-5",
																			children: [
																				(0, t.jsx)(o.AvatarImage, {
																					src: e.user.image || void 0,
																					alt: e.user.name,
																				}),
																				(0, t.jsx)(o.AvatarFallback, {
																					children: e.user.name.charAt(0),
																				}),
																			],
																		}),
																		(0, t.jsx)("div", {
																			className:
																				"flex items-center justify-between w-full",
																			children: (0, t.jsxs)("div", {
																				children: [
																					(0, t.jsx)("p", {
																						children: e.user.name,
																					}),
																					(0, t.jsxs)("p", {
																						className: "text-xs",
																						children: ["(", e.user.email, ")"],
																					}),
																				],
																			}),
																		}),
																	],
																},
																r,
															),
														),
												}),
											],
										}),
										(0, t.jsx)(Q, {}),
										(0, t.jsx)($, {
											children: (0, t.jsx)(G, {
												children: (0, t.jsxs)(W, {
													onSelect: () => {
														p.push("/sign-in"), f(!1);
													},
													className: "cursor-pointer text-sm",
													children: [
														(0, t.jsx)(i, { className: "mr-2 h-5 w-5" }),
														"Add Account",
													],
												}),
											}),
										}),
									],
								}),
							}),
						],
					});
				},
			],
			96811,
		);
	},
	64203,
	(e, t, r) => {
		"use strict";
		Object.defineProperty(r, "__esModule", { value: !0 });
		var n = {
			default: function () {
				return d;
			},
			getImageProps: function () {
				return c;
			},
		};
		for (var i in n) Object.defineProperty(r, i, { enumerable: !0, get: n[i] });
		const a = e.r(81210),
			s = e.r(51003),
			o = e.r(56744),
			l = a._(e.r(97664));
		function c(e) {
			const { props: t } = (0, s.getImgProps)(e, {
				defaultLoader: l.default,
				imgConf: {
					deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
					imageSizes: [32, 48, 64, 96, 128, 256, 384],
					qualities: [75],
					path: "/_next/image",
					loader: "default",
					dangerouslyAllowSVG: !1,
					unoptimized: !1,
				},
			});
			for (const [e, r] of Object.entries(t)) void 0 === r && delete t[e];
			return { props: t };
		}
		const d = o.Image;
	},
	2398,
	(e, t, r) => {
		t.exports = e.r(64203);
	},
	85926,
	38870,
	(e) => {
		"use strict";
		var t = e.i(62613),
			r = e.i(81799),
			n = e.i(2190),
			n = n,
			i = e.i(57319),
			a = e.i(88642),
			s = e.i(97557),
			o = e.i(67714),
			l = e.i(15246),
			c = e.i(48661),
			d = e.i(72476),
			u = e.i(82976),
			f = e.i(51168),
			p = e.i(49674),
			m = e.i(33833),
			h = e.i(9671),
			g = e.i(5396),
			x = e.i(19202),
			[v, w] = (0, l.createContextScope)("Tooltip", [u.createPopperScope]),
			b = (0, u.createPopperScope)(),
			y = "TooltipProvider",
			j = "tooltip.open",
			[k, C] = v(y),
			N = (e) => {
				const {
						__scopeTooltip: r,
						delayDuration: n = 700,
						skipDelayDuration: a = 300,
						disableHoverableContent: s = !1,
						children: o,
					} = e,
					l = i.useRef(!0),
					c = i.useRef(!1),
					d = i.useRef(0);
				return (
					i.useEffect(() => {
						const e = d.current;
						return () => window.clearTimeout(e);
					}, []),
					(0, t.jsx)(k, {
						scope: r,
						isOpenDelayedRef: l,
						delayDuration: n,
						onOpen: i.useCallback(() => {
							a <= 0 || (window.clearTimeout(d.current), (l.current = !1));
						}, [a]),
						onClose: i.useCallback(() => {
							a <= 0 ||
								(window.clearTimeout(d.current),
								(d.current = window.setTimeout(() => (l.current = !0), a)));
						}, [a]),
						isPointerInTransitRef: c,
						onPointerInTransitChange: i.useCallback((e) => {
							c.current = e;
						}, []),
						disableHoverableContent: s,
						children: o,
					})
				);
			};
		N.displayName = y;
		var E = "Tooltip",
			[S, P] = v(E),
			R = (e) => {
				const {
						__scopeTooltip: r,
						children: n,
						open: a,
						defaultOpen: s,
						onOpenChange: o,
						disableHoverableContent: l,
						delayDuration: c,
					} = e,
					f = C(E, e.__scopeTooltip),
					p = b(r),
					[m, h] = i.useState(null),
					x = (0, d.useId)(),
					v = i.useRef(0),
					w = l ?? f.disableHoverableContent,
					y = c ?? f.delayDuration,
					k = i.useRef(!1),
					[N, P] = (0, g.useControllableState)({
						prop: a,
						defaultProp: s ?? !1,
						onChange: (e) => {
							e
								? (f.onOpen(), document.dispatchEvent(new CustomEvent(j)))
								: f.onClose(),
								o?.(e);
						},
						caller: E,
					}),
					R = i.useMemo(
						() =>
							N ? (k.current ? "delayed-open" : "instant-open") : "closed",
						[N],
					),
					z = i.useCallback(() => {
						window.clearTimeout(v.current),
							(v.current = 0),
							(k.current = !1),
							P(!0);
					}, [P]),
					M = i.useCallback(() => {
						window.clearTimeout(v.current), (v.current = 0), P(!1);
					}, [P]),
					D = i.useCallback(() => {
						window.clearTimeout(v.current),
							(v.current = window.setTimeout(() => {
								(k.current = !0), P(!0), (v.current = 0);
							}, y));
					}, [y, P]);
				return (
					i.useEffect(
						() => () => {
							v.current && (window.clearTimeout(v.current), (v.current = 0));
						},
						[],
					),
					(0, t.jsx)(u.Root, {
						...p,
						children: (0, t.jsx)(S, {
							scope: r,
							contentId: x,
							open: N,
							stateAttribute: R,
							trigger: m,
							onTriggerChange: h,
							onTriggerEnter: i.useCallback(() => {
								f.isOpenDelayedRef.current ? D() : z();
							}, [f.isOpenDelayedRef, D, z]),
							onTriggerLeave: i.useCallback(() => {
								w ? M() : (window.clearTimeout(v.current), (v.current = 0));
							}, [M, w]),
							onOpen: z,
							onClose: M,
							disableHoverableContent: w,
							children: n,
						}),
					})
				);
			};
		R.displayName = E;
		var z = "TooltipTrigger",
			M = i.forwardRef((e, r) => {
				const { __scopeTooltip: n, ...a } = e,
					l = P(z, n),
					c = C(z, n),
					d = b(n),
					f = i.useRef(null),
					p = (0, o.useComposedRefs)(r, f, l.onTriggerChange),
					h = i.useRef(!1),
					g = i.useRef(!1),
					x = i.useCallback(() => (h.current = !1), []);
				return (
					i.useEffect(
						() => () => document.removeEventListener("pointerup", x),
						[x],
					),
					(0, t.jsx)(u.Anchor, {
						asChild: !0,
						...d,
						children: (0, t.jsx)(m.Primitive.button, {
							"aria-describedby": l.open ? l.contentId : void 0,
							"data-state": l.stateAttribute,
							...a,
							ref: p,
							onPointerMove: (0, s.composeEventHandlers)(
								e.onPointerMove,
								(e) => {
									"touch" !== e.pointerType &&
										(g.current ||
											c.isPointerInTransitRef.current ||
											(l.onTriggerEnter(), (g.current = !0)));
								},
							),
							onPointerLeave: (0, s.composeEventHandlers)(
								e.onPointerLeave,
								() => {
									l.onTriggerLeave(), (g.current = !1);
								},
							),
							onPointerDown: (0, s.composeEventHandlers)(
								e.onPointerDown,
								() => {
									l.open && l.onClose(),
										(h.current = !0),
										document.addEventListener("pointerup", x, { once: !0 });
								},
							),
							onFocus: (0, s.composeEventHandlers)(e.onFocus, () => {
								h.current || l.onOpen();
							}),
							onBlur: (0, s.composeEventHandlers)(e.onBlur, l.onClose),
							onClick: (0, s.composeEventHandlers)(e.onClick, l.onClose),
						}),
					})
				);
			});
		M.displayName = z;
		var D = "TooltipPortal",
			[I, F] = v(D, { forceMount: void 0 }),
			A = (e) => {
				const {
						__scopeTooltip: r,
						forceMount: n,
						children: i,
						container: a,
					} = e,
					s = P(D, r);
				return (0, t.jsx)(I, {
					scope: r,
					forceMount: n,
					children: (0, t.jsx)(p.Presence, {
						present: n || s.open,
						children: (0, t.jsx)(f.Portal, {
							asChild: !0,
							container: a,
							children: i,
						}),
					}),
				});
			};
		A.displayName = D;
		var T = "TooltipContent",
			L = i.forwardRef((e, r) => {
				const n = F(T, e.__scopeTooltip),
					{ forceMount: i = n.forceMount, side: a = "top", ...s } = e,
					o = P(T, e.__scopeTooltip);
				return (0, t.jsx)(p.Presence, {
					present: i || o.open,
					children: o.disableHoverableContent
						? (0, t.jsx)(q, { side: a, ...s, ref: r })
						: (0, t.jsx)(O, { side: a, ...s, ref: r }),
				});
			}),
			O = i.forwardRef((e, r) => {
				const n = P(T, e.__scopeTooltip),
					a = C(T, e.__scopeTooltip),
					s = i.useRef(null),
					l = (0, o.useComposedRefs)(r, s),
					[c, d] = i.useState(null),
					{ trigger: u, onClose: f } = n,
					p = s.current,
					{ onPointerInTransitChange: m } = a,
					h = i.useCallback(() => {
						d(null), m(!1);
					}, [m]),
					g = i.useCallback(
						(e, t) => {
							let r,
								n = e.currentTarget,
								i = { x: e.clientX, y: e.clientY },
								a = (function (e, t) {
									const r = Math.abs(t.top - e.y),
										n = Math.abs(t.bottom - e.y),
										i = Math.abs(t.right - e.x),
										a = Math.abs(t.left - e.x);
									switch (Math.min(r, n, i, a)) {
										case a:
											return "left";
										case i:
											return "right";
										case r:
											return "top";
										case n:
											return "bottom";
										default:
											throw Error("unreachable");
									}
								})(i, n.getBoundingClientRect());
							d(
								((r = [
									...(function (e, t, r = 5) {
										const n = [];
										switch (t) {
											case "top":
												n.push(
													{ x: e.x - r, y: e.y + r },
													{ x: e.x + r, y: e.y + r },
												);
												break;
											case "bottom":
												n.push(
													{ x: e.x - r, y: e.y - r },
													{ x: e.x + r, y: e.y - r },
												);
												break;
											case "left":
												n.push(
													{ x: e.x + r, y: e.y - r },
													{ x: e.x + r, y: e.y + r },
												);
												break;
											case "right":
												n.push(
													{ x: e.x - r, y: e.y - r },
													{ x: e.x - r, y: e.y + r },
												);
										}
										return n;
									})(i, a),
									...(function (e) {
										const { top: t, right: r, bottom: n, left: i } = e;
										return [
											{ x: i, y: t },
											{ x: r, y: t },
											{ x: r, y: n },
											{ x: i, y: n },
										];
									})(t.getBoundingClientRect()),
								].slice()).sort((e, t) =>
									e.x < t.x
										? -1
										: e.x > t.x
											? 1
											: e.y < t.y
												? -1
												: 1 * !!(e.y > t.y),
								),
								(function (e) {
									if (e.length <= 1) return e.slice();
									const t = [];
									for (let r = 0; r < e.length; r++) {
										const n = e[r];
										for (; t.length >= 2; ) {
											const e = t[t.length - 1],
												r = t[t.length - 2];
											if (
												(e.x - r.x) * (n.y - r.y) >=
												(e.y - r.y) * (n.x - r.x)
											)
												t.pop();
											else break;
										}
										t.push(n);
									}
									t.pop();
									const r = [];
									for (let t = e.length - 1; t >= 0; t--) {
										const n = e[t];
										for (; r.length >= 2; ) {
											const e = r[r.length - 1],
												t = r[r.length - 2];
											if (
												(e.x - t.x) * (n.y - t.y) >=
												(e.y - t.y) * (n.x - t.x)
											)
												r.pop();
											else break;
										}
										r.push(n);
									}
									return (r.pop(),
									1 === t.length &&
										1 === r.length &&
										t[0].x === r[0].x &&
										t[0].y === r[0].y)
										? t
										: t.concat(r);
								})(r)),
							),
								m(!0);
						},
						[m],
					);
				return (
					i.useEffect(() => () => h(), [h]),
					i.useEffect(() => {
						if (u && p) {
							const e = (e) => g(e, p),
								t = (e) => g(e, u);
							return (
								u.addEventListener("pointerleave", e),
								p.addEventListener("pointerleave", t),
								() => {
									u.removeEventListener("pointerleave", e),
										p.removeEventListener("pointerleave", t);
								}
							);
						}
					}, [u, p, g, h]),
					i.useEffect(() => {
						if (c) {
							const e = (e) => {
								const t = e.target,
									r = { x: e.clientX, y: e.clientY },
									n = u?.contains(t) || p?.contains(t),
									i = !(function (e, t) {
										let { x: r, y: n } = e,
											i = !1;
										for (let e = 0, a = t.length - 1; e < t.length; a = e++) {
											const s = t[e],
												o = t[a],
												l = s.x,
												c = s.y,
												d = o.x,
												u = o.y;
											c > n != u > n &&
												r < ((d - l) * (n - c)) / (u - c) + l &&
												(i = !i);
										}
										return i;
									})(r, c);
								n ? h() : i && (h(), f());
							};
							return (
								document.addEventListener("pointermove", e),
								() => document.removeEventListener("pointermove", e)
							);
						}
					}, [u, p, c, f, h]),
					(0, t.jsx)(q, { ...e, ref: l })
				);
			}),
			[B, _] = v(E, { isInside: !1 }),
			H = (0, h.createSlottable)("TooltipContent"),
			q = i.forwardRef((e, r) => {
				const {
						__scopeTooltip: n,
						children: a,
						"aria-label": s,
						onEscapeKeyDown: o,
						onPointerDownOutside: l,
						...d
					} = e,
					f = P(T, n),
					p = b(n),
					{ onClose: m } = f;
				return (
					i.useEffect(
						() => (
							document.addEventListener(j, m),
							() => document.removeEventListener(j, m)
						),
						[m],
					),
					i.useEffect(() => {
						if (f.trigger) {
							const e = (e) => {
								e.target instanceof Node && e.target.contains(f.trigger) && m();
							};
							return (
								window.addEventListener("scroll", e, { capture: !0 }),
								() => window.removeEventListener("scroll", e, { capture: !0 })
							);
						}
					}, [f.trigger, m]),
					(0, t.jsx)(c.DismissableLayer, {
						asChild: !0,
						disableOutsidePointerEvents: !1,
						onEscapeKeyDown: o,
						onPointerDownOutside: l,
						onFocusOutside: (e) => e.preventDefault(),
						onDismiss: m,
						children: (0, t.jsxs)(u.Content, {
							"data-state": f.stateAttribute,
							...p,
							...d,
							ref: r,
							style: {
								...d.style,
								"--radix-tooltip-content-transform-origin":
									"var(--radix-popper-transform-origin)",
								"--radix-tooltip-content-available-width":
									"var(--radix-popper-available-width)",
								"--radix-tooltip-content-available-height":
									"var(--radix-popper-available-height)",
								"--radix-tooltip-trigger-width":
									"var(--radix-popper-anchor-width)",
								"--radix-tooltip-trigger-height":
									"var(--radix-popper-anchor-height)",
							},
							children: [
								(0, t.jsx)(H, { children: a }),
								(0, t.jsx)(B, {
									scope: n,
									isInside: !0,
									children: (0, t.jsx)(x.Root, {
										id: f.contentId,
										role: "tooltip",
										children: s || a,
									}),
								}),
							],
						}),
					})
				);
			});
		L.displayName = T;
		var U = "TooltipArrow",
			V = i.forwardRef((e, r) => {
				const { __scopeTooltip: n, ...i } = e,
					a = b(n);
				return _(U, n).isInside
					? null
					: (0, t.jsx)(u.Arrow, { ...a, ...i, ref: r });
			});
		V.displayName = U;
		var K = e.i(49696);
		function $({ delayDuration: e = 0, ...r }) {
			return (0, t.jsx)(N, {
				"data-slot": "tooltip-provider",
				delayDuration: e,
				...r,
			});
		}
		function G({ ...e }) {
			return (0, t.jsx)($, {
				children: (0, t.jsx)(R, { "data-slot": "tooltip", ...e }),
			});
		}
		function Q({ ...e }) {
			return (0, t.jsx)(M, { "data-slot": "tooltip-trigger", ...e });
		}
		function W({ className: e, sideOffset: r = 0, children: n, ...i }) {
			return (0, t.jsx)(A, {
				children: (0, t.jsxs)(L, {
					"data-slot": "tooltip-content",
					sideOffset: r,
					className: (0, K.cn)(
						"bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit rounded-md px-3 py-1.5 text-xs text-balance",
						e,
					),
					...i,
					children: [
						n,
						(0, t.jsx)(V, {
							className:
								"-z-10 relative bg-primary dark:bg-stone-900 dark:fill-stone-900 fill-primary size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-[2px]",
						}),
					],
				}),
			});
		}
		e.s(
			[
				"default",
				0,
				function ({ textToCopy: e }) {
					const [s, o] = (0, i.useState)(!1);
					(0, i.useEffect)(() => {
						if (s) {
							const e = setTimeout(() => o(!1), 2e3);
							return () => clearTimeout(e);
						}
					}, [s]);
					const l = async () => {
						try {
							await navigator.clipboard.writeText(e), o(!0);
						} catch (e) {
							console.error("Failed to copy text: ", e);
						}
					};
					return (0, t.jsx)($, {
						children: (0, t.jsxs)(G, {
							children: [
								(0, t.jsx)(Q, {
									asChild: !0,
									children: (0, t.jsxs)(a.Button, {
										variant: "link",
										size: "icon",
										onClick: l,
										className: "h-8 w-8",
										children: [
											s
												? (0, t.jsx)(r.Check, { className: "h-4 w-4 " })
												: (0, t.jsx)(n.default, { className: "h-4 w-4" }),
											(0, t.jsx)("span", {
												className: "sr-only",
												children: "Copy to clipboard",
											}),
										],
									}),
								}),
								(0, t.jsx)(W, {
									children: (0, t.jsx)("p", {
										children: s ? "Copied!" : "Copy to clipboard",
									}),
								}),
							],
						}),
					});
				},
			],
			85926,
		),
			e.s(
				[
					"useImagePreview",
					0,
					function () {
						const [e, t] = (0, i.useState)(null),
							[r, n] = (0, i.useState)(null),
							a = (0, i.useRef)(null);
						(0, i.useEffect)(() => {
							a.current = r;
						}, [r]),
							(0, i.useEffect)(
								() => () => {
									a.current && URL.revokeObjectURL(a.current);
								},
								[],
							);
						const s = (0, i.useCallback)((e) => {
								const r = e.target.files?.[0];
								r &&
									(t(r),
									n(
										(e) => (
											e && URL.revokeObjectURL(e), URL.createObjectURL(r)
										),
									));
							}, []),
							o = (0, i.useCallback)(() => {
								r && URL.revokeObjectURL(r), t(null), n(null);
							}, [r]);
						return {
							image: e,
							imagePreview: r,
							handleImageChange: s,
							clearImage: o,
						};
					},
				],
				38870,
			);
	},
	30307,
	86489,
	(e) => {
		"use strict";
		var t = e.i(57319),
			r = e.i(97557),
			n = e.i(28139),
			i = e.i(67714),
			a = e.i(15246),
			s = e.i(72476),
			o = e.i(33833),
			l = e.i(9964),
			c = e.i(5396),
			d = e.i(53212),
			u = e.i(62613),
			f = "rovingFocusGroup.onEntryFocus",
			p = { bubbles: !1, cancelable: !0 },
			m = "RovingFocusGroup",
			[h, g, x] = (0, n.createCollection)(m),
			[v, w] = (0, a.createContextScope)(m, [x]),
			[b, y] = v(m),
			j = t.forwardRef((e, t) =>
				(0, u.jsx)(h.Provider, {
					scope: e.__scopeRovingFocusGroup,
					children: (0, u.jsx)(h.Slot, {
						scope: e.__scopeRovingFocusGroup,
						children: (0, u.jsx)(k, { ...e, ref: t }),
					}),
				}),
			);
		j.displayName = m;
		var k = t.forwardRef((e, n) => {
				const {
						__scopeRovingFocusGroup: a,
						orientation: s,
						loop: h = !1,
						dir: x,
						currentTabStopId: v,
						defaultCurrentTabStopId: w,
						onCurrentTabStopIdChange: y,
						onEntryFocus: j,
						preventScrollOnEntryFocus: k = !1,
						...C
					} = e,
					N = t.useRef(null),
					E = (0, i.useComposedRefs)(n, N),
					P = (0, d.useDirection)(x),
					[R, z] = (0, c.useControllableState)({
						prop: v,
						defaultProp: w ?? null,
						onChange: y,
						caller: m,
					}),
					[M, D] = t.useState(!1),
					I = (0, l.useCallbackRef)(j),
					F = g(a),
					A = t.useRef(!1),
					[T, L] = t.useState(0);
				return (
					t.useEffect(() => {
						const e = N.current;
						if (e)
							return (
								e.addEventListener(f, I), () => e.removeEventListener(f, I)
							);
					}, [I]),
					(0, u.jsx)(b, {
						scope: a,
						orientation: s,
						dir: P,
						loop: h,
						currentTabStopId: R,
						onItemFocus: t.useCallback((e) => z(e), [z]),
						onItemShiftTab: t.useCallback(() => D(!0), []),
						onFocusableItemAdd: t.useCallback(() => L((e) => e + 1), []),
						onFocusableItemRemove: t.useCallback(() => L((e) => e - 1), []),
						children: (0, u.jsx)(o.Primitive.div, {
							tabIndex: M || 0 === T ? -1 : 0,
							"data-orientation": s,
							...C,
							ref: E,
							style: { outline: "none", ...e.style },
							onMouseDown: (0, r.composeEventHandlers)(e.onMouseDown, () => {
								A.current = !0;
							}),
							onFocus: (0, r.composeEventHandlers)(e.onFocus, (e) => {
								const t = !A.current;
								if (e.target === e.currentTarget && t && !M) {
									const t = new CustomEvent(f, p);
									if ((e.currentTarget.dispatchEvent(t), !t.defaultPrevented)) {
										const e = F().filter((e) => e.focusable);
										S(
											[e.find((e) => e.active), e.find((e) => e.id === R), ...e]
												.filter(Boolean)
												.map((e) => e.ref.current),
											k,
										);
									}
								}
								A.current = !1;
							}),
							onBlur: (0, r.composeEventHandlers)(e.onBlur, () => D(!1)),
						}),
					})
				);
			}),
			C = "RovingFocusGroupItem",
			N = t.forwardRef((e, n) => {
				const {
						__scopeRovingFocusGroup: i,
						focusable: a = !0,
						active: l = !1,
						tabStopId: c,
						children: d,
						...f
					} = e,
					p = (0, s.useId)(),
					m = c || p,
					x = y(C, i),
					v = x.currentTabStopId === m,
					w = g(i),
					{
						onFocusableItemAdd: b,
						onFocusableItemRemove: j,
						currentTabStopId: k,
					} = x;
				return (
					t.useEffect(() => {
						if (a) return b(), () => j();
					}, [a, b, j]),
					(0, u.jsx)(h.ItemSlot, {
						scope: i,
						id: m,
						focusable: a,
						active: l,
						children: (0, u.jsx)(o.Primitive.span, {
							tabIndex: v ? 0 : -1,
							"data-orientation": x.orientation,
							...f,
							ref: n,
							onMouseDown: (0, r.composeEventHandlers)(e.onMouseDown, (e) => {
								a ? x.onItemFocus(m) : e.preventDefault();
							}),
							onFocus: (0, r.composeEventHandlers)(e.onFocus, () =>
								x.onItemFocus(m),
							),
							onKeyDown: (0, r.composeEventHandlers)(e.onKeyDown, (e) => {
								if ("Tab" === e.key && e.shiftKey)
									return void x.onItemShiftTab();
								if (e.target !== e.currentTarget) return;
								const t = (function (e, t, r) {
									var n;
									const i =
										((n = e.key),
										"rtl" !== r
											? n
											: "ArrowLeft" === n
												? "ArrowRight"
												: "ArrowRight" === n
													? "ArrowLeft"
													: n);
									if (
										!(
											"vertical" === t &&
											["ArrowLeft", "ArrowRight"].includes(i)
										) &&
										!(
											"horizontal" === t && ["ArrowUp", "ArrowDown"].includes(i)
										)
									)
										return E[i];
								})(e, x.orientation, x.dir);
								if (void 0 !== t) {
									if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
									e.preventDefault();
									let i = w()
										.filter((e) => e.focusable)
										.map((e) => e.ref.current);
									if ("last" === t) i.reverse();
									else if ("prev" === t || "next" === t) {
										var r, n;
										"prev" === t && i.reverse();
										const a = i.indexOf(e.currentTarget);
										i = x.loop
											? ((r = i),
												(n = a + 1),
												r.map((e, t) => r[(n + t) % r.length]))
											: i.slice(a + 1);
									}
									setTimeout(() => S(i));
								}
							}),
							children:
								"function" == typeof d
									? d({ isCurrentTabStop: v, hasTabStop: null != k })
									: d,
						}),
					})
				);
			});
		N.displayName = C;
		var E = {
			ArrowLeft: "prev",
			ArrowUp: "prev",
			ArrowRight: "next",
			ArrowDown: "next",
			PageUp: "first",
			Home: "first",
			PageDown: "last",
			End: "last",
		};
		function S(e, t = !1) {
			const r = document.activeElement;
			for (const n of e)
				if (
					n === r ||
					(n.focus({ preventScroll: t }), document.activeElement !== r)
				)
					return;
		}
		e.s(
			["Item", 0, N, "Root", 0, j, "createRovingFocusGroupScope", 0, w],
			30307,
		);
		const P = (0, e.i(10283).default)("circle", [
			["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
		]);
		e.s(["CircleIcon", 0, P], 86489);
	},
	66124,
	(e) => {
		"use strict";
		var t = e.i(62613),
			r = e.i(81986);
		e.i(8343);
		var n = e.i(57319),
			i = e.i(87400),
			a = e.i(667),
			s = e.i(12866),
			o = e.i(93516),
			l = e.i(61966),
			c = n,
			d = e.i(61262);
		function u(e, t) {
			if ("function" == typeof e) return e(t);
			null != e && (e.current = t);
		}
		class f extends c.Component {
			getSnapshotBeforeUpdate(e) {
				const t = this.props.childRef.current;
				if (
					(0, l.isHTMLElement)(t) &&
					e.isPresent &&
					!this.props.isPresent &&
					!1 !== this.props.pop
				) {
					const e = t.offsetParent,
						r = ((0, l.isHTMLElement)(e) && e.offsetWidth) || 0,
						n = ((0, l.isHTMLElement)(e) && e.offsetHeight) || 0,
						i = getComputedStyle(t),
						a = this.props.sizeRef.current;
					(a.height = parseFloat(i.height)),
						(a.width = parseFloat(i.width)),
						(a.top = t.offsetTop),
						(a.left = t.offsetLeft),
						(a.right = r - a.width - a.left),
						(a.bottom = n - a.height - a.top),
						(a.direction = i.direction);
				}
				return null;
			}
			componentDidUpdate() {}
			render() {
				return this.props.children;
			}
		}
		function p({
			children: e,
			isPresent: r,
			anchorX: i,
			anchorY: a,
			root: s,
			pop: o,
		}) {
			const l = (0, c.useId)(),
				m = (0, c.useRef)(null),
				h = (0, c.useRef)({
					width: 0,
					height: 0,
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					direction: "ltr",
				}),
				{ nonce: g } = (0, c.useContext)(d.MotionConfigContext),
				x = (function (...e) {
					return n.useCallback(
						(function (...e) {
							return (t) => {
								let r = !1,
									n = e.map((e) => {
										const n = u(e, t);
										return r || "function" != typeof n || (r = !0), n;
									});
								if (r)
									return () => {
										for (let t = 0; t < n.length; t++) {
											const r = n[t];
											"function" == typeof r ? r() : u(e[t], null);
										}
									};
							};
						})(...e),
						e,
					);
				})(m, e.props?.ref ?? e?.ref);
			return (
				(0, c.useInsertionEffect)(() => {
					const {
						width: e,
						height: t,
						top: n,
						left: c,
						right: d,
						bottom: u,
						direction: f,
					} = h.current;
					if (r || !1 === o || !m.current || !e || !t) return;
					const p = "rtl" === f,
						x =
							"left" === i
								? p
									? `right: ${d}`
									: `left: ${c}`
								: p
									? `left: ${c}`
									: `right: ${d}`,
						v = "bottom" === a ? `bottom: ${u}` : `top: ${n}`;
					m.current.dataset.motionPopId = l;
					const w = document.createElement("style");
					g && (w.nonce = g);
					const b = s ?? document.head;
					return (
						b.appendChild(w),
						w.sheet &&
							w.sheet.insertRule(`
          [data-motion-pop-id="${l}"] {
            position: absolute !important;
            width: ${e}px !important;
            height: ${t}px !important;
            ${x}px !important;
            ${v}px !important;
          }
        `),
						() => {
							m.current?.removeAttribute("data-motion-pop-id"),
								b.contains(w) && b.removeChild(w);
						}
					);
				}, [r]),
				(0, t.jsx)(f, {
					isPresent: r,
					childRef: m,
					sizeRef: h,
					pop: o,
					children: !1 === o ? e : c.cloneElement(e, { ref: x }),
				})
			);
		}
		const m = ({
			children: e,
			initial: r,
			isPresent: i,
			onExitComplete: s,
			custom: l,
			presenceAffectsLayout: c,
			mode: d,
			anchorX: u,
			anchorY: f,
			root: m,
		}) => {
			let g = (0, a.useConstant)(h),
				x = (0, n.useId)(),
				v = !0,
				w = (0, n.useMemo)(
					() => (
						(v = !1),
						{
							id: x,
							initial: r,
							isPresent: i,
							custom: l,
							onExitComplete: (e) => {
								for (const t of (g.set(e, !0), g.values())) if (!t) return;
								s && s();
							},
							register: (e) => (g.set(e, !1), () => g.delete(e)),
						}
					),
					[i, g, s],
				);
			return (
				c && v && (w = { ...w }),
				(0, n.useMemo)(() => {
					g.forEach((e, t) => g.set(t, !1));
				}, [i]),
				n.useEffect(() => {
					i || g.size || !s || s();
				}, [i]),
				(e = (0, t.jsx)(p, {
					pop: "popLayout" === d,
					isPresent: i,
					anchorX: u,
					anchorY: f,
					root: m,
					children: e,
				})),
				(0, t.jsx)(o.PresenceContext.Provider, { value: w, children: e })
			);
		};
		function h() {
			return new Map();
		}
		var g = e.i(86439);
		const x = (e) => e.key || "";
		function v(e) {
			const t = [];
			return (
				n.Children.forEach(e, (e) => {
					(0, n.isValidElement)(e) && t.push(e);
				}),
				t
			);
		}
		const w = ({
			children: e,
			custom: r,
			initial: o = !0,
			onExitComplete: l,
			presenceAffectsLayout: c = !0,
			mode: d = "sync",
			propagate: u = !1,
			anchorX: f = "left",
			anchorY: p = "top",
			root: h,
		}) => {
			const [w, b] = (0, g.usePresence)(u),
				y = (0, n.useMemo)(() => v(e), [e]),
				j = u && !w ? [] : y.map(x),
				k = (0, n.useRef)(!0),
				C = (0, n.useRef)(y),
				N = (0, a.useConstant)(() => new Map()),
				E = (0, n.useRef)(new Set()),
				[S, P] = (0, n.useState)(y),
				[R, z] = (0, n.useState)(y);
			(0, s.useIsomorphicLayoutEffect)(() => {
				(k.current = !1), (C.current = y);
				for (let e = 0; e < R.length; e++) {
					const t = x(R[e]);
					j.includes(t)
						? (N.delete(t), E.current.delete(t))
						: !0 !== N.get(t) && N.set(t, !1);
				}
			}, [R, j.length, j.join("-")]);
			const M = [];
			if (y !== S) {
				let e = [...y];
				for (let t = 0; t < R.length; t++) {
					const r = R[t],
						n = x(r);
					j.includes(n) || (e.splice(t, 0, r), M.push(r));
				}
				return "wait" === d && M.length && (e = M), z(v(e)), P(y), null;
			}
			const { forceRender: D } = (0, n.useContext)(i.LayoutGroupContext);
			return (0, t.jsx)(t.Fragment, {
				children: R.map((e) => {
					const n = x(e),
						i = (!u || !!w) && (y === R || j.includes(n));
					return (0, t.jsx)(
						m,
						{
							isPresent: i,
							initial: (!k.current || !!o) && void 0,
							custom: r,
							presenceAffectsLayout: c,
							mode: d,
							root: h,
							onExitComplete: i
								? void 0
								: () => {
										if (E.current.has(n) || !N.has(n)) return;
										E.current.add(n), N.set(n, !0);
										let e = !0;
										N.forEach((t) => {
											t || (e = !1);
										}),
											e && (D?.(), z(C.current), u && b?.(), l && l());
									},
							anchorX: f,
							anchorY: p,
							children: e,
						},
						n,
					);
				}),
			});
		};
		var b = e.i(69075),
			y = e.i(69016),
			j = e.i(10283);
		const k = (0, j.default)("mail-plus", [
			[
				"path",
				{
					d: "M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8",
					key: "12jkf8",
				},
			],
			[
				"path",
				{ d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7", key: "1ocrg3" },
			],
			["path", { d: "M19 16v6", key: "tddt3s" }],
			["path", { d: "M16 19h6", key: "xwg31i" }],
		]);
		var C = e.i(26735),
			N = e.i(25653),
			E = e.i(2398),
			S = e.i(79007),
			P = e.i(26638),
			R = e.i(88642),
			z = e.i(3390),
			M = e.i(1359),
			D = e.i(95869),
			I = e.i(82537),
			F = e.i(61645),
			A = e.i(76706),
			T = e.i(62020);
		async function L(e) {
			const { data: t, error: r } = await A.authClient.organization.create({
				name: e.name,
				slug: e.slug,
				logo: e.logo,
			});
			if (r) throw Error(r.message);
			return t;
		}
		var O = e.i(38870),
			B = e.i(49696);
		const _ = P.object({
			name: P.string()
				.min(2, "Name must be at least 2 characters")
				.max(50, "Name must be at most 50 characters"),
			slug: P.string()
				.min(2, "Slug must be at least 2 characters")
				.max(50, "Slug must be at most 50 characters")
				.regex(
					/^[a-z0-9-]+$/,
					"Slug can only contain lowercase letters, numbers, and hyphens",
				),
		});
		function H({ onSuccess: e, onError: r }) {
			let i,
				a =
					((i = (0, I.useQueryClient)()),
					(0, D.useMutation)({
						mutationFn: L,
						onSuccess: () => {
							i.invalidateQueries({ queryKey: T.organizationKeys.all() }),
								F.toast.success("Organization created successfully");
						},
						onError: (e) => {
							F.toast.error(e.message || "Failed to create organization");
						},
					})),
				{
					image: s,
					imagePreview: o,
					handleImageChange: l,
					clearImage: c,
				} = (0, O.useImagePreview)(),
				{
					control: d,
					handleSubmit: u,
					watch: f,
					setValue: p,
					formState: { errors: m, dirtyFields: h },
				} = (0, S.useForm)({
					resolver: (0, C.zodResolver)(_),
					defaultValues: { name: "", slug: "" },
				}),
				g = f("name");
			(0, n.useEffect)(() => {
				h.slug ||
					p(
						"slug",
						g
							.trim()
							.toLowerCase()
							.replace(/\s+/g, "-")
							.replace(/[^a-z0-9-]/g, ""),
					);
			}, [g, h.slug, p]);
			const x = async (t) => {
				try {
					const n = s ? await (0, B.convertImageToBase64)(s) : void 0;
					a.mutate(
						{ name: t.name, slug: t.slug, logo: n },
						{
							onSuccess: () => {
								e?.();
							},
							onError: (e) => {
								r?.(e.message);
							},
						},
					);
				} catch (e) {
					r?.(e instanceof Error ? e.message : "Failed to process image");
				}
			};
			return (0, t.jsx)("form", {
				onSubmit: u(x),
				children: (0, t.jsxs)(z.FieldGroup, {
					children: [
						(0, t.jsx)(S.Controller, {
							name: "name",
							control: d,
							render: ({ field: e }) =>
								(0, t.jsxs)(z.Field, {
									children: [
										(0, t.jsx)(z.FieldLabel, {
											htmlFor: "org-name",
											children: "Organization Name",
										}),
										(0, t.jsx)(M.Input, {
											id: "org-name",
											placeholder: "My Organization",
											disabled: a.isPending,
											...e,
										}),
										(0, t.jsx)(z.FieldError, { children: m.name?.message }),
									],
								}),
						}),
						(0, t.jsx)(S.Controller, {
							name: "slug",
							control: d,
							render: ({ field: e }) =>
								(0, t.jsxs)(z.Field, {
									children: [
										(0, t.jsx)(z.FieldLabel, {
											htmlFor: "org-slug",
											children: "Organization Slug",
										}),
										(0, t.jsx)(M.Input, {
											id: "org-slug",
											placeholder: "my-organization",
											disabled: a.isPending,
											...e,
										}),
										(0, t.jsx)(z.FieldError, { children: m.slug?.message }),
									],
								}),
						}),
						(0, t.jsxs)(z.Field, {
							children: [
								(0, t.jsx)(z.FieldLabel, {
									htmlFor: "org-logo",
									children: "Logo",
								}),
								(0, t.jsxs)("div", {
									className: "flex items-end gap-4",
									children: [
										o &&
											(0, t.jsx)("div", {
												className:
													"relative w-16 h-16 rounded-sm overflow-hidden",
												children: (0, t.jsx)(E.default, {
													src: o,
													alt: "Logo preview",
													fill: !0,
													className: "object-cover",
												}),
											}),
										(0, t.jsxs)("div", {
											className: "flex items-center gap-2 w-full",
											children: [
												(0, t.jsx)(M.Input, {
													id: "org-logo",
													type: "file",
													accept: "image/*",
													onChange: l,
													disabled: a.isPending,
													className: "w-full text-muted-foreground",
												}),
												o &&
													(0, t.jsx)(N.X, {
														className: "cursor-pointer",
														onClick: c,
														"aria-label": "Clear logo",
													}),
											],
										}),
									],
								}),
							],
						}),
						(0, t.jsx)(R.Button, {
							type: "submit",
							disabled: a.isPending,
							children: a.isPending
								? (0, t.jsx)(y.Loader2, { size: 15, className: "animate-spin" })
								: "Create",
						}),
					],
				}),
			});
		}
		var q = e.i(78363);
		async function U(e) {
			const { data: t, error: r } =
				await A.authClient.organization.inviteMember({
					email: e.email,
					role: e.role,
				});
			if (r) throw Error(r.message);
			return t;
		}
		const V = P.object({
			email: P.email("Please enter a valid email address"),
			role: P.enum(["admin", "member"], { error: "Please select a role" }),
		});
		function K({ onSuccess: e, onError: r }) {
			let n,
				i =
					((n = (0, I.useQueryClient)()),
					(0, D.useMutation)({
						mutationFn: U,
						onSuccess: () => {
							n.invalidateQueries({ queryKey: T.organizationKeys.detail() }),
								F.toast.success("Member invited successfully");
						},
						onError: (e) => {
							F.toast.error(e.message || "Failed to invite member");
						},
					})),
				{
					control: a,
					handleSubmit: s,
					reset: o,
					formState: { errors: l },
				} = (0, S.useForm)({
					resolver: (0, C.zodResolver)(V),
					defaultValues: { email: "", role: "member" },
				});
			return (0, t.jsx)("form", {
				onSubmit: s((t) => {
					i.mutate(
						{ email: t.email, role: t.role },
						{
							onSuccess: () => {
								o(), e?.();
							},
							onError: (e) => {
								r?.(e.message);
							},
						},
					);
				}),
				children: (0, t.jsxs)(z.FieldGroup, {
					children: [
						(0, t.jsx)(S.Controller, {
							name: "email",
							control: a,
							render: ({ field: e }) =>
								(0, t.jsxs)(z.Field, {
									children: [
										(0, t.jsx)(z.FieldLabel, {
											htmlFor: "invite-email",
											children: "Email",
										}),
										(0, t.jsx)(M.Input, {
											id: "invite-email",
											type: "email",
											placeholder: "member@example.com",
											disabled: i.isPending,
											...e,
										}),
										(0, t.jsx)(z.FieldError, { children: l.email?.message }),
									],
								}),
						}),
						(0, t.jsx)(S.Controller, {
							name: "role",
							control: a,
							render: ({ field: e }) =>
								(0, t.jsxs)(z.Field, {
									children: [
										(0, t.jsx)(z.FieldLabel, {
											htmlFor: "invite-role",
											children: "Role",
										}),
										(0, t.jsxs)(q.Select, {
											value: e.value,
											onValueChange: e.onChange,
											disabled: i.isPending,
											children: [
												(0, t.jsx)(q.SelectTrigger, {
													id: "invite-role",
													children: (0, t.jsx)(q.SelectValue, {
														placeholder: "Select a role",
													}),
												}),
												(0, t.jsxs)(q.SelectContent, {
													children: [
														(0, t.jsx)(q.SelectItem, {
															value: "admin",
															children: "Admin",
														}),
														(0, t.jsx)(q.SelectItem, {
															value: "member",
															children: "Member",
														}),
													],
												}),
											],
										}),
										(0, t.jsx)(z.FieldError, { children: l.role?.message }),
									],
								}),
						}),
						(0, t.jsx)(R.Button, {
							type: "submit",
							disabled: i.isPending,
							children: i.isPending
								? (0, t.jsx)(y.Loader2, { size: 15, className: "animate-spin" })
								: "Invite",
						}),
					],
				}),
			});
		}
		var $ = e.i(11185),
			G = e.i(49139),
			Q = e.i(85926),
			W = e.i(16066),
			X = e.i(97557),
			Y = e.i(67714),
			Z = e.i(15246),
			J = e.i(5396),
			ee = e.i(33833),
			et = e.i(28139),
			er = e.i(53212),
			en = e.i(48661),
			ei = e.i(37381),
			ea = e.i(88866),
			es = e.i(72476),
			eo = e.i(82976),
			el = e.i(51168),
			ec = e.i(49674),
			ed = e.i(30307),
			eu = e.i(9671),
			ef = e.i(9964),
			ep = e.i(62876),
			em = e.i(10035),
			eh = ["Enter", " "],
			eg = ["ArrowUp", "PageDown", "End"],
			ex = ["ArrowDown", "PageUp", "Home", ...eg],
			ev = { ltr: [...eh, "ArrowRight"], rtl: [...eh, "ArrowLeft"] },
			ew = { ltr: ["ArrowLeft"], rtl: ["ArrowRight"] },
			eb = "Menu",
			[ey, ej, ek] = (0, et.createCollection)(eb),
			[eC, eN] = (0, Z.createContextScope)(eb, [
				ek,
				eo.createPopperScope,
				ed.createRovingFocusGroupScope,
			]),
			eE = (0, eo.createPopperScope)(),
			eS = (0, ed.createRovingFocusGroupScope)(),
			[eP, eR] = eC(eb),
			[ez, eM] = eC(eb),
			eD = (e) => {
				const {
						__scopeMenu: r,
						open: i = !1,
						children: a,
						dir: s,
						onOpenChange: o,
						modal: l = !0,
					} = e,
					c = eE(r),
					[d, u] = n.useState(null),
					f = n.useRef(!1),
					p = (0, ef.useCallbackRef)(o),
					m = (0, er.useDirection)(s);
				return (
					n.useEffect(() => {
						const e = () => {
								(f.current = !0),
									document.addEventListener("pointerdown", t, {
										capture: !0,
										once: !0,
									}),
									document.addEventListener("pointermove", t, {
										capture: !0,
										once: !0,
									});
							},
							t = () => (f.current = !1);
						return (
							document.addEventListener("keydown", e, { capture: !0 }),
							() => {
								document.removeEventListener("keydown", e, { capture: !0 }),
									document.removeEventListener("pointerdown", t, {
										capture: !0,
									}),
									document.removeEventListener("pointermove", t, {
										capture: !0,
									});
							}
						);
					}, []),
					n.useEffect(() => {
						if (!i) return;
						const e = () => p(!1);
						return (
							window.addEventListener("blur", e),
							() => window.removeEventListener("blur", e)
						);
					}, [i, p]),
					(0, t.jsx)(eo.Root, {
						...c,
						children: (0, t.jsx)(eP, {
							scope: r,
							open: i,
							onOpenChange: p,
							content: d,
							onContentChange: u,
							children: (0, t.jsx)(ez, {
								scope: r,
								onClose: n.useCallback(() => p(!1), [p]),
								isUsingKeyboardRef: f,
								dir: m,
								modal: l,
								children: a,
							}),
						}),
					})
				);
			};
		eD.displayName = eb;
		var eI = n.forwardRef((e, r) => {
			const { __scopeMenu: n, ...i } = e,
				a = eE(n);
			return (0, t.jsx)(eo.Anchor, { ...a, ...i, ref: r });
		});
		eI.displayName = "MenuAnchor";
		var eF = "MenuPortal",
			[eA, eT] = eC(eF, { forceMount: void 0 }),
			eL = (e) => {
				const { __scopeMenu: r, forceMount: n, children: i, container: a } = e,
					s = eR(eF, r);
				return (0, t.jsx)(eA, {
					scope: r,
					forceMount: n,
					children: (0, t.jsx)(ec.Presence, {
						present: n || s.open,
						children: (0, t.jsx)(el.Portal, {
							asChild: !0,
							container: a,
							children: i,
						}),
					}),
				});
			};
		eL.displayName = eF;
		var eO = "MenuContent",
			[eB, e_] = eC(eO),
			eH = n.forwardRef((e, r) => {
				const n = eT(eO, e.__scopeMenu),
					{ forceMount: i = n.forceMount, ...a } = e,
					s = eR(eO, e.__scopeMenu),
					o = eM(eO, e.__scopeMenu);
				return (0, t.jsx)(ey.Provider, {
					scope: e.__scopeMenu,
					children: (0, t.jsx)(ec.Presence, {
						present: i || s.open,
						children: (0, t.jsx)(ey.Slot, {
							scope: e.__scopeMenu,
							children: o.modal
								? (0, t.jsx)(eq, { ...a, ref: r })
								: (0, t.jsx)(eU, { ...a, ref: r }),
						}),
					}),
				});
			}),
			eq = n.forwardRef((e, r) => {
				const i = eR(eO, e.__scopeMenu),
					a = n.useRef(null),
					s = (0, Y.useComposedRefs)(r, a);
				return (
					n.useEffect(() => {
						const e = a.current;
						if (e) return (0, ep.hideOthers)(e);
					}, []),
					(0, t.jsx)(eK, {
						...e,
						ref: s,
						trapFocus: i.open,
						disableOutsidePointerEvents: i.open,
						disableOutsideScroll: !0,
						onFocusOutside: (0, X.composeEventHandlers)(
							e.onFocusOutside,
							(e) => e.preventDefault(),
							{ checkForDefaultPrevented: !1 },
						),
						onDismiss: () => i.onOpenChange(!1),
					})
				);
			}),
			eU = n.forwardRef((e, r) => {
				const n = eR(eO, e.__scopeMenu);
				return (0, t.jsx)(eK, {
					...e,
					ref: r,
					trapFocus: !1,
					disableOutsidePointerEvents: !1,
					disableOutsideScroll: !1,
					onDismiss: () => n.onOpenChange(!1),
				});
			}),
			eV = (0, eu.createSlot)("MenuContent.ScrollLock"),
			eK = n.forwardRef((e, r) => {
				const {
						__scopeMenu: i,
						loop: a = !1,
						trapFocus: s,
						onOpenAutoFocus: o,
						onCloseAutoFocus: l,
						disableOutsidePointerEvents: c,
						onEntryFocus: d,
						onEscapeKeyDown: u,
						onPointerDownOutside: f,
						onFocusOutside: p,
						onInteractOutside: m,
						onDismiss: h,
						disableOutsideScroll: g,
						...x
					} = e,
					v = eR(eO, i),
					w = eM(eO, i),
					b = eE(i),
					y = eS(i),
					j = ej(i),
					[k, C] = n.useState(null),
					N = n.useRef(null),
					E = (0, Y.useComposedRefs)(r, N, v.onContentChange),
					S = n.useRef(0),
					P = n.useRef(""),
					R = n.useRef(0),
					z = n.useRef(null),
					M = n.useRef("right"),
					D = n.useRef(0),
					I = g ? em.RemoveScroll : n.Fragment;
				n.useEffect(() => () => window.clearTimeout(S.current), []),
					(0, ei.useFocusGuards)();
				const F = n.useCallback((e) => {
					var t, r;
					return (
						M.current === z.current?.side &&
						((t = e),
						!!(r = z.current?.area) &&
							(function (e, t) {
								let { x: r, y: n } = e,
									i = !1;
								for (let e = 0, a = t.length - 1; e < t.length; a = e++) {
									const s = t[e],
										o = t[a],
										l = s.x,
										c = s.y,
										d = o.x,
										u = o.y;
									c > n != u > n &&
										r < ((d - l) * (n - c)) / (u - c) + l &&
										(i = !i);
								}
								return i;
							})({ x: t.clientX, y: t.clientY }, r))
					);
				}, []);
				return (0, t.jsx)(eB, {
					scope: i,
					searchRef: P,
					onItemEnter: n.useCallback(
						(e) => {
							F(e) && e.preventDefault();
						},
						[F],
					),
					onItemLeave: n.useCallback(
						(e) => {
							F(e) || (N.current?.focus(), C(null));
						},
						[F],
					),
					onTriggerLeave: n.useCallback(
						(e) => {
							F(e) && e.preventDefault();
						},
						[F],
					),
					pointerGraceTimerRef: R,
					onPointerGraceIntentChange: n.useCallback((e) => {
						z.current = e;
					}, []),
					children: (0, t.jsx)(I, {
						...(g ? { as: eV, allowPinchZoom: !0 } : void 0),
						children: (0, t.jsx)(ea.FocusScope, {
							asChild: !0,
							trapped: s,
							onMountAutoFocus: (0, X.composeEventHandlers)(o, (e) => {
								e.preventDefault(), N.current?.focus({ preventScroll: !0 });
							}),
							onUnmountAutoFocus: l,
							children: (0, t.jsx)(en.DismissableLayer, {
								asChild: !0,
								disableOutsidePointerEvents: c,
								onEscapeKeyDown: u,
								onPointerDownOutside: f,
								onFocusOutside: p,
								onInteractOutside: m,
								onDismiss: h,
								children: (0, t.jsx)(ed.Root, {
									asChild: !0,
									...y,
									dir: w.dir,
									orientation: "vertical",
									loop: a,
									currentTabStopId: k,
									onCurrentTabStopIdChange: C,
									onEntryFocus: (0, X.composeEventHandlers)(d, (e) => {
										w.isUsingKeyboardRef.current || e.preventDefault();
									}),
									preventScrollOnEntryFocus: !0,
									children: (0, t.jsx)(eo.Content, {
										role: "menu",
										"aria-orientation": "vertical",
										"data-state": to(v.open),
										"data-radix-menu-content": "",
										dir: w.dir,
										...b,
										...x,
										ref: E,
										style: { outline: "none", ...x.style },
										onKeyDown: (0, X.composeEventHandlers)(x.onKeyDown, (e) => {
											const t =
													e.target.closest("[data-radix-menu-content]") ===
													e.currentTarget,
												r = e.ctrlKey || e.altKey || e.metaKey,
												n = 1 === e.key.length;
											if (t) {
												var i;
												let t, a, s, o, l, c;
												"Tab" === e.key && e.preventDefault(),
													!r &&
														n &&
														((i = e.key),
														(t = P.current + i),
														(a = j().filter((e) => !e.disabled)),
														(s = document.activeElement),
														(o = a.find((e) => e.ref.current === s)?.textValue),
														(l = (function (e, t, r) {
															var n;
															let i =
																	t.length > 1 &&
																	Array.from(t).every((e) => e === t[0])
																		? t[0]
																		: t,
																a = r ? e.indexOf(r) : -1,
																s =
																	((n = Math.max(a, 0)),
																	e.map((t, r) => e[(n + r) % e.length]));
															1 === i.length && (s = s.filter((e) => e !== r));
															const o = s.find((e) =>
																e.toLowerCase().startsWith(i.toLowerCase()),
															);
															return o !== r ? o : void 0;
														})(
															a.map((e) => e.textValue),
															t,
															o,
														)),
														(c = a.find((e) => e.textValue === l)?.ref.current),
														(function e(t) {
															(P.current = t),
																window.clearTimeout(S.current),
																"" !== t &&
																	(S.current = window.setTimeout(
																		() => e(""),
																		1e3,
																	));
														})(t),
														c && setTimeout(() => c.focus()));
											}
											const a = N.current;
											if (e.target !== a || !ex.includes(e.key)) return;
											e.preventDefault();
											const s = j()
												.filter((e) => !e.disabled)
												.map((e) => e.ref.current);
											eg.includes(e.key) && s.reverse(),
												(function (e) {
													const t = document.activeElement;
													for (const r of e)
														if (
															r === t ||
															(r.focus(), document.activeElement !== t)
														)
															return;
												})(s);
										}),
										onBlur: (0, X.composeEventHandlers)(e.onBlur, (e) => {
											e.currentTarget.contains(e.target) ||
												(window.clearTimeout(S.current), (P.current = ""));
										}),
										onPointerMove: (0, X.composeEventHandlers)(
											e.onPointerMove,
											td((e) => {
												const t = e.target,
													r = D.current !== e.clientX;
												e.currentTarget.contains(t) &&
													r &&
													((M.current =
														e.clientX > D.current ? "right" : "left"),
													(D.current = e.clientX));
											}),
										),
									}),
								}),
							}),
						}),
					}),
				});
			});
		eH.displayName = eO;
		var e$ = n.forwardRef((e, r) => {
			const { __scopeMenu: n, ...i } = e;
			return (0, t.jsx)(ee.Primitive.div, { role: "group", ...i, ref: r });
		});
		e$.displayName = "MenuGroup";
		var eG = n.forwardRef((e, r) => {
			const { __scopeMenu: n, ...i } = e;
			return (0, t.jsx)(ee.Primitive.div, { ...i, ref: r });
		});
		eG.displayName = "MenuLabel";
		var eQ = "MenuItem",
			eW = "menu.itemSelect",
			eX = n.forwardRef((e, r) => {
				const { disabled: i = !1, onSelect: a, ...s } = e,
					o = n.useRef(null),
					l = eM(eQ, e.__scopeMenu),
					c = e_(eQ, e.__scopeMenu),
					d = (0, Y.useComposedRefs)(r, o),
					u = n.useRef(!1);
				return (0, t.jsx)(eY, {
					...s,
					ref: d,
					disabled: i,
					onClick: (0, X.composeEventHandlers)(e.onClick, () => {
						const e = o.current;
						if (!i && e) {
							const t = new CustomEvent(eW, { bubbles: !0, cancelable: !0 });
							e.addEventListener(eW, (e) => a?.(e), { once: !0 }),
								(0, ee.dispatchDiscreteCustomEvent)(e, t),
								t.defaultPrevented ? (u.current = !1) : l.onClose();
						}
					}),
					onPointerDown: (t) => {
						e.onPointerDown?.(t), (u.current = !0);
					},
					onPointerUp: (0, X.composeEventHandlers)(e.onPointerUp, (e) => {
						u.current || e.currentTarget?.click();
					}),
					onKeyDown: (0, X.composeEventHandlers)(e.onKeyDown, (e) => {
						const t = "" !== c.searchRef.current;
						i ||
							(t && " " === e.key) ||
							(eh.includes(e.key) &&
								(e.currentTarget.click(), e.preventDefault()));
					}),
				});
			});
		eX.displayName = eQ;
		var eY = n.forwardRef((e, r) => {
				const { __scopeMenu: i, disabled: a = !1, textValue: s, ...o } = e,
					l = e_(eQ, i),
					c = eS(i),
					d = n.useRef(null),
					u = (0, Y.useComposedRefs)(r, d),
					[f, p] = n.useState(!1),
					[m, h] = n.useState("");
				return (
					n.useEffect(() => {
						const e = d.current;
						e && h((e.textContent ?? "").trim());
					}, [o.children]),
					(0, t.jsx)(ey.ItemSlot, {
						scope: i,
						disabled: a,
						textValue: s ?? m,
						children: (0, t.jsx)(ed.Item, {
							asChild: !0,
							...c,
							focusable: !a,
							children: (0, t.jsx)(ee.Primitive.div, {
								role: "menuitem",
								"data-highlighted": f ? "" : void 0,
								"aria-disabled": a || void 0,
								"data-disabled": a ? "" : void 0,
								...o,
								ref: u,
								onPointerMove: (0, X.composeEventHandlers)(
									e.onPointerMove,
									td((e) => {
										a
											? l.onItemLeave(e)
											: (l.onItemEnter(e),
												e.defaultPrevented ||
													e.currentTarget.focus({ preventScroll: !0 }));
									}),
								),
								onPointerLeave: (0, X.composeEventHandlers)(
									e.onPointerLeave,
									td((e) => l.onItemLeave(e)),
								),
								onFocus: (0, X.composeEventHandlers)(e.onFocus, () => p(!0)),
								onBlur: (0, X.composeEventHandlers)(e.onBlur, () => p(!1)),
							}),
						}),
					})
				);
			}),
			eZ = n.forwardRef((e, r) => {
				const { checked: n = !1, onCheckedChange: i, ...a } = e;
				return (0, t.jsx)(e3, {
					scope: e.__scopeMenu,
					checked: n,
					children: (0, t.jsx)(eX, {
						role: "menuitemcheckbox",
						"aria-checked": tl(n) ? "mixed" : n,
						...a,
						ref: r,
						"data-state": tc(n),
						onSelect: (0, X.composeEventHandlers)(
							a.onSelect,
							() => i?.(!!tl(n) || !n),
							{ checkForDefaultPrevented: !1 },
						),
					}),
				});
			});
		eZ.displayName = "MenuCheckboxItem";
		var eJ = "MenuRadioGroup",
			[e0, e1] = eC(eJ, { value: void 0, onValueChange: () => {} }),
			e2 = n.forwardRef((e, r) => {
				const { value: n, onValueChange: i, ...a } = e,
					s = (0, ef.useCallbackRef)(i);
				return (0, t.jsx)(e0, {
					scope: e.__scopeMenu,
					value: n,
					onValueChange: s,
					children: (0, t.jsx)(e$, { ...a, ref: r }),
				});
			});
		e2.displayName = eJ;
		var e4 = "MenuRadioItem",
			e6 = n.forwardRef((e, r) => {
				const { value: n, ...i } = e,
					a = e1(e4, e.__scopeMenu),
					s = n === a.value;
				return (0, t.jsx)(e3, {
					scope: e.__scopeMenu,
					checked: s,
					children: (0, t.jsx)(eX, {
						role: "menuitemradio",
						"aria-checked": s,
						...i,
						ref: r,
						"data-state": tc(s),
						onSelect: (0, X.composeEventHandlers)(
							i.onSelect,
							() => a.onValueChange?.(n),
							{ checkForDefaultPrevented: !1 },
						),
					}),
				});
			});
		e6.displayName = e4;
		var e5 = "MenuItemIndicator",
			[e3, e8] = eC(e5, { checked: !1 }),
			e7 = n.forwardRef((e, r) => {
				const { __scopeMenu: n, forceMount: i, ...a } = e,
					s = e8(e5, n);
				return (0, t.jsx)(ec.Presence, {
					present: i || tl(s.checked) || !0 === s.checked,
					children: (0, t.jsx)(ee.Primitive.span, {
						...a,
						ref: r,
						"data-state": tc(s.checked),
					}),
				});
			});
		e7.displayName = e5;
		var e9 = n.forwardRef((e, r) => {
			const { __scopeMenu: n, ...i } = e;
			return (0, t.jsx)(ee.Primitive.div, {
				role: "separator",
				"aria-orientation": "horizontal",
				...i,
				ref: r,
			});
		});
		e9.displayName = "MenuSeparator";
		var te = n.forwardRef((e, r) => {
			const { __scopeMenu: n, ...i } = e,
				a = eE(n);
			return (0, t.jsx)(eo.Arrow, { ...a, ...i, ref: r });
		});
		te.displayName = "MenuArrow";
		var [tt, tr] = eC("MenuSub"),
			tn = "MenuSubTrigger",
			ti = n.forwardRef((e, r) => {
				const i = eR(tn, e.__scopeMenu),
					a = eM(tn, e.__scopeMenu),
					s = tr(tn, e.__scopeMenu),
					o = e_(tn, e.__scopeMenu),
					l = n.useRef(null),
					{ pointerGraceTimerRef: c, onPointerGraceIntentChange: d } = o,
					u = { __scopeMenu: e.__scopeMenu },
					f = n.useCallback(() => {
						l.current && window.clearTimeout(l.current), (l.current = null);
					}, []);
				return (
					n.useEffect(() => f, [f]),
					n.useEffect(() => {
						const e = c.current;
						return () => {
							window.clearTimeout(e), d(null);
						};
					}, [c, d]),
					(0, t.jsx)(eI, {
						asChild: !0,
						...u,
						children: (0, t.jsx)(eY, {
							id: s.triggerId,
							"aria-haspopup": "menu",
							"aria-expanded": i.open,
							"aria-controls": i.open ? s.contentId : void 0,
							"data-state": to(i.open),
							...e,
							ref: (0, Y.composeRefs)(r, s.onTriggerChange),
							onClick: (t) => {
								e.onClick?.(t),
									e.disabled ||
										t.defaultPrevented ||
										(t.currentTarget.focus(), i.open || i.onOpenChange(!0));
							},
							onPointerMove: (0, X.composeEventHandlers)(
								e.onPointerMove,
								td((t) => {
									o.onItemEnter(t),
										!t.defaultPrevented &&
											(e.disabled ||
												i.open ||
												l.current ||
												(o.onPointerGraceIntentChange(null),
												(l.current = window.setTimeout(() => {
													i.onOpenChange(!0), f();
												}, 100))));
								}),
							),
							onPointerLeave: (0, X.composeEventHandlers)(
								e.onPointerLeave,
								td((e) => {
									f();
									const t = i.content?.getBoundingClientRect();
									if (t) {
										const r = i.content?.dataset.side,
											n = "right" === r,
											a = t[n ? "left" : "right"],
											s = t[n ? "right" : "left"];
										o.onPointerGraceIntentChange({
											area: [
												{ x: e.clientX + (n ? -5 : 5), y: e.clientY },
												{ x: a, y: t.top },
												{ x: s, y: t.top },
												{ x: s, y: t.bottom },
												{ x: a, y: t.bottom },
											],
											side: r,
										}),
											window.clearTimeout(c.current),
											(c.current = window.setTimeout(
												() => o.onPointerGraceIntentChange(null),
												300,
											));
									} else {
										if ((o.onTriggerLeave(e), e.defaultPrevented)) return;
										o.onPointerGraceIntentChange(null);
									}
								}),
							),
							onKeyDown: (0, X.composeEventHandlers)(e.onKeyDown, (t) => {
								const r = "" !== o.searchRef.current;
								e.disabled ||
									(r && " " === t.key) ||
									(ev[a.dir].includes(t.key) &&
										(i.onOpenChange(!0),
										i.content?.focus(),
										t.preventDefault()));
							}),
						}),
					})
				);
			});
		ti.displayName = tn;
		var ta = "MenuSubContent",
			ts = n.forwardRef((e, r) => {
				const i = eT(eO, e.__scopeMenu),
					{ forceMount: a = i.forceMount, align: s = "start", ...o } = e,
					l = eR(eO, e.__scopeMenu),
					c = eM(eO, e.__scopeMenu),
					d = tr(ta, e.__scopeMenu),
					u = n.useRef(null),
					f = (0, Y.useComposedRefs)(r, u);
				return (0, t.jsx)(ey.Provider, {
					scope: e.__scopeMenu,
					children: (0, t.jsx)(ec.Presence, {
						present: a || l.open,
						children: (0, t.jsx)(ey.Slot, {
							scope: e.__scopeMenu,
							children: (0, t.jsx)(eK, {
								id: d.contentId,
								"aria-labelledby": d.triggerId,
								...o,
								ref: f,
								align: s,
								side: "rtl" === c.dir ? "left" : "right",
								disableOutsidePointerEvents: !1,
								disableOutsideScroll: !1,
								trapFocus: !1,
								onOpenAutoFocus: (e) => {
									c.isUsingKeyboardRef.current && u.current?.focus(),
										e.preventDefault();
								},
								onCloseAutoFocus: (e) => e.preventDefault(),
								onFocusOutside: (0, X.composeEventHandlers)(
									e.onFocusOutside,
									(e) => {
										e.target !== d.trigger && l.onOpenChange(!1);
									},
								),
								onEscapeKeyDown: (0, X.composeEventHandlers)(
									e.onEscapeKeyDown,
									(e) => {
										c.onClose(), e.preventDefault();
									},
								),
								onKeyDown: (0, X.composeEventHandlers)(e.onKeyDown, (e) => {
									const t = e.currentTarget.contains(e.target),
										r = ew[c.dir].includes(e.key);
									t &&
										r &&
										(l.onOpenChange(!1),
										d.trigger?.focus(),
										e.preventDefault());
								}),
							}),
						}),
					}),
				});
			});
		function to(e) {
			return e ? "open" : "closed";
		}
		function tl(e) {
			return "indeterminate" === e;
		}
		function tc(e) {
			return tl(e) ? "indeterminate" : e ? "checked" : "unchecked";
		}
		function td(e) {
			return (t) => ("mouse" === t.pointerType ? e(t) : void 0);
		}
		ts.displayName = ta;
		var tu = "DropdownMenu",
			[tf, tp] = (0, Z.createContextScope)(tu, [eN]),
			tm = eN(),
			[th, tg] = tf(tu),
			tx = (e) => {
				const {
						__scopeDropdownMenu: r,
						children: i,
						dir: a,
						open: s,
						defaultOpen: o,
						onOpenChange: l,
						modal: c = !0,
					} = e,
					d = tm(r),
					u = n.useRef(null),
					[f, p] = (0, J.useControllableState)({
						prop: s,
						defaultProp: o ?? !1,
						onChange: l,
						caller: tu,
					});
				return (0, t.jsx)(th, {
					scope: r,
					triggerId: (0, es.useId)(),
					triggerRef: u,
					contentId: (0, es.useId)(),
					open: f,
					onOpenChange: p,
					onOpenToggle: n.useCallback(() => p((e) => !e), [p]),
					modal: c,
					children: (0, t.jsx)(eD, {
						...d,
						open: f,
						onOpenChange: p,
						dir: a,
						modal: c,
						children: i,
					}),
				});
			};
		tx.displayName = tu;
		var tv = "DropdownMenuTrigger",
			tw = n.forwardRef((e, r) => {
				const { __scopeDropdownMenu: n, disabled: i = !1, ...a } = e,
					s = tg(tv, n),
					o = tm(n);
				return (0, t.jsx)(eI, {
					asChild: !0,
					...o,
					children: (0, t.jsx)(ee.Primitive.button, {
						type: "button",
						id: s.triggerId,
						"aria-haspopup": "menu",
						"aria-expanded": s.open,
						"aria-controls": s.open ? s.contentId : void 0,
						"data-state": s.open ? "open" : "closed",
						"data-disabled": i ? "" : void 0,
						disabled: i,
						...a,
						ref: (0, Y.composeRefs)(r, s.triggerRef),
						onPointerDown: (0, X.composeEventHandlers)(e.onPointerDown, (e) => {
							!i &&
								0 === e.button &&
								!1 === e.ctrlKey &&
								(s.onOpenToggle(), s.open || e.preventDefault());
						}),
						onKeyDown: (0, X.composeEventHandlers)(e.onKeyDown, (e) => {
							!i &&
								(["Enter", " "].includes(e.key) && s.onOpenToggle(),
								"ArrowDown" === e.key && s.onOpenChange(!0),
								["Enter", " ", "ArrowDown"].includes(e.key) &&
									e.preventDefault());
						}),
					}),
				});
			});
		tw.displayName = tv;
		var tb = (e) => {
			const { __scopeDropdownMenu: r, ...n } = e,
				i = tm(r);
			return (0, t.jsx)(eL, { ...i, ...n });
		};
		tb.displayName = "DropdownMenuPortal";
		var ty = "DropdownMenuContent",
			tj = n.forwardRef((e, r) => {
				const { __scopeDropdownMenu: i, ...a } = e,
					s = tg(ty, i),
					o = tm(i),
					l = n.useRef(!1);
				return (0, t.jsx)(eH, {
					id: s.contentId,
					"aria-labelledby": s.triggerId,
					...o,
					...a,
					ref: r,
					onCloseAutoFocus: (0, X.composeEventHandlers)(
						e.onCloseAutoFocus,
						(e) => {
							l.current || s.triggerRef.current?.focus(),
								(l.current = !1),
								e.preventDefault();
						},
					),
					onInteractOutside: (0, X.composeEventHandlers)(
						e.onInteractOutside,
						(e) => {
							const t = e.detail.originalEvent,
								r = 0 === t.button && !0 === t.ctrlKey,
								n = 2 === t.button || r;
							(!s.modal || n) && (l.current = !0);
						},
					),
					style: {
						...e.style,
						"--radix-dropdown-menu-content-transform-origin":
							"var(--radix-popper-transform-origin)",
						"--radix-dropdown-menu-content-available-width":
							"var(--radix-popper-available-width)",
						"--radix-dropdown-menu-content-available-height":
							"var(--radix-popper-available-height)",
						"--radix-dropdown-menu-trigger-width":
							"var(--radix-popper-anchor-width)",
						"--radix-dropdown-menu-trigger-height":
							"var(--radix-popper-anchor-height)",
					},
				});
			});
		(tj.displayName = ty),
			(n.forwardRef((e, r) => {
				const { __scopeDropdownMenu: n, ...i } = e,
					a = tm(n);
				return (0, t.jsx)(e$, { ...a, ...i, ref: r });
			}).displayName = "DropdownMenuGroup"),
			(n.forwardRef((e, r) => {
				const { __scopeDropdownMenu: n, ...i } = e,
					a = tm(n);
				return (0, t.jsx)(eG, { ...a, ...i, ref: r });
			}).displayName = "DropdownMenuLabel");
		var tk = n.forwardRef((e, r) => {
			const { __scopeDropdownMenu: n, ...i } = e,
				a = tm(n);
			return (0, t.jsx)(eX, { ...a, ...i, ref: r });
		});
		function tC({ ...e }) {
			return (0, t.jsx)(tx, { "data-slot": "dropdown-menu", ...e });
		}
		function tN({ ...e }) {
			return (0, t.jsx)(tw, { "data-slot": "dropdown-menu-trigger", ...e });
		}
		function tE({ className: e, sideOffset: r = 4, ...n }) {
			return (0, t.jsx)(tb, {
				children: (0, t.jsx)(tj, {
					"data-slot": "dropdown-menu-content",
					sideOffset: r,
					className: (0, B.cn)(
						"bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-32 overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md",
						e,
					),
					...n,
				}),
			});
		}
		function tS({ className: e, inset: r, variant: n = "default", ...i }) {
			return (0, t.jsx)(tk, {
				"data-slot": "dropdown-menu-item",
				"data-inset": r,
				"data-variant": n,
				className: (0, B.cn)(
					"focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive-foreground data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/40 data-[variant=destructive]:focus:text-destructive-foreground data-[variant=destructive]:*:[svg]:text-destructive-foreground! [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-inset:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
					e,
				),
				...i,
			});
		}
		(tk.displayName = "DropdownMenuItem"),
			(n.forwardRef((e, r) => {
				const { __scopeDropdownMenu: n, ...i } = e,
					a = tm(n);
				return (0, t.jsx)(eZ, { ...a, ...i, ref: r });
			}).displayName = "DropdownMenuCheckboxItem"),
			(n.forwardRef((e, r) => {
				const { __scopeDropdownMenu: n, ...i } = e,
					a = tm(n);
				return (0, t.jsx)(e2, { ...a, ...i, ref: r });
			}).displayName = "DropdownMenuRadioGroup"),
			(n.forwardRef((e, r) => {
				const { __scopeDropdownMenu: n, ...i } = e,
					a = tm(n);
				return (0, t.jsx)(e6, { ...a, ...i, ref: r });
			}).displayName = "DropdownMenuRadioItem"),
			(n.forwardRef((e, r) => {
				const { __scopeDropdownMenu: n, ...i } = e,
					a = tm(n);
				return (0, t.jsx)(e7, { ...a, ...i, ref: r });
			}).displayName = "DropdownMenuItemIndicator"),
			(n.forwardRef((e, r) => {
				const { __scopeDropdownMenu: n, ...i } = e,
					a = tm(n);
				return (0, t.jsx)(e9, { ...a, ...i, ref: r });
			}).displayName = "DropdownMenuSeparator"),
			(n.forwardRef((e, r) => {
				const { __scopeDropdownMenu: n, ...i } = e,
					a = tm(n);
				return (0, t.jsx)(te, { ...a, ...i, ref: r });
			}).displayName = "DropdownMenuArrow"),
			(n.forwardRef((e, r) => {
				const { __scopeDropdownMenu: n, ...i } = e,
					a = tm(n);
				return (0, t.jsx)(ti, { ...a, ...i, ref: r });
			}).displayName = "DropdownMenuSubTrigger"),
			(n.forwardRef((e, r) => {
				const { __scopeDropdownMenu: n, ...i } = e,
					a = tm(n);
				return (0, t.jsx)(ts, {
					...a,
					...i,
					ref: r,
					style: {
						...e.style,
						"--radix-dropdown-menu-content-transform-origin":
							"var(--radix-popper-transform-origin)",
						"--radix-dropdown-menu-content-available-width":
							"var(--radix-popper-available-width)",
						"--radix-dropdown-menu-content-available-height":
							"var(--radix-popper-available-height)",
						"--radix-dropdown-menu-trigger-width":
							"var(--radix-popper-anchor-width)",
						"--radix-dropdown-menu-trigger-height":
							"var(--radix-popper-anchor-height)",
					},
				});
			}).displayName = "DropdownMenuSubContent"),
			e.i(93207),
			(0, j.default)("chevron-right", [
				["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }],
			]),
			e.i(86489);
		var tP = e.i(42603),
			tR = e.i(73979);
		async function tz(e) {
			const { data: t, error: r } =
				await A.authClient.organization.cancelInvitation({
					invitationId: e.invitationId,
				});
			if (r) throw Error(r.message);
			return t;
		}
		async function tM(e) {
			const { data: t, error: r } =
				await A.authClient.organization.removeMember({
					memberIdOrEmail: e.memberIdOrEmail,
				});
			if (r) throw Error(r.message);
			return t;
		}
		async function tD(e) {
			const { data: t, error: r } = await A.authClient.organization.setActive({
				organizationId: e.organizationId,
			});
			if (r) throw Error(r.message);
			return t;
		}
		var tI = e.i(59597);
		async function tF() {
			const { data: e, error: t } =
				await A.authClient.organization.getFullOrganization();
			if (t) throw Error(t.message);
			return e;
		}
		async function tA() {
			const { data: e, error: t } = await A.authClient.organization.list();
			if (t) throw Error(t.message);
			return e;
		}
		var tT = e.i(46483);
		const tL = "owner";
		function tO() {
			const [e, i] = (0, n.useState)(!1);
			return (0, t.jsxs)(W.Dialog, {
				open: e,
				onOpenChange: i,
				children: [
					(0, t.jsx)(W.DialogTrigger, {
						asChild: !0,
						children: (0, t.jsxs)(R.Button, {
							size: "sm",
							className: "w-full gap-2",
							variant: "default",
							children: [
								(0, t.jsx)(r.PlusIcon, {}),
								(0, t.jsx)("p", { children: "New Organization" }),
							],
						}),
					}),
					(0, t.jsxs)(W.DialogContent, {
						className: "sm:max-w-[425px] w-11/12",
						children: [
							(0, t.jsxs)(W.DialogHeader, {
								children: [
									(0, t.jsx)(W.DialogTitle, { children: "New Organization" }),
									(0, t.jsx)(W.DialogDescription, {
										children:
											"Create a new organization to collaborate with your team.",
									}),
								],
							}),
							(0, t.jsx)(H, { onSuccess: () => i(!1) }),
						],
					}),
				],
			});
		}
		function tB() {
			const [e, r] = (0, n.useState)(!1);
			return (0, t.jsxs)(W.Dialog, {
				open: e,
				onOpenChange: r,
				children: [
					(0, t.jsx)(W.DialogTrigger, {
						asChild: !0,
						children: (0, t.jsxs)(R.Button, {
							size: "sm",
							className: "w-full gap-2",
							variant: "outline",
							children: [
								(0, t.jsx)(k, { size: 16 }),
								(0, t.jsx)("p", { children: "Invite Member" }),
							],
						}),
					}),
					(0, t.jsxs)(W.DialogContent, {
						className: "sm:max-w-[425px] w-11/12",
						children: [
							(0, t.jsxs)(W.DialogHeader, {
								children: [
									(0, t.jsx)(W.DialogTitle, { children: "Invite Member" }),
									(0, t.jsx)(W.DialogDescription, {
										children: "Invite a member to your organization.",
									}),
								],
							}),
							(0, t.jsx)(K, { onSuccess: () => r(!1) }),
						],
					}),
				],
			});
		}
		function t_() {
			return (0, t.jsxs)(G.Card, {
				children: [
					(0, t.jsxs)(G.CardHeader, {
						children: [
							(0, t.jsx)(G.CardTitle, { children: "Organization" }),
							(0, t.jsxs)("div", {
								className: "flex justify-between mt-2",
								children: [
									(0, t.jsx)(tR.Skeleton, { className: "h-5 w-24" }),
									(0, t.jsx)(tR.Skeleton, { className: "h-8 w-32" }),
								],
							}),
							(0, t.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [
									(0, t.jsx)(tR.Skeleton, {
										className: "h-10 w-10 rounded-none",
									}),
									(0, t.jsxs)("div", {
										className: "space-y-1",
										children: [
											(0, t.jsx)(tR.Skeleton, { className: "h-4 w-24" }),
											(0, t.jsx)(tR.Skeleton, { className: "h-3 w-16" }),
										],
									}),
								],
							}),
						],
					}),
					(0, t.jsx)(G.CardContent, {
						children: (0, t.jsxs)("div", {
							className: "flex gap-8 flex-col md:flex-row",
							children: [
								(0, t.jsxs)("div", {
									className: "flex flex-col gap-2 grow",
									children: [
										(0, t.jsx)("p", {
											className:
												"font-medium border-b-2 border-b-foreground/10",
											children: "Members",
										}),
										(0, t.jsx)("div", {
											className: "flex flex-col gap-2",
											children: (0, t.jsxs)("div", {
												className: "flex items-center gap-2",
												children: [
													(0, t.jsx)(tR.Skeleton, {
														className: "h-9 w-9 rounded-full",
													}),
													(0, t.jsxs)("div", {
														className: "space-y-1",
														children: [
															(0, t.jsx)(tR.Skeleton, {
																className: "h-4 w-24",
															}),
															(0, t.jsx)(tR.Skeleton, {
																className: "h-3 w-16",
															}),
														],
													}),
												],
											}),
										}),
									],
								}),
								(0, t.jsxs)("div", {
									className: "flex flex-col gap-2 grow",
									children: [
										(0, t.jsx)("p", {
											className:
												"font-medium border-b-2 border-b-foreground/10",
											children: "Invites",
										}),
										(0, t.jsx)(tR.Skeleton, { className: "h-4 w-32" }),
									],
								}),
							],
						}),
					}),
				],
			});
		}
		e.s(
			[
				"default",
				0,
				(e) => {
					let n,
						i,
						a,
						{ data: s } = (0, tT.useSessionQuery)(),
						{ data: o } = (0, tI.useQuery)({
							queryKey: T.organizationKeys.list(),
							queryFn: tA,
						}),
						{ data: l, isFetching: c } = (0, tI.useQuery)({
							queryKey: T.organizationKeys.detail(),
							queryFn: tF,
						}),
						d =
							((n = (0, I.useQueryClient)()),
							(0, D.useMutation)({
								mutationFn: tD,
								onSuccess: () => {
									n.invalidateQueries({
										queryKey: T.organizationKeys.detail(),
									});
								},
							})),
						u =
							((i = (0, I.useQueryClient)()),
							(0, D.useMutation)({
								mutationFn: tz,
								onSuccess: () => {
									i.invalidateQueries({
										queryKey: T.organizationKeys.detail(),
									}),
										F.toast.success("Invitation revoked successfully");
								},
								onError: (e) => {
									F.toast.error(e.message || "Failed to revoke the invitation");
								},
							})),
						f =
							((a = (0, I.useQueryClient)()),
							(0, D.useMutation)({
								mutationFn: tM,
								onSuccess: () => {
									a.invalidateQueries({
										queryKey: T.organizationKeys.detail(),
									}),
										F.toast.success("Member removed successfully");
								},
								onError: (e) => {
									F.toast.error(e.message || "Failed to remove member");
								},
							})),
						p = s || e.session,
						m = l?.members?.find((e) => e.userId === p?.user.id);
					return c
						? (0, t.jsx)(t_, {})
						: (0, t.jsxs)(G.Card, {
								children: [
									(0, t.jsxs)(G.CardHeader, {
										children: [
											(0, t.jsx)(G.CardTitle, { children: "Organization" }),
											(0, t.jsxs)("div", {
												className: "flex justify-between",
												children: [
													(0, t.jsxs)(tC, {
														children: [
															(0, t.jsx)(tN, {
																asChild: !0,
																children: (0, t.jsxs)("div", {
																	className:
																		"flex items-center gap-1 cursor-pointer",
																	children: [
																		(0, t.jsxs)("p", {
																			className: "text-sm",
																			children: [
																				(0, t.jsx)("span", {
																					className: "font-bold",
																				}),
																				" ",
																				l?.name || "Personal",
																			],
																		}),
																		(0, t.jsx)(r.ChevronDownIcon, {}),
																	],
																}),
															}),
															(0, t.jsxs)(tE, {
																align: "start",
																children: [
																	(0, t.jsx)(tS, {
																		className: "py-1",
																		onClick: () => {
																			d.mutate({ organizationId: null });
																		},
																		children: (0, t.jsx)("p", {
																			className: "text-sm sm",
																			children: "Personal",
																		}),
																	}),
																	o?.map((e) =>
																		(0, t.jsx)(
																			tS,
																			{
																				className: "py-1",
																				onClick: () => {
																					e.id !== l?.id &&
																						d.mutate({ organizationId: e.id });
																				},
																				children: (0, t.jsx)("p", {
																					className: "text-sm sm",
																					children: e.name,
																				}),
																			},
																			e.id,
																		),
																	),
																],
															}),
														],
													}),
													(0, t.jsx)("div", { children: (0, t.jsx)(tO, {}) }),
												],
											}),
											(0, t.jsxs)("div", {
												className: "flex items-center gap-2",
												children: [
													(0, t.jsxs)($.Avatar, {
														className: "rounded-none",
														children: [
															(0, t.jsx)($.AvatarImage, {
																className:
																	"object-cover w-full h-full rounded-none",
																src: l?.logo || void 0,
															}),
															(0, t.jsx)($.AvatarFallback, {
																className: "rounded-none",
																children: l?.name?.charAt(0) || "P",
															}),
														],
													}),
													(0, t.jsxs)("div", {
														children: [
															(0, t.jsx)("p", {
																children: l?.name || "Personal",
															}),
															(0, t.jsxs)("p", {
																className: "text-xs text-muted-foreground",
																children: [l?.members?.length || 1, " members"],
															}),
														],
													}),
												],
											}),
										],
									}),
									(0, t.jsxs)(G.CardContent, {
										children: [
											(0, t.jsxs)("div", {
												className: "flex gap-8 flex-col md:flex-row",
												children: [
													(0, t.jsxs)("div", {
														className: "flex flex-col gap-2 grow",
														children: [
															(0, t.jsx)("p", {
																className:
																	"font-medium border-b-2 border-b-foreground/10",
																children: "Members",
															}),
															(0, t.jsxs)("div", {
																className: "flex flex-col gap-2",
																children: [
																	l?.members?.map((e) => {
																		const r =
																			f.isPending &&
																			f.variables?.memberIdOrEmail === e.id;
																		return (0, t.jsxs)(
																			"div",
																			{
																				className:
																					"flex justify-between items-center",
																				children: [
																					(0, t.jsxs)("div", {
																						className:
																							"flex items-center gap-2",
																						children: [
																							(0, t.jsxs)($.Avatar, {
																								className: "sm:flex w-9 h-9",
																								children: [
																									(0, t.jsx)($.AvatarImage, {
																										src: e.user.image || void 0,
																										className: "object-cover",
																									}),
																									(0, t.jsx)($.AvatarFallback, {
																										children:
																											e.user.name?.charAt(0),
																									}),
																								],
																							}),
																							(0, t.jsxs)("div", {
																								children: [
																									(0, t.jsx)("p", {
																										className: "text-sm",
																										children: e.user.name,
																									}),
																									(0, t.jsx)("p", {
																										className:
																											"text-xs text-muted-foreground",
																										children: e.role,
																									}),
																								],
																							}),
																						],
																					}),
																					e.role !== tL &&
																						(m?.role === tL ||
																							m?.role === "admin") &&
																						(0, t.jsx)(R.Button, {
																							size: "sm",
																							variant: "destructive",
																							disabled: r,
																							onClick: () => {
																								f.mutate({
																									memberIdOrEmail: e.id,
																								});
																							},
																							children: r
																								? (0, t.jsx)(y.Loader2, {
																										className: "animate-spin",
																										size: 16,
																									})
																								: m?.id === e.id
																									? "Leave"
																									: "Remove",
																						}),
																				],
																			},
																			e.id,
																		);
																	}),
																	!l?.id &&
																		(0, t.jsx)("div", {
																			children: (0, t.jsxs)("div", {
																				className: "flex items-center gap-2",
																				children: [
																					(0, t.jsxs)($.Avatar, {
																						children: [
																							(0, t.jsx)($.AvatarImage, {
																								src: p?.user.image || void 0,
																							}),
																							(0, t.jsx)($.AvatarFallback, {
																								children:
																									p?.user.name?.charAt(0),
																							}),
																						],
																					}),
																					(0, t.jsxs)("div", {
																						children: [
																							(0, t.jsx)("p", {
																								className: "text-sm",
																								children: p?.user.name,
																							}),
																							(0, t.jsx)("p", {
																								className:
																									"text-xs text-muted-foreground",
																								children: "Owner",
																							}),
																						],
																					}),
																				],
																			}),
																		}),
																],
															}),
														],
													}),
													(0, t.jsxs)("div", {
														className: "flex flex-col gap-2 grow",
														children: [
															(0, t.jsx)("p", {
																className:
																	"font-medium border-b-2 border-b-foreground/10",
																children: "Invites",
															}),
															(0, t.jsxs)("div", {
																className: "flex flex-col gap-2",
																children: [
																	(0, t.jsx)(w, {
																		children: l?.invitations
																			?.filter((e) => "pending" === e.status)
																			.map((e) => {
																				const r =
																					u.isPending &&
																					u.variables?.invitationId === e.id;
																				return (0, t.jsxs)(
																					b.motion.div,
																					{
																						className:
																							"flex items-center justify-between",
																						variants: {
																							hidden: { opacity: 0, height: 0 },
																							visible: {
																								opacity: 1,
																								height: "auto",
																							},
																							exit: { opacity: 0, height: 0 },
																						},
																						initial: "hidden",
																						animate: "visible",
																						exit: "exit",
																						layout: !0,
																						children: [
																							(0, t.jsxs)("div", {
																								children: [
																									(0, t.jsx)("p", {
																										className: "text-sm",
																										children: e.email,
																									}),
																									(0, t.jsx)("p", {
																										className:
																											"text-xs text-muted-foreground",
																										children: e.role,
																									}),
																								],
																							}),
																							(0, t.jsxs)("div", {
																								className:
																									"flex items-center gap-2",
																								children: [
																									(0, t.jsx)(R.Button, {
																										disabled: r,
																										size: "sm",
																										variant: "destructive",
																										onClick: () => {
																											u.mutate({
																												invitationId: e.id,
																											});
																										},
																										children: r
																											? (0, t.jsx)(y.Loader2, {
																													className:
																														"animate-spin",
																													size: 16,
																												})
																											: "Revoke",
																									}),
																									(0, t.jsx)("div", {
																										children: (0, t.jsx)(
																											Q.default,
																											{
																												textToCopy: `${window.location.origin}/accept-invitation/${e.id}`,
																											},
																										),
																									}),
																								],
																							}),
																						],
																					},
																					e.id,
																				);
																			}),
																	}),
																	l?.invitations?.filter(
																		(e) => "pending" === e.status,
																	).length === 0 &&
																		(0, t.jsx)(b.motion.p, {
																			className:
																				"text-sm text-muted-foreground",
																			initial: { opacity: 0 },
																			animate: { opacity: 1 },
																			exit: { opacity: 0 },
																			children: "No Active Invitations",
																		}),
																	!l?.id &&
																		(0, t.jsx)(tP.Label, {
																			className:
																				"text-xs text-muted-foreground",
																			children:
																				"You can't invite members to your personal workspace.",
																		}),
																],
															}),
														],
													}),
												],
											}),
											(0, t.jsx)("div", {
												className: "flex justify-end w-full mt-4",
												children: (0, t.jsx)("div", {
													children: (0, t.jsx)("div", {
														children: l?.id && (0, t.jsx)(tB, {}),
													}),
												}),
											}),
										],
									}),
								],
							});
				},
			],
			66124,
		);
	},
	49321,
	(e) => {
		"use strict";
		var t = e.i(62613),
			r = e.i(10283);
		const n = (0, r.default)("arrow-up-from-line", [
				["path", { d: "m18 9-6-6-6 6", key: "kcunyi" }],
				["path", { d: "M12 3v14", key: "7cf3v8" }],
				["path", { d: "M5 21h14", key: "11awu3" }],
			]),
			i = (0, r.default)("credit-card", [
				[
					"rect",
					{ width: "20", height: "14", x: "2", y: "5", rx: "2", key: "ynyp8z" },
				],
				["line", { x1: "2", x2: "22", y1: "10", y2: "10", key: "1b3vmo" }],
			]),
			a = (0, r.default)("refresh-ccw", [
				[
					"path",
					{
						d: "M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",
						key: "14sxne",
					},
				],
				["path", { d: "M3 3v5h5", key: "1xhq8a" }],
				[
					"path",
					{
						d: "M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16",
						key: "1hlbsb",
					},
				],
				["path", { d: "M16 16h5v5", key: "ccwih5" }],
			]);
		var s = e.i(57319),
			o = e.i(67283),
			l = e.i(49696);
		const c = ["free", "plus", "pro"],
			d = (0, o.cva)(
				"inline-flex items-center px-3 py-1 text-xs font-semibold ring-1 ring-inset transition-all duration-300 ease-in-out",
				{
					variants: {
						variant: {
							free: "dark:bg-zinc-950 bg-zinc-50 dark:text-white dark:ring-gray-700 hover:bg-gray-600",
							plus: "bg-lime-700/40 text-white ring-lime-200/40 hover:bg-lime-600",
							pro: "bg-purple-800/80 ring-purple-400 hover:bg-purple-700",
						},
					},
					defaultVariants: { variant: "free" },
				},
			),
			u = ({ tier: e, className: r, ...n }) => {
				const i = c.includes(e) ? e : "free";
				return (0, t.jsx)("span", {
					className: (0, l.cn)(d({ variant: i }), r),
					...n,
					children: i.charAt(0).toUpperCase() + i.slice(1),
				});
			};
		var f = e.i(88505),
			p = e.i(88642),
			m = e.i(49139),
			h = e.i(16066),
			g = e.i(42603),
			x = e.i(97557),
			v = e.i(67714),
			w = e.i(15246),
			b = e.i(33833),
			y = e.i(30307),
			j = e.i(5396),
			k = e.i(53212),
			C = e.i(65221),
			N = e.i(42902),
			E = e.i(49674),
			S = "Radio",
			[P, R] = (0, w.createContextScope)(S),
			[z, M] = P(S);
		function D(e) {
			const {
					__scopeRadio: r,
					checked: n = !1,
					children: i,
					disabled: a,
					form: o,
					name: l,
					onCheck: c,
					required: d,
					value: u = "on",
					internal_do_not_use_render: f,
				} = e,
				[p, m] = s.useState(null),
				[h, g] = s.useState(null),
				x = s.useRef(!1),
				v = !p || !!o || !!p.closest("form"),
				w = {
					checked: n,
					disabled: a,
					required: d,
					name: l,
					form: o,
					value: u,
					control: p,
					setControl: m,
					hasConsumerStoppedPropagationRef: x,
					isFormControl: v,
					bubbleInput: h,
					setBubbleInput: g,
					onCheck: () => c?.(),
				};
			return (0, t.jsx)(z, {
				scope: r,
				...w,
				children: "function" == typeof f ? f(w) : i,
			});
		}
		var I = "RadioTrigger",
			F = s.forwardRef(({ __scopeRadio: e, onClick: r, ...n }, i) => {
				const {
						checked: a,
						disabled: s,
						value: o,
						setControl: l,
						onCheck: c,
						hasConsumerStoppedPropagationRef: d,
						isFormControl: u,
						bubbleInput: f,
					} = M(I, e),
					p = (0, v.useComposedRefs)(i, l);
				return (0, t.jsx)(b.Primitive.button, {
					type: "button",
					role: "radio",
					"aria-checked": a,
					"data-state": B(a),
					"data-disabled": s ? "" : void 0,
					disabled: s,
					value: o,
					...n,
					ref: p,
					onClick: (0, x.composeEventHandlers)(r, (e) => {
						a || c(),
							f &&
								u &&
								((d.current = e.isPropagationStopped()),
								d.current || e.stopPropagation());
					}),
				});
			});
		(F.displayName = I),
			(s.forwardRef((e, r) => {
				const {
					__scopeRadio: n,
					name: i,
					checked: a,
					required: s,
					disabled: o,
					value: l,
					onCheck: c,
					form: d,
					...u
				} = e;
				return (0, t.jsx)(D, {
					__scopeRadio: n,
					checked: a,
					disabled: o,
					required: s,
					onCheck: c,
					name: i,
					form: d,
					value: l,
					internal_do_not_use_render: ({ isFormControl: e }) =>
						(0, t.jsxs)(t.Fragment, {
							children: [
								(0, t.jsx)(F, { ...u, ref: r, __scopeRadio: n }),
								e && (0, t.jsx)(O, { __scopeRadio: n }),
							],
						}),
				});
			}).displayName = S);
		var A = "RadioIndicator",
			T = s.forwardRef((e, r) => {
				const { __scopeRadio: n, forceMount: i, ...a } = e,
					s = M(A, n);
				return (0, t.jsx)(E.Presence, {
					present: i || s.checked,
					children: (0, t.jsx)(b.Primitive.span, {
						"data-state": B(s.checked),
						"data-disabled": s.disabled ? "" : void 0,
						...a,
						ref: r,
					}),
				});
			});
		T.displayName = A;
		var L = "RadioBubbleInput",
			O = s.forwardRef(({ __scopeRadio: e, ...r }, n) => {
				const {
						control: i,
						checked: a,
						required: o,
						disabled: l,
						name: c,
						value: d,
						form: u,
						bubbleInput: f,
						setBubbleInput: p,
						hasConsumerStoppedPropagationRef: m,
					} = M(L, e),
					h = (0, v.useComposedRefs)(n, p),
					g = (0, N.usePrevious)(a),
					x = (0, C.useSize)(i);
				s.useEffect(() => {
					if (!f) return;
					const e = Object.getOwnPropertyDescriptor(
							window.HTMLInputElement.prototype,
							"checked",
						).set,
						t = !m.current;
					if (g !== a && e) {
						const r = new Event("click", { bubbles: t });
						e.call(f, a), f.dispatchEvent(r);
					}
				}, [f, g, a, m]);
				const w = s.useRef(a);
				return (0, t.jsx)(b.Primitive.input, {
					type: "radio",
					"aria-hidden": !0,
					defaultChecked: w.current,
					required: o,
					disabled: l,
					name: c,
					value: d,
					form: u,
					...r,
					tabIndex: -1,
					ref: h,
					style: {
						...r.style,
						...x,
						position: "absolute",
						pointerEvents: "none",
						opacity: 0,
						margin: 0,
						transform: "translateX(-100%)",
					},
				});
			});
		function B(e) {
			return e ? "checked" : "unchecked";
		}
		O.displayName = L;
		var _ = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"],
			H = "RadioGroup",
			[q, U] = (0, w.createContextScope)(H, [y.createRovingFocusGroupScope, R]),
			V = (0, y.createRovingFocusGroupScope)(),
			K = R(),
			[$, G] = q(H),
			Q = s.forwardRef((e, r) => {
				const {
						__scopeRadioGroup: n,
						name: i,
						defaultValue: a,
						value: s,
						required: o = !1,
						disabled: l = !1,
						orientation: c,
						dir: d,
						loop: u = !0,
						onValueChange: f,
						...p
					} = e,
					m = V(n),
					h = (0, k.useDirection)(d),
					[g, x] = (0, j.useControllableState)({
						prop: s,
						defaultProp: a ?? null,
						onChange: f,
						caller: H,
					});
				return (0, t.jsx)($, {
					scope: n,
					name: i,
					required: o,
					disabled: l,
					value: g,
					onValueChange: x,
					children: (0, t.jsx)(y.Root, {
						asChild: !0,
						...m,
						orientation: c,
						dir: h,
						loop: u,
						children: (0, t.jsx)(b.Primitive.div, {
							role: "radiogroup",
							"aria-required": o,
							"aria-orientation": c,
							"data-disabled": l ? "" : void 0,
							dir: h,
							...p,
							ref: r,
						}),
					}),
				});
			});
		Q.displayName = H;
		var W = "RadioGroupItemTrigger";
		function X(e) {
			const {
					__scopeRadioGroup: r,
					value: n,
					disabled: i,
					children: a,
					internal_do_not_use_render: s,
				} = e,
				o = G("RadioGroupItemProvider", r),
				l = K(r),
				c = o.disabled || i;
			return (0, t.jsx)(D, {
				...l,
				checked: o.value === n,
				disabled: c,
				required: o.required,
				name: o.name,
				value: n,
				onCheck: () => o.onValueChange(n),
				internal_do_not_use_render: s,
				children: a,
			});
		}
		var Y = s.forwardRef((e, r) => {
			const { __scopeRadioGroup: n, ...i } = e,
				a = V(n),
				o = K(n),
				{ checked: l, disabled: c } = M(W, o.__scopeRadio),
				d = s.useRef(null),
				u = (0, v.useComposedRefs)(r, d),
				f = s.useRef(!1);
			return (
				s.useEffect(() => {
					const e = (e) => {
							_.includes(e.key) && (f.current = !0);
						},
						t = () => (f.current = !1);
					return (
						document.addEventListener("keydown", e),
						document.addEventListener("keyup", t),
						() => {
							document.removeEventListener("keydown", e),
								document.removeEventListener("keyup", t);
						}
					);
				}, []),
				(0, t.jsx)(y.Item, {
					asChild: !0,
					...a,
					focusable: !c,
					active: l,
					children: (0, t.jsx)(F, {
						...o,
						...i,
						ref: u,
						onKeyDown: (0, x.composeEventHandlers)(i.onKeyDown, (e) => {
							"Enter" === e.key && e.preventDefault();
						}),
						onFocus: (0, x.composeEventHandlers)(i.onFocus, () => {
							f.current && d.current?.click();
						}),
					}),
				})
			);
		});
		Y.displayName = W;
		var Z = s.forwardRef((e, r) => {
			const { __scopeRadioGroup: n, value: i, disabled: a, ...s } = e;
			return (0, t.jsx)(X, {
				__scopeRadioGroup: n,
				value: i,
				disabled: a,
				internal_do_not_use_render: ({ isFormControl: e }) =>
					(0, t.jsxs)(t.Fragment, {
						children: [
							(0, t.jsx)(Y, { ...s, ref: r, __scopeRadioGroup: n }),
							e && (0, t.jsx)(J, { __scopeRadioGroup: n }),
						],
					}),
			});
		});
		Z.displayName = "RadioGroupItem";
		var J = s.forwardRef((e, r) => {
			const { __scopeRadioGroup: n, ...i } = e,
				a = K(n);
			return (0, t.jsx)(O, { ...a, ...i, ref: r });
		});
		J.displayName = "RadioGroupItemBubbleInput";
		var ee = s.forwardRef((e, r) => {
			const { __scopeRadioGroup: n, ...i } = e,
				a = K(n);
			return (0, t.jsx)(T, { ...a, ...i, ref: r });
		});
		ee.displayName = "RadioGroupIndicator";
		var et = e.i(86489);
		function er({ className: e, ...r }) {
			return (0, t.jsx)(Q, {
				"data-slot": "radio-group",
				className: (0, l.cn)("grid gap-3", e),
				...r,
			});
		}
		function en({ className: e, ...r }) {
			return (0, t.jsx)(Z, {
				"data-slot": "radio-group-item",
				className: (0, l.cn)(
					"border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive aspect-square size-4 shrink-0 rounded-full border shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
					e,
				),
				...r,
				children: (0, t.jsx)(ee, {
					"data-slot": "radio-group-indicator",
					className: "relative flex items-center justify-center",
					children: (0, t.jsx)(et.CircleIcon, {
						className:
							"fill-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2",
					}),
				}),
			});
		}
		var ei = e.i(73979),
			ea = e.i(95869),
			es = e.i(61645),
			eo = e.i(76706);
		async function el(e) {
			const { data: t, error: r } = await eo.authClient.subscription.cancel({
				returnUrl: e,
			});
			if (r) throw Error(r.message);
			return t;
		}
		var ec = e.i(59597);
		const ed = {
			all: () => ["subscription"],
			list: () => [...ed.all(), "list"],
		};
		async function eu() {
			const { data: e, error: t } = await eo.authClient.subscription.list();
			if (t) throw Error(t.message);
			return e;
		}
		var ef = e.i(82537);
		async function ep() {
			const { data: e, error: t } = await eo.authClient.subscription.restore();
			if (t) throw Error(t.message);
			return e;
		}
		async function em(e) {
			const { data: t, error: r } = await eo.authClient.subscription.upgrade({
				plan: e,
				returnUrl: "/dashboard",
				successUrl: "/dashboard",
				cancelUrl: "/dashboard",
			});
			if (r) throw Error(r.message);
			return t;
		}
		function eh(e) {
			let r,
				o = (0, s.useId)(),
				[l, c] = (0, s.useState)("plus"),
				d = (0, ea.useMutation)({
					mutationFn: em,
					onError: (e) => {
						es.toast.error(e.message || "Failed to upgrade plan");
					},
				}),
				u = (0, ea.useMutation)({
					mutationFn: el,
					onError: (e) => {
						es.toast.error(e.message || "Failed to cancel subscription");
					},
				}),
				f =
					((r = (0, ef.useQueryClient)()),
					(0, ea.useMutation)({
						mutationFn: ep,
						onSuccess: () => {
							r.invalidateQueries({ queryKey: ed.all() });
						},
						onError: (e) => {
							es.toast.error(e.message || "Failed to restore subscription");
						},
					}));
			return (0, t.jsxs)(h.Dialog, {
				children: [
					(0, t.jsx)(h.DialogTrigger, {
						asChild: !0,
						children: (0, t.jsxs)(p.Button, {
							variant: "outline",
							size: "sm",
							className:
								"gap-2 bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-950",
							children: [
								e.currentPlan
									? (0, t.jsx)(a, { size: 14, strokeWidth: 2 })
									: (0, t.jsx)(n, { size: 14, strokeWidth: 2 }),
								e.currentPlan ? "Change Plan" : "Upgrade Plan",
							],
						}),
					}),
					(0, t.jsxs)(h.DialogContent, {
						children: [
							(0, t.jsxs)("div", {
								className: "mb-2 flex flex-col gap-2",
								children: [
									(0, t.jsx)("div", {
										className:
											"flex size-11 shrink-0 items-center justify-center rounded-full border border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-400",
										"aria-hidden": "true",
										children: e.currentPlan
											? (0, t.jsx)(a, { size: 16, strokeWidth: 2 })
											: (0, t.jsx)(i, { size: 16, strokeWidth: 2 }),
									}),
									(0, t.jsxs)(h.DialogHeader, {
										children: [
											(0, t.jsxs)(h.DialogTitle, {
												className: "text-left",
												children: [
													e.currentPlan ? "Change" : "Upgrade",
													" your plan",
												],
											}),
											(0, t.jsx)(h.DialogDescription, {
												className: "text-left",
												children: "Pick one of the following plans.",
											}),
										],
									}),
								],
							}),
							(0, t.jsxs)("form", {
								className: "space-y-5",
								children: [
									(0, t.jsxs)(er, {
										className: "gap-2",
										defaultValue: "2",
										value: l,
										onValueChange: (e) => c(e),
										children: [
											(0, t.jsxs)("div", {
												className:
													"relative flex w-full items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 px-4 py-3 has-data-[state=checked]:border-zinc-500 dark:has-data-[state=checked]:border-zinc-600 has-data-[state=checked]:bg-zinc-100 dark:has-data-[state=checked]:bg-zinc-900",
												children: [
													(0, t.jsx)(en, {
														value: "plus",
														id: `${o}-1`,
														"aria-describedby": `${o}-1-description`,
														className: "order-1 after:absolute after:inset-0",
													}),
													(0, t.jsxs)("div", {
														className: "grid grow gap-1",
														children: [
															(0, t.jsx)(g.Label, {
																htmlFor: `${o}-1`,
																className: "text-zinc-900 dark:text-zinc-100",
																children: "Plus",
															}),
															(0, t.jsx)("p", {
																id: `${o}-1-description`,
																className:
																	"text-xs text-zinc-600 dark:text-zinc-500",
																children: "$20/month",
															}),
														],
													}),
												],
											}),
											(0, t.jsxs)("div", {
												className:
													"relative flex w-full items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 px-4 py-3 has-data-[state=checked]:border-zinc-500 dark:has-data-[state=checked]:border-zinc-600 has-data-[state=checked]:bg-zinc-100 dark:has-data-[state=checked]:bg-zinc-900",
												children: [
													(0, t.jsx)(en, {
														value: "pro",
														id: `${o}-2`,
														"aria-describedby": `${o}-2-description`,
														className: "order-1 after:absolute after:inset-0",
													}),
													(0, t.jsxs)("div", {
														className: "grid grow gap-1",
														children: [
															(0, t.jsx)(g.Label, {
																htmlFor: `${o}-2`,
																className: "text-zinc-900 dark:text-zinc-100",
																children: "Pro",
															}),
															(0, t.jsx)("p", {
																id: `${o}-2-description`,
																className:
																	"text-xs text-zinc-600 dark:text-zinc-500",
																children: "$200/month",
															}),
														],
													}),
												],
											}),
											(0, t.jsxs)("div", {
												className:
													"relative flex w-full items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 px-4 py-3 has-data-[state=checked]:border-zinc-500 dark:has-data-[state=checked]:border-zinc-600 has-data-[state=checked]:bg-zinc-100 dark:has-data-[state=checked]:bg-zinc-900",
												children: [
													(0, t.jsx)(en, {
														value: "enterprise",
														id: `${o}-3`,
														"aria-describedby": `${o}-3-description`,
														className: "order-1 after:absolute after:inset-0",
													}),
													(0, t.jsxs)("div", {
														className: "grid grow gap-1",
														children: [
															(0, t.jsx)(g.Label, {
																htmlFor: `${o}-3`,
																className: "text-zinc-900 dark:text-zinc-100",
																children: "Enterprise",
															}),
															(0, t.jsx)("p", {
																id: `${o}-3-description`,
																className:
																	"text-xs text-zinc-600 dark:text-zinc-500",
																children: "Contact our sales team",
															}),
														],
													}),
												],
											}),
										],
									}),
									(0, t.jsx)("div", {
										className: "space-y-3",
										children: (0, t.jsx)("p", {
											className:
												"text-xs text-zinc-600 dark:text-zinc-500 text-center",
											children:
												"note: all upgrades take effect immediately and you'll be charged the new amount on your next billing cycle.",
										}),
									}),
									(0, t.jsxs)("div", {
										className: "grid gap-2",
										children: [
											(0, t.jsx)(p.Button, {
												type: "button",
												className: "w-full",
												disabled:
													(l === e.currentPlan?.toLowerCase() &&
														!e.isTrial &&
														!e.cancelAtPeriodEnd) ||
													d.isPending ||
													f.isPending,
												onClick: () => {
													"enterprise" === l
														? window.open(
																"https://www.cinagroup.com/enterprise",
																"_blank",
															)
														: e.cancelAtPeriodEnd &&
																l === e.currentPlan?.toLowerCase()
															? f.mutate()
															: d.mutate(l);
												},
												children:
													l === e.currentPlan?.toLowerCase()
														? e.isTrial
															? "Upgrade"
															: e.cancelAtPeriodEnd
																? "Resume Plan"
																: "Current Plan"
														: "plus" === l
															? e.currentPlan
																? "Downgrade"
																: "Upgrade"
															: "pro" === l
																? "Upgrade"
																: "Contact us",
											}),
											e.currentPlan &&
												!e.cancelAtPeriodEnd &&
												(0, t.jsx)(p.Button, {
													type: "button",
													variant: "destructive",
													className: "w-full",
													disabled: u.isPending,
													onClick: () => {
														u.mutate("/dashboard");
													},
													children: "Cancel Plan",
												}),
											e.cancelAtPeriodEnd &&
												(0, t.jsx)("p", {
													className:
														"text-sm text-center text-muted-foreground",
													children:
														"Your subscription will be canceled at the end of the billing period.",
												}),
										],
									}),
								],
							}),
						],
					}),
				],
			});
		}
		e.s(
			[
				"default",
				0,
				() => {
					const { data: e, isLoading: r } = (0, ec.useQuery)({
							queryKey: ed.list(),
							queryFn: eu,
						}),
						n =
							e?.find(
								(e) => "active" === e.status || "trialing" === e.status,
							) || null;
					return r
						? (0, t.jsxs)(m.Card, {
								children: [
									(0, t.jsx)(m.CardHeader, {
										children: (0, t.jsx)(m.CardTitle, {
											children: "Subscription",
										}),
									}),
									(0, t.jsx)(m.CardContent, {
										className: "flex flex-col gap-4",
										children: (0, t.jsxs)("div", {
											className: "flex items-center justify-between",
											children: [
												(0, t.jsx)(ei.Skeleton, { className: "h-5 w-20" }),
												(0, t.jsx)(ei.Skeleton, { className: "h-8 w-28" }),
											],
										}),
									}),
								],
							})
						: (0, t.jsxs)(m.Card, {
								className: "border-zinc-200 dark:border-zinc-800",
								children: [
									(0, t.jsx)(m.CardHeader, {
										className: "pb-3",
										children: (0, t.jsx)(m.CardTitle, {
											className:
												"text-base font-medium text-zinc-900 dark:text-zinc-50",
											children: "Subscription",
										}),
									}),
									(0, t.jsxs)(m.CardContent, {
										className: "flex flex-col gap-4",
										children: [
											(0, t.jsxs)("div", {
												className: "flex items-center justify-between",
												children: [
													(0, t.jsxs)("div", {
														className: "flex items-center gap-2",
														children: [
															!!n &&
																(0, t.jsx)(f.Badge, {
																	className:
																		"w-min p-px rounded-full bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-400",
																	variant: "outline",
																	children: (0, t.jsx)("svg", {
																		xmlns: "http://www.w3.org/2000/svg",
																		width: "1.2em",
																		height: "1.2em",
																		viewBox: "0 0 24 24",
																		children: (0, t.jsx)("path", {
																			fill: "currentColor",
																			d: "m9.023 21.23l-1.67-2.814l-3.176-.685l.312-3.277L2.346 12L4.49 9.546L4.177 6.27l3.177-.685L9.023 2.77L12 4.027l2.977-1.258l1.67 2.816l3.176.684l-.312 3.277L21.655 12l-2.142 2.454l.311 3.277l-3.177.684l-1.669 2.816L12 19.973zm1.927-6.372L15.908 9.9l-.708-.72l-4.25 4.25l-2.15-2.138l-.708.708z",
																		}),
																	}),
																}),
															(0, t.jsx)(u, { tier: n?.plan?.toLowerCase() }),
														],
													}),
													(0, t.jsx)(eh, {
														currentPlan: n?.plan?.toLowerCase(),
														isTrial: n?.status === "trialing",
														cancelAtPeriodEnd: n?.cancelAtPeriodEnd,
													}),
												],
											}),
											n &&
												(0, t.jsxs)("div", {
													className:
														"space-y-2 text-sm bg-zinc-50 dark:bg-zinc-950/50 rounded-lg p-3 border border-zinc-200 dark:border-zinc-800",
													children: [
														(0, t.jsxs)("div", {
															className: "flex justify-between items-center",
															children: [
																(0, t.jsx)("span", {
																	className: "text-zinc-600 dark:text-zinc-500",
																	children: "Status:",
																}),
																(0, t.jsx)("span", {
																	className:
																		"font-medium text-zinc-900 dark:text-zinc-100 capitalize",
																	children: n.cancelAtPeriodEnd
																		? "Canceling"
																		: n.status,
																}),
															],
														}),
														n.periodEnd &&
															(0, t.jsxs)("div", {
																className: "flex justify-between items-center",
																children: [
																	(0, t.jsx)("span", {
																		className:
																			"text-zinc-600 dark:text-zinc-500",
																		children: n.cancelAtPeriodEnd
																			? "Cancels on:"
																			: "trialing" === n.status
																				? "Trial ends:"
																				: "Renews:",
																	}),
																	(0, t.jsx)("span", {
																		className:
																			"font-medium text-zinc-900 dark:text-zinc-100",
																		children: new Date(
																			n.periodEnd,
																		).toLocaleDateString(),
																	}),
																],
															}),
													],
												}),
										],
									}),
								],
							});
				},
			],
			49321,
		);
	},
	82503,
	(e, t, r) => {
		"use strict";
		t.exports = "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED";
	},
	36833,
	(e, t, r) => {
		"use strict";
		var n = e.r(82503);
		function i() {}
		function a() {}
		(a.resetWarningCache = i),
			(t.exports = function () {
				function e(e, t, r, i, a, s) {
					if (s !== n) {
						var o = Error(
							"Calling PropTypes validators directly is not supported by the `prop-types` package. Use PropTypes.checkPropTypes() to call them. Read more at http://fb.me/use-check-prop-types",
						);
						throw ((o.name = "Invariant Violation"), o);
					}
				}
				function t() {
					return e;
				}
				e.isRequired = e;
				var r = {
					array: e,
					bigint: e,
					bool: e,
					func: e,
					number: e,
					object: e,
					string: e,
					symbol: e,
					any: e,
					arrayOf: t,
					element: e,
					elementType: e,
					instanceOf: t,
					node: e,
					objectOf: t,
					oneOf: t,
					oneOfType: t,
					shape: t,
					exact: t,
					checkPropTypes: a,
					resetWarningCache: i,
				};
				return (r.PropTypes = r), r;
			});
	},
	12872,
	(e, t, r) => {
		t.exports = e.r(36833)();
	},
	99998,
	(e) => {
		"use strict";
		let t, r, n, i, a, s, o;
		var l,
			c = e.i(62613),
			d = e.i(81986),
			u = e.i(10283);
		const f = (0, u.default)("square-pen", [
				[
					"path",
					{
						d: "M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",
						key: "1m0v6g",
					},
				],
				[
					"path",
					{
						d: "M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z",
						key: "ohrbg2",
					},
				],
			]),
			p = (0, u.default)("fingerprint-pattern", [
				[
					"path",
					{ d: "M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4", key: "1nerag" },
				],
				["path", { d: "M14 13.12c0 2.38 0 6.38-1 8.88", key: "o46ks0" }],
				["path", { d: "M17.29 21.02c.12-.6.43-2.3.5-3.02", key: "ptglia" }],
				["path", { d: "M2 12a10 10 0 0 1 18-6", key: "ydlgp0" }],
				["path", { d: "M2 16h.01", key: "1gqxmh" }],
				["path", { d: "M21.8 16c.2-2 .131-5.354 0-6", key: "drycrb" }],
				[
					"path",
					{ d: "M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2", key: "1tidbn" },
				],
				["path", { d: "M8.65 22c.21-.66.45-1.32.57-2", key: "13wd9y" }],
				["path", { d: "M9 6.8a6 6 0 0 1 9 5.2v2", key: "1fr1j5" }],
			]),
			m = (0, u.default)("laptop", [
				[
					"path",
					{
						d: "M18 5a2 2 0 0 1 2 2v8.526a2 2 0 0 0 .212.897l1.068 2.127a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45l1.068-2.127A2 2 0 0 0 4 15.526V7a2 2 0 0 1 2-2z",
						key: "1pdavp",
					},
				],
				["path", { d: "M20.054 15.987H3.946", key: "14rxg9" }],
			]);
		var h = e.i(69016);
		const g = (0, u.default)("log-out", [
			["path", { d: "m16 17 5-5-5-5", key: "1bji2h" }],
			["path", { d: "M21 12H9", key: "dn1m92" }],
			["path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", key: "1uf3rs" }],
		]);
		var x = e.i(18041);
		const v = (0, u.default)("qr-code", [
				[
					"rect",
					{ width: "5", height: "5", x: "3", y: "3", rx: "1", key: "1tu5fj" },
				],
				[
					"rect",
					{ width: "5", height: "5", x: "16", y: "3", rx: "1", key: "1v8r4q" },
				],
				[
					"rect",
					{ width: "5", height: "5", x: "3", y: "16", rx: "1", key: "1x03jg" },
				],
				["path", { d: "M21 16h-3a2 2 0 0 0-2 2v3", key: "177gqh" }],
				["path", { d: "M21 21v.01", key: "ents32" }],
				["path", { d: "M12 7v3a2 2 0 0 1-2 2H7", key: "8crl2c" }],
				["path", { d: "M3 12h.01", key: "nlz23k" }],
				["path", { d: "M12 3h.01", key: "n36tog" }],
				["path", { d: "M12 16v.01", key: "133mhm" }],
				["path", { d: "M16 12h1", key: "1slzba" }],
				["path", { d: "M21 12v.01", key: "1lwtk9" }],
				["path", { d: "M12 21v-1", key: "1880an" }],
			]),
			w = (0, u.default)("shield-check", [
				[
					"path",
					{
						d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
						key: "oel41y",
					},
				],
				["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }],
			]),
			b = (0, u.default)("shield-off", [
				["path", { d: "m2 2 20 20", key: "1ooewy" }],
				[
					"path",
					{
						d: "M5 5a1 1 0 0 0-1 1v7c0 5 3.5 7.5 7.67 8.94a1 1 0 0 0 .67.01c2.35-.82 4.48-1.97 5.9-3.71",
						key: "1jlk70",
					},
				],
				[
					"path",
					{
						d: "M9.309 3.652A12.252 12.252 0 0 0 11.24 2.28a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1v7a9.784 9.784 0 0 1-.08 1.264",
						key: "18rp1v",
					},
				],
			]),
			y = (0, u.default)("circle-stop", [
				["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
				[
					"rect",
					{ x: "9", y: "9", width: "6", height: "6", rx: "1", key: "1ssd4o" },
				],
			]);
		var j = e.i(60167),
			k = e.i(95360),
			C = e.i(57319),
			N = e.i(61645),
			E = "user-agent",
			S = "function",
			P = "object",
			R = "string",
			z = "undefined",
			M = "browser",
			D = "device",
			I = "engine",
			F = "result",
			A = "name",
			T = "type",
			L = "vendor",
			O = "version",
			B = "architecture",
			_ = "major",
			H = "model",
			q = "console",
			U = "mobile",
			V = "tablet",
			K = "smarttv",
			$ = "wearable",
			G = "embedded",
			Q = "inapp",
			W = "brands",
			X = "formFactors",
			Y = "fullVersionList",
			Z = "platform",
			J = "platformVersion",
			ee = "bitness",
			et = "sec-ch-ua",
			er = et + "-full-version-list",
			en = et + "-arch",
			ei = et + "-" + ee,
			ea = et + "-form-factors",
			es = et + "-" + U,
			eo = et + "-" + H,
			el = et + "-" + Z,
			ec = el + "-version",
			ed = [W, Y, U, H, Z, J, B, X, ee],
			eu = "Amazon",
			ef = "Apple",
			ep = "ASUS",
			em = "BlackBerry",
			eh = "Google",
			eg = "Huawei",
			ex = "Lenovo",
			ev = "Honor",
			ew = "Microsoft",
			eb = "Motorola",
			ey = "Nvidia",
			ej = "OnePlus",
			ek = "OPPO",
			eC = "Samsung",
			eN = "Sharp",
			eE = "Sony",
			eS = "Xiaomi",
			eP = "Zebra",
			eR = "Chrome",
			ez = "Chromium",
			eM = "Chromecast",
			eD = "Edge",
			eI = "Firefox",
			eF = "Opera",
			eA = "Facebook",
			eT = "Sogou",
			eL = "Mobile ",
			eO = " Browser",
			eB = "Windows",
			e_ = typeof window !== z && window.navigator ? window.navigator : void 0,
			eH = e_ && e_.userAgentData ? e_.userAgentData : void 0,
			eq = function (e, t) {
				var r = {},
					n = t;
				if (!eK(t))
					for (var i in ((n = {}), t))
						for (var a in t[i]) n[a] = t[i][a].concat(n[a] ? n[a] : []);
				for (var s in e)
					r[s] = n[s] && n[s].length % 2 == 0 ? n[s].concat(e[s]) : e[s];
				return r;
			},
			eU = function (e) {
				for (var t = {}, r = 0; r < e.length; r++) t[e[r].toUpperCase()] = e[r];
				return t;
			},
			eV = function (e, t) {
				if (typeof e === P && e.length > 0) {
					for (var r in e) if (eQ(t) == eQ(e[r])) return !0;
					return !1;
				}
				return !!e$(e) && eQ(t) == eQ(e);
			},
			eK = function (e, t) {
				for (var r in e)
					return (
						/^(browser|cpu|device|engine|os)$/.test(r) || (!!t && eK(e[r]))
					);
			},
			e$ = function (e) {
				return typeof e === R;
			},
			eG = function (e) {
				if (e) {
					for (var t = [], r = eX(e).split(","), n = 0; n < r.length; n++)
						if (r[n].indexOf(";") > -1) {
							var i = eJ(r[n]).split(";v=");
							t[n] = { brand: i[0], version: i[1] };
						} else t[n] = eJ(r[n]);
					return t;
				}
			},
			eQ = function (e) {
				return e$(e) ? e.toLowerCase() : e;
			},
			eW = function (e) {
				return e$(e) ? eZ(/[^\d\.]/g, e).split(".")[0] : void 0;
			},
			eX = function (e) {
				return e$(e) ? eJ(eZ(/\\?\"/g, e), 500) : void 0;
			},
			eY = function (e) {
				for (var t in e)
					if (e.hasOwnProperty(t)) {
						var r = e[t];
						typeof r == P && 2 == r.length
							? (this[r[0]] = r[1])
							: (this[r] = void 0);
					}
				return this;
			},
			eZ = function (e, t) {
				return e$(t) ? t.replace(e, "") : t;
			},
			eJ = function (e, t) {
				return (
					(e = eZ(/^\s\s*/, String(e))), typeof t === z ? e : e.substring(0, t)
				);
			},
			e0 = function (e, t) {
				if (e && t)
					for (var r, n, i, a, s, o, l = 0; l < t.length && !s; ) {
						var c = t[l],
							d = t[l + 1];
						for (r = n = 0; r < c.length && !s && c[r]; )
							if ((s = c[r++].exec(e)))
								for (i = 0; i < d.length; i++)
									(o = s[++n]),
										typeof (a = d[i]) === P && a.length > 0
											? 2 === a.length
												? typeof a[1] == S
													? (this[a[0]] = a[1].call(this, o))
													: (this[a[0]] = a[1])
												: a.length >= 3 &&
													(typeof a[1] !== S || (a[1].exec && a[1].test)
														? 3 == a.length
															? (this[a[0]] = o
																	? o.replace(a[1], a[2])
																	: void 0)
															: 4 == a.length
																? (this[a[0]] = o
																		? a[3].call(this, o.replace(a[1], a[2]))
																		: void 0)
																: a.length > 4 &&
																	(this[a[0]] = o
																		? a[3].apply(
																				this,
																				[o.replace(a[1], a[2])].concat(
																					a.slice(4),
																				),
																			)
																		: void 0)
														: a.length > 3
															? (this[a[0]] = o
																	? a[1].apply(this, a.slice(2))
																	: void 0)
															: (this[a[0]] = o
																	? a[1].call(this, o, a[2])
																	: void 0))
											: (this[a] = o || void 0);
						l += 2;
					}
			},
			e1 = function (e, t) {
				for (var r in t)
					if (typeof t[r] === P && t[r].length > 0) {
						for (var n = 0; n < t[r].length; n++)
							if (eV(t[r][n], e)) return "?" === r ? void 0 : r;
					} else if (eV(t[r], e)) return "?" === r ? void 0 : r;
				return t.hasOwnProperty("*") ? t["*"] : e;
			},
			e2 = {
				ME: "4.90",
				"NT 3.51": "3.51",
				"NT 4.0": "4.0",
				2e3: ["5.0", "5.01"],
				XP: ["5.1", "5.2"],
				Vista: "6.0",
				7: "6.1",
				8: "6.2",
				8.1: "6.3",
				10: ["6.4", "10.0"],
				NT: "",
			},
			e4 = {
				embedded: "Automotive",
				mobile: "Mobile",
				tablet: ["Tablet", "EInk"],
				smarttv: "TV",
				wearable: "Watch",
				xr: ["VR", "XR"],
				"?": ["Desktop", "Unknown"],
				"*": void 0,
			},
			e6 = {
				Chrome: "Google Chrome",
				Edge: "Microsoft Edge",
				"Edge WebView2": "Microsoft Edge WebView2",
				"Chrome WebView": "Android WebView",
				"Chrome Headless": "HeadlessChrome",
				"Huawei Browser": "HuaweiBrowser",
				"MIUI Browser": "Miui Browser",
				"Opera Mobi": "OperaMobile",
				Yandex: "YaBrowser",
			},
			e5 = {
				browser: [
					[/\b(?:crmo|crios)\/([\w\.]+)/i],
					[O, [A, eL + "Chrome"]],
					[/webview.+edge\/([\w\.]+)/i],
					[O, [A, eD + " WebView"], [T, Q]],
					[/edg(?:e|ios|a)?\/([\w\.]+)/i],
					[O, [A, "Edge"]],
					[
						/(opera mini)\/([-\w\.]+)/i,
						/(opera [mobiletab]{3,6})\b.+version\/([-\w\.]+)/i,
						/(opera)(?:.+version\/|[\/ ]+)([\w\.]+)/i,
					],
					[A, O],
					[/opios[\/ ]+([\w\.]+)/i],
					[O, [A, eF + " Mini"]],
					[/\bop(?:rg)?x\/([\w\.]+)/i],
					[O, [A, eF + " GX"]],
					[/\bopr\/([\w\.]+)/i],
					[O, [A, eF]],
					[/\bb[ai]*d(?:uhd|[ub]*[aekoprswx]{5,6})[\/ ]?([\w\.]+)/i],
					[O, [A, "Baidu"]],
					[/\b(?:mxbrowser|mxios|myie2)\/?([-\w\.]*)\b/i],
					[O, [A, "Maxthon"]],
					[
						/(kindle)\/([\w\.]+)/i,
						/(lunascape|maxthon|netfront|jasmine|blazer|sleipnir)[\/ ]?([\w\.]*)/i,
						/(avant|iemobile|slim(?:browser|boat|jet))[\/ ]?([\d\.]*)/i,
						/(?:ms|\()(ie) ([\w\.]+)/i,
						/(atlas|flock|rockmelt|midori|epiphany|silk|skyfire|bolt|iron|vivaldi|iridium|phantomjs|bowser|qupzilla|falkon|rekonq|puffin|whale(?!.+naver)|qqbrowserlite|duckduckgo|klar|helio|(?=comodo_)?dragon|otter|dooble|(?:hi|lg |ovi|qute)browser|palemoon)\/v?([-\w\.]+)/i,
						/(brave)(?: chrome)?\/([\d\.]+)/i,
						/(aloha|heytap|ovi|115|surf|qwant)browser\/([\d\.]+)/i,
						/(qwant)(?:ios|mobile)\/([\d\.]+)/i,
						/(ecosia|weibo)(?:__| \w+@)([\d\.]+)/i,
					],
					[A, O],
					[/quark(?:pc)?\/([-\w\.]+)/i],
					[O, [A, "Quark"]],
					[/\bddg\/([\w\.]+)/i],
					[O, [A, "DuckDuckGo"]],
					[/(?:\buc? ?browser|(?:juc.+)ucweb| ucpc)[\/ ]?([\w\.]+)/i],
					[O, [A, "UCBrowser"]],
					[
						/microm.+\bqbcore\/([\w\.]+)/i,
						/\bqbcore\/([\w\.]+).+microm/i,
						/micromessenger\/([\w\.]+)/i,
					],
					[O, [A, "WeChat"]],
					[/konqueror\/([\w\.]+)/i],
					[O, [A, "Konqueror"]],
					[/trident.+rv[: ]([\w\.]{1,9})\b.+like gecko/i],
					[O, [A, "IE"]],
					[/ya(?:search)?browser\/([\w\.]+)/i],
					[O, [A, "Yandex"]],
					[/slbrowser\/([\w\.]+)/i],
					[O, [A, "Smart " + ex + eO]],
					[/(av(?:ast|g|ira))\/([\w\.]+)/i],
					[[A, /(.+)/, "$1 Secure" + eO], O],
					[/norton\/([\w\.]+)/i],
					[O, [A, "Norton Private" + eO]],
					[/\bfocus\/([\w\.]+)/i],
					[O, [A, eI + " Focus"]],
					[/ mms\/([\w\.]+)$/i],
					[O, [A, eF + " Neon"]],
					[/ opt\/([\w\.]+)$/i],
					[O, [A, eF + " Touch"]],
					[/coc_coc\w+\/([\w\.]+)/i],
					[O, [A, "Coc Coc"]],
					[/dolfin\/([\w\.]+)/i],
					[O, [A, "Dolphin"]],
					[/coast\/([\w\.]+)/i],
					[O, [A, eF + " Coast"]],
					[/miuibrowser\/([\w\.]+)/i],
					[O, [A, "MIUI" + eO]],
					[/fxios\/([\w\.-]+)/i],
					[O, [A, eL + eI]],
					[/\bqihoobrowser\/?([\w\.]*)/i],
					[O, [A, "360"]],
					[/\b(qq)\/([\w\.]+)/i],
					[[A, /(.+)/, "$1Browser"], O],
					[/(oculus|sailfish|huawei|vivo|pico)browser\/([\w\.]+)/i],
					[[A, /(.+)/, "$1" + eO], O],
					[/ HBPC\/([\w\.]+)/],
					[O, [A, eg + eO]],
					[/samsungbrowser\/([\w\.]+)/i],
					[O, [A, eC + " Internet"]],
					[/metasr[\/ ]?([\d\.]+)/i],
					[O, [A, eT + " Explorer"]],
					[/(sogou)mo\w+\/([\d\.]+)/i],
					[[A, eT + " Mobile"], O],
					[
						/(electron)\/([\w\.]+) safari/i,
						/(tesla)(?: qtcarbrowser|\/(20\d\d\.[-\w\.]+))/i,
						/m?(qqbrowser|2345(?=browser|chrome|explorer))\w*[\/ ]?v?([\w\.]+)/i,
					],
					[A, O],
					[/(lbbrowser|luakit|rekonq|steam(?= (clie|tenf|gameo)))/i],
					[A],
					[/ome\/([\w\.]+).+(iron(?= saf)|360(?=[es]e$))/i],
					[O, A],
					[/((?:fban\/fbios|fb_iab\/fb4a)(?!.+fbav)|;fbav\/([\w\.]+);)/i],
					[[A, eA], O, [T, Q]],
					[
						/(kakao(?:talk|story))[\/ ]([\w\.]+)/i,
						/(naver)\(.*?(\d+\.[\w\.]+).*\)/i,
						/(daum)apps[\/ ]([\w\.]+)/i,
						/safari (line)\/([\w\.]+)/i,
						/\b(line)\/([\w\.]+)\/iab/i,
						/(alipay)client\/([\w\.]+)/i,
						/(twitter)(?:and| f.+e\/([\w\.]+))/i,
						/(bing)(?:web|sapphire)\/([\w\.]+)/i,
						/(instagram|snapchat|klarna)[\/ ]([-\w\.]+)/i,
					],
					[A, O, [T, Q]],
					[/\bgsa\/([\w\.]+) .*safari\//i],
					[O, [A, "GSA"], [T, Q]],
					[/(?:musical_ly|trill)(?:.+app_?version\/|_)([\w\.]+)/i],
					[O, [A, "TikTok"], [T, Q]],
					[/\[(linkedin)app\]/i],
					[A, [T, Q]],
					[/(zalo(?:app)?)[\/\sa-z]*([\w\.-]+)/i],
					[[A, /(.+)/, "Zalo"], O, [T, Q]],
					[/(chromium)[\/ ]([-\w\.]+)/i],
					[A, O],
					[/ome-(lighthouse)$/i],
					[A, [T, "fetcher"]],
					[/headlesschrome(?:\/([\w\.]+)| )/i],
					[O, [A, eR + " Headless"]],
					[/wv\).+chrome\/([\w\.]+).+edgw\//i],
					[O, [A, eD + " WebView2"], [T, Q]],
					[/; wv\).+(chrome)\/([\w\.]+)/i],
					[[A, eR + " WebView"], O, [T, Q]],
					[/droid.+ version\/([\w\.]+)\b.+(?:mobile safari|safari)/i],
					[O, [A, "Android" + eO]],
					[/chrome\/([\w\.]+) mobile/i],
					[O, [A, eL + "Chrome"]],
					[/(chrome|omniweb|arora|[tizenoka]{5} ?browser)\/v?([\w\.]+)/i],
					[A, O],
					[/version\/([\w\.\,]+) .*mobile(?:\/\w+ | ?)safari/i],
					[O, [A, eL + "Safari"]],
					[/iphone .*mobile(?:\/\w+ | ?)safari/i],
					[[A, eL + "Safari"]],
					[/version\/([\w\.\,]+) .*(safari)/i],
					[O, A],
					[/webkit.+?(mobile ?safari|safari)(\/[\w\.]+)/i],
					[A, [O, "1"]],
					[/(webkit|khtml)\/([\w\.]+)/i],
					[A, O],
					[/(?:mobile|tablet);.*(firefox)\/([\w\.-]+)/i],
					[[A, eL + eI], O],
					[/(navigator|netscape\d?)\/([-\w\.]+)/i],
					[[A, "Netscape"], O],
					[/(wolvic|librewolf)\/([\w\.]+)/i],
					[A, O],
					[/mobile vr; rv:([\w\.]+)\).+firefox/i],
					[O, [A, eI + " Reality"]],
					[
						/ekiohf.+(flow)\/([\w\.]+)/i,
						/(swiftfox)/i,
						/(icedragon|iceweasel|camino|chimera|fennec|maemo browser|minimo|conkeror)[\/ ]?([\w\.\+]+)/i,
						/(seamonkey|k-meleon|icecat|iceape|firebird|phoenix|basilisk|waterfox)\/([-\w\.]+)$/i,
						/(firefox)\/([\w\.]+)/i,
						/(mozilla)\/([\w\.]+(?= .+rv\:.+gecko\/\d+)|[0-4][\w\.]+(?!.+compatible))/i,
						/(amaya|dillo|doris|icab|ladybird|lynx|mosaic|netsurf|obigo|polaris|w3m|(?:go|ice|up)[\. ]?browser)[-\/ ]?v?([\w\.]+)/i,
						/\b(links) \(([\w\.]+)/i,
					],
					[A, [O, /_/g, "."]],
					[/(cobalt)\/([\w\.]+)/i],
					[A, [O, /[^\d\.]+./, ""]],
				],
				cpu: [
					[/\b((amd|x|x86[-_]?|wow|win)64)\b/i],
					[[B, "amd64"]],
					[/(ia32(?=;))/i, /\b((i[346]|x)86)(pc)?\b/i],
					[[B, "ia32"]],
					[/\b(aarch64|arm(v?[89]e?l?|_?64))\b/i],
					[[B, "arm64"]],
					[/\b(arm(v[67])?ht?n?[fl]p?)\b/i],
					[[B, "armhf"]],
					[/( (ce|mobile); ppc;|\/[\w\.]+arm\b)/i],
					[[B, "arm"]],
					[/ sun4\w[;\)]/i],
					[[B, "sparc"]],
					[
						/\b(avr32|ia64(?=;)|68k(?=\))|\barm(?=v([1-7]|[5-7]1)l?|;|eabi)|(irix|mips|sparc)(64)?\b|pa-risc)/i,
						/((ppc|powerpc)(64)?)( mac|;|\))/i,
						/(?:osf1|[freopnt]{3,4}bsd) (alpha)/i,
					],
					[[B, /ower/, "", eQ]],
					[/mc680.0/i],
					[[B, "68k"]],
					[/winnt.+\[axp/i],
					[[B, "alpha"]],
				],
				device: [
					[
						/\b(sch-i[89]0\d|shw-m380s|sm-[ptx]\w{2,4}|gt-[pn]\d{2,4}|sgh-t8[56]9|nexus 10)/i,
					],
					[H, [L, eC], [T, V]],
					[
						/\b((?:s[cgp]h|gt|sm)-(?![lr])\w+|sc[g-]?[\d]+a?|galaxy nexus)/i,
						/samsung[- ]((?!sm-[lr]|browser)[-\w]+)/i,
						/sec-(sgh\w+)/i,
					],
					[H, [L, eC], [T, U]],
					[/(?:\/|\()(ip(?:hone|od)[\w, ]*)[\/\);]/i],
					[H, [L, ef], [T, U]],
					[
						/\b(?:ios|apple\w+)\/.+[\(\/](ipad)/i,
						/\b(ipad)[\d,]*[;\] ].+(mac |i(pad)?)os/i,
					],
					[H, [L, ef], [T, V]],
					[/(macintosh);/i],
					[H, [L, ef]],
					[/\b(sh-?[altvz]?\d\d[a-ekm]?)/i],
					[H, [L, eN], [T, U]],
					[
						/\b((?:brt|eln|hey2?|gdi|jdn)-a?[lnw]09|(?:ag[rm]3?|jdn2|kob2)-a?[lw]0[09]hn)(?: bui|\)|;)/i,
					],
					[H, [L, ev], [T, V]],
					[/honor([-\w ]+)[;\)]/i],
					[H, [L, ev], [T, U]],
					[
						/\b((?:ag[rs][2356]?k?|bah[234]?|bg[2o]|bt[kv]|cmr|cpn|db[ry]2?|jdn2|got|kob2?k?|mon|pce|scm|sht?|[tw]gr|vrd)-[ad]?[lw][0125][09]b?|605hw|bg2-u03|(?:gem|fdr|m2|ple|t1)-[7a]0[1-4][lu]|t1-a2[13][lw]|mediapad[\w\. ]*(?= bui|\)))\b(?!.+d\/s)/i,
					],
					[H, [L, eg], [T, V]],
					[
						/(?:huawei) ?([-\w ]+)[;\)]/i,
						/\b(nexus 6p|\w{2,4}e?-[atu]?[ln][\dx][\dc][adnt]?)\b(?!.+d\/s)/i,
					],
					[H, [L, eg], [T, U]],
					[
						/oid[^\)]+; (2[\dbc]{4}(182|283|rp\w{2})[cgl]|m2105k81a?c)(?: bui|\))/i,
						/\b(?:xiao)?((?:red)?mi[-_ ]?pad[\w- ]*)(?: bui|\))/i,
					],
					[
						[H, /_/g, " "],
						[L, eS],
						[T, V],
					],
					[
						/\b; (\w+) build\/hm\1/i,
						/\b(hm[-_ ]?note?[_ ]?(?:\d\w)?) bui/i,
						/oid[^\)]+; (redmi[\-_ ]?(?:note|k)?[\w_ ]+|m?[12]\d[01]\d\w{3,6}|poco[\w ]+|(shark )?\w{3}-[ah]0|qin ?[1-3](s\+|ultra| pro)?)( bui|; wv|\))/i,
						/\b(mi[-_ ]?(?:a\d|one|one[_ ]plus|note|max|cc)?[_ ]?(?:\d{0,2}\w?)[_ ]?(?:plus|se|lite|pro)?( 5g|lte)?)(?: bui|\))/i,
						/; ([\w ]+) miui\/v?\d/i,
					],
					[
						[H, /_/g, " "],
						[L, eS],
						[T, U],
					],
					[
						/droid.+; (cph2[3-6]\d[13579]|((gm|hd)19|(ac|be|in|kb)20|(d[en]|eb|le|mt)21|ne22)[0-2]\d|p[g-l]\w[1m]10)\b/i,
						/(?:one)?(?:plus)? (a\d0\d\d)(?: b|\))/i,
					],
					[H, [L, ej], [T, U]],
					[
						/; (\w+) bui.+ oppo/i,
						/\b(cph[12]\d{3}|p(?:af|c[al]|d\w|e[ar])[mt]\d0|x9007|a101op)\b/i,
					],
					[H, [L, ek], [T, U]],
					[/\b(opd2(\d{3}a?))(?: bui|\))/i],
					[
						H,
						[
							L,
							e1,
							{ OnePlus: ["203", "304", "403", "404", "413", "415"], "*": ek },
						],
						[T, V],
					],
					[/(vivo (5r?|6|8l?|go|one|s|x[il]?[2-4]?)[\w\+ ]*)(?: bui|\))/i],
					[H, [L, "BLU"], [T, U]],
					[/; vivo (\w+)(?: bui|\))/i, /\b(v[12]\d{3}\w?[at])(?: bui|;)/i],
					[H, [L, "Vivo"], [T, U]],
					[/\b(rmx[1-3]\d{3})(?: bui|;|\))/i],
					[H, [L, "Realme"], [T, U]],
					[
						/(ideatab[-\w ]+|602lv|d-42a|a101lv|a2109a|a3500-hv|s[56]000|pb-6505[my]|tb-?x?\d{3,4}(?:f[cu]|xu|[av])|yt\d?-[jx]?\d+[lfmx])( bui|;|\)|\/)/i,
						/lenovo ?(b[68]0[08]0-?[hf]?|tab(?:[\w- ]+?)|tb[\w-]{6,7})( bui|;|\)|\/)/i,
					],
					[H, [L, ex], [T, V]],
					[/lenovo[-_ ]?([-\w ]+?)(?: bui|\)|\/)/i],
					[H, [L, ex], [T, U]],
					[
						/\b(milestone|droid(?:[2-4x]| (?:bionic|x2|pro|razr))?:?( 4g)?)\b[\w ]+build\//i,
						/\bmot(?:orola)?[- ]([\w\s]+)(\)| bui)/i,
						/((?:moto(?! 360)[-\w\(\) ]+|xt\d{3,4}[cgkosw\+]?[-\d]*|nexus 6)(?= bui|\)))/i,
					],
					[H, [L, eb], [T, U]],
					[/\b(mz60\d|xoom[2 ]{0,2}) build\//i],
					[H, [L, eb], [T, V]],
					[/\b(?:lg)?([vl]k\-?\d{3}) bui| 3\.[-\w; ]{10}lg?-([06cv9]{3,4})/i],
					[H, [L, "LG"], [T, V]],
					[
						/(lm(?:-?f100[nv]?|-[\w\.]+)(?= bui|\))|nexus [45])/i,
						/\blg[-e;\/ ]+(?!.*(?:browser|netcast|android tv|watch|webos))(\w+)/i,
						/\blg-?([\d\w]+) bui/i,
					],
					[H, [L, "LG"], [T, U]],
					[/(nokia) (t[12][01])/i],
					[L, H, [T, V]],
					[
						/(?:maemo|nokia).*(n900|lumia \d+|rm-\d+)/i,
						/nokia[-_ ]?(([-\w\. ]*?))( bui|\)|;|\/)/i,
					],
					[
						[H, /_/g, " "],
						[T, U],
						[L, "Nokia"],
					],
					[/(pixel (c|tablet))\b/i],
					[H, [L, eh], [T, V]],
					[
						/droid.+;(?: google)? (g(01[13]a|020[aem]|025[jn]|1b60|1f8f|2ybb|4s1m|576d|5nz6|8hhn|8vou|a02099|c15s|d1yq|e2ae|ec77|gh2x|kv4x|p4bc|pj41|r83y|tt9q|ur25|wvk6)|pixel[\d ]*a?( pro)?( xl)?( fold)?( \(5g\))?)( bui|\))/i,
					],
					[H, [L, eh], [T, U]],
					[/(google) (pixelbook( go)?)/i],
					[L, H],
					[
						/droid.+; (a?\d[0-2]{2}so|[c-g]\d{4}|so[-gl]\w+|xq-\w\w\d\d)(?= bui|\).+chrome\/(?![1-6]{0,1}\d\.))/i,
					],
					[H, [L, eE], [T, U]],
					[/sony tablet [ps]/i, /\b(?:sony)?sgp\w+(?: bui|\))/i],
					[
						[H, "Xperia Tablet"],
						[L, eE],
						[T, V],
					],
					[
						/(alexa)webm/i,
						/(kf[a-z]{2}wi|aeo(?!bc)\w\w)( bui|\))/i,
						/(kf[a-z]+)( bui|\)).+silk\//i,
					],
					[H, [L, eu], [T, V]],
					[/((?:sd|kf)[0349hijorstuw]+)( bui|\)).+silk\//i],
					[
						[H, /(.+)/g, "Fire Phone $1"],
						[L, eu],
						[T, U],
					],
					[/(playbook);[-\w\),; ]+(rim)/i],
					[H, L, [T, V]],
					[/\b((?:bb[a-f]|st[hv])100-\d)/i, /(?:blackberry|\(bb10;) (\w+)/i],
					[H, [L, em], [T, U]],
					[
						/(?:\b|asus_)(transfo[prime ]{4,10} \w+|eeepc|slider \w+|nexus 7|padfone|p00[cj])/i,
					],
					[H, [L, ep], [T, V]],
					[/ (z[bes]6[027][012][km][ls]|zenfone \d\w?)\b/i],
					[H, [L, ep], [T, U]],
					[/(nexus 9)/i],
					[H, [L, "HTC"], [T, V]],
					[
						/(htc)[-;_ ]{1,2}([\w ]+(?=\)| bui)|\w+)/i,
						/(zte)[- ]([\w ]+?)(?: bui|\/|\))/i,
						/(alcatel|geeksphone|nexian|panasonic(?!(?:;|\.))|sony(?!-bra))[-_ ]?([-\w]*)/i,
					],
					[L, [H, /_/g, " "], [T, U]],
					[
						/tcl (xess p17aa)/i,
						/droid [\w\.]+; ((?:8[14]9[16]|9(?:0(?:48|60|8[01])|1(?:3[27]|66)|2(?:6[69]|9[56])|466))[gqswx])(_\w(\w|\w\w))?(\)| bui)/i,
					],
					[H, [L, "TCL"], [T, V]],
					[
						/droid [\w\.]+; (418(?:7d|8v)|5087z|5102l|61(?:02[dh]|25[adfh]|27[ai]|56[dh]|59k|65[ah])|a509dl|t(?:43(?:0w|1[adepqu])|50(?:6d|7[adju])|6(?:09dl|10k|12b|71[efho]|76[hjk])|7(?:66[ahju]|67[hw]|7[045][bh]|71[hk]|73o|76[ho]|79w|81[hks]?|82h|90[bhsy]|99b)|810[hs]))(_\w(\w|\w\w))?(\)| bui)/i,
					],
					[H, [L, "TCL"], [T, U]],
					[/(itel) ((\w+))/i],
					[
						[L, eQ],
						H,
						[T, e1, { tablet: ["p10001l", "w7001"], "*": "mobile" }],
					],
					[/droid.+; ([ab][1-7]-?[0178a]\d\d?)/i],
					[H, [L, "Acer"], [T, V]],
					[/droid.+; (m[1-5] note) bui/i, /\bmz-([-\w]{2,})/i],
					[H, [L, "Meizu"], [T, U]],
					[/; ((?:power )?armor(?:[\w ]{0,8}))(?: bui|\))/i],
					[H, [L, "Ulefone"], [T, U]],
					[/; (energy ?\w+)(?: bui|\))/i, /; energizer ([\w ]+)(?: bui|\))/i],
					[H, [L, "Energizer"], [T, U]],
					[/; cat (b35);/i, /; (b15q?|s22 flip|s48c|s62 pro)(?: bui|\))/i],
					[H, [L, "Cat"], [T, U]],
					[/((?:new )?andromax[\w- ]+)(?: bui|\))/i],
					[H, [L, "Smartfren"], [T, U]],
					[/droid.+; (a(in)?(0(15|59|6[35])|142)p?)/i],
					[H, [L, "Nothing"], [T, U]],
					[
						/; (x67 5g|tikeasy \w+|ac[1789]\d\w+)( b|\))/i,
						/archos ?(5|gamepad2?|([\w ]*[t1789]|hello) ?\d+[\w ]*)( b|\))/i,
					],
					[H, [L, "Archos"], [T, V]],
					[/archos ([\w ]+)( b|\))/i, /; (ac[3-6]\d\w{2,8})( b|\))/i],
					[H, [L, "Archos"], [T, U]],
					[/blackview ([-\w ]+)( b|\))/i, /; (bv\d{4}[-\w ]*)( b|\))/i],
					[H, [L, "Blackview"], [T, U]],
					[/; (n159v)/i],
					[H, [L, "HMD"], [T, U]],
					[/((revvl[ \w\+]+|tm(?:rv|af)\w*[45]g(?:tb)?))( b|\))/i],
					[
						H,
						[
							T,
							function (e, t) {
								return t.test.test(e) ? t.ifTrue : t.ifFalse;
							},
							{ test: /ta?b/i, ifTrue: V, ifFalse: U },
						],
						[L, "T-Mobile"],
					],
					[
						/(imo) (tab \w+)/i,
						/(infinix|tecno) (x1101b?|p904|dp(7c|8d|10a)( pro)?|p70[1-3]a?|p904|t1101)/i,
					],
					[L, H, [T, V]],
					[
						/(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus(?! zenw)|dell|jolla|meizu|motorola|polytron|tecno|micromax|advan)[-_ ]?([-\w]*)/i,
						/; (blu|coolpad|cubot|hmd|imo|infinix|lava|oneplus|tcl|wiko)[_ ]([-\w\+ ]+?)(?: bui|\)|; r)/i,
						/(hp) ([\w ]+\w)/i,
						/(microsoft); (lumia[\w ]+)/i,
						/(oppo) ?([\w ]+) bui/i,
						/(hisense) ([ehv][\w ]+)\)/i,
						/droid[^;]+; (philips)[_ ]([sv-x][\d]{3,4}[xz]?)/i,
					],
					[L, H, [T, U]],
					[
						/(kobo)\s(ereader|touch)/i,
						/(hp).+(touchpad(?!.+tablet)|tablet)/i,
						/(kindle)\/([\w\.]+)/i,
					],
					[L, H, [T, V]],
					[/(surface duo)/i],
					[H, [L, ew], [T, V]],
					[/droid [\d\.]+; (fp\du?)(?: b|\))/i],
					[H, [L, "Fairphone"], [T, U]],
					[/((?:tegranote|shield t(?!.+d tv))[\w- ]*?)(?: b|\))/i],
					[H, [L, ey], [T, V]],
					[/(sprint) (\w+)/i],
					[L, H, [T, U]],
					[/(kin\.[onetw]{3})/i],
					[
						[H, /\./g, " "],
						[L, ew],
						[T, U],
					],
					[/droid.+; ([c6]+|et5[16]|mc[239][23]x?|vc8[03]x?)\)/i],
					[H, [L, eP], [T, V]],
					[/droid.+; (ec30|ps20|tc[2-8]\d[kx])\)/i],
					[H, [L, eP], [T, U]],
					[/(philips)[\w ]+tv/i, /smart-tv.+(samsung)/i],
					[L, [T, K]],
					[/hbbtv.+maple;(\d+)/i],
					[
						[H, /^/, "SmartTV"],
						[L, eC],
						[T, K],
					],
					[/(vizio)(?: |.+model\/)(\w+-\w+)/i, /tcast.+(lg)e?. ([-\w]+)/i],
					[L, H, [T, K]],
					[/(nux; netcast.+smarttv|lg (netcast\.tv-201\d|android tv))/i],
					[
						[L, "LG"],
						[T, K],
					],
					[/(apple) ?tv/i],
					[L, [H, ef + " TV"], [T, K]],
					[/crkey.*devicetype\/chromecast/i],
					[
						[H, eM + " Third Generation"],
						[L, eh],
						[T, K],
					],
					[/crkey.*devicetype\/([^/]*)/i],
					[
						[H, /^/, "Chromecast "],
						[L, eh],
						[T, K],
					],
					[/fuchsia.*crkey/i],
					[
						[H, eM + " Nest Hub"],
						[L, eh],
						[T, K],
					],
					[/crkey/i],
					[
						[H, eM],
						[L, eh],
						[T, K],
					],
					[/(portaltv)/i],
					[H, [L, eA], [T, K]],
					[/droid.+aft(\w+)( bui|\))/i],
					[H, [L, eu], [T, K]],
					[/(shield \w+ tv)/i],
					[H, [L, ey], [T, K]],
					[/\(dtv[\);].+(aquos)/i, /(aquos-tv[\w ]+)\)/i],
					[H, [L, eN], [T, K]],
					[/(bravia[\w ]+)( bui|\))/i],
					[H, [L, eE], [T, K]],
					[/(mi(tv|box)-?\w+) bui/i],
					[H, [L, eS], [T, K]],
					[/Hbbtv.*(technisat) (.*);/i],
					[L, H, [T, K]],
					[
						/\b(roku)[\dx]*[\)\/]((?:dvp-)?[\d\.]*)/i,
						/hbbtv\/\d+\.\d+\.\d+ +\([\w\+ ]*; *([\w\d][^;]*);([^;]*)/i,
					],
					[
						[L, /.+\/(\w+)/, "$1", e1, { LG: "lge" }],
						[H, eJ],
						[T, K],
					],
					[/(playstation \w+)/i],
					[H, [L, eE], [T, q]],
					[/\b(xbox(?: one)?(?!; xbox))[\); ]/i],
					[H, [L, ew], [T, q]],
					[
						/(ouya)/i,
						/(nintendo) (\w+)/i,
						/(retroid) (pocket ([^\)]+))/i,
						/(valve).+(steam deck)/i,
						/droid.+; ((shield|rgcube|gr0006))( bui|\))/i,
					],
					[
						[
							L,
							e1,
							{ Nvidia: "Shield", Anbernic: "RGCUBE", Logitech: "GR0006" },
						],
						H,
						[T, q],
					],
					[/\b(sm-[lr]\d\d[0156][fnuw]?s?|gear live)\b/i],
					[H, [L, eC], [T, $]],
					[
						/((pebble))app/i,
						/(asus|google|lg|oppo|xiaomi) ((pixel |zen)?watch[\w ]*)( bui|\))/i,
					],
					[L, H, [T, $]],
					[/(ow(?:19|20)?we?[1-3]{1,3})/i],
					[H, [L, ek], [T, $]],
					[/(watch)(?: ?os[,\/]|\d,\d\/)[\d\.]+/i],
					[H, [L, ef], [T, $]],
					[/(opwwe\d{3})/i],
					[H, [L, ej], [T, $]],
					[/(moto 360)/i],
					[H, [L, eb], [T, $]],
					[/(smartwatch 3)/i],
					[H, [L, eE], [T, $]],
					[/(g watch r)/i],
					[H, [L, "LG"], [T, $]],
					[/droid.+; (wt63?0{2,3})\)/i],
					[H, [L, eP], [T, $]],
					[/droid.+; (glass) \d/i],
					[H, [L, eh], [T, "xr"]],
					[/(pico) ([\w ]+) os\d/i],
					[L, H, [T, "xr"]],
					[/(quest( \d| pro)?s?).+vr/i],
					[H, [L, eA], [T, "xr"]],
					[/mobile vr; rv.+firefox/i],
					[[T, "xr"]],
					[/(tesla)(?: qtcarbrowser|\/[-\w\.]+)/i],
					[L, [T, G]],
					[/(aeobc)\b/i],
					[H, [L, eu], [T, G]],
					[/(homepod).+mac os/i],
					[H, [L, ef], [T, G]],
					[/windows iot/i],
					[[T, G]],
					[/droid.+; ([\w- ]+) (4k|android|smart|google)[- ]?tv/i],
					[H, [T, K]],
					[
						/\b((4k|android|smart|opera)[- ]?tv|tv; rv:|large screen[\w ]+safari)\b/i,
					],
					[[T, K]],
					[
						/droid .+?; ([^;]+?)(?: bui|; wv\)|\) applew|; hmsc).+?(mobile|vr|\d) safari/i,
					],
					[H, [T, e1, { mobile: "Mobile", xr: "VR", "*": V }]],
					[/\b((tablet|tab)[;\/]|focus\/\d(?!.+mobile))/i],
					[[T, V]],
					[/(phone|mobile(?:[;\/]| [ \w\/\.]*safari)|pda(?=.+windows ce))/i],
					[[T, U]],
					[/droid .+?; ([\w\. -]+)( bui|\))/i],
					[H, [L, "Generic"]],
				],
				engine: [
					[/windows.+ edge\/([\w\.]+)/i],
					[O, [A, eD + "HTML"]],
					[/(arkweb)\/([\w\.]+)/i],
					[A, O],
					[/webkit\/537\.36.+chrome\/(?!27)([\w\.]+)/i],
					[O, [A, "Blink"]],
					[
						/(presto)\/([\w\.]+)/i,
						/(webkit|trident|netfront|netsurf|amaya|lynx|w3m|goanna|servo)\/([\w\.]+)/i,
						/ekioh(flow)\/([\w\.]+)/i,
						/(khtml|tasman|links|dillo)[\/ ]\(?([\w\.]+)/i,
						/(icab)[\/ ]([23]\.[\d\.]+)/i,
						/\b(libweb)/i,
					],
					[A, O],
					[/ladybird\//i],
					[[A, "LibWeb"]],
					[/rv\:([\w\.]{1,9})\b.+(gecko)/i],
					[O, A],
				],
				os: [
					[/(windows nt) (6\.[23]); arm/i],
					[
						[A, /N/, "R"],
						[O, e1, e2],
					],
					[
						/(windows (?:phone|mobile|iot))(?: os)?[\/ ]?([\d\.]*( se)?)/i,
						/(windows)[\/ ](1[01]|2000|3\.1|7|8(\.1)?|9[58]|me|server 20\d\d( r2)?|vista|xp)/i,
					],
					[A, O],
					[
						/windows nt ?([\d\.\)]*)(?!.+xbox)/i,
						/\bwin(?=3| ?9|n)(?:nt| 9x )?([\d\.;]*)/i,
					],
					[
						[O, /(;|\))/g, "", e1, e2],
						[A, eB],
					],
					[/(windows ce)\/?([\d\.]*)/i],
					[A, O],
					[
						/[adehimnop]{4,7}\b(?:.*os ([\w]+) like mac|; opera)/i,
						/(?:ios;fbsv|ios(?=.+ip(?:ad|hone)|.+apple ?tv)|ip(?:ad|hone)(?: |.+i(?:pad)?)os|apple ?tv.+ios)[\/ ]([\w\.]+)/i,
						/\btvos ?([\w\.]+)/i,
						/cfnetwork\/.+darwin/i,
					],
					[
						[O, /_/g, "."],
						[A, "iOS"],
					],
					[
						/(mac os x) ?([\w\. ]*)/i,
						/(macintosh|mac_powerpc\b)(?!.+(haiku|morphos))/i,
					],
					[
						[A, "macOS"],
						[O, /_/g, "."],
					],
					[/android ([\d\.]+).*crkey/i],
					[O, [A, eM + " Android"]],
					[/fuchsia.*crkey\/([\d\.]+)/i],
					[O, [A, eM + " Fuchsia"]],
					[/crkey\/([\d\.]+).*devicetype\/smartspeaker/i],
					[O, [A, eM + " SmartSpeaker"]],
					[/linux.*crkey\/([\d\.]+)/i],
					[O, [A, eM + " Linux"]],
					[/crkey\/([\d\.]+)/i],
					[O, [A, eM]],
					[/droid ([\w\.]+)\b.+(android[- ]x86)/i],
					[O, A],
					[/(ubuntu) ([\w\.]+) like android/i],
					[[A, /(.+)/, "$1 Touch"], O],
					[
						/(harmonyos)[\/ ]?([\d\.]*)/i,
						/(android|bada|blackberry|kaios|maemo|meego|openharmony|qnx|rim tablet os|sailfish|series40|symbian|tizen)\w*[-\/\.; ]?([\d\.]*)/i,
					],
					[A, O],
					[/\(bb(10);/i],
					[O, [A, em]],
					[/(?:symbian ?os|symbos|s60(?=;)|series ?60)[-\/ ]?([\w\.]*)/i],
					[O, [A, "Symbian"]],
					[
						/mozilla\/[\d\.]+ \((?:mobile[;\w ]*|tablet|tv|[^\)]*(?:viera|lg(?:l25|-d300)|alcatel ?o.+|y300-f1)); rv:([\w\.]+)\).+gecko\//i,
					],
					[O, [A, eI + " OS"]],
					[
						/\b(?:hp)?wos(?:browser)?\/([\w\.]+)/i,
						/webos(?:[ \/]?|\.tv-20(?=2[2-9]))(\d[\d\.]*)/i,
					],
					[O, [A, "webOS"]],
					[/web0s;.+?(?:chr[o0]me|safari)\/(\d+)/i],
					[
						[
							O,
							e1,
							{
								25: "120",
								24: "108",
								23: "94",
								22: "87",
								6: "79",
								5: "68",
								4: "53",
								3: "38",
								2: "538",
								1: "537",
								"*": "TV",
							},
						],
						[A, "webOS"],
					],
					[/watch(?: ?os[,\/ ]|\d,\d\/)([\d\.]+)/i],
					[O, [A, "watchOS"]],
					[/cros [\w]+(?:\)| ([\w\.]+)\b)/i],
					[O, [A, "Chrome OS"]],
					[/kepler ([\w\.]+); (aft|aeo)/i],
					[O, [A, "Vega OS"]],
					[
						/(netrange)mmh/i,
						/(nettv)\/(\d+\.[\w\.]+)/i,
						/(nintendo|playstation) (\w+)/i,
						/(xbox); +xbox ([^\);]+)/i,
						/(pico) .+os([\w\.]+)/i,
						/\b(joli|palm)\b ?(?:os)?\/?([\w\.]*)/i,
						/linux.+(mint)[\/\(\) ]?([\w\.]*)/i,
						/(mageia|vectorlinux|fuchsia|arcaos|arch(?= ?linux))[;l ]([\d\.]*)/i,
						/([kxln]?ubuntu|debian|suse|opensuse|gentoo|slackware|fedora|mandriva|centos|pclinuxos|red ?hat|zenwalk|linpus|raspbian|plan 9|minix|risc os|contiki|deepin|manjaro|elementary os|sabayon|linspire|knoppix)(?: gnu[\/ ]linux)?(?: enterprise)?(?:[- ]linux)?(?:-gnu)?[-\/ ]?(?!chrom|package)([-\w\.]*)/i,
						/((?:open)?solaris)[-\/ ]?([\w\.]*)/i,
						/\b(aix)[; ]([1-9\.]{0,4})/i,
						/(hurd|linux|morphos)(?: (?:arm|x86|ppc)\w*| ?)([\w\.]*)/i,
						/(gnu) ?([\w\.]*)/i,
						/\b([-frentopcghs]{0,5}bsd|dragonfly)[\/ ]?(?!amd|[ix346]{1,2}86)([\w\.]*)/i,
						/(haiku) ?(r\d)?/i,
					],
					[A, O],
					[/(sunos) ?([\d\.]*)/i],
					[[A, "Solaris"], O],
					[
						/\b(beos|os\/2|amigaos|openvms|hp-ux|serenityos)/i,
						/(unix) ?([\w\.]*)/i,
					],
					[A, O],
				],
			},
			e3 =
				((l = { init: {}, isIgnore: {}, isIgnoreRgx: {}, toString: {} }),
				eY.call(l.init, [
					[M, [A, O, _, T]],
					["cpu", [B]],
					[D, [T, H, L]],
					[I, [A, O]],
					["os", [A, O]],
				]),
				eY.call(l.isIgnore, [
					[M, [O, _]],
					[I, [O]],
					["os", [O]],
				]),
				eY.call(l.isIgnoreRgx, [
					[M, / ?browser$/i],
					["os", / ?os$/i],
				]),
				eY.call(l.toString, [
					[M, [A, O]],
					["cpu", [B]],
					[D, [L, H]],
					[I, [A, O]],
					["os", [A, O]],
				]),
				l),
			e8 = function (e, t) {
				var r = e3.init[t],
					n = e3.isIgnore[t] || 0,
					i = e3.isIgnoreRgx[t] || 0,
					a = e3.toString[t] || 0;
				function s() {
					eY.call(this, r);
				}
				return (
					(s.prototype.getItem = function () {
						return e;
					}),
					(s.prototype.withClientHints = function () {
						return eH
							? eH.getHighEntropyValues(ed).then(function (t) {
									return e.setCH(new e7(t, !1)).parseCH().get();
								})
							: e.parseCH().get();
					}),
					(s.prototype.withFeatureCheck = function () {
						return e.detectFeature().get();
					}),
					t != F &&
						((s.prototype.is = function (e) {
							var t = !1;
							for (var r in this)
								if (
									this.hasOwnProperty(r) &&
									!eV(n, r) &&
									eQ(i ? eZ(i, this[r]) : this[r]) == eQ(i ? eZ(i, e) : e)
								) {
									if (((t = !0), e != z)) break;
								} else if (e == z && t) {
									t = !t;
									break;
								}
							return t;
						}),
						(s.prototype.toString = function () {
							var e = "";
							for (var t in a)
								typeof this[a[t]] !== z && (e += (e ? " " : "") + this[a[t]]);
							return e || z;
						})),
					(s.prototype.then = function (e) {
						var t = this,
							r = function () {
								for (var e in t) t.hasOwnProperty(e) && (this[e] = t[e]);
							};
						r.prototype = {
							is: s.prototype.is,
							toString: s.prototype.toString,
							withClientHints: s.prototype.withClientHints,
							withFeatureCheck: s.prototype.withFeatureCheck,
						};
						var n = new r();
						return e(n), n;
					}),
					new s()
				);
			};
		function e7(e, t) {
			if (((e = e || {}), eY.call(this, ed), t))
				eY.call(this, [
					[W, eG(e[et])],
					[Y, eG(e[er])],
					[U, /\?1/.test(e[es])],
					[H, eX(e[eo])],
					[Z, eX(e[el])],
					[J, eX(e[ec])],
					[B, eX(e[en])],
					[X, eG(e[ea])],
					[ee, eX(e[ei])],
				]);
			else
				for (var r in e)
					this.hasOwnProperty(r) && typeof e[r] !== z && (this[r] = e[r]);
		}
		function e9(e, t, r, n) {
			return (
				eY.call(this, [
					["itemType", e],
					["ua", t],
					["uaCH", n],
					["rgxMap", r],
					["data", e8(this, e)],
				]),
				this
			);
		}
		function te(e, t, r) {
			if (
				(typeof e === P
					? (eK(e, !0)
							? (typeof t === P && (r = t), (t = e))
							: ((r = e), (t = void 0)),
						(e = void 0))
					: typeof e !== R || eK(t, !0) || ((r = t), (t = void 0)),
				r)
			)
				if (typeof r.append === S) {
					var n = {};
					r.forEach(function (e, t) {
						n[String(t).toLowerCase()] = e;
					}),
						(r = n);
				} else {
					var i = {};
					for (var a in r)
						r.hasOwnProperty(a) && (i[String(a).toLowerCase()] = r[a]);
					r = i;
				}
			if (!(this instanceof te)) return new te(e, t, r).getResult();
			var s =
					typeof e === R
						? e
						: r && r[E]
							? r[E]
							: e_ && e_.userAgent
								? e_.userAgent
								: "",
				o = new e7(r, !0),
				l = e5,
				c = function (e) {
					return e == F
						? function () {
								return new e9(e, s, l, o)
									.set("ua", s)
									.set(M, this.getBrowser())
									.set("cpu", this.getCPU())
									.set(D, this.getDevice())
									.set(I, this.getEngine())
									.set("os", this.getOS())
									.get();
							}
						: function () {
								return new e9(e, s, l[e], o).parseUA().get();
							};
				};
			return (
				eY
					.call(this, [
						["getBrowser", c(M)],
						["getCPU", c("cpu")],
						["getDevice", c(D)],
						["getEngine", c(I)],
						["getOS", c("os")],
						["getResult", c(F)],
						[
							"getUA",
							function () {
								return s;
							},
						],
						[
							"setUA",
							function (e) {
								return e$(e) && (s = eJ(e, 500)), this;
							},
						],
						[
							"useExtension",
							function (e) {
								return e && (l = eq(l, e)), this;
							},
						],
					])
					.setUA(s)
					.useExtension(t),
				this
			);
		}
		(e9.prototype.get = function (e) {
			return e
				? this.data.hasOwnProperty(e)
					? this.data[e]
					: void 0
				: this.data;
		}),
			(e9.prototype.set = function (e, t) {
				return (this.data[e] = t), this;
			}),
			(e9.prototype.setCH = function (e) {
				return (this.uaCH = e), this;
			}),
			(e9.prototype.detectFeature = function () {
				if (e_ && e_.userAgent == this.ua)
					switch (this.itemType) {
						case M:
							e_.brave && typeof e_.brave.isBrave == S && this.set(A, "Brave");
							break;
						case D:
							!this.get(T) && eH && eH[U] && this.set(T, U),
								"Macintosh" == this.get(H) &&
									e_ &&
									typeof e_.standalone !== z &&
									e_.maxTouchPoints &&
									e_.maxTouchPoints > 2 &&
									this.set(H, "iPad").set(T, V);
							break;
						case "os":
							!this.get(A) && eH && eH[Z] && this.set(A, eH[Z]);
							break;
						case F:
							var e = this.data,
								t = function (t) {
									return e[t].getItem().detectFeature().get();
								};
							this.set(M, t(M))
								.set("cpu", t("cpu"))
								.set(D, t(D))
								.set(I, t(I))
								.set("os", t("os"));
					}
				return this;
			}),
			(e9.prototype.parseUA = function () {
				switch (
					(this.itemType != F && e0.call(this.data, this.ua, this.rgxMap),
					this.itemType)
				) {
					case M:
						this.set(_, eW(this.get(O)));
						break;
					case "os":
						if (
							"iOS" == this.get(A) &&
							this.get(O) &&
							/^1[89][^\d]/.exec(this.get(O))
						) {
							var e = /\) Version\/((\d+)[\d\.]*)/.exec(this.ua);
							e && parseInt(e[2], 10) >= 26 && this.set(O, e[1]);
						}
				}
				return this;
			}),
			(e9.prototype.parseCH = function () {
				var e = this.uaCH,
					t = this.rgxMap;
				switch (this.itemType) {
					case M:
					case I:
						var r,
							n = e[Y] || e[W];
						if (n)
							for (var i = 0; i < n.length; i++) {
								var a = n[i].brand || n[i],
									s = n[i].version;
								this.itemType == M &&
									!/not.a.brand/i.test(a) &&
									(!r ||
										(/Chrom/.test(r) && a != ez) ||
										(r == eD && /WebView2/.test(a))) &&
									((a = e1(a, e6)),
									((r = this.get(A)) && !/Chrom/.test(r) && /Chrom/.test(a)) ||
										this.set(A, a).set(O, s).set(_, eW(s)),
									(r = a)),
									this.itemType == I && a == ez && this.set(O, s);
							}
						break;
					case "cpu":
						var o = e[B];
						o &&
							(o && "64" == e[ee] && (o += "64"),
							e0.call(this.data, o + ";", t));
						break;
					case D:
						if (
							(e[U] && this.set(T, U),
							e[H] && (this.set(H, e[H]), !this.get(T) || !this.get(L)))
						) {
							var l,
								c = {};
							e0.call(c, "droid 9; " + e[H] + ")", t),
								!this.get(T) && c.type && this.set(T, c.type),
								!this.get(L) && c.vendor && this.set(L, c.vendor);
						}
						if (e[X]) {
							if ("string" != typeof e[X])
								for (var d = 0; !l && d < e[X].length; ) l = e1(e[X][d++], e4);
							else l = e1(e[X], e4);
							this.set(T, l);
						}
						break;
					case "os":
						var u = e[Z];
						if (u) {
							var f = e[J];
							u == eB && (f = parseInt(eW(f), 10) >= 13 ? "11" : "10"),
								this.set(A, u).set(O, f);
						}
						this.get(A) == eB &&
							"Xbox" == e[H] &&
							this.set(A, "Xbox").set(O, void 0);
						break;
					case F:
						var p = this.data,
							m = function (t) {
								return p[t].getItem().setCH(e).parseCH().get();
							};
						this.set(M, m(M))
							.set("cpu", m("cpu"))
							.set(D, m(D))
							.set(I, m(I))
							.set("os", m("os"));
				}
				return this;
			}),
			(te.VERSION = "2.0.10"),
			(te.BROWSER = eU([A, O, _, T])),
			(te.CPU = eU([B])),
			(te.DEVICE = eU([H, L, T, q, U, K, V, $, G])),
			(te.ENGINE = te.OS = eU([A, O]));
		var tt = e.i(26735),
			tr = e.i(79007),
			tn = e.i(26638),
			ti = e.i(88642),
			ta = e.i(67714),
			ts = e.i(15246),
			to = e.i(97557),
			tl = e.i(5396),
			tc = e.i(42902),
			td = e.i(65221),
			tu = e.i(49674),
			tf = e.i(33833),
			tp = "Checkbox",
			[tm, th] = (0, ts.createContextScope)(tp),
			[tg, tx] = tm(tp);
		function tv(e) {
			const {
					__scopeCheckbox: t,
					checked: r,
					children: n,
					defaultChecked: i,
					disabled: a,
					form: s,
					name: o,
					onCheckedChange: l,
					required: d,
					value: u = "on",
					internal_do_not_use_render: f,
				} = e,
				[p, m] = (0, tl.useControllableState)({
					prop: r,
					defaultProp: i ?? !1,
					onChange: l,
					caller: tp,
				}),
				[h, g] = C.useState(null),
				[x, v] = C.useState(null),
				w = C.useRef(!1),
				b = !h || !!s || !!h.closest("form"),
				y = {
					checked: p,
					disabled: a,
					setChecked: m,
					control: h,
					setControl: g,
					name: o,
					form: s,
					value: u,
					hasConsumerStoppedPropagationRef: w,
					required: d,
					defaultChecked: !tE(i) && i,
					isFormControl: b,
					bubbleInput: x,
					setBubbleInput: v,
				};
			return (0, c.jsx)(tg, {
				scope: t,
				...y,
				children: "function" == typeof f ? f(y) : n,
			});
		}
		var tw = "CheckboxTrigger",
			tb = C.forwardRef(
				({ __scopeCheckbox: e, onKeyDown: t, onClick: r, ...n }, i) => {
					const {
							control: a,
							value: s,
							disabled: o,
							checked: l,
							required: d,
							setControl: u,
							setChecked: f,
							hasConsumerStoppedPropagationRef: p,
							isFormControl: m,
							bubbleInput: h,
						} = tx(tw, e),
						g = (0, ta.useComposedRefs)(i, u),
						x = C.useRef(l);
					return (
						C.useEffect(() => {
							const e = a?.form;
							if (e) {
								const t = () => f(x.current);
								return (
									e.addEventListener("reset", t),
									() => e.removeEventListener("reset", t)
								);
							}
						}, [a, f]),
						(0, c.jsx)(tf.Primitive.button, {
							type: "button",
							role: "checkbox",
							"aria-checked": tE(l) ? "mixed" : l,
							"aria-required": d,
							"data-state": tS(l),
							"data-disabled": o ? "" : void 0,
							disabled: o,
							value: s,
							...n,
							ref: g,
							onKeyDown: (0, to.composeEventHandlers)(t, (e) => {
								"Enter" === e.key && e.preventDefault();
							}),
							onClick: (0, to.composeEventHandlers)(r, (e) => {
								f((e) => !!tE(e) || !e),
									h &&
										m &&
										((p.current = e.isPropagationStopped()),
										p.current || e.stopPropagation());
							}),
						})
					);
				},
			);
		tb.displayName = tw;
		var ty = C.forwardRef((e, t) => {
			const {
				__scopeCheckbox: r,
				name: n,
				checked: i,
				defaultChecked: a,
				required: s,
				disabled: o,
				value: l,
				onCheckedChange: d,
				form: u,
				...f
			} = e;
			return (0, c.jsx)(tv, {
				__scopeCheckbox: r,
				checked: i,
				defaultChecked: a,
				disabled: o,
				required: s,
				onCheckedChange: d,
				name: n,
				form: u,
				value: l,
				internal_do_not_use_render: ({ isFormControl: e }) =>
					(0, c.jsxs)(c.Fragment, {
						children: [
							(0, c.jsx)(tb, { ...f, ref: t, __scopeCheckbox: r }),
							e && (0, c.jsx)(tN, { __scopeCheckbox: r }),
						],
					}),
			});
		});
		ty.displayName = tp;
		var tj = "CheckboxIndicator",
			tk = C.forwardRef((e, t) => {
				const { __scopeCheckbox: r, forceMount: n, ...i } = e,
					a = tx(tj, r);
				return (0, c.jsx)(tu.Presence, {
					present: n || tE(a.checked) || !0 === a.checked,
					children: (0, c.jsx)(tf.Primitive.span, {
						"data-state": tS(a.checked),
						"data-disabled": a.disabled ? "" : void 0,
						...i,
						ref: t,
						style: { pointerEvents: "none", ...e.style },
					}),
				});
			});
		tk.displayName = tj;
		var tC = "CheckboxBubbleInput",
			tN = C.forwardRef(({ __scopeCheckbox: e, ...t }, r) => {
				const {
						control: n,
						hasConsumerStoppedPropagationRef: i,
						checked: a,
						defaultChecked: s,
						required: o,
						disabled: l,
						name: d,
						value: u,
						form: f,
						bubbleInput: p,
						setBubbleInput: m,
					} = tx(tC, e),
					h = (0, ta.useComposedRefs)(r, m),
					g = (0, tc.usePrevious)(a),
					x = (0, td.useSize)(n);
				C.useEffect(() => {
					if (!p) return;
					const e = Object.getOwnPropertyDescriptor(
							window.HTMLInputElement.prototype,
							"checked",
						).set,
						t = !i.current;
					if (g !== a && e) {
						const r = new Event("click", { bubbles: t });
						(p.indeterminate = tE(a)),
							e.call(p, !tE(a) && a),
							p.dispatchEvent(r);
					}
				}, [p, g, a, i]);
				const v = C.useRef(!tE(a) && a);
				return (0, c.jsx)(tf.Primitive.input, {
					type: "checkbox",
					"aria-hidden": !0,
					defaultChecked: s ?? v.current,
					required: o,
					disabled: l,
					name: d,
					value: u,
					form: f,
					...t,
					tabIndex: -1,
					ref: h,
					style: {
						...t.style,
						...x,
						position: "absolute",
						pointerEvents: "none",
						opacity: 0,
						margin: 0,
						transform: "translateX(-100%)",
					},
				});
			});
		function tE(e) {
			return "indeterminate" === e;
		}
		function tS(e) {
			return tE(e) ? "indeterminate" : e ? "checked" : "unchecked";
		}
		tN.displayName = tC;
		var tP = e.i(93207),
			tR = e.i(49696);
		function tz({ className: e, ...t }) {
			return (0, c.jsx)(ty, {
				"data-slot": "checkbox",
				className: (0, tR.cn)(
					"peer border-input data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
					e,
				),
				...t,
				children: (0, c.jsx)(tk, {
					"data-slot": "checkbox-indicator",
					className:
						"flex items-center justify-center text-current transition-none",
					children: (0, c.jsx)(tP.CheckIcon, { className: "size-3.5" }),
				}),
			});
		}
		var tM = e.i(3390),
			tD = e.i(53723),
			tI = e.i(95869),
			tF = e.i(76706);
		async function tA(e) {
			const { data: t, error: r } = await tF.authClient.changePassword(e);
			if (r) throw Error(r.message);
			return t;
		}
		const tT = tn
			.object({
				currentPassword: tn.string().min(1, "Current password is required"),
				newPassword: tn
					.string()
					.min(8, "Password must be at least 8 characters")
					.max(128, "Password must be at most 128 characters"),
				confirmPassword: tn.string().min(1, "Please confirm your password"),
				revokeOtherSessions: tn.boolean(),
			})
			.refine((e) => e.newPassword === e.confirmPassword, {
				message: "Passwords do not match",
				path: ["confirmPassword"],
			});
		function tL({ onSuccess: e, onError: t }) {
			const r = (0, tI.useMutation)({
					mutationFn: tA,
					onSuccess: () => {
						N.toast.success("Password changed successfully");
					},
					onError: (e) => {
						N.toast.error(e.message || "Failed to change your password");
					},
				}),
				{
					control: n,
					handleSubmit: i,
					reset: a,
					formState: { errors: s },
				} = (0, tr.useForm)({
					resolver: (0, tt.zodResolver)(tT),
					defaultValues: {
						currentPassword: "",
						newPassword: "",
						confirmPassword: "",
						revokeOtherSessions: !1,
					},
				});
			return (0, c.jsx)("form", {
				onSubmit: i((n) => {
					r.mutate(
						{
							currentPassword: n.currentPassword,
							newPassword: n.newPassword,
							revokeOtherSessions: n.revokeOtherSessions,
						},
						{
							onSuccess: () => {
								a(), e?.();
							},
							onError: (e) => {
								t?.(e.message);
							},
						},
					);
				}),
				children: (0, c.jsxs)(tM.FieldGroup, {
					children: [
						(0, c.jsx)(tr.Controller, {
							name: "currentPassword",
							control: n,
							render: ({ field: e }) =>
								(0, c.jsxs)(tM.Field, {
									children: [
										(0, c.jsx)(tM.FieldLabel, {
											htmlFor: "current-password",
											children: "Current Password",
										}),
										(0, c.jsx)(tD.PasswordInput, {
											id: "current-password",
											autoComplete: "current-password",
											placeholder: "Current password",
											disabled: r.isPending,
											...e,
										}),
										(0, c.jsx)(tM.FieldError, {
											children: s.currentPassword?.message,
										}),
									],
								}),
						}),
						(0, c.jsx)(tr.Controller, {
							name: "newPassword",
							control: n,
							render: ({ field: e }) =>
								(0, c.jsxs)(tM.Field, {
									children: [
										(0, c.jsx)(tM.FieldLabel, {
											htmlFor: "new-password",
											children: "New Password",
										}),
										(0, c.jsx)(tD.PasswordInput, {
											id: "new-password",
											autoComplete: "new-password",
											placeholder: "New password",
											disabled: r.isPending,
											...e,
										}),
										(0, c.jsx)(tM.FieldError, {
											children: s.newPassword?.message,
										}),
									],
								}),
						}),
						(0, c.jsx)(tr.Controller, {
							name: "confirmPassword",
							control: n,
							render: ({ field: e }) =>
								(0, c.jsxs)(tM.Field, {
									children: [
										(0, c.jsx)(tM.FieldLabel, {
											htmlFor: "confirm-password",
											children: "Confirm Password",
										}),
										(0, c.jsx)(tD.PasswordInput, {
											id: "confirm-password",
											autoComplete: "new-password",
											placeholder: "Confirm password",
											disabled: r.isPending,
											...e,
										}),
										(0, c.jsx)(tM.FieldError, {
											children: s.confirmPassword?.message,
										}),
									],
								}),
						}),
						(0, c.jsx)(tr.Controller, {
							name: "revokeOtherSessions",
							control: n,
							render: ({ field: e }) =>
								(0, c.jsxs)("div", {
									className: "flex gap-2 items-center",
									children: [
										(0, c.jsx)(tz, {
											id: "revoke-sessions",
											checked: e.value,
											onCheckedChange: e.onChange,
											disabled: r.isPending,
										}),
										(0, c.jsx)("label", {
											htmlFor: "revoke-sessions",
											className: "text-sm",
											children: "Sign out from other devices",
										}),
									],
								}),
						}),
						(0, c.jsx)(ti.Button, {
							type: "submit",
							disabled: r.isPending,
							children: r.isPending
								? (0, c.jsx)(h.Loader2, { size: 15, className: "animate-spin" })
								: "Change Password",
						}),
					],
				}),
			});
		}
		const tO = tn.object({
			password: tn.string().min(8, "Password must be at least 8 characters."),
		});
		function tB({ onSuccess: e }) {
			const [t, r] = (0, C.useTransition)(),
				n = (0, tr.useForm)({
					resolver: (0, tt.zodResolver)(tO),
					defaultValues: { password: "" },
				});
			return (0, c.jsxs)("form", {
				onSubmit: n.handleSubmit((t) => {
					r(async () => {
						await tF.authClient.twoFactor.disable({
							password: t.password,
							fetchOptions: {
								onSuccess() {
									N.toast.success("2FA disabled successfully"), e?.();
								},
								onError(e) {
									N.toast.error(e.error.message);
								},
							},
						});
					});
				}),
				className: "flex flex-col gap-4",
				children: [
					(0, c.jsx)(tM.FieldGroup, {
						children: (0, c.jsx)(tr.Controller, {
							name: "password",
							control: n.control,
							render: ({ field: e, fieldState: t }) =>
								(0, c.jsxs)(tM.Field, {
									"data-invalid": t.invalid,
									children: [
										(0, c.jsx)(tM.FieldLabel, {
											htmlFor: "disable-password",
											children: "Password",
										}),
										(0, c.jsx)(tD.PasswordInput, {
											...e,
											id: "disable-password",
											placeholder: "Enter your password",
											"aria-invalid": t.invalid,
											autoComplete: "current-password",
										}),
										t.invalid &&
											(0, c.jsx)(tM.FieldError, { errors: [t.error] }),
									],
								}),
						}),
					}),
					(0, c.jsx)(ti.Button, {
						type: "submit",
						variant: "destructive",
						disabled: t,
						children: t
							? (0, c.jsx)(h.Loader2, { size: 16, className: "animate-spin" })
							: "Disable 2FA",
					}),
				],
			});
		}
		var t_ = e.i(12872);
		const tH = function (e, t) {
			let r = e,
				n = tq[t],
				i = null,
				a = 0,
				s = null,
				o = [],
				l = {},
				c = function (e, t) {
					(i = (function (e) {
						const t = Array(e);
						for (let r = 0; r < e; r += 1) {
							t[r] = Array(e);
							for (let n = 0; n < e; n += 1) t[r][n] = null;
						}
						return t;
					})((a = 4 * r + 17))),
						d(0, 0),
						d(a - 7, 0),
						d(0, a - 7),
						p(),
						f(),
						h(e, t),
						r >= 7 && m(e),
						null == s && (s = v(r, n, o)),
						g(s, t);
				},
				d = function (e, t) {
					for (let r = -1; r <= 7; r += 1)
						if (!(e + r <= -1) && !(a <= e + r))
							for (let n = -1; n <= 7; n += 1)
								t + n <= -1 ||
									a <= t + n ||
									((0 <= r && r <= 6 && (0 == n || 6 == n)) ||
									(0 <= n && n <= 6 && (0 == r || 6 == r)) ||
									(2 <= r && r <= 4 && 2 <= n && n <= 4)
										? (i[e + r][t + n] = !0)
										: (i[e + r][t + n] = !1));
				},
				u = function () {
					let e = 0,
						t = 0;
					for (let r = 0; r < 8; r += 1) {
						c(!0, r);
						const n = tU.getLostPoint(l);
						(0 == r || e > n) && ((e = n), (t = r));
					}
					return t;
				},
				f = function () {
					for (let e = 8; e < a - 8; e += 1)
						null == i[e][6] && (i[e][6] = e % 2 == 0);
					for (let e = 8; e < a - 8; e += 1)
						null == i[6][e] && (i[6][e] = e % 2 == 0);
				},
				p = function () {
					const e = tU.getPatternPosition(r);
					for (let t = 0; t < e.length; t += 1)
						for (let r = 0; r < e.length; r += 1) {
							const n = e[t],
								a = e[r];
							if (null == i[n][a])
								for (let e = -2; e <= 2; e += 1)
									for (let t = -2; t <= 2; t += 1)
										-2 == e || 2 == e || -2 == t || 2 == t || (0 == e && 0 == t)
											? (i[n + e][a + t] = !0)
											: (i[n + e][a + t] = !1);
						}
				},
				m = function (e) {
					const t = tU.getBCHTypeNumber(r);
					for (let r = 0; r < 18; r += 1) {
						const n = !e && ((t >> r) & 1) == 1;
						i[Math.floor(r / 3)][(r % 3) + a - 8 - 3] = n;
					}
					for (let r = 0; r < 18; r += 1) {
						const n = !e && ((t >> r) & 1) == 1;
						i[(r % 3) + a - 8 - 3][Math.floor(r / 3)] = n;
					}
				},
				h = function (e, t) {
					const r = (n << 3) | t,
						s = tU.getBCHTypeInfo(r);
					for (let t = 0; t < 15; t += 1) {
						const r = !e && ((s >> t) & 1) == 1;
						t < 6
							? (i[t][8] = r)
							: t < 8
								? (i[t + 1][8] = r)
								: (i[a - 15 + t][8] = r);
					}
					for (let t = 0; t < 15; t += 1) {
						const r = !e && ((s >> t) & 1) == 1;
						t < 8
							? (i[8][a - t - 1] = r)
							: t < 9
								? (i[8][15 - t - 1 + 1] = r)
								: (i[8][15 - t - 1] = r);
					}
					i[a - 8][8] = !e;
				},
				g = function (e, t) {
					let r = -1,
						n = a - 1,
						s = 7,
						o = 0,
						l = tU.getMaskFunction(t);
					for (let t = a - 1; t > 0; t -= 2)
						for (6 == t && (t -= 1); ; ) {
							for (let r = 0; r < 2; r += 1)
								if (null == i[n][t - r]) {
									let a = !1;
									o < e.length && (a = ((e[o] >>> s) & 1) == 1),
										l(n, t - r) && (a = !a),
										(i[n][t - r] = a),
										-1 == (s -= 1) && ((o += 1), (s = 7));
								}
							if ((n += r) < 0 || a <= n) {
								(n -= r), (r = -r);
								break;
							}
						}
				},
				x = function (e, t) {
					let r = 0,
						n = 0,
						i = 0,
						a = Array(t.length),
						s = Array(t.length);
					for (let o = 0; o < t.length; o += 1) {
						const l = t[o].dataCount,
							c = t[o].totalCount - l;
						(n = Math.max(n, l)), (i = Math.max(i, c)), (a[o] = Array(l));
						for (let t = 0; t < a[o].length; t += 1)
							a[o][t] = 255 & e.getBuffer()[t + r];
						r += l;
						const d = tU.getErrorCorrectPolynomial(c),
							u = tK(a[o], d.getLength() - 1).mod(d);
						s[o] = Array(d.getLength() - 1);
						for (let e = 0; e < s[o].length; e += 1) {
							const t = e + u.getLength() - s[o].length;
							s[o][e] = t >= 0 ? u.getAt(t) : 0;
						}
					}
					let o = 0;
					for (let e = 0; e < t.length; e += 1) o += t[e].totalCount;
					let l = Array(o),
						c = 0;
					for (let e = 0; e < n; e += 1)
						for (let r = 0; r < t.length; r += 1)
							e < a[r].length && ((l[c] = a[r][e]), (c += 1));
					for (let e = 0; e < i; e += 1)
						for (let r = 0; r < t.length; r += 1)
							e < s[r].length && ((l[c] = s[r][e]), (c += 1));
					return l;
				},
				v = function (e, t, r) {
					const n = t$.getRSBlocks(e, t),
						i = tG();
					for (let t = 0; t < r.length; t += 1) {
						const n = r[t];
						i.put(n.getMode(), 4),
							i.put(n.getLength(), tU.getLengthInBits(n.getMode(), e)),
							n.write(i);
					}
					let a = 0;
					for (let e = 0; e < n.length; e += 1) a += n[e].dataCount;
					if (i.getLengthInBits() > 8 * a)
						throw (
							"code length overflow. (" +
							i.getLengthInBits() +
							">" +
							8 * a +
							")"
						);
					for (
						i.getLengthInBits() + 4 <= 8 * a && i.put(0, 4);
						i.getLengthInBits() % 8 != 0;
					)
						i.putBit(!1);
					for (
						;
						!(i.getLengthInBits() >= 8 * a) &&
						(i.put(236, 8), !(i.getLengthInBits() >= 8 * a));
					) {
						i.put(17, 8);
					}
					return x(i, n);
				};
			(l.addData = function (e, t) {
				let r = null;
				switch ((t = t || "Byte")) {
					case "Numeric":
						r = tQ(e);
						break;
					case "Alphanumeric":
						r = tW(e);
						break;
					case "Byte":
						r = tX(e);
						break;
					case "Kanji":
						r = tY(e);
						break;
					default:
						throw "mode:" + t;
				}
				o.push(r), (s = null);
			}),
				(l.isDark = function (e, t) {
					if (e < 0 || a <= e || t < 0 || a <= t) throw e + "," + t;
					return i[e][t];
				}),
				(l.getModuleCount = function () {
					return a;
				}),
				(l.make = function () {
					if (r < 1) {
						let e = 1;
						for (; e < 40; e++) {
							const t = t$.getRSBlocks(e, n),
								r = tG();
							for (let t = 0; t < o.length; t++) {
								const n = o[t];
								r.put(n.getMode(), 4),
									r.put(n.getLength(), tU.getLengthInBits(n.getMode(), e)),
									n.write(r);
							}
							let i = 0;
							for (let e = 0; e < t.length; e++) i += t[e].dataCount;
							if (r.getLengthInBits() <= 8 * i) break;
						}
						r = e;
					}
					c(!1, u());
				}),
				(l.createTableTag = function (e, t) {
					e = e || 2;
					let r = "";
					r +=
						'<table style=" border-width: 0px; border-style: none; border-collapse: collapse; padding: 0px; margin: ' +
						(t = void 0 === t ? 4 * e : t) +
						'px;"><tbody>';
					for (let t = 0; t < l.getModuleCount(); t += 1) {
						r += "<tr>";
						for (let n = 0; n < l.getModuleCount(); n += 1)
							r +=
								'<td style=" border-width: 0px; border-style: none; border-collapse: collapse; padding: 0px; margin: 0px; width: ' +
								e +
								"px;" +
								(" height: " + e) +
								"px; background-color: " +
								(l.isDark(t, n) ? "#000000" : "#ffffff") +
								';"/>';
						r += "</tr>";
					}
					return r + "</tbody></table>";
				}),
				(l.createSvgTag = function (e, t, r, n) {
					let i = {};
					"object" == typeof arguments[0] &&
						((i = arguments[0]),
						(e = i.cellSize),
						(t = i.margin),
						(r = i.alt),
						(n = i.title)),
						(e = e || 2),
						(t = void 0 === t ? 4 * e : t),
						((r = "string" == typeof r ? { text: r } : r || {}).text =
							r.text || null),
						(r.id = r.text ? r.id || "qrcode-description" : null),
						((n = "string" == typeof n ? { text: n } : n || {}).text =
							n.text || null),
						(n.id = n.text ? n.id || "qrcode-title" : null);
					let a = l.getModuleCount() * e + 2 * t,
						s,
						o,
						c,
						d = "",
						u;
					for (
						u = "l" + e + ",0 0," + e + " -" + e + ",0 0,-" + e + "z ",
							d += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"',
							d += i.scalable
								? ""
								: ' width="' + a + 'px" height="' + a + 'px"',
							d += ' viewBox="0 0 ' + a + " " + a + '" ',
							d += ' preserveAspectRatio="xMinYMin meet"',
							d +=
								n.text || r.text
									? ' role="img" aria-labelledby="' +
										w([n.id, r.id].join(" ").trim()) +
										'"'
									: "",
							d += ">",
							d += n.text
								? '<title id="' + w(n.id) + '">' + w(n.text) + "</title>"
								: "",
							d += r.text
								? '<description id="' +
									w(r.id) +
									'">' +
									w(r.text) +
									"</description>"
								: "",
							d +=
								'<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>',
							d += '<path d="',
							o = 0;
						o < l.getModuleCount();
						o += 1
					)
						for (s = 0, c = o * e + t; s < l.getModuleCount(); s += 1)
							l.isDark(o, s) && (d += "M" + (s * e + t) + "," + c + u);
					return (
						(d += '" stroke="transparent" fill="black"/>'), (d += "</svg>")
					);
				}),
				(l.createDataURL = function (e, t) {
					(e = e || 2), (t = void 0 === t ? 4 * e : t);
					const r = l.getModuleCount() * e + 2 * t,
						n = t,
						i = r - t;
					return t2(r, r, function (t, r) {
						if (!(n <= t) || !(t < i) || !(n <= r) || !(r < i)) return 1;
						{
							const i = Math.floor((t - n) / e),
								a = Math.floor((r - n) / e);
							return +!l.isDark(a, i);
						}
					});
				}),
				(l.createImgTag = function (e, t, r) {
					(e = e || 2), (t = void 0 === t ? 4 * e : t);
					let n = l.getModuleCount() * e + 2 * t,
						i = "";
					return (
						(i += "<img"),
						(i += ' src="'),
						(i += l.createDataURL(e, t)),
						(i += '"'),
						(i += ' width="'),
						(i += n),
						(i += '"'),
						(i += ' height="'),
						(i += n),
						(i += '"'),
						r && ((i += ' alt="'), (i += w(r)), (i += '"')),
						(i += "/>")
					);
				});
			const w = function (e) {
					let t = "";
					for (let r = 0; r < e.length; r += 1) {
						const n = e.charAt(r);
						switch (n) {
							case "<":
								t += "&lt;";
								break;
							case ">":
								t += "&gt;";
								break;
							case "&":
								t += "&amp;";
								break;
							case '"':
								t += "&quot;";
								break;
							default:
								t += n;
						}
					}
					return t;
				},
				b = function (e) {
					let t, r, n, i, a;
					e = void 0 === e ? 2 : e;
					let s = +l.getModuleCount() + 2 * e,
						o = e,
						c = s - e,
						d = { "██": "█", "█ ": "▀", " █": "▄", "  ": " " },
						u = { "██": "▀", "█ ": "▀", " █": " ", "  ": " " },
						f = "";
					for (t = 0; t < s; t += 2) {
						for (
							r = 0,
								n = Math.floor((t - o) / 1),
								i = Math.floor((t + 1 - o) / 1);
							r < s;
							r += 1
						)
							(a = "█"),
								o <= r &&
									r < c &&
									o <= t &&
									t < c &&
									l.isDark(n, Math.floor((r - o) / 1)) &&
									(a = " "),
								o <= r &&
								r < c &&
								o <= t + 1 &&
								t + 1 < c &&
								l.isDark(i, Math.floor((r - o) / 1))
									? (a += " ")
									: (a += "█"),
								(f += e < 1 && t + 1 >= c ? u[a] : d[a]);
						f += "\n";
					}
					return s % 2 && e > 0
						? f.substring(0, f.length - s - 1) + Array(s + 1).join("▀")
						: f.substring(0, f.length - 1);
				};
			return (
				(l.createASCII = function (e, t) {
					let r, n, i, a;
					if ((e = e || 1) < 2) return b(t);
					(e -= 1), (t = void 0 === t ? 2 * e : t);
					let s = l.getModuleCount() * e + 2 * t,
						o = t,
						c = s - t,
						d = Array(e + 1).join("██"),
						u = Array(e + 1).join("  "),
						f = "",
						p = "";
					for (r = 0; r < s; r += 1) {
						for (n = 0, i = Math.floor((r - o) / e), p = ""; n < s; n += 1)
							(a = 1),
								o <= n &&
									n < c &&
									o <= r &&
									r < c &&
									l.isDark(i, Math.floor((n - o) / e)) &&
									(a = 0),
								(p += a ? d : u);
						for (i = 0; i < e; i += 1) f += p + "\n";
					}
					return f.substring(0, f.length - 1);
				}),
				(l.renderTo2dContext = function (e, t) {
					t = t || 2;
					const r = l.getModuleCount();
					for (let n = 0; n < r; n++)
						for (let i = 0; i < r; i++)
							(e.fillStyle = l.isDark(n, i) ? "black" : "white"),
								e.fillRect(i * t, n * t, t, t);
				}),
				l
			);
		};
		(tH.stringToBytes = function (e) {
			const t = [];
			for (let r = 0; r < e.length; r += 1) {
				const n = e.charCodeAt(r);
				t.push(255 & n);
			}
			return t;
		}),
			(tH.createStringToBytes = function (e, t) {
				const r = (function () {
					let r = t0(e),
						n = function () {
							const e = r.read();
							if (-1 == e) throw "eof";
							return e;
						},
						i = 0,
						a = {};
					for (;;) {
						const e = r.read();
						if (-1 == e) break;
						const t = n(),
							s = n(),
							o = n(),
							l = String.fromCharCode((e << 8) | t),
							c = (s << 8) | o;
						(a[l] = c), (i += 1);
					}
					if (i != t) throw i + " != " + t;
					return a;
				})();
				return function (e) {
					const t = [];
					for (let n = 0; n < e.length; n += 1) {
						const i = e.charCodeAt(n);
						if (i < 128) t.push(i);
						else {
							const i = r[e.charAt(n)];
							"number" == typeof i
								? (255 & i) == i
									? t.push(i)
									: (t.push(i >>> 8), t.push(255 & i))
								: t.push(63);
						}
					}
					return t;
				};
			});
		const tq = { L: 1, M: 0, Q: 3, H: 2 },
			tU =
				((t = [
					[],
					[6, 18],
					[6, 22],
					[6, 26],
					[6, 30],
					[6, 34],
					[6, 22, 38],
					[6, 24, 42],
					[6, 26, 46],
					[6, 28, 50],
					[6, 30, 54],
					[6, 32, 58],
					[6, 34, 62],
					[6, 26, 46, 66],
					[6, 26, 48, 70],
					[6, 26, 50, 74],
					[6, 30, 54, 78],
					[6, 30, 56, 82],
					[6, 30, 58, 86],
					[6, 34, 62, 90],
					[6, 28, 50, 72, 94],
					[6, 26, 50, 74, 98],
					[6, 30, 54, 78, 102],
					[6, 28, 54, 80, 106],
					[6, 32, 58, 84, 110],
					[6, 30, 58, 86, 114],
					[6, 34, 62, 90, 118],
					[6, 26, 50, 74, 98, 122],
					[6, 30, 54, 78, 102, 126],
					[6, 26, 52, 78, 104, 130],
					[6, 30, 56, 82, 108, 134],
					[6, 34, 60, 86, 112, 138],
					[6, 30, 58, 86, 114, 142],
					[6, 34, 62, 90, 118, 146],
					[6, 30, 54, 78, 102, 126, 150],
					[6, 24, 50, 76, 102, 128, 154],
					[6, 28, 54, 80, 106, 132, 158],
					[6, 32, 58, 84, 110, 136, 162],
					[6, 26, 54, 82, 110, 138, 166],
					[6, 30, 58, 86, 114, 142, 170],
				]),
				(r = {}),
				(n = function (e) {
					let t = 0;
					for (; 0 != e; ) (t += 1), (e >>>= 1);
					return t;
				}),
				(r.getBCHTypeInfo = function (e) {
					let t = e << 10;
					for (; n(t) - n(1335) >= 0; ) t ^= 1335 << (n(t) - n(1335));
					return ((e << 10) | t) ^ 21522;
				}),
				(r.getBCHTypeNumber = function (e) {
					let t = e << 12;
					for (; n(t) - n(7973) >= 0; ) t ^= 7973 << (n(t) - n(7973));
					return (e << 12) | t;
				}),
				(r.getPatternPosition = function (e) {
					return t[e - 1];
				}),
				(r.getMaskFunction = function (e) {
					switch (e) {
						case 0:
							return function (e, t) {
								return (e + t) % 2 == 0;
							};
						case 1:
							return function (e, t) {
								return e % 2 == 0;
							};
						case 2:
							return function (e, t) {
								return t % 3 == 0;
							};
						case 3:
							return function (e, t) {
								return (e + t) % 3 == 0;
							};
						case 4:
							return function (e, t) {
								return (Math.floor(e / 2) + Math.floor(t / 3)) % 2 == 0;
							};
						case 5:
							return function (e, t) {
								return ((e * t) % 2) + ((e * t) % 3) == 0;
							};
						case 6:
							return function (e, t) {
								return (((e * t) % 2) + ((e * t) % 3)) % 2 == 0;
							};
						case 7:
							return function (e, t) {
								return (((e * t) % 3) + ((e + t) % 2)) % 2 == 0;
							};
						default:
							throw "bad maskPattern:" + e;
					}
				}),
				(r.getErrorCorrectPolynomial = function (e) {
					let t = tK([1], 0);
					for (let r = 0; r < e; r += 1) t = t.multiply(tK([1, tV.gexp(r)], 0));
					return t;
				}),
				(r.getLengthInBits = function (e, t) {
					if (1 <= t && t < 10)
						switch (e) {
							case 1:
								return 10;
							case 2:
								return 9;
							case 4:
							case 8:
								return 8;
							default:
								throw "mode:" + e;
						}
					if (t < 27)
						switch (e) {
							case 1:
								return 12;
							case 2:
								return 11;
							case 4:
								return 16;
							case 8:
								return 10;
							default:
								throw "mode:" + e;
						}
					if (t < 41)
						switch (e) {
							case 1:
								return 14;
							case 2:
								return 13;
							case 4:
								return 16;
							case 8:
								return 12;
							default:
								throw "mode:" + e;
						}
					throw "type:" + t;
				}),
				(r.getLostPoint = function (e) {
					let t = e.getModuleCount(),
						r = 0;
					for (let n = 0; n < t; n += 1)
						for (let i = 0; i < t; i += 1) {
							let a = 0,
								s = e.isDark(n, i);
							for (let r = -1; r <= 1; r += 1)
								if (!(n + r < 0) && !(t <= n + r))
									for (let o = -1; o <= 1; o += 1)
										i + o < 0 ||
											t <= i + o ||
											((0 != r || 0 != o) &&
												s == e.isDark(n + r, i + o) &&
												(a += 1));
							a > 5 && (r += 3 + a - 5);
						}
					for (let n = 0; n < t - 1; n += 1)
						for (let i = 0; i < t - 1; i += 1) {
							let t = 0;
							e.isDark(n, i) && (t += 1),
								e.isDark(n + 1, i) && (t += 1),
								e.isDark(n, i + 1) && (t += 1),
								e.isDark(n + 1, i + 1) && (t += 1),
								(0 == t || 4 == t) && (r += 3);
						}
					for (let n = 0; n < t; n += 1)
						for (let i = 0; i < t - 6; i += 1)
							e.isDark(n, i) &&
								!e.isDark(n, i + 1) &&
								e.isDark(n, i + 2) &&
								e.isDark(n, i + 3) &&
								e.isDark(n, i + 4) &&
								!e.isDark(n, i + 5) &&
								e.isDark(n, i + 6) &&
								(r += 40);
					for (let n = 0; n < t; n += 1)
						for (let i = 0; i < t - 6; i += 1)
							e.isDark(i, n) &&
								!e.isDark(i + 1, n) &&
								e.isDark(i + 2, n) &&
								e.isDark(i + 3, n) &&
								e.isDark(i + 4, n) &&
								!e.isDark(i + 5, n) &&
								e.isDark(i + 6, n) &&
								(r += 40);
					let n = 0;
					for (let r = 0; r < t; r += 1)
						for (let i = 0; i < t; i += 1) e.isDark(i, r) && (n += 1);
					return r + 10 * (Math.abs((100 * n) / t / t - 50) / 5);
				}),
				r),
			tV = (function () {
				const e = Array(256),
					t = Array(256);
				for (let t = 0; t < 8; t += 1) e[t] = 1 << t;
				for (let t = 8; t < 256; t += 1)
					e[t] = e[t - 4] ^ e[t - 5] ^ e[t - 6] ^ e[t - 8];
				for (let r = 0; r < 255; r += 1) t[e[r]] = r;
				const r = {};
				return (
					(r.glog = function (e) {
						if (e < 1) throw "glog(" + e + ")";
						return t[e];
					}),
					(r.gexp = function (t) {
						for (; t < 0; ) t += 255;
						for (; t >= 256; ) t -= 255;
						return e[t];
					}),
					r
				);
			})(),
			tK = function (e, t) {
				if (void 0 === e.length) throw e.length + "/" + t;
				const r = (function () {
						let r = 0;
						for (; r < e.length && 0 == e[r]; ) r += 1;
						const n = Array(e.length - r + t);
						for (let t = 0; t < e.length - r; t += 1) n[t] = e[t + r];
						return n;
					})(),
					n = {};
				return (
					(n.getAt = function (e) {
						return r[e];
					}),
					(n.getLength = function () {
						return r.length;
					}),
					(n.multiply = function (e) {
						const t = Array(n.getLength() + e.getLength() - 1);
						for (let r = 0; r < n.getLength(); r += 1)
							for (let i = 0; i < e.getLength(); i += 1)
								t[r + i] ^= tV.gexp(tV.glog(n.getAt(r)) + tV.glog(e.getAt(i)));
						return tK(t, 0);
					}),
					(n.mod = function (e) {
						if (n.getLength() - e.getLength() < 0) return n;
						const t = tV.glog(n.getAt(0)) - tV.glog(e.getAt(0)),
							r = Array(n.getLength());
						for (let e = 0; e < n.getLength(); e += 1) r[e] = n.getAt(e);
						for (let n = 0; n < e.getLength(); n += 1)
							r[n] ^= tV.gexp(tV.glog(e.getAt(n)) + t);
						return tK(r, 0).mod(e);
					}),
					n
				);
			},
			t$ =
				((i = [
					[1, 26, 19],
					[1, 26, 16],
					[1, 26, 13],
					[1, 26, 9],
					[1, 44, 34],
					[1, 44, 28],
					[1, 44, 22],
					[1, 44, 16],
					[1, 70, 55],
					[1, 70, 44],
					[2, 35, 17],
					[2, 35, 13],
					[1, 100, 80],
					[2, 50, 32],
					[2, 50, 24],
					[4, 25, 9],
					[1, 134, 108],
					[2, 67, 43],
					[2, 33, 15, 2, 34, 16],
					[2, 33, 11, 2, 34, 12],
					[2, 86, 68],
					[4, 43, 27],
					[4, 43, 19],
					[4, 43, 15],
					[2, 98, 78],
					[4, 49, 31],
					[2, 32, 14, 4, 33, 15],
					[4, 39, 13, 1, 40, 14],
					[2, 121, 97],
					[2, 60, 38, 2, 61, 39],
					[4, 40, 18, 2, 41, 19],
					[4, 40, 14, 2, 41, 15],
					[2, 146, 116],
					[3, 58, 36, 2, 59, 37],
					[4, 36, 16, 4, 37, 17],
					[4, 36, 12, 4, 37, 13],
					[2, 86, 68, 2, 87, 69],
					[4, 69, 43, 1, 70, 44],
					[6, 43, 19, 2, 44, 20],
					[6, 43, 15, 2, 44, 16],
					[4, 101, 81],
					[1, 80, 50, 4, 81, 51],
					[4, 50, 22, 4, 51, 23],
					[3, 36, 12, 8, 37, 13],
					[2, 116, 92, 2, 117, 93],
					[6, 58, 36, 2, 59, 37],
					[4, 46, 20, 6, 47, 21],
					[7, 42, 14, 4, 43, 15],
					[4, 133, 107],
					[8, 59, 37, 1, 60, 38],
					[8, 44, 20, 4, 45, 21],
					[12, 33, 11, 4, 34, 12],
					[3, 145, 115, 1, 146, 116],
					[4, 64, 40, 5, 65, 41],
					[11, 36, 16, 5, 37, 17],
					[11, 36, 12, 5, 37, 13],
					[5, 109, 87, 1, 110, 88],
					[5, 65, 41, 5, 66, 42],
					[5, 54, 24, 7, 55, 25],
					[11, 36, 12, 7, 37, 13],
					[5, 122, 98, 1, 123, 99],
					[7, 73, 45, 3, 74, 46],
					[15, 43, 19, 2, 44, 20],
					[3, 45, 15, 13, 46, 16],
					[1, 135, 107, 5, 136, 108],
					[10, 74, 46, 1, 75, 47],
					[1, 50, 22, 15, 51, 23],
					[2, 42, 14, 17, 43, 15],
					[5, 150, 120, 1, 151, 121],
					[9, 69, 43, 4, 70, 44],
					[17, 50, 22, 1, 51, 23],
					[2, 42, 14, 19, 43, 15],
					[3, 141, 113, 4, 142, 114],
					[3, 70, 44, 11, 71, 45],
					[17, 47, 21, 4, 48, 22],
					[9, 39, 13, 16, 40, 14],
					[3, 135, 107, 5, 136, 108],
					[3, 67, 41, 13, 68, 42],
					[15, 54, 24, 5, 55, 25],
					[15, 43, 15, 10, 44, 16],
					[4, 144, 116, 4, 145, 117],
					[17, 68, 42],
					[17, 50, 22, 6, 51, 23],
					[19, 46, 16, 6, 47, 17],
					[2, 139, 111, 7, 140, 112],
					[17, 74, 46],
					[7, 54, 24, 16, 55, 25],
					[34, 37, 13],
					[4, 151, 121, 5, 152, 122],
					[4, 75, 47, 14, 76, 48],
					[11, 54, 24, 14, 55, 25],
					[16, 45, 15, 14, 46, 16],
					[6, 147, 117, 4, 148, 118],
					[6, 73, 45, 14, 74, 46],
					[11, 54, 24, 16, 55, 25],
					[30, 46, 16, 2, 47, 17],
					[8, 132, 106, 4, 133, 107],
					[8, 75, 47, 13, 76, 48],
					[7, 54, 24, 22, 55, 25],
					[22, 45, 15, 13, 46, 16],
					[10, 142, 114, 2, 143, 115],
					[19, 74, 46, 4, 75, 47],
					[28, 50, 22, 6, 51, 23],
					[33, 46, 16, 4, 47, 17],
					[8, 152, 122, 4, 153, 123],
					[22, 73, 45, 3, 74, 46],
					[8, 53, 23, 26, 54, 24],
					[12, 45, 15, 28, 46, 16],
					[3, 147, 117, 10, 148, 118],
					[3, 73, 45, 23, 74, 46],
					[4, 54, 24, 31, 55, 25],
					[11, 45, 15, 31, 46, 16],
					[7, 146, 116, 7, 147, 117],
					[21, 73, 45, 7, 74, 46],
					[1, 53, 23, 37, 54, 24],
					[19, 45, 15, 26, 46, 16],
					[5, 145, 115, 10, 146, 116],
					[19, 75, 47, 10, 76, 48],
					[15, 54, 24, 25, 55, 25],
					[23, 45, 15, 25, 46, 16],
					[13, 145, 115, 3, 146, 116],
					[2, 74, 46, 29, 75, 47],
					[42, 54, 24, 1, 55, 25],
					[23, 45, 15, 28, 46, 16],
					[17, 145, 115],
					[10, 74, 46, 23, 75, 47],
					[10, 54, 24, 35, 55, 25],
					[19, 45, 15, 35, 46, 16],
					[17, 145, 115, 1, 146, 116],
					[14, 74, 46, 21, 75, 47],
					[29, 54, 24, 19, 55, 25],
					[11, 45, 15, 46, 46, 16],
					[13, 145, 115, 6, 146, 116],
					[14, 74, 46, 23, 75, 47],
					[44, 54, 24, 7, 55, 25],
					[59, 46, 16, 1, 47, 17],
					[12, 151, 121, 7, 152, 122],
					[12, 75, 47, 26, 76, 48],
					[39, 54, 24, 14, 55, 25],
					[22, 45, 15, 41, 46, 16],
					[6, 151, 121, 14, 152, 122],
					[6, 75, 47, 34, 76, 48],
					[46, 54, 24, 10, 55, 25],
					[2, 45, 15, 64, 46, 16],
					[17, 152, 122, 4, 153, 123],
					[29, 74, 46, 14, 75, 47],
					[49, 54, 24, 10, 55, 25],
					[24, 45, 15, 46, 46, 16],
					[4, 152, 122, 18, 153, 123],
					[13, 74, 46, 32, 75, 47],
					[48, 54, 24, 14, 55, 25],
					[42, 45, 15, 32, 46, 16],
					[20, 147, 117, 4, 148, 118],
					[40, 75, 47, 7, 76, 48],
					[43, 54, 24, 22, 55, 25],
					[10, 45, 15, 67, 46, 16],
					[19, 148, 118, 6, 149, 119],
					[18, 75, 47, 31, 76, 48],
					[34, 54, 24, 34, 55, 25],
					[20, 45, 15, 61, 46, 16],
				]),
				(a = function (e, t) {
					const r = {};
					return (r.totalCount = e), (r.dataCount = t), r;
				}),
				(s = {}),
				(o = function (e, t) {
					switch (t) {
						case tq.L:
							return i[(e - 1) * 4 + 0];
						case tq.M:
							return i[(e - 1) * 4 + 1];
						case tq.Q:
							return i[(e - 1) * 4 + 2];
						case tq.H:
							return i[(e - 1) * 4 + 3];
						default:
							return;
					}
				}),
				(s.getRSBlocks = function (e, t) {
					const r = o(e, t);
					if (void 0 === r)
						throw (
							"bad rs block @ typeNumber:" + e + "/errorCorrectionLevel:" + t
						);
					const n = r.length / 3,
						i = [];
					for (let e = 0; e < n; e += 1) {
						const t = r[3 * e + 0],
							n = r[3 * e + 1],
							s = r[3 * e + 2];
						for (let e = 0; e < t; e += 1) i.push(a(n, s));
					}
					return i;
				}),
				s),
			tG = function () {
				let e = [],
					t = 0,
					r = {};
				return (
					(r.getBuffer = function () {
						return e;
					}),
					(r.getAt = function (t) {
						return ((e[Math.floor(t / 8)] >>> (7 - (t % 8))) & 1) == 1;
					}),
					(r.put = function (e, t) {
						for (let n = 0; n < t; n += 1)
							r.putBit(((e >>> (t - n - 1)) & 1) == 1);
					}),
					(r.getLengthInBits = function () {
						return t;
					}),
					(r.putBit = function (r) {
						const n = Math.floor(t / 8);
						e.length <= n && e.push(0),
							r && (e[n] |= 128 >>> (t % 8)),
							(t += 1);
					}),
					r
				);
			},
			tQ = function (e) {
				const t = {};
				(t.getMode = function () {
					return 1;
				}),
					(t.getLength = function (t) {
						return e.length;
					}),
					(t.write = function (t) {
						let n = 0;
						for (; n + 2 < e.length; )
							t.put(r(e.substring(n, n + 3)), 10), (n += 3);
						n < e.length &&
							(e.length - n == 1
								? t.put(r(e.substring(n, n + 1)), 4)
								: e.length - n == 2 && t.put(r(e.substring(n, n + 2)), 7));
					});
				const r = function (e) {
						let t = 0;
						for (let r = 0; r < e.length; r += 1) t = 10 * t + n(e.charAt(r));
						return t;
					},
					n = function (e) {
						if ("0" <= e && e <= "9") return e.charCodeAt(0) - 48;
						throw "illegal char :" + e;
					};
				return t;
			},
			tW = function (e) {
				const t = {};
				(t.getMode = function () {
					return 2;
				}),
					(t.getLength = function (t) {
						return e.length;
					}),
					(t.write = function (t) {
						let n = 0;
						for (; n + 1 < e.length; )
							t.put(45 * r(e.charAt(n)) + r(e.charAt(n + 1)), 11), (n += 2);
						n < e.length && t.put(r(e.charAt(n)), 6);
					});
				const r = function (e) {
					if ("0" <= e && e <= "9") return e.charCodeAt(0) - 48;
					if ("A" <= e && e <= "Z") return e.charCodeAt(0) - 65 + 10;
					switch (e) {
						case " ":
							return 36;
						case "$":
							return 37;
						case "%":
							return 38;
						case "*":
							return 39;
						case "+":
							return 40;
						case "-":
							return 41;
						case ".":
							return 42;
						case "/":
							return 43;
						case ":":
							return 44;
						default:
							throw "illegal char :" + e;
					}
				};
				return t;
			},
			tX = function (e) {
				const t = tH.stringToBytes(e),
					r = {};
				return (
					(r.getMode = function () {
						return 4;
					}),
					(r.getLength = function (e) {
						return t.length;
					}),
					(r.write = function (e) {
						for (let r = 0; r < t.length; r += 1) e.put(t[r], 8);
					}),
					r
				);
			},
			tY = function (e) {
				const t = tH.stringToBytes,
					r = t("友");
				if (2 != r.length || ((r[0] << 8) | r[1]) != 38726)
					throw "sjis not supported.";
				const n = t(e),
					i = {};
				return (
					(i.getMode = function () {
						return 8;
					}),
					(i.getLength = function (e) {
						return ~~(n.length / 2);
					}),
					(i.write = function (e) {
						let t = 0;
						for (; t + 1 < n.length; ) {
							let r = ((255 & n[t]) << 8) | (255 & n[t + 1]);
							if (33088 <= r && r <= 40956) r -= 33088;
							else if (57408 <= r && r <= 60351) r -= 49472;
							else throw "illegal char at " + (t + 1) + "/" + r;
							(r = ((r >>> 8) & 255) * 192 + (255 & r)), e.put(r, 13), (t += 2);
						}
						if (t < n.length) throw "illegal char at " + (t + 1);
					}),
					i
				);
			},
			tZ = function () {
				const e = [],
					t = {};
				return (
					(t.writeByte = function (t) {
						e.push(255 & t);
					}),
					(t.writeShort = function (e) {
						t.writeByte(e), t.writeByte(e >>> 8);
					}),
					(t.writeBytes = function (e, r, n) {
						(r = r || 0), (n = n || e.length);
						for (let i = 0; i < n; i += 1) t.writeByte(e[i + r]);
					}),
					(t.writeString = function (e) {
						for (let r = 0; r < e.length; r += 1) t.writeByte(e.charCodeAt(r));
					}),
					(t.toByteArray = function () {
						return e;
					}),
					(t.toString = function () {
						let t = "";
						t += "[";
						for (let r = 0; r < e.length; r += 1)
							r > 0 && (t += ","), (t += e[r]);
						return t + "]";
					}),
					t
				);
			},
			tJ = function () {
				let e = 0,
					t = 0,
					r = 0,
					n = "",
					i = {},
					a = function (e) {
						n += String.fromCharCode(s(63 & e));
					},
					s = function (e) {
						if (e < 0) throw "n:" + e;
						if (e < 26) return 65 + e;
						if (e < 52) return 97 + (e - 26);
						if (e < 62) return 48 + (e - 52);
						if (62 == e) return 43;
						else if (63 == e) return 47;
						else throw "n:" + e;
					};
				return (
					(i.writeByte = function (n) {
						for (e = (e << 8) | (255 & n), t += 8, r += 1; t >= 6; )
							a(e >>> (t - 6)), (t -= 6);
					}),
					(i.flush = function () {
						if ((t > 0 && (a(e << (6 - t)), (e = 0), (t = 0)), r % 3 != 0)) {
							const e = 3 - (r % 3);
							for (let t = 0; t < e; t += 1) n += "=";
						}
					}),
					(i.toString = function () {
						return n;
					}),
					i
				);
			},
			t0 = function (e) {
				let t = 0,
					r = 0,
					n = 0,
					i = {};
				i.read = function () {
					for (; n < 8; ) {
						if (t >= e.length) {
							if (0 == n) return -1;
							throw "unexpected end of file./" + n;
						}
						const i = e.charAt(t);
						if (((t += 1), "=" == i)) return (n = 0), -1;
						i.match(/^\s$/) || ((r = (r << 6) | a(i.charCodeAt(0))), (n += 6));
					}
					const i = (r >>> (n - 8)) & 255;
					return (n -= 8), i;
				};
				const a = function (e) {
					if (65 <= e && e <= 90) return e - 65;
					if (97 <= e && e <= 122) return e - 97 + 26;
					if (48 <= e && e <= 57) return e - 48 + 52;
					if (43 == e) return 62;
					if (47 == e) return 63;
					else throw "c:" + e;
				};
				return i;
			},
			t1 = function (e, t) {
				const r = Array(e * t),
					n = {};
				(n.setPixel = function (t, n, i) {
					r[n * e + t] = i;
				}),
					(n.write = function (r) {
						r.writeString("GIF87a"),
							r.writeShort(e),
							r.writeShort(t),
							r.writeByte(128),
							r.writeByte(0),
							r.writeByte(0),
							r.writeByte(0),
							r.writeByte(0),
							r.writeByte(0),
							r.writeByte(255),
							r.writeByte(255),
							r.writeByte(255),
							r.writeString(","),
							r.writeShort(0),
							r.writeShort(0),
							r.writeShort(e),
							r.writeShort(t),
							r.writeByte(0);
						const n = a(2);
						r.writeByte(2);
						let i = 0;
						for (; n.length - i > 255; )
							r.writeByte(255), r.writeBytes(n, i, 255), (i += 255);
						r.writeByte(n.length - i),
							r.writeBytes(n, i, n.length - i),
							r.writeByte(0),
							r.writeString(";");
					});
				const i = function (e) {
						let t = 0,
							r = 0,
							n = {};
						return (
							(n.write = function (n, i) {
								if (n >>> i != 0) throw "length over";
								for (; t + i >= 8; )
									e.writeByte(255 & ((n << t) | r)),
										(i -= 8 - t),
										(n >>>= 8 - t),
										(r = 0),
										(t = 0);
								(r = (n << t) | r), (t += i);
							}),
							(n.flush = function () {
								t > 0 && e.writeByte(r);
							}),
							n
						);
					},
					a = function (e) {
						let t = 1 << e,
							n = (1 << e) + 1,
							a = e + 1,
							o = s();
						for (let e = 0; e < t; e += 1) o.add(String.fromCharCode(e));
						o.add(String.fromCharCode(t)), o.add(String.fromCharCode(n));
						const l = tZ(),
							c = i(l);
						c.write(t, a);
						let d = 0,
							u = String.fromCharCode(r[0]);
						for (d += 1; d < r.length; ) {
							const e = String.fromCharCode(r[d]);
							(d += 1),
								o.contains(u + e)
									? (u += e)
									: (c.write(o.indexOf(u), a),
										4095 > o.size() &&
											(o.size() == 1 << a && (a += 1), o.add(u + e)),
										(u = e));
						}
						return (
							c.write(o.indexOf(u), a),
							c.write(n, a),
							c.flush(),
							l.toByteArray()
						);
					},
					s = function () {
						let e = {},
							t = 0,
							r = {};
						return (
							(r.add = function (n) {
								if (r.contains(n)) throw "dup key:" + n;
								(e[n] = t), (t += 1);
							}),
							(r.size = function () {
								return t;
							}),
							(r.indexOf = function (t) {
								return e[t];
							}),
							(r.contains = function (t) {
								return void 0 !== e[t];
							}),
							r
						);
					};
				return n;
			},
			t2 = function (e, t, r) {
				const n = t1(e, t);
				for (let i = 0; i < t; i += 1)
					for (let t = 0; t < e; t += 1) n.setPixel(t, i, r(t, i));
				const i = tZ();
				n.write(i);
				const a = tJ(),
					s = i.toByteArray();
				for (let e = 0; e < s.length; e += 1) a.writeByte(s[e]);
				return a.flush(), "data:image/gif;base64," + a;
			};
		function t4() {
			return (t4 = Object.assign.bind()).apply(null, arguments);
		}
		function t6(e, t) {
			if (null == e) return {};
			var r,
				n,
				i = (function (e, t) {
					if (null == e) return {};
					var r = {};
					for (var n in e)
						if ({}.hasOwnProperty.call(e, n)) {
							if (-1 !== t.indexOf(n)) continue;
							r[n] = e[n];
						}
					return r;
				})(e, t);
			if (Object.getOwnPropertySymbols) {
				var a = Object.getOwnPropertySymbols(e);
				for (n = 0; n < a.length; n++)
					(r = a[n]),
						-1 === t.indexOf(r) &&
							{}.propertyIsEnumerable.call(e, r) &&
							(i[r] = e[r]);
			}
			return i;
		}
		tH.stringToBytes;
		var t5 = [
				"bgColor",
				"bgD",
				"fgD",
				"fgColor",
				"size",
				"title",
				"viewBoxSize",
				"xmlns",
			],
			t3 = {
				bgColor: t_.default.oneOfType([t_.default.object, t_.default.string])
					.isRequired,
				bgD: t_.default.string.isRequired,
				fgColor: t_.default.oneOfType([t_.default.object, t_.default.string])
					.isRequired,
				fgD: t_.default.string.isRequired,
				size: t_.default.number.isRequired,
				title: t_.default.string,
				viewBoxSize: t_.default.number.isRequired,
				xmlns: t_.default.string,
			},
			t8 = (0, C.forwardRef)(function (e, t) {
				var r = e.bgColor,
					n = e.bgD,
					i = e.fgD,
					a = e.fgColor,
					s = e.size,
					o = e.title,
					l = e.viewBoxSize,
					c = e.xmlns,
					d = t6(e, t5);
				return C.default.createElement(
					"svg",
					t4({}, d, {
						height: s,
						ref: t,
						viewBox: "0 0 ".concat(l, " ").concat(l),
						width: s,
						xmlns: void 0 === c ? "http://www.w3.org/2000/svg" : c,
					}),
					o ? C.default.createElement("title", null, o) : null,
					C.default.createElement("path", { d: n, fill: r }),
					C.default.createElement("path", { d: i, fill: a }),
				);
			});
		(t8.displayName = "QRCodeSvg"), (t8.propTypes = t3);
		var t7 = ["bgColor", "fgColor", "level", "size", "value"];
		tH.stringToBytes = function (e) {
			return Array.from(new TextEncoder().encode(e));
		};
		var t9 = {
				bgColor: t_.default.oneOfType([t_.default.object, t_.default.string]),
				fgColor: t_.default.oneOfType([t_.default.object, t_.default.string]),
				level: t_.default.string,
				size: t_.default.number,
				value: t_.default.string.isRequired,
			},
			re = (0, C.forwardRef)(function (e, t) {
				var r = e.bgColor,
					n = e.fgColor,
					i = e.level,
					a = e.size,
					s = e.value,
					o = t6(e, t7),
					l = tH(0, void 0 === i ? "L" : i);
				l.addData(s), l.make();
				var c = l.getModuleCount(),
					d = Array.from({ length: c }, function (e, t) {
						return Array.from({ length: c }, function (e, r) {
							return l.isDark(t, r);
						});
					});
				return C.default.createElement(
					t8,
					t4({}, o, {
						bgColor: void 0 === r ? "#FFFFFF" : r,
						bgD: d
							.map(function (e, t) {
								return e
									.map(function (e, r) {
										return e
											? ""
											: "M ".concat(r, " ").concat(t, " l 1 0 0 1 -1 0 Z");
									})
									.join(" ");
							})
							.join(" "),
						fgColor: void 0 === n ? "#000000" : n,
						fgD: d
							.map(function (e, t) {
								return e
									.map(function (e, r) {
										return e
											? "M ".concat(r, " ").concat(t, " l 1 0 0 1 -1 0 Z")
											: "";
									})
									.join(" ");
							})
							.join(" "),
						ref: t,
						size: void 0 === a ? 256 : a,
						viewBoxSize: c,
					}),
				);
			});
		(re.displayName = "QRCode"), (re.propTypes = t9);
		var rt = e.i(85926),
			rr = e.i(1359);
		const rn = tn.object({
				password: tn.string().min(8, "Password must be at least 8 characters."),
			}),
			ri = tn.object({
				otp: tn.string().min(6, "OTP must be at least 6 characters."),
			});
		function ra({ onSuccess: e }) {
			const [t, r] = (0, C.useTransition)(),
				[n, i] = (0, C.useState)(""),
				a = (0, tr.useForm)({
					resolver: (0, tt.zodResolver)(rn),
					defaultValues: { password: "" },
				}),
				s = (0, tr.useForm)({
					resolver: (0, tt.zodResolver)(ri),
					defaultValues: { otp: "" },
				});
			return n
				? (0, c.jsxs)("div", {
						className: "flex flex-col gap-4",
						children: [
							(0, c.jsx)("div", {
								className: "flex items-center justify-center",
								children: (0, c.jsx)(re, { value: n }),
							}),
							(0, c.jsxs)("div", {
								className: "flex gap-2 items-center justify-center",
								children: [
									(0, c.jsx)("p", {
										className: "text-sm text-muted-foreground",
										children: "Copy URI to clipboard",
									}),
									(0, c.jsx)(rt.default, { textToCopy: n }),
								],
							}),
							(0, c.jsxs)("form", {
								onSubmit: s.handleSubmit((t) => {
									r(async () => {
										await tF.authClient.twoFactor.verifyTotp({
											code: t.otp,
											fetchOptions: {
												onSuccess() {
													N.toast.success("2FA enabled successfully"), e?.();
												},
												onError(e) {
													N.toast.error(e.error.message), s.reset();
												},
											},
										});
									});
								}),
								className: "flex flex-col gap-4",
								children: [
									(0, c.jsx)(tM.FieldGroup, {
										children: (0, c.jsx)(tr.Controller, {
											name: "otp",
											control: s.control,
											render: ({ field: e, fieldState: t }) =>
												(0, c.jsxs)(tM.Field, {
													"data-invalid": t.invalid,
													children: [
														(0, c.jsx)(tM.FieldLabel, {
															htmlFor: "enable-otp",
															children:
																"Scan the QR code with your TOTP app and enter the code",
														}),
														(0, c.jsx)(rr.Input, {
															...e,
															id: "enable-otp",
															placeholder: "Enter OTP code",
															"aria-invalid": t.invalid,
															autoComplete: "one-time-code",
														}),
														t.invalid &&
															(0, c.jsx)(tM.FieldError, { errors: [t.error] }),
													],
												}),
										}),
									}),
									(0, c.jsx)(ti.Button, {
										type: "submit",
										disabled: t,
										children: t
											? (0, c.jsx)(h.Loader2, {
													size: 16,
													className: "animate-spin",
												})
											: "Verify & Enable",
									}),
								],
							}),
						],
					})
				: (0, c.jsxs)("form", {
						onSubmit: a.handleSubmit((e) => {
							r(async () => {
								await tF.authClient.twoFactor.enable({
									password: e.password,
									fetchOptions: {
										onSuccess(e) {
											i(e.data.totpURI);
										},
										onError(e) {
											N.toast.error(e.error.message);
										},
									},
								});
							});
						}),
						className: "flex flex-col gap-4",
						children: [
							(0, c.jsx)(tM.FieldGroup, {
								children: (0, c.jsx)(tr.Controller, {
									name: "password",
									control: a.control,
									render: ({ field: e, fieldState: t }) =>
										(0, c.jsxs)(tM.Field, {
											"data-invalid": t.invalid,
											children: [
												(0, c.jsx)(tM.FieldLabel, {
													htmlFor: "enable-password",
													children: "Password",
												}),
												(0, c.jsx)(tD.PasswordInput, {
													...e,
													id: "enable-password",
													placeholder: "Enter your password",
													"aria-invalid": t.invalid,
													autoComplete: "current-password",
												}),
												t.invalid &&
													(0, c.jsx)(tM.FieldError, { errors: [t.error] }),
											],
										}),
								}),
							}),
							(0, c.jsx)(ti.Button, {
								type: "submit",
								disabled: t,
								children: t
									? (0, c.jsx)(h.Loader2, {
											size: 16,
											className: "animate-spin",
										})
									: "Continue",
							}),
						],
					});
		}
		const rs = tn.object({
			password: tn.string().min(8, "Password must be at least 8 characters."),
		});
		function ro({ onSuccess: e }) {
			const [t, r] = (0, C.useTransition)(),
				[n, i] = (0, C.useState)(""),
				a = (0, tr.useForm)({
					resolver: (0, tt.zodResolver)(rs),
					defaultValues: { password: "" },
				});
			return n
				? (0, c.jsxs)("div", {
						className: "flex flex-col gap-4",
						children: [
							(0, c.jsx)("div", {
								className: "flex items-center justify-center",
								children: (0, c.jsx)(re, { value: n }),
							}),
							(0, c.jsxs)("div", {
								className: "flex gap-2 items-center justify-center",
								children: [
									(0, c.jsx)("p", {
										className: "text-sm text-muted-foreground",
										children: "Copy URI to clipboard",
									}),
									(0, c.jsx)(rt.default, { textToCopy: n }),
								],
							}),
						],
					})
				: (0, c.jsxs)("form", {
						onSubmit: a.handleSubmit((t) => {
							r(async () => {
								await tF.authClient.twoFactor.getTotpUri(
									{ password: t.password },
									{
										onSuccess(t) {
											i(t.data.totpURI), e?.(t.data.totpURI);
										},
										onError(e) {
											N.toast.error(e.error.message);
										},
									},
								);
							});
						}),
						className: "flex flex-col gap-4",
						children: [
							(0, c.jsx)(tM.FieldGroup, {
								children: (0, c.jsx)(tr.Controller, {
									name: "password",
									control: a.control,
									render: ({ field: e, fieldState: t }) =>
										(0, c.jsxs)(tM.Field, {
											"data-invalid": t.invalid,
											children: [
												(0, c.jsx)(tM.FieldLabel, {
													htmlFor: "qr-password",
													children: "Password",
												}),
												(0, c.jsx)(tD.PasswordInput, {
													...e,
													id: "qr-password",
													placeholder: "Enter your password",
													"aria-invalid": t.invalid,
													autoComplete: "current-password",
												}),
												t.invalid &&
													(0, c.jsx)(tM.FieldError, { errors: [t.error] }),
											],
										}),
								}),
							}),
							(0, c.jsx)(ti.Button, {
								type: "submit",
								disabled: t,
								children: t
									? (0, c.jsx)(h.Loader2, {
											size: 16,
											className: "animate-spin",
										})
									: "Show QR Code",
							}),
						],
					});
		}
		var rl = e.i(25653),
			rc = e.i(2398),
			rd = e.i(82537),
			ru = e.i(40609);
		async function rf(e) {
			const { data: t, error: r } = await tF.authClient.updateUser(e);
			if (r) throw Error(r.message);
			return t;
		}
		var rp = e.i(38870);
		const rm = tn.object({
			name: tn
				.string()
				.min(2, "Name must be at least 2 characters")
				.max(50, "Name must be at most 50 characters")
				.optional()
				.or(tn.literal("")),
		});
		function rh({ currentName: e, onSuccess: t, onError: r }) {
			let n,
				i =
					((n = (0, rd.useQueryClient)()),
					(0, tI.useMutation)({
						mutationFn: rf,
						onSuccess: async () => {
							await n.invalidateQueries({ queryKey: ru.userKeys.session() }),
								N.toast.success("User updated successfully!");
						},
						onError: (e) => {
							N.toast.error(e.message || "Failed to update user");
						},
					})),
				{
					image: a,
					imagePreview: s,
					handleImageChange: o,
					clearImage: l,
				} = (0, rp.useImagePreview)(),
				{
					control: d,
					handleSubmit: u,
					reset: f,
					watch: p,
					formState: { errors: m },
				} = (0, tr.useForm)({
					resolver: (0, tt.zodResolver)(rm),
					defaultValues: { name: "" },
				}),
				g = async (e) => {
					try {
						const n = a ? await (0, tR.convertImageToBase64)(a) : void 0;
						i.mutate(
							{ image: n, name: e.name || void 0 },
							{
								onSuccess: () => {
									f(), l(), t?.();
								},
								onError: (e) => {
									r?.(e.message);
								},
							},
						);
					} catch (e) {
						r?.(e instanceof Error ? e.message : "Failed to process image");
					}
				},
				x = p("name");
			return (0, c.jsx)("form", {
				onSubmit: u(g),
				children: (0, c.jsxs)(tM.FieldGroup, {
					children: [
						(0, c.jsx)(tr.Controller, {
							name: "name",
							control: d,
							render: ({ field: t }) =>
								(0, c.jsxs)(tM.Field, {
									children: [
										(0, c.jsx)(tM.FieldLabel, {
											htmlFor: "name",
											children: "Full Name",
										}),
										(0, c.jsx)(rr.Input, {
											id: "name",
											type: "text",
											placeholder: e,
											disabled: i.isPending,
											...t,
										}),
										(0, c.jsx)(tM.FieldError, { children: m.name?.message }),
									],
								}),
						}),
						(0, c.jsxs)(tM.Field, {
							children: [
								(0, c.jsx)(tM.FieldLabel, {
									htmlFor: "image",
									children: "Profile Image",
								}),
								(0, c.jsxs)("div", {
									className: "flex items-end gap-4",
									children: [
										s &&
											(0, c.jsx)("div", {
												className:
													"relative w-16 h-16 rounded-sm overflow-hidden",
												children: (0, c.jsx)(rc.default, {
													src: s,
													alt: "Profile preview",
													fill: !0,
													className: "object-cover",
												}),
											}),
										(0, c.jsxs)("div", {
											className: "flex items-center gap-2 w-full",
											children: [
												(0, c.jsx)(rr.Input, {
													id: "image",
													type: "file",
													accept: "image/*",
													onChange: o,
													disabled: i.isPending,
													className: "w-full text-muted-foreground",
												}),
												s &&
													(0, c.jsx)(rl.X, {
														className: "cursor-pointer",
														onClick: l,
														"aria-label": "Clear image",
													}),
											],
										}),
									],
								}),
							],
						}),
						(0, c.jsx)(ti.Button, {
							type: "submit",
							disabled: i.isPending || (!a && !x),
							children: i.isPending
								? (0, c.jsx)(h.Loader2, { size: 15, className: "animate-spin" })
								: "Update",
						}),
					],
				}),
			});
		}
		var rg = e.i(77542),
			rx = e.i(11185),
			rv = e.i(49139),
			rw = e.i(16066),
			rb = e.i(42603),
			ry = e.i(43058);
		async function rj(e) {
			const { data: t, error: r } = await tF.authClient.revokeSession(e);
			if (r) throw Error(r.message);
			return t;
		}
		var rk = e.i(46483),
			rC = e.i(84086);
		function rN() {
			const [e, t] = (0, C.useState)(!1);
			return (0, c.jsxs)(rw.Dialog, {
				open: e,
				onOpenChange: t,
				children: [
					(0, c.jsx)(rw.DialogTrigger, {
						asChild: !0,
						children: (0, c.jsxs)(ti.Button, {
							className: "gap-2 z-10",
							variant: "outline",
							size: "sm",
							children: [
								(0, c.jsx)("svg", {
									xmlns: "http://www.w3.org/2000/svg",
									width: "1em",
									height: "1em",
									viewBox: "0 0 24 24",
									children: (0, c.jsx)("path", {
										fill: "currentColor",
										d: "M2.5 18.5v-1h19v1zm.535-5.973l-.762-.442l.965-1.693h-1.93v-.884h1.93l-.965-1.642l.762-.443L4 9.066l.966-1.643l.761.443l-.965 1.642h1.93v.884h-1.93l.965 1.693l-.762.442L4 10.835zm8 0l-.762-.442l.966-1.693H9.308v-.884h1.93l-.965-1.642l.762-.443L12 9.066l.966-1.643l.761.443l-.965 1.642h1.93v.884h-1.93l.965 1.693l-.762.442L12 10.835zm8 0l-.762-.442l.966-1.693h-1.931v-.884h1.93l-.965-1.642l.762-.443L20 9.066l.966-1.643l.761.443l-.965 1.642h1.93v.884h-1.93l.965 1.693l-.762.442L20 10.835z",
									}),
								}),
								(0, c.jsx)("span", {
									className: "text-sm text-muted-foreground",
									children: "Change Password",
								}),
							],
						}),
					}),
					(0, c.jsxs)(rw.DialogContent, {
						className: "sm:max-w-[425px] w-11/12",
						children: [
							(0, c.jsxs)(rw.DialogHeader, {
								children: [
									(0, c.jsx)(rw.DialogTitle, { children: "Change Password" }),
									(0, c.jsx)(rw.DialogDescription, {
										children: "Change your password",
									}),
								],
							}),
							(0, c.jsx)(tL, { onSuccess: () => t(!1) }),
						],
					}),
				],
			});
		}
		function rE() {
			const { data: e } = (0, rk.useSessionQuery)(),
				[t, r] = (0, C.useState)(!1);
			return (0, c.jsxs)(rw.Dialog, {
				open: t,
				onOpenChange: r,
				children: [
					(0, c.jsx)(rw.DialogTrigger, {
						asChild: !0,
						children: (0, c.jsxs)(ti.Button, {
							size: "sm",
							className: "gap-2",
							variant: "default",
							children: [(0, c.jsx)(f, { size: 13 }), "Edit User"],
						}),
					}),
					(0, c.jsxs)(rw.DialogContent, {
						className: "sm:max-w-[425px] w-11/12",
						children: [
							(0, c.jsxs)(rw.DialogHeader, {
								children: [
									(0, c.jsx)(rw.DialogTitle, { children: "Edit User" }),
									(0, c.jsx)(rw.DialogDescription, {
										children: "Edit user information",
									}),
								],
							}),
							(0, c.jsx)(rh, {
								currentName: e?.user.name,
								onSuccess: () => r(!1),
							}),
						],
					}),
				],
			});
		}
		function rS() {
			const [e, t] = (0, C.useState)(!1),
				[r, n] = (0, C.useState)(""),
				[i, a] = (0, C.useState)(!1),
				s = async () => {
					if (!r) return void N.toast.error("Passkey name is required");
					a(!0);
					const e = await tF.authClient.passkey.addPasskey({ name: r });
					e?.error
						? N.toast.error(e?.error.message)
						: (t(!1),
							N.toast.success(
								"Passkey added successfully. You can now use it to login.",
							)),
						a(!1);
				};
			return (0, c.jsxs)(rw.Dialog, {
				open: e,
				onOpenChange: t,
				children: [
					(0, c.jsx)(rw.DialogTrigger, {
						asChild: !0,
						children: (0, c.jsxs)(ti.Button, {
							variant: "outline",
							className: "gap-2 text-xs md:text-sm",
							children: [(0, c.jsx)(x.Plus, { size: 15 }), "Add New Passkey"],
						}),
					}),
					(0, c.jsxs)(rw.DialogContent, {
						className: "sm:max-w-[425px] w-11/12",
						children: [
							(0, c.jsxs)(rw.DialogHeader, {
								children: [
									(0, c.jsx)(rw.DialogTitle, { children: "Add New Passkey" }),
									(0, c.jsx)(rw.DialogDescription, {
										children:
											"Create a new passkey to securely access your account without a password.",
									}),
								],
							}),
							(0, c.jsxs)("div", {
								className: "grid gap-2",
								children: [
									(0, c.jsx)(rb.Label, {
										htmlFor: "passkey-name",
										children: "Passkey Name",
									}),
									(0, c.jsx)(rr.Input, {
										id: "passkey-name",
										value: r,
										onChange: (e) => n(e.target.value),
									}),
								],
							}),
							(0, c.jsx)(rw.DialogFooter, {
								children: (0, c.jsx)(ti.Button, {
									disabled: i,
									type: "submit",
									onClick: s,
									className: "w-full",
									children: i
										? (0, c.jsx)(h.Loader2, {
												size: 15,
												className: "animate-spin",
											})
										: (0, c.jsxs)(c.Fragment, {
												children: [
													(0, c.jsx)(p, { className: "mr-2 h-4 w-4" }),
													"Create Passkey",
												],
											}),
								}),
							}),
						],
					}),
				],
			});
		}
		function rP() {
			const { data: e } = tF.authClient.useListPasskeys(),
				[t, r] = (0, C.useState)(!1),
				[n, i] = (0, C.useState)(""),
				a = async () => {
					if (!n) return void N.toast.error("Passkey name is required");
					o(!0);
					const e = await tF.authClient.passkey.addPasskey({ name: n });
					o(!1),
						e?.error
							? N.toast.error(e?.error.message)
							: N.toast.success(
									"Passkey added successfully. You can now use it to login.",
								);
				},
				[s, o] = (0, C.useState)(!1),
				[l, d] = (0, C.useState)(!1);
			return (0, c.jsxs)(rw.Dialog, {
				open: t,
				onOpenChange: r,
				children: [
					(0, c.jsx)(rw.DialogTrigger, {
						asChild: !0,
						children: (0, c.jsxs)(ti.Button, {
							variant: "outline",
							className: "text-xs md:text-sm",
							children: [
								(0, c.jsx)(p, { className: "mr-2 h-4 w-4" }),
								(0, c.jsxs)("span", {
									children: ["Passkeys ", e?.length ? `[${e?.length}]` : ""],
								}),
							],
						}),
					}),
					(0, c.jsxs)(rw.DialogContent, {
						className: "sm:max-w-[425px] w-11/12",
						children: [
							(0, c.jsxs)(rw.DialogHeader, {
								children: [
									(0, c.jsx)(rw.DialogTitle, { children: "Passkeys" }),
									(0, c.jsx)(rw.DialogDescription, {
										children: "List of passkeys",
									}),
								],
							}),
							e?.length
								? (0, c.jsxs)(ry.Table, {
										children: [
											(0, c.jsx)(ry.TableHeader, {
												children: (0, c.jsx)(ry.TableRow, {
													children: (0, c.jsx)(ry.TableHead, {
														children: "Name",
													}),
												}),
											}),
											(0, c.jsx)(ry.TableBody, {
												children: e.map((e) =>
													(0, c.jsxs)(
														ry.TableRow,
														{
															className: "flex  justify-between items-center",
															children: [
																(0, c.jsx)(ry.TableCell, {
																	children: e.name || "My Passkey",
																}),
																(0, c.jsx)(ry.TableCell, {
																	className: "text-right",
																	children: (0, c.jsx)("button", {
																		onClick: async () => {
																			await tF.authClient.passkey.deletePasskey(
																				{
																					id: e.id,
																					fetchOptions: {
																						onRequest: () => {
																							d(!0);
																						},
																						onSuccess: () => {
																							(0, N.toast)(
																								"Passkey deleted successfully",
																							),
																								d(!1);
																						},
																						onError: (e) => {
																							N.toast.error(e.error.message),
																								d(!1);
																						},
																					},
																				},
																			);
																		},
																		children: l
																			? (0, c.jsx)(h.Loader2, {
																					size: 15,
																					className: "animate-spin",
																				})
																			: (0, c.jsx)(j.Trash, {
																					size: 15,
																					className:
																						"cursor-pointer text-red-600",
																				}),
																	}),
																}),
															],
														},
														e.id,
													),
												),
											}),
										],
									})
								: (0, c.jsx)("p", {
										className: "text-sm text-muted-foreground",
										children: "No passkeys found",
									}),
							!e?.length &&
								(0, c.jsxs)("div", {
									className: "flex flex-col gap-2",
									children: [
										(0, c.jsxs)("div", {
											className: "flex flex-col gap-2",
											children: [
												(0, c.jsx)(rb.Label, {
													htmlFor: "passkey-name",
													className: "text-sm",
													children: "New Passkey",
												}),
												(0, c.jsx)(rr.Input, {
													id: "passkey-name",
													value: n,
													onChange: (e) => i(e.target.value),
													placeholder: "My Passkey",
												}),
											],
										}),
										(0, c.jsx)(ti.Button, {
											type: "submit",
											onClick: a,
											className: "w-full",
											children: s
												? (0, c.jsx)(h.Loader2, {
														size: 15,
														className: "animate-spin",
													})
												: (0, c.jsxs)(c.Fragment, {
														children: [
															(0, c.jsx)(p, { className: "mr-2 h-4 w-4" }),
															"Create Passkey",
														],
													}),
										}),
									],
								}),
							(0, c.jsx)(rw.DialogFooter, {
								children: (0, c.jsx)(ti.Button, {
									onClick: () => r(!1),
									children: "Close",
								}),
							}),
						],
					}),
				],
			});
		}
		e.s(
			[
				"default",
				0,
				(e) => {
					let t,
						r = (0, k.useRouter)(),
						n = (0, rC.useSignOutMutation)(),
						i =
							((t = (0, rd.useQueryClient)()),
							(0, tI.useMutation)({
								mutationFn: rj,
								onSuccess: () => {
									t.invalidateQueries({ queryKey: ru.userKeys.session() }),
										N.toast.success("Session terminated successfully");
								},
								onError: (e) => {
									N.toast.error(e.message || "Failed to terminate session");
								},
							})),
						{ data: a } = (0, rk.useSessionQuery)(),
						s = a || e.session,
						[o, l] = (0, C.useState)(!1),
						[u, f] = (0, C.useState)(!1),
						[p, x] = (0, C.useState)(!1),
						[j, E] = (0, C.useState)(e.activeSessions);
					return (0, c.jsxs)(rv.Card, {
						children: [
							(0, c.jsx)(rv.CardHeader, {
								children: (0, c.jsx)(rv.CardTitle, { children: "User" }),
							}),
							(0, c.jsxs)(rv.CardContent, {
								className: "grid gap-8 grid-cols-1",
								children: [
									(0, c.jsx)("div", {
										className: "flex flex-col gap-2",
										children: (0, c.jsxs)("div", {
											className: "flex items-start justify-between",
											children: [
												(0, c.jsxs)("div", {
													className: "flex items-center gap-4",
													children: [
														(0, c.jsxs)(rx.Avatar, {
															className: "hidden h-9 w-9 sm:flex ",
															children: [
																(0, c.jsx)(rx.AvatarImage, {
																	src: s?.user.image || void 0,
																	alt: "Avatar",
																	className: "object-cover",
																}),
																(0, c.jsx)(rx.AvatarFallback, {
																	children: s?.user.name.charAt(0),
																}),
															],
														}),
														(0, c.jsxs)("div", {
															className: "grid",
															children: [
																(0, c.jsx)("div", {
																	className: "flex items-center gap-1",
																	children: (0, c.jsx)("p", {
																		className:
																			"text-sm font-medium leading-none",
																		children: s?.user.name,
																	}),
																}),
																(0, c.jsx)("p", {
																	className: "text-sm",
																	children: s?.user.email,
																}),
															],
														}),
													],
												}),
												(0, c.jsx)(rE, {}),
											],
										}),
									}),
									" ",
									s?.user.emailVerified
										? null
										: (0, c.jsxs)(rg.Alert, {
												children: [
													(0, c.jsx)(rg.AlertTitle, {
														children: "Verify Your Email Address",
													}),
													(0, c.jsxs)(rg.AlertDescription, {
														className: "text-muted-foreground",
														children: [
															"Please verify your email address. Check your inbox for the verification email. If you haven't received the email, click the button below to resend.",
															(0, c.jsx)(ti.Button, {
																size: "sm",
																variant: "secondary",
																className: "mt-2",
																onClick: async () => {
																	await tF.authClient.sendVerificationEmail(
																		{ email: s?.user.email || "" },
																		{
																			onRequest(e) {
																				x(!0);
																			},
																			onError(e) {
																				N.toast.error(e.error.message), x(!1);
																			},
																			onSuccess() {
																				N.toast.success(
																					"Verification email sent successfully",
																				),
																					x(!1);
																			},
																		},
																	);
																},
																children: p
																	? (0, c.jsx)(h.Loader2, {
																			size: 15,
																			className: "animate-spin",
																		})
																	: "Resend Verification Email",
															}),
														],
													}),
												],
											}),
									(0, c.jsxs)("div", {
										className: "border-l-2 px-2 w-max gap-1 flex flex-col",
										children: [
											(0, c.jsx)("p", {
												className: "text-xs font-medium ",
												children: "Active Sessions",
											}),
											j
												.filter((e) => e.userAgent)
												.map((t) => {
													const n = t.id === e.session?.session.id,
														a = i.isPending && i.variables?.token === t.token;
													return (0, c.jsx)(
														"div",
														{
															children: (0, c.jsxs)("div", {
																className:
																	"flex items-center gap-2 text-sm  text-black font-medium dark:text-white",
																children: [
																	"mobile" ===
																	new te(t.userAgent || "").getDevice().type
																		? (0, c.jsx)(d.MobileIcon, {})
																		: (0, c.jsx)(m, { size: 16 }),
																	new te(t.userAgent || "").getOS().name ||
																		t.userAgent,
																	", ",
																	new te(t.userAgent || "").getBrowser().name,
																	(0, c.jsx)("button", {
																		className:
																			"text-red-500 opacity-80 cursor-pointer text-xs underline",
																		onClick: () => {
																			i.mutate(
																				{ token: t.token },
																				{
																					onSuccess: () => {
																						let e;
																						(e = t.id),
																							E(j.filter((t) => t.id !== e)),
																							n && r.push("/");
																					},
																				},
																			);
																		},
																		children: a
																			? (0, c.jsx)(h.Loader2, {
																					size: 15,
																					className: "animate-spin",
																				})
																			: n
																				? "Sign Out"
																				: "Terminate",
																	}),
																],
															}),
														},
														t.id,
													);
												}),
										],
									}),
									(0, c.jsxs)("div", {
										className:
											"border-y py-4 flex items-center flex-wrap justify-between gap-2",
										children: [
											(0, c.jsxs)("div", {
												className: "flex flex-col gap-2",
												children: [
													(0, c.jsx)("p", {
														className: "text-sm",
														children: "Passkeys",
													}),
													(0, c.jsxs)("div", {
														className: "flex gap-2 flex-wrap",
														children: [(0, c.jsx)(rS, {}), (0, c.jsx)(rP, {})],
													}),
												],
											}),
											(0, c.jsxs)("div", {
												className: "flex flex-col gap-2",
												children: [
													(0, c.jsx)("p", {
														className: "text-sm",
														children: "Two Factor",
													}),
													(0, c.jsxs)("div", {
														className: "flex gap-2",
														children: [
															!!s?.user.twoFactorEnabled &&
																(0, c.jsxs)(rw.Dialog, {
																	children: [
																		(0, c.jsx)(rw.DialogTrigger, {
																			asChild: !0,
																			children: (0, c.jsxs)(ti.Button, {
																				variant: "outline",
																				className: "gap-2",
																				children: [
																					(0, c.jsx)(v, { size: 16 }),
																					(0, c.jsx)("span", {
																						className: "md:text-sm text-xs",
																						children: "Scan QR Code",
																					}),
																				],
																			}),
																		}),
																		(0, c.jsxs)(rw.DialogContent, {
																			className: "sm:max-w-[425px] w-11/12",
																			children: [
																				(0, c.jsxs)(rw.DialogHeader, {
																					children: [
																						(0, c.jsx)(rw.DialogTitle, {
																							children: "Scan QR Code",
																						}),
																						(0, c.jsx)(rw.DialogDescription, {
																							children:
																								"Scan the QR code with your TOTP app",
																						}),
																					],
																				}),
																				(0, c.jsx)(ro, {}),
																			],
																		}),
																	],
																}),
															(0, c.jsxs)(rw.Dialog, {
																open: o,
																onOpenChange: l,
																children: [
																	(0, c.jsx)(rw.DialogTrigger, {
																		asChild: !0,
																		children: (0, c.jsxs)(ti.Button, {
																			variant: s?.user.twoFactorEnabled
																				? "destructive"
																				: "outline",
																			className: "gap-2",
																			children: [
																				s?.user.twoFactorEnabled
																					? (0, c.jsx)(b, { size: 16 })
																					: (0, c.jsx)(w, { size: 16 }),
																				(0, c.jsx)("span", {
																					className: "md:text-sm text-xs",
																					children: s?.user.twoFactorEnabled
																						? "Disable 2FA"
																						: "Enable 2FA",
																				}),
																			],
																		}),
																	}),
																	(0, c.jsxs)(rw.DialogContent, {
																		className: "sm:max-w-[425px] w-11/12",
																		children: [
																			(0, c.jsxs)(rw.DialogHeader, {
																				children: [
																					(0, c.jsx)(rw.DialogTitle, {
																						children: s?.user.twoFactorEnabled
																							? "Disable 2FA"
																							: "Enable 2FA",
																					}),
																					(0, c.jsx)(rw.DialogDescription, {
																						children: s?.user.twoFactorEnabled
																							? "Disable the second factor authentication from your account"
																							: "Enable 2FA to secure your account",
																					}),
																				],
																			}),
																			s?.user.twoFactorEnabled
																				? (0, c.jsx)(tB, {
																						onSuccess: () => l(!1),
																					})
																				: (0, c.jsx)(ra, {
																						onSuccess: () => l(!1),
																					}),
																		],
																	}),
																],
															}),
														],
													}),
												],
											}),
										],
									}),
								],
							}),
							(0, c.jsxs)(rv.CardFooter, {
								className: "gap-2 justify-between items-center",
								children: [
									(0, c.jsx)(rN, {}),
									s?.session.impersonatedBy
										? (0, c.jsx)(ti.Button, {
												className: "gap-2 z-10",
												variant: "secondary",
												onClick: async () => {
													f(!0),
														await tF.authClient.admin.stopImpersonating(),
														f(!1),
														N.toast.info("Impersonation stopped successfully"),
														r.push("/admin");
												},
												disabled: u,
												children: (0, c.jsx)("span", {
													className: "text-sm",
													children: u
														? (0, c.jsx)(h.Loader2, {
																size: 15,
																className: "animate-spin",
															})
														: (0, c.jsxs)("div", {
																className: "flex items-center gap-2",
																children: [
																	(0, c.jsx)(y, { size: 16, color: "red" }),
																	"Stop Impersonation",
																],
															}),
												}),
											})
										: (0, c.jsx)(ti.Button, {
												className: "gap-2 z-10",
												variant: "outline",
												onClick: () => {
													n.mutate(void 0, {
														onSuccess: () => {
															r.push("/");
														},
													});
												},
												disabled: n.isPending,
												children: (0, c.jsx)("span", {
													className: "text-sm",
													children: n.isPending
														? (0, c.jsx)(h.Loader2, {
																size: 15,
																className: "animate-spin",
															})
														: (0, c.jsxs)("div", {
																className: "flex items-center gap-2",
																children: [
																	(0, c.jsx)(g, { size: 16 }),
																	"Sign Out",
																],
															}),
												}),
											}),
								],
							}),
						],
					});
				},
			],
			99998,
		);
	},
]);
