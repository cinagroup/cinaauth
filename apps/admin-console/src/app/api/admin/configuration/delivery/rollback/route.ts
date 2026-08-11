import { parseDeliveryConfigurationRollbackInput } from "@cinaauth/auth-web-contract";
import type { NextRequest } from "next/server";
import { mutateConfiguration } from "@/lib/configuration-control";

export const POST = (request: NextRequest) =>
	mutateConfiguration(
		request,
		"delivery",
		"rollback",
		"integration.delivery.manage",
		parseDeliveryConfigurationRollbackInput,
	);
