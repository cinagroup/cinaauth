import { Pricing } from "@/components/pricing";

const demoPlans = [
	{
		name: "Hobby",
		price: "0",
		yearlyPrice: "0",
		period: "per month",
		features: [
			"Up to 3 projects",
			"Community support",
			"Basic analytics",
			"Limited API access",
		],
		description: "Perfect for learning and small personal projects.",
		buttonText: "Start for free",
		href: "/sign-up",
		isPopular: false,
	},
	{
		name: "Pro",
		price: "20",
		yearlyPrice: "16",
		period: "per month",
		features: [
			"Unlimited projects",
			"Advanced analytics",
			"24-hour support response time",
			"Full API access",
			"Priority support",
			"Custom domains",
		],
		description: "Ideal for growing teams and businesses.",
		buttonText: "Get started",
		href: "/sign-up",
		isPopular: true,
	},
	{
		name: "Enterprise",
		price: "50",
		yearlyPrice: "40",
		period: "per month",
		features: [
			"Everything in Pro",
			"SSO / SAML",
			"Custom SLAs",
			"Dedicated support",
			"Audit logging",
			"Unlimited seats",
		],
		description: "For organizations with advanced security and compliance needs.",
		buttonText: "Contact sales",
		href: "/sign-up",
		isPopular: false,
	},
];

export default function Page() {
	return <Pricing plans={demoPlans} />;
}
