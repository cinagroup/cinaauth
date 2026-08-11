# CinaSeek Admin authenticated E2E checks

These legacy Playwright scripts exercise authenticated CinaSeek Admin pages and
same-origin Admin APIs. They no longer perform password login or call the
removed password sign-in proxy. Authentication must come from a short-lived
Playwright `storageState` file captured after completing the normal CinaSeek
Accounts OIDC flow.

## Capture a short-lived state safely

Use a temporary file outside the repository. In PowerShell:

```powershell
$statePath = Join-Path ([System.IO.Path]::GetTempPath()) "cinaseek-admin-$([guid]::NewGuid()).json"
pnpm --filter @cinaauth/admin-console exec playwright open --save-storage="$statePath" https://admin.cinaseek.ai/api/auth/oidc/login
```

Complete the interactive OIDC login in the opened browser and close that
browser only after CinaSeek Admin has loaded. Do not enter a password in the
terminal or place credentials in a script.

The state file contains live session material. Never commit, upload, share, or
print it. Keep it only for the shortest test window and use a dedicated test
administrator where possible.

## Run a check

Point the required environment variable at the temporary file, then run one
script from `apps/admin-console`:

```powershell
$env:CINASEEK_ADMIN_E2E_STORAGE_STATE = $statePath
node e2e/test.cjs
node e2e/test-full.cjs
node e2e/test-features.cjs
```

The scripts load the state directly into a new browser context and fail closed
when the file is missing or the session redirects back to OIDC/login. They do
not print the state path, cookies, tokens, or credentials.

`test-full.cjs` and `test-features.cjs` include Admin mutation checks. Run them
only against an explicitly approved test tenant and test data. The checked-in
PNG files are historical visual evidence and are intentionally preserved.

## Remove the state

Delete the temporary file immediately after the run and clear the variable:

```powershell
Remove-Item -LiteralPath $statePath
Remove-Item Env:CINASEEK_ADMIN_E2E_STORAGE_STATE
```
