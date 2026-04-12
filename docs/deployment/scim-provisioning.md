# SCIM Provisioning Deployment Guide

This guide covers deploying AuthFramework's SCIM 2.0 (System for Cross-domain Identity Management) client for automated user and group provisioning with identity providers.

## Prerequisites

- An identity provider (IdP) with a SCIM 2.0 server endpoint (Azure AD, Okta, OneLogin, etc.)
- A bearer token or OAuth 2.0 credentials for SCIM API authentication
- HTTPS connectivity to the SCIM endpoint

## Configuration

### ScimClientConfig Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `base_url` | `String` | — | SCIM 2.0 base URL, e.g. `https://idp.example.com/scim/v2` |
| `bearer_token` | `String` | — | Bearer token for API authentication |
| `timeout_secs` | `u64` | — | HTTP request timeout in seconds |

### Example Configuration

```rust
use auth_framework::protocols::scim::{ScimClientConfig, ScimClient};

let config = ScimClientConfig {
    base_url: "https://idp.example.com/scim/v2".to_string(),
    bearer_token: "your-scim-api-token".to_string(),
    timeout_secs: 30,
};

let client = ScimClient::new(config);
```

## Identity Provider Setup

### Azure AD (Entra ID)

1. In the Azure Portal, navigate to **Enterprise Applications → Your App → Provisioning**
2. Set provisioning mode to **Automatic**
3. Enter your AuthFramework SCIM endpoint URL as the **Tenant URL**
4. Enter the bearer token as the **Secret Token**
5. Click **Test Connection** to verify
6. Configure attribute mappings as needed

### Okta

1. In the Okta Admin Console, go to **Applications → Your App → Provisioning**
2. Enable **SCIM connector** integration
3. Set the SCIM connector base URL and authentication token
4. Enable desired provisioning features (Create, Update, Deactivate)

## User Operations

### Create a User

```rust
let user = client.create_user(
    "jdoe",
    "John",
    "Doe",
    "john.doe@example.com",
).await?;

println!("Created user ID: {}", user.id);
```

### Get a User

```rust
let user = client.get_user("user-id-123").await?;
println!("User: {} {}", user.name.given_name, user.name.family_name);
```

### Update a User

```rust
let updated = client.replace_user("user-id-123", updated_user_resource).await?;
```

### Patch a User (Partial Update)

```rust
let patch = client.patch_user("user-id-123", patch_operations).await?;
```

### Delete a User

```rust
client.delete_user("user-id-123").await?;
```

### List Users with Filtering

```rust
let users = client.list_users(
    Some("userName eq \"jdoe\""),   // filter
    Some(1),                         // start_index
    Some(100),                       // count
).await?;

for user in &users.resources {
    println!("{}: {}", user.id, user.user_name);
}
```

## Group Operations

### Create a Group

```rust
let group = client.create_group("Engineering", member_ids).await?;
```

### List Groups

```rust
let groups = client.list_groups(None, Some(1), Some(50)).await?;
```

## Bulk Operations

For provisioning large numbers of users or groups at once:

```rust
let operations = vec![
    BulkOperation::create_user(user1),
    BulkOperation::create_user(user2),
    BulkOperation::create_group(group1),
];

let results = client.bulk_operations(operations).await?;
```

## Service Provider Configuration Discovery

Query the IdP's SCIM capabilities:

```rust
let config = client.get_service_provider_config().await?;

println!("Supports patch: {}", config.patch.supported);
println!("Supports bulk: {}", config.bulk.supported);
println!("Max bulk operations: {}", config.bulk.max_operations);
println!("Supports filter: {}", config.filter.supported);
```

## Provisioning Workflows

### Initial User Sync

```rust
// 1. Discover capabilities
let sp_config = client.get_service_provider_config().await?;

// 2. List all existing users from IdP
let mut start_index = 1;
let page_size = 100;
loop {
    let page = client.list_users(None, Some(start_index), Some(page_size)).await?;
    for user in &page.resources {
        // Sync each user to local storage
        sync_user_locally(user).await?;
    }
    if start_index + page_size > page.total_results {
        break;
    }
    start_index += page_size;
}
```

### Incremental Sync

Use SCIM filtering to fetch recently modified users:

```rust
let filter = format!("meta.lastModified gt \"{}\"", last_sync_time.to_rfc3339());
let updated = client.list_users(Some(&filter), Some(1), Some(100)).await?;
```

## Security Considerations

- **Bearer Token Rotation**: Rotate SCIM bearer tokens regularly. Store them in a secrets manager, not in code or plain configuration files.
- **HTTPS Only**: Always use HTTPS for the SCIM base URL. SCIM transmits PII (names, emails, group memberships).
- **Rate Limiting**: IdP SCIM endpoints typically enforce rate limits. Implement backoff for bulk operations.
- **Minimal Attributes**: Only request and sync attributes you need. Avoid syncing sensitive fields unnecessarily.
- **Audit Logging**: Log all SCIM provisioning operations for compliance and troubleshooting.

## Troubleshooting

| Symptom | Likely Cause | Solution |
|---------|-------------|----------|
| `401 Unauthorized` | Invalid or expired bearer token | Regenerate the token in the IdP admin console |
| `404 Not Found` on user operations | Wrong base URL or user ID | Verify `base_url` ends with `/scim/v2` (no trailing slash) |
| Timeout on bulk operations | Too many operations or slow IdP | Reduce batch size; increase `timeout_secs` |
| `409 Conflict` on create | User already exists | Use list + filter to check before create, or use PUT |
| Missing attributes in response | IdP attribute mapping incomplete | Check IdP provisioning attribute mappings |
