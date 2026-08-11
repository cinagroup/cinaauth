import { parseDeliveryConfigurationStageInput } from "@cinaauth/auth-web-contract";
import type { NextRequest } from "next/server";
import { mutateConfiguration } from "@/lib/configuration-control";

export const POST = (request: NextRequest) =>
	mutateConfiguration(
		request,
		"delivery",
		"stage",
		"integration.delivery.manage",
		parseDeliveryConfigurationStageInput,
	);
