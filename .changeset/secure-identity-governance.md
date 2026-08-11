---
"cinaauth": patch
"@cinaauth/oauth-provider": patch
"@cinaauth/passkey": patch
"@cinaauth/scim": patch
"@cinaauth/sso": patch
---

Add first-class administrator passkey management, stronger audit and OpenAPI
metadata, and fail-closed user deletion governance.

Require fresh sessions for passkey deletion, correct OAuth Basic client
authentication and SSO certificate validation, and prevent SCIM provider
ownership or namespace collisions.
