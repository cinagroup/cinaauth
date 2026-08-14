---
"@cinaauth/core": patch
"cinaauth": patch
---

Allow access-token verification and MCP resource handlers to load JWKS through
a caller-owned private transport with a stable cache key instead of requiring a
public JWKS URL.
