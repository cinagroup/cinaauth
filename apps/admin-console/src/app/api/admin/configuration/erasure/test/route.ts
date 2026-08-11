import { parseErasureConfigurationTestInput } from "@cinaauth/auth-web-contract";
import type { NextRequest } from "next/server";
import { mutateConfiguration } from "@/lib/configuration-control";

export const POST = (request: NextRequest) =>
	mutateConfiguration(
		request,
		"erasure",
		"test",
		"privacy.erasure.manage",
		parseErasureConfigurationTestInput,
	);
