import { permanentRedirect } from "next/navigation";

export default function LegacyAdminPage() {
	permanentRedirect("https://admin.cinaseek.ai");
}
