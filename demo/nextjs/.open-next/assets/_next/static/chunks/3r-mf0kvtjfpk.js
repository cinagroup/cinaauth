(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
	"object" == typeof document ? document.currentScript : void 0,
	38699,
	(e) => {
		"use strict";
		var s = e.i(620),
			r = e.i(13732);
		const a = ({ className: e, ...a }) =>
			(0, s.jsx)("div", {
				className: (0, r.cn)(
					"rounded-xl border bg-card text-card-foreground shadow",
					e,
				),
				...a,
			});
		a.displayName = "Card";
		const t = ({ className: e, ...a }) =>
			(0, s.jsx)("div", {
				className: (0, r.cn)("flex flex-col space-y-1.5 p-6", e),
				...a,
			});
		t.displayName = "CardHeader";
		const i = ({ className: e, ...a }) =>
			(0, s.jsx)("h3", {
				className: (0, r.cn)("font-semibold leading-none tracking-tight", e),
				...a,
			});
		i.displayName = "CardTitle";
		const d = ({ className: e, ...a }) =>
			(0, s.jsx)("p", {
				className: (0, r.cn)("text-sm text-muted-foreground", e),
				...a,
			});
		d.displayName = "CardDescription";
		const o = ({ className: e, ...a }) =>
			(0, s.jsx)("div", { className: (0, r.cn)("p-6 pt-0", e), ...a });
		o.displayName = "CardContent";
		const n = ({ className: e, ...a }) =>
			(0, s.jsx)("div", {
				className: (0, r.cn)("flex items-center p-6 pt-0", e),
				...a,
			});
		(n.displayName = "CardFooter"),
			e.s([
				"Card",
				0,
				a,
				"CardContent",
				0,
				o,
				"CardDescription",
				0,
				d,
				"CardFooter",
				0,
				n,
				"CardHeader",
				0,
				t,
				"CardTitle",
				0,
				i,
			]);
	},
	98747,
	(e) => {
		"use strict";
		var s = e.i(620),
			r = e.i(92479),
			a = e.i(95353),
			t = r.forwardRef((e, r) =>
				(0, s.jsx)(a.Primitive.label, {
					...e,
					ref: r,
					onMouseDown: (s) => {
						s.target.closest("button, input, select, textarea") ||
							(e.onMouseDown?.(s),
							!s.defaultPrevented && s.detail > 1 && s.preventDefault());
					},
				}),
			);
		t.displayName = "Label";
		var i = e.i(13732);
		e.s(
			[
				"Label",
				0,
				function ({ className: e, ...r }) {
					return (0, s.jsx)(t, {
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
		var s = e.i(620),
			r = e.i(13732);
		e.s([
			"Input",
			0,
			function ({ className: e, type: a, ...t }) {
				return (0, s.jsx)("input", {
					type: a,
					"data-slot": "input",
					className: (0, r.cn)(
						"border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
						"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
						"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
						e,
					),
					...t,
				});
			},
		]);
	},
	77833,
	(e) => {
		"use strict";
		var s = e.i(620),
			r = e.i(54762);
		const a = (0, r.default)("eye", [
				[
					"path",
					{
						d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
						key: "1nclc0",
					},
				],
				["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }],
			]),
			t = (0, r.default)("eye-off", [
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
			d = e.i(92192),
			o = e.i(38901),
			n = e.i(13732);
		const l = ({ ref: e, className: r, ...l }) => {
			const [c, p] = i.useState(!1),
				u = "" === l.value || void 0 === l.value || l.disabled;
			return (0, s.jsxs)("div", {
				className: "relative",
				children: [
					(0, s.jsx)(o.Input, {
						...l,
						type: c ? "text" : "password",
						name: "password_fake",
						className: (0, n.cn)("hide-password-toggle pr-10", r),
						ref: e,
					}),
					(0, s.jsxs)(d.Button, {
						type: "button",
						variant: "ghost",
						size: "sm",
						className:
							"absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent",
						onClick: () => p((e) => !e),
						disabled: u,
						children: [
							c && !u
								? (0, s.jsx)(a, { className: "h-4 w-4", "aria-hidden": "true" })
								: (0, s.jsx)(t, {
										className: "h-4 w-4",
										"aria-hidden": "true",
									}),
							(0, s.jsx)("span", {
								className: "sr-only",
								children: c ? "Hide password" : "Show password",
							}),
						],
					}),
					(0, s.jsx)("style", {
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
		(l.displayName = "PasswordInput"), e.s(["PasswordInput", 0, l], 77833);
	},
	37115,
	(e) => {
		"use strict";
		var s = e.i(620),
			r = e.i(37146),
			a = e.i(4664),
			t = e.i(72811),
			i = e.i(92479),
			d = e.i(56395),
			o = e.i(16003),
			n = e.i(57321),
			l = e.i(92192),
			c = e.i(30905),
			p = e.i(77833),
			u = e.i(30208);
		const m = n
			.object({
				password: n.string().min(8, "Password must be at least 8 characters."),
				confirmPassword: n.string().min(1, "Please confirm your password."),
			})
			.refine((e) => e.password === e.confirmPassword, {
				message: "Passwords do not match.",
				path: ["confirmPassword"],
			});
		function x({ token: e, onSuccess: r }) {
			const [n, w] = (0, i.useTransition)(),
				f = (0, d.useForm)({
					resolver: (0, a.zodResolver)(m),
					defaultValues: { password: "", confirmPassword: "" },
				});
			return (0, s.jsxs)("form", {
				onSubmit: f.handleSubmit((s) => {
					w(async () => {
						const a = await u.authClient.resetPassword({
							newPassword: s.password,
							token: e,
						});
						a.error
							? o.toast.error(a.error.message)
							: (o.toast.success("Password reset successfully"), r?.());
					});
				}),
				className: "grid gap-4",
				children: [
					(0, s.jsxs)(c.FieldGroup, {
						children: [
							(0, s.jsx)(d.Controller, {
								name: "password",
								control: f.control,
								render: ({ field: e, fieldState: r }) =>
									(0, s.jsxs)(c.Field, {
										"data-invalid": r.invalid,
										children: [
											(0, s.jsx)(c.FieldLabel, {
												htmlFor: "reset-password",
												children: "New password",
											}),
											(0, s.jsx)(p.PasswordInput, {
												...e,
												id: "reset-password",
												placeholder: "Enter new password",
												"aria-invalid": r.invalid,
												autoComplete: "new-password",
											}),
											r.invalid &&
												(0, s.jsx)(c.FieldError, { errors: [r.error] }),
										],
									}),
							}),
							(0, s.jsx)(d.Controller, {
								name: "confirmPassword",
								control: f.control,
								render: ({ field: e, fieldState: r }) =>
									(0, s.jsxs)(c.Field, {
										"data-invalid": r.invalid,
										children: [
											(0, s.jsx)(c.FieldLabel, {
												htmlFor: "reset-confirm-password",
												children: "Confirm password",
											}),
											(0, s.jsx)(p.PasswordInput, {
												...e,
												id: "reset-confirm-password",
												placeholder: "Confirm new password",
												"aria-invalid": r.invalid,
												autoComplete: "new-password",
											}),
											r.invalid &&
												(0, s.jsx)(c.FieldError, { errors: [r.error] }),
										],
									}),
							}),
						],
					}),
					(0, s.jsx)(l.Button, {
						type: "submit",
						className: "w-full",
						disabled: n,
						children: n
							? (0, s.jsx)(t.Loader2, { size: 16, className: "animate-spin" })
							: "Reset password",
					}),
				],
			});
		}
		var w = e.i(38699);
		e.s(
			[
				"default",
				0,
				function () {
					const e = (0, r.useRouter)(),
						a = (0, r.useSearchParams)().get("token") ?? "";
					return (0, s.jsx)("div", {
						className:
							"flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]",
						children: (0, s.jsxs)(w.Card, {
							className: "w-[350px]",
							children: [
								(0, s.jsxs)(w.CardHeader, {
									children: [
										(0, s.jsx)(w.CardTitle, { children: "Reset password" }),
										(0, s.jsx)(w.CardDescription, {
											children:
												"Enter new password and confirm it to reset your password",
										}),
									],
								}),
								(0, s.jsx)(w.CardContent, {
									children: (0, s.jsx)(x, {
										token: a,
										onSuccess: () => e.push("/sign-in"),
									}),
								}),
							],
						}),
					});
				},
			],
			37115,
		);
	},
]);
