---
"cinaauth": patch
---

Add purpose- and session-bound SIWE v2 challenges with canonical server-generated EIP-4361 messages, strict RP, chain, version, and time validation, atomic replay protection, SIWE kill switches, and a CAIP-10 identity helper. Existing legacy nonce and automatic wallet-signup behavior remains enabled by default for compatibility and can now be explicitly disabled.

V2 challenge verification supplies a CAIP-122 issuer in `did:pkh:eip155:<chainId>:<address>` form and the configured RP URI as its audience. Legacy nonce verification preserves the existing domain-valued issuer and audience callback fields.

This release remains EOA/EIP-191 only and does not add ERC-1271 or ERC-6492 smart-account verification.

SIWE proof fields now have explicit size limits, challenge inputs reject unknown or unsafe values, and challenge, nonce, verification, and link-proof endpoints receive a dedicated per-IP, per-path rate limit that defaults to 10 requests per 60 seconds.
