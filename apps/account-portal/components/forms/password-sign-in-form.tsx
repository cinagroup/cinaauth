"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import {
	TurnstileChallenge,
	useTurnstileChallenge,
} from "@/components/turnstile-challenge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";
import { completeLocalSignInSuccess } from "@/lib/auth-form-response";

const signInSchema = z.object({
	email: z.email("Please enter a valid email address."),
	password: z.string().min(1, "Password is required."),
	rememberMe: z.boolean(),
});

type SignInFormValues = z.infer<typeof signInSchema>;

export function PasswordSignInForm({
	callbackURL,
	params,
}: {
	callbackURL: string;
	params: URLSearchParams;
}) {
	const [loading, startTransition] = useTransition();
	const captcha = useTurnstileChallenge("/sign-in/email");
	const form = useForm<SignInFormValues>({
		resolver: zodResolver(signInSchema),
		defaultValues: { email: "", password: "", rememberMe: false },
	});

	return (
		<form
			className="flex flex-col gap-4"
			onSubmit={form.handleSubmit((data) => {
				startTransition(async () => {
					try {
						await authClient.signIn.email(
							{
								email: data.email,
								password: data.password,
								rememberMe: data.rememberMe,
								callbackURL,
							},
							{
								headers: captcha.headers,
								query: Object.fromEntries(params.entries()),
								onSuccess(context) {
									completeLocalSignInSuccess(context.data, {
										notifySuccess: () =>
											toast.success("Successfully signed in"),
										onSuccess: () => {
											window.location.href = callbackURL;
										},
									});
								},
								onError(context) {
									toast.error(context.error.message);
								},
							},
						);
					} finally {
						captcha.reset();
					}
				});
			})}
		>
			<FieldGroup className="gap-4">
				<Controller
					name="email"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="password-sign-in-email">Email</FieldLabel>
							<Input
								{...field}
								id="password-sign-in-email"
								type="email"
								autoComplete="email"
								placeholder="Enter your email"
								aria-invalid={fieldState.invalid}
								size="lg"
							/>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>
				<Controller
					name="password"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="password-sign-in-password">
								Password
							</FieldLabel>
							<PasswordInput
								{...field}
								id="password-sign-in-password"
								autoComplete="current-password"
								placeholder="Enter your password"
								aria-invalid={fieldState.invalid}
								size="lg"
							/>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>
				<Controller
					name="rememberMe"
					control={form.control}
					render={({ field }) => (
						<Field orientation="horizontal">
							<Checkbox
								id="password-sign-in-remember"
								checked={field.value}
								onCheckedChange={field.onChange}
							/>
							<FieldLabel
								htmlFor="password-sign-in-remember"
								className="font-normal"
							>
								Remember me
							</FieldLabel>
						</Field>
					)}
				/>
			</FieldGroup>
			<TurnstileChallenge challenge={captcha} />
			<Button
				type="submit"
				size="lg"
				className="mt-2 w-full"
				disabled={loading || !captcha.canSubmit}
			>
				{loading ? <Loader2 size={16} className="animate-spin" /> : "Sign in"}
			</Button>
		</form>
	);
}
