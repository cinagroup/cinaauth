(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
	"object" == typeof document ? document.currentScript : void 0,
	61645,
	(e) => {
		"use strict";
		var t = e.i(57319),
			r = e.i(86460);
		let a = Array(12).fill(0),
			n = ({ visible: e, className: r }) =>
				t.default.createElement(
					"div",
					{
						className: ["sonner-loading-wrapper", r].filter(Boolean).join(" "),
						"data-visible": e,
					},
					t.default.createElement(
						"div",
						{ className: "sonner-spinner" },
						a.map((e, r) =>
							t.default.createElement("div", {
								className: "sonner-loading-bar",
								key: `spinner-bar-${r}`,
							}),
						),
					),
				),
			o = t.default.createElement(
				"svg",
				{
					xmlns: "http://www.w3.org/2000/svg",
					viewBox: "0 0 20 20",
					fill: "currentColor",
					height: "20",
					width: "20",
				},
				t.default.createElement("path", {
					fillRule: "evenodd",
					d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z",
					clipRule: "evenodd",
				}),
			),
			i = t.default.createElement(
				"svg",
				{
					xmlns: "http://www.w3.org/2000/svg",
					viewBox: "0 0 24 24",
					fill: "currentColor",
					height: "20",
					width: "20",
				},
				t.default.createElement("path", {
					fillRule: "evenodd",
					d: "M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z",
					clipRule: "evenodd",
				}),
			),
			s = t.default.createElement(
				"svg",
				{
					xmlns: "http://www.w3.org/2000/svg",
					viewBox: "0 0 20 20",
					fill: "currentColor",
					height: "20",
					width: "20",
				},
				t.default.createElement("path", {
					fillRule: "evenodd",
					d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z",
					clipRule: "evenodd",
				}),
			),
			l = t.default.createElement(
				"svg",
				{
					xmlns: "http://www.w3.org/2000/svg",
					viewBox: "0 0 20 20",
					fill: "currentColor",
					height: "20",
					width: "20",
				},
				t.default.createElement("path", {
					fillRule: "evenodd",
					d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z",
					clipRule: "evenodd",
				}),
			),
			u = t.default.createElement(
				"svg",
				{
					xmlns: "http://www.w3.org/2000/svg",
					width: "12",
					height: "12",
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinecap: "round",
					strokeLinejoin: "round",
				},
				t.default.createElement("line", {
					x1: "18",
					y1: "6",
					x2: "6",
					y2: "18",
				}),
				t.default.createElement("line", {
					x1: "6",
					y1: "6",
					x2: "18",
					y2: "18",
				}),
			),
			d = 1,
			c = new (class {
				constructor() {
					(this.subscribe = (e) => (
						this.subscribers.push(e),
						() => {
							const t = this.subscribers.indexOf(e);
							this.subscribers.splice(t, 1);
						}
					)),
						(this.publish = (e) => {
							this.subscribers.forEach((t) => t(e));
						}),
						(this.addToast = (e) => {
							this.publish(e), (this.toasts = [...this.toasts, e]);
						}),
						(this.create = (e) => {
							var t;
							const { message: r, ...a } = e,
								n =
									"number" == typeof (null == e ? void 0 : e.id) ||
									(null == (t = e.id) ? void 0 : t.length) > 0
										? e.id
										: d++,
								o = this.toasts.find((e) => e.id === n),
								i = void 0 === e.dismissible || e.dismissible;
							return (
								this.dismissedToasts.has(n) && this.dismissedToasts.delete(n),
								o
									? (this.toasts = this.toasts.map((t) =>
											t.id === n
												? (this.publish({ ...t, ...e, id: n, title: r }),
													{ ...t, ...e, id: n, dismissible: i, title: r })
												: t,
										))
									: this.addToast({ title: r, ...a, dismissible: i, id: n }),
								n
							);
						}),
						(this.dismiss = (e) => (
							e
								? (this.dismissedToasts.add(e),
									requestAnimationFrame(() =>
										this.subscribers.forEach((t) => t({ id: e, dismiss: !0 })),
									))
								: this.toasts.forEach((e) => {
										this.subscribers.forEach((t) =>
											t({ id: e.id, dismiss: !0 }),
										);
									}),
							e
						)),
						(this.message = (e, t) => this.create({ ...t, message: e })),
						(this.error = (e, t) =>
							this.create({ ...t, message: e, type: "error" })),
						(this.success = (e, t) =>
							this.create({ ...t, type: "success", message: e })),
						(this.info = (e, t) =>
							this.create({ ...t, type: "info", message: e })),
						(this.warning = (e, t) =>
							this.create({ ...t, type: "warning", message: e })),
						(this.loading = (e, t) =>
							this.create({ ...t, type: "loading", message: e })),
						(this.promise = (e, r) => {
							let a, n;
							if (!r) return;
							void 0 !== r.loading &&
								(n = this.create({
									...r,
									promise: e,
									type: "loading",
									message: r.loading,
									description:
										"function" != typeof r.description ? r.description : void 0,
								}));
							let o = Promise.resolve(e instanceof Function ? e() : e),
								i = void 0 !== n,
								s = o
									.then(async (e) => {
										if (((a = ["resolve", e]), t.default.isValidElement(e)))
											(i = !1),
												this.create({ id: n, type: "default", message: e });
										else if (f(e) && !e.ok) {
											i = !1;
											const a =
													"function" == typeof r.error
														? await r.error(`HTTP error! status: ${e.status}`)
														: r.error,
												o =
													"function" == typeof r.description
														? await r.description(
																`HTTP error! status: ${e.status}`,
															)
														: r.description,
												s =
													"object" != typeof a || t.default.isValidElement(a)
														? { message: a }
														: a;
											this.create({
												id: n,
												type: "error",
												description: o,
												...s,
											});
										} else if (e instanceof Error) {
											i = !1;
											const a =
													"function" == typeof r.error
														? await r.error(e)
														: r.error,
												o =
													"function" == typeof r.description
														? await r.description(e)
														: r.description,
												s =
													"object" != typeof a || t.default.isValidElement(a)
														? { message: a }
														: a;
											this.create({
												id: n,
												type: "error",
												description: o,
												...s,
											});
										} else if (void 0 !== r.success) {
											i = !1;
											const a =
													"function" == typeof r.success
														? await r.success(e)
														: r.success,
												o =
													"function" == typeof r.description
														? await r.description(e)
														: r.description,
												s =
													"object" != typeof a || t.default.isValidElement(a)
														? { message: a }
														: a;
											this.create({
												id: n,
												type: "success",
												description: o,
												...s,
											});
										}
									})
									.catch(async (e) => {
										if (((a = ["reject", e]), void 0 !== r.error)) {
											i = !1;
											const a =
													"function" == typeof r.error
														? await r.error(e)
														: r.error,
												o =
													"function" == typeof r.description
														? await r.description(e)
														: r.description,
												s =
													"object" != typeof a || t.default.isValidElement(a)
														? { message: a }
														: a;
											this.create({
												id: n,
												type: "error",
												description: o,
												...s,
											});
										}
									})
									.finally(() => {
										i && (this.dismiss(n), (n = void 0)),
											null == r.finally || r.finally.call(r);
									}),
								l = () =>
									new Promise((e, t) =>
										s
											.then(() => ("reject" === a[0] ? t(a[1]) : e(a[1])))
											.catch(t),
									);
							return "string" != typeof n && "number" != typeof n
								? { unwrap: l }
								: Object.assign(n, { unwrap: l });
						}),
						(this.custom = (e, t) => {
							const r = (null == t ? void 0 : t.id) || d++;
							return this.create({ jsx: e(r), id: r, ...t }), r;
						}),
						(this.getActiveToasts = () =>
							this.toasts.filter((e) => !this.dismissedToasts.has(e.id))),
						(this.subscribers = []),
						(this.toasts = []),
						(this.dismissedToasts = new Set());
				}
			})(),
			f = (e) =>
				e &&
				"object" == typeof e &&
				"ok" in e &&
				"boolean" == typeof e.ok &&
				"status" in e &&
				"number" == typeof e.status,
			p = Object.assign(
				(e, t) => {
					const r = (null == t ? void 0 : t.id) || d++;
					return c.addToast({ title: e, ...t, id: r }), r;
				},
				{
					success: c.success,
					info: c.info,
					warning: c.warning,
					error: c.error,
					custom: c.custom,
					message: c.message,
					promise: c.promise,
					dismiss: c.dismiss,
					loading: c.loading,
				},
				{ getHistory: () => c.toasts, getToasts: () => c.getActiveToasts() },
			);
		function h(e) {
			return void 0 !== e.label;
		}
		function E(...e) {
			return e.filter(Boolean).join(" ");
		}
		!(function (e) {
			if (!e || "u" < typeof document) return;
			const t = document.head || document.getElementsByTagName("head")[0],
				r = document.createElement("style");
			(r.type = "text/css"),
				t.appendChild(r),
				r.styleSheet
					? (r.styleSheet.cssText = e)
					: r.appendChild(document.createTextNode(e));
		})(
			"[data-sonner-toaster][dir=ltr],html[dir=ltr]{--toast-icon-margin-start:-3px;--toast-icon-margin-end:4px;--toast-svg-margin-start:-1px;--toast-svg-margin-end:0px;--toast-button-margin-start:auto;--toast-button-margin-end:0;--toast-close-button-start:0;--toast-close-button-end:unset;--toast-close-button-transform:translate(-35%, -35%)}[data-sonner-toaster][dir=rtl],html[dir=rtl]{--toast-icon-margin-start:4px;--toast-icon-margin-end:-3px;--toast-svg-margin-start:0px;--toast-svg-margin-end:-1px;--toast-button-margin-start:0;--toast-button-margin-end:auto;--toast-close-button-start:unset;--toast-close-button-end:0;--toast-close-button-transform:translate(35%, -35%)}[data-sonner-toaster]{position:fixed;width:var(--width);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;--gray1:hsl(0, 0%, 99%);--gray2:hsl(0, 0%, 97.3%);--gray3:hsl(0, 0%, 95.1%);--gray4:hsl(0, 0%, 93%);--gray5:hsl(0, 0%, 90.9%);--gray6:hsl(0, 0%, 88.7%);--gray7:hsl(0, 0%, 85.8%);--gray8:hsl(0, 0%, 78%);--gray9:hsl(0, 0%, 56.1%);--gray10:hsl(0, 0%, 52.3%);--gray11:hsl(0, 0%, 43.5%);--gray12:hsl(0, 0%, 9%);--border-radius:8px;box-sizing:border-box;padding:0;margin:0;list-style:none;outline:0;z-index:999999999;transition:transform .4s ease}@media (hover:none) and (pointer:coarse){[data-sonner-toaster][data-lifted=true]{transform:none}}[data-sonner-toaster][data-x-position=right]{right:var(--offset-right)}[data-sonner-toaster][data-x-position=left]{left:var(--offset-left)}[data-sonner-toaster][data-x-position=center]{left:50%;transform:translateX(-50%)}[data-sonner-toaster][data-y-position=top]{top:var(--offset-top)}[data-sonner-toaster][data-y-position=bottom]{bottom:var(--offset-bottom)}[data-sonner-toast]{--y:translateY(100%);--lift-amount:calc(var(--lift) * var(--gap));z-index:var(--z-index);position:absolute;opacity:0;transform:var(--y);touch-action:none;transition:transform .4s,opacity .4s,height .4s,box-shadow .2s;box-sizing:border-box;outline:0;overflow-wrap:anywhere}[data-sonner-toast][data-styled=true]{padding:16px;background:var(--normal-bg);border:1px solid var(--normal-border);color:var(--normal-text);border-radius:var(--border-radius);box-shadow:0 4px 12px rgba(0,0,0,.1);width:var(--width);font-size:13px;display:flex;align-items:center;gap:6px}[data-sonner-toast]:focus-visible{box-shadow:0 4px 12px rgba(0,0,0,.1),0 0 0 2px rgba(0,0,0,.2)}[data-sonner-toast][data-y-position=top]{top:0;--y:translateY(-100%);--lift:1;--lift-amount:calc(1 * var(--gap))}[data-sonner-toast][data-y-position=bottom]{bottom:0;--y:translateY(100%);--lift:-1;--lift-amount:calc(var(--lift) * var(--gap))}[data-sonner-toast][data-styled=true] [data-description]{font-weight:400;line-height:1.4;color:#3f3f3f}[data-rich-colors=true][data-sonner-toast][data-styled=true] [data-description]{color:inherit}[data-sonner-toaster][data-sonner-theme=dark] [data-description]{color:#e8e8e8}[data-sonner-toast][data-styled=true] [data-title]{font-weight:500;line-height:1.5;color:inherit}[data-sonner-toast][data-styled=true] [data-icon]{display:flex;height:16px;width:16px;position:relative;justify-content:flex-start;align-items:center;flex-shrink:0;margin-left:var(--toast-icon-margin-start);margin-right:var(--toast-icon-margin-end)}[data-sonner-toast][data-promise=true] [data-icon]>svg{opacity:0;transform:scale(.8);transform-origin:center;animation:sonner-fade-in .3s ease forwards}[data-sonner-toast][data-styled=true] [data-icon]>*{flex-shrink:0}[data-sonner-toast][data-styled=true] [data-icon] svg{margin-left:var(--toast-svg-margin-start);margin-right:var(--toast-svg-margin-end)}[data-sonner-toast][data-styled=true] [data-content]{display:flex;flex-direction:column;gap:2px}[data-sonner-toast][data-styled=true] [data-button]{border-radius:4px;padding-left:8px;padding-right:8px;height:24px;font-size:12px;color:var(--normal-bg);background:var(--normal-text);margin-left:var(--toast-button-margin-start);margin-right:var(--toast-button-margin-end);border:none;font-weight:500;cursor:pointer;outline:0;display:flex;align-items:center;flex-shrink:0;transition:opacity .4s,box-shadow .2s}[data-sonner-toast][data-styled=true] [data-button]:focus-visible{box-shadow:0 0 0 2px rgba(0,0,0,.4)}[data-sonner-toast][data-styled=true] [data-button]:first-of-type{margin-left:var(--toast-button-margin-start);margin-right:var(--toast-button-margin-end)}[data-sonner-toast][data-styled=true] [data-cancel]{color:var(--normal-text);background:rgba(0,0,0,.08)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast][data-styled=true] [data-cancel]{background:rgba(255,255,255,.3)}[data-sonner-toast][data-styled=true] [data-close-button]{position:absolute;left:var(--toast-close-button-start);right:var(--toast-close-button-end);top:0;height:20px;width:20px;display:flex;justify-content:center;align-items:center;padding:0;color:var(--gray12);background:var(--normal-bg);border:1px solid var(--gray4);transform:var(--toast-close-button-transform);border-radius:50%;cursor:pointer;z-index:1;transition:opacity .1s,background .2s,border-color .2s}[data-sonner-toast][data-styled=true] [data-close-button]:focus-visible{box-shadow:0 4px 12px rgba(0,0,0,.1),0 0 0 2px rgba(0,0,0,.2)}[data-sonner-toast][data-styled=true] [data-disabled=true]{cursor:not-allowed}[data-sonner-toast][data-styled=true]:hover [data-close-button]:hover{background:var(--gray2);border-color:var(--gray5)}[data-sonner-toast][data-swiping=true]::before{content:'';position:absolute;left:-100%;right:-100%;height:100%;z-index:-1}[data-sonner-toast][data-y-position=top][data-swiping=true]::before{bottom:50%;transform:scaleY(3) translateY(50%)}[data-sonner-toast][data-y-position=bottom][data-swiping=true]::before{top:50%;transform:scaleY(3) translateY(-50%)}[data-sonner-toast][data-swiping=false][data-removed=true]::before{content:'';position:absolute;inset:0;transform:scaleY(2)}[data-sonner-toast][data-expanded=true]::after{content:'';position:absolute;left:0;height:calc(var(--gap) + 1px);bottom:100%;width:100%}[data-sonner-toast][data-mounted=true]{--y:translateY(0);opacity:1}[data-sonner-toast][data-expanded=false][data-front=false]{--scale:var(--toasts-before) * 0.05 + 1;--y:translateY(calc(var(--lift-amount) * var(--toasts-before))) scale(calc(-1 * var(--scale)));height:var(--front-toast-height)}[data-sonner-toast]>*{transition:opacity .4s}[data-sonner-toast][data-x-position=right]{right:0}[data-sonner-toast][data-x-position=left]{left:0}[data-sonner-toast][data-expanded=false][data-front=false][data-styled=true]>*{opacity:0}[data-sonner-toast][data-visible=false]{opacity:0;pointer-events:none}[data-sonner-toast][data-mounted=true][data-expanded=true]{--y:translateY(calc(var(--lift) * var(--offset)));height:var(--initial-height)}[data-sonner-toast][data-removed=true][data-front=true][data-swipe-out=false]{--y:translateY(calc(var(--lift) * -100%));opacity:0}[data-sonner-toast][data-removed=true][data-front=false][data-swipe-out=false][data-expanded=true]{--y:translateY(calc(var(--lift) * var(--offset) + var(--lift) * -100%));opacity:0}[data-sonner-toast][data-removed=true][data-front=false][data-swipe-out=false][data-expanded=false]{--y:translateY(40%);opacity:0;transition:transform .5s,opacity .2s}[data-sonner-toast][data-removed=true][data-front=false]::before{height:calc(var(--initial-height) + 20%)}[data-sonner-toast][data-swiping=true]{transform:var(--y) translateY(var(--swipe-amount-y,0)) translateX(var(--swipe-amount-x,0));transition:none}[data-sonner-toast][data-swiped=true]{user-select:none}[data-sonner-toast][data-swipe-out=true][data-y-position=bottom],[data-sonner-toast][data-swipe-out=true][data-y-position=top]{animation-duration:.2s;animation-timing-function:ease-out;animation-fill-mode:forwards}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=left]{animation-name:swipe-out-left}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=right]{animation-name:swipe-out-right}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=up]{animation-name:swipe-out-up}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=down]{animation-name:swipe-out-down}@keyframes swipe-out-left{from{transform:var(--y) translateX(var(--swipe-amount-x));opacity:1}to{transform:var(--y) translateX(calc(var(--swipe-amount-x) - 100%));opacity:0}}@keyframes swipe-out-right{from{transform:var(--y) translateX(var(--swipe-amount-x));opacity:1}to{transform:var(--y) translateX(calc(var(--swipe-amount-x) + 100%));opacity:0}}@keyframes swipe-out-up{from{transform:var(--y) translateY(var(--swipe-amount-y));opacity:1}to{transform:var(--y) translateY(calc(var(--swipe-amount-y) - 100%));opacity:0}}@keyframes swipe-out-down{from{transform:var(--y) translateY(var(--swipe-amount-y));opacity:1}to{transform:var(--y) translateY(calc(var(--swipe-amount-y) + 100%));opacity:0}}@media (max-width:600px){[data-sonner-toaster]{position:fixed;right:var(--mobile-offset-right);left:var(--mobile-offset-left);width:100%}[data-sonner-toaster][dir=rtl]{left:calc(var(--mobile-offset-left) * -1)}[data-sonner-toaster] [data-sonner-toast]{left:0;right:0;width:calc(100% - var(--mobile-offset-left) * 2)}[data-sonner-toaster][data-x-position=left]{left:var(--mobile-offset-left)}[data-sonner-toaster][data-y-position=bottom]{bottom:var(--mobile-offset-bottom)}[data-sonner-toaster][data-y-position=top]{top:var(--mobile-offset-top)}[data-sonner-toaster][data-x-position=center]{left:var(--mobile-offset-left);right:var(--mobile-offset-right);transform:none}}[data-sonner-toaster][data-sonner-theme=light]{--normal-bg:#fff;--normal-border:var(--gray4);--normal-text:var(--gray12);--success-bg:hsl(143, 85%, 96%);--success-border:hsl(145, 92%, 87%);--success-text:hsl(140, 100%, 27%);--info-bg:hsl(208, 100%, 97%);--info-border:hsl(221, 91%, 93%);--info-text:hsl(210, 92%, 45%);--warning-bg:hsl(49, 100%, 97%);--warning-border:hsl(49, 91%, 84%);--warning-text:hsl(31, 92%, 45%);--error-bg:hsl(359, 100%, 97%);--error-border:hsl(359, 100%, 94%);--error-text:hsl(360, 100%, 45%)}[data-sonner-toaster][data-sonner-theme=light] [data-sonner-toast][data-invert=true]{--normal-bg:#000;--normal-border:hsl(0, 0%, 20%);--normal-text:var(--gray1)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast][data-invert=true]{--normal-bg:#fff;--normal-border:var(--gray3);--normal-text:var(--gray12)}[data-sonner-toaster][data-sonner-theme=dark]{--normal-bg:#000;--normal-bg-hover:hsl(0, 0%, 12%);--normal-border:hsl(0, 0%, 20%);--normal-border-hover:hsl(0, 0%, 25%);--normal-text:var(--gray1);--success-bg:hsl(150, 100%, 6%);--success-border:hsl(147, 100%, 12%);--success-text:hsl(150, 86%, 65%);--info-bg:hsl(215, 100%, 6%);--info-border:hsl(223, 43%, 17%);--info-text:hsl(216, 87%, 65%);--warning-bg:hsl(64, 100%, 6%);--warning-border:hsl(60, 100%, 9%);--warning-text:hsl(46, 87%, 65%);--error-bg:hsl(358, 76%, 10%);--error-border:hsl(357, 89%, 16%);--error-text:hsl(358, 100%, 81%)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast] [data-close-button]{background:var(--normal-bg);border-color:var(--normal-border);color:var(--normal-text)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast] [data-close-button]:hover{background:var(--normal-bg-hover);border-color:var(--normal-border-hover)}[data-rich-colors=true][data-sonner-toast][data-type=success]{background:var(--success-bg);border-color:var(--success-border);color:var(--success-text)}[data-rich-colors=true][data-sonner-toast][data-type=success] [data-close-button]{background:var(--success-bg);border-color:var(--success-border);color:var(--success-text)}[data-rich-colors=true][data-sonner-toast][data-type=info]{background:var(--info-bg);border-color:var(--info-border);color:var(--info-text)}[data-rich-colors=true][data-sonner-toast][data-type=info] [data-close-button]{background:var(--info-bg);border-color:var(--info-border);color:var(--info-text)}[data-rich-colors=true][data-sonner-toast][data-type=warning]{background:var(--warning-bg);border-color:var(--warning-border);color:var(--warning-text)}[data-rich-colors=true][data-sonner-toast][data-type=warning] [data-close-button]{background:var(--warning-bg);border-color:var(--warning-border);color:var(--warning-text)}[data-rich-colors=true][data-sonner-toast][data-type=error]{background:var(--error-bg);border-color:var(--error-border);color:var(--error-text)}[data-rich-colors=true][data-sonner-toast][data-type=error] [data-close-button]{background:var(--error-bg);border-color:var(--error-border);color:var(--error-text)}.sonner-loading-wrapper{--size:16px;height:var(--size);width:var(--size);position:absolute;inset:0;z-index:10}.sonner-loading-wrapper[data-visible=false]{transform-origin:center;animation:sonner-fade-out .2s ease forwards}.sonner-spinner{position:relative;top:50%;left:50%;height:var(--size);width:var(--size)}.sonner-loading-bar{animation:sonner-spin 1.2s linear infinite;background:var(--gray11);border-radius:6px;height:8%;left:-10%;position:absolute;top:-3.9%;width:24%}.sonner-loading-bar:first-child{animation-delay:-1.2s;transform:rotate(.0001deg) translate(146%)}.sonner-loading-bar:nth-child(2){animation-delay:-1.1s;transform:rotate(30deg) translate(146%)}.sonner-loading-bar:nth-child(3){animation-delay:-1s;transform:rotate(60deg) translate(146%)}.sonner-loading-bar:nth-child(4){animation-delay:-.9s;transform:rotate(90deg) translate(146%)}.sonner-loading-bar:nth-child(5){animation-delay:-.8s;transform:rotate(120deg) translate(146%)}.sonner-loading-bar:nth-child(6){animation-delay:-.7s;transform:rotate(150deg) translate(146%)}.sonner-loading-bar:nth-child(7){animation-delay:-.6s;transform:rotate(180deg) translate(146%)}.sonner-loading-bar:nth-child(8){animation-delay:-.5s;transform:rotate(210deg) translate(146%)}.sonner-loading-bar:nth-child(9){animation-delay:-.4s;transform:rotate(240deg) translate(146%)}.sonner-loading-bar:nth-child(10){animation-delay:-.3s;transform:rotate(270deg) translate(146%)}.sonner-loading-bar:nth-child(11){animation-delay:-.2s;transform:rotate(300deg) translate(146%)}.sonner-loading-bar:nth-child(12){animation-delay:-.1s;transform:rotate(330deg) translate(146%)}@keyframes sonner-fade-in{0%{opacity:0;transform:scale(.8)}100%{opacity:1;transform:scale(1)}}@keyframes sonner-fade-out{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.8)}}@keyframes sonner-spin{0%{opacity:1}100%{opacity:.15}}@media (prefers-reduced-motion){.sonner-loading-bar,[data-sonner-toast],[data-sonner-toast]>*{transition:none!important;animation:none!important}}.sonner-loader{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);transform-origin:center;transition:opacity .2s,transform .2s}.sonner-loader[data-visible=false]{opacity:0;transform:scale(.8) translate(-50%,-50%)}",
		);
		const m = (e) => {
			var r, a, d, c, f, p, m, g, _, O, T, R, b;
			const {
					invert: A,
					toast: v,
					unstyled: y,
					interacting: I,
					setHeights: w,
					visibleToasts: N,
					heights: S,
					index: L,
					toasts: U,
					expanded: D,
					removeToast: C,
					defaultRichColors: x,
					closeButton: P,
					style: M,
					cancelButtonStyle: k,
					actionButtonStyle: Y,
					className: B = "",
					descriptionClassName: F = "",
					duration: H,
					position: V,
					gap: $,
					expandByDefault: z,
					classNames: j,
					icons: G,
					closeButtonAriaLabel: W = "Close toast",
				} = e,
				[q, K] = t.default.useState(null),
				[X, Z] = t.default.useState(null),
				[J, Q] = t.default.useState(!1),
				[ee, et] = t.default.useState(!1),
				[er, ea] = t.default.useState(!1),
				[en, eo] = t.default.useState(!1),
				[ei, es] = t.default.useState(!1),
				[el, eu] = t.default.useState(0),
				[ed, ec] = t.default.useState(0),
				ef = t.default.useRef(v.duration || H || 4e3),
				ep = t.default.useRef(null),
				eh = t.default.useRef(null),
				eE = 0 === L,
				em = L + 1 <= N,
				eg = v.type,
				e_ = !1 !== v.dismissible,
				eO = v.className || "",
				eT = v.descriptionClassName || "",
				eR = t.default.useMemo(
					() => S.findIndex((e) => e.toastId === v.id) || 0,
					[S, v.id],
				),
				eb = t.default.useMemo(() => {
					var e;
					return null != (e = v.closeButton) ? e : P;
				}, [v.closeButton, P]),
				eA = t.default.useMemo(() => v.duration || H || 4e3, [v.duration, H]),
				ev = t.default.useRef(0),
				ey = t.default.useRef(0),
				eI = t.default.useRef(0),
				ew = t.default.useRef(null),
				[eN, eS] = V.split("-"),
				eL = t.default.useMemo(
					() => S.reduce((e, t, r) => (r >= eR ? e : e + t.height), 0),
					[S, eR],
				),
				eU = (() => {
					const [e, r] = t.default.useState(document.hidden);
					return (
						t.default.useEffect(() => {
							const e = () => {
								r(document.hidden);
							};
							return (
								document.addEventListener("visibilitychange", e),
								() => window.removeEventListener("visibilitychange", e)
							);
						}, []),
						e
					);
				})(),
				eD = v.invert || A,
				eC = "loading" === eg;
			(ey.current = t.default.useMemo(() => eR * $ + eL, [eR, eL])),
				t.default.useEffect(() => {
					ef.current = eA;
				}, [eA]),
				t.default.useEffect(() => {
					Q(!0);
				}, []),
				t.default.useEffect(() => {
					const e = eh.current;
					if (e) {
						const t = e.getBoundingClientRect().height;
						return (
							ec(t),
							w((e) => [
								{ toastId: v.id, height: t, position: v.position },
								...e,
							]),
							() => w((e) => e.filter((e) => e.toastId !== v.id))
						);
					}
				}, [w, v.id]),
				t.default.useLayoutEffect(() => {
					if (!J) return;
					const e = eh.current,
						t = e.style.height;
					e.style.height = "auto";
					const r = e.getBoundingClientRect().height;
					(e.style.height = t),
						ec(r),
						w((e) =>
							e.find((e) => e.toastId === v.id)
								? e.map((e) => (e.toastId === v.id ? { ...e, height: r } : e))
								: [{ toastId: v.id, height: r, position: v.position }, ...e],
						);
				}, [J, v.title, v.description, w, v.id, v.jsx, v.action, v.cancel]);
			const ex = t.default.useCallback(() => {
				et(!0),
					eu(ey.current),
					w((e) => e.filter((e) => e.toastId !== v.id)),
					setTimeout(() => {
						C(v);
					}, 200);
			}, [v, C, w, ey]);
			t.default.useEffect(() => {
				let e;
				if (
					(!v.promise || "loading" !== eg) &&
					v.duration !== 1 / 0 &&
					"loading" !== v.type
				) {
					if (D || I || eU) {
						if (eI.current < ev.current) {
							const e = new Date().getTime() - ev.current;
							ef.current = ef.current - e;
						}
						eI.current = new Date().getTime();
					} else
						ef.current !== 1 / 0 &&
							((ev.current = new Date().getTime()),
							(e = setTimeout(() => {
								null == v.onAutoClose || v.onAutoClose.call(v, v), ex();
							}, ef.current)));
					return () => clearTimeout(e);
				}
			}, [D, I, v, eg, eU, ex]),
				t.default.useEffect(() => {
					v.delete && (ex(), null == v.onDismiss || v.onDismiss.call(v, v));
				}, [ex, v.delete]);
			const eP =
				v.icon ||
				(null == G ? void 0 : G[eg]) ||
				((e) => {
					switch (e) {
						case "success":
							return o;
						case "info":
							return s;
						case "warning":
							return i;
						case "error":
							return l;
						default:
							return null;
					}
				})(eg);
			return t.default.createElement(
				"li",
				{
					tabIndex: 0,
					ref: eh,
					className: E(
						B,
						eO,
						null == j ? void 0 : j.toast,
						null == v || null == (r = v.classNames) ? void 0 : r.toast,
						null == j ? void 0 : j.default,
						null == j ? void 0 : j[eg],
						null == v || null == (a = v.classNames) ? void 0 : a[eg],
					),
					"data-sonner-toast": "",
					"data-rich-colors": null != (O = v.richColors) ? O : x,
					"data-styled": !(v.jsx || v.unstyled || y),
					"data-mounted": J,
					"data-promise": !!v.promise,
					"data-swiped": ei,
					"data-removed": ee,
					"data-visible": em,
					"data-y-position": eN,
					"data-x-position": eS,
					"data-index": L,
					"data-front": eE,
					"data-swiping": er,
					"data-dismissible": e_,
					"data-type": eg,
					"data-invert": eD,
					"data-swipe-out": en,
					"data-swipe-direction": X,
					"data-expanded": !!(D || (z && J)),
					"data-testid": v.testId,
					style: {
						"--index": L,
						"--toasts-before": L,
						"--z-index": U.length - L,
						"--offset": `${ee ? el : ey.current}px`,
						"--initial-height": z ? "auto" : `${ed}px`,
						...M,
						...v.style,
					},
					onDragEnd: () => {
						ea(!1), K(null), (ew.current = null);
					},
					onPointerDown: (e) => {
						2 === e.button ||
							eC ||
							!e_ ||
							((ep.current = new Date()),
							eu(ey.current),
							e.target.setPointerCapture(e.pointerId),
							"BUTTON" !== e.target.tagName &&
								(ea(!0), (ew.current = { x: e.clientX, y: e.clientY })));
					},
					onPointerUp: () => {
						var e, t, r, a, n;
						if (en || !e_) return;
						ew.current = null;
						const o = Number(
								(null == (e = eh.current)
									? void 0
									: e.style
											.getPropertyValue("--swipe-amount-x")
											.replace("px", "")) || 0,
							),
							i = Number(
								(null == (t = eh.current)
									? void 0
									: t.style
											.getPropertyValue("--swipe-amount-y")
											.replace("px", "")) || 0,
							),
							s =
								new Date().getTime() -
								(null == (r = ep.current) ? void 0 : r.getTime()),
							l = "x" === q ? o : i,
							u = Math.abs(l) / s;
						if (Math.abs(l) >= 45 || u > 0.11) {
							eu(ey.current),
								null == v.onDismiss || v.onDismiss.call(v, v),
								"x" === q
									? Z(o > 0 ? "right" : "left")
									: Z(i > 0 ? "down" : "up"),
								ex(),
								eo(!0);
							return;
						}
						null == (a = eh.current) ||
							a.style.setProperty("--swipe-amount-x", "0px"),
							null == (n = eh.current) ||
								n.style.setProperty("--swipe-amount-y", "0px"),
							es(!1),
							ea(!1),
							K(null);
					},
					onPointerMove: (t) => {
						var r, a, n, o;
						if (
							!ew.current ||
							!e_ ||
							(null == (r = window.getSelection())
								? void 0
								: r.toString().length) > 0
						)
							return;
						const i = t.clientY - ew.current.y,
							s = t.clientX - ew.current.x,
							l =
								null != (o = e.swipeDirections)
									? o
									: (function (e) {
											const [t, r] = e.split("-"),
												a = [];
											return t && a.push(t), r && a.push(r), a;
										})(V);
						!q &&
							(Math.abs(s) > 1 || Math.abs(i) > 1) &&
							K(Math.abs(s) > Math.abs(i) ? "x" : "y");
						const u = { x: 0, y: 0 },
							d = (e) => 1 / (1.5 + Math.abs(e) / 20);
						if ("y" === q) {
							if (l.includes("top") || l.includes("bottom"))
								if (
									(l.includes("top") && i < 0) ||
									(l.includes("bottom") && i > 0)
								)
									u.y = i;
								else {
									const e = i * d(i);
									u.y = Math.abs(e) < Math.abs(i) ? e : i;
								}
						} else if ("x" === q && (l.includes("left") || l.includes("right")))
							if (
								(l.includes("left") && s < 0) ||
								(l.includes("right") && s > 0)
							)
								u.x = s;
							else {
								const e = s * d(s);
								u.x = Math.abs(e) < Math.abs(s) ? e : s;
							}
						(Math.abs(u.x) > 0 || Math.abs(u.y) > 0) && es(!0),
							null == (a = eh.current) ||
								a.style.setProperty("--swipe-amount-x", `${u.x}px`),
							null == (n = eh.current) ||
								n.style.setProperty("--swipe-amount-y", `${u.y}px`);
					},
				},
				eb && !v.jsx && "loading" !== eg
					? t.default.createElement(
							"button",
							{
								"aria-label": W,
								"data-disabled": eC,
								"data-close-button": !0,
								onClick:
									eC || !e_
										? () => {}
										: () => {
												ex(), null == v.onDismiss || v.onDismiss.call(v, v);
											},
								className: E(
									null == j ? void 0 : j.closeButton,
									null == v || null == (d = v.classNames)
										? void 0
										: d.closeButton,
								),
							},
							null != (T = null == G ? void 0 : G.close) ? T : u,
						)
					: null,
				(eg || v.icon || v.promise) &&
					null !== v.icon &&
					((null == G ? void 0 : G[eg]) !== null || v.icon)
					? t.default.createElement(
							"div",
							{
								"data-icon": "",
								className: E(
									null == j ? void 0 : j.icon,
									null == v || null == (c = v.classNames) ? void 0 : c.icon,
								),
							},
							v.promise || ("loading" === v.type && !v.icon)
								? v.icon ||
										((null == G ? void 0 : G.loading)
											? t.default.createElement(
													"div",
													{
														className: E(
															null == j ? void 0 : j.loader,
															null == v || null == (b = v.classNames)
																? void 0
																: b.loader,
															"sonner-loader",
														),
														"data-visible": "loading" === eg,
													},
													G.loading,
												)
											: t.default.createElement(n, {
													className: E(
														null == j ? void 0 : j.loader,
														null == v || null == (R = v.classNames)
															? void 0
															: R.loader,
													),
													visible: "loading" === eg,
												}))
								: null,
							"loading" !== v.type ? eP : null,
						)
					: null,
				t.default.createElement(
					"div",
					{
						"data-content": "",
						className: E(
							null == j ? void 0 : j.content,
							null == v || null == (f = v.classNames) ? void 0 : f.content,
						),
					},
					t.default.createElement(
						"div",
						{
							"data-title": "",
							className: E(
								null == j ? void 0 : j.title,
								null == v || null == (p = v.classNames) ? void 0 : p.title,
							),
						},
						v.jsx ? v.jsx : "function" == typeof v.title ? v.title() : v.title,
					),
					v.description
						? t.default.createElement(
								"div",
								{
									"data-description": "",
									className: E(
										F,
										eT,
										null == j ? void 0 : j.description,
										null == v || null == (m = v.classNames)
											? void 0
											: m.description,
									),
								},
								"function" == typeof v.description
									? v.description()
									: v.description,
							)
						: null,
				),
				t.default.isValidElement(v.cancel)
					? v.cancel
					: v.cancel && h(v.cancel)
						? t.default.createElement(
								"button",
								{
									"data-button": !0,
									"data-cancel": !0,
									style: v.cancelButtonStyle || k,
									onClick: (e) => {
										!h(v.cancel) ||
											(e_ &&
												(null == v.cancel.onClick ||
													v.cancel.onClick.call(v.cancel, e),
												ex()));
									},
									className: E(
										null == j ? void 0 : j.cancelButton,
										null == v || null == (g = v.classNames)
											? void 0
											: g.cancelButton,
									),
								},
								v.cancel.label,
							)
						: null,
				t.default.isValidElement(v.action)
					? v.action
					: v.action && h(v.action)
						? t.default.createElement(
								"button",
								{
									"data-button": !0,
									"data-action": !0,
									style: v.actionButtonStyle || Y,
									onClick: (e) => {
										!h(v.action) ||
											(null == v.action.onClick ||
												v.action.onClick.call(v.action, e),
											e.defaultPrevented || ex());
									},
									className: E(
										null == j ? void 0 : j.actionButton,
										null == v || null == (_ = v.classNames)
											? void 0
											: _.actionButton,
									),
								},
								v.action.label,
							)
						: null,
			);
		};
		function g() {
			if ("u" < typeof window || "u" < typeof document) return "ltr";
			const e = document.documentElement.getAttribute("dir");
			return "auto" !== e && e
				? e
				: window.getComputedStyle(document.documentElement).direction;
		}
		const _ = t.default.forwardRef(function (e, a) {
			const {
					id: n,
					invert: o,
					position: i = "bottom-right",
					hotkey: s = ["altKey", "KeyT"],
					expand: l,
					closeButton: u,
					className: d,
					offset: f,
					mobileOffset: p,
					theme: h = "light",
					richColors: E,
					duration: _,
					style: O,
					visibleToasts: T = 3,
					toastOptions: R,
					dir: b = g(),
					gap: A = 14,
					icons: v,
					containerAriaLabel: y = "Notifications",
				} = e,
				[I, w] = t.default.useState([]),
				N = t.default.useMemo(
					() =>
						n
							? I.filter((e) => e.toasterId === n)
							: I.filter((e) => !e.toasterId),
					[I, n],
				),
				S = t.default.useMemo(
					() =>
						Array.from(
							new Set(
								[i].concat(N.filter((e) => e.position).map((e) => e.position)),
							),
						),
					[N, i],
				),
				[L, U] = t.default.useState([]),
				[D, C] = t.default.useState(!1),
				[x, P] = t.default.useState(!1),
				[M, k] = t.default.useState(
					"system" !== h
						? h
						: "u" > typeof window &&
								window.matchMedia &&
								window.matchMedia("(prefers-color-scheme: dark)").matches
							? "dark"
							: "light",
				),
				Y = t.default.useRef(null),
				B = s.join("+").replace(/Key/g, "").replace(/Digit/g, ""),
				F = t.default.useRef(null),
				H = t.default.useRef(!1),
				V = t.default.useCallback((e) => {
					w((t) => {
						var r;
						return (
							(null == (r = t.find((t) => t.id === e.id))
								? void 0
								: r.delete) || c.dismiss(e.id),
							t.filter(({ id: t }) => t !== e.id)
						);
					});
				}, []);
			return (
				t.default.useEffect(
					() =>
						c.subscribe((e) => {
							e.dismiss
								? requestAnimationFrame(() => {
										w((t) =>
											t.map((t) => (t.id === e.id ? { ...t, delete: !0 } : t)),
										);
									})
								: setTimeout(() => {
										r.default.flushSync(() => {
											w((t) => {
												const r = t.findIndex((t) => t.id === e.id);
												return -1 !== r
													? [
															...t.slice(0, r),
															{ ...t[r], ...e },
															...t.slice(r + 1),
														]
													: [e, ...t];
											});
										});
									});
						}),
					[I],
				),
				t.default.useEffect(() => {
					if ("system" !== h) return void k(h);
					if (
						("system" === h &&
							(window.matchMedia &&
							window.matchMedia("(prefers-color-scheme: dark)").matches
								? k("dark")
								: k("light")),
						"u" < typeof window)
					)
						return;
					const e = window.matchMedia("(prefers-color-scheme: dark)");
					try {
						e.addEventListener("change", ({ matches: e }) => {
							e ? k("dark") : k("light");
						});
					} catch (t) {
						e.addListener(({ matches: e }) => {
							try {
								e ? k("dark") : k("light");
							} catch (e) {
								console.error(e);
							}
						});
					}
				}, [h]),
				t.default.useEffect(() => {
					I.length <= 1 && C(!1);
				}, [I]),
				t.default.useEffect(() => {
					const e = (e) => {
						var t, r;
						s.every((t) => e[t] || e.code === t) &&
							(C(!0), null == (r = Y.current) || r.focus()),
							"Escape" === e.code &&
								(document.activeElement === Y.current ||
									(null == (t = Y.current)
										? void 0
										: t.contains(document.activeElement))) &&
								C(!1);
					};
					return (
						document.addEventListener("keydown", e),
						() => document.removeEventListener("keydown", e)
					);
				}, [s]),
				t.default.useEffect(() => {
					if (Y.current)
						return () => {
							F.current &&
								(F.current.focus({ preventScroll: !0 }),
								(F.current = null),
								(H.current = !1));
						};
				}, [Y.current]),
				t.default.createElement(
					"section",
					{
						ref: a,
						"aria-label": `${y} ${B}`,
						tabIndex: -1,
						"aria-live": "polite",
						"aria-relevant": "additions text",
						"aria-atomic": "false",
						suppressHydrationWarning: !0,
					},
					S.map((r, a) => {
						var n;
						let i,
							[s, c] = r.split("-");
						return N.length
							? t.default.createElement(
									"ol",
									{
										key: r,
										dir: "auto" === b ? g() : b,
										tabIndex: -1,
										ref: Y,
										className: d,
										"data-sonner-toaster": !0,
										"data-sonner-theme": M,
										"data-y-position": s,
										"data-x-position": c,
										style: {
											"--front-toast-height": `${(null == (n = L[0]) ? void 0 : n.height) || 0}px`,
											"--width": "356px",
											"--gap": `${A}px`,
											...O,
											...((i = {}),
											[f, p].forEach((e, t) => {
												const r = 1 === t,
													a = r ? "--mobile-offset" : "--offset",
													n = r ? "16px" : "24px";
												function o(e) {
													["top", "right", "bottom", "left"].forEach((t) => {
														i[`${a}-${t}`] =
															"number" == typeof e ? `${e}px` : e;
													});
												}
												"number" == typeof e || "string" == typeof e
													? o(e)
													: "object" == typeof e
														? ["top", "right", "bottom", "left"].forEach(
																(t) => {
																	void 0 === e[t]
																		? (i[`${a}-${t}`] = n)
																		: (i[`${a}-${t}`] =
																				"number" == typeof e[t]
																					? `${e[t]}px`
																					: e[t]);
																},
															)
														: o(n);
											}),
											i),
										},
										onBlur: (e) => {
											H.current &&
												!e.currentTarget.contains(e.relatedTarget) &&
												((H.current = !1),
												F.current &&
													(F.current.focus({ preventScroll: !0 }),
													(F.current = null)));
										},
										onFocus: (e) => {
											!(
												e.target instanceof HTMLElement &&
												"false" === e.target.dataset.dismissible
											) &&
												(H.current ||
													((H.current = !0), (F.current = e.relatedTarget)));
										},
										onMouseEnter: () => C(!0),
										onMouseMove: () => C(!0),
										onMouseLeave: () => {
											x || C(!1);
										},
										onDragEnd: () => C(!1),
										onPointerDown: (e) => {
											(e.target instanceof HTMLElement &&
												"false" === e.target.dataset.dismissible) ||
												P(!0);
										},
										onPointerUp: () => P(!1),
									},
									N.filter(
										(e) => (!e.position && 0 === a) || e.position === r,
									).map((a, n) => {
										var i, s;
										return t.default.createElement(m, {
											key: a.id,
											icons: v,
											index: n,
											toast: a,
											defaultRichColors: E,
											duration:
												null != (i = null == R ? void 0 : R.duration) ? i : _,
											className: null == R ? void 0 : R.className,
											descriptionClassName:
												null == R ? void 0 : R.descriptionClassName,
											invert: o,
											visibleToasts: T,
											closeButton:
												null != (s = null == R ? void 0 : R.closeButton)
													? s
													: u,
											interacting: x,
											position: r,
											style: null == R ? void 0 : R.style,
											unstyled: null == R ? void 0 : R.unstyled,
											classNames: null == R ? void 0 : R.classNames,
											cancelButtonStyle:
												null == R ? void 0 : R.cancelButtonStyle,
											actionButtonStyle:
												null == R ? void 0 : R.actionButtonStyle,
											closeButtonAriaLabel:
												null == R ? void 0 : R.closeButtonAriaLabel,
											removeToast: V,
											toasts: N.filter((e) => e.position == a.position),
											heights: L.filter((e) => e.position == a.position),
											setHeights: U,
											expandByDefault: l,
											gap: A,
											expanded: D,
											swipeDirections: e.swipeDirections,
										});
									}),
								)
							: null;
					}),
				)
			);
		});
		e.s(["Toaster", 0, _, "toast", 0, p]);
	},
	13218,
	83235,
	73405,
	1556,
	94554,
	64176,
	82493,
	22302,
	86712,
	2831,
	92164,
	65382,
	84773,
	67726,
	(e) => {
		"use strict";
		let t, r;
		var a,
			n,
			o = e.i(8343);
		const i =
				/^[\x21\x23-\x27\x2A\x2B\x2D\x2E\x30-\x39\x41-\x5A\x5E\x5F\x60\x61-\x7A\x7C\x7E]+$/,
			s = /^[\x20\x21\x23-\x3A\x3C-\x5B\x5D-\x7E]*$/;
		function l(e) {
			let t = 0,
				r = e.length;
			for (; t < r; ) {
				const r = e.charCodeAt(t);
				if (32 !== r && 9 !== r) break;
				t++;
			}
			for (; r > t; ) {
				const t = e.charCodeAt(r - 1);
				if (32 !== t && 9 !== t) break;
				r--;
			}
			return 0 === t && r === e.length ? e : e.slice(t, r);
		}
		function u(e) {
			const t = new Map();
			if (e.length < 2) return t;
			for (const a of e.split(";")) {
				var r;
				const e = a.indexOf("=");
				if (-1 === e) continue;
				const n = l(a.slice(0, e)),
					o =
						!((r = l(a.slice(e + 1))).length < 2) &&
						r.startsWith('"') &&
						r.endsWith('"')
							? r.slice(1, -1)
							: r;
				i.test(n) &&
					s.test(o) &&
					t.set(
						n,
						(function (e) {
							if (-1 === e.indexOf("%")) return e;
							try {
								return decodeURIComponent(e);
							} catch {
								return e;
							}
						})(o),
					);
			}
			return t;
		}
		e.s(
			[
				"electronProxyClient",
				0,
				(e) => {
					var t;
					const r = {
							clientID: "electron",
							cookiePrefix: "cinaauth",
							callbackPath: "/auth/callback",
							...e,
						},
						a = `${r.cookiePrefix}.${r.clientID}`,
						{ scheme: n } =
							"string" == typeof (t = r.protocol)
								? { scheme: t, privileges: {} }
								: { scheme: t.scheme, privileges: t.privileges || {} };
					return {
						id: "electron-proxy",
						version: "1.6.19",
						getActions: () => {
							const e = () =>
								"u" < typeof document
									? null
									: (u(document.cookie).get(a) ?? null);
							return {
								electron: { getAuthorizationCode: e },
								ensureElectronRedirect: (t) => {
									const o = t?.timeout || 1e4,
										i = t?.interval || 100,
										s = Date.now(),
										l = setInterval(() => {
											let t;
											(((t = e()) &&
												((document.cookie = `${a}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`),
												window.location.replace(
													`${n}:/${r.callbackPath}#token=${t}`,
												),
												1)) ||
												Date.now() - s > o) &&
												clearInterval(l);
										}, i);
									return l;
								},
							};
						},
						pathMethods: { "/electron/transfer-user": "POST" },
						$InferServerPlugin: {},
					};
				},
			],
			13218,
		),
			e.s(
				[
					"dashClient",
					0,
					function () {
						return { id: "dash-client", $InferClientPlugin: {} };
					},
				],
				83235,
			);
		const d = "ba_param",
			c = Object.create(null),
			f = (e) =>
				globalThis.process?.env ||
				globalThis.Deno?.env.toObject() ||
				globalThis.__env__ ||
				(e ? c : globalThis),
			p = new Proxy(c, {
				get: (e, t) => f()[t] ?? c[t],
				has: (e, t) => t in f() || t in c,
				set: (e, t, r) => ((f(!0)[t] = r), !0),
				deleteProperty(e, t) {
					if (!t) return !1;
					const r = f(!0);
					return delete r[t], !0;
				},
				ownKeys: () => Object.keys(f(!0)),
			});
		function h(e, t) {
			return void 0 !== o.default && o.default.env
				? (o.default.env[e] ?? t)
				: "u" > typeof Deno
					? (Deno.env.get(e) ?? t)
					: "u" > typeof Bun
						? (Bun.env[e] ?? t)
						: t;
		}
		p.NODE_ENV,
			Object.freeze({
				get CINAAUTH_SECRET() {
					return h("CINAAUTH_SECRET");
				},
				get AUTH_SECRET() {
					return h("AUTH_SECRET");
				},
				get CINAAUTH_TELEMETRY() {
					return h("CINAAUTH_TELEMETRY");
				},
				get CINAAUTH_TELEMETRY_ID() {
					return h("CINAAUTH_TELEMETRY_ID");
				},
				get NODE_ENV() {
					return h("NODE_ENV", "development");
				},
				get PACKAGE_VERSION() {
					return h("PACKAGE_VERSION", "0.0.0");
				},
				get CINAAUTH_TELEMETRY_ENDPOINT() {
					return h("CINAAUTH_TELEMETRY_ENDPOINT", "");
				},
			});
		const E = {
				eterm: 4,
				cons25: 4,
				console: 4,
				cygwin: 4,
				dtterm: 4,
				gnome: 4,
				hurd: 4,
				jfbterm: 4,
				konsole: 4,
				kterm: 4,
				mlterm: 4,
				mosh: 24,
				putty: 4,
				st: 4,
				"rxvt-unicode-24bit": 24,
				terminator: 24,
				"xterm-kitty": 24,
			},
			m = new Map(
				Object.entries({
					APPVEYOR: 8,
					BUILDKITE: 8,
					CIRCLECI: 24,
					DRONE: 8,
					GITEA_ACTIONS: 24,
					GITHUB_ACTIONS: 24,
					GITLAB_CI: 8,
					TRAVIS: 8,
				}),
			),
			g = [
				/ansi/,
				/color/,
				/linux/,
				/direct/,
				/^con[0-9]*x[0-9]/,
				/^rxvt/,
				/^screen/,
				/^xterm/,
				/^vt100/,
				/^vt220/,
			],
			_ = "\x1b[0m",
			O = "\x1b[31m",
			T = "\x1b[32m",
			R = "\x1b[33m",
			b = "\x1b[34m",
			A = "\x1b[35m",
			v = ["debug", "info", "success", "warn", "error"],
			y = { info: b, success: T, warn: R, error: O, debug: A },
			I =
				((t = void 0 ?? "warn"),
				(r =
					1 !==
					(function () {
						if (void 0 !== h("FORCE_COLOR"))
							switch (h("FORCE_COLOR")) {
								case "":
								case "1":
								case "true":
									return 4;
								case "2":
									return 8;
								case "3":
									return 24;
								default:
									return 1;
							}
						if (
							(void 0 !== h("NODE_DISABLE_COLORS") &&
								"" !== h("NODE_DISABLE_COLORS")) ||
							(void 0 !== h("NO_COLOR") && "" !== h("NO_COLOR")) ||
							"dumb" === h("TERM")
						)
							return 1;
						if (h("TMUX")) return 24;
						if ("TF_BUILD" in p && "AGENT_NAME" in p) return 4;
						if ("CI" in p) {
							for (const { 0: e, 1: t } of m) if (e in p) return t;
							return "codeship" === h("CI_NAME") ? 8 : 1;
						}
						if ("TEAMCITY_VERSION" in p)
							return null !==
								/^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.exec(h("TEAMCITY_VERSION"))
								? 4
								: 1;
						switch (h("TERM_PROGRAM")) {
							case "iTerm.app":
								if (
									!h("TERM_PROGRAM_VERSION") ||
									null !== /^[0-2]\./.exec(h("TERM_PROGRAM_VERSION"))
								)
									return 8;
								return 24;
							case "HyperTerm":
							case "MacTerm":
								return 24;
							case "Apple_Terminal":
								return 8;
						}
						if ("truecolor" === h("COLORTERM") || "24bit" === h("COLORTERM"))
							return 24;
						if (h("TERM")) {
							if (null !== /truecolor/.exec(h("TERM"))) return 24;
							if (null !== /^xterm-256/.exec(h("TERM"))) return 8;
							const e = h("TERM").toLowerCase();
							if (E[e]) return E[e];
							if (g.some((t) => null !== t.exec(e))) return 4;
						}
						return h("COLORTERM") ? 4 : 1;
					})()),
				{
					...Object.fromEntries(
						v.map((e) => [
							e,
							(...[a, ...n]) =>
								((e, a, n = []) => {
									let o;
									if (!(v.indexOf(e) >= v.indexOf(t))) return;
									const i =
										((o = new Date().toISOString()),
										r
											? `\x1b[2m${o}${_} ${y[e]}${e.toUpperCase()}${_} \x1b[1m[CinaAuth]:${_} ${a}`
											: `${o} ${e.toUpperCase()} [CinaAuth]: ${a}`);
									"error" === e
										? console.error(i, ...n)
										: "warn" === e
											? console.warn(i, ...n)
											: console.log(i, ...n);
								})(e, a, n),
						]),
					),
					get level() {
						return t;
					},
				}),
			w = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
		function N(e) {
			if ("string" == typeof e && w.test(e)) {
				const t = new Date(e);
				if (!isNaN(t.getTime())) return t;
			}
			return e;
		}
		function S(e) {
			return Object.fromEntries(
				Object.entries(e).map(([e, t]) => [
					e,
					{ code: e, message: t, toString: () => e },
				]),
			);
		}
		e.s(
			[
				"oauthProviderClient",
				0,
				() => ({
					id: "oauth-provider-client",
					version: "1.6.19",
					fetchPlugins: [
						{
							id: "oauth-provider-signin",
							name: "oauth-provider-signin",
							description: "Adds the current page query to oauth requests",
							hooks: {
								async onRequest(e) {
									const t = e.headers,
										r =
											"string" == typeof e.body
												? "application/x-www-form-urlencoded" ===
													t.get("content-type")
													? Object.fromEntries(new URLSearchParams(e.body))
													: (function (e) {
															try {
																if ("string" != typeof e) {
																	if (null == e) return null;
																	return (function e(t) {
																		if (null == t) return t;
																		if ("string" == typeof t) return N(t);
																		if (t instanceof Date) return t;
																		if (Array.isArray(t)) return t.map(e);
																		if ("object" == typeof t) {
																			const r = {};
																			for (const a of Object.keys(t))
																				r[a] = e(t[a]);
																			return r;
																		}
																		return t;
																	})(e);
																}
																return JSON.parse(e, (e, t) => N(t));
															} catch (e) {
																return (
																	I.error("Error parsing JSON", { error: e }),
																	null
																);
															}
														})(e.body ?? "{}")
												: e.body;
									!r?.oauth_query &&
										window?.location?.search &&
										"GET" !== e.method &&
										"DELETE" !== e.method &&
										(e.body = JSON.stringify({
											...r,
											oauth_query: (function (e) {
												const t = new URLSearchParams(e);
												if (!t.has("sig")) return;
												const r = (function (e) {
													const t = e.getAll(d);
													if (t.length) return new Set(t);
												})(t);
												if (!r) return;
												const a = new URLSearchParams();
												for (const [e, n] of t.entries())
													("sig" === e || e === d || r.has(e)) &&
														a.append(e, n);
												return a.toString();
											})(window.location.search),
										}));
								},
							},
						},
					],
					$InferServerPlugin: {},
				}),
			],
			73405,
		);
		const L = S({
			CHALLENGE_NOT_FOUND: "Challenge not found",
			YOU_ARE_NOT_ALLOWED_TO_REGISTER_THIS_PASSKEY:
				"You are not allowed to register this passkey",
			FAILED_TO_VERIFY_REGISTRATION: "Failed to verify registration",
			PASSKEY_NOT_FOUND: "Passkey not found",
			AUTHENTICATION_FAILED: "Authentication failed",
			UNABLE_TO_CREATE_SESSION: "Unable to create session",
			FAILED_TO_UPDATE_PASSKEY: "Failed to update passkey",
			PREVIOUSLY_REGISTERED: "Previously registered",
			REGISTRATION_CANCELLED: "Registration cancelled",
			AUTH_CANCELLED: "Auth cancelled",
			UNKNOWN_ERROR: "Unknown error",
			SESSION_REQUIRED:
				"Passkey registration requires an authenticated session",
			RESOLVE_USER_REQUIRED:
				"Passkey registration requires either an authenticated session or a resolveUser callback when requireSession is false",
			RESOLVED_USER_INVALID: "Resolved user is invalid",
		});
		function U(e) {
			let t = new Uint8Array(e),
				r = "";
			for (const e of t) r += String.fromCharCode(e);
			return btoa(r).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
		}
		function D(e) {
			const t = e.replace(/-/g, "+").replace(/_/g, "/"),
				r = (4 - (t.length % 4)) % 4,
				a = atob(t.padEnd(t.length + r, "=")),
				n = new ArrayBuffer(a.length),
				o = new Uint8Array(n);
			for (let e = 0; e < a.length; e++) o[e] = a.charCodeAt(e);
			return n;
		}
		function C() {
			return x.stubThis(
				globalThis?.PublicKeyCredential !== void 0 &&
					"function" == typeof globalThis.PublicKeyCredential,
			);
		}
		const x = { stubThis: (e) => e };
		function P(e) {
			const { id: t } = e;
			return { ...e, id: D(t), transports: e.transports };
		}
		function M(e) {
			return (
				"localhost" === e || /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i.test(e)
			);
		}
		class k extends Error {
			constructor({ message: e, code: t, cause: r, name: a }) {
				super(e, { cause: r }),
					Object.defineProperty(this, "code", {
						enumerable: !0,
						configurable: !0,
						writable: !0,
						value: void 0,
					}),
					(this.name = a ?? r.name),
					(this.code = t);
			}
		}
		const Y = new (class {
				constructor() {
					Object.defineProperty(this, "controller", {
						enumerable: !0,
						configurable: !0,
						writable: !0,
						value: void 0,
					});
				}
				createNewAbortSignal() {
					if (this.controller) {
						const e = Error(
							"Cancelling existing WebAuthn API call for new one",
						);
						(e.name = "AbortError"), this.controller.abort(e);
					}
					const e = new AbortController();
					return (this.controller = e), e.signal;
				}
				cancelCeremony() {
					if (this.controller) {
						const e = Error("Manually cancelling existing WebAuthn API call");
						(e.name = "AbortError"),
							this.controller.abort(e),
							(this.controller = void 0);
					}
				}
			})(),
			B = ["cross-platform", "platform"];
		function F(e) {
			if (e && !(0 > B.indexOf(e))) return e;
		}
		async function H(e) {
			let t, r, a, n, o;
			!e.optionsJSON &&
				e.challenge &&
				(console.warn(
					"startRegistration() was not called correctly. It will try to continue with the provided options, but this call should be refactored to use the expected call structure instead. See https://simplewebauthn.dev/docs/packages/browser#typeerror-cannot-read-properties-of-undefined-reading-challenge for more information.",
				),
				(e = { optionsJSON: e }));
			const { optionsJSON: i, useAutoRegister: s = !1 } = e;
			if (!C()) throw Error("WebAuthn is not supported in this browser");
			const l = {
					...i,
					challenge: D(i.challenge),
					user: { ...i.user, id: D(i.user.id) },
					excludeCredentials: i.excludeCredentials?.map(P),
				},
				u = {};
			s && (u.mediation = "conditional"),
				(u.publicKey = l),
				(u.signal = Y.createNewAbortSignal());
			try {
				t = await navigator.credentials.create(u);
			} catch (e) {
				throw (function ({ error: e, options: t }) {
					const { publicKey: r } = t;
					if (!r)
						throw Error("options was missing required publicKey property");
					if ("AbortError" === e.name) {
						if (t.signal instanceof AbortSignal)
							return new k({
								message: "Registration ceremony was sent an abort signal",
								code: "ERROR_CEREMONY_ABORTED",
								cause: e,
							});
					} else if ("ConstraintError" === e.name) {
						if (r.authenticatorSelection?.requireResidentKey === !0)
							return new k({
								message:
									"Discoverable credentials were required but no available authenticator supported it",
								code: "ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT",
								cause: e,
							});
						else if (
							"conditional" === t.mediation &&
							r.authenticatorSelection?.userVerification === "required"
						)
							return new k({
								message:
									"User verification was required during automatic registration but it could not be performed",
								code: "ERROR_AUTO_REGISTER_USER_VERIFICATION_FAILURE",
								cause: e,
							});
						else if (r.authenticatorSelection?.userVerification === "required")
							return new k({
								message:
									"User verification was required but no available authenticator supported it",
								code: "ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT",
								cause: e,
							});
					} else if ("InvalidStateError" === e.name)
						return new k({
							message: "The authenticator was previously registered",
							code: "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED",
							cause: e,
						});
					else if ("NotAllowedError" === e.name)
						return new k({
							message: e.message,
							code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
							cause: e,
						});
					else if ("NotSupportedError" === e.name)
						return new k(
							0 ===
								r.pubKeyCredParams.filter((e) => "public-key" === e.type).length
								? {
										message:
											'No entry in pubKeyCredParams was of type "public-key"',
										code: "ERROR_MALFORMED_PUBKEYCREDPARAMS",
										cause: e,
									}
								: {
										message:
											"No available authenticator supported any of the specified pubKeyCredParams algorithms",
										code: "ERROR_AUTHENTICATOR_NO_SUPPORTED_PUBKEYCREDPARAMS_ALG",
										cause: e,
									},
						);
					else if ("SecurityError" === e.name) {
						const t = globalThis.location.hostname;
						if (!M(t))
							return new k({
								message: `${globalThis.location.hostname} is an invalid domain`,
								code: "ERROR_INVALID_DOMAIN",
								cause: e,
							});
						if (r.rp.id !== t)
							return new k({
								message: `The RP ID "${r.rp.id}" is invalid for this domain`,
								code: "ERROR_INVALID_RP_ID",
								cause: e,
							});
					} else if ("TypeError" === e.name) {
						if (r.user.id.byteLength < 1 || r.user.id.byteLength > 64)
							return new k({
								message: "User ID was not between 1 and 64 characters",
								code: "ERROR_INVALID_USER_ID_LENGTH",
								cause: e,
							});
					} else if ("UnknownError" === e.name)
						return new k({
							message:
								"The authenticator was unable to process the specified options, or could not create a new credential",
							code: "ERROR_AUTHENTICATOR_GENERAL_ERROR",
							cause: e,
						});
					return e;
				})({ error: e, options: u });
			}
			if (!t) throw Error("Registration was not completed");
			const { id: d, rawId: c, response: f, type: p } = t;
			if (
				("function" == typeof f.getTransports && (a = f.getTransports()),
				"function" == typeof f.getPublicKeyAlgorithm)
			)
				try {
					n = f.getPublicKeyAlgorithm();
				} catch (e) {
					V("getPublicKeyAlgorithm()", e);
				}
			if ("function" == typeof f.getPublicKey)
				try {
					const e = f.getPublicKey();
					null !== e && (o = U(e));
				} catch (e) {
					V("getPublicKey()", e);
				}
			if ("function" == typeof f.getAuthenticatorData)
				try {
					r = U(f.getAuthenticatorData());
				} catch (e) {
					V("getAuthenticatorData()", e);
				}
			return {
				id: d,
				rawId: U(c),
				response: {
					attestationObject: U(f.attestationObject),
					clientDataJSON: U(f.clientDataJSON),
					transports: a,
					publicKeyAlgorithm: n,
					publicKey: o,
					authenticatorData: r,
				},
				type: p,
				clientExtensionResults: t.getClientExtensionResults(),
				authenticatorAttachment: F(t.authenticatorAttachment),
			};
		}
		function V(e, t) {
			console.warn(
				`The browser extension that intercepted this WebAuthn API call incorrectly implemented ${e}. You should report this error to them.
`,
				t,
			);
		}
		const $ = (e) => e;
		async function z(e) {
			let t, r, a;
			!e.optionsJSON &&
				e.challenge &&
				(console.warn(
					"startAuthentication() was not called correctly. It will try to continue with the provided options, but this call should be refactored to use the expected call structure instead. See https://simplewebauthn.dev/docs/packages/browser#typeerror-cannot-read-properties-of-undefined-reading-challenge for more information.",
				),
				(e = { optionsJSON: e }));
			const {
				optionsJSON: n,
				useBrowserAutofill: o = !1,
				verifyBrowserAutofillInput: i = !0,
			} = e;
			if (!C()) throw Error("WebAuthn is not supported in this browser");
			n.allowCredentials?.length !== 0 && (t = n.allowCredentials?.map(P));
			const s = { ...n, challenge: D(n.challenge), allowCredentials: t },
				l = {};
			if (o) {
				if (
					!(await (function () {
						if (!C()) return $(new Promise((e) => e(!1)));
						const e = globalThis.PublicKeyCredential;
						return e?.isConditionalMediationAvailable === void 0
							? $(new Promise((e) => e(!1)))
							: $(e.isConditionalMediationAvailable());
					})())
				)
					throw Error("Browser does not support WebAuthn autofill");
				if (
					document.querySelectorAll("input[autocomplete$='webauthn']").length <
						1 &&
					i
				)
					throw Error(
						'No <input> with "webauthn" as the only or last value in its `autocomplete` attribute was detected',
					);
				(l.mediation = "conditional"), (s.allowCredentials = []);
			}
			(l.publicKey = s), (l.signal = Y.createNewAbortSignal());
			try {
				r = await navigator.credentials.get(l);
			} catch (e) {
				throw (function ({ error: e, options: t }) {
					const { publicKey: r } = t;
					if (!r)
						throw Error("options was missing required publicKey property");
					if ("AbortError" === e.name) {
						if (t.signal instanceof AbortSignal)
							return new k({
								message: "Authentication ceremony was sent an abort signal",
								code: "ERROR_CEREMONY_ABORTED",
								cause: e,
							});
					} else if ("NotAllowedError" === e.name)
						return new k({
							message: e.message,
							code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
							cause: e,
						});
					else if ("SecurityError" === e.name) {
						const t = globalThis.location.hostname;
						if (!M(t))
							return new k({
								message: `${globalThis.location.hostname} is an invalid domain`,
								code: "ERROR_INVALID_DOMAIN",
								cause: e,
							});
						if (r.rpId !== t)
							return new k({
								message: `The RP ID "${r.rpId}" is invalid for this domain`,
								code: "ERROR_INVALID_RP_ID",
								cause: e,
							});
					} else if ("UnknownError" === e.name)
						return new k({
							message:
								"The authenticator was unable to process the specified options, or could not create a new assertion signature",
							code: "ERROR_AUTHENTICATOR_GENERAL_ERROR",
							cause: e,
						});
					return e;
				})({ error: e, options: l });
			}
			if (!r) throw Error("Authentication was not completed");
			const { id: u, rawId: d, response: c, type: f } = r;
			return (
				c.userHandle && (a = U(c.userHandle)),
				{
					id: u,
					rawId: U(d),
					response: {
						authenticatorData: U(c.authenticatorData),
						clientDataJSON: U(c.clientDataJSON),
						signature: U(c.signature),
						userHandle: a,
					},
					type: f,
					clientExtensionResults: r.getClientExtensionResults(),
					authenticatorAttachment: F(r.authenticatorAttachment),
				}
			);
		}
		const j = (e, t, r, a) => (
				(e.events = e.events || {}),
				e.events[r + 10] ||
					(e.events[r + 10] = a((t) => {
						e.events[r].reduceRight((e, t) => (t(e), e), { shared: {}, ...t });
					})),
				(e.events[r] = e.events[r] || []),
				e.events[r].push(t),
				() => {
					const a = e.events[r],
						n = a.indexOf(t);
					a.splice(n, 1),
						a.length ||
							(delete e.events[r], e.events[r + 10](), delete e.events[r + 10]);
				}
			),
			G = (e, t) =>
				j(
					e,
					(r) => {
						const a = t(r);
						a && e.events[6].push(a);
					},
					5,
					(t) => {
						const r = e.listen;
						e.listen = (...a) => (
							e.lc || e.active || ((e.active = !0), t()), r(...a)
						);
						const a = e.off;
						return (
							(e.events[6] = []),
							(e.off = () => {
								a(),
									setTimeout(() => {
										if (e.active && !e.lc) {
											for (const t of ((e.active = !1), e.events[6])) t();
											e.events[6] = [];
										}
									}, 1e3);
							}),
							() => {
								(e.listen = r), (e.off = a);
							}
						);
					},
				);
		function W(e) {
			if ("object" != typeof e || null === e) return !1;
			const t = Object.getPrototypeOf(e);
			return t === Object.prototype || null === t;
		}
		function q(e, t) {
			if (e === t) return !0;
			if (Array.isArray(e) && Array.isArray(t)) {
				if (e.length !== t.length) return !1;
				for (let r = 0; r < e.length; r++) if (!q(e[r], t[r])) return !1;
				return !0;
			}
			if (W(e) && W(t)) {
				const r = Object.keys(e),
					a = Object.keys(t);
				if (r.length !== a.length) return !1;
				for (const a of r) if (!(a in t) || !q(e[a], t[a])) return !1;
				return !0;
			}
			return !1;
		}
		function K(e, t) {
			return j(
				e,
				({ newValue: r, abort: a }) => {
					t(e.value, r) && a();
				},
				2,
				(t) => {
					const r = e.set,
						a = e.setKey;
					return (
						e.setKey &&
							(e.setKey = (r, n) => {
								let o;
								if (
									(t({
										abort: () => {
											o = !0;
										},
										changed: r,
										newValue: { ...e.value, [r]: n },
									}),
									!o)
								)
									return a(r, n);
							}),
						(e.set = (e) => {
							let a;
							if (
								(t({
									abort: () => {
										a = !0;
									},
									newValue: e,
								}),
								!a)
							)
								return r(e);
						}),
						() => {
							(e.set = r), (e.setKey = a);
						}
					);
				},
			);
		}
		let X = [],
			Z = 0,
			J = 0,
			Q = (e) => {
				const t = [],
					r = {
						get: () => (r.lc || r.listen(() => {})(), r.value),
						lc: 0,
						listen: (e) => (
							(r.lc = t.push(e)),
							() => {
								for (let t = Z + 4; t < X.length; )
									X[t] === e ? X.splice(t, 4) : (t += 4);
								const a = t.indexOf(e);
								~a && (t.splice(a, 1), --r.lc || r.off());
							}
						),
						notify(e, a) {
							J++;
							const n = !X.length;
							for (const n of t) X.push(n, r.value, e, a);
							if (n) {
								for (Z = 0; Z < X.length; Z += 4)
									X[Z](X[Z + 1], X[Z + 2], X[Z + 3]);
								X.length = 0;
							}
						},
						off() {},
						set(e) {
							const t = r.value;
							t !== e && ((r.value = e), r.notify(t));
						},
						subscribe(e) {
							const t = r.listen(e);
							return e(r.value), t;
						},
						value: e,
					};
				return r;
			},
			ee = () => !1;
		function et(e, t) {
			return (
				q(e.data, t.data) &&
				e.error === t.error &&
				e.isPending === t.isPending &&
				e.isRefetching === t.isRefetching &&
				e.refetch === t.refetch
			);
		}
		const er = (e, t, r, a) => {
			const n = Q({
				data: null,
				error: null,
				isPending: !0,
				isRefetching: !1,
				refetch: (e) => o(e),
			});
			K(n, et);
			const o = async (e) =>
				new Promise((o) => {
					const i =
						"function" == typeof a
							? a({
									data: n.get().data,
									error: n.get().error,
									isPending: n.get().isPending,
								})
							: a;
					r(t, {
						...i,
						query: { ...i?.query, ...e?.query },
						async onSuccess(e) {
							const t = n.get(),
								r =
									null != t.data && null != e.data && q(t.data, e.data)
										? t.data
										: e.data;
							n.set({
								data: r,
								error: null,
								isPending: !1,
								isRefetching: !1,
								refetch: n.value.refetch,
							}),
								await i?.onSuccess?.(e);
						},
						async onError(e) {
							const { request: t } = e,
								r = "number" == typeof t.retry ? t.retry : t.retry?.attempts,
								a = t.retryAttempt || 0;
							if (r && a < r) return;
							const o = 401 === e.error.status;
							n.set({
								error: e.error,
								data: o ? null : n.get().data,
								isPending: !1,
								isRefetching: !1,
								refetch: n.value.refetch,
							}),
								await i?.onError?.(e);
						},
						async onRequest(e) {
							const t = n.get();
							n.set({
								isPending: null === t.data,
								data: t.data,
								error: null,
								isRefetching: !0,
								refetch: n.value.refetch,
							}),
								await i?.onRequest?.(e);
						},
					})
						.catch((e) => {
							n.set({
								error: e,
								data: n.get().data,
								isPending: !1,
								isRefetching: !1,
								refetch: n.value.refetch,
							});
						})
						.finally(() => {
							o(void 0);
						});
				});
			e = Array.isArray(e) ? e : [e];
			let i = !1,
				s = [];
			for (const t of e) {
				const e = t.subscribe(async () => {
					ee(),
						i
							? await o()
							: G(n, () => {
									const e = setTimeout(async () => {
										i || ((i = !0), await o());
									}, 0);
									return () => {
										for (const e of s) e();
										clearTimeout(e);
									};
								});
				});
				s.push(e);
			}
			return n;
		};
		e.s(
			[
				"passkeyClient",
				0,
				() => {
					const e = Q();
					return {
						id: "passkey",
						version: "1.6.19",
						$InferServerPlugin: {},
						getActions: (t, r) =>
							((e, { $listPasskeys: t, $store: r }) => ({
								signIn: {
									passkey: async (a, n) => {
										let o,
											i = await e("/passkey/generate-authenticate-options", {
												method: "GET",
												throw: !1,
											});
										if (!i.data) return i;
										const s =
											i.data.extensions || a?.extensions
												? {
														...(i.data.extensions || {}),
														...(a?.extensions || {}),
													}
												: void 0;
										try {
											o = await z({
												optionsJSON: { ...i.data, extensions: s },
												useBrowserAutofill: a?.autoFill,
											});
										} catch (e) {
											return {
												data: null,
												error: {
													code: e instanceof k ? e.code : "AUTH_CANCELLED",
													message: L.AUTH_CANCELLED.message,
													status: 400,
													statusText: "BAD_REQUEST",
												},
											};
										}
										try {
											const { clientExtensionResults: i, ...s } = o,
												l = await e("/passkey/verify-authentication", {
													body: { response: s },
													...a?.fetchOptions,
													...n,
													method: "POST",
													throw: !1,
												});
											if (
												(t.set(Math.random()),
												r.notify("$sessionSignal"),
												a?.returnWebAuthnResponse)
											)
												return {
													...l,
													webauthn: { response: o, clientExtensionResults: i },
												};
											return l;
										} catch (e) {
											return (
												console.error("[CinaAuth] Error verifying passkey", e),
												{
													data: null,
													error: {
														code: "AUTH_CANCELLED",
														message: L.AUTH_CANCELLED.message,
														status: 400,
														statusText: "BAD_REQUEST",
													},
												}
											);
										}
									},
								},
								passkey: {
									addPasskey: async (r, a) => {
										const n = await e("/passkey/generate-register-options", {
											method: "GET",
											query: {
												...(r?.authenticatorAttachment && {
													authenticatorAttachment: r.authenticatorAttachment,
												}),
												...(r?.name && { name: r.name }),
												...(r?.context && { context: r.context }),
											},
											throw: !1,
										});
										if (!n.data) return n;
										try {
											const o =
													n.data.extensions || r?.extensions
														? {
																...(n.data.extensions || {}),
																...(r?.extensions || {}),
															}
														: void 0,
												i = await H({
													optionsJSON: { ...n.data, extensions: o },
													useAutoRegister: r?.useAutoRegister,
												}),
												{ clientExtensionResults: s, ...l } = i,
												u = await e("/passkey/verify-registration", {
													...r?.fetchOptions,
													...a,
													body: { response: l, name: r?.name },
													method: "POST",
													throw: !1,
												});
											if (!u.data) return u;
											if ((t.set(Math.random()), r?.returnWebAuthnResponse))
												return {
													...u,
													webauthn: { response: i, clientExtensionResults: s },
												};
											return u;
										} catch (e) {
											if (e instanceof k) {
												if (
													"ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED" === e.code
												)
													return {
														data: null,
														error: {
															code: e.code,
															message: L.PREVIOUSLY_REGISTERED.message,
															status: 400,
															statusText: "BAD_REQUEST",
														},
													};
												if ("ERROR_CEREMONY_ABORTED" === e.code)
													return {
														data: null,
														error: {
															code: e.code,
															message: L.REGISTRATION_CANCELLED.message,
															status: 400,
															statusText: "BAD_REQUEST",
														},
													};
												return {
													data: null,
													error: {
														code: e.code,
														message: e.message,
														status: 400,
														statusText: "BAD_REQUEST",
													},
												};
											}
											return {
												data: null,
												error: {
													code: "UNKNOWN_ERROR",
													message:
														e instanceof Error
															? e.message
															: L.UNKNOWN_ERROR.message,
													status: 500,
													statusText: "INTERNAL_SERVER_ERROR",
												},
											};
										}
									},
								},
								$Infer: {},
							}))(t, { $listPasskeys: e, $store: r }),
						getAtoms: (t) => ({
							listPasskeys: er(e, "/passkey/list-user-passkeys", t, {
								method: "GET",
							}),
							$listPasskeys: e,
						}),
						pathMethods: {
							"/passkey/register": "POST",
							"/passkey/authenticate": "POST",
						},
						atomListeners: [
							{
								matcher: (e) =>
									"/passkey/verify-registration" === e ||
									"/passkey/delete-passkey" === e ||
									"/passkey/update-passkey" === e ||
									"/sign-out" === e,
								signal: "$listPasskeys",
							},
							{
								matcher: (e) => "/passkey/verify-authentication" === e,
								signal: "$sessionSignal",
							},
						],
						$ERROR_CODES: L,
					};
				},
			],
			1556,
		);
		const ea = S({
			UNAUTHORIZED: "Unauthorized access",
			INVALID_REQUEST_BODY: "Invalid request body",
			SUBSCRIPTION_NOT_FOUND: "Subscription not found",
			SUBSCRIPTION_PLAN_NOT_FOUND: "Subscription plan not found",
			ALREADY_SUBSCRIBED_PLAN: "You're already subscribed to this plan",
			REFERENCE_ID_NOT_ALLOWED: "Reference id is not allowed",
			CUSTOMER_NOT_FOUND: "Stripe customer not found for this user",
			UNABLE_TO_CREATE_CUSTOMER: "Unable to create customer",
			UNABLE_TO_CREATE_BILLING_PORTAL:
				"Unable to create billing portal session",
			STRIPE_SIGNATURE_NOT_FOUND: "Stripe signature not found",
			STRIPE_WEBHOOK_SECRET_NOT_FOUND: "Stripe webhook secret not found",
			STRIPE_WEBHOOK_ERROR: "Stripe webhook error",
			FAILED_TO_CONSTRUCT_STRIPE_EVENT: "Failed to construct Stripe event",
			FAILED_TO_FETCH_PLANS: "Failed to fetch plans",
			EMAIL_VERIFICATION_REQUIRED:
				"Email verification is required before you can subscribe to a plan",
			SUBSCRIPTION_NOT_ACTIVE: "Subscription is not active",
			SUBSCRIPTION_NOT_SCHEDULED_FOR_CANCELLATION:
				"Subscription is not scheduled for cancellation",
			SUBSCRIPTION_NOT_PENDING_CHANGE:
				"Subscription has no pending cancellation or scheduled plan change",
			ORGANIZATION_NOT_FOUND: "Organization not found",
			ORGANIZATION_SUBSCRIPTION_NOT_ENABLED:
				"Organization subscription is not enabled",
			AUTHORIZE_REFERENCE_REQUIRED:
				"Organization subscriptions require authorizeReference callback to be configured",
			ORGANIZATION_HAS_ACTIVE_SUBSCRIPTION:
				"Cannot delete organization with active subscription",
			ORGANIZATION_REFERENCE_ID_REQUIRED:
				"Reference ID is required. Provide referenceId or set activeOrganizationId in session",
		});
		e.s(
			[
				"stripeClient",
				0,
				(e) => ({
					id: "stripe-client",
					version: "1.6.19",
					$InferServerPlugin: {},
					pathMethods: {
						"/subscription/billing-portal": "POST",
						"/subscription/restore": "POST",
					},
					$ERROR_CODES: ea,
				}),
			],
			94554,
		);
		const en = "1.6.19";
		S({
			USER_NOT_FOUND: "User not found",
			FAILED_TO_CREATE_USER: "Failed to create user",
			FAILED_TO_CREATE_SESSION: "Failed to create session",
			FAILED_TO_UPDATE_USER: "Failed to update user",
			FAILED_TO_GET_SESSION: "Failed to get session",
			INVALID_PASSWORD: "Invalid password",
			INVALID_EMAIL: "Invalid email",
			INVALID_EMAIL_OR_PASSWORD: "Invalid email or password",
			INVALID_USER: "Invalid user",
			SOCIAL_ACCOUNT_ALREADY_LINKED: "Social account already linked",
			PROVIDER_NOT_FOUND: "Provider not found",
			INVALID_TOKEN: "Invalid token",
			TOKEN_EXPIRED: "Token expired",
			ID_TOKEN_NOT_SUPPORTED: "id_token not supported",
			FAILED_TO_GET_USER_INFO: "Failed to get user info",
			USER_EMAIL_NOT_FOUND: "User email not found",
			EMAIL_NOT_VERIFIED: "Email not verified",
			PASSWORD_TOO_SHORT: "Password too short",
			PASSWORD_TOO_LONG: "Password too long",
			USER_ALREADY_EXISTS: "User already exists.",
			USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
				"User already exists. Use another email.",
			EMAIL_CAN_NOT_BE_UPDATED: "Email can not be updated",
			CHANGE_EMAIL_DISABLED: "Change email is disabled",
			CREDENTIAL_ACCOUNT_NOT_FOUND: "Credential account not found",
			SESSION_EXPIRED:
				"Session expired. Re-authenticate to perform this action.",
			FAILED_TO_UNLINK_LAST_ACCOUNT: "You can't unlink your last account",
			ACCOUNT_NOT_FOUND: "Account not found",
			USER_ALREADY_HAS_PASSWORD:
				"User already has a password. Provide that to delete the account.",
			CROSS_SITE_NAVIGATION_LOGIN_BLOCKED:
				"Cross-site navigation login blocked. This request appears to be a CSRF attack.",
			VERIFICATION_EMAIL_NOT_ENABLED: "Verification email isn't enabled",
			EMAIL_ALREADY_VERIFIED: "Email is already verified",
			EMAIL_MISMATCH: "Email mismatch",
			SESSION_NOT_FRESH: "Session is not fresh",
			LINKED_ACCOUNT_ALREADY_EXISTS: "Linked account already exists",
			INVALID_ORIGIN: "Invalid origin",
			INVALID_CALLBACK_URL: "Invalid callbackURL",
			INVALID_REDIRECT_URL: "Invalid redirectURL",
			INVALID_ERROR_CALLBACK_URL: "Invalid errorCallbackURL",
			INVALID_NEW_USER_CALLBACK_URL: "Invalid newUserCallbackURL",
			MISSING_OR_NULL_ORIGIN: "Missing or null Origin",
			CALLBACK_URL_REQUIRED: "callbackURL is required",
			FAILED_TO_CREATE_VERIFICATION: "Unable to create verification",
			FIELD_NOT_ALLOWED: "Field not allowed to be set",
			ASYNC_VALIDATION_NOT_SUPPORTED: "Async validation is not supported",
			VALIDATION_ERROR: "Validation Error",
			MISSING_FIELD: "Field is required",
			METHOD_NOT_ALLOWED_DEFER_SESSION_REQUIRED:
				"POST method requires deferSessionRefresh to be enabled in session config",
			BODY_MUST_BE_AN_OBJECT: "Body must be an object",
			PASSWORD_ALREADY_SET: "User already has a password set",
		});
		const eo = {
			OK: 200,
			CREATED: 201,
			ACCEPTED: 202,
			NO_CONTENT: 204,
			MULTIPLE_CHOICES: 300,
			MOVED_PERMANENTLY: 301,
			FOUND: 302,
			SEE_OTHER: 303,
			NOT_MODIFIED: 304,
			TEMPORARY_REDIRECT: 307,
			BAD_REQUEST: 400,
			UNAUTHORIZED: 401,
			PAYMENT_REQUIRED: 402,
			FORBIDDEN: 403,
			NOT_FOUND: 404,
			METHOD_NOT_ALLOWED: 405,
			NOT_ACCEPTABLE: 406,
			PROXY_AUTHENTICATION_REQUIRED: 407,
			REQUEST_TIMEOUT: 408,
			CONFLICT: 409,
			GONE: 410,
			LENGTH_REQUIRED: 411,
			PRECONDITION_FAILED: 412,
			PAYLOAD_TOO_LARGE: 413,
			URI_TOO_LONG: 414,
			UNSUPPORTED_MEDIA_TYPE: 415,
			RANGE_NOT_SATISFIABLE: 416,
			EXPECTATION_FAILED: 417,
			"I'M_A_TEAPOT": 418,
			MISDIRECTED_REQUEST: 421,
			UNPROCESSABLE_ENTITY: 422,
			LOCKED: 423,
			FAILED_DEPENDENCY: 424,
			TOO_EARLY: 425,
			UPGRADE_REQUIRED: 426,
			PRECONDITION_REQUIRED: 428,
			TOO_MANY_REQUESTS: 429,
			REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
			UNAVAILABLE_FOR_LEGAL_REASONS: 451,
			INTERNAL_SERVER_ERROR: 500,
			NOT_IMPLEMENTED: 501,
			BAD_GATEWAY: 502,
			SERVICE_UNAVAILABLE: 503,
			GATEWAY_TIMEOUT: 504,
			HTTP_VERSION_NOT_SUPPORTED: 505,
			VARIANT_ALSO_NEGOTIATES: 506,
			INSUFFICIENT_STORAGE: 507,
			LOOP_DETECTED: 508,
			NOT_EXTENDED: 510,
			NETWORK_AUTHENTICATION_REQUIRED: 511,
		};
		var ei = class extends Error {
			constructor(
				e = "INTERNAL_SERVER_ERROR",
				t,
				r = {},
				a = "number" == typeof e ? e : eo[e],
			) {
				super(t?.message, t?.cause ? { cause: t.cause } : void 0),
					(this.status = e),
					(this.body = t),
					(this.headers = r),
					(this.statusCode = a),
					(this.name = "APIError"),
					(this.status = e),
					(this.headers = r),
					(this.statusCode = a),
					(this.body = t);
			}
		};
		Symbol.for("better-call:api-error-headers"),
			(a = ei),
			(n = Error),
			Object.defineProperty(
				class e extends a {
					#e;
					constructor(...e) {
						if (
							(function () {
								const e = Object.getOwnPropertyDescriptor(
									Error,
									"stackTraceLimit",
								);
								return void 0 === e
									? Object.isExtensible(Error)
									: Object.prototype.hasOwnProperty.call(e, "writable")
										? e.writable
										: void 0 !== e.set;
							})()
						) {
							const t = Error.stackTraceLimit;
							(Error.stackTraceLimit = 0),
								super(...e),
								(Error.stackTraceLimit = t);
						} else super(...e);
						const t = Error().stack;
						t &&
							(this.#e = (function (e) {
								const t = e.split("\n    at ");
								return t.length <= 1
									? e
									: (t.splice(1, 1), t.join("\n    at "));
							})(t.replace(/^Error/, this.name)));
					}
					get errorStack() {
						return this.#e;
					}
				}.prototype,
				"constructor",
				{ get: () => n, enumerable: !1, configurable: !0 },
			);
		var es = class extends Error {
			constructor(e, t) {
				super(e, t),
					(this.name = "CinaAuthError"),
					(this.message = e),
					(this.stack = "");
			}
		};
		function el(e) {
			return "OR" === e ? "OR" : "AND";
		}
		function eu(e) {
			return Array.isArray(e);
		}
		function ed(e, t) {
			return "string" == typeof t && e.includes(t);
		}
		function ec(e) {
			return {
				newRole: (e) => {
					var t;
					return {
						authorize(e, r = "AND") {
							let a = !1;
							for (const [n, o] of Object.entries(e)) {
								const e = t[n];
								if (!e) {
									if ("AND" === r)
										return {
											success: !1,
											error: `You are not allowed to access resource: ${n}`,
										};
									continue;
								}
								const i = (function (e, { actions: t, connector: r }) {
									return (
										0 !== t.length &&
										("OR" === r
											? t.some((t) => ed(e, t))
											: t.every((t) => ed(e, t)))
									);
								})(
									e,
									(function (e) {
										if (eu(e)) return { actions: e, connector: "AND" };
										if (!e || "object" != typeof e)
											throw new es("Invalid access control request");
										const { actions: t, connector: r } = e;
										return eu(t)
											? { actions: t, connector: el(r) }
											: { actions: [], connector: el(r) };
									})(o),
								);
								if ((i && (a = !0), i && "OR" === r)) return { success: !0 };
								if (!i && "AND" === r)
									return {
										success: !1,
										error: `unauthorized to access resource "${n}"`,
									};
							}
							return a
								? { success: !0 }
								: { success: !1, error: "Not authorized" };
						},
						statements: (t = e),
					};
				},
				statements: e,
			};
		}
		const ef = ec({
				user: [
					"create",
					"list",
					"set-role",
					"ban",
					"impersonate",
					"impersonate-admins",
					"delete",
					"set-password",
					"set-email",
					"get",
					"update",
				],
				session: ["list", "revoke", "delete"],
			}),
			ep = ef.newRole({
				user: [
					"create",
					"list",
					"set-role",
					"ban",
					"impersonate",
					"delete",
					"set-password",
					"set-email",
					"get",
					"update",
				],
				session: ["list", "revoke", "delete"],
			}),
			eh = ef.newRole({ user: [], session: [] }),
			eE = { admin: ep, user: eh },
			em = S({
				FAILED_TO_CREATE_USER: "Failed to create user",
				USER_ALREADY_EXISTS: "User already exists.",
				USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
					"User already exists. Use another email.",
				YOU_CANNOT_BAN_YOURSELF: "You cannot ban yourself",
				YOU_ARE_NOT_ALLOWED_TO_CHANGE_USERS_ROLE:
					"You are not allowed to change users role",
				YOU_ARE_NOT_ALLOWED_TO_CREATE_USERS:
					"You are not allowed to create users",
				YOU_ARE_NOT_ALLOWED_TO_LIST_USERS: "You are not allowed to list users",
				YOU_ARE_NOT_ALLOWED_TO_LIST_USERS_SESSIONS:
					"You are not allowed to list users sessions",
				YOU_ARE_NOT_ALLOWED_TO_BAN_USERS: "You are not allowed to ban users",
				YOU_ARE_NOT_ALLOWED_TO_IMPERSONATE_USERS:
					"You are not allowed to impersonate users",
				YOU_ARE_NOT_ALLOWED_TO_REVOKE_USERS_SESSIONS:
					"You are not allowed to revoke users sessions",
				YOU_ARE_NOT_ALLOWED_TO_DELETE_USERS:
					"You are not allowed to delete users",
				YOU_ARE_NOT_ALLOWED_TO_SET_USERS_PASSWORD:
					"You are not allowed to set users password",
				BANNED_USER: "You have been banned from this application",
				YOU_ARE_NOT_ALLOWED_TO_GET_USER: "You are not allowed to get user",
				NO_DATA_TO_UPDATE: "No data to update",
				YOU_ARE_NOT_ALLOWED_TO_UPDATE_USERS:
					"You are not allowed to update users",
				YOU_CANNOT_REMOVE_YOURSELF: "You cannot remove yourself",
				YOU_ARE_NOT_ALLOWED_TO_SET_NON_EXISTENT_VALUE:
					"You are not allowed to set a non-existent role value",
				YOU_CANNOT_IMPERSONATE_ADMINS: "You cannot impersonate admins",
				INVALID_ROLE_TYPE: "Invalid role type",
				YOU_ARE_NOT_ALLOWED_TO_SET_USERS_EMAIL:
					"You are not allowed to update users email",
				PASSWORD_CANNOT_BE_UPDATED_VIA_UPDATE_USER:
					"Password cannot be updated through update-user. Use the set-user-password endpoint instead",
			});
		function eg(e) {
			return "u" < typeof document ? null : (u(document.cookie).get(e) ?? null);
		}
		e.s(
			[
				"adminClient",
				0,
				(e) => {
					const t = { admin: ep, user: eh, ...e?.roles };
					return {
						id: "admin-client",
						version: en,
						$InferServerPlugin: {},
						getActions: () => ({
							admin: {
								checkRolePermission: (r) =>
									((e) => {
										if (e.userId && e.options?.adminUserIds?.includes(e.userId))
											return !0;
										if (!e.permissions) return !1;
										const t = (
												e.role ||
												e.options?.defaultRole ||
												"user"
											).split(","),
											r = e.options?.roles || eE;
										for (const a of t)
											if (r[a]?.authorize(e.permissions)?.success) return !0;
										return !1;
									})({
										role: r.role,
										options: { ac: e?.ac, roles: t },
										permissions: r.permissions,
									}),
							},
						}),
						pathMethods: {
							"/admin/list-users": "GET",
							"/admin/impersonate-user": "POST",
							"/admin/stop-impersonating": "POST",
						},
						atomListeners: [
							{
								matcher: (e) =>
									"/admin/impersonate-user" === e ||
									"/admin/stop-impersonating" === e,
								signal: "$sessionSignal",
							},
						],
						$ERROR_CODES: em,
					};
				},
			],
			64176,
		),
			e.s(
				[
					"customSessionClient",
					0,
					() => ({
						id: "infer-server-plugin",
						version: en,
						$InferServerPlugin: {},
					}),
				],
				82493,
			),
			e.s(
				[
					"deviceAuthorizationClient",
					0,
					() => ({
						id: "device-authorization",
						version: en,
						$InferServerPlugin: {},
						pathMethods: {
							"/device/code": "POST",
							"/device/token": "POST",
							"/device": "GET",
							"/device/approve": "POST",
							"/device/deny": "POST",
						},
					}),
				],
				22302,
			),
			e.s(
				[
					"lastLoginMethodClient",
					0,
					(e = {}) => {
						const t = e.cookieName || "cinaauth.last_used_login_method";
						return {
							id: "last-login-method-client",
							version: en,
							getActions: () => ({
								getLastUsedLoginMethod: () => eg(t),
								clearLastUsedLoginMethod: () => {
									if ("u" > typeof document) {
										const r = e.domain ? ` domain=${e.domain};` : "";
										document.cookie = `${t}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;${r}`;
									}
								},
								isLastUsedLoginMethod: (e) => eg(t) === e,
							}),
						};
					},
				],
				86712,
			);
		const e_ = S({ INVALID_SESSION_TOKEN: "Invalid session token" });
		e.s(
			[
				"multiSessionClient",
				0,
				() => ({
					id: "multi-session",
					version: en,
					$InferServerPlugin: {},
					atomListeners: [
						{
							matcher: (e) => "/multi-session/set-active" === e,
							signal: "$sessionSignal",
						},
					],
					$ERROR_CODES: e_,
				}),
			],
			2831,
		);
		const eO = ec({
				organization: ["update", "delete"],
				member: ["create", "update", "delete"],
				invitation: ["create", "cancel"],
				team: ["create", "update", "delete"],
				ac: ["create", "read", "update", "delete"],
			}),
			eT = eO.newRole({
				organization: ["update"],
				invitation: ["create", "cancel"],
				member: ["create", "update", "delete"],
				team: ["create", "update", "delete"],
				ac: ["create", "read", "update", "delete"],
			}),
			eR = eO.newRole({
				organization: ["update", "delete"],
				member: ["create", "update", "delete"],
				invitation: ["create", "cancel"],
				team: ["create", "update", "delete"],
				ac: ["create", "read", "update", "delete"],
			}),
			eb = eO.newRole({
				organization: [],
				member: [],
				invitation: [],
				team: [],
				ac: ["read"],
			}),
			eA = { admin: eT, owner: eR, member: eb },
			ev = S({
				YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_ORGANIZATION:
					"You are not allowed to create a new organization",
				YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS:
					"You have reached the maximum number of organizations",
				ORGANIZATION_ALREADY_EXISTS: "Organization already exists",
				ORGANIZATION_SLUG_ALREADY_TAKEN: "Organization slug already taken",
				ORGANIZATION_NOT_FOUND: "Organization not found",
				USER_IS_NOT_A_MEMBER_OF_THE_ORGANIZATION:
					"User is not a member of the organization",
				YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_ORGANIZATION:
					"You are not allowed to update this organization",
				YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_ORGANIZATION:
					"You are not allowed to delete this organization",
				NO_ACTIVE_ORGANIZATION: "No active organization",
				USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION:
					"User is already a member of this organization",
				MEMBER_NOT_FOUND: "Member not found",
				ROLE_NOT_FOUND: "Role not found",
				YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_TEAM:
					"You are not allowed to create a new team",
				TEAM_ALREADY_EXISTS: "Team already exists",
				TEAM_NOT_FOUND: "Team not found",
				YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER:
					"You cannot leave the organization as the only owner",
				YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER:
					"You cannot leave the organization without an owner",
				YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_MEMBER:
					"You are not allowed to delete this member",
				YOU_ARE_NOT_ALLOWED_TO_INVITE_USERS_TO_THIS_ORGANIZATION:
					"You are not allowed to invite users to this organization",
				USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION:
					"User is already invited to this organization",
				INVITATION_NOT_FOUND: "Invitation not found",
				YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION:
					"You are not the recipient of the invitation",
				EMAIL_VERIFICATION_REQUIRED_BEFORE_ACCEPTING_OR_REJECTING_INVITATION:
					"Email verification required before accepting or rejecting invitation",
				EMAIL_VERIFICATION_REQUIRED_FOR_INVITATION:
					"Email verification required to view or list invitations for the session email",
				YOU_ARE_NOT_ALLOWED_TO_CANCEL_THIS_INVITATION:
					"You are not allowed to cancel this invitation",
				INVITER_IS_NO_LONGER_A_MEMBER_OF_THE_ORGANIZATION:
					"Inviter is no longer a member of the organization",
				YOU_ARE_NOT_ALLOWED_TO_INVITE_USER_WITH_THIS_ROLE:
					"You are not allowed to invite a user with this role",
				FAILED_TO_RETRIEVE_INVITATION: "Failed to retrieve invitation",
				YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_TEAMS:
					"You have reached the maximum number of teams",
				UNABLE_TO_REMOVE_LAST_TEAM: "Unable to remove last team",
				YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_MEMBER:
					"You are not allowed to update this member",
				ORGANIZATION_MEMBERSHIP_LIMIT_REACHED:
					"Organization membership limit reached",
				YOU_ARE_NOT_ALLOWED_TO_CREATE_TEAMS_IN_THIS_ORGANIZATION:
					"You are not allowed to create teams in this organization",
				YOU_ARE_NOT_ALLOWED_TO_DELETE_TEAMS_IN_THIS_ORGANIZATION:
					"You are not allowed to delete teams in this organization",
				YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_TEAM:
					"You are not allowed to update this team",
				YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_TEAM:
					"You are not allowed to delete this team",
				INVITATION_LIMIT_REACHED: "Invitation limit reached",
				TEAM_MEMBER_LIMIT_REACHED: "Team member limit reached",
				USER_IS_NOT_A_MEMBER_OF_THE_TEAM: "User is not a member of the team",
				YOU_CAN_NOT_ACCESS_THE_MEMBERS_OF_THIS_TEAM:
					"You are not allowed to list the members of this team",
				YOU_DO_NOT_HAVE_AN_ACTIVE_TEAM: "You do not have an active team",
				YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_TEAM_MEMBER:
					"You are not allowed to create a new member",
				YOU_ARE_NOT_ALLOWED_TO_REMOVE_A_TEAM_MEMBER:
					"You are not allowed to remove a team member",
				YOU_ARE_NOT_ALLOWED_TO_ACCESS_THIS_ORGANIZATION:
					"You are not allowed to access this organization as an owner",
				YOU_ARE_NOT_A_MEMBER_OF_THIS_ORGANIZATION:
					"You are not a member of this organization",
				MISSING_AC_INSTANCE:
					"Dynamic Access Control requires a pre-defined ac instance on the server auth plugin. Read server logs for more information",
				YOU_MUST_BE_IN_AN_ORGANIZATION_TO_CREATE_A_ROLE:
					"You must be in an organization to create a role",
				YOU_ARE_NOT_ALLOWED_TO_CREATE_A_ROLE:
					"You are not allowed to create a role",
				YOU_ARE_NOT_ALLOWED_TO_UPDATE_A_ROLE:
					"You are not allowed to update a role",
				YOU_ARE_NOT_ALLOWED_TO_DELETE_A_ROLE:
					"You are not allowed to delete a role",
				YOU_ARE_NOT_ALLOWED_TO_READ_A_ROLE:
					"You are not allowed to read a role",
				YOU_ARE_NOT_ALLOWED_TO_LIST_A_ROLE:
					"You are not allowed to list a role",
				YOU_ARE_NOT_ALLOWED_TO_GET_A_ROLE: "You are not allowed to get a role",
				TOO_MANY_ROLES: "This organization has too many roles",
				INVALID_RESOURCE:
					"The provided permission includes an invalid resource",
				ROLE_NAME_IS_ALREADY_TAKEN: "That role name is already taken",
				CANNOT_DELETE_A_PRE_DEFINED_ROLE: "Cannot delete a pre-defined role",
				ROLE_IS_ASSIGNED_TO_MEMBERS:
					"Cannot delete a role that is assigned to members. Please reassign the members to a different role first",
				INVALID_TEAM_ID: "Team id contains a reserved character",
			});
		e.s(
			[
				"organizationClient",
				0,
				(e) => {
					const t = Q(!1),
						r = Q(!1),
						a = Q(!1),
						n = Q(!1),
						o = { admin: eT, member: eb, owner: eR, ...e?.roles };
					return {
						id: "organization",
						version: en,
						$InferServerPlugin: {},
						getActions: (t, r, a) => ({
							$Infer: {
								ActiveOrganization: {},
								Organization: {},
								Invitation: {},
								Member: {},
								Team: {},
							},
							organization: {
								checkRolePermission: (t) => {
									let r;
									return ((e, t) => {
										if (!e.permissions) return !1;
										const r = e.role.split(","),
											a = e.options.creatorRole || "owner",
											n = r.includes(a),
											o = e.allowCreatorAllPermissions || !1;
										if (n && o) return !0;
										for (const a of r)
											if (t[a]?.authorize(e.permissions)?.success) return !0;
										return !1;
									})(
										(r = {
											role: t.role,
											options: { ac: e?.ac, roles: o },
											permissions: t.permissions,
										}),
										r.options.roles || eA,
									);
								},
							},
						}),
						getAtoms: (e) => {
							const o = er(t, "/organization/list", e, { method: "GET" });
							return {
								$listOrg: t,
								$activeOrgSignal: r,
								$activeMemberSignal: a,
								$activeMemberRoleSignal: n,
								activeOrganization: er(
									[r],
									"/organization/get-full-organization",
									e,
									() => ({ method: "GET" }),
								),
								listOrganizations: o,
								activeMember: er([r, a], "/organization/get-active-member", e, {
									method: "GET",
								}),
								activeMemberRole: er(
									[r, n],
									"/organization/get-active-member-role",
									e,
									{ method: "GET" },
								),
							};
						},
						pathMethods: {
							"/organization/get-full-organization": "GET",
							"/organization/list-user-teams": "GET",
						},
						atomListeners: [
							{
								matcher: (e) =>
									"/organization/create" === e ||
									"/organization/delete" === e ||
									"/organization/update" === e,
								signal: "$listOrg",
							},
							{
								matcher: (e) =>
									"/sign-out" === e || e.startsWith("/organization"),
								signal: "$activeOrgSignal",
							},
							{
								matcher: (e) =>
									e.startsWith("/organization/set-active") ||
									"/organization/create" === e ||
									"/organization/delete" === e ||
									"/organization/remove-member" === e ||
									"/organization/leave" === e ||
									"/organization/accept-invitation" === e,
								signal: "$sessionSignal",
							},
							{
								matcher: (e) =>
									e.includes("/organization/update-member-role") ||
									e.startsWith("/organization/set-active"),
								signal: "$activeMemberSignal",
							},
							{
								matcher: (e) =>
									e.includes("/organization/update-member-role") ||
									e.startsWith("/organization/set-active"),
								signal: "$activeMemberRoleSignal",
							},
						],
						$ERROR_CODES: ev,
					};
				},
			],
			92164,
		);
		const ey = S({
				OTP_NOT_ENABLED: "OTP not enabled",
				OTP_HAS_EXPIRED: "OTP has expired",
				TOTP_NOT_ENABLED: "TOTP not enabled",
				TWO_FACTOR_NOT_ENABLED: "Two factor isn't enabled",
				BACKUP_CODES_NOT_ENABLED: "Backup codes aren't enabled",
				INVALID_BACKUP_CODE: "Invalid backup code",
				INVALID_CODE: "Invalid code",
				TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE:
					"Too many attempts. Please request a new code.",
				INVALID_TWO_FACTOR_COOKIE: "Invalid two factor cookie",
			}),
			eI = ["javascript:", "data:", "vbscript:"];
		function ew(e) {
			let t;
			try {
				t = new URL(e);
			} catch {
				return !0;
			}
			return !eI.includes(t.protocol);
		}
		e.s(
			[
				"twoFactorClient",
				0,
				(e) => ({
					id: "two-factor",
					version: en,
					$InferServerPlugin: {},
					atomListeners: [
						{
							matcher: (e) => e.startsWith("/two-factor/"),
							signal: "$sessionSignal",
						},
					],
					pathMethods: {
						"/two-factor/disable": "POST",
						"/two-factor/enable": "POST",
						"/two-factor/send-otp": "POST",
						"/two-factor/generate-backup-codes": "POST",
						"/two-factor/get-totp-uri": "POST",
						"/two-factor/verify-totp": "POST",
						"/two-factor/verify-otp": "POST",
						"/two-factor/verify-backup-code": "POST",
					},
					fetchPlugins: [
						{
							id: "two-factor",
							name: "two-factor",
							hooks: {
								async onSuccess(t) {
									if (t.data?.twoFactorRedirect) {
										if (e?.onTwoFactorRedirect)
											return void (await e.onTwoFactorRedirect({
												twoFactorMethods: t.data.twoFactorMethods,
											}));
										e?.twoFactorPage &&
											ew(e.twoFactorPage) &&
											(window.location.href = e.twoFactorPage);
									}
								},
							},
						},
					],
					$ERROR_CODES: ey,
				}),
			],
			65382,
		);
		const eN = S({
			OTP_EXPIRED: "OTP expired",
			INVALID_OTP: "Invalid OTP",
			TOO_MANY_ATTEMPTS: "Too many attempts",
		});
		function eS(e) {
			let t = e.length;
			for (; t > 0 && 47 === e.charCodeAt(t - 1); ) t--;
			return t === e.length ? e : e.slice(0, t);
		}
		function eL(e, t = "/api/auth") {
			try {
				const t = new URL(e);
				if ("http:" !== t.protocol && "https:" !== t.protocol)
					throw new es(
						`Invalid base URL: ${e}. URL must include 'http://' or 'https://'`,
					);
			} catch (t) {
				if (t instanceof es) throw t;
				throw new es(
					`Invalid base URL: ${e}. Please provide a valid base URL.`,
					{ cause: t },
				);
			}
			if (
				(function (e) {
					try {
						return "/" !== (eS(new URL(e).pathname) || "/");
					} catch {
						throw new es(
							`Invalid base URL: ${e}. Please provide a valid base URL.`,
						);
					}
				})(e)
			)
				return e;
			const r = eS(e);
			return t && "/" !== t
				? ((t = t.startsWith("/") ? t : `/${t}`), `${r}${t}`)
				: r;
		}
		e.s(
			[
				"emailOTPClient",
				0,
				() => ({
					id: "email-otp",
					version: en,
					$InferServerPlugin: {},
					atomListeners: [
						{
							matcher: (e) =>
								"/email-otp/verify-email" === e ||
								"/sign-in/email-otp" === e ||
								"/email-otp/request-email-change" === e,
							signal: "$sessionSignal",
						},
					],
					$ERROR_CODES: eN,
				}),
			],
			84773,
		);
		const eU = {
				proto:
					/"(?:_|\\u0{2}5[Ff]){2}(?:p|\\u0{2}70)(?:r|\\u0{2}72)(?:o|\\u0{2}6[Ff])(?:t|\\u0{2}74)(?:o|\\u0{2}6[Ff])(?:_|\\u0{2}5[Ff]){2}"\s*:/,
				constructor:
					/"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/,
				protoShort: /"__proto__"\s*:/,
				constructorShort: /"constructor"\s*:/,
			},
			eD = /^\s*["[{]|^\s*-?\d{1,16}(\.\d{1,17})?([Ee][+-]?\d+)?\s*$/,
			eC = {
				true: !0,
				false: !1,
				null: null,
				undefined: void 0,
				nan: NaN,
				infinity: 1 / 0,
				"-infinity": -1 / 0,
			},
			ex =
				/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,7}))?(?:Z|([+-])(\d{2}):(\d{2}))$/,
			eP = {
				id: "redirect",
				name: "Redirect",
				hooks: {
					onSuccess(e) {
						if (
							e.data?.url &&
							e.data?.redirect &&
							ew(e.data.url) &&
							window.location &&
							window.location
						)
							try {
								window.location.href = e.data.url;
							} catch {}
					},
				},
			},
			eM = Symbol.for("cinaauth:broadcast-channel");
		var ek = class {
			listeners = new Set();
			name;
			constructor(e = "cinaauth.message") {
				this.name = e;
			}
			subscribe(e) {
				return (
					this.listeners.add(e),
					() => {
						this.listeners.delete(e);
					}
				);
			}
			post(e) {
				try {
					localStorage.setItem(
						this.name,
						JSON.stringify({ ...e, timestamp: Math.floor(Date.now() / 1e3) }),
					);
				} catch {}
			}
			setup() {
				if (void 0 === window.addEventListener) return () => {};
				const e = (e) => {
					if (e.key !== this.name) return;
					const t = JSON.parse(e.newValue ?? "{}");
					t?.event === "session" &&
						t?.data &&
						this.listeners.forEach((e) => e(t));
				};
				return (
					window.addEventListener("storage", e),
					() => {
						window.removeEventListener("storage", e);
					}
				);
			}
		};
		function eY(e = "cinaauth.message") {
			return globalThis[eM] || (globalThis[eM] = new ek(e)), globalThis[eM];
		}
		const eB = Symbol.for("cinaauth:focus-manager");
		var eF = class {
			listeners = new Set();
			subscribe(e) {
				return (
					this.listeners.add(e),
					() => {
						this.listeners.delete(e);
					}
				);
			}
			setFocused(e) {
				this.listeners.forEach((t) => t(e));
			}
			setup() {
				if ("u" < typeof document || void 0 === window.addEventListener)
					return () => {};
				const e = () => {
					"visible" === document.visibilityState && this.setFocused(!0);
				};
				return (
					document.addEventListener("visibilitychange", e, !1),
					() => {
						document.removeEventListener("visibilitychange", e, !1);
					}
				);
			}
		};
		function eH() {
			return globalThis[eB] || (globalThis[eB] = new eF()), globalThis[eB];
		}
		const eV = Symbol.for("cinaauth:online-manager");
		var e$ = class {
			listeners = new Set();
			isOnline = "u" < typeof navigator || navigator.onLine;
			subscribe(e) {
				return (
					this.listeners.add(e),
					() => {
						this.listeners.delete(e);
					}
				);
			}
			setOnline(e) {
				(this.isOnline = e), this.listeners.forEach((t) => t(e));
			}
			setup() {
				if (void 0 === window.addEventListener) return () => {};
				const e = () => this.setOnline(!0),
					t = () => this.setOnline(!1);
				return (
					window.addEventListener("online", e, !1),
					window.addEventListener("offline", t, !1),
					() => {
						window.removeEventListener("online", e, !1),
							window.removeEventListener("offline", t, !1);
					}
				);
			}
		};
		function ez() {
			return globalThis[eV] || (globalThis[eV] = new e$()), globalThis[eV];
		}
		const ej = () => Math.floor(Date.now() / 1e3);
		function eG(e) {
			return "object" == typeof e && null !== e && "data" in e && "error" in e
				? e
				: { data: e, error: null };
		}
		function eW(e, t) {
			return (
				q(e.data, t.data) &&
				e.error === t.error &&
				e.isPending === t.isPending &&
				e.isRefetching === t.isRefetching &&
				e.refetch === t.refetch
			);
		}
		function eq(e) {
			if (null === e || "object" != typeof e) return !1;
			const t = Object.getPrototypeOf(e);
			return (
				(null === t ||
					t === Object.prototype ||
					null === Object.getPrototypeOf(t)) &&
				!(Symbol.iterator in e) &&
				(!(Symbol.toStringTag in e) ||
					"[object Module]" === Object.prototype.toString.call(e))
			);
		}
		function eK(e) {
			return (...t) =>
				t.reduce(
					(t, r) =>
						(function e(t, r, a = ".", n) {
							if (!eq(r)) return e(t, {}, a, n);
							const o = { ...r };
							for (const r of Object.keys(t)) {
								if ("__proto__" === r || "constructor" === r) continue;
								const i = t[r];
								null != i &&
									((n && n(o, r, i, a)) ||
										(Array.isArray(i) && Array.isArray(o[r])
											? (o[r] = [...i, ...o[r]])
											: eq(i) && eq(o[r])
												? (o[r] = e(
														i,
														o[r],
														(a ? `${a}.` : "") + r.toString(),
														n,
													))
												: (o[r] = i)));
							}
							return o;
						})(t, r, "", e),
					{},
				);
		}
		const eX = eK();
		eK((e, t, r) => {
			if (void 0 !== e[t] && "function" == typeof r)
				return (e[t] = r(e[t])), !0;
		}),
			eK((e, t, r) => {
				if (Array.isArray(e[t]) && "function" == typeof r)
					return (e[t] = r(e[t])), !0;
			});
		var eZ = Object.defineProperty,
			eJ = Object.defineProperties,
			eQ = Object.getOwnPropertyDescriptors,
			e0 = Object.getOwnPropertySymbols,
			e1 = Object.prototype.hasOwnProperty,
			e2 = Object.prototype.propertyIsEnumerable,
			e4 = (e, t, r) =>
				t in e
					? eZ(e, t, {
							enumerable: !0,
							configurable: !0,
							writable: !0,
							value: r,
						})
					: (e[t] = r),
			e5 = (e, t) => {
				for (var r in t || (t = {})) e1.call(t, r) && e4(e, r, t[r]);
				if (e0) for (var r of e0(t)) e2.call(t, r) && e4(e, r, t[r]);
				return e;
			},
			e3 = (e, t) => eJ(e, eQ(t)),
			e6 = class extends Error {
				constructor(e, t, r) {
					super(t || e.toString(), { cause: r }),
						(this.status = e),
						(this.statusText = t),
						(this.error = r),
						Error.captureStackTrace(this, this.constructor);
				}
			},
			e7 = async (e, t) => {
				var r, a, n, o, i, s;
				let l = t || {},
					u = {
						onRequest: [null == t ? void 0 : t.onRequest],
						onResponse: [null == t ? void 0 : t.onResponse],
						onSuccess: [null == t ? void 0 : t.onSuccess],
						onError: [null == t ? void 0 : t.onError],
						onRetry: [null == t ? void 0 : t.onRetry],
					};
				if (!t || !(null == t ? void 0 : t.plugins))
					return { url: e, options: l, hooks: u };
				for (const d of (null == t ? void 0 : t.plugins) || []) {
					if (d.init) {
						const a = await (null == (r = d.init)
							? void 0
							: r.call(d, e.toString(), t));
						(l = a.options || l), (e = a.url);
					}
					u.onRequest.push(null == (a = d.hooks) ? void 0 : a.onRequest),
						u.onResponse.push(null == (n = d.hooks) ? void 0 : n.onResponse),
						u.onSuccess.push(null == (o = d.hooks) ? void 0 : o.onSuccess),
						u.onError.push(null == (i = d.hooks) ? void 0 : i.onError),
						u.onRetry.push(null == (s = d.hooks) ? void 0 : s.onRetry);
				}
				return { url: e, options: l, hooks: u };
			},
			e8 = class {
				constructor(e) {
					this.options = e;
				}
				shouldAttemptRetry(e, t) {
					return this.options.shouldRetry
						? Promise.resolve(
								e < this.options.attempts && this.options.shouldRetry(t),
							)
						: Promise.resolve(e < this.options.attempts);
				}
				getDelay() {
					return this.options.delay;
				}
			},
			e9 = class {
				constructor(e) {
					this.options = e;
				}
				shouldAttemptRetry(e, t) {
					return this.options.shouldRetry
						? Promise.resolve(
								e < this.options.attempts && this.options.shouldRetry(t),
							)
						: Promise.resolve(e < this.options.attempts);
				}
				getDelay(e) {
					return Math.min(
						this.options.maxDelay,
						this.options.baseDelay * 2 ** e,
					);
				}
			},
			te = async (e) => {
				const t = {},
					r = async (e) => ("function" == typeof e ? await e() : e);
				if (null == e ? void 0 : e.auth) {
					if ("Bearer" === e.auth.type) {
						const a = await r(e.auth.token);
						if (!a) return t;
						t.authorization = `Bearer ${a}`;
					} else if ("Basic" === e.auth.type) {
						const [a, n] = await Promise.all([
							r(e.auth.username),
							r(e.auth.password),
						]);
						if (!a || !n) return t;
						t.authorization = `Basic ${btoa(`${a}:${n}`)}`;
					} else if ("Custom" === e.auth.type) {
						const [a, n] = await Promise.all([
							r(e.auth.prefix),
							r(e.auth.value),
						]);
						if (!n) return t;
						t.authorization = `${null != a ? a : ""} ${n}`;
					}
				}
				return t;
			},
			tt = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(;.+)?$/i;
		function tr(e) {
			if (void 0 === e) return !1;
			const t = typeof e;
			return (
				"string" === t ||
				"number" === t ||
				"boolean" === t ||
				null === t ||
				("object" === t &&
					(!!Array.isArray(e) ||
						(!e.buffer &&
							((e.constructor && "Object" === e.constructor.name) ||
								"function" == typeof e.toJSON))))
			);
		}
		function ta(e) {
			try {
				return JSON.parse(e);
			} catch (t) {
				return e;
			}
		}
		function tn(e) {
			return "function" == typeof e;
		}
		function to(...e) {
			const t = {};
			for (const r of e)
				if (r)
					if (r instanceof Headers)
						r.forEach((e, r) => {
							t[r] = e;
						});
					else
						for (const [e, a] of Array.isArray(r) ? r : Object.entries(r))
							null != a && (t[e] = a);
			return t;
		}
		async function ti(e) {
			const t = new Headers(to(null == e ? void 0 : e.headers, await te(e)));
			if (!t.has("content-type")) {
				const r = tr(null == e ? void 0 : e.body) ? "application/json" : null;
				r && t.set("content-type", r);
			}
			return t;
		}
		var ts = class e extends Error {
			constructor(t, r) {
				super(r || JSON.stringify(t, null, 2)),
					(this.issues = t),
					Object.setPrototypeOf(this, e.prototype);
			}
		};
		async function tl(e, t) {
			const r = await e["~standard"].validate(t);
			if (r.issues) throw new ts(r.issues);
			return r.value;
		}
		var tu = ["get", "post", "put", "patch", "delete"],
			td = async (e, t) => {
				var r, a, n, o, i, s, l, u;
				let d,
					{ hooks: c, url: f, options: p } = await e7(e, t),
					h = (function (e) {
						if (null == e ? void 0 : e.customFetchImpl)
							return e.customFetchImpl;
						if ("u" > typeof globalThis && tn(globalThis.fetch))
							return globalThis.fetch;
						if ("u" > typeof window && tn(window.fetch)) return window.fetch;
						throw Error("No fetch implementation found");
					})(p),
					E = new AbortController(),
					m = null != (r = p.signal) ? r : E.signal,
					g = (function (e, t) {
						let {
								baseURL: r,
								params: a,
								query: n,
							} = t || { query: {}, params: {}, baseURL: "" },
							o = e.startsWith("http")
								? e.split("/").slice(0, 3).join("/")
								: r || "";
						if (e.startsWith("@")) {
							const t = e.toString().split("@")[1].split("/")[0];
							tu.includes(t) && (e = e.replace(`@${t}/`, "/"));
						}
						o.endsWith("/") || (o += "/");
						let [i, s] = e.replace(o, "").split("?"),
							l = new URLSearchParams(s);
						for (const [e, t] of Object.entries(n || {})) {
							let r;
							if (null != t) {
								if ("string" == typeof t) r = t;
								else if (Array.isArray(t)) {
									for (const r of t) l.append(e, r);
									continue;
								} else r = JSON.stringify(t);
								l.set(e, r);
							}
						}
						const u = new Map();
						if (a)
							if (Array.isArray(a))
								for (const [e, t] of i
									.split("/")
									.filter((e) => e.startsWith(":"))
									.entries()) {
									const r = a[e];
									u.set(t, String(r));
								}
							else
								for (const [e, t] of Object.entries(a))
									u.set(`:${e}`, String(t));
						i = (i = i
							.split("/")
							.map((e) =>
								(function (e, t) {
									let r,
										a = e;
									for (const [e, r] of t) a = a.replace(e, r);
									if ("." === (r = a) || ".." === r)
										throw TypeError(
											"Path parameters cannot be reserved path segments",
										);
									return encodeURIComponent(a);
								})(e, u),
							)
							.join("/")).replace(/^\/+/, "");
						let d = l.toString();
						return ((d = d.length > 0 ? `?${d}`.replace(/\+/g, "%20") : ""),
						o.startsWith("http"))
							? new URL(`${i}${d}`, o)
							: `${o}${i}${d}`;
					})(f, p),
					_ = await ti(p),
					O = (function (e, t) {
						let r,
							{ body: a } = e;
						return a
							? tr(a) && "string" != typeof a
								? "application/x-www-form-urlencoded" ===
									((r = t.get("content-type"))
										? r.split(";")[0].trim().toLowerCase()
										: null)
									? new URLSearchParams(a).toString()
									: JSON.stringify(a)
								: a
							: null;
					})(p, _),
					T = (function (e, t) {
						var r;
						if (null == t ? void 0 : t.method) return t.method.toUpperCase();
						if (e.startsWith("@")) {
							const a =
								null == (r = e.split("@")[1]) ? void 0 : r.split("/")[0];
							return tu.includes(a)
								? a.toUpperCase()
								: (null == t ? void 0 : t.body)
									? "POST"
									: "GET";
						}
						return (null == t ? void 0 : t.body) ? "POST" : "GET";
					})(f, p),
					R = e3(e5({}, p), {
						url: g,
						headers: _,
						body: O,
						method: T,
						signal: m,
					});
				for (const e of c.onRequest)
					if (e) {
						const t = await e(R);
						"object" == typeof t && null !== t && Object.assign(R, t);
					}
				(("pipeTo" in R && "function" == typeof R.pipeTo) ||
					"function" ==
						typeof (null == (a = null == t ? void 0 : t.body)
							? void 0
							: a.pipe)) &&
					!("duplex" in R) &&
					(R.duplex = "half");
				let { clearTimeout: b } =
						(!(null == p ? void 0 : p.signal) &&
							(null == p ? void 0 : p.timeout) &&
							(d = setTimeout(
								() => (null == E ? void 0 : E.abort()),
								null == p ? void 0 : p.timeout,
							)),
						{
							abortTimeout: d,
							clearTimeout: () => {
								d && clearTimeout(d);
							},
						}),
					A = await h(R.url, R);
				b();
				const v = { response: A, request: R };
				for (const e of c.onResponse)
					if (e) {
						const r = await e(
							e3(e5({}, v), {
								response: (
									null == (n = null == t ? void 0 : t.hookOptions)
										? void 0
										: n.cloneResponse
								)
									? A.clone()
									: A,
							}),
						);
						r instanceof Response
							? (A = r)
							: "object" == typeof r && null !== r && (A = r.response);
					}
				if (A.ok) {
					if ("HEAD" === R.method) return { data: "", error: null };
					const e = (function (e) {
							const t = e.headers.get("content-type"),
								r = new Set([
									"image/svg",
									"application/xml",
									"application/xhtml",
									"application/html",
								]);
							if (!t) return "json";
							const a = t.split(";").shift() || "";
							return tt.test(a)
								? "json"
								: r.has(a) || a.startsWith("text/")
									? "text"
									: "blob";
						})(A),
						r = { data: null, response: A, request: R };
					if ("json" === e || "text" === e) {
						const e = await A.text(),
							t = null != (o = R.jsonParser) ? o : ta;
						r.data = await t(e);
					} else r.data = await A[e]();
					for (const e of ((null == R ? void 0 : R.output) &&
						R.output &&
						!R.disableValidation &&
						(r.data = await tl(R.output, r.data)),
					c.onSuccess))
						e &&
							(await e(
								e3(e5({}, r), {
									response: (
										null == (i = null == t ? void 0 : t.hookOptions)
											? void 0
											: i.cloneResponse
									)
										? A.clone()
										: A,
								}),
							));
					return (null == t ? void 0 : t.throw)
						? r.data
						: { data: r.data, error: null };
				}
				const y = null != (s = null == t ? void 0 : t.jsonParser) ? s : ta,
					I = await A.text(),
					w = (function (e) {
						try {
							return JSON.parse(e), !0;
						} catch (e) {
							return !1;
						}
					})(I),
					N = w ? await y(I) : null,
					S = {
						response: A,
						responseText: I,
						request: R,
						error: e3(e5({}, N), {
							status: A.status,
							statusText: A.statusText,
						}),
					};
				for (const e of c.onError)
					e &&
						(await e(
							e3(e5({}, S), {
								response: (
									null == (l = null == t ? void 0 : t.hookOptions)
										? void 0
										: l.cloneResponse
								)
									? A.clone()
									: A,
							}),
						));
				if (null == t ? void 0 : t.retry) {
					const r = (function (e) {
							if ("number" == typeof e)
								return new e8({ type: "linear", attempts: e, delay: 1e3 });
							switch (e.type) {
								case "linear":
									return new e8(e);
								case "exponential":
									return new e9(e);
								default:
									throw Error("Invalid retry strategy");
							}
						})(t.retry),
						a = null != (u = t.retryAttempt) ? u : 0;
					if (await r.shouldAttemptRetry(a, A)) {
						for (const e of c.onRetry) e && (await e(v));
						const n = r.getDelay(a);
						return (
							await new Promise((e) => setTimeout(e, n)),
							await td(e, e3(e5({}, t), { retryAttempt: a + 1 }))
						);
					}
				}
				if (null == t ? void 0 : t.throw)
					throw new e6(A.status, A.statusText, w ? N : I);
				return {
					data: null,
					error: e3(e5({}, N), { status: A.status, statusText: A.statusText }),
				};
			};
		const tc = /[\p{Ll}\d]+|\p{Lu}+(?!\p{Ll})|\p{Lu}[\p{Ll}\d]+|\p{Lo}+/gu,
			tf = /['\u2019]/g;
		function tp(e) {
			return (e.replace(tf, "").match(tc) ?? [])
				.map((e) => e.toLowerCase())
				.join("-");
		}
		var th = e.i(57319);
		e.s(
			[
				"createAuthClient",
				0,
				function (e) {
					var t;
					const {
							pluginPathMethods: r,
							pluginsActions: a,
							pluginsAtoms: n,
							$fetch: i,
							$store: s,
							atomListeners: l,
						} = ((e) => {
							var t;
							let r,
								a,
								n,
								i,
								s,
								l,
								u,
								d = "credentials" in Request.prototype,
								c =
									(function (e, t, r, a) {
										if (e) return eL(e, t);
										if (!1 !== a) {
											const e =
												p.CINAAUTH_URL ||
												p.NEXT_PUBLIC_CINAAUTH_URL ||
												p.PUBLIC_CINAAUTH_URL ||
												p.NUXT_PUBLIC_CINAAUTH_URL ||
												p.NUXT_PUBLIC_AUTH_URL ||
												("/" !== p.BASE_URL ? p.BASE_URL : void 0);
											if (e) return eL(e, t);
										}
										r?.headers.get("x-forwarded-host"),
											r?.headers.get("x-forwarded-proto");
										if (r) {
											const e = (function (e) {
												try {
													const t = new URL(e);
													return "null" === t.origin ? null : t.origin;
												} catch {
													return null;
												}
											})(r.url);
											if (!e)
												throw new es(
													"Could not get origin from request. Please provide a valid base URL.",
												);
											return eL(e, t);
										}
										if (window.location) return eL(window.location.origin, t);
									})(e?.baseURL, e?.basePath, void 0, void 0) ??
									((e) => {
										if (
											void 0 !== o.default &&
											o.default.env.NEXT_PUBLIC_AUTH_URL
										)
											return o.default.env.NEXT_PUBLIC_AUTH_URL;
									})(e?.basePath) ??
									"/api/auth",
								f =
									e?.plugins
										?.flatMap((e) => e.fetchPlugins)
										.filter((e) => void 0 !== e) || [],
								h = {
									id: "lifecycle-hooks",
									name: "lifecycle-hooks",
									hooks: {
										onSuccess: e?.fetchOptions?.onSuccess,
										onError: e?.fetchOptions?.onError,
										onRequest: e?.fetchOptions?.onRequest,
										onResponse: e?.fetchOptions?.onResponse,
									},
								},
								{
									onSuccess: E,
									onError: m,
									onRequest: g,
									onResponse: _,
									...O
								} = e?.fetchOptions || {},
								T =
									((t = {
										baseURL: c,
										...(d ? { credentials: "include" } : {}),
										method: "GET",
										jsonParser: (e) =>
											e
												? (function (e, t = { strict: !0 }) {
														return (function (e, t = {}) {
															const {
																strict: r = !1,
																warnings: a = !1,
																reviver: n,
																parseDates: o = !0,
															} = t;
															if ("string" != typeof e) return e;
															const i = e.trim(),
																s = i.toLowerCase();
															if (s.length <= 9 && s in eC) return eC[s];
															if (!eD.test(i)) {
																if (r)
																	throw SyntaxError(
																		"[better-json] Invalid JSON",
																	);
																return e;
															}
															if (
																Object.entries(eU).some(([e, t]) => {
																	const r = t.test(i);
																	return (
																		r &&
																			a &&
																			console.warn(
																				`[better-json] Detected potential prototype pollution attempt using ${e} pattern`,
																			),
																		r
																	);
																}) &&
																r
															)
																throw Error(
																	"[better-json] Potential prototype pollution attempt detected",
																);
															try {
																return JSON.parse(i, (e, t) => {
																	if (
																		"__proto__" === e ||
																		("constructor" === e &&
																			t &&
																			"object" == typeof t &&
																			"prototype" in t)
																	) {
																		a &&
																			console.warn(
																				`[better-json] Dropping "${e}" key to prevent prototype pollution`,
																			);
																		return;
																	}
																	if (o && "string" == typeof t) {
																		const e = (function (e) {
																			const t = ex.exec(e);
																			if (!t) return null;
																			const [, r, a, n, o, i, s, l, u, d, c] =
																					t,
																				f = new Date(
																					Date.UTC(
																						parseInt(r, 10),
																						parseInt(a, 10) - 1,
																						parseInt(n, 10),
																						parseInt(o, 10),
																						parseInt(i, 10),
																						parseInt(s, 10),
																						l
																							? parseInt(l.padEnd(3, "0"), 10)
																							: 0,
																					),
																				);
																			if (u) {
																				const e =
																					(60 * parseInt(d, 10) +
																						parseInt(c, 10)) *
																					("+" === u ? -1 : 1);
																				f.setUTCMinutes(f.getUTCMinutes() + e);
																			}
																			return f instanceof Date &&
																				!isNaN(f.getTime())
																				? f
																				: null;
																		})(t);
																		if (e) return e;
																	}
																	return n ? n(e, t) : t;
																});
															} catch (t) {
																if (r) throw t;
																return e;
															}
														})(e, t);
													})(e, { strict: !1 })
												: null,
										customFetchImpl: fetch,
										...O,
										plugins: [
											h,
											...(O.plugins || []),
											...(e?.disableDefaultFetchPlugins ? [] : [eP]),
											...f,
										],
									}),
									async function (e, r) {
										let a,
											n = e3(e5(e5({}, t), r), {
												headers: to(
													null == t ? void 0 : t.headers,
													null == r ? void 0 : r.headers,
												),
												plugins: [
													...((null == t ? void 0 : t.plugins) || []),
													((a = t || {}),
													{
														id: "apply-schema",
														name: "Apply Schema",
														version: "1.0.0",
														async init(e, t) {
															var r, n, o, i;
															const s =
																(null ==
																(n =
																	null == (r = a.plugins)
																		? void 0
																		: r.find((t) => {
																				var r;
																				return (
																					null != (r = t.schema) &&
																					!!r.config &&
																					(e.startsWith(
																						t.schema.config.baseURL || "",
																					) ||
																						e.startsWith(
																							t.schema.config.prefix || "",
																						))
																				);
																			}))
																	? void 0
																	: n.schema) || a.schema;
															if (s) {
																let r = e;
																(null == (o = s.config) ? void 0 : o.prefix) &&
																	r.startsWith(s.config.prefix) &&
																	((r = r.replace(s.config.prefix, "")),
																	s.config.baseURL &&
																		(e = e.replace(
																			s.config.prefix,
																			s.config.baseURL,
																		))),
																	(null == (i = s.config)
																		? void 0
																		: i.baseURL) &&
																		r.startsWith(s.config.baseURL) &&
																		(r = r.replace(s.config.baseURL, "")),
																	r.startsWith("/") &&
																		"@" === r.charAt(1) &&
																		(r = r.substring(1));
																const a = s.schema[r];
																if (a) {
																	let r = null == t ? void 0 : t.headers;
																	if (
																		a.headers &&
																		!(null == t ? void 0 : t.disableValidation)
																	) {
																		const e = {};
																		if (null == t ? void 0 : t.headers) {
																			if (t.headers instanceof Headers)
																				t.headers.forEach((t, r) => {
																					e[r.toLowerCase()] = t;
																				});
																			else if ("object" == typeof t.headers)
																				for (const [r, a] of Object.entries(
																					t.headers,
																				))
																					null != a && (e[r.toLowerCase()] = a);
																		}
																		const n = await tl(a.headers, e),
																			o = {};
																		for (const [e, t] of Object.entries(n))
																			o[e.toLowerCase()] = t;
																		r = o;
																	}
																	let n = e3(e5({}, t), {
																		method: a.method,
																		output: a.output,
																		headers: r,
																	});
																	return (
																		(null == t
																			? void 0
																			: t.disableValidation) ||
																			(n = e3(e5({}, n), {
																				body: a.input
																					? await tl(
																							a.input,
																							null == t ? void 0 : t.body,
																						)
																					: null == t
																						? void 0
																						: t.body,
																				params: a.params
																					? await tl(
																							a.params,
																							null == t ? void 0 : t.params,
																						)
																					: null == t
																						? void 0
																						: t.params,
																				query: a.query
																					? await tl(
																							a.query,
																							null == t ? void 0 : t.query,
																						)
																					: null == t
																						? void 0
																						: t.query,
																			})),
																		{ url: e, options: n }
																	);
																}
															}
															return { url: e, options: t };
														},
													}),
													...((null == r ? void 0 : r.plugins) || []),
												],
											});
										if (null == t ? void 0 : t.catchAllError)
											try {
												return await td(e, n);
											} catch (e) {
												return {
													data: null,
													error: {
														status: 500,
														statusText: "Fetch Error",
														message:
															"Fetch related error. Captured by catchAllError option. See error property for more details.",
														error: e,
													},
												};
											}
										return await td(e, n);
									}),
								{
									$sessionSignal: R,
									session: b,
									broadcastSessionUpdate: A,
								} = ((a = Q(!1)),
								K(
									(i = Q({
										data: null,
										error: null,
										isPending: !0,
										isRefetching: !1,
										refetch: (n = (e) => l(e)),
									})),
									eW,
								),
								(s = (e) => {
									if (r !== e) return;
									const t = i.get();
									(r = void 0),
										(t.isPending || t.isRefetching) &&
											i.set({
												...t,
												isPending: !1,
												isRefetching: !1,
												refetch: n,
											});
								}),
								(l = async (e) => {
									r?.abort();
									const t = new AbortController();
									r = t;
									const a = i.get();
									i.set({
										...a,
										isPending: null === a.data,
										isRefetching: !0,
										error: null,
										refetch: n,
									});
									try {
										var o;
										const r = await T("/get-session", {
											method: "GET",
											query: e?.query,
											signal: t.signal,
										});
										if (t.signal.aborted) return void s(t);
										let { data: a, error: l } = eG(r);
										if (a?.needsRefresh)
											try {
												const e = await T("/get-session", {
													method: "POST",
													signal: t.signal,
												});
												if (t.signal.aborted) return void s(t);
												({ data: a, error: l } = eG(e));
											} catch {
												if (t.signal.aborted) return void s(t);
											}
										if (l) {
											const e = i.get(),
												t = l?.status === 401;
											i.set({
												data: t ? null : e.data,
												error: l,
												isPending: !1,
												isRefetching: !1,
												refetch: n,
											});
											return;
										}
										const u =
												(o = a) && (null !== o.session || null !== o.user)
													? o
													: null,
											d = i.get(),
											c =
												null != d.data && null != u && q(d.data, u)
													? d.data
													: u;
										i.set({
											data: c,
											error: null,
											isPending: !1,
											isRefetching: !1,
											refetch: n,
										});
									} catch (r) {
										if (t.signal.aborted) return void s(t);
										const e = i.get();
										i.set({
											data: e.data,
											error: r,
											isPending: !1,
											isRefetching: !1,
											refetch: n,
										});
									}
								}),
								(u = () => {}),
								G(i, () => {
									let t;
									t = setTimeout(() => {
										l();
									}, 0);
									const n = (function (e) {
										const {
												fetchSession: t,
												shouldPollSession: r = () => !0,
												sessionSignal: a,
												options: n = {},
											} = e,
											o = n.sessionOptions?.refetchInterval ?? 0,
											i = n.sessionOptions?.refetchOnWindowFocus ?? !0,
											s = n.sessionOptions?.refetchWhenOffline ?? !1,
											l = { isInitialized: !1, lastSessionRequest: 0 },
											u = (e) => {
												if (s || ez().isOnline) {
													if (e?.event === "storage") return void t();
													if (e?.event === "poll") {
														(l.lastSessionRequest = ej()), t();
														return;
													}
													if (e?.event === "visibilitychange") {
														if (ej() - l.lastSessionRequest < 5) return;
														(l.lastSessionRequest = ej()), t();
														return;
													}
													t();
												}
											};
										return {
											init: () => {
												l.isInitialized ||
													((l.isInitialized = !0),
													o &&
														o > 0 &&
														(l.pollInterval = setInterval(() => {
															r() && u({ event: "poll" });
														}, 1e3 * o)),
													(l.unsubscribeBroadcast = eY().subscribe(() => {
														u({ event: "storage" });
													})),
													i &&
														(l.unsubscribeFocus = eH().subscribe(() => {
															u({ event: "visibilitychange" });
														})),
													(l.unsubscribeOnline = ez().subscribe((e) => {
														e && u({ event: "visibilitychange" });
													})),
													(l.unsubscribeSignal = a.listen(() => {
														t();
													})),
													(l.cleanupBroadcastSetup = eY().setup()),
													(l.cleanupFocusSetup = eH().setup()),
													(l.cleanupOnlineSetup = ez().setup()));
											},
											cleanup: () => {
												l.isInitialized &&
													(l.pollInterval &&
														(clearInterval(l.pollInterval),
														(l.pollInterval = void 0)),
													l.unsubscribeBroadcast &&
														(l.unsubscribeBroadcast(),
														(l.unsubscribeBroadcast = void 0)),
													l.unsubscribeFocus &&
														(l.unsubscribeFocus(),
														(l.unsubscribeFocus = void 0)),
													l.unsubscribeOnline &&
														(l.unsubscribeOnline(),
														(l.unsubscribeOnline = void 0)),
													l.unsubscribeSignal &&
														(l.unsubscribeSignal(),
														(l.unsubscribeSignal = void 0)),
													l.cleanupBroadcastSetup &&
														(l.cleanupBroadcastSetup(),
														(l.cleanupBroadcastSetup = void 0)),
													l.cleanupFocusSetup &&
														(l.cleanupFocusSetup(),
														(l.cleanupFocusSetup = void 0)),
													l.cleanupOnlineSetup &&
														(l.cleanupOnlineSetup(),
														(l.cleanupOnlineSetup = void 0)),
													(l.isInitialized = !1),
													(l.lastSessionRequest = 0));
											},
											triggerRefetch: u,
											broadcastSessionUpdate: (e) => {
												eY().post({
													event: "session",
													data: { trigger: e },
													clientId: Math.random().toString(36).substring(7),
												});
											},
										};
									})({
										fetchSession: l,
										shouldPollSession: () => null != i.get().data,
										sessionSignal: a,
										options: e,
									});
									return (
										n.init(),
										(u = n.broadcastSessionUpdate),
										() => {
											t && clearTimeout(t);
											const e = r;
											e?.abort(), e && s(e), n.cleanup();
										}
									);
								}),
								{
									session: i,
									$sessionSignal: a,
									broadcastSessionUpdate: (e) => u(e),
								}),
								v = e?.plugins || [],
								y = {},
								I = { $sessionSignal: R, session: b },
								w = {
									"/sign-out": "POST",
									"/revoke-sessions": "POST",
									"/revoke-other-sessions": "POST",
									"/delete-user": "POST",
								},
								N = [
									{
										signal: "$sessionSignal",
										matcher: (e) =>
											"/sign-out" === e ||
											"/update-user" === e ||
											"/update-session" === e ||
											"/sign-up/email" === e ||
											"/sign-in/email" === e ||
											"/delete-user" === e ||
											"/verify-email" === e ||
											"/revoke-sessions" === e ||
											"/revoke-session" === e ||
											"/revoke-other-sessions" === e ||
											"/change-email" === e ||
											"/change-password" === e,
										callback(e) {
											"/sign-out" === e
												? A("signout")
												: ("/update-user" === e || "/update-session" === e) &&
													A("updateUser");
										},
									},
								];
							for (const e of v)
								e.getAtoms && Object.assign(I, e.getAtoms?.(T)),
									e.pathMethods && Object.assign(w, e.pathMethods),
									e.atomListeners && N.push(...e.atomListeners);
							const S = {
								notify: (e) => {
									I[e].set(!I[e].get());
								},
								listen: (e, t) => {
									I[e].subscribe(t);
								},
								atoms: I,
							};
							for (const t of v)
								t.getActions && (y = eX(t.getActions?.(T, S, e) ?? {}, y));
							return {
								get baseURL() {
									return c;
								},
								pluginsActions: y,
								pluginsAtoms: I,
								pluginPathMethods: w,
								atomListeners: N,
								$fetch: T,
								$store: S,
							};
						})(e),
						u = {};
					for (const [e, t] of Object.entries(n))
						u[
							(function (e) {
								return `use${e.charAt(0).toUpperCase() + e.slice(1)}`;
							})(e)
						] = () =>
							(function (e, t = {}) {
								const r = (0, th.useRef)(e.get()),
									{ keys: a, deps: n = [e, a] } = t,
									o = (0, th.useCallback)((t) => {
										const n = (e) => {
											r.current !== e && ((r.current = e), t());
										};
										if ((n(e.value), a?.length)) {
											let t;
											return (
												(t = new Set(a).add(void 0)),
												e.listen((e, r, a) => {
													t.has(a) && n(e, r, a);
												})
											);
										}
										return e.listen(n);
									}, n),
									i = () => r.current;
								return (0, th.useSyncExternalStore)(o, i, i);
							})(t);
					return (
						(t = { ...a, ...u, $fetch: i, $store: s }),
						(function e(a = []) {
							return new Proxy(function () {}, {
								get(r, n) {
									var o;
									if (
										"string" != typeof n ||
										"then" === n ||
										"catch" === n ||
										"finally" === n
									)
										return;
									let i = [...a, n],
										s = t;
									for (const e of i)
										if (s && "object" == typeof s && e in s) s = s[e];
										else {
											s = void 0;
											break;
										}
									return "function" == typeof s
										? s
										: "object" == typeof (o = s) &&
												null !== o &&
												"get" in o &&
												"function" == typeof o.get &&
												"lc" in o &&
												"number" == typeof o.lc
											? s
											: e(i);
								},
								apply: async (e, t, o) => {
									const s = "/" + a.map(tp).join("/"),
										u = o[0] || {},
										d = o[1] || {},
										{ query: c, fetchOptions: f, ...p } = u,
										h = { ...d, ...f },
										E = (function (e, t, r) {
											const a = t[e],
												{ fetchOptions: n, query: o, ...i } = r || {};
											return (
												a ||
												(n?.method
													? n.method
													: i && Object.keys(i).length > 0
														? "POST"
														: "GET")
											);
										})(s, r, u);
									return await i(s, {
										...h,
										body: "GET" === E ? void 0 : { ...p, ...(h?.body || {}) },
										query: c || h?.query,
										method: E,
										async onSuccess(e) {
											if ((await h?.onSuccess?.(e), !l || h.disableSignal))
												return;
											const t = l.filter((e) => e.matcher(s));
											if (!t.length) return;
											const r = new Set();
											for (const e of t) {
												const t = n[e.signal];
												if (!t) return;
												if (r.has(e.signal)) continue;
												r.add(e.signal);
												const a = t.get();
												setTimeout(() => {
													t.set(!a);
												}, 10),
													e.callback?.(s);
											}
										},
									});
								},
							});
						})()
					);
				},
			],
			67726,
		);
	},
	76706,
	(e) => {
		"use strict";
		var t = e.i(8343),
			r = e.i(13218),
			a = e.i(83235),
			n = e.i(73405),
			o = e.i(1556),
			i = e.i(94554),
			s = e.i(64176),
			l = e.i(82493),
			u = e.i(22302),
			d = e.i(86712),
			c = e.i(2831),
			f = e.i(92164),
			p = e.i(65382),
			h = e.i(84773),
			E = e.i(67726),
			m = e.i(61645);
		const g = (0, E.createAuthClient)({
			baseURL:
				t.default.env.NEXT_PUBLIC_CINAAUTH_API_URL ||
				"https://auth.cinagroup.com",
			plugins: [
				(0, a.dashClient)(),
				(0, f.organizationClient)(),
				(0, p.twoFactorClient)({
					onTwoFactorRedirect() {
						window.location.href = "/two-factor";
					},
				}),
				(0, o.passkeyClient)(),
				(0, s.adminClient)(),
				(0, c.multiSessionClient)(),
				(0, n.oauthProviderClient)(),
				(0, i.stripeClient)({ subscription: !0 }),
				(0, l.customSessionClient)(),
				(0, u.deviceAuthorizationClient)(),
				(0, d.lastLoginMethodClient)(),
				(0, h.emailOTPClient)(),
				(0, r.electronProxyClient)({
					protocol: { scheme: "com.cinaauth.demo" },
				}),
			],
			fetchOptions: {
				onError(e) {
					429 === e.error.status &&
						m.toast.error("Too many requests. Please try again later.");
				},
			},
		});
		e.s(["authClient", 0, g]);
	},
]);
