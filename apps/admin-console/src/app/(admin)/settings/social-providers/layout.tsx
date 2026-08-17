import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Social Sign-In Providers | CinaSeek Admin",
};

export default function SettingsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
