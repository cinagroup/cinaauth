const hasCloudflareBlockingPageMarker = (body) => {
	if (
		typeof body !== "string" ||
		!/(?:<!doctype\s+html|<html\b|<title\b|<body\b)/i.test(body) ||
		!/\bcloudflare\b/i.test(body)
	) {
		return false;
	}

	return /attention required|sorry,?\s+you have been blocked/i.test(body);
};

const normalizeRayId = (value) => {
	const match = value?.trim().match(/^([a-f0-9]{12,32})(?:-[a-z0-9]+)?$/i);
	return match?.[1]?.toLowerCase();
};

const extractBlockingPageRayId = (body) => {
	if (typeof body !== "string") return undefined;
	const visibleText = body.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ");
	const match = visibleText.match(
		/cloudflare\s+ray\s+id\s*:\s*([a-f0-9]{12,32})\b/i,
	);
	return match?.[1]?.toLowerCase();
};

/**
 * Classify a public response as an identifiable Cloudflare edge mitigation.
 *
 * Ordinary application-level 403 responses must remain failures. Only the
 * explicit Cloudflare challenge header, or a Ray-correlated branded blocking
 * HTML response, is accepted as mitigation evidence.
 */
export const classifyCloudflareEdgeMitigation = ({ status, headers, body }) => {
	if (status !== 403 || !(headers instanceof Headers)) return undefined;
	const contentType = headers
		.get("content-type")
		?.split(";", 1)[0]
		?.trim()
		.toLowerCase();
	if (contentType !== "text/html") return undefined;

	if (headers.get("cf-mitigated")?.trim().toLowerCase() === "challenge") {
		return {
			kind: "edge-mitigated",
			evidence: "cf-mitigated-challenge",
		};
	}

	const headerRayId = normalizeRayId(headers.get("cf-ray"));
	const bodyRayId = extractBlockingPageRayId(body);
	if (
		headerRayId &&
		bodyRayId === headerRayId &&
		hasCloudflareBlockingPageMarker(body)
	) {
		return {
			kind: "edge-mitigated",
			evidence: "cf-ray-block-page",
		};
	}

	return undefined;
};
