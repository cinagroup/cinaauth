# Privacy Erasure Worker

Fail-closed CinaAuth deletion orchestration for external systems. It uses one
SQLite Durable Object per erasure operation plus a singleton SQLite Durable
Object for versioned, AES-GCM-encrypted post-deploy target configuration.

- Deployment can become structurally ready without downstream targets.
- Erasure remains unavailable until a NEXT configuration passes signed target
  handshakes and is activated.
- Runtime selection is dynamic ACTIVE, then legacy migration fallback, then
  fail closed.
- Management is HMAC-authenticated through the Auth Worker and never returns
  target URLs or credentials.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for bindings, protocols, bootstrap order,
and verification commands.
