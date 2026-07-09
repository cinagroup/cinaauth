/**
 * Local stub for @cinaauth/infra (replaces @cinaauth/infra)
 * Provides compatible dash(), sentinel(), and sendEmail() functions
 * without the internal @cinaauth/core dependency.
 */

export function dash() {
	return {
		id: "dash",
		$InferServerPlugin: {} as any,
		hooks: {},
	};
}

export function sentinel() {
	return {
		id: "sentinel",
		$InferServerPlugin: {} as any,
		hooks: {},
	};
}

export async function sendEmail(_data: {
	to: string;
	subject: string;
	template?: string;
	variables?: Record<string, string>;
}) {
	// Stub implementation - logs email sending
	console.log(`[CinaAuth] Email to ${_data.to}: ${_data.subject}`);
	// In production, use Resend or your preferred email service:
	// const res = await fetch('https://api.resend.com/emails', {
	//   method: 'POST',
	//   headers: {
	//     'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
	//     'Content-Type': 'application/json',
	//   },
	//   body: JSON.stringify({
	//     from: 'CinaAuth <onboarding@resend.dev>',
	//     to: [_data.to],
	//     subject: _data.subject,
	//     html: `<p>Template: ${_data.template}</p><p>Variables: ${JSON.stringify(_data.variables)}</p>`,
	//   }),
	// });
}

/**
 * Client-side stub for the dashboard plugin.
 */
export function dashClient() {
	return {
		id: "dash-client",
		$InferClientPlugin: {} as any,
	};
}
