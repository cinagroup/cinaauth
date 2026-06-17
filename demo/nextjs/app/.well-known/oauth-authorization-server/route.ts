import { NextResponse } from "next/server";

export async function GET() {
	return NextResponse.json({
		issuer: process.env.CINAAUTH_URL || "https://auth.cinagroup.com",
	});
}
