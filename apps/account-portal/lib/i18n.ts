export const SUPPORTED_LOCALES = ["zh-CN", "en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

const DEFAULT_LOCALE: Locale = "zh-CN";
export const LOCALE_COOKIE_NAME = "cinaseek-accounts-locale";
export const LOCALE_STORAGE_KEY = "cinaseek.accounts.locale.v1";

const englishMessages = {
	metadataDescription:
		"Secure access to your CinaSeek account, privacy, security, and connected applications.",
	skipToContent: "Skip to content",
	accountTagline: "Identity self-service",
	languageControl: "Language",
	switchToChinese: "切换到中文",
	switchToEnglish: "Switch to English",
	themeToggle: "Toggle color theme",
	navPricing: "Pricing",
	navDocs: "Docs",
	navBlog: "Blog",
	logIn: "Log in",
	getStarted: "Get started",
	footerProduct: "Product",
	footerFeatures: "Features",
	footerDocumentation: "Documentation",
	footerChangelog: "Changelog",
	footerCompany: "Company",
	footerAbout: "About",
	footerCareers: "Careers",
	footerContact: "Contact",
	footerResources: "Resources",
	footerCommunity: "Community",
	footerSupport: "Support",
	footerStatus: "Status",
	footerSecurity: "Security",
	footerLegal: "Legal",
	footerTerms: "Terms of Service",
	footerPrivacy: "Privacy Policy",
	footerCookies: "Cookie Policy",
	footerService: "A Cina Group service.",
	homeEyebrow: "CinaSeek Identity",
	heroTitle: "One account. Every CinaSeek service.",
	heroDescription:
		"Your secure CinaSeek Identity account center for sign-in, security, privacy, and connected applications.",
	signIn: "Sign in",
	dashboard: "Open dashboard",
	directSignIn: "New here? Signing in creates your account automatically.",
	accountPreview: "Account overview",
	accountProtected: "Account protected",
	signInMethodsTitle: "Sign-in methods",
	signInMethodsDescription: "Email code · Google · GitHub · Wallet",
	securityCenterTitle: "Security center",
	securityCenterDescription: "Passkeys, multi-factor auth, and active sessions",
	privacyAppsTitle: "Privacy & applications",
	privacyAppsDescription: "Control personal data and connected access",
	previewNote: "Manage everything from one private account dashboard.",
	benefitAccessTitle: "Simple access",
	benefitAccessDescription:
		"Email code sign-in and trusted social or wallet providers—no separate registration form.",
	benefitSecurityTitle: "Security in one place",
	benefitSecurityDescription:
		"Review passkeys, two-factor protection, devices, and sessions whenever you need.",
	benefitControlTitle: "You stay in control",
	benefitControlDescription:
		"See connected applications and manage privacy choices from your account.",
	signInPageTitle: "Sign in or create your account",
	signInPageDescription:
		"Use your email or a trusted provider. If this is your first time, we'll create your account after verification.",
	loadingSignIn: "Loading secure sign-in options…",
	continueAgreement: "By continuing, you agree to our",
	termsOfService: "Terms of Service",
	and: "and",
	privacyPolicy: "Privacy Policy",
	protectedBy: "Protected by CinaSeek authentication",
	emailLabel: "Email",
	emailDescription: "We will send a single-use six-digit code to this address.",
	sendSignInCode: "Send sign-in code",
	sendSignUpCode: "Send verification code",
	verifyAndSignIn: "Verify and sign in",
	verifyAndContinue: "Verify and continue",
	signInCodeSentTo: "We sent a 6-digit sign-in code to",
	signUpCodeSentTo: "We sent a 6-digit verification code to",
	signedInSuccessfully: "Successfully signed in",
	emailVerifiedSuccessfully: "Email verified successfully",
	verificationCodeSent: "Verification code sent",
	verificationCodeResent: "Verification code resent",
	unableToSendCode: "Unable to send the verification code.",
	invalidCode: "The verification code is invalid or expired.",
	verificationCode: "Verification code",
	resendCode: "Resend code",
	resendIn: "Resend in",
	changeEmail: "Change email",
	emailCodeUnavailable:
		"Email code delivery is temporarily unavailable. Use another configured authentication method.",
	emailVerifiedContinue:
		"Your email is verified. Continue to finish authorizing the application.",
	continueToApplication: "Continue to application",
	authorizationContinueError:
		"Your email was verified, but authorization could not continue. Try again.",
	identityCheckRequired: "Identity check required",
	identityCheckDescription:
		"Confirm your identity to continue this sensitive security change.",
	additionalSignInMethods: "Additional direct sign-in methods",
	continueEmailPassword: "Continue with email and password",
	continuePasskey: "Continue with passkey",
	passkeyFailed: "Passkey sign-in failed",
	otherSignInMethods: "Other sign-in methods",
	continueWallet: "Continue with wallet",
	newWalletAccount:
		"New wallet? We'll create your account after you verify the signature.",
	checkingSignInMethods: "Checking additional sign-in methods…",
	signInConfigErrorTitle: "Secure sign-in configuration could not be loaded",
	signInConfigErrorDescription:
		"Email code sign-in stays unavailable until the security configuration can be verified.",
	tryAgain: "Try again",
	identityMethodsUnavailable:
		"Automatic and social sign-in are unavailable for this identity check.",
	requestEmailCode: "Request an email code to continue.",
	noEligibleMethod: "No eligible sign-in method is currently available.",
	or: "Or",
	continueWith: "Continue with",
	googleAuthFailed: "Google authentication failed",
	signInFailedTitle: "Sign-in wasn’t completed",
	signInFailedDescription: "Try again or choose another secure sign-in method.",
	waitingForWallet: "Waiting for wallet…",
	walletAuthenticationFailed: "Unable to complete wallet authentication",
	copyToClipboard: "Copy to clipboard",
	copied: "Copied!",
	humanVerificationFailed:
		"Human verification could not load. Refresh the page and try again.",
	completeHumanVerification:
		"Complete the human verification before continuing.",
} as const;

const chineseMessages = {
	metadataDescription:
		"安全访问您的 CinaSeek 账户，并统一管理隐私、安全设置和已连接应用。",
	skipToContent: "跳到主要内容",
	accountTagline: "账户与身份管理",
	languageControl: "语言",
	switchToChinese: "切换到中文",
	switchToEnglish: "Switch to English",
	themeToggle: "切换颜色主题",
	navPricing: "价格",
	navDocs: "文档",
	navBlog: "博客",
	logIn: "登录",
	getStarted: "开始使用",
	footerProduct: "产品",
	footerFeatures: "功能",
	footerDocumentation: "开发文档",
	footerChangelog: "更新日志",
	footerCompany: "公司",
	footerAbout: "关于我们",
	footerCareers: "加入我们",
	footerContact: "联系我们",
	footerResources: "资源",
	footerCommunity: "社区",
	footerSupport: "支持",
	footerStatus: "服务状态",
	footerSecurity: "安全",
	footerLegal: "法律",
	footerTerms: "服务条款",
	footerPrivacy: "隐私政策",
	footerCookies: "Cookie 政策",
	footerService: "Cina Group 旗下服务。",
	homeEyebrow: "CinaSeek 统一身份",
	heroTitle: "一个账户，连接所有 CinaSeek 服务。",
	heroDescription:
		"安全登录 CinaSeek 账户，在一个账户中心管理安全设置、隐私偏好和已连接应用。",
	signIn: "登录账户",
	dashboard: "进入账户中心",
	directSignIn: "首次使用无需单独注册，完成登录即可自动创建账户。",
	accountPreview: "账户概览",
	accountProtected: "账户已受保护",
	signInMethodsTitle: "登录方式",
	signInMethodsDescription: "邮箱验证码 · Google · GitHub · 钱包",
	securityCenterTitle: "安全中心",
	securityCenterDescription: "通行密钥、多因素认证和活动会话",
	privacyAppsTitle: "隐私与应用",
	privacyAppsDescription: "管理个人数据和已连接应用的访问权限",
	previewNote: "所有账户设置都集中在私密的账户中心内。",
	benefitAccessTitle: "登录更简单",
	benefitAccessDescription:
		"支持邮箱验证码、可信社交账号和钱包登录，无需填写独立注册表单。",
	benefitSecurityTitle: "安全集中管理",
	benefitSecurityDescription:
		"随时查看通行密钥、两步验证、登录设备与活动会话。",
	benefitControlTitle: "始终由您掌控",
	benefitControlDescription: "清晰查看已连接应用，并在账户中心管理隐私选择。",
	signInPageTitle: "登录或创建账户",
	signInPageDescription:
		"使用邮箱或可信登录方式。首次使用时，我们会在验证完成后自动创建账户。",
	loadingSignIn: "正在加载安全登录方式…",
	continueAgreement: "继续即表示您同意我们的",
	termsOfService: "服务条款",
	and: "和",
	privacyPolicy: "隐私政策",
	protectedBy: "由 CinaSeek 身份认证保护",
	emailLabel: "邮箱",
	emailDescription: "我们会向此邮箱发送一次性六位验证码。",
	sendSignInCode: "发送登录验证码",
	sendSignUpCode: "发送验证码",
	verifyAndSignIn: "验证并登录",
	verifyAndContinue: "验证并继续",
	signInCodeSentTo: "六位登录验证码已发送至",
	signUpCodeSentTo: "六位验证码已发送至",
	signedInSuccessfully: "登录成功",
	emailVerifiedSuccessfully: "邮箱验证成功",
	verificationCodeSent: "验证码已发送",
	verificationCodeResent: "验证码已重新发送",
	unableToSendCode: "无法发送验证码，请稍后重试。",
	invalidCode: "验证码无效或已过期。",
	verificationCode: "验证码",
	resendCode: "重新发送验证码",
	resendIn: "可重新发送还需",
	changeEmail: "更换邮箱",
	emailCodeUnavailable: "邮箱验证码暂时不可用，请选择其他已配置的登录方式。",
	emailVerifiedContinue: "邮箱已验证，请继续完成应用授权。",
	continueToApplication: "继续前往应用",
	authorizationContinueError: "邮箱已验证，但授权未能继续，请重试。",
	identityCheckRequired: "需要验证身份",
	identityCheckDescription: "请确认身份后继续此项敏感安全操作。",
	additionalSignInMethods: "其他直接登录方式",
	continueEmailPassword: "使用邮箱和密码继续",
	continuePasskey: "使用通行密钥继续",
	passkeyFailed: "通行密钥登录失败",
	otherSignInMethods: "其他登录方式",
	continueWallet: "使用钱包继续",
	newWalletAccount: "新钱包用户验证签名后将自动创建账户。",
	checkingSignInMethods: "正在检查其他登录方式…",
	signInConfigErrorTitle: "无法加载安全登录配置",
	signInConfigErrorDescription: "验证安全配置前，邮箱验证码登录将暂不可用。",
	tryAgain: "重试",
	identityMethodsUnavailable: "此次身份验证不支持自动登录和社交登录。",
	requestEmailCode: "请获取邮箱验证码以继续。",
	noEligibleMethod: "当前没有可用的登录方式。",
	or: "或",
	continueWith: "使用以下方式继续：",
	googleAuthFailed: "Google 登录失败",
	signInFailedTitle: "登录未完成",
	signInFailedDescription: "请重试或选择其他安全登录方式。",
	waitingForWallet: "正在等待钱包…",
	walletAuthenticationFailed: "无法完成钱包身份验证",
	copyToClipboard: "复制到剪贴板",
	copied: "已复制！",
	humanVerificationFailed: "无法加载人机验证，请刷新页面后重试。",
	completeHumanVerification: "继续前请完成人机验证。",
} as const satisfies Record<keyof typeof englishMessages, string>;

export const homeMessages = {
	"zh-CN": chineseMessages,
	en: englishMessages,
} as const;

export type Messages = (typeof homeMessages)[Locale];

function isLocale(value: string | null | undefined): value is Locale {
	return SUPPORTED_LOCALES.includes(value as Locale);
}

export function resolveLocale({
	cookieLocale,
	acceptLanguage,
}: {
	cookieLocale?: string | null;
	acceptLanguage?: string | null;
}): Locale {
	if (isLocale(cookieLocale)) return cookieLocale;

	const languageRanges = (acceptLanguage?.split(",") ?? [])
		.map((range, index) => {
			const [language = "", ...parameters] = range.trim().split(";");
			const qualityParameter = parameters.find((parameter) =>
				parameter.trim().startsWith("q="),
			);
			const parsedQuality = qualityParameter
				? Number.parseFloat(qualityParameter.trim().slice(2))
				: 1;
			return {
				language: language.toLowerCase(),
				quality: Number.isFinite(parsedQuality) ? parsedQuality : 0,
				index,
			};
		})
		.filter(({ quality }) => quality > 0)
		.sort(
			(left, right) => right.quality - left.quality || left.index - right.index,
		);

	for (const { language } of languageRanges) {
		if (language === "en" || language?.startsWith("en-")) return "en";
		if (language === "zh" || language?.startsWith("zh-")) return "zh-CN";
	}

	return DEFAULT_LOCALE;
}
