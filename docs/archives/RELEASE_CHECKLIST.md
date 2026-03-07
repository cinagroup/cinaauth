# Release Checklist - v0.5.0

This document outlines everything that needs to be completed before publishing to GitHub and crates.io.

## ✅ COMPLETED Items

### Core Implementation
- ✅ All 5 requested features implemented (OAuth2 advanced, Security Manager, WebAuthn/SAML, JavaScript SDK, Precompiled releases)
- ✅ Library builds successfully (`cargo build --release`)
- ✅ Comprehensive test suite (405+ tests)
- ✅ Dual licensing (MIT OR Apache-2.0) with LICENSE files present
- ✅ Cross-platform installation scripts created
- ✅ Docker support configured
- ✅ CHANGELOG.md exists and is up-to-date

### Documentation
- ✅ README.md with Quick Start section
- ✅ DEPLOYMENT_GUIDE.md (570+ lines)
- ✅ WEBAUTHN_SAML_GUIDE.md (800+ lines)
- ✅ SECURITY.md present
- ✅ CONTRIBUTING.md present
- ✅ API documentation in code (for docs.rs)

### Package Metadata
- ✅ Cargo.toml has all required fields:
  - name, version, authors
  - description, documentation, repository
  - license, readme, keywords, categories
  - edition = "2024"

---

## ⚠️ ISSUES TO FIX

### Critical Issues (Must Fix Before Release)

#### 1. Test Compilation Failures 🔴 CRITICAL
**Status:** Tests fail to compile with `error[E0463]: can't find crate for auth_framework`

**Issue:** Test files cannot find the main crate. This is likely due to:
- Missing `[lib]` section in Cargo.toml with proper name
- Test files using incorrect crate name
- Workspace configuration issues

**Action Required:**
```bash
# Verify tests compile
cargo test --no-run

# Fix any compilation errors in:
# - tests/*.rs files
# - examples/*.rs files
```

**Files to Check:**
- `tests/` directory - ensure proper crate imports
- `examples/` directory - ensure examples compile
- `Cargo.toml` - verify `[lib]` section

#### 2. Missing CONFIGURATION_GUIDE.md 🟡 HIGH PRIORITY
**Status:** Referenced in README.md line 31 but file doesn't exist

**Action Required:**
- Create `docs/CONFIGURATION_GUIDE.md` with comprehensive configuration documentation
- OR remove the reference from README.md
- Document all configuration options, environment variables, and TOML settings

#### 3. Edition 2024 🟡 HIGH PRIORITY
**Status:** Cargo.toml specifies `edition = "2024"` which doesn't exist yet

**Issue:** Rust editions are 2015, 2018, 2021. Edition 2024 is not released.

**Action Required:**
```toml
# In Cargo.toml, change:
edition = "2024"
# To:
edition = "2021"
```

#### 4. Version Number 🟡 HIGH PRIORITY
**Status:** Current version is `0.5.0-alpha`

**Decision Required:**
- Keep as `-alpha` for initial release? (indicates unstable API)
- Change to `0.5.0` for stable release?
- Change to `0.1.0` as first crates.io release?

**Recommendation:** Use `0.1.0` for first crates.io release to follow semantic versioning conventions.

### Medium Priority Issues

#### 5. Markdown Lint Warnings 🟠 MEDIUM
**Status:** Multiple markdown files have formatting issues

**Issues:**
- MD026: Trailing punctuation in headings
- MD032: Missing blank lines around lists
- MD040: Missing language specifiers in code blocks
- MD031: Missing blank lines around fences

**Files Affected:**
- README.md
- docs/WEBAUTHN_SAML_GUIDE.md
- Various summary documents

**Action Required:** Run markdown linter and fix formatting issues (optional but recommended)

#### 6. LICENSE Reference 🟠 MEDIUM
**Status:** README.md references `LICENSE` file but only `LICENSE-MIT` and `LICENSE-APACHE` exist

**Action Required:**
- Create symlink/copy: `LICENSE` -> `LICENSE-MIT` or `LICENSE-APACHE`
- OR update README.md badge to reference `LICENSE-MIT`

#### 7. Backup/Analysis Files 🟠 MEDIUM
**Status:** Package includes backup directories and analysis files

**Action Required:** Ensure `.gitignore` excludes:
```
backup-*/
analysis_*/
*.profraw
*.log
```

**Current Package Includes:**
- `analysis_tuf_laptop_files/`
- `backup-*/` directories
- `.profraw` files
- Log files

#### 8. Development Files in Package 🟠 MEDIUM
**Status:** cargo package includes many development/summary files

**Action Required:** Consider adding to `.gitignore` or accept they'll be in package:
- `ALL_FEATURES_COMPLETE.md`
- `BUGS_FIXED.md`
- `CRITICAL_SECURITY_AUDIT_REPORT.md`
- `DEPLOYMENT_READY.md`
- `ENHANCEMENT_IMPLEMENTATION_PLAN.md`
- `IMPLEMENTATION_COMPLETE.md`
- `MERGE_PLAN_TUF_LAPTOP.rs`
- Various validation/audit reports

**Note:** These don't hurt functionality but increase package size.

### Low Priority Issues

#### 9. CHANGELOG Update 🟢 LOW
**Status:** CHANGELOG shows version `0.5.0-alpha - 2025-01-25`

**Action Required:**
- Update CHANGELOG with all 5 new features from this session
- Update date to release date
- Document breaking changes (if any)
- Add migration guide if needed

#### 10. JavaScript SDK in Separate Repo 🟢 LOW
**Status:** `sdks/javascript/` included in package but SDK split was planned

**Decision Required:**
- Keep JavaScript SDK in this repo for now?
- Complete the repository split before release?
- Document SDK location if external

#### 11. Example Scripts 🟢 LOW
**Status:** Several Python test scripts in root directory

**Files:**
- `test_oauth2_flow.py`
- `oauth2_comprehensive_tests.py`
- `oauth2_integration_tests.py`
- etc.

**Action Required:** Consider moving to `examples/` or `scripts/` directory

#### 12. Docker Compose Updates 🟢 LOW
**Status:** Verify docker-compose.yml works with latest changes

**Action Required:**
```bash
# Test Docker build and deployment
docker-compose build
docker-compose up -d
docker-compose down
```

---

## 📋 Pre-Release Testing Checklist

### Build Tests
```bash
# Clean build
cargo clean
cargo build --release

# Test with all features
cargo build --all-features

# Test with no default features
cargo build --no-default-features

# Test each major feature separately
cargo build --features "api-server"
cargo build --features "enhanced-rbac"
```

### Test Suite
```bash
# Run all tests
cargo test

# Run tests with all features
cargo test --all-features

# Run doc tests
cargo test --doc

# Run examples
cargo run --example simple_working_deployment
```

### Documentation
```bash
# Generate and review docs
cargo doc --no-deps --open

# Check for broken links in docs
cargo deadlinks

# Verify README examples compile (if using cargo-readme)
```

### Package Validation
```bash
# Dry-run package creation
cargo package --allow-dirty

# Check package contents
cargo package --list

# Verify package can be published
cargo publish --dry-run

# Check for unused dependencies
cargo udeps
```

### Security Audit
```bash
# Security audit
cargo audit

# Check for outdated dependencies
cargo outdated

# License compatibility check
cargo license
```

---

## 🚀 Release Process

### 1. Fix Critical Issues
- [ ] Fix test compilation errors
- [ ] Create CONFIGURATION_GUIDE.md or remove reference
- [ ] Change edition to 2021
- [ ] Decide on version number

### 2. Pre-Release Cleanup
- [ ] Update .gitignore to exclude backup/temp files
- [ ] Clean up development files (optional)
- [ ] Update CHANGELOG.md with all new features
- [ ] Verify all documentation links work
- [ ] Run markdown linter and fix issues (optional)

### 3. Testing
- [ ] Run full test suite: `cargo test --all-features`
- [ ] Test all examples compile and run
- [ ] Test installation scripts on each platform
- [ ] Test Docker deployment
- [ ] Verify docs generate correctly: `cargo doc --no-deps`

### 4. Package Preparation
- [ ] Update version in Cargo.toml
- [ ] Update version in README.md badges
- [ ] Update CHANGELOG.md with release date
- [ ] Commit all changes
- [ ] Tag release: `git tag -a v0.5.0 -m "Release v0.5.0"`

### 5. GitHub Release
- [ ] Push to GitHub: `git push origin main --tags`
- [ ] Create GitHub release from tag
- [ ] Upload precompiled binaries (from CI/CD)
- [ ] Upload installation scripts
- [ ] Copy CHANGELOG entry to release notes

### 6. Crates.io Publication
- [ ] Final check: `cargo publish --dry-run`
- [ ] Publish: `cargo publish`
- [ ] Verify on crates.io: https://crates.io/crates/auth-framework
- [ ] Verify docs on docs.rs: https://docs.rs/auth-framework

### 7. Post-Release
- [ ] Update README.md version badges
- [ ] Announce release on social media/forums
- [ ] Update project website (if applicable)
- [ ] Begin work on next version

---

## 🎯 Estimated Time to Complete

- **Critical Fixes:** 2-4 hours
  - Test compilation: 1-2 hours
  - Documentation: 1 hour
  - Cargo.toml fixes: 15 minutes
- **Medium Priority:** 1-2 hours
  - Markdown cleanup: 30 minutes
  - File organization: 30 minutes
  - LICENSE file: 15 minutes
- **Testing & Validation:** 2-3 hours
- **Total:** 5-9 hours

---

## 📝 Notes

### Minimum Requirements for crates.io
To publish to crates.io, you **MUST** have:
1. ✅ Valid Cargo.toml with all required fields
2. ✅ LICENSE file(s)
3. ✅ README.md
4. 🔴 **Package that compiles** (currently failing)
5. 🔴 **Valid Rust edition** (2024 doesn't exist)

### Recommended Before Publishing
- Clean test suite (all tests passing)
- Documentation that builds without warnings
- Examples that compile and run
- Security audit passed
- No critical clippy warnings

### Current Blockers
**You CANNOT publish to crates.io until these are fixed:**
1. 🔴 Test compilation errors
2. 🔴 Edition 2024 -> 2021

Everything else can be fixed post-release if needed, but these two will prevent publication.

---

## ✅ Quick Fix Summary

Here's what you need to do **minimum** to publish:

```bash
# 1. Fix Cargo.toml edition
# Change: edition = "2024"
# To: edition = "2021"

# 2. Fix test compilation
cargo test --no-run
# Fix any import errors in test files

# 3. Verify package builds
cargo package --allow-dirty

# 4. Create missing doc or remove reference
# Either create docs/CONFIGURATION_GUIDE.md
# Or remove link from README.md

# 5. Publish
cargo publish
```

**Current Status:** 🟡 Almost ready - 2 critical issues to fix

**Time to publish:** 2-4 hours of focused work
