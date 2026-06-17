import { NextResponse } from "next/server";

export async function GET() {
	const baseURL = process.env.CINAAUTH_URL || "https://auth.cinagroup.com";
	return NextResponse.json({
		issuer: baseURL,
		authorization_endpoint: `${baseURL}/api/auth/oauth/authorize`,
		token_endpoint: `${baseURL}/api/auth/oauth/token`,
		userinfo_endpoint: `${baseURL}/api/auth/oauth/userinfo`,
		jwks_uri: `${baseURL}/api/auth/jwks`,
	});
}
