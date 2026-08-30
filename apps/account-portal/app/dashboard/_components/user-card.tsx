"use client";

import {
	Code2,
	Edit,
	FileLock2,
	Fingerprint,
	Loader2,
	LogOut,
	Plus,
	QrCode,
	ShieldCheck,
	ShieldOff,
	StopCircle,
	Trash,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useDashboardI18n } from "@/components/dashboard/use-dashboard-i18n";
import { EmailVerificationOtpForm } from "@/components/forms/email-verification-otp-form";
import { TwoFactorDisableForm } from "@/components/forms/two-factor-disable-form";
import { TwoFactorEnableForm } from "@/components/forms/two-factor-enable-form";
import { TwoFactorQrForm } from "@/components/forms/two-factor-qr-form";
import { UpdateUserForm } from "@/components/forms/update-user-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useSessionQuery } from "@/data/user/session-query";
import { useSignOutMutation } from "@/data/user/sign-out-mutation";
import type { Session } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";
import { deleteAccountPasskey } from "@/lib/client-api";

const UserCard = ({
	session: initialSession,
	requiresPasswordForTwoFactor,
}: {
	session: Session | null;
	requiresPasswordForTwoFactor: boolean;
}) => {
	const router = useRouter();
	const signOutMutation = useSignOutMutation();
	const { data } = useSessionQuery();
	const session = data || initialSession;
	const [twoFactorDialog, setTwoFactorDialog] = useState<boolean>(false);
	const [backupCodesPending, setBackupCodesPending] = useState(false);
	const [isSignOut, setIsSignOut] = useState<boolean>(false);
	const { messages } = useDashboardI18n();

	return (
		<Card>
			<CardHeader>
				<CardTitle>{messages.user}</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-8 grid-cols-1">
				<div className="flex flex-col gap-2">
					<div className="flex items-start justify-between">
						<div className="flex items-center gap-4">
							<Avatar className="hidden h-9 w-9 sm:flex ">
								<AvatarImage
									src={session?.user.image || undefined}
									alt={messages.avatar}
									className="object-cover"
								/>
								<AvatarFallback>{session?.user.name.charAt(0)}</AvatarFallback>
							</Avatar>
							<div className="grid">
								<div className="flex items-center gap-1">
									<p className="text-sm font-medium leading-none">
										{session?.user.name}
									</p>
								</div>
								<p className="text-sm">{session?.user.email}</p>
							</div>
						</div>
						<EditUserDialog />
					</div>
				</div>{" "}
				{session?.user.emailVerified ? null : (
					<EmailVerificationOtpForm email={session?.user.email ?? ""} />
				)}
				<div className="border-y py-4 flex items-center flex-wrap justify-between gap-2">
					<div className="flex flex-col gap-2">
						<p className="text-sm">{messages.passkeys}</p>
						<div className="flex gap-2 flex-wrap">
							<AddPasskey />
							<ListPasskeys />
						</div>
					</div>
					<div className="flex flex-col gap-2">
						<p className="text-sm">{messages.twoFactor}</p>
						<div className="flex gap-2">
							{!!session?.user.twoFactorEnabled && (
								<Dialog>
									<DialogTrigger asChild>
										<Button variant="outline" className="gap-2">
											<QrCode size={16} />
											<span className="md:text-sm text-xs">{messages.scanQrCode}</span>
										</Button>
									</DialogTrigger>
									<DialogContent className="sm:max-w-[425px] w-11/12">
										<DialogHeader>
											<DialogTitle>{messages.scanQrCode}</DialogTitle>
											<DialogDescription>
												{messages.scanQrDescription}
											</DialogDescription>
										</DialogHeader>
										<TwoFactorQrForm
											requiresPassword={requiresPasswordForTwoFactor}
										/>
									</DialogContent>
								</Dialog>
							)}
							<Dialog
								open={twoFactorDialog}
								onOpenChange={(open) => {
									if (!open && backupCodesPending) return;
									setTwoFactorDialog(open);
								}}
							>
								<DialogTrigger asChild>
									<Button
										variant={
											session?.user.twoFactorEnabled ? "destructive" : "outline"
										}
										className="gap-2"
									>
										{session?.user.twoFactorEnabled ? (
											<ShieldOff size={16} />
										) : (
											<ShieldCheck size={16} />
										)}
										<span className="md:text-sm text-xs">
											{session?.user.twoFactorEnabled
												? messages.disableTwoFactor
												: messages.enableTwoFactor}
										</span>
									</Button>
								</DialogTrigger>
								<DialogContent
									className="sm:max-w-[425px] w-11/12"
									showCloseButton={!backupCodesPending}
									onEscapeKeyDown={(event) => {
										if (backupCodesPending) event.preventDefault();
									}}
									onPointerDownOutside={(event) => {
										if (backupCodesPending) event.preventDefault();
									}}
								>
									<DialogHeader>
										<DialogTitle>
											{session?.user.twoFactorEnabled
												? messages.disableTwoFactor
												: messages.enableTwoFactor}
										</DialogTitle>
										<DialogDescription>
											{requiresPasswordForTwoFactor
												? messages.legacyCredentialConfirmation
												: messages.passwordlessConfirmation}
										</DialogDescription>
									</DialogHeader>
									{session?.user.twoFactorEnabled ? (
										<TwoFactorDisableForm
											requiresPassword={requiresPasswordForTwoFactor}
											onSuccess={() => setTwoFactorDialog(false)}
										/>
									) : (
										<TwoFactorEnableForm
											requiresPassword={requiresPasswordForTwoFactor}
											onSuccess={() => setTwoFactorDialog(false)}
											onBackupCodesPendingChange={setBackupCodesPending}
										/>
									)}
								</DialogContent>
							</Dialog>
						</div>
					</div>
				</div>
			</CardContent>
			<CardFooter className="gap-2 justify-between items-center flex-wrap">
				<div className="flex flex-wrap gap-2">
					<Button asChild className="gap-2 z-10" variant="default" size="sm">
						<Link href="/dashboard/security">
							<ShieldCheck size={16} />
							{messages.securityTitle}
						</Link>
					</Button>
					<Button asChild className="gap-2 z-10" variant="outline" size="sm">
						<Link href="/dashboard/privacy">
							<FileLock2 size={16} />
							{messages.privacyTitle}
						</Link>
					</Button>
					<Button asChild className="gap-2 z-10" variant="outline" size="sm">
						<Link href="/dashboard/developer">
							<Code2 size={16} />
							{messages.developerTitle}
						</Link>
					</Button>
				</div>
				{session?.session.impersonatedBy ? (
					<Button
						className="gap-2 z-10"
						variant="secondary"
						onClick={async () => {
							setIsSignOut(true);
							await authClient.admin.stopImpersonating();
							setIsSignOut(false);
							toast.info(messages.impersonationStopped);
							router.push("/admin");
						}}
						disabled={isSignOut}
					>
						<span className="text-sm">
							{isSignOut ? (
								<Loader2 size={15} className="animate-spin" />
							) : (
								<div className="flex items-center gap-2">
									<StopCircle size={16} color="red" />
									{messages.stopImpersonation}
								</div>
							)}
						</span>
					</Button>
				) : (
					<Button
						className="gap-2 z-10"
						variant="outline"
						onClick={() => {
							signOutMutation.mutate(undefined, {
								onSuccess: () => {
									router.push("/");
								},
							});
						}}
						disabled={signOutMutation.isPending}
					>
						<span className="text-sm">
							{signOutMutation.isPending ? (
								<Loader2 size={15} className="animate-spin" />
							) : (
								<div className="flex items-center gap-2">
									<LogOut size={16} />
									{messages.signOut}
								</div>
							)}
						</span>
					</Button>
				)}
			</CardFooter>
		</Card>
	);
};
export default UserCard;

function EditUserDialog() {
	const { messages } = useDashboardI18n();
	const { data } = useSessionQuery();
	const [open, setOpen] = useState<boolean>(false);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" className="gap-2" variant="default">
					<Edit size={13} />
					{messages.editUser}
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px] w-11/12">
				<DialogHeader>
					<DialogTitle>{messages.editUser}</DialogTitle>
					<DialogDescription>{messages.editUserDescription}</DialogDescription>
				</DialogHeader>
				<UpdateUserForm
					currentName={data?.user.name}
					onSuccess={() => setOpen(false)}
				/>
			</DialogContent>
		</Dialog>
	);
}

function AddPasskey() {
	const { messages } = useDashboardI18n();
	const [isOpen, setIsOpen] = useState(false);
	const [passkeyName, setPasskeyName] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleAddPasskey = async () => {
		if (!passkeyName) {
			toast.error(messages.passkeyNameRequired);
			return;
		}
		setIsLoading(true);
		const res = await authClient.passkey.addPasskey({
			name: passkeyName,
		});
		if (res?.error) {
			toast.error(res?.error.message);
		} else {
			setIsOpen(false);
			toast.success(messages.passkeyAdded);
		}
		setIsLoading(false);
	};
	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" className="gap-2 text-xs md:text-sm">
					<Plus size={15} />
					{messages.addNewPasskey}
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px] w-11/12">
				<DialogHeader>
					<DialogTitle>{messages.addNewPasskey}</DialogTitle>
					<DialogDescription>
						{messages.addPasskeyDescription}
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-2">
					<Label htmlFor="passkey-name">{messages.passkeyName}</Label>
					<Input
						id="passkey-name"
						value={passkeyName}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							setPasskeyName(e.target.value)
						}
					/>
				</div>
				<DialogFooter>
					<Button
						disabled={isLoading}
						type="submit"
						onClick={handleAddPasskey}
						className="w-full"
					>
						{isLoading ? (
							<Loader2 size={15} className="animate-spin" />
						) : (
							<>
								<Fingerprint className="mr-2 h-4 w-4" />
								{messages.createPasskey}
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function ListPasskeys() {
	const { messages } = useDashboardI18n();
	const { data } = authClient.useListPasskeys();
	const [isOpen, setIsOpen] = useState(false);
	const [passkeyName, setPasskeyName] = useState("");

	const handleAddPasskey = async () => {
		if (!passkeyName) {
			toast.error(messages.passkeyNameRequired);
			return;
		}
		setIsLoading(true);
		const res = await authClient.passkey.addPasskey({
			name: passkeyName,
		});
		setIsLoading(false);
		if (res?.error) {
			toast.error(res?.error.message);
		} else {
			toast.success(messages.passkeyAdded);
		}
	};
	const [isLoading, setIsLoading] = useState(false);
	const [isDeletePasskey, setIsDeletePasskey] = useState<boolean>(false);
	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" className="text-xs md:text-sm">
					<Fingerprint className="mr-2 h-4 w-4" />
					<span>{messages.passkeys} {data?.length ? `[${data?.length}]` : ""}</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px] w-11/12">
				<DialogHeader>
					<DialogTitle>{messages.passkeys}</DialogTitle>
					<DialogDescription>{messages.passkeyList}</DialogDescription>
				</DialogHeader>
				{data?.length ? (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{messages.name}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.map((passkey) => (
								<TableRow
									key={passkey.id}
									className="flex  justify-between items-center"
								>
									<TableCell>{passkey.name || messages.myPasskey}</TableCell>
									<TableCell className="text-right">
										<button
											onClick={async () => {
												setIsDeletePasskey(true);
												try {
													await deleteAccountPasskey(authClient, passkey.id);
											toast.success(messages.passkeyDeleted);
												} catch (error) {
													toast.error(
														error instanceof Error
															? error.message
													: messages.passkeyDeleteFailed,
													);
												} finally {
													setIsDeletePasskey(false);
												}
											}}
										>
											{isDeletePasskey ? (
												<Loader2 size={15} className="animate-spin" />
											) : (
												<Trash
													size={15}
													className="cursor-pointer text-error"
												/>
											)}
										</button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				) : (
					<p className="text-sm text-muted-foreground">{messages.noPasskeys}</p>
				)}
				{!data?.length && (
					<div className="flex flex-col gap-2">
						<div className="flex flex-col gap-2">
							<Label htmlFor="passkey-name" className="text-sm">
								{messages.newPasskey}
							</Label>
							<Input
								id="passkey-name"
								value={passkeyName}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
									setPasskeyName(e.target.value)
								}
								placeholder={messages.myPasskey}
							/>
						</div>
						<Button type="submit" onClick={handleAddPasskey} className="w-full">
							{isLoading ? (
								<Loader2 size={15} className="animate-spin" />
							) : (
								<>
									<Fingerprint className="mr-2 h-4 w-4" />
									{messages.createPasskey}
								</>
							)}
						</Button>
					</div>
				)}
				<DialogFooter>
					<Button onClick={() => setIsOpen(false)}>{messages.close}</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
