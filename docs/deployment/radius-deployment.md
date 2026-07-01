# RADIUS Deployment Guide

This guide covers deploying Cinaauth with RADIUS authentication, supporting integration with FreeRADIUS, Microsoft NPS, and other RADIUS servers.

## Prerequisites

- A RADIUS server (FreeRADIUS, Microsoft NPS, Cisco ISE, etc.)
- Network connectivity to the RADIUS server (default UDP 1812 for auth, 1813 for accounting)
- A shared secret configured on both the RADIUS server and Cinaauth
- The Cinaauth host registered as a RADIUS client (NAS) on the server

## Configuration

### RadiusConfig Fields

| Field             | Type             | Default          | Description                                     |
| ----------------- | ---------------- | ---------------- | ----------------------------------------------- |
| `server_addr`     | `String`         | `127.0.0.1:1812` | RADIUS server address (host:port)               |
| `shared_secret`   | `String`         | —                | Shared secret (minimum 16 bytes recommended)    |
| `timeout`         | `Duration`       | 5 seconds        | Per-request timeout                             |
| `retries`         | `u32`            | `3`              | Number of retry attempts on timeout             |
| `nas_identifier`  | `String`         | `cinaauth` | NAS-Identifier sent to the RADIUS server        |
| `accounting_addr` | `Option<String>` | `None`           | Accounting server address (typically port 1813) |

### Example Configuration

Preferred — use the convenience constructor:

```rust
use cinaauth::protocols::radius::{RadiusConfig, RadiusClient};

// Minimal — uses default timeout (5s) and retries (3)
let config = RadiusConfig::with_server(
    "radius.example.com:1812",
    "your-strong-shared-secret-here",
)?;

// With custom timeout and retries
use std::time::Duration;
let config = RadiusConfig::with_options(
    "radius.example.com:1812",
    "your-strong-shared-secret-here",
    Duration::from_secs(10),
    5, // retries
)?;

let client = RadiusClient::new(config)?;
```

Manual struct construction is still supported:

```rust
use cinaauth::protocols::radius::{RadiusConfig, RadiusClient};
use std::time::Duration;

let config = RadiusConfig {
    server_addr: "radius.example.com:1812".to_string(),
    shared_secret: "your-strong-shared-secret-here".to_string(),
    timeout: Duration::from_secs(5),
    retries: 3,
    nas_identifier: "cinaauth-prod".to_string(),
    accounting_addr: Some("radius.example.com:1813".to_string()),
};

let client = RadiusClient::new(config)?;
```

## FreeRADIUS Setup

### 1. Register Cinaauth as a Client

Add to `/etc/freeradius/clients.conf`:

```
client cinaauth {
    ipaddr = 10.0.1.50
    secret = your-strong-shared-secret-here
    shortname = authframework
    nas_type = other
}
```

### 2. Configure Users (for testing)

Add to `/etc/freeradius/users`:

```
testuser Cleartext-Password := "testpass"
    Reply-Message := "Welcome",
    Session-Timeout := 3600
```

### 3. Restart FreeRADIUS

```bash
sudo systemctl restart freeradius
```

### 4. Verify with radtest

```bash
radtest testuser testpass radius.example.com 0 your-strong-shared-secret-here
```

## Microsoft NPS Setup

### 1. Add Cinaauth as a RADIUS Client

1. Open **Network Policy Server** console
2. Navigate to **RADIUS Clients and Servers → RADIUS Clients**
3. Right-click → **New**
4. Set:
   - Friendly name: `Cinaauth`
   - Address: IP or FQDN of the Cinaauth host
   - Shared Secret: Match the `shared_secret` in `RadiusConfig`

### 2. Create a Network Policy

1. Navigate to **Policies → Network Policies**
2. Create a new policy allowing the desired user groups
3. Set authentication method to PAP (for basic username/password)
4. Configure session timeout and other reply attributes as needed

## Authentication Flow

### Basic Authentication

```rust
let result = client.authenticate("username", "password").await?;

if result.accepted {
    println!("Login successful");
    if let Some(msg) = &result.reply_message {
        println!("Server message: {}", msg);
    }
    if let Some(timeout) = result.session_timeout {
        println!("Session valid for {} seconds", timeout);
    }
} else {
    println!("Login rejected");
}
```

### Challenge-Response (e.g., MFA)

Some RADIUS servers return Access-Challenge responses for multi-factor authentication:

```rust
let result = client.authenticate("username", "password").await?;

if let Some(challenge) = &result.challenge {
    // Prompt user for the challenge response (e.g., OTP)
    let otp = prompt_user(challenge);
    let final_result = client.respond_challenge("username", &otp, &result.state.unwrap()).await?;
    // Process final_result
}
```

### Accounting

When `accounting_addr` is configured, send session accounting records:

```rust
client.send_accounting_start("username", "session-123").await?;
// ... session active ...
client.send_accounting_stop("username", "session-123", session_duration, bytes_in, bytes_out).await?;
```

## Security Considerations

- **Shared Secret Strength**: Use a cryptographically random shared secret of at least 16 bytes. Weak secrets allow offline dictionary attacks against RADIUS packets.
- **Network Security**: RADIUS uses MD5-based authentication which is not encrypted in transit. Use IPsec, a VPN tunnel, or RadSec (RADIUS over TLS) for connections traversing untrusted networks.
- **Timeout Tuning**: Set `timeout` high enough to accommodate RADIUS server latency and any backend lookups (LDAP, SQL) the server performs.
- **Retry Limiting**: The default 3 retries prevents indefinite hangs. Adjust based on network reliability.
- **NAS-Identifier**: Set a meaningful `nas_identifier` to distinguish Cinaauth traffic in RADIUS server logs and policies.

## Troubleshooting

| Symptom                       | Likely Cause                               | Solution                                          |
| ----------------------------- | ------------------------------------------ | ------------------------------------------------- |
| Connection timeout            | Firewall blocking UDP 1812                 | Open UDP 1812 (and 1813 for accounting)           |
| Access-Reject for valid users | User not in NPS policy or wrong PAP config | Check RADIUS server logs; verify network policy   |
| `InvalidResponse` error       | Shared secret mismatch                     | Ensure secrets match exactly on both sides        |
| Intermittent failures         | RADIUS server overloaded                   | Increase `timeout`; add redundant RADIUS servers  |
| Challenge loop                | MFA state not carried forward              | Pass `state` attribute from challenge to response |
