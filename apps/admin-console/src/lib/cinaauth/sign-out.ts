/** Sign out through the same-origin proxy before returning to the login page. */
export async function signOutAndRedirect(): Promise<void> {
	try {
		await fetch("/api/auth/sign-out", {
			method: "POST",
			cache: "no-store",
		});
	} finally {
		window.location.assign("/login");
	}
}
