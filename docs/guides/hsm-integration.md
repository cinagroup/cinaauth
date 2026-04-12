# Hardware Security Module (HSM) Integration

AuthFramework provides enterprise-grade key management integration via PKCS#11, allowing cryptographic operations to be offloaded to robust external appliances (HSMs) or cloud KMS solutions.

## Prerequisites

To integrate an HSM, you will need:

1. An HSM device (e.g., Thales, Entrust) or Cloud KMS (AWS KMS, Azure Key Vault, Google Cloud HSM) presenting a PKCS#11 interface.
2. The dynamic PKCS#11 provider library (`.so`, `.dll`, `.dylib`) supplied by your HSM vendor.
3. The `hsm` feature flag enabled when compiling AuthFramework.

## Configuration

In your `config.toml` or via environment variables, set the HSM provider path and details:

```toml
[security.hsm]
enabled = true
# Path to the vendor's PKCS#11 library
provider_path = "/opt/hsm-vendor/lib/libpkcs11.so"
slot_id = 0
# The PIN/password for the HSM partition (Use environment variables in production!)
pin = "${HSM_PARTITION_PIN}"
```

## Key Migration

If you are migrating existing software keys to the HSM:

1. Stop the AuthFramework instances to ensure no key rotations occur.
2. Run the CLI tool to import existing keys:
   ```bash
   auth-cli keys import-to-hsm --provider /opt/hsm-vendor/lib/libpkcs11.so --slot 0
   ```
3. Update the `config.toml` to enable the HSM and start the service.

## Performance Considerations

Offloading operations to an HSM can introduce network latency (for network-attached HSMs) or serialization overhead. Ensure that your connection to the HSM is low-latency, and consider using connection pooling if your vendor's PKCS#11 library supports it.

AuthFramework caches public keys in memory to ensure that signature verification remains ultra-fast, primarily relying on the HSM for the private key signing operations.
