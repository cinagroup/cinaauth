"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";
import { useDashboardI18n } from "@/components/dashboard/use-dashboard-i18n";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useOrganizationCreateMutation } from "@/data/organization/organization-create-mutation";
import { useImagePreview } from "@/hooks/use-image-preview";
import { convertImageToBase64 } from "@/lib/utils";

const createOrganizationSchema = (copy: {
	nameTooShort: string;
	nameTooLong: string;
	slugTooShort: string;
	slugTooLong: string;
	slugInvalid: string;
}) =>
	z.object({
		name: z.string().min(2, copy.nameTooShort).max(50, copy.nameTooLong),
		slug: z
			.string()
			.min(2, copy.slugTooShort)
			.max(50, copy.slugTooLong)
			.regex(/^[a-z0-9-]+$/, copy.slugInvalid),
	});

type CreateOrganizationFormValues = z.infer<
	ReturnType<typeof createOrganizationSchema>
>;

interface CreateOrganizationFormProps {
	onSuccess?: () => void;
	onError?: (error: string) => void;
}

export function CreateOrganizationForm({
	onSuccess,
	onError,
}: CreateOrganizationFormProps) {
	const { messages } = useDashboardI18n();
	const organizationSchema = createOrganizationSchema(messages);
	const createMutation = useOrganizationCreateMutation();
	const { image, imagePreview, handleImageChange, clearImage } =
		useImagePreview();

	const {
		control,
		handleSubmit,
		watch,
		setValue,
		formState: { errors, dirtyFields },
	} = useForm<CreateOrganizationFormValues>({
		resolver: zodResolver(organizationSchema),
		defaultValues: {
			name: "",
			slug: "",
		},
	});

	const nameValue = watch("name");

	// Auto-generate slug from name if slug hasn't been manually edited
	useEffect(() => {
		if (!dirtyFields.slug) {
			const generatedSlug = nameValue
				.trim()
				.toLowerCase()
				.replace(/\s+/g, "-")
				.replace(/[^a-z0-9-]/g, "");
			setValue("slug", generatedSlug);
		}
	}, [nameValue, dirtyFields.slug, setValue]);

	const onSubmit = async (values: CreateOrganizationFormValues) => {
		try {
			const logoBase64 = image ? await convertImageToBase64(image) : undefined;

			createMutation.mutate(
				{
					name: values.name,
					slug: values.slug,
					logo: logoBase64,
				},
				{
					onSuccess: () => {
						onSuccess?.();
					},
					onError: (error) => {
						onError?.(error.message);
					},
				},
			);
		} catch (error) {
			onError?.(
				error instanceof Error ? error.message : messages.imageProcessingFailed,
			);
		}
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<FieldGroup>
				<Controller
					name="name"
					control={control}
					render={({ field }) => (
						<Field>
							<FieldLabel htmlFor="org-name">
								{messages.organizationName}
							</FieldLabel>
							<Input
								id="org-name"
								placeholder={messages.organizationNamePlaceholder}
								disabled={createMutation.isPending}
								{...field}
							/>
							<FieldError>{errors.name?.message}</FieldError>
						</Field>
					)}
				/>

				<Controller
					name="slug"
					control={control}
					render={({ field }) => (
						<Field>
							<FieldLabel htmlFor="org-slug">
								{messages.organizationSlug}
							</FieldLabel>
							<Input
								id="org-slug"
								placeholder={messages.organizationSlugPlaceholder}
								disabled={createMutation.isPending}
								{...field}
							/>
							<FieldError>{errors.slug?.message}</FieldError>
						</Field>
					)}
				/>

				<Field>
					<FieldLabel htmlFor="org-logo">{messages.logo}</FieldLabel>
					<div className="flex items-end gap-4">
						{imagePreview && (
							<div className="relative w-16 h-16 rounded-sm overflow-hidden">
								<Image
									src={imagePreview}
									alt={messages.logoPreview}
									fill
									className="object-cover"
								/>
							</div>
						)}
						<div className="flex items-center gap-2 w-full">
							<Input
								id="org-logo"
								type="file"
								accept="image/*"
								onChange={handleImageChange}
								disabled={createMutation.isPending}
								className="w-full text-muted-foreground"
							/>
							{imagePreview && (
								<X
									className="cursor-pointer"
									onClick={clearImage}
									aria-label={messages.clearLogo}
								/>
							)}
						</div>
					</div>
				</Field>

				<Button type="submit" disabled={createMutation.isPending}>
					{createMutation.isPending ? (
						<Loader2 size={15} className="animate-spin" />
					) : (
						messages.create
					)}
				</Button>
			</FieldGroup>
		</form>
	);
}
