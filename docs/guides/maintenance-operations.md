# Maintenance Operations Guide

This guide documents the logical maintenance flows implemented in the AuthFramework maintenance layer:

- `db reset`
- `db create-migration`
- `system backup`
- `system restore`

## Scope

The maintenance layer operates on logical AuthFramework state rather than backend-native dump formats.

The snapshot contains:

- canonical user records discovered from the configured backend
- runtime role definitions
- runtime user-role assignments
- stored auth tokens
- stored sessions
- KV-backed state enumerated through `AuthStorage::list_kv_keys()`

This makes the flow backend-agnostic at the application-data layer while avoiding the false promise of cross-backend raw database dumps.

## Snapshot Format

Snapshots are written as JSON and include a manifest with:

- format version
- creation timestamp
- detected storage backend name
- user, role, token, session, and KV entry counts
- SHA-256 checksum over a canonicalized payload

Restore validates the checksum before mutating storage. A checksum mismatch aborts the restore.

## Reset Semantics

`db reset` is destructive. The implemented reset behavior deletes:

- stored tokens
- stored sessions
- canonical user records
- KV-backed state visible through storage enumeration

After deletion, runtime authorization state is reset and the default roles are recreated.

## Restore Semantics

`system restore` performs these steps:

1. Load and validate the snapshot checksum.
2. Perform the same logical reset used by `db reset`.
3. Restore KV entries.
4. Restore tokens.
5. Restore sessions.
6. Rebuild runtime role definitions.
7. Re-apply user-role assignments.

Role restoration is explicit because runtime authorization state is checker-managed and is not reconstructed automatically from storage alone.

## Migration Template Generation

`db create-migration` does not introspect live schemas. It generates a backend-named SQL template under:

- `migrations/postgres/`
- `migrations/mysql/`
- `migrations/sqlite/`
- `migrations/redis/` when the configured URL is Redis-backed
- `migrations/custom/` for unknown schemes

Migration filenames are timestamp-prefixed and the supplied name is sanitized into lowercase underscore-separated form.

## Verified Smoke Test Path

The maintenance command path has been smoke-tested against persistent SQLite storage through both CLI surfaces using:

- the crate CLI handler in `src/cli/mod.rs`
- the shipped admin binary CLI surface in `src/admin/cli.rs`

The smoke tests cover:

- backup to snapshot file
- reset of persisted state
- restore from snapshot
- migration template generation

Targeted validation commands are:

```powershell
cargo test --lib maintenance_cli_smoke_test_roundtrip --features "cli sqlite-storage" -- --test-threads=1
cargo test --lib maintenance_admin_cli_smoke_test_roundtrip --features "admin-binary sqlite-storage" -- --test-threads=1
```

## Release Binary Usage

The shipped `auth-framework-admin` binary exposes maintenance commands through the admin CLI surface in `src/bin/admin.rs` and `src/admin/cli.rs`.

Example forms:

```powershell
cargo run --bin auth-framework-admin --features "admin-binary sqlite-storage" -- cli maintenance backup snapshot.json
cargo run --bin auth-framework-admin --features "admin-binary sqlite-storage" -- cli maintenance reset --confirm
cargo run --bin auth-framework-admin --features "admin-binary sqlite-storage" -- cli maintenance restore snapshot.json --confirm
cargo run --bin auth-framework-admin --features "admin-binary sqlite-storage" -- cli maintenance create-migration add_audit_table
```
