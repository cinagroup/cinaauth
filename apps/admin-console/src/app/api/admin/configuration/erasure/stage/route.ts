import { parseErasureConfigurationStageInput } from "@cinaauth/auth-web-contract";
import type { NextRequest } from "next/server";
import { mutateConfiguration } from "@/lib/configuration-control";

export const POST = (request: NextRequest) =>
	mutateConfiguration(
		request,
		"erasure",
		"stage",
		"privacy.erasure.manage",
		parseErasureConfigurationStageInput,
	);
