# API Documentation - File Structure (Clean)

## 📁 Current Structure

After cleanup, here's what remains in `docs/api/`:

### ✅ Active Files

#### Documentation Viewer

- **`index-scalar.html`** - Main API documentation viewer using Scalar
  - Modern, dark theme by default
  - Interactive testing
  - OpenAPI 3.1.0 native support

#### OpenAPI Specifications

- **`openapi-modular.yaml`** - Main spec using $ref for modularity
- **`openapi-bundled.yaml`** - All-in-one version (generated)
- **`openapi.yaml`** - Legacy monolithic spec (can be removed if not needed)

#### Modular Spec Directories

- **`paths/`** - Endpoint definitions (health, auth, users, mfa, oauth, rbac, admin)
- **`schemas/`** - Data models (common, health, auth, users, mfa, oauth, rbac, admin)
- **`components/`** - Reusable components (security, parameters, responses)

#### Documentation

- **`README-MODULAR.md`** - Guide for modular OpenAPI structure
- **`MODULARIZATION_COMPLETE.md`** - Implementation summary
- **`QUICKSTART.md`** - Quick start guide (updated for Scalar)
- **`SOLUTION.md`** - Final solution documentation
- **`README.md`** - Main documentation overview

#### Design & Reference Docs

- **`REST_API_DESIGN_RATIONALE.md`** - Design decisions
- **`REST_API_AUDIT_AND_ACTION_PLAN.md`** - API audit
- **`OPENAPI_UPDATE_SUMMARY.md`** - OpenAPI updates
- **`complete-reference.md`** - Complete API reference
- **`integration-patterns.md`** - Integration patterns
- **`migration-upgrade.md`** - Migration guide
- **`performance-optimization.md`** - Performance tips
- **`IMPLEMENTATION_COMPLETE.md`** - Implementation status

### 🗑️ Removed (Experimental Files)

During exploration, we removed:

- ❌ `index-dark.html` - Swagger UI dark attempt
- ❌ `index-swagger-dark.html` - Swagger UI 5.x (had errors)
- ❌ `index-swagger-stable.html` - Swagger UI 4.x (version mismatch)
- ❌ `index-redoc-dark.html` - ReDoc standalone (process error)
- ❌ `index.html` - Redocly build (no dark theme)
- ❌ `dark-theme.css` - CSS theming attempt
- ❌ `DARK_THEME_IMPLEMENTATION.md` - Failed approach docs
- ❌ `ERROR_FIX.md` - Error troubleshooting docs

### 🎯 What to Use

**For viewing documentation:**

```powershell
.\scripts\serve-api-docs.ps1
```

Opens `index-scalar.html` with beautiful dark theme.

**For editing the spec:**

- Edit files in `paths/`, `schemas/`, `components/`
- Or edit `openapi-modular.yaml` directly
- Refresh browser to see changes

**For sharing/deploying:**

- Use `openapi-bundled.yaml` (single file, all refs resolved)
- Or use `index-scalar.html` + `openapi-bundled.yaml` together

---

## 📊 Statistics

- **Total HTML viewers**: 1 (Scalar)
- **Total OpenAPI specs**: 2 main + 20 modular files
- **Documentation files**: 14 markdown files
- **Total size**: ~1 MB (down from ~2 MB after cleanup)

---

## 🎉 Result

Clean, maintainable structure with:

- ✅ One working viewer (Scalar)
- ✅ Modular OpenAPI organization
- ✅ Comprehensive documentation
- ✅ No experimental/broken files

---

**Status**: ✅ Cleanup complete! Everything is organized and working.
