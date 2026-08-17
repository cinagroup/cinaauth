"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { TwoFactorTotpForm } from "@/components/forms/two-factor-totp-form";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	buildTwoFactorAuthPath,
	getTwoFactorSuccessPath,
} from "@/lib/two-factor-navigation";

function TotpVerificationContent() {
	const params = useSearchParams();
	const successPath = getTwoFactorSuccessPath(params);

	return (
		<main className="flex min-h-[calc(100vh-10rem)] items-center justify-center px-4">
			<Card className="w-full max-w-[350px]">
				<CardHeader>
					<CardTitle>TOTP Verification</CardTitle>
					<CardDescription>
						Enter your 6-digit TOTP code to authenticate
					</CardDescription>
				</CardHeader>
				<CardContent>
					<TwoFactorTotpForm
						onSuccess={() => {
							if (successPath) window.location.href = successPath;
						}}
					/>
				</CardContent>
				<CardFooter className="flex-wrap gap-2 text-sm text-muted-foreground">
					<Button asChild variant="link" size="sm">
						<Link href={buildTwoFactorAuthPath("/two-factor/backup", params)}>
							Use a backup code
						</Link>
					</Button>
				</CardFooter>
			</Card>
		</main>
	);
}

export default function Page() {
	return (
		<Suspense
			fallback={
				<main className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
					<p className="text-sm text-muted-foreground" role="status">
						Loading two-factor verification…
					</p>
				</main>
			}
		>
			<TotpVerificationContent />
		</Suspense>
	);
}
