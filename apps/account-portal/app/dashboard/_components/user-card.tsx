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

	return (
		<Card>
			<CardHeader>
				<CardTitle>User</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-8 grid-cols-1">
				<div className="flex flex-col gap-2">
					<div className="flex items-start justify-between">
						<div className="flex items-center gap-4">
							<Avatar className="hidden h-9 w-9 sm:flex ">
								<AvatarImage
									src={session?.user.image || undefined}
									alt="Avatar"
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
						<p className="text-sm">Passkeys</p>
						<div className="flex gap-2 flex-wrap">
							<AddPasskey />
							<ListPasskeys />
						</div>
					</div>
					<div className="flex flex-col gap-2">
						<p className="text-sm">Two Factor</p>
						<div className="flex gap-2">
							{!!session?.user.twoFactorEnabled && (
								<Dialog>
									<DialogTrigger asChild>
										<Button variant="outline" className="gap-2">
											<QrCode size={16} />
											<span className="md:text-sm text-xs">Scan QR Code</span>
										</Button>
									</DialogTrigger>
									<DialogContent className="sm:max-w-[425px] w-11/12">
										<DialogHeader>
											<DialogTitle>Scan QR Code</DialogTitle>
											<DialogDescription>
												Scan the QR code with your TOTP app
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
												? "Disable 2FA"
												: "Enable 2FA"}
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
												? "Disable 2FA"
												: "Enable 2FA"}
										</DialogTitle>
										<DialogDescription>
											{requiresPasswordForTwoFactor
												? "A retained legacy credential confirms this sensitive change. It cannot be used to sign in."
												: "Your recent passwordless sign-in confirms this sensitive change."}
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
							Security Center
						</Link>
					</Button>
					<Button asChild className="gap-2 z-10" variant="outline" size="sm">
						<Link href="/dashboard/privacy">
							<FileLock2 size={16} />
							Privacy Center
						</Link>
					</Button>
					<Button asChild className="gap-2 z-10" variant="outline" size="sm">
						<Link href="/dashboard/developer">
							<Code2 size={16} />
							Developer Console
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
							toast.info("Impersonation stopped successfully");
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
									Stop Impersonation
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
									Sign Out
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
	const { data } = useSessionQuery();
	const [open, setOpen] = useState<boolean>(false);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" className="gap-2" variant="default">
					<Edit size={13} />
					Edit User
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px] w-11/12">
				<DialogHeader>
					<DialogTitle>Edit User</DialogTitle>
					<DialogDescription>Edit user information</DialogDescription>
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
	const [isOpen, setIsOpen] = useState(false);
	const [passkeyName, setPasskeyName] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleAddPasskey = async () => {
		if (!passkeyName) {
			toast.error("Passkey name is required");
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
			toast.success("Passkey added successfully. You can now use it to login.");
		}
		setIsLoading(false);
	};
	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" className="gap-2 text-xs md:text-sm">
					<Plus size={15} />
					Add New Passkey
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px] w-11/12">
				<DialogHeader>
					<DialogTitle>Add New Passkey</DialogTitle>
					<DialogDescription>
						Create a new passkey to securely access your account without a
						password.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-2">
					<Label htmlFor="passkey-name">Passkey Name</Label>
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
								Create Passkey
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function ListPasskeys() {
	const { data } = authClient.useListPasskeys();
	const [isOpen, setIsOpen] = useState(false);
	const [passkeyName, setPasskeyName] = useState("");

	const handleAddPasskey = async () => {
		if (!passkeyName) {
			toast.error("Passkey name is required");
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
			toast.success("Passkey added successfully. You can now use it to login.");
		}
	};
	const [isLoading, setIsLoading] = useState(false);
	const [isDeletePasskey, setIsDeletePasskey] = useState<boolean>(false);
	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" className="text-xs md:text-sm">
					<Fingerprint className="mr-2 h-4 w-4" />
					<span>Passkeys {data?.length ? `[${data?.length}]` : ""}</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px] w-11/12">
				<DialogHeader>
					<DialogTitle>Passkeys</DialogTitle>
					<DialogDescription>List of passkeys</DialogDescription>
				</DialogHeader>
				{data?.length ? (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.map((passkey) => (
								<TableRow
									key={passkey.id}
									className="flex  justify-between items-center"
								>
									<TableCell>{passkey.name || "My Passkey"}</TableCell>
									<TableCell className="text-right">
										<button
											onClick={async () => {
												setIsDeletePasskey(true);
												try {
													await deleteAccountPasskey(authClient, passkey.id);
													toast.success("Passkey deleted successfully");
												} catch (error) {
													toast.error(
														error instanceof Error
															? error.message
															: "Unable to remove the passkey",
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
					<p className="text-sm text-muted-foreground">No passkeys found</p>
				)}
				{!data?.length && (
					<div className="flex flex-col gap-2">
						<div className="flex flex-col gap-2">
							<Label htmlFor="passkey-name" className="text-sm">
								New Passkey
							</Label>
							<Input
								id="passkey-name"
								value={passkeyName}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
									setPasskeyName(e.target.value)
								}
								placeholder="My Passkey"
							/>
						</div>
						<Button type="submit" onClick={handleAddPasskey} className="w-full">
							{isLoading ? (
								<Loader2 size={15} className="animate-spin" />
							) : (
								<>
									<Fingerprint className="mr-2 h-4 w-4" />
									Create Passkey
								</>
							)}
						</Button>
					</div>
				)}
				<DialogFooter>
					<Button onClick={() => setIsOpen(false)}>Close</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
