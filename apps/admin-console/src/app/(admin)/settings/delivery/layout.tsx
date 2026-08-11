import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Delivery Providers | CinaSeek Admin",
	description: "Manage CinaSeek Identity email and SMS delivery providers",
};

export default function DeliverySettingsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
