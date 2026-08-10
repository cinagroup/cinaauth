#!/usr/bin/env bash

set -euo pipefail

require_env() {
	if [[ -z "${!1:-}" ]]; then
		echo "Missing required environment variable: $1" >&2
		exit 1
	fi
}

require_env CLOUDFLARE_API_TOKEN
require_env CLOUDFLARE_ACCOUNT_ID
require_env CINAAUTH_HYPERDRIVE_ID

pnpm install --frozen-lockfile

pnpm --dir workers/delivery run check
pnpm --dir workers/delivery run deploy

pnpm --dir workers/auth-api run configure:hyperdrive
pnpm --dir workers/auth-api run check
pnpm --dir workers/auth-api run deploy

pnpm --dir apps/account-portal run typecheck
pnpm --dir apps/account-portal run build:cf
pnpm --dir apps/account-portal run deploy:cf

pnpm --dir apps/admin-console run typecheck
pnpm --dir apps/admin-console run test
pnpm --dir apps/admin-console run build:cf
pnpm --dir apps/admin-console run deploy

echo "Auth API:       https://auth.cinaseek.ai"
echo "Account portal: https://accounts.cinaseek.ai"
echo "Admin console:  https://admin.cinaseek.ai"
