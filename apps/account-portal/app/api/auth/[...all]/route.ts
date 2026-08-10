import { createAuthProxyResponse, forwardAuthRequest } from "@/lib/auth";

const proxyRequest = async (request: Request) => {
	const response = await forwardAuthRequest(request);
	return createAuthProxyResponse(response);
};

export const GET = proxyRequest;
export const HEAD = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const OPTIONS = proxyRequest;
