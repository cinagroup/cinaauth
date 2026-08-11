import { parseDeliveryConfigurationActivateInput } from "@cinaauth/auth-web-contract";
import type { NextRequest } from "next/server";
import { mutateConfiguration } from "@/lib/configuration-control";

export const POST = (request: NextRequest) =>
	mutateConfiguration(
		request,
		"delivery",
		"activate",
		"integration.delivery.manage",
		parseDeliveryConfigurationActivateInput,
	);
