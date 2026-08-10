import {
	ArrowLeftRight,
	ArrowUpRight,
	Building,
	Mail,
	User,
} from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { ConsentBtns } from "./consent-buttons";

export const metadata: Metadata = {
	title: "Authorize Application",
	description: "Grant access to your account",
};

interface AuthorizePageProps {
	searchParams: Promise<{
		redirect_uri: string;
		scope: string;
		cancel_uri: string;
		client_id: string;
	}>;
}

export default async function AuthorizePage({
	searchParams,
}: AuthorizePageProps) {
	const { scope, client_id } = await searchParams;
	const _headers = await headers();
	const [session, clientDetails] = await Promise.all([
		auth.api.getSession({
			headers: _headers,
		}),
		auth.api.getOAuthClientPublic({
			query: {
				client_id,
			},
			headers: _headers,
		}),
	]).catch((e) => {
		throw redirect("/sign-in");
	});

	const organization = session?.session?.activeOrganizationId
		? await auth.api.getFullOrganization({
				headers: _headers,
			})
		: undefined;

	return (
		<div className="py-16 md:py-24 px-4 md:px-6">
			{/* Spec: display-md (24/600/-0.96px), sentence-case + period. */}
			<h1 className="text-[24px] font-semibold leading-[32px] tracking-[-0.96px] text-ink mb-6 text-center">
				Authorize application.
			</h1>
			{/* Spec: showcase-band-dark — polarity-flipped (ink bg, on-primary text). */}
			<div className="min-h-screen bg-ink text-on-primary flex flex-col">
				<div className="flex flex-col items-center justify-center max-w-2xl mx-auto px-4">
					<div className="flex items-center gap-8 mb-8">
						<div className="w-16 h-16 border border-on-primary/20 rounded-full flex items-center justify-center">
							{clientDetails.logo_uri ? (
								<Image
									src={clientDetails.logo_uri}
									alt="App Logo"
									className="object-cover"
									width={64}
									height={64}
								/>
							) : (
								<Logo />
							)}
						</div>
						<ArrowLeftRight className="h-6 w-6" />
						<div className="w-16 h-16 rounded-full overflow-hidden">
							<Avatar className="hidden h-16 w-16 sm:flex ">
								<AvatarImage
									src={session?.user.image || "#"}
									alt="Avatar"
									className="object-cover"
								/>
								<AvatarFallback>{session?.user.name.charAt(0)}</AvatarFallback>
							</Avatar>
						</div>
					</div>

					{/* Spec: display-lg (32/600/-1.28px), sentence-case + period. */}
					<h1 className="text-[32px] font-semibold leading-[40px] tracking-[-1.28px] text-on-primary text-center mb-8">
						{clientDetails.client_name} is requesting access to your CinaAuth
						account.
					</h1>

					{/* Spec: canvas-soft-2 surface inside polarity-flipped band. */}
					<Card className="w-full bg-canvas-soft-2 text-ink rounded-md shadow-l4">
						<CardContent className="p-6">
							<div className="flex items-center justify-between p-4 bg-canvas-soft rounded-md mb-6">
								<div>
									<div className="font-medium text-ink">{session?.user.name}</div>
									<div className="text-body">{session?.user.email}</div>
								</div>
								<ArrowUpRight className="h-5 w-5 text-mute" />
							</div>
							<div className="flex flex-col gap-1">
								<div className="text-lg mb-4 text-ink">
									Continuing will allow Sign in with {clientDetails.client_name}{" "}
									to:
								</div>
								{scope.includes("profile") && (
									<div className="flex items-center gap-3 text-body">
										<User className="h-5 w-5" />
										<span>Read your CinaAuth user data.</span>
									</div>
								)}

								{scope.includes("email") && (
									<div className="flex items-center gap-3 text-body">
										<Mail className="h-5 w-5" />
										<span>Read your email address.</span>
									</div>
								)}

								{scope.includes("read:organization") && (
									<div className="flex items-center gap-3 text-body">
										<Building className="h-5 w-5" />
										<span>
											Read your organization {organization?.name ?? ""}.
										</span>
									</div>
								)}
							</div>
						</CardContent>
						<ConsentBtns />
					</Card>
				</div>
			</div>
		</div>
	);
}
