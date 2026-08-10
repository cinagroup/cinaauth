import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { organizationKeys } from "./keys";

export interface MemberRoleUpdateParams {
	memberId: string;
	role: string | string[];
}

export async function updateMemberRole(params: MemberRoleUpdateParams) {
	const { data, error } = await authClient.organization.updateMemberRole({
		memberId: params.memberId,
		role: params.role,
	});
	if (error) throw new Error(error.message);

	return data;
}

export const useMemberRoleUpdateMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateMemberRole,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: organizationKeys.detail(),
			});
			toast.success("Member role updated successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update the member role");
		},
	});
};
