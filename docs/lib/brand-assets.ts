export const brandAssetPaths = {
	assetsZip: "/branding/cinaauth-brand-assets.zip",
	mark: {
		light: {
			svg: "/branding/svg/cinaauth-mark-light.svg",
			png: "/branding/png/cinaauth-mark-light.png",
		},
		dark: {
			svg: "/branding/svg/cinaauth-mark-dark.svg",
			png: "/branding/png/cinaauth-mark-dark.png",
		},
	},
	wordmark: {
		light: {
			svg: "/branding/svg/cinaauth-wordmark-light.svg",
			png: "/branding/png/cinaauth-wordmark-light.png",
		},
		dark: {
			svg: "/branding/svg/cinaauth-wordmark-dark.svg",
			png: "/branding/png/cinaauth-wordmark-dark.png",
		},
	},
} as const;

export const brandLogoPreviews = [
	{
		label: "Mark · Light",
		src: brandAssetPaths.mark.light.svg,
		bg: "bg-black",
	},
	{
		label: "Mark · Dark",
		src: brandAssetPaths.mark.dark.svg,
		bg: "bg-white",
	},
	{
		label: "Wordmark · Light",
		src: brandAssetPaths.wordmark.light.svg,
		bg: "bg-black",
	},
	{
		label: "Wordmark · Dark",
		src: brandAssetPaths.wordmark.dark.svg,
		bg: "bg-white",
	},
] as const;
