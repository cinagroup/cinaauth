import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { organizationKeys } from "./keys";

export interface OrganizationLeaveParams {
	organizationId: string;
}

export async function leaveOrganization(params: OrganizationLeaveParams) {
	const { data, error } = await authClient.organization.leave({
		organizationId: params.organizationId,
	});
	if (error) throw new Error(error.message);

	return data;
}

export const useOrganizationLeaveMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: leaveOrganization,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: organizationKeys.all(),
			});
			toast.success("You left the organization");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to leave the organization");
		},
	});
};
