# Testing Guide

## Quick Start - Running Tests

### Option 1: Manual (Recommended for Development)

**Step 1: Start the Server**
Open a terminal and run:
```powershell
.\run_server.ps1
```
Or directly:
```powershell
cargo run --example debug_server
```

**Leave this terminal running!** The server will continue running and you'll see log output.

**Step 2: Run Tests**
Open a **NEW/SEPARATE** terminal and run:
```powershell
.\test_security_features.ps1
```

Or run the complete authentication test:
```powershell
.\test_complete_auth.ps1
```

### Option 2: Automated (Using Background Job)

This will start the server in the background, run tests, and clean up:
```powershell
.\start_server_and_test.ps1
```

**Note**: This may take 30-60 seconds as it waits for the server to be ready.

---

## Understanding the Test Scripts

### `run_server.ps1`
- Simple script that starts the debug server
- Runs in foreground (blocking)
- Shows server logs in real-time
- Press Ctrl+C to stop

### `test_security_features.ps1`
- Tests all security features
- Requires server to be running
- Will exit immediately if server is not available
- Tests:
  - OAuth2 refresh token fix
  - API key listing
  - /users/me endpoint
  - Rate limiting
  - DoS protection
  - IP blacklisting

### `test_complete_auth.ps1`
- Comprehensive authentication test
- Tests all 4 authentication methods
- OAuth2 full flow
- API key management

### `start_server_and_test.ps1`
- Automated test runner
- Starts server in background job
- Waits for server to be ready (up to 30 seconds)
- Runs tests
- Cleans up server job automatically

---

## Common Issues

### "Server is not running"
**Problem**: Test script can't connect to http://localhost:8088

**Solutions**:
1. Make sure you started the server in a separate terminal
2. Check if port 8088 is already in use:
   ```powershell
   netstat -ano | findstr :8088
   ```
3. Wait a few more seconds - server takes 5-10 seconds to initialize

### "Server failed to start"
**Problem**: Server won't bind to port 8088

**Solutions**:
1. Check if something else is using port 8088
2. Try killing existing processes:
   ```powershell
   Get-Process | Where-Object { $_.ProcessName -like "*debug_server*" } | Stop-Process -Force
   ```

### Tests show errors but also show success
**Problem**: Old version of test script with `$ErrorActionPreference = 'Continue'`

**Solution**: The updated scripts now have `$ErrorActionPreference = 'Stop'` and will stop on first error.

---

## Quick Test (Verify Server is Running)

Run this in any terminal:
```powershell
Invoke-RestMethod -Uri "http://localhost:8088/health" -Method Get
```

If server is running, you'll see:
```json
{
  "status": "healthy",
  "timestamp": "...",
  ...
}
```

---

## Best Practices

1. **Always run server in a separate terminal** - Don't use background jobs during development
2. **Check server logs** - They show all requests and errors
3. **Stop server cleanly** - Press Ctrl+C instead of killing the process
4. **One server at a time** - Make sure no other instance is running before starting

---

## Development Workflow

```
Terminal 1 (Server):               Terminal 2 (Tests):
─────────────────────              ──────────────────

$ .\run_server.ps1                 $ .\test_security_features.ps1
🔍 Starting server...              ========================================
📦 Creating storage...             AuthFramework - Security Features Test
⚙️  Creating auth config...        ========================================
...                                
Server running on :8088            Checking if server is running...
                                   ✅ Server is running!
                                   
                                   === Test 1: OAuth2 Refresh ===
[INFO] POST /api/v1/auth/...      ✅ User registered: user_1234
[INFO] POST /api/v1/oauth2/...    ✅ Authorization code received
...                                ✅ Token refresh successful!
                                   ...
```

---

## All Test Scripts Summary

| Script                       | Purpose                | Server                  | Duration     |
| ---------------------------- | ---------------------- | ----------------------- | ------------ |
| `run_server.ps1`             | Start debug server     | Starts server           | Until Ctrl+C |
| `test_security_features.ps1` | Test security features | Requires running server | ~10 seconds  |
| `test_complete_auth.ps1`     | Test all auth methods  | Requires running server | ~15 seconds  |
| `start_server_and_test.ps1`  | Automated test runner  | Starts & stops server   | ~60 seconds  |

---

## Troubleshooting Commands

**Check if server is running:**
```powershell
Test-NetConnection -ComputerName localhost -Port 8088
```

**Kill all server processes:**
```powershell
Get-Process | Where-Object { $_.ProcessName -like "*debug_server*" -or $_.ProcessName -like "*cargo*" } | Stop-Process -Force
```

**View server logs:**
```powershell
# If running in foreground: just look at the terminal
# If running in background job:
Get-Job | Receive-Job
```

**Clean up background jobs:**
```powershell
Get-Job | Stop-Job
Get-Job | Remove-Job
```

---

## Success Indicators

When tests pass successfully, you should see:

```
✅ OAuth2 refresh token: FIXED
✅ API key listing: FIXED
✅ /users/me endpoint: ADDED
✅ Rate limiting: IMPLEMENTED
✅ DoS protection: IMPLEMENTED
✅ IP blacklisting: IMPLEMENTED
✅ Security stats: IMPLEMENTED

🎉 All security features are functional!
```

---

## Need Help?

If tests are failing:
1. Check that server is actually running (`Invoke-RestMethod` to /health endpoint)
2. Look at server logs for errors
3. Verify you're running the latest test scripts
4. Make sure port 8088 is available

If server won't start:
1. Run `cargo build --example debug_server` first
2. Check for compilation errors
3. Verify no other instance is running on port 8088
