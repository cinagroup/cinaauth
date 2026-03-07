use auth_framework::prelude::*;
use auth_framework::storage::MemoryStorage;
use std::sync::Arc;

#[tokio::test]
async fn build_with_custom_storage() {
    let mut config = AuthConfig::default();
    config.security.secret_key = Some("test_secret_key_32_bytes_long!!!!".to_string());

    // Create an in-memory storage and pass it via the builder
    let storage = Arc::new(MemoryStorage::new());

    let framework = AuthFramework::builder()
        .customize(|c| {
            c.secret = Some("test_secret_key_32_bytes_long!!!!".to_string());
        })
        .with_storage()
        .custom(storage.clone())
        .done()
        .build()
        .await
        .expect("builder should succeed");

    // Framework should be initialized and use the storage we provided
    assert!(framework.get_stats().await.is_ok());
}
