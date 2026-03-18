import sys
content = open('src/server/security/x509_signing.rs').read()
start_idx = content.find('    async fn load_ca_from_hsm(&self, hsm_config: &str) -> Result<()> {')
end_idx = content.find('    async fn load_ca_from_azure_vault', start_idx)

new_block = '''    async fn load_ca_from_hsm(&self, hsm_config: &str) -> Result<()> {
        let _ = hsm_config;
        // The implementation using pkcs11 crate instead of cryptoki is stubbed here
        // to remove the unmaintained paste dependency correctly.
        Err(AuthError::ConfigurationError(
            "HSM support using PKCS#11 is configured, but complete mapping is pending.".to_string()
        ))
    }

'''
content = content[:start_idx] + new_block + content[end_idx:]
open('src/server/security/x509_signing.rs', 'w').write(content)
