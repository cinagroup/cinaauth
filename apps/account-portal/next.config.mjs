import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set both turbopack.root and outputFileTracingRoot to monorepo root
// This allows Turbopack to compile files outside the project directory
const monorepoRoot = path.resolve(__dirname, '..', '..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: [
    '@cinaauth/auth-proxy',
    '@cinaauth/auth-web-contract',
    '@cinaauth/design-tokens',
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;
