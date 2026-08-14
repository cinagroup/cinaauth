"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
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
import { LastUsedIndicator } from "../last-used-indicator";

const signInSchema = z.object({
	email: z.email("Please enter a valid email address."),
	password: z.string().min(1, "Password is required."),
	rememberMe: z.boolean(),
});

type SignInFormValues = z.infer<typeof signInSchema>;

interface SignInFormProps {
	onSuccess?: () => void;
	callbackURL?: string;
	showPasswordToggle?: boolean;
	params?: URLSearchParams;
}

export function SignInForm({
	onSuccess,
	callbackURL = "/dashboard",
	showPasswordToggle = false,
	params,
}: SignInFormProps) {
	const [loading, startTransition] = useTransition();
	const [isMounted, setIsMounted] = useState(false);
	const captcha = useTurnstileChallenge();

	useEffect(() => {
		setIsMounted(true);
	}, []);

	const form = useForm<SignInFormValues>({
		resolver: zodResolver(signInSchema),
		defaultValues: {
			email: "",
			password: "",
			rememberMe: false,
		},
	});

	const onSubmit = (data: SignInFormValues) => {
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
						query: params ? Object.fromEntries(params.entries()) : undefined,
						onSuccess(context) {
							completeLocalSignInSuccess(context.data, {
								notifySuccess: () => toast.success("Successfully signed in"),
								onSuccess,
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
	};

	return (
		<form
			onSubmit={form.handleSubmit(onSubmit)}
			className="flex flex-col gap-4"
		>
			<FieldGroup className="gap-4">
				<Controller
					name="email"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="sign-in-email">Email</FieldLabel>
							<Input
								{...field}
								id="sign-in-email"
								type="email"
								placeholder="Enter your email"
								aria-invalid={fieldState.invalid}
								autoComplete="email"
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
							<div className="flex items-center">
								<FieldLabel htmlFor="sign-in-password">Password</FieldLabel>
								<Link
									href="/forgot-password"
									className="ml-auto inline-block text-xs text-body underline-offset-4 transition-colors hover:text-ink hover:underline"
								>
									Forgot password?
								</Link>
							</div>
							{showPasswordToggle ? (
								<PasswordInput
									{...field}
									id="sign-in-password"
									placeholder="Enter your password"
									aria-invalid={fieldState.invalid}
									autoComplete="current-password"
									size="lg"
								/>
							) : (
								<Input
									{...field}
									id="sign-in-password"
									type="password"
									placeholder="Enter your password"
									aria-invalid={fieldState.invalid}
									autoComplete="current-password"
									size="lg"
								/>
							)}
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
								id="sign-in-remember"
								checked={field.value}
								onCheckedChange={field.onChange}
							/>
							<FieldLabel htmlFor="sign-in-remember" className="font-normal">
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
				className="relative mt-2 w-full"
				disabled={loading || !captcha.canSubmit}
			>
				{loading ? <Loader2 size={16} className="animate-spin" /> : "Sign in"}
				{isMounted && authClient.isLastUsedLoginMethod("email") && (
					<LastUsedIndicator />
				)}
			</Button>
		</form>
	);
}
