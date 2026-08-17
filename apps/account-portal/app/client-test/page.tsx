"use client";

import { Loader2 } from "lucide-react";
import { EmailOtpForm } from "@/components/forms/email-otp-form";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useSessionQuery } from "@/data/user/session-query";
import { useSignOutMutation } from "@/data/user/sign-out-mutation";

export default function Page() {
	const { data: session, isPending, error } = useSessionQuery();
	const signOutMutation = useSignOutMutation();

	return (
		<div className="py-16 md:py-24 px-4 md:px-6 space-y-8">
			{/* Spec: display-md (24/600/-0.96px), sentence-case + period. */}
			<h1 className="text-[24px] font-semibold leading-[32px] tracking-[-0.96px] text-ink text-center">
				Client authentication test.
			</h1>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
				{/* Login Form */}
				<Card>
					<CardHeader>
						<CardTitle>Sign in</CardTitle>
						<CardDescription>
							Use the one-time code sent to your email address.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<EmailOtpForm
							onSuccess={() => {
								window.location.href = "/client-test";
							}}
						/>
					</CardContent>
				</Card>

				{/* Session Display */}
				<Card>
					<CardHeader>
						<CardTitle>Session Information</CardTitle>
						<CardDescription>
							{isPending
								? "Loading session..."
								: session
									? "You are currently logged in"
									: "You are not logged in"}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{isPending ? (
							<div className="flex justify-center py-4">
								<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
							</div>
						) : error ? (
							<div className="p-4 bg-destructive/10 text-destructive rounded-md">
								Error: {error.message}
							</div>
						) : session ? (
							<div className="space-y-4">
								<div className="flex items-center gap-4">
									{session.user.image ? (
										<img
											src={session.user.image}
											alt="Profile"
											className="h-12 w-12 rounded-full object-cover"
										/>
									) : (
										<div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
											<span className="text-lg font-medium">
												{session.user.name?.charAt(0) ||
													session.user.email?.charAt(0)}
											</span>
										</div>
									)}
									<div>
										<p className="font-medium">{session.user.name}</p>
										<p className="text-sm text-muted-foreground">
											{session.user.email}
										</p>
									</div>
								</div>

								<div className="rounded-md bg-muted p-4">
									<p className="text-sm font-medium mb-2">Session Details:</p>
									<pre className="text-xs overflow-auto max-h-40">
										{JSON.stringify(session, null, 2)}
									</pre>
								</div>
							</div>
						) : (
							<div className="py-8 text-center text-muted-foreground">
								<p>Sign in to view your session information</p>
							</div>
						)}
					</CardContent>
					{session && (
						<CardFooter>
							<Button
								variant="outline"
								className="w-full"
								onClick={() => signOutMutation.mutate()}
								disabled={signOutMutation.isPending}
							>
								{signOutMutation.isPending ? (
									<Loader2 className="animate-spin" size={16} />
								) : (
									"Sign Out"
								)}
							</Button>
						</CardFooter>
					)}
				</Card>
			</div>
		</div>
	);
}
