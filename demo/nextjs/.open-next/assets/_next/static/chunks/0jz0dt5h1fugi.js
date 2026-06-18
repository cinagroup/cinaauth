(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
	"object" == typeof document ? document.currentScript : void 0,
	42603,
	(e) => {
		"use strict";
		var t = e.i(62613),
			i = e.i(57319),
			n = e.i(33833),
			a = i.forwardRef((e, i) =>
				(0, t.jsx)(n.Primitive.label, {
					...e,
					ref: i,
					onMouseDown: (t) => {
						t.target.closest("button, input, select, textarea") ||
							(e.onMouseDown?.(t),
							!t.defaultPrevented && t.detail > 1 && t.preventDefault());
					},
				}),
			);
		a.displayName = "Label";
		var r = e.i(49696);
		e.s(
			[
				"Label",
				0,
				function ({ className: e, ...i }) {
					return (0, t.jsx)(a, {
						"data-slot": "label",
						className: (0, r.cn)(
							"flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
							e,
						),
						...i,
					});
				},
			],
			42603,
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
				const i = t.useRef({ value: e, previous: e });
				return t.useMemo(
					() => (
						i.current.value !== e &&
							((i.current.previous = i.current.value), (i.current.value = e)),
						i.current.previous
					),
					[e],
				);
			},
		]);
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
					function (e, t, { checkForDefaultPrevented: i = !0 } = {}) {
						return function (n) {
							if ((e?.(n), !1 === i || !n.defaultPrevented)) return t?.(n);
						};
					},
				],
				97557,
			);
		var t = e.i(57319),
			i = e.i(13575);
		t[" useEffectEvent ".trim().toString()],
			t[" useInsertionEffect ".trim().toString()];
		var n = t[" useInsertionEffect ".trim().toString()] || i.useLayoutEffect;
		Symbol("RADIX:SYNC_STATE"),
			e.s(
				[
					"useControllableState",
					0,
					function ({
						prop: e,
						defaultProp: i,
						onChange: a = () => {},
						caller: r,
					}) {
						const [s, o, l] = (function ({ defaultProp: e, onChange: i }) {
								const [a, r] = t.useState(e),
									s = t.useRef(a),
									o = t.useRef(i);
								return (
									n(() => {
										o.current = i;
									}, [i]),
									t.useEffect(() => {
										s.current !== a && (o.current?.(a), (s.current = a));
									}, [a, s]),
									[a, r, o]
								);
							})({ defaultProp: i, onChange: a }),
							c = void 0 !== e,
							h = c ? e : s;
						{
							const i = t.useRef(void 0 !== e);
							t.useEffect(() => {
								const e = i.current;
								if (e !== c) {
									const t = c ? "controlled" : "uncontrolled";
									console.warn(
										`${r} is changing from ${e ? "controlled" : "uncontrolled"} to ${t}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`,
									);
								}
								i.current = c;
							}, [c, r]);
						}
						return [
							h,
							t.useCallback(
								(t) => {
									if (c) {
										const i = "function" == typeof t ? t(e) : t;
										i !== e && l.current?.(i);
									} else o(t);
								},
								[c, e, o, l],
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
						const [n, a] = t.useState(void 0);
						return (
							(0, i.useLayoutEffect)(() => {
								if (e) {
									a({ width: e.offsetWidth, height: e.offsetHeight });
									const t = new ResizeObserver((t) => {
										let i, n;
										if (!Array.isArray(t) || !t.length) return;
										const r = t[0];
										if ("borderBoxSize" in r) {
											const e = r.borderBoxSize,
												t = Array.isArray(e) ? e[0] : e;
											(i = t.inlineSize), (n = t.blockSize);
										} else (i = e.offsetWidth), (n = e.offsetHeight);
										a({ width: i, height: n });
									});
									return (
										t.observe(e, { box: "border-box" }), () => t.unobserve(e)
									);
								}
								a(void 0);
							}, [e]),
							n
						);
					},
				],
				65221,
			);
	},
	88618,
	(e) => {
		"use strict";
		var t = e.i(62613),
			i = e.i(57319);
		const n = String.raw,
			a = (() => {
				try {
					document
						.createElement("div")
						.animate({ opacity: 0 }, { easing: "linear(0, 1)" });
				} catch {
					return !1;
				}
				return !0;
			})(),
			r =
				"u" > typeof CSS &&
				CSS.supports &&
				CSS.supports("line-height", "mod(1,1)"),
			s =
				"u" > typeof matchMedia
					? matchMedia("(prefers-reduced-motion: reduce)")
					: null,
			o = "--_number-flow-d-opacity",
			l = "--_number-flow-d-width",
			c = "--_number-flow-dx",
			h = "--_number-flow-d",
			d = (() => {
				try {
					return (
						CSS.registerProperty({
							name: o,
							syntax: "<number>",
							inherits: !1,
							initialValue: "0",
						}),
						CSS.registerProperty({
							name: c,
							syntax: "<length>",
							inherits: !0,
							initialValue: "0px",
						}),
						CSS.registerProperty({
							name: l,
							syntax: "<number>",
							inherits: !1,
							initialValue: "0",
						}),
						CSS.registerProperty({
							name: h,
							syntax: "<number>",
							inherits: !0,
							initialValue: "0",
						}),
						!0
					);
				} catch {
					return !1;
				}
			})(),
			u =
				"round(nearest, calc(var(--number-flow-mask-height, 0.25em) / 2), 1px)",
			p = `calc(${u} * 2)`,
			f = "var(--number-flow-mask-width, 0.5em)",
			m = `calc(${f} / var(--scale-x))`,
			g = "#000 0, transparent 71%",
			v = n`:host{display:inline-block;direction:ltr;white-space:nowrap;isolation:isolate;line-height:1}.number,.number__inner{display:inline-block;transform-origin:left top}:host([data-will-change]) :is(.number,.number__inner,.section,.digit,.digit__num,.symbol){will-change:transform}.number{--scale-x:calc(1 + var(${l}) / var(--width));transform:translateX(var(${c})) scaleX(var(--scale-x));margin:0 calc(-1 * ${f});position:relative;-webkit-mask-image:linear-gradient(to right,transparent 0,#000 ${m},#000 calc(100% - ${m}),transparent ),linear-gradient(to bottom,transparent 0,#000 ${p},#000 calc(100% - ${p}),transparent 100% ),radial-gradient(at bottom right,${g}),radial-gradient(at bottom left,${g}),radial-gradient(at top left,${g}),radial-gradient(at top right,${g});-webkit-mask-size:100% calc(100% - ${p} * 2),calc(100% - ${m} * 2) 100%,${m} ${p},${m} ${p},${m} ${p},${m} ${p};-webkit-mask-position:center,center,top left,top right,bottom right,bottom left;-webkit-mask-repeat:no-repeat}.number__inner{padding:${u} ${f};transform:scaleX(calc(1 / var(--scale-x))) translateX(calc(-1 * var(${c})))}:host > :not(.number){z-index:5}.section,.symbol{display:inline-block;position:relative;isolation:isolate}.section::after{content:'\200b';display:inline-block}.section--justify-left{transform-origin:center left}.section--justify-right{transform-origin:center right}.section > [inert],.symbol > [inert]{margin:0 !important;position:absolute !important;z-index:-1}.digit{display:inline-block;position:relative;--c:var(--current) + var(${h})}.digit__num,.number .section::after{padding:${u} 0}.digit__num{display:inline-block;--offset-raw:mod(var(--length) + var(--n) - mod(var(--c),var(--length)),var(--length));--offset:calc( var(--offset-raw) - var(--length) * round(down,var(--offset-raw) / (var(--length) / 2),1) );--y:clamp(-100%,var(--offset) * 100%,100%);transform:translateY(var(--y))}.digit__num[inert]{position:absolute;top:0;left:50%;transform:translateX(-50%) translateY(var(--y))}.digit:not(.is-spinning) .digit__num[inert]{display:none}.symbol__value{display:inline-block;mix-blend-mode:plus-lighter;white-space:pre}.section--justify-left .symbol > [inert]{left:0}.section--justify-right .symbol > [inert]{right:0}.animate-presence{opacity:calc(1 + var(${o}))}`,
			y = HTMLElement,
			b =
				(n`:host{display:inline-block;direction:ltr;white-space:nowrap;line-height:1}span{display:inline-block}:host([data-will-change]) span{will-change:transform}.number,.digit{padding:${u} 0}.symbol{white-space:pre}`,
				(e, t, i) => {
					const n = document.createElement(e),
						[a, r] = Array.isArray(t) ? [void 0, t] : [t, i];
					return (
						a && Object.assign(n, a),
						null == r || r.forEach((e) => n.appendChild(e)),
						n
					);
				}),
			w = r && a && d;
		class x extends y {
			constructor() {
				super(), (this.created = !1), (this.batched = !1);
				const { animated: e, ...t } = this.constructor.defaultProps;
				(this._animated = this.computedAnimated = e), Object.assign(this, t);
			}
			get animated() {
				return this._animated;
			}
			set animated(e) {
				var t;
				this.animated !== e &&
					((this._animated = e),
					null == (t = this.shadowRoot) ||
						t.getAnimations().forEach((e) => e.finish()));
			}
			set data(e) {
				var t;
				if (null == e) return;
				const { pre: i, integer: n, fraction: a, post: r, value: o } = e;
				if (this.created) {
					const l = this._data;
					(this._data = e),
						(this.computedTrend =
							"function" == typeof this.trend
								? this.trend(l.value, o)
								: this.trend),
						(this.computedAnimated =
							w &&
							this._animated &&
							(!this.respectMotionPreference || !(null != s && s.matches)) &&
							this.offsetWidth > 0 &&
							this.offsetHeight > 0 &&
							"visible" === this.ownerDocument.visibilityState),
						null == (t = this.plugins) ||
							t.forEach((t) => {
								var i;
								return null == (i = t.onUpdate)
									? void 0
									: i.call(t, e, l, this);
							}),
						this.batched || this.willUpdate(),
						this._pre.update(i),
						this._num.update({ integer: n, fraction: a }),
						this._post.update(r),
						this.batched || this.didUpdate();
				} else {
					(this._data = e), this.attachShadow({ mode: "open" });
					try {
						this._internals ?? (this._internals = this.attachInternals()),
							(this._internals.role = "img");
					} catch {}
					const t = document.createElement("style");
					this.nonce && (t.nonce = this.nonce),
						(t.textContent = v),
						this.shadowRoot.appendChild(t),
						(this._pre = new S(this, i, { justify: "right", part: "left" })),
						this.shadowRoot.appendChild(this._pre.el),
						(this._num = new _(this, n, a)),
						this.shadowRoot.appendChild(this._num.el),
						(this._post = new S(this, r, { justify: "left", part: "right" })),
						this.shadowRoot.appendChild(this._post.el),
						(this.created = !0);
				}
				try {
					this._internals.ariaLabel = e.valueAsString;
				} catch {}
			}
			willUpdate() {
				this._pre.willUpdate(), this._num.willUpdate(), this._post.willUpdate();
			}
			didUpdate() {
				if (!this.computedAnimated) return;
				this._abortAnimationsFinish
					? this._abortAnimationsFinish.abort()
					: this.dispatchEvent(new Event("animationsstart")),
					this._pre.didUpdate(),
					this._num.didUpdate(),
					this._post.didUpdate();
				const e = new AbortController();
				Promise.all(
					this.shadowRoot.getAnimations().map((e) => e.finished),
				).then(() => {
					e.signal.aborted ||
						(this.dispatchEvent(new Event("animationsfinish")),
						(this._abortAnimationsFinish = void 0));
				}),
					(this._abortAnimationsFinish = e);
			}
		}
		x.defaultProps = {
			transformTiming: {
				duration: 900,
				easing:
					"linear(0,.005,.019,.039,.066,.096,.129,.165,.202,.24,.278,.316,.354,.39,.426,.461,.494,.526,.557,.586,.614,.64,.665,.689,.711,.731,.751,.769,.786,.802,.817,.831,.844,.856,.867,.877,.887,.896,.904,.912,.919,.925,.931,.937,.942,.947,.951,.955,.959,.962,.965,.968,.971,.973,.976,.978,.98,.981,.983,.984,.986,.987,.988,.989,.99,.991,.992,.992,.993,.994,.994,.995,.995,.996,.996,.9963,.9967,.9969,.9972,.9975,.9977,.9979,.9981,.9982,.9984,.9985,.9987,.9988,.9989,1)",
			},
			spinTiming: void 0,
			opacityTiming: { duration: 450, easing: "ease-out" },
			animated: !0,
			trend: (e, t) => Math.sign(t - e),
			respectMotionPreference: !0,
			plugins: void 0,
			digits: void 0,
		};
		class _ {
			constructor(e, t, i, { className: n, ...a } = {}) {
				(this.flow = e),
					(this._integer = new C(e, t, { justify: "right", part: "integer" })),
					(this._fraction = new C(e, i, { justify: "left", part: "fraction" })),
					(this._inner = b("span", { className: "number__inner" }, [
						this._integer.el,
						this._fraction.el,
					])),
					(this.el = b(
						"span",
						{ ...a, part: "number", className: `number ${n ?? ""}` },
						[this._inner],
					));
			}
			willUpdate() {
				(this._prevWidth = this.el.offsetWidth),
					(this._prevLeft = this.el.getBoundingClientRect().left),
					this._integer.willUpdate(),
					this._fraction.willUpdate();
			}
			update({ integer: e, fraction: t }) {
				this._integer.update(e), this._fraction.update(t);
			}
			didUpdate() {
				const e = this.el.getBoundingClientRect();
				this._integer.didUpdate(), this._fraction.didUpdate();
				const t = this._prevLeft - e.left,
					i = this.el.offsetWidth,
					n = this._prevWidth - i;
				this.el.style.setProperty("--width", String(i)),
					this.el.animate(
						{ [c]: [`${t}px`, "0px"], [l]: [n, 0] },
						{ ...this.flow.transformTiming, composite: "accumulate" },
					);
			}
		}
		class M {
			constructor(e, t, { justify: i, className: n, ...a }, r) {
				(this.flow = e),
					(this.children = new Map()),
					(this.onCharRemove = (e) => () => {
						this.children.delete(e);
					}),
					(this.justify = i);
				const s = t.map((e) => this.addChar(e).el);
				this.el = b(
					"span",
					{ ...a, className: `section section--justify-${i} ${n ?? ""}` },
					r ? r(s) : s,
				);
			}
			addChar(e, { startDigitsAtZero: t = !1, ...i } = {}) {
				const n =
					"integer" === e.type || "fraction" === e.type
						? new E(this, e.type, t ? 0 : e.value, e.pos, {
								...i,
								onRemove: this.onCharRemove(e.key),
							})
						: new N(this, e.type, e.value, {
								...i,
								onRemove: this.onCharRemove(e.key),
							});
				return this.children.set(e.key, n), n;
			}
			unpop(e) {
				e.el.removeAttribute("inert"),
					(e.el.style.top = ""),
					(e.el.style[this.justify] = "");
			}
			pop(e) {
				e.forEach((e) => {
					var t, i;
					(e.el.style.top = `${e.el.offsetTop}px`),
						(e.el.style[this.justify] =
							`${(((t = e.el)), "left" === this.justify ? t.offsetLeft : ((null == (i = t.offsetParent instanceof HTMLElement ? t.offsetParent : null) ? void 0 : i.offsetWidth) ?? 0) - t.offsetWidth - t.offsetLeft)}px`);
				}),
					e.forEach((e) => {
						e.el.setAttribute("inert", ""), (e.present = !1);
					});
			}
			addNewAndUpdateExisting(e) {
				const t = new Map(),
					i = new Map(),
					n = "left" === this.justify,
					a = n ? "prepend" : "append";
				if (
					((function (e, t, { reverse: i = !1 } = {}) {
						const n = e.length;
						for (let a = i ? n - 1 : 0; i ? a >= 0 : a < n; i ? a-- : a++)
							t(e[a], a);
					})(
						e,
						(e) => {
							let n;
							this.children.has(e.key)
								? ((n = this.children.get(e.key)),
									i.set(e, n),
									this.unpop(n),
									(n.present = !0))
								: ((n = this.addChar(e, {
										startDigitsAtZero: !0,
										animateIn: !0,
									})),
									t.set(e, n)),
								this.el[a](n.el);
						},
						{ reverse: n },
					),
					this.flow.computedAnimated)
				) {
					const e = this.el.getBoundingClientRect();
					t.forEach((t) => {
						t.willUpdate(e);
					});
				}
				t.forEach((e, t) => {
					e.update(t.value);
				}),
					i.forEach((e, t) => {
						e.update(t.value);
					});
			}
			willUpdate() {
				const e = this.el.getBoundingClientRect();
				(this._prevOffset = e[this.justify]),
					this.children.forEach((t) => t.willUpdate(e));
			}
			didUpdate() {
				const e = this.el.getBoundingClientRect();
				this.children.forEach((t) => t.didUpdate(e));
				const t = e[this.justify],
					i = this._prevOffset - t;
				i &&
					this.children.size &&
					this.el.animate(
						{ transform: [`translateX(${i}px)`, "none"] },
						{ ...this.flow.transformTiming, composite: "accumulate" },
					);
			}
		}
		class C extends M {
			update(e) {
				const t = new Map();
				this.children.forEach((i, n) => {
					e.find((e) => e.key === n) || t.set(n, i), this.unpop(i);
				}),
					this.addNewAndUpdateExisting(e),
					t.forEach((e) => {
						e instanceof E && e.update(0);
					}),
					this.pop(t);
			}
		}
		class S extends M {
			update(e) {
				const t = new Map();
				this.children.forEach((i, n) => {
					e.find((e) => e.key === n) || t.set(n, i);
				}),
					this.pop(t),
					this.addNewAndUpdateExisting(e);
			}
		}
		class k {
			constructor(e, t, { onRemove: i, animateIn: n = !1 } = {}) {
				(this.flow = e),
					(this.el = t),
					(this._present = !0),
					(this._remove = () => {
						var e;
						this.el.remove(), null == (e = this._onRemove) || e.call(this);
					}),
					this.el.classList.add("animate-presence"),
					this.flow.computedAnimated &&
						n &&
						this.el.animate(
							{ [o]: [-0.9999, 0] },
							{ ...this.flow.opacityTiming, composite: "accumulate" },
						),
					(this._onRemove = i);
			}
			get present() {
				return this._present;
			}
			set present(e) {
				if (this._present !== e) {
					if (
						((this._present = e),
						e
							? this.el.removeAttribute("inert")
							: this.el.setAttribute("inert", ""),
						!this.flow.computedAnimated)
					) {
						e || this._remove();
						return;
					}
					this.el.style.setProperty(
						"--_number-flow-d-opacity",
						e ? "0" : "-.999",
					),
						this.el.animate(
							{ [o]: e ? [-0.9999, 0] : [0.999, 0] },
							{ ...this.flow.opacityTiming, composite: "accumulate" },
						),
						e
							? this.flow.removeEventListener("animationsfinish", this._remove)
							: this.flow.addEventListener("animationsfinish", this._remove, {
									once: !0,
								});
				}
			}
		}
		class j extends k {
			constructor(e, t, i, n) {
				super(e.flow, i, n),
					(this.section = e),
					(this.value = t),
					(this.el = i);
			}
		}
		class E extends j {
			constructor(e, t, i, n, a) {
				var r, s;
				const o =
						((null == (s = null == (r = e.flow.digits) ? void 0 : r[n])
							? void 0
							: s.max) ?? 9) + 1,
					l = Array.from({ length: o }).map((e, t) => {
						const n = b("span", { className: "digit__num" }, [
							document.createTextNode(String(t)),
						]);
						return (
							t !== i && n.setAttribute("inert", ""),
							n.style.setProperty("--n", String(t)),
							n
						);
					}),
					c = b("span", { part: `digit ${t}-digit`, className: "digit" }, l);
				c.style.setProperty("--current", String(i)),
					c.style.setProperty("--length", String(o)),
					super(e, i, c, a),
					(this.pos = n),
					(this._onAnimationsFinish = () => {
						this.el.classList.remove("is-spinning");
					}),
					(this._numbers = l),
					(this.length = o);
			}
			willUpdate(e) {
				const t = this.el.getBoundingClientRect();
				this._prevValue = this.value;
				const i = t[this.section.justify] - e[this.section.justify],
					n = t.width / 2;
				this._prevCenter = "left" === this.section.justify ? i + n : i - n;
			}
			update(e) {
				this.el.style.setProperty("--current", String(e)),
					this._numbers.forEach((t, i) =>
						i === e ? t.removeAttribute("inert") : t.setAttribute("inert", ""),
					),
					(this.value = e);
			}
			didUpdate(e) {
				const t = this.el.getBoundingClientRect(),
					i = t[this.section.justify] - e[this.section.justify],
					n = t.width / 2,
					a = "left" === this.section.justify ? i + n : i - n,
					r = this._prevCenter - a;
				r &&
					this.el.animate(
						{ transform: [`translateX(${r}px)`, "none"] },
						{ ...this.flow.transformTiming, composite: "accumulate" },
					);
				const s = this.getDelta();
				s &&
					(this.el.classList.add("is-spinning"),
					this.el.animate(
						{ [h]: [-s, 0] },
						{
							...(this.flow.spinTiming ?? this.flow.transformTiming),
							composite: "accumulate",
						},
					),
					this.flow.addEventListener(
						"animationsfinish",
						this._onAnimationsFinish,
						{ once: !0 },
					));
			}
			getDelta() {
				var e;
				if (this.flow.plugins)
					for (const t of this.flow.plugins) {
						const i =
							null == (e = t.getDelta)
								? void 0
								: e.call(t, this.value, this._prevValue, this);
						if (null != i) return i;
					}
				const t = this.value - this._prevValue,
					i = this.flow.computedTrend || Math.sign(t);
				return i < 0 && this.value > this._prevValue
					? this.value - this.length - this._prevValue
					: i > 0 && this.value < this._prevValue
						? this.length - this._prevValue + this.value
						: t;
			}
		}
		class N extends j {
			constructor(e, t, i, n) {
				const a = b("span", { className: "symbol__value", textContent: i });
				super(
					e,
					i,
					b("span", { part: `symbol ${t}`, className: "symbol" }, [a]),
					n,
				),
					(this.type = t),
					(this._children = new Map()),
					(this._onChildRemove = (e) => () => {
						this._children.delete(e);
					}),
					this._children.set(
						i,
						new k(this.flow, a, { onRemove: this._onChildRemove(i) }),
					);
			}
			willUpdate(e) {
				if ("decimal" === this.type) return;
				const t = this.el.getBoundingClientRect();
				this._prevOffset = t[this.section.justify] - e[this.section.justify];
			}
			update(e) {
				if (this.value !== e) {
					const t = this._children.get(this.value);
					t && (t.present = !1);
					const i = this._children.get(e);
					if (i) i.present = !0;
					else {
						const t = b("span", { className: "symbol__value", textContent: e });
						this.el.appendChild(t),
							this._children.set(
								e,
								new k(this.flow, t, {
									animateIn: !0,
									onRemove: this._onChildRemove(e),
								}),
							);
					}
				}
				this.value = e;
			}
			didUpdate(e) {
				if ("decimal" === this.type) return;
				const t =
						this.el.getBoundingClientRect()[this.section.justify] -
						e[this.section.justify],
					i = this._prevOffset - t;
				i &&
					this.el.animate(
						{ transform: [`translateX(${i}px)`, "none"] },
						{ ...this.flow.transformTiming, composite: "accumulate" },
					);
			}
		}
		var R = i;
		const P = parseInt(R.version.match(/^(\d+)\./)?.[1]) >= 19;
		class A extends x {
			attributeChangedCallback(e, t, i) {
				this[e] = JSON.parse(i);
			}
		}
		(A.observedAttributes = P ? [] : ["data", "digits"]),
			customElements.get("number-flow-react") ||
				customElements.define("number-flow-react", A);
		const T = {},
			$ = P
				? function (e) {
						return e;
					}
				: JSON.stringify;
		function I(e) {
			const {
				transformTiming: t,
				spinTiming: i,
				opacityTiming: n,
				animated: a,
				respectMotionPreference: r,
				trend: s,
				plugins: o,
				...l
			} = e;
			return [
				{
					transformTiming: t,
					spinTiming: i,
					opacityTiming: n,
					animated: a,
					respectMotionPreference: r,
					trend: s,
					plugins: o,
				},
				l,
			];
		}
		class U extends R.Component {
			updateProperties(e) {
				if (!this.el) return;
				this.el.batched = !this.props.isolate;
				const [t] = I(this.props);
				Object.entries(t).forEach(([e, t]) => {
					this.el[e] = t ?? A.defaultProps[e];
				}),
					e?.onAnimationsStart &&
						this.el.removeEventListener("animationsstart", e.onAnimationsStart),
					this.props.onAnimationsStart &&
						this.el.addEventListener(
							"animationsstart",
							this.props.onAnimationsStart,
						),
					e?.onAnimationsFinish &&
						this.el.removeEventListener(
							"animationsfinish",
							e.onAnimationsFinish,
						),
					this.props.onAnimationsFinish &&
						this.el.addEventListener(
							"animationsfinish",
							this.props.onAnimationsFinish,
						);
			}
			componentDidMount() {
				this.updateProperties(),
					P &&
						this.el &&
						((this.el.digits = this.props.digits),
						(this.el.data = this.props.data));
			}
			getSnapshotBeforeUpdate(e) {
				if ((this.updateProperties(e), e.data !== this.props.data)) {
					if (this.props.group)
						return (
							this.props.group.willUpdate(), () => this.props.group?.didUpdate()
						);
					if (!this.props.isolate)
						return this.el?.willUpdate(), () => this.el?.didUpdate();
				}
				return null;
			}
			componentDidUpdate(e, t, i) {
				i?.();
			}
			handleRef(e) {
				this.props.innerRef && (this.props.innerRef.current = e), (this.el = e);
			}
			render() {
				const [
					e,
					{
						innerRef: t,
						className: i,
						data: n,
						nonce: a,
						willChange: r,
						isolate: s,
						group: o,
						digits: l,
						onAnimationsStart: c,
						onAnimationsFinish: h,
						...d
					},
				] = I(this.props);
				return R.createElement("number-flow-react", {
					ref: this.handleRef,
					"data-will-change": r ? "" : void 0,
					class: i,
					nonce: a,
					...d,
					dangerouslySetInnerHTML: { __html: "" },
					suppressHydrationWarning: !0,
					digits: $(l),
					data: $(n),
				});
			}
			constructor(e) {
				super(e), (this.handleRef = this.handleRef.bind(this));
			}
		}
		const L = R.forwardRef(function (
				{ value: e, locales: t, format: i, prefix: n, suffix: a, ...r },
				s,
			) {
				R.useImperativeHandle(s, () => o.current, []);
				const o = R.useRef(),
					l = R.useContext(O);
				l?.useRegister(o);
				const c = R.useMemo(() => (t ? JSON.stringify(t) : ""), [t]),
					h = R.useMemo(() => (i ? JSON.stringify(i) : ""), [i]),
					d = R.useMemo(
						() =>
							(function (e, t, i, n) {
								const a = t.formatToParts(e);
								i && a.unshift({ type: "prefix", value: i }),
									n && a.push({ type: "suffix", value: n });
								let r = [],
									s = [],
									o = [],
									l = [],
									c = {},
									h = (e) => `${e}:${(c[e] = (c[e] ?? -1) + 1)}`,
									d = "",
									u = !1,
									p = !1;
								for (const e of a) {
									d += e.value;
									const t =
										"minusSign" === e.type || "plusSign" === e.type
											? "sign"
											: e.type;
									"integer" === t
										? ((u = !0),
											s.push(
												...e.value
													.split("")
													.map((e) => ({ type: t, value: parseInt(e) })),
											))
										: "group" === t
											? s.push({ type: t, value: e.value })
											: "decimal" === t
												? ((p = !0),
													o.push({ type: t, value: e.value, key: h(t) }))
												: "fraction" === t
													? o.push(
															...e.value.split("").map((e) => ({
																type: t,
																value: parseInt(e),
																key: h(t),
																pos: -1 - c[t],
															})),
														)
													: (u || p ? l : r).push({
															type: t,
															value: e.value,
															key: h(t),
														});
								}
								const f = [];
								for (let e = s.length - 1; e >= 0; e--) {
									const t = s[e];
									f.unshift(
										"integer" === t.type
											? { ...t, key: h(t.type), pos: c[t.type] }
											: { ...t, key: h(t.type) },
									);
								}
								return {
									pre: r,
									integer: f,
									fraction: o,
									post: l,
									valueAsString: d,
									value: "string" == typeof e ? parseFloat(e) : e,
								};
							})(e, (T[`${c}:${h}`] ??= new Intl.NumberFormat(t, i)), n, a),
						[e, c, h, n, a],
					);
				return R.createElement(U, { ...r, group: l, data: d, innerRef: o });
			}),
			O = R.createContext(void 0);
		((e = "") =>
			n`:where(number-flow${e}){line-height:1}number-flow${e} > span{font-kerning:none;display:inline-block;padding:${p} 0}`)(
			"-react",
		);
		var B = e.i(81986),
			F = {};
		!(function e(t, i, n, a) {
			var r,
				s,
				o,
				l,
				c,
				h,
				d,
				u,
				p,
				f,
				m,
				g = !!(
					t.Worker &&
					t.Blob &&
					t.Promise &&
					t.OffscreenCanvas &&
					t.OffscreenCanvasRenderingContext2D &&
					t.HTMLCanvasElement &&
					t.HTMLCanvasElement.prototype.transferControlToOffscreen &&
					t.URL &&
					t.URL.createObjectURL
				),
				v = "function" == typeof Path2D && "function" == typeof DOMMatrix;
			function y() {}
			function b(e) {
				var n = i.exports.Promise,
					a = void 0 !== n ? n : t.Promise;
				return "function" == typeof a ? new a(e) : (e(y, y), null);
			}
			var w =
					((r = (function () {
						if (!t.OffscreenCanvas) return !1;
						try {
							var e = new OffscreenCanvas(1, 1),
								i = e.getContext("2d");
							i.fillRect(0, 0, 1, 1);
							var n = e.transferToImageBitmap();
							i.createPattern(n, "no-repeat");
						} catch (e) {
							return !1;
						}
						return !0;
					})()),
					(s = new Map()),
					{
						transform: function (e) {
							if (r) return e;
							if (s.has(e)) return s.get(e);
							var t = new OffscreenCanvas(e.width, e.height);
							return t.getContext("2d").drawImage(e, 0, 0), s.set(e, t), t;
						},
						clear: function () {
							s.clear();
						},
					}),
				x =
					((c = Math.floor(1e3 / 60)),
					(h = {}),
					(d = 0),
					"function" == typeof requestAnimationFrame &&
					"function" == typeof cancelAnimationFrame
						? ((o = function (e) {
								var t = Math.random();
								return (
									(h[t] = requestAnimationFrame(function i(n) {
										d === n || d + c - 1 < n
											? ((d = n), delete h[t], e())
											: (h[t] = requestAnimationFrame(i));
									})),
									t
								);
							}),
							(l = function (e) {
								h[e] && cancelAnimationFrame(h[e]);
							}))
						: ((o = function (e) {
								return setTimeout(e, c);
							}),
							(l = function (e) {
								return clearTimeout(e);
							})),
					{ frame: o, cancel: l }),
				_ =
					((f = {}),
					function () {
						if (u) return u;
						if (!n && g) {
							var t = [
								"var CONFETTI, SIZE = {}, module = {};",
								"(" + e.toString() + ")(this, module, true, SIZE);",
								"onmessage = function(msg) {\n  if (msg.data.options) {\n    CONFETTI(msg.data.options).then(function () {\n      if (msg.data.callback) {\n        postMessage({ callback: msg.data.callback });\n      }\n    });\n  } else if (msg.data.reset) {\n    CONFETTI && CONFETTI.reset();\n  } else if (msg.data.resize) {\n    SIZE.width = msg.data.resize.width;\n    SIZE.height = msg.data.resize.height;\n  } else if (msg.data.canvas) {\n    SIZE.width = msg.data.canvas.width;\n    SIZE.height = msg.data.canvas.height;\n    CONFETTI = module.exports.create(msg.data.canvas);\n  }\n}",
							].join("\n");
							try {
								u = new Worker(URL.createObjectURL(new Blob([t])));
							} catch (e) {
								return (
									"u" > typeof console &&
										"function" == typeof console.warn &&
										console.warn("🎊 Could not load worker", e),
									null
								);
							}
							var i = u;
							function a(e, t) {
								i.postMessage({ options: e || {}, callback: t });
							}
							(i.init = function (e) {
								var t = e.transferControlToOffscreen();
								i.postMessage({ canvas: t }, [t]);
							}),
								(i.fire = function (e, t, n) {
									if (p) return a(e, null), p;
									var r = Math.random().toString(36).slice(2);
									return (p = b(function (t) {
										function s(e) {
											e.data.callback === r &&
												(delete f[r],
												i.removeEventListener("message", s),
												(p = null),
												w.clear(),
												n(),
												t());
										}
										i.addEventListener("message", s),
											a(e, r),
											(f[r] = s.bind(null, { data: { callback: r } }));
									}));
								}),
								(i.reset = function () {
									for (var e in (i.postMessage({ reset: !0 }), f))
										f[e](), delete f[e];
								});
						}
						return u;
					}),
				M = {
					particleCount: 50,
					angle: 90,
					spread: 45,
					startVelocity: 45,
					decay: 0.9,
					gravity: 1,
					drift: 0,
					ticks: 200,
					x: 0.5,
					y: 0.5,
					shapes: ["square", "circle"],
					zIndex: 100,
					colors: [
						"#26ccff",
						"#a25afd",
						"#ff5e7e",
						"#88ff5a",
						"#fcff42",
						"#ffa62d",
						"#ff36ff",
					],
					disableForReducedMotion: !1,
					scalar: 1,
				};
			function C(e, t, i) {
				var n;
				return (n = e && null != e[t] ? e[t] : M[t]), i ? i(n) : n;
			}
			function S(e) {
				return e < 0 ? 0 : Math.floor(e);
			}
			function k(e) {
				return parseInt(e, 16);
			}
			function j(e) {
				return e.map(E);
			}
			function E(e) {
				var t = String(e).replace(/[^0-9a-f]/gi, "");
				return (
					t.length < 6 && (t = t[0] + t[0] + t[1] + t[1] + t[2] + t[2]),
					{
						r: k(t.substring(0, 2)),
						g: k(t.substring(2, 4)),
						b: k(t.substring(4, 6)),
					}
				);
			}
			function N(e) {
				(e.width = document.documentElement.clientWidth),
					(e.height = document.documentElement.clientHeight);
			}
			function R(e) {
				var t = e.getBoundingClientRect();
				(e.width = t.width), (e.height = t.height);
			}
			function P(e, i) {
				var r,
					s = !e,
					o = !!C(i || {}, "resize"),
					l = !1,
					c = C(i, "disableForReducedMotion", Boolean),
					h = g && C(i || {}, "useWorker") ? _() : null,
					d = s ? N : R,
					u = !!e && !!h && !!e.__confetti_initialized,
					p =
						"function" == typeof matchMedia &&
						matchMedia("(prefers-reduced-motion)").matches;
				function f(i) {
					var f,
						m = c || C(i, "disableForReducedMotion", Boolean),
						g = C(i, "zIndex", Number);
					if (m && p)
						return b(function (e) {
							e();
						});
					s && r
						? (e = r.canvas)
						: s &&
							!e &&
							(((f = document.createElement("canvas")).style.position =
								"fixed"),
							(f.style.top = "0px"),
							(f.style.left = "0px"),
							(f.style.pointerEvents = "none"),
							(f.style.zIndex = g),
							(e = f),
							document.body.appendChild(e)),
						o && !u && d(e);
					var y = { width: e.width, height: e.height };
					function _() {
						if (h) {
							var t = {
								getBoundingClientRect: function () {
									if (!s) return e.getBoundingClientRect();
								},
							};
							d(t),
								h.postMessage({ resize: { width: t.width, height: t.height } });
							return;
						}
						y.width = y.height = null;
					}
					function M() {
						(r = null),
							o && ((l = !1), t.removeEventListener("resize", _)),
							s &&
								e &&
								(document.body.contains(e) && document.body.removeChild(e),
								(e = null),
								(u = !1));
					}
					return (h && !u && h.init(e),
					(u = !0),
					h && (e.__confetti_initialized = !0),
					o && !l && ((l = !0), t.addEventListener("resize", _, !1)),
					h)
						? h.fire(i, y, M)
						: (function (t, i, s) {
								for (
									var o,
										l,
										c,
										h,
										u,
										p,
										f,
										m = C(t, "particleCount", S),
										g = C(t, "angle", Number),
										y = C(t, "spread", Number),
										_ = C(t, "startVelocity", Number),
										M = C(t, "decay", Number),
										k = C(t, "gravity", Number),
										E = C(t, "drift", Number),
										N = C(t, "colors", j),
										R = C(t, "ticks", Number),
										P = C(t, "shapes"),
										A = C(t, "scalar"),
										T = !!C(t, "flat"),
										$ =
											(((o = C(t, "origin", Object)).x = C(o, "x", Number)),
											(o.y = C(o, "y", Number)),
											o),
										I = m,
										U = [],
										L = e.width * $.x,
										O = e.height * $.y;
									I--;
								)
									U.push(
										(function (e) {
											var t = e.angle * (Math.PI / 180),
												i = e.spread * (Math.PI / 180);
											return {
												x: e.x,
												y: e.y,
												wobble: 10 * Math.random(),
												wobbleSpeed: Math.min(0.11, 0.1 * Math.random() + 0.05),
												velocity:
													0.5 * e.startVelocity +
													Math.random() * e.startVelocity,
												angle2D: -t + (0.5 * i - Math.random() * i),
												tiltAngle: (0.5 * Math.random() + 0.25) * Math.PI,
												color: e.color,
												shape: e.shape,
												tick: 0,
												totalTicks: e.ticks,
												decay: e.decay,
												drift: e.drift,
												random: Math.random() + 2,
												tiltSin: 0,
												tiltCos: 0,
												wobbleX: 0,
												wobbleY: 0,
												gravity: 3 * e.gravity,
												ovalScalar: 0.6,
												scalar: e.scalar,
												flat: e.flat,
											};
										})({
											x: L,
											y: O,
											angle: g,
											spread: y,
											startVelocity: _,
											color: N[I % N.length],
											shape: P[Math.floor(Math.random() * (P.length - 0)) + 0],
											ticks: R,
											decay: M,
											gravity: k,
											drift: E,
											scalar: A,
											flat: T,
										}),
									);
								return r
									? r.addFettis(U)
									: ((l = e),
										(u = U.slice()),
										(p = l.getContext("2d")),
										(f = b(function (e) {
											function t() {
												(c = h = null),
													p.clearRect(0, 0, i.width, i.height),
													w.clear(),
													s(),
													e();
											}
											(c = x.frame(function e() {
												n &&
													(i.width !== a.width || i.height !== a.height) &&
													((i.width = l.width = a.width),
													(i.height = l.height = a.height)),
													i.width ||
														i.height ||
														(d(l), (i.width = l.width), (i.height = l.height)),
													p.clearRect(0, 0, i.width, i.height),
													(u = u.filter(function (e) {
														return (function (e, t) {
															(t.x +=
																Math.cos(t.angle2D) * t.velocity + t.drift),
																(t.y +=
																	Math.sin(t.angle2D) * t.velocity + t.gravity),
																(t.velocity *= t.decay),
																t.flat
																	? ((t.wobble = 0),
																		(t.wobbleX = t.x + 10 * t.scalar),
																		(t.wobbleY = t.y + 10 * t.scalar),
																		(t.tiltSin = 0),
																		(t.tiltCos = 0),
																		(t.random = 1))
																	: ((t.wobble += t.wobbleSpeed),
																		(t.wobbleX =
																			t.x + 10 * t.scalar * Math.cos(t.wobble)),
																		(t.wobbleY =
																			t.y + 10 * t.scalar * Math.sin(t.wobble)),
																		(t.tiltAngle += 0.1),
																		(t.tiltSin = Math.sin(t.tiltAngle)),
																		(t.tiltCos = Math.cos(t.tiltAngle)),
																		(t.random = Math.random() + 2));
															var i,
																n,
																a,
																r,
																s,
																o,
																l,
																c,
																h,
																d,
																u,
																p,
																f,
																m,
																g,
																y,
																b = t.tick++ / t.totalTicks,
																x = t.x + t.random * t.tiltCos,
																_ = t.y + t.random * t.tiltSin,
																M = t.wobbleX + t.random * t.tiltCos,
																C = t.wobbleY + t.random * t.tiltSin;
															if (
																((e.fillStyle =
																	"rgba(" +
																	t.color.r +
																	", " +
																	t.color.g +
																	", " +
																	t.color.b +
																	", " +
																	(1 - b) +
																	")"),
																e.beginPath(),
																v &&
																	"path" === t.shape.type &&
																	"string" == typeof t.shape.path &&
																	Array.isArray(t.shape.matrix))
															) {
																e.fill(
																	((i = t.shape.path),
																	(n = t.shape.matrix),
																	(a = t.x),
																	(r = t.y),
																	(s = 0.1 * Math.abs(M - x)),
																	(o = 0.1 * Math.abs(C - _)),
																	(l = (Math.PI / 10) * t.wobble),
																	(c = new Path2D(i)),
																	(h = new Path2D()).addPath(
																		c,
																		new DOMMatrix(n),
																	),
																	(d = new Path2D()).addPath(
																		h,
																		new DOMMatrix([
																			Math.cos(l) * s,
																			Math.sin(l) * s,
																			-Math.sin(l) * o,
																			Math.cos(l) * o,
																			a,
																			r,
																		]),
																	),
																	d),
																);
															} else if ("bitmap" === t.shape.type) {
																var S = (Math.PI / 10) * t.wobble,
																	k = 0.1 * Math.abs(M - x),
																	j = 0.1 * Math.abs(C - _),
																	E = t.shape.bitmap.width * t.scalar,
																	N = t.shape.bitmap.height * t.scalar,
																	R = new DOMMatrix([
																		Math.cos(S) * k,
																		Math.sin(S) * k,
																		-Math.sin(S) * j,
																		Math.cos(S) * j,
																		t.x,
																		t.y,
																	]);
																R.multiplySelf(new DOMMatrix(t.shape.matrix));
																var P = e.createPattern(
																	w.transform(t.shape.bitmap),
																	"no-repeat",
																);
																P.setTransform(R),
																	(e.globalAlpha = 1 - b),
																	(e.fillStyle = P),
																	e.fillRect(t.x - E / 2, t.y - N / 2, E, N),
																	(e.globalAlpha = 1);
															} else if ("circle" === t.shape)
																e.ellipse
																	? e.ellipse(
																			t.x,
																			t.y,
																			Math.abs(M - x) * t.ovalScalar,
																			Math.abs(C - _) * t.ovalScalar,
																			(Math.PI / 10) * t.wobble,
																			0,
																			2 * Math.PI,
																		)
																	: ((u = t.x),
																		(p = t.y),
																		(f = Math.abs(M - x) * t.ovalScalar),
																		(m = Math.abs(C - _) * t.ovalScalar),
																		(g = (Math.PI / 10) * t.wobble),
																		(y = 2 * Math.PI),
																		e.save(),
																		e.translate(u, p),
																		e.rotate(g),
																		e.scale(f, m),
																		e.arc(0, 0, 1, 0, y, void 0),
																		e.restore());
															else if ("star" === t.shape)
																for (
																	var A = (Math.PI / 2) * 3,
																		T = 4 * t.scalar,
																		$ = 8 * t.scalar,
																		I = t.x,
																		U = t.y,
																		L = 5,
																		O = Math.PI / 5;
																	L--;
																)
																	(I = t.x + Math.cos(A) * $),
																		(U = t.y + Math.sin(A) * $),
																		e.lineTo(I, U),
																		(A += O),
																		(I = t.x + Math.cos(A) * T),
																		(U = t.y + Math.sin(A) * T),
																		e.lineTo(I, U),
																		(A += O);
															else
																e.moveTo(Math.floor(t.x), Math.floor(t.y)),
																	e.lineTo(
																		Math.floor(t.wobbleX),
																		Math.floor(_),
																	),
																	e.lineTo(Math.floor(M), Math.floor(C)),
																	e.lineTo(
																		Math.floor(x),
																		Math.floor(t.wobbleY),
																	);
															return (
																e.closePath(), e.fill(), t.tick < t.totalTicks
															);
														})(p, e);
													})).length
														? (c = x.frame(e))
														: t();
											})),
												(h = t);
										})),
										(r = {
											addFettis: function (e) {
												return (u = u.concat(e)), f;
											},
											canvas: l,
											promise: f,
											reset: function () {
												c && x.cancel(c), h && h();
											},
										}).promise);
							})(i, y, M);
				}
				return (
					(f.reset = function () {
						h && h.reset(), r && r.reset();
					}),
					f
				);
			}
			function A() {
				return m || (m = P(null, { useWorker: !0, resize: !0 })), m;
			}
			(i.exports = function () {
				return A().apply(this, arguments);
			}),
				(i.exports.reset = function () {
					A().reset();
				}),
				(i.exports.create = P),
				(i.exports.shapeFromPath = function (e) {
					if (!v)
						throw Error("path confetti are not supported in this browser");
					"string" == typeof e ? (n = e) : ((n = e.path), (a = e.matrix));
					var t = new Path2D(n),
						i = document.createElement("canvas").getContext("2d");
					if (!a) {
						for (
							var n, a, r, s, o = 1e3, l = 1e3, c = 0, h = 0, d = 0;
							d < 1e3;
							d += 2
						)
							for (var u = 0; u < 1e3; u += 2)
								i.isPointInPath(t, d, u, "nonzero") &&
									((o = Math.min(o, d)),
									(l = Math.min(l, u)),
									(c = Math.max(c, d)),
									(h = Math.max(h, u)));
						r = c - o;
						var p = Math.min(10 / r, 10 / (s = h - l));
						a = [
							p,
							0,
							0,
							p,
							-Math.round(r / 2 + o) * p,
							-Math.round(s / 2 + l) * p,
						];
					}
					return { type: "path", path: n, matrix: a };
				}),
				(i.exports.shapeFromText = function (e) {
					var t,
						i = 1,
						n = "#000000",
						a =
							'"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", "EmojiOne Color", "Android Emoji", "Twemoji Mozilla", "system emoji", sans-serif';
					"string" == typeof e
						? (t = e)
						: ((t = e.text),
							(i = "scalar" in e ? e.scalar : i),
							(a = "fontFamily" in e ? e.fontFamily : a),
							(n = "color" in e ? e.color : n));
					var r = 10 * i,
						s = "" + r + "px " + a,
						o = new OffscreenCanvas(r, r),
						l = o.getContext("2d");
					l.font = s;
					var c = l.measureText(t),
						h = Math.ceil(c.actualBoundingBoxRight + c.actualBoundingBoxLeft),
						d = Math.ceil(
							c.actualBoundingBoxAscent + c.actualBoundingBoxDescent,
						),
						u = c.actualBoundingBoxLeft + 2,
						p = c.actualBoundingBoxAscent + 2;
					(h += 4),
						(d += 4),
						((l = (o = new OffscreenCanvas(h, d)).getContext("2d")).font = s),
						(l.fillStyle = n),
						l.fillText(t, u, p);
					var f = 1 / i;
					return {
						type: "bitmap",
						bitmap: o.transferToImageBitmap(),
						matrix: [f, 0, 0, f, (-h * f) / 2, (-d * f) / 2],
					};
				});
		})(
			(function () {
				return "u" > typeof window
					? window
					: "u" > typeof self
						? self
						: this || {};
			})(),
			F,
			!1,
		);
		const D = F.exports;
		F.exports.create;
		var z = e.i(69075);
		const V = (0, e.i(10283).default)("star", [
			[
				"path",
				{
					d: "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",
					key: "r04s7s",
				},
			],
		]);
		var W = e.i(88642),
			H = e.i(42603),
			X = e.i(97557),
			Y = e.i(67714),
			Z = e.i(15246),
			q = e.i(5396),
			J = e.i(42902),
			K = e.i(65221),
			G = e.i(33833),
			Q = "Switch",
			[ee, et] = (0, Z.createContextScope)(Q),
			[ei, en] = ee(Q);
		function ea(e) {
			const {
					__scopeSwitch: n,
					checked: a,
					children: r,
					defaultChecked: s,
					disabled: o,
					form: l,
					name: c,
					onCheckedChange: h,
					required: d,
					value: u = "on",
					internal_do_not_use_render: p,
				} = e,
				[f, m] = (0, q.useControllableState)({
					prop: a,
					defaultProp: s ?? !1,
					onChange: h,
					caller: Q,
				}),
				[g, v] = i.useState(null),
				[y, b] = i.useState(null),
				w = i.useRef(!1),
				x = !g || !!l || !!g.closest("form"),
				_ = {
					checked: f,
					setChecked: m,
					disabled: o,
					control: g,
					setControl: v,
					name: c,
					form: l,
					value: u,
					hasConsumerStoppedPropagationRef: w,
					required: d,
					defaultChecked: s,
					isFormControl: x,
					bubbleInput: y,
					setBubbleInput: b,
				};
			return (0, t.jsx)(ei, {
				scope: n,
				..._,
				children: "function" == typeof p ? p(_) : r,
			});
		}
		var er = "SwitchTrigger",
			es = i.forwardRef(({ __scopeSwitch: e, onClick: i, ...n }, a) => {
				const {
						value: r,
						disabled: s,
						checked: o,
						required: l,
						setControl: c,
						setChecked: h,
						hasConsumerStoppedPropagationRef: d,
						isFormControl: u,
						bubbleInput: p,
					} = en(er, e),
					f = (0, Y.useComposedRefs)(a, c);
				return (0, t.jsx)(G.Primitive.button, {
					type: "button",
					role: "switch",
					"aria-checked": o,
					"aria-required": l,
					"data-state": eu(o),
					"data-disabled": s ? "" : void 0,
					disabled: s,
					value: r,
					...n,
					ref: f,
					onClick: (0, X.composeEventHandlers)(i, (e) => {
						h((e) => !e),
							p &&
								u &&
								((d.current = e.isPropagationStopped()),
								d.current || e.stopPropagation());
					}),
				});
			});
		es.displayName = er;
		var eo = i.forwardRef((e, i) => {
			const {
				__scopeSwitch: n,
				name: a,
				checked: r,
				defaultChecked: s,
				required: o,
				disabled: l,
				value: c,
				onCheckedChange: h,
				form: d,
				...u
			} = e;
			return (0, t.jsx)(ea, {
				__scopeSwitch: n,
				checked: r,
				defaultChecked: s,
				disabled: l,
				required: o,
				onCheckedChange: h,
				name: a,
				form: d,
				value: c,
				internal_do_not_use_render: ({ isFormControl: e }) =>
					(0, t.jsxs)(t.Fragment, {
						children: [
							(0, t.jsx)(es, { ...u, ref: i, __scopeSwitch: n }),
							e && (0, t.jsx)(ed, { __scopeSwitch: n }),
						],
					}),
			});
		});
		eo.displayName = Q;
		var el = "SwitchThumb",
			ec = i.forwardRef((e, i) => {
				const { __scopeSwitch: n, ...a } = e,
					r = en(el, n);
				return (0, t.jsx)(G.Primitive.span, {
					"data-state": eu(r.checked),
					"data-disabled": r.disabled ? "" : void 0,
					...a,
					ref: i,
				});
			});
		ec.displayName = el;
		var eh = "SwitchBubbleInput",
			ed = i.forwardRef(({ __scopeSwitch: e, ...n }, a) => {
				const {
						control: r,
						hasConsumerStoppedPropagationRef: s,
						checked: o,
						defaultChecked: l,
						required: c,
						disabled: h,
						name: d,
						value: u,
						form: p,
						bubbleInput: f,
						setBubbleInput: m,
					} = en(eh, e),
					g = (0, Y.useComposedRefs)(a, m),
					v = (0, J.usePrevious)(o),
					y = (0, K.useSize)(r);
				i.useEffect(() => {
					if (!f) return;
					const e = Object.getOwnPropertyDescriptor(
							window.HTMLInputElement.prototype,
							"checked",
						).set,
						t = !s.current;
					if (v !== o && e) {
						const i = new Event("click", { bubbles: t });
						e.call(f, o), f.dispatchEvent(i);
					}
				}, [f, v, o, s]);
				const b = i.useRef(o);
				return (0, t.jsx)(G.Primitive.input, {
					type: "checkbox",
					"aria-hidden": !0,
					defaultChecked: l ?? b.current,
					required: c,
					disabled: h,
					name: d,
					value: u,
					form: p,
					...n,
					tabIndex: -1,
					ref: g,
					style: {
						...n.style,
						...y,
						position: "absolute",
						pointerEvents: "none",
						opacity: 0,
						margin: 0,
						transform: "translateX(-100%)",
					},
				});
			});
		function eu(e) {
			return e ? "checked" : "unchecked";
		}
		ed.displayName = eh;
		var ep = e.i(49696);
		const ef = ({ ref: e, className: i, ...n }) =>
			(0, t.jsx)(eo, {
				className: (0, ep.cn)(
					"peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
					i,
				),
				...n,
				ref: e,
				children: (0, t.jsx)(ec, {
					className: (0, ep.cn)(
						"pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
					),
				}),
			});
		ef.displayName = eo.displayName;
		var em = e.i(76706);
		e.s(
			[
				"Pricing",
				0,
				function ({
					plans: e,
					title: n = "Simple, Transparent Pricing",
					description: a = "Choose the plan that works for you",
				}) {
					const [r, s] = (0, i.useState)(!0),
						o = (function (e) {
							const [t, n] = (0, i.useState)(!1);
							return (
								(0, i.useEffect)(() => {
									const i = window.matchMedia(e);
									i.matches !== t && n(i.matches);
									const a = () => n(i.matches);
									return i.addListener(a), () => i.removeListener(a);
								}, [e]),
								t
							);
						})("(min-width: 768px)"),
						l = (0, i.useRef)(null);
					return (0, t.jsxs)("div", {
						className: "container py-4",
						children: [
							(0, t.jsxs)("div", {
								className: "text-center space-y-4 mb-3",
								children: [
									(0, t.jsx)("h2", {
										className: "text-2xl font-bold tracking-tight sm:text-3xl",
										children: n,
									}),
									(0, t.jsx)("p", {
										className: "text-muted-foreground  whitespace-pre-line",
										children: a,
									}),
								],
							}),
							(0, t.jsxs)("div", {
								className: "flex justify-center mb-10",
								children: [
									(0, t.jsx)("label", {
										className:
											"relative inline-flex items-center cursor-pointer",
										children: (0, t.jsx)(H.Label, {
											children: (0, t.jsx)(ef, {
												ref: l,
												checked: !r,
												onCheckedChange: (e) => {
													if ((s(!e), e && l.current)) {
														const e = l.current.getBoundingClientRect(),
															t = e.left + e.width / 2,
															i = e.top + e.height / 2;
														D({
															particleCount: 50,
															spread: 60,
															origin: {
																x: t / window.innerWidth,
																y: i / window.innerHeight,
															},
															colors: [
																"hsl(var(--primary))",
																"hsl(var(--accent))",
																"hsl(var(--secondary))",
																"hsl(var(--muted))",
															],
															ticks: 200,
															gravity: 1.2,
															decay: 0.94,
															startVelocity: 30,
															shapes: ["circle"],
														});
													}
												},
												className: "relative",
											}),
										}),
									}),
									(0, t.jsxs)("span", {
										className: "ml-2 font-semibold",
										children: [
											"Annual billing ",
											(0, t.jsx)("span", {
												className: "text-primary",
												children: "(Save 20%)",
											}),
										],
									}),
								],
							}),
							(0, t.jsx)("div", {
								className: "grid grid-cols-1 md:grid-cols-3 sm:2 gap-4",
								children: e.map((e, i) =>
									(0, t.jsxs)(
										z.motion.div,
										{
											initial: { y: 50, opacity: 1 },
											whileInView: o
												? {
														y: e.isPopular ? -20 : 0,
														opacity: 1,
														x: 2 === i ? -30 : 30 * (0 === i),
														scale: 0 === i || 2 === i ? 0.94 : 1,
													}
												: {},
											viewport: { once: !0 },
											transition: {
												duration: 1.6,
												type: "spring",
												stiffness: 100,
												damping: 30,
												delay: 0.4,
												opacity: { duration: 0.5 },
											},
											className: (0, ep.cn)(
												"rounded-sm border p-6 bg-background text-center lg:flex lg:flex-col lg:justify-center relative",
												e.isPopular
													? "border-border border-2"
													: "border-border",
												"flex flex-col",
												!e.isPopular && "mt-5",
												0 === i || 2 === i
													? "z-0 transform translate-x-0 translate-y-0 -translate-z-[50px] rotate-y-10"
													: "z-10",
												0 === i && "origin-right",
												2 === i && "origin-left",
											),
											children: [
												e.isPopular &&
													(0, t.jsxs)("div", {
														className:
															"absolute top-0 right-0 bg-primary py-0.5 px-2 rounded-bl-sm rounded-tr-sm flex items-center",
														children: [
															(0, t.jsx)(V, {
																className:
																	"text-primary-foreground h-4 w-4 fill-current",
															}),
															(0, t.jsx)("span", {
																className:
																	"text-primary-foreground ml-1 font-sans font-semibold",
																children: "Popular",
															}),
														],
													}),
												(0, t.jsxs)("div", {
													className: "flex-1 flex flex-col",
													children: [
														(0, t.jsx)("p", {
															className:
																"text-base font-semibold text-muted-foreground mt-2",
															children: e.name,
														}),
														(0, t.jsxs)("div", {
															className:
																"mt-6 flex items-center justify-center gap-x-2",
															children: [
																(0, t.jsx)("span", {
																	className:
																		"text-5xl font-bold tracking-tight text-foreground",
																	children: (0, t.jsx)(L, {
																		value: r
																			? Number(e.price)
																			: Number(e.yearlyPrice),
																		format: {
																			style: "currency",
																			currency: "USD",
																			minimumFractionDigits: 0,
																			maximumFractionDigits: 0,
																		},
																		transformTiming: {
																			duration: 500,
																			easing: "ease-out",
																		},
																		willChange: !0,
																		className:
																			"font-variant-numeric: tabular-nums",
																	}),
																}),
																"Next 3 months" !== e.period &&
																	(0, t.jsxs)("span", {
																		className:
																			"text-sm font-semibold leading-6 tracking-wide text-muted-foreground",
																		children: ["/ ", e.period],
																	}),
															],
														}),
														(0, t.jsx)("p", {
															className:
																"text-xs leading-5 text-muted-foreground",
															children: r
																? "billed monthly"
																: "billed annually",
														}),
														(0, t.jsx)("ul", {
															className: "mt-5 gap-2 flex flex-col",
															children: e.features.map((e, i) =>
																(0, t.jsxs)(
																	"li",
																	{
																		className: "flex items-start gap-2",
																		children: [
																			(0, t.jsx)(B.CheckIcon, {
																				className:
																					"h-4 w-4 text-primary mt-1 shrink-0",
																			}),
																			(0, t.jsx)("span", {
																				className: "text-left",
																				children: e,
																			}),
																		],
																	},
																	i,
																),
															),
														}),
														(0, t.jsx)("hr", { className: "w-full my-4" }),
														(0, t.jsx)(W.Button, {
															onClick: async () => {
																await em.authClient.subscription.upgrade({
																	plan: e.name.toLowerCase(),
																	successUrl: "/dashboard",
																});
															},
															className: (0, ep.cn)(
																(0, W.buttonVariants)({ variant: "outline" }),
																"group relative w-full gap-2 overflow-hidden text-lg font-semibold tracking-tighter",
																"transform-gpu ring-offset-current transition-all duration-300 ease-out hover:ring-2 hover:ring-primary hover:ring-offset-1 hover:bg-primary hover:text-primary-foreground",
																e.isPopular
																	? "bg-primary text-primary-foreground"
																	: "bg-background text-foreground",
															),
															children: e.buttonText,
														}),
														(0, t.jsx)("p", {
															className:
																"mt-6 text-xs leading-5 text-muted-foreground",
															children: e.description,
														}),
													],
												}),
											],
										},
										i,
									),
								),
							}),
						],
					});
				},
			],
			88618,
		);
	},
]);
