# End-to-End OAuth2 Tests

This directory contains optional Python-based end-to-end tests for the OAuth2 implementation.

## Purpose

These tests are **optional** and provide black-box validation of the OAuth2 REST API endpoints. They are useful for:

- Manual validation during release testing
- Demonstrating OAuth2 flows to external stakeholders
- Testing the API from a client's perspective

## Requirements

**Note**: These tests are NOT required for regular development. The primary test suite is in Rust (`tests/` directory) and runs with `cargo test`.

If you want to run these optional E2E tests, you'll need:

```bash
pip install requests
```

## Running the Tests

First, start the OAuth2 server:

```bash
cargo run --example simple_oauth2_server --features api-server
```

Then, in another terminal, run the tests:

```bash
python e2e/oauth2_comprehensive_tests.py
python e2e/oauth2_integration_tests.py
python e2e/oauth2_security_tests.py
python e2e/oauth2_security_fixes_test.py
python e2e/oauth2_security_validation.py
python e2e/oauth2_system_demo.py
```

## Test Files

- **oauth2_comprehensive_tests.py** - Complete OAuth2 flow validation
- **oauth2_integration_tests.py** - Integration flow tests with callback server
- **oauth2_security_tests.py** - Security feature validation
- **oauth2_security_fixes_test.py** - Specific security enhancement tests
- **oauth2_security_validation.py** - Security validation suite
- **oauth2_system_demo.py** - Complete system demonstration

## For Contributors

**You do NOT need Python to contribute to this project.** All required tests are written in Rust and run via `cargo test`. These Python tests are maintained separately for optional end-to-end validation only.
