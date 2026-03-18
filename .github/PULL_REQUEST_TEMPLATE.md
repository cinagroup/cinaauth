# Pull Request

## Description

<!-- Briefly describe what this PR does and the motivation behind it. -->

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Refactor / internal improvement (no public API change)
- [ ] Documentation update
- [ ] Chore / dependency update

## Checklist

All items must pass before a PR can be merged.

### Build and Tests

- [ ] `cargo check --all-features` passes with no errors
- [ ] `cargo test --all-features` passes fully (zero failures, zero ignored)
- [ ] Any new functionality is covered by unit or integration tests

### Code Quality

- [ ] `cargo clippy --all-features -- -D warnings` passes with no new warnings
- [ ] `cargo fmt --check` passes (code is formatted)

### Documentation

- [ ] `cargo doc --no-deps --all-features` is warning-free
- [ ] Public API additions or changes are documented with rustdoc comments
- [ ] Relevant docs in `docs/` have been updated or created

### API and Security

- [ ] Public API changes follow the grouped accessor pattern (`auth.users()`, `auth.tokens()`, etc.)
- [ ] Secure defaults are maintained; no insecure fallback paths introduced
- [ ] Breaking changes are annotated and a migration path is described below

## Breaking Changes

<!-- If this PR introduces breaking changes, describe them here and explain the migration path.
     If not applicable, write "None". -->

None

## Related Issues

<!-- Reference any related issues using "Fixes #123" or "Closes #123" syntax. -->

---

> **Release Quality Gate**: PRs that fail any checklist item above will not be merged until the
> issue is resolved. For experimental or draft work, open a Draft PR and prefix the title with
> `[WIP]`.
