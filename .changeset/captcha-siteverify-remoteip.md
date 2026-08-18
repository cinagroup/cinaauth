---
"cinaauth": patch
---

The captcha middleware no longer forwards a visitor IP to provider siteverify.
The previously forwarded IP was IPv6 subnet-normalized by default, which
rejected every legitimate token for IPv6 visitors (and for browsers that solve
the challenge over a different address family than the API request). The
optional remoteip parameter is now omitted so the secret, hostname, and expiry
checks carry the verification.
