# API Documentation - Quick Start

## 🚀 View Your API Documentation

### Quick Start

```powershell
.\scripts\serve-api-docs.ps1
```

Opens: `http://localhost:8000/index-scalar.html`

**Press Ctrl+C to stop the server.**

---

## 🎯 What You Get

- **Beautiful dark theme** - Purple/dark design by Scalar
- **All 40+ endpoints** - Health, Auth, Users, MFA, OAuth, RBAC, Admin
- **Interactive testing** - Try endpoints directly from docs
- **Search functionality** - Find any endpoint instantly
- **Code samples** - Multiple languages with syntax highlighting
- **Modern UI** - Fast, responsive, professional

---

## 🛠️ Technology

We use **Scalar** (<https://github.com/scalar/scalar>):

- ✅ Native OpenAPI 3.1.0 support
- ✅ Built-in dark theme
- ✅ Modern, beautiful UI
- ✅ Zero build step
- ✅ No compatibility issues

---

## 📁 Files

| File                   | Purpose                  |
| ---------------------- | ------------------------ |
| `index-scalar.html`    | API documentation viewer |
| `openapi-modular.yaml` | Main modular spec        |
| `openapi-bundled.yaml` | All-in-one spec          |

---

## 🎨 Customization

Edit `index-scalar.html` to change themes:

- `purple` (default) - Purple accent
- `blue` - Blue accent  
- `green` - Green accent
- `orange` - Orange accent

Set `"darkMode": false` for light theme.

---

## 🔄 Updating Docs

1. Edit any YAML file in `docs/api/`
2. Refresh browser - changes load automatically
3. Optional: Regenerate bundled spec:

   ```powershell
   redocly bundle docs/api/openapi-modular.yaml -o docs/api/openapi-bundled.yaml
   ```

---

## 🛠️ Server Options

```powershell
# Default
.\scripts\serve-api-docs.ps1

# Custom port
.\scripts\serve-api-docs.ps1 -Port 3000
```

---

## 💡 Why HTTP Server?

Browsers block local file access (CORS). Opening `file:///path.html` can't fetch other local files. Solution: Use HTTP server (even localhost).

---

## 📚 More Info

See `SOLUTION.md` for full implementation details.
