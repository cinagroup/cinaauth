import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	transpilePackages: ["cinaauth", "@cinaauth/core"],
};

export default nextConfig;
