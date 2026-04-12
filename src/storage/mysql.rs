use crate::errors::Result;
use crate::storage::{AuthStorage, SessionData};
use crate::tokens::AuthToken;
use async_trait::async_trait;
/// MySQL storage backend implementation for auth-framework.
#[cfg(feature = "mysql-storage")]
use sqlx::MySqlPool;

/// MySQL storage backend
#[cfg(feature = "mysql-storage")]
pub struct MySqlStorage {
    pool: MySqlPool,
}

#[cfg(feature = "mysql-storage")]
impl MySqlStorage {
    /// Create a new MySQL storage instance
    pub fn new(pool: MySqlPool) -> Self {
        Self { pool }
    }

    /// Initialize database tables.
    ///
    /// Creates the `auth_tokens`, `sessions`, and `kv_store` tables together
    /// with their secondary indexes if they do not already exist.  Safe to call
    /// on every application startup (`IF NOT EXISTS` guards are idempotent).
    ///
    /// MySQL-specific notes:
    /// - `DATETIME(6)` stores UTC timestamps with microsecond precision;
    ///   callers must ensure values are in UTC before binding.
    /// - `JSON` columns require MySQL 5.7.8+ / MariaDB 10.2+.
    /// - `LONGTEXT` is used for the access_token column to handle large JWTs.
    ///
    /// # Errors
    /// Returns an error if any DDL statement fails (e.g. insufficient privileges).
    pub async fn migrate(&self) -> Result<()> {
        // Each statement is executed separately because sqlx::query() accepts
        // exactly one SQL statement per call.

        // --- auth_tokens table ---
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS auth_tokens (
                token_id     VARCHAR(255)  NOT NULL PRIMARY KEY,
                user_id      VARCHAR(255)  NOT NULL,
                access_token LONGTEXT      NOT NULL,
                refresh_token TEXT,
                token_type   VARCHAR(50),
                expires_at   DATETIME(6)   NOT NULL,
                scopes       TEXT,
                issued_at    DATETIME(6)   NOT NULL,
                auth_method  VARCHAR(100)  NOT NULL,
                subject      VARCHAR(255),
                issuer       VARCHAR(255),
                client_id    VARCHAR(255),
                metadata     JSON,
                created_at   DATETIME(6)   DEFAULT CURRENT_TIMESTAMP(6),
                INDEX idx_auth_tokens_user_id (user_id),
                INDEX idx_auth_tokens_expires_at (expires_at),
                INDEX idx_auth_tokens_access_token (access_token(255))
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            "#,
        )
        .execute(&self.pool)
        .await
        .map_err(|e| {
            crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                format!("Migration failed (auth_tokens): {e}"),
            ))
        })?;

        // --- sessions table ---
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS sessions (
                session_id    VARCHAR(255) NOT NULL PRIMARY KEY,
                user_id       VARCHAR(255) NOT NULL,
                data          JSON         NOT NULL,
                expires_at    DATETIME(6),
                created_at    DATETIME(6)  DEFAULT CURRENT_TIMESTAMP(6),
                last_activity DATETIME(6)  DEFAULT CURRENT_TIMESTAMP(6),
                ip_address    VARCHAR(45),
                user_agent    TEXT,
                INDEX idx_sessions_user_id (user_id),
                INDEX idx_sessions_expires_at (expires_at)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            "#,
        )
        .execute(&self.pool)
        .await
        .map_err(|e| {
            crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                format!("Migration failed (sessions): {e}"),
            ))
        })?;

        // --- kv_store table ---
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS kv_store (
                `key`      VARCHAR(512) NOT NULL PRIMARY KEY,
                value      LONGBLOB     NOT NULL,
                expires_at DATETIME(6),
                created_at DATETIME(6)  DEFAULT CURRENT_TIMESTAMP(6),
                INDEX idx_kv_store_expires_at (expires_at)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            "#,
        )
        .execute(&self.pool)
        .await
        .map_err(|e| {
            crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                format!("Migration failed (kv_store): {e}"),
            ))
        })?;

        Ok(())
    }

    /// Fetch the roles and permissions for a user from the KV store.
    ///
    /// Returns `(roles, permissions)` — both default to empty vecs if the keys are absent
    /// or if deserialization fails (e.g. new user that has not yet been assigned any).
    async fn fetch_user_roles_and_permissions(&self, user_id: &str) -> (Vec<String>, Vec<String>) {
        let roles: Vec<String> = match self.get_kv(&format!("user_roles:{}", user_id)).await {
            Ok(Some(data)) => serde_json::from_slice(&data).unwrap_or_default(),
            _ => vec![],
        };
        let permissions: Vec<String> =
            match self.get_kv(&format!("user_permissions:{}", user_id)).await {
                Ok(Some(data)) => serde_json::from_slice(&data).unwrap_or_default(),
                _ => vec![],
            };
        (roles, permissions)
    }
}

#[cfg(feature = "mysql-storage")]
#[async_trait]
impl AuthStorage for MySqlStorage {
    async fn store_token(&self, token: &AuthToken) -> Result<()> {
        sqlx::query(
            r#"
            INSERT INTO auth_tokens (
                token_id, user_id, access_token, refresh_token, token_type,
                expires_at, scopes, issued_at, auth_method, subject, issuer,
                client_id, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                access_token = VALUES(access_token),
                refresh_token = VALUES(refresh_token),
                expires_at = VALUES(expires_at)
            "#,
        )
        .bind(&token.token_id)
        .bind(&token.user_id)
        .bind(&token.access_token)
        .bind(&token.refresh_token)
        .bind(&token.token_type)
        .bind(token.expires_at)
        .bind(serde_json::to_string(&token.scopes).unwrap_or_default())
        .bind(token.issued_at)
        .bind(&token.auth_method)
        .bind(&token.subject)
        .bind(&token.issuer)
        .bind(&token.client_id)
        .bind(serde_json::to_string(&token.metadata).unwrap_or_default())
        .execute(&self.pool)
        .await
        .map_err(|e| {
            crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                format!("Failed to store token: {}", e),
            ))
        })?;
        Ok(())
    }

    async fn get_token(&self, token_id: &str) -> Result<Option<AuthToken>> {
        use sqlx::Row;
        let row = sqlx::query(
            r#"
            SELECT token_id, user_id, access_token, refresh_token, token_type,
                   expires_at, scopes, issued_at, auth_method, subject, issuer,
                   client_id, metadata
            FROM auth_tokens WHERE token_id = ?
            "#,
        )
        .bind(token_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| {
            crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                format!("Failed to fetch token: {}", e),
            ))
        })?;

        if let Some(row) = row {
            let scopes: Vec<String> = row
                .try_get::<String, _>("scopes")
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default();
            let metadata = row
                .try_get::<String, _>("metadata")
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default();
            let expires_at = row.try_get("expires_at").map_err(|e| {
                crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                    format!("Failed to decode column expires_at: {}", e),
                ))
            })?;
            let issued_at = row.try_get("issued_at").map_err(|e| {
                crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                    format!("Failed to decode column issued_at: {}", e),
                ))
            })?;
            let user_id: String = row.try_get("user_id").map_err(|e| {
                crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                    format!("Failed to decode column user_id: {}", e),
                ))
            })?;
            let (roles, permissions) = self.fetch_user_roles_and_permissions(&user_id).await;
            Ok(Some(AuthToken {
                token_id: row.try_get("token_id").map_err(|e| {
                    crate::errors::AuthError::Storage(
                        crate::errors::StorageError::operation_failed(format!(
                            "Failed to decode column token_id: {}",
                            e
                        )),
                    )
                })?,
                user_id,
                access_token: row.try_get("access_token").map_err(|e| {
                    crate::errors::AuthError::Storage(
                        crate::errors::StorageError::operation_failed(format!(
                            "Failed to decode column access_token: {}",
                            e
                        )),
                    )
                })?,
                refresh_token: row.try_get("refresh_token").ok(),
                token_type: row.try_get("token_type").ok(),
                expires_at,
                scopes: scopes.into(),
                issued_at,
                auth_method: row.try_get("auth_method").map_err(|e| {
                    crate::errors::AuthError::Storage(
                        crate::errors::StorageError::operation_failed(format!(
                            "Failed to decode column auth_method: {}",
                            e
                        )),
                    )
                })?,
                subject: row.try_get("subject").ok(),
                issuer: row.try_get("issuer").ok(),
                client_id: row.try_get("client_id").ok(),
                user_profile: None,
                permissions: permissions.into(),
                roles: roles.into(),
                metadata,
            }))
        } else {
            Ok(None)
        }
    }

    async fn get_token_by_access_token(&self, access_token: &str) -> Result<Option<AuthToken>> {
        use sqlx::Row;
        let row = sqlx::query(
            r#"
            SELECT token_id, user_id, access_token, refresh_token, token_type,
                   expires_at, scopes, issued_at, auth_method, subject, issuer,
                   client_id, metadata
            FROM auth_tokens WHERE access_token = ?
            "#,
        )
        .bind(access_token)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| {
            crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                format!("Failed to fetch token: {}", e),
            ))
        })?;

        if let Some(row) = row {
            let scopes: Vec<String> = row
                .try_get::<String, _>("scopes")
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default();
            let metadata = row
                .try_get::<String, _>("metadata")
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default();
            let expires_at = row.try_get("expires_at").map_err(|e| {
                crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                    format!("Failed to decode column expires_at: {}", e),
                ))
            })?;
            let issued_at = row.try_get("issued_at").map_err(|e| {
                crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                    format!("Failed to decode column issued_at: {}", e),
                ))
            })?;
            let user_id: String = row.try_get("user_id").map_err(|e| {
                crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                    format!("Failed to decode column user_id: {}", e),
                ))
            })?;
            let (roles, permissions) = self.fetch_user_roles_and_permissions(&user_id).await;
            Ok(Some(AuthToken {
                token_id: row.try_get("token_id").map_err(|e| {
                    crate::errors::AuthError::Storage(
                        crate::errors::StorageError::operation_failed(format!(
                            "Failed to decode column token_id: {}",
                            e
                        )),
                    )
                })?,
                user_id,
                access_token: row.try_get("access_token").map_err(|e| {
                    crate::errors::AuthError::Storage(
                        crate::errors::StorageError::operation_failed(format!(
                            "Failed to decode column access_token: {}",
                            e
                        )),
                    )
                })?,
                refresh_token: row.try_get("refresh_token").ok(),
                token_type: row.try_get("token_type").ok(),
                expires_at,
                scopes: scopes.into(),
                issued_at,
                auth_method: row.try_get("auth_method").map_err(|e| {
                    crate::errors::AuthError::Storage(
                        crate::errors::StorageError::operation_failed(format!(
                            "Failed to decode column auth_method: {}",
                            e
                        )),
                    )
                })?,
                subject: row.try_get("subject").ok(),
                issuer: row.try_get("issuer").ok(),
                client_id: row.try_get("client_id").ok(),
                user_profile: None,
                permissions: permissions.into(),
                roles: roles.into(),
                metadata,
            }))
        } else {
            Ok(None)
        }
    }

    async fn update_token(&self, _token: &AuthToken) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE auth_tokens SET
                access_token = ?,
                refresh_token = ?,
                token_type = ?,
                expires_at = ?,
                scopes = ?,
                issued_at = ?,
                auth_method = ?,
                subject = ?,
                issuer = ?,
                client_id = ?,
                metadata = ?
            WHERE token_id = ?
            "#,
        )
        .bind(&_token.access_token)
        .bind(&_token.refresh_token)
        .bind(&_token.token_type)
        .bind(_token.expires_at)
        .bind(serde_json::to_string(&_token.scopes).unwrap_or_default())
        .bind(_token.issued_at)
        .bind(&_token.auth_method)
        .bind(&_token.subject)
        .bind(&_token.issuer)
        .bind(&_token.client_id)
        .bind(serde_json::to_string(&_token.metadata).unwrap_or_default())
        .bind(&_token.token_id)
        .execute(&self.pool)
        .await
        .map_err(|e| {
            crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                format!("Failed to update token: {}", e),
            ))
        })?;
        Ok(())
    }
    async fn delete_token(&self, token_id: &str) -> Result<()> {
        sqlx::query("DELETE FROM auth_tokens WHERE token_id = ?")
            .bind(token_id)
            .execute(&self.pool)
            .await
            .map_err(|e| {
                crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                    format!("Failed to delete token: {}", e),
                ))
            })?;
        Ok(())
    }
    async fn list_user_tokens(&self, _user_id: &str) -> Result<Vec<AuthToken>> {
        use sqlx::Row;
        let rows = sqlx::query(
            r#"
            SELECT token_id, user_id, access_token, refresh_token, token_type,
                   expires_at, scopes, issued_at, auth_method, subject, issuer,
                   client_id, metadata
            FROM auth_tokens WHERE user_id = ?
            "#,
        )
        .bind(_user_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| {
            crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                format!("Failed to list user tokens: {}", e),
            ))
        })?;

        let mut tokens = Vec::new();
        for row in rows {
            let scopes: Vec<String> = row
                .try_get::<String, _>("scopes")
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default();
            let metadata = row
                .try_get::<String, _>("metadata")
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default();
            let expires_at = row.try_get("expires_at").map_err(|e| {
                crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                    format!("Failed to decode column expires_at: {}", e),
                ))
            })?;
            let issued_at = row.try_get("issued_at").map_err(|e| {
                crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                    format!("Failed to decode column issued_at: {}", e),
                ))
            })?;
            let user_id: String = row.try_get("user_id").map_err(|e| {
                crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                    format!("Failed to decode column user_id: {}", e),
                ))
            })?;
            let (roles, permissions) = self.fetch_user_roles_and_permissions(&user_id).await;
            tokens.push(AuthToken {
                token_id: row.try_get("token_id").map_err(|e| {
                    crate::errors::AuthError::Storage(
                        crate::errors::StorageError::operation_failed(format!(
                            "Failed to decode column token_id: {}",
                            e
                        )),
                    )
                })?,
                user_id,
                access_token: row.try_get("access_token").map_err(|e| {
                    crate::errors::AuthError::Storage(
                        crate::errors::StorageError::operation_failed(format!(
                            "Failed to decode column access_token: {}",
                            e
                        )),
                    )
                })?,
                refresh_token: row.try_get("refresh_token").ok(),
                token_type: row.try_get("token_type").ok(),
                expires_at,
                scopes: scopes.into(),
                issued_at,
                auth_method: row.try_get("auth_method").map_err(|e| {
                    crate::errors::AuthError::Storage(
                        crate::errors::StorageError::operation_failed(format!(
                            "Failed to decode column auth_method: {}",
                            e
                        )),
                    )
                })?,
                subject: row.try_get("subject").ok(),
                issuer: row.try_get("issuer").ok(),
                client_id: row.try_get("client_id").ok(),
                user_profile: None,
                permissions: permissions.into(),
                roles: roles.into(),
                metadata,
            });
        }
        Ok(tokens)
    }
    async fn store_session(
        &self,
        session_id: &str,
        data: &crate::storage::SessionData,
    ) -> Result<()> {
        // Store session in DB
        sqlx::query(
            r#"
            INSERT INTO sessions (session_id, user_id, created_at, expires_at, last_activity, ip_address, user_agent, data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE data = VALUES(data), expires_at = VALUES(expires_at),
                last_activity = VALUES(last_activity), ip_address = VALUES(ip_address), user_agent = VALUES(user_agent)
            "#,
        )
        .bind(session_id)
        .bind(&data.user_id)
        .bind(data.created_at)
        .bind(data.expires_at)
        .bind(data.last_activity)
        .bind(&data.ip_address)
        .bind(&data.user_agent)
        .bind(serde_json::to_string(&data.data).unwrap_or_default())
        .execute(&self.pool)
        .await
        .map_err(|e| {
            crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                format!("Failed to store session: {}", e),
            ))
        })?;
        Ok(())
    }
    async fn get_session(&self, _session_id: &str) -> Result<Option<crate::storage::SessionData>> {
        use sqlx::Row;
        let row = sqlx::query(
            r#"
            SELECT session_id, user_id, created_at, expires_at, last_activity, ip_address, user_agent, data
            FROM sessions WHERE session_id = ?
            "#,
        )
        .bind(_session_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| {
            crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                format!("Failed to get session: {}", e),
            ))
        })?;
        if let Some(row) = row {
            let data = row
                .try_get::<String, _>("data")
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default();
            let created_at = row.try_get("created_at").map_err(|e| {
                crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                    format!("Failed to decode column created_at: {}", e),
                ))
            })?;
            let expires_at = row.try_get("expires_at").map_err(|e| {
                crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                    format!("Failed to decode column expires_at: {}", e),
                ))
            })?;
            Ok(Some(crate::storage::SessionData {
                session_id: row.try_get("session_id").map_err(|e| {
                    crate::errors::AuthError::Storage(
                        crate::errors::StorageError::operation_failed(format!(
                            "Failed to decode column session_id: {}",
                            e
                        )),
                    )
                })?,
                user_id: row.try_get("user_id").map_err(|e| {
                    crate::errors::AuthError::Storage(
                        crate::errors::StorageError::operation_failed(format!(
                            "Failed to decode column user_id: {}",
                            e
                        )),
                    )
                })?,
                created_at,
                expires_at,
                last_activity: row.try_get("last_activity").unwrap_or(created_at),
                ip_address: row.try_get("ip_address").ok(),
                user_agent: row.try_get("user_agent").ok(),
                data,
            }))
        } else {
            Ok(None)
        }
    }
    async fn delete_session(&self, _session_id: &str) -> Result<()> {
        sqlx::query("DELETE FROM sessions WHERE session_id = ?")
            .bind(_session_id)
            .execute(&self.pool)
            .await
            .map_err(|e| {
                crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                    format!("Failed to delete session: {}", e),
                ))
            })?;
        Ok(())
    }
    async fn store_kv(
        &self,
        key: &str,
        value: &[u8],
        ttl: Option<std::time::Duration>,
    ) -> Result<()> {
        let expires_at = ttl.map(|d| {
            chrono::Utc::now().naive_utc() + chrono::Duration::seconds(d.as_secs() as i64)
        });
        sqlx::query(
            r#"
            INSERT INTO kv_store (`key`, `value`, expires_at)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), expires_at = VALUES(expires_at)
            "#,
        )
        .bind(key)
        .bind(value)
        .bind(expires_at)
        .execute(&self.pool)
        .await
        .map_err(|e| {
            crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                format!("Failed to store kv: {}", e),
            ))
        })?;
        Ok(())
    }
    async fn get_kv(&self, _key: &str) -> Result<Option<Vec<u8>>> {
        use sqlx::Row;
        let row = sqlx::query(
            "SELECT `value` FROM kv_store WHERE `key` = ? AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP(6))",
        )
        .bind(_key)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| {
            crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                format!("Failed to get kv: {}", e),
            ))
        })?;
        Ok(row.and_then(|r| r.try_get("value").ok()))
    }
    async fn delete_kv(&self, _key: &str) -> Result<()> {
        sqlx::query("DELETE FROM kv_store WHERE `key` = ?")
            .bind(_key)
            .execute(&self.pool)
            .await
            .map_err(|e| {
                crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                    format!("Failed to delete kv: {}", e),
                ))
            })?;
        Ok(())
    }

    async fn list_kv_keys(&self, prefix: &str) -> Result<Vec<String>> {
        use sqlx::Row;

        let rows = sqlx::query(
                "SELECT `key` FROM kv_store WHERE `key` LIKE ? AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP(6)) ORDER BY `key`",
            )
            .bind(format!("{prefix}%"))
            .fetch_all(&self.pool)
            .await
            .map_err(|e| {
                crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                    format!("Failed to list kv keys: {}", e),
                ))
            })?;

        rows.into_iter()
            .map(|row| {
                row.try_get("key").map_err(|e| {
                    crate::errors::AuthError::Storage(
                        crate::errors::StorageError::operation_failed(format!(
                            "Failed to decode kv key: {}",
                            e
                        )),
                    )
                })
            })
            .collect()
    }

    async fn cleanup_expired(&self) -> Result<()> {
        let now = chrono::Utc::now().naive_utc();
        let now_str = now.format("%Y-%m-%d %H:%M:%S").to_string();
        // Clean up expired tokens
        sqlx::query("DELETE FROM auth_tokens WHERE expires_at < ?")
            .bind(&now_str)
            .execute(&self.pool)
            .await
            .map_err(|e| {
                crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                    format!("Failed to cleanup expired tokens: {}", e),
                ))
            })?;
        // Clean up expired sessions
        sqlx::query("DELETE FROM sessions WHERE expires_at < ?")
            .bind(&now_str)
            .execute(&self.pool)
            .await
            .map_err(|e| {
                crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                    format!("Failed to cleanup expired sessions: {}", e),
                ))
            })?;
        // Clean up expired KV entries
        sqlx::query("DELETE FROM kv_store WHERE expires_at IS NOT NULL AND expires_at < ?")
            .bind(&now_str)
            .execute(&self.pool)
            .await
            .map_err(|e| {
                crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                    format!("Failed to cleanup expired kv entries: {}", e),
                ))
            })?;
        Ok(())
    }

    async fn list_user_sessions(&self, user_id: &str) -> Result<Vec<SessionData>> {
        use sqlx::Row;
        let rows = sqlx::query(
            r#"
            SELECT session_id, user_id, data, expires_at, created_at, last_activity, ip_address, user_agent
            FROM sessions
            WHERE user_id = ? AND (expires_at IS NULL OR expires_at > NOW())
            "#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| {
            crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                format!("Failed to list user sessions: {}", e),
            ))
        })?;

        let mut sessions = Vec::new();
        for row in rows {
            let data: std::collections::HashMap<String, serde_json::Value> = row
                .try_get::<String, _>("data")
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default();

            sessions.push(SessionData {
                session_id: row.try_get("session_id").map_err(|e| {
                    crate::errors::AuthError::Storage(
                        crate::errors::StorageError::operation_failed(format!(
                            "Failed to decode column session_id: {}",
                            e
                        )),
                    )
                })?,
                user_id: row.try_get("user_id").map_err(|e| {
                    crate::errors::AuthError::Storage(
                        crate::errors::StorageError::operation_failed(format!(
                            "Failed to decode column user_id: {}",
                            e
                        )),
                    )
                })?,
                data,
                expires_at: row.try_get("expires_at").map_err(|e| {
                    crate::errors::AuthError::Storage(
                        crate::errors::StorageError::operation_failed(format!(
                            "Failed to decode column expires_at: {}",
                            e
                        )),
                    )
                })?,
                created_at: row.try_get("created_at").map_err(|e| {
                    crate::errors::AuthError::Storage(
                        crate::errors::StorageError::operation_failed(format!(
                            "Failed to decode column created_at: {}",
                            e
                        )),
                    )
                })?,
                last_activity: row.try_get("last_activity").map_err(|e| {
                    crate::errors::AuthError::Storage(
                        crate::errors::StorageError::operation_failed(format!(
                            "Failed to decode column last_activity: {}",
                            e
                        )),
                    )
                })?,
                ip_address: row.try_get("ip_address").ok(),
                user_agent: row.try_get("user_agent").ok(),
            });
        }

        Ok(sessions)
    }

    async fn count_active_sessions(&self) -> Result<u64> {
        use sqlx::Row;
        let row = sqlx::query(
            "SELECT COUNT(*) as count FROM sessions WHERE expires_at IS NULL OR expires_at > NOW()",
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| {
            crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                format!("Failed to count active sessions: {}", e),
            ))
        })?;

        let count: i64 = row.try_get("count").map_err(|e| {
            crate::errors::AuthError::Storage(crate::errors::StorageError::operation_failed(
                format!("Failed to parse session count: {}", e),
            ))
        })?;

        Ok(count as u64)
    }
}
