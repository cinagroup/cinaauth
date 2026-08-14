import { NextResponse } from "next/server";
import { fetchAuthServiceRequest } from "@/lib/auth";
import {
	createAuthServiceUnavailableResponse,
	resolveAuthRuntimeConfiguration,
} from "@/lib/auth-runtime-config";

const probeAuthService = async (pathname: string) => {
	const response = await fetchAuthServiceRequest(pathname, {
		method: "GET",
		headers: {
			"User-Agent": "CinaSeek-Account-Diagnostic",
			Accept: "application/json",
		},
		cache: "no-store",
	});
	return response.ok;
};

export async function GET() {
	if (!resolveAuthRuntimeConfiguration().baseURL) {
		return createAuthServiceUnavailableResponse();
	}

	try {
		if (!(await probeAuthService("/"))) {
			return createAuthServiceUnavailableResponse();
		}
		if (!(await probeAuthService("/api/auth/get-session"))) {
			return createAuthServiceUnavailableResponse();
		}
	} catch {
		return createAuthServiceUnavailableResponse();
	}

	return NextResponse.json(
		{
			status: "ok",
			tests: {
				authApiRoot: { success: true },
				authApiSession: { success: true },
			},
		},
		{ headers: { "Cache-Control": "no-store" } },
	);
}
