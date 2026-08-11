import type { NextRequest } from "next/server";
import { readConfigurationStatus } from "@/lib/configuration-control";

export const GET = (request: NextRequest) =>
	readConfigurationStatus(request, "delivery", "integration.delivery.read");
