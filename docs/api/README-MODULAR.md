# Cinaauth OpenAPI Specification - Modular Structure

## Overview

The Cinaauth OpenAPI specification has been modularized for better maintainability, collaboration, and clarity. Instead of a single 1400+ line file, the specification is now split into focused modules organized by domain and component type.

## Structure

```
docs/api/
├── openapi-modular.yaml          # Main entry point (use this!)
├── openapi.yaml                  # Legacy monolithic file (deprecated)
│
├── paths/                        # API endpoint definitions by domain
│   ├── health.yaml              # Infrastructure: /health, /metrics, /readiness, /liveness
│   ├── auth.yaml                # Authentication: /api/v1/auth/*
│   ├── users.yaml               # User management: /api/v1/users/*
│   ├── mfa.yaml                 # MFA: /api/v1/mfa/*
│   ├── oauth.yaml               # OAuth & OIDC: /api/v1/oauth/*, /.well-known/*
│   ├── rbac.yaml                # RBAC: /api/v1/rbac/* (requires enhanced-rbac feature)
│   └── admin.yaml               # Admin: /api/v1/admin/*
│
├── schemas/                      # Data structure definitions by domain
│   ├── common.yaml              # ApiResponse, ApiError, Pagination
│   ├── health.yaml              # Health check responses
│   ├── auth.yaml                # Login, tokens, validation
│   ├── users.yaml               # User profiles, creation, updates
│   ├── mfa.yaml                 # MFA setup, verification, status
│   ├── oauth.yaml               # OAuth tokens, OIDC discovery, JWK, UserInfo
│   ├── rbac.yaml                # Roles, permissions, assignments, audit logs
│   └── admin.yaml               # System stats, events, backups
│
└── components/                   # Reusable OpenAPI components
    ├── security.yaml            # Security schemes (Bearer auth)
    ├── parameters.yaml          # Common query parameters (page, limit, sort)
    └── responses.yaml           # Standard HTTP responses (400, 401, 403, 404, 429, 500)
```

## Benefits

### 1. **Maintainability**

- **Focused files**: Each file handles one domain (auth, OAuth, RBAC, etc.)
- **Easy navigation**: Find what you need quickly by domain
- **Smaller diffs**: Changes affect only relevant files

### 2. **Collaboration**

- **Parallel work**: Multiple team members can edit different domains simultaneously
- **Reduced conflicts**: Changes to auth endpoints don't conflict with RBAC changes
- **Clear ownership**: Domain experts can maintain their areas

### 3. **Reusability**

- **DRY principle**: Common schemas, parameters, and responses defined once
- **Consistent errors**: All endpoints use the same error response structure
- **Shared pagination**: One pagination schema used everywhere

### 4. **Clarity**

- **Logical organization**: Related endpoints and schemas grouped together
- **Self-documenting**: File names clearly indicate contents
- **Better tooling**: IDEs can navigate references between files

## Usage

### Viewing the Specification

**Option 1: Swagger UI (Recommended)**

```bash
# Install Swagger UI (if not already installed)
npm install -g swagger-ui-cli

# Serve the modular spec
swagger-ui serve docs/api/openapi-modular.yaml
```

**Option 2: Redoc**

```bash
# Install Redoc CLI
npm install -g redoc-cli

# Generate static HTML
redoc-cli bundle docs/api/openapi-modular.yaml -o docs/api/index.html

# Or serve live
redoc-cli serve docs/api/openapi-modular.yaml
```

**Option 3: VS Code Extension**

- Install: [OpenAPI (Swagger) Editor](https://marketplace.visualstudio.com/items?itemName=42Crunch.vscode-openapi)
- Open: `openapi-modular.yaml`
- Preview: Right-click → "OpenAPI: Show Preview"

### Validating the Specification

```bash
# Install validator
npm install -g @apidevtools/swagger-cli

# Validate (resolves all $ref)
swagger-cli validate docs/api/openapi-modular.yaml

# Bundle into single file (for tools that don't support $ref)
swagger-cli bundle docs/api/openapi-modular.yaml --outfile docs/api/openapi-bundled.yaml --type yaml
```

### Generating Client SDKs

The modular structure works seamlessly with code generators:

```bash
# Install OpenAPI Generator
npm install -g @openapitools/openapi-generator-cli

# Generate Rust client
openapi-generator-cli generate \
  -i docs/api/openapi-modular.yaml \
  -g rust \
  -o sdk/rust

# Generate TypeScript client
openapi-generator-cli generate \
  -i docs/api/openapi-modular.yaml \
  -g typescript-fetch \
  -o sdk/typescript

# Generate Python client
openapi-generator-cli generate \
  -i docs/api/openapi-modular.yaml \
  -g python \
  -o sdk/python
```

## Editing Guidelines

### Adding New Endpoints

1. **Identify the domain**: Auth, OAuth, RBAC, Users, MFA, Admin
2. **Edit the corresponding paths file**: `paths/{domain}.yaml`
3. **Add any new schemas**: `schemas/{domain}.yaml`
4. **Reference from main file**: `openapi-modular.yaml`

Example - Adding a new auth endpoint:

```yaml
# In paths/auth.yaml
passwordReset:
  post:
    tags:
      - Authentication
    summary: Request password reset
    description: Send password reset email to user
    operationId: requestPasswordReset
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: "../schemas/auth.yaml#/PasswordResetRequest"
    responses:
      "200":
        description: Reset email sent
        content:
          application/json:
            schema:
              $ref: "../schemas/common.yaml#/ApiResponse"
```

```yaml
# In schemas/auth.yaml (add new schema)
PasswordResetRequest:
  type: object
  properties:
    email:
      type: string
      format: email
      example: "user@example.com"
  required:
    - email
```

```yaml
# In openapi-modular.yaml (add path reference)
paths:
  /api/v1/auth/password-reset:
    $ref: './paths/auth.yaml#/passwordReset'
```

### Adding New Schemas

1. **Determine schema category**: Common, domain-specific, or component
2. **Edit appropriate schema file**: `schemas/{category}.yaml`
3. **Use descriptive names**: Follow existing naming conventions
4. **Document thoroughly**: Add descriptions, examples, constraints

### Adding Reusable Components

**New Parameter:**

```yaml
# In components/parameters.yaml
SearchParam:
  name: search
  in: query
  description: Search query string
  schema:
    type: string
    minLength: 3
    maxLength: 100
  example: "john doe"
```

**New Response:**

```yaml
# In components/responses.yaml
ServiceUnavailable:
  description: Service temporarily unavailable
  content:
    application/json:
      schema:
        $ref: "../schemas/common.yaml#/ApiError"
```

## Reference Syntax

### Local References (within same file)

```yaml
$ref: "#/ComponentName"
```

### Cross-File References

```yaml
# From paths to schemas
$ref: "../schemas/auth.yaml#/LoginRequest"

# From paths to components
$ref: "../components/responses.yaml#/BadRequest"

# From main file to paths
$ref: "./paths/auth.yaml#/login"
```

### Reference Best Practices

1. **Use relative paths**: `../schemas/` not absolute paths
2. **Always include fragment**: `#/SchemaName` to identify specific component
3. **Validate references**: Use `swagger-cli validate` to catch broken links
4. **Keep paths short**: Avoid deep nesting (max 2-3 levels)

## Validation Checklist

Before committing changes:

- [ ] **Validate syntax**: `swagger-cli validate docs/api/openapi-modular.yaml`
- [ ] **Check all $ref**: Ensure no broken references
- [ ] **Preview in Swagger UI**: Verify rendering is correct
- [ ] **Test examples**: Ensure all examples are valid against schemas
- [ ] **Run route validator**: `scripts/validate-api-routes.ps1`
- [ ] **Check consistency**: Parameter names, response formats match conventions

## Troubleshooting

### "Cannot resolve reference" Error

**Cause**: Incorrect relative path or missing fragment identifier

**Solution**:

```yaml
# ❌ Wrong
$ref: "schemas/auth.yaml#/LoginRequest"

# ✅ Correct
$ref: "../schemas/auth.yaml#/LoginRequest"
```

### "$ref not found" Error

**Cause**: Referenced component doesn't exist in target file

**Solution**: Check spelling and ensure component is defined:

```bash
# Search for component definition
grep -r "LoginRequest:" docs/api/schemas/
```

### Circular Reference Warning

**Cause**: Schema A references B, B references A

**Solution**: Break cycle with `allOf` or restructure:

```yaml
# Instead of direct circular reference
UserWithRoles:
  allOf:
    - $ref: "#/User"
    - type: object
      properties:
        roles:
          type: array
          items:
            type: string  # Reference role names, not full Role object
```

## Migration from Monolithic File

The legacy `openapi.yaml` file remains for backward compatibility but is **deprecated**.

**To update tools and scripts:**

```bash
# Old
swagger-ui serve docs/api/openapi.yaml

# New
swagger-ui serve docs/api/openapi-modular.yaml
```

**Why not just update openapi.yaml?**

The modular structure provides significant benefits for maintenance and collaboration. A 1400-line file is unwieldy for:

- Multiple contributors working simultaneously
- Code reviews (large diffs obscure real changes)
- Navigating to specific endpoints or schemas
- Understanding the API structure at a glance

## Future Enhancements

Potential improvements to the modular structure:

1. **Automated validation in CI/CD**
   - Add GitHub Actions workflow to validate on PR
   - Fail builds if spec is invalid or has breaking changes

2. **Auto-generate from code**
   - Keep spec in sync with implementation
   - Generate schemas from Rust types (without utoipa to maintain framework agnosticism)

3. **Example validation**
   - Ensure all examples are valid against their schemas
   - Catch outdated examples before they reach users

4. **Documentation generation**
   - Auto-generate Markdown docs from OpenAPI spec
   - Keep developer guides in sync with API spec

5. **Contract testing**
   - Use spec for automated API contract testing
   - Ensure implementation matches spec

## Questions?

- **Structure questions**: Check existing files for patterns
- **OpenAPI syntax**: See [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- **Tool issues**: Consult tool documentation (Swagger UI, Redoc, etc.)
- **Project-specific**: Create an issue or discuss in team chat

## Resources

- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [OpenAPI Style Guide](https://github.com/stoplightio/spectral)
- [Swagger Editor](https://editor.swagger.io/)
- [Redoc Documentation](https://redocly.com/docs/)
- [JSON Reference ($ref) Specification](https://tools.ietf.org/html/draft-pbryan-zyp-json-ref-03)
