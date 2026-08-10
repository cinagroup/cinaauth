import type { ImgHTMLAttributes } from "react";

export const Logo = ({
	alt = "CinaSeek",
	...props
}: ImgHTMLAttributes<HTMLImageElement>) => {
	return <img {...props} src="/logo.png" alt={alt} />;
};
