import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Privacy Erasure | CinaSeek Admin",
	description: "Manage CinaSeek Identity privacy erasure delivery targets",
};

export default function PrivacyErasureSettingsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
