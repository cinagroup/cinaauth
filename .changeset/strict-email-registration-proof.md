---
"cinaauth": patch
"@cinaauth/oauth-provider": patch
---

Add a registration-only Email OTP mode and require an exact, single-use,
session-bound creation proof before `prompt=create` OAuth authorization can
continue. Carry signed registration intent across Magic Link send and verify
requests with a database-backed, single-use bridge, and fail closed before
sending when Magic Link verification is configured for secondary storage only.
Make device authorization approval and denial conditional on the same pending
request and user, preventing concurrent state changes from overwriting a
completed device authorization decision.
