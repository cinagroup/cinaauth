#!/usr/bin/env python3
"""
OAuth2 Integration Flow Tests
Tests the complete OAuth2 flow end-to-end with actual authorization codes
"""
import requests
import json
import base64
import hashlib
import secrets
import urllib.parse
import time
from typing import Dict, Optional, Tuple
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import socket


class OAuth2CallbackServer(HTTPServer):
    """Custom HTTP server with OAuth2 callback attributes"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.auth_code: Optional[str] = None
        self.state: Optional[str] = None


class CallbackHandler(BaseHTTPRequestHandler):
    """Simple HTTP server to handle OAuth2 callbacks"""

    def do_GET(self):
        # Parse the callback URL to extract authorization code
        parsed_url = urllib.parse.urlparse(self.path)
        query_params = urllib.parse.parse_qs(parsed_url.query)

        # Store the authorization code
        if 'code' in query_params:
            self.server.auth_code = query_params['code'][0]
            self.server.state = query_params.get('state', [None])[0]

        # Send response
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        self.wfile.write(
            b'<html><body><h1>Authorization received!</h1><p>You can close this window.</p></body></html>')

    def log_message(self, format, *args):
        # Suppress logging
        pass


class OAuth2IntegrationTester:
    def __init__(self, base_url: str = "http://127.0.0.1:8080"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = {}
        self.callback_server = None
        self.callback_port = self.find_free_port()
        self.redirect_uri = f"http://localhost:{self.callback_port}/callback"

    def find_free_port(self) -> int:
        """Find a free port for the callback server"""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('', 0))
            s.listen(1)
            port = s.getsockname()[1]
        return port

    def start_callback_server(self):
        """Start the callback server to receive authorization codes"""
        self.callback_server = OAuth2CallbackServer(
            ('localhost', self.callback_port), CallbackHandler)

        def serve():
            self.callback_server.handle_request()

        thread = threading.Thread(target=serve)
        thread.daemon = True
        thread.start()

    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        self.test_results[test_name] = {"success": success, "details": details}

    def generate_pkce_pair(self) -> Tuple[str, str]:
        """Generate PKCE code verifier and challenge"""
        code_verifier = base64.urlsafe_b64encode(
            secrets.token_bytes(32)).decode('utf-8').rstrip('=')
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode('utf-8')).digest()
        ).decode('utf-8').rstrip('=')
        return code_verifier, code_challenge

    def test_complete_oauth2_flow(self) -> bool:
        """Test complete OAuth2 authorization code flow"""
        print("🔄 Testing Complete OAuth2 Authorization Code Flow...")

        try:
            # Step 1: Start callback server
            self.start_callback_server()

            # Step 2: Make authorization request
            state = secrets.token_urlsafe(32)
            params = {
                'response_type': 'code',
                'client_id': 'test_client',
                'redirect_uri': self.redirect_uri,
                'scope': 'openid profile',
                'state': state
            }

            print(
                f"   Step 1: Authorization Request to {
                    self.base_url}/api/v1/oauth2/authorize")
            response = self.session.get(
                f"{self.base_url}/api/v1/oauth2/authorize",
                params=params,
                allow_redirects=False,
                timeout=10
            )

            if response.status_code != 200:
                self.log_test(
                    "Complete OAuth2 Flow",
                    False,
                    f"Authorization failed: {
                        response.status_code}")
                return False

            # Check response format - it should be JSON with authorization_url
            try:
                auth_response = response.json()
                if 'data' in auth_response and 'authorization_url' in auth_response['data']:
                    auth_url = auth_response['data']['authorization_url']
                    print(
                        f"   Step 2: Got authorization URL: {auth_url[:60]}...")

                    # Parse the authorization URL to simulate user approval
                    parsed_url = urllib.parse.urlparse(auth_url)
                    query_params = urllib.parse.parse_qs(parsed_url.query)

                    # Simulate user approval by making a request to the callback URL
                    # In real flow, this would be done by the authorization
                    # server after user approval
                    if 'code' in query_params:
                        auth_code = query_params['code'][0]
                        print(
                            f"   Step 3: Extracted authorization code: {auth_code[:10]}...")

                        # Step 3: Exchange authorization code for tokens
                        token_data = {
                            'grant_type': 'authorization_code',
                            'code': auth_code,
                            'redirect_uri': self.redirect_uri,
                            'client_id': 'test_client',
                            'client_secret': 'test_secret'
                        }

                        token_response = self.session.post(
                            f"{self.base_url}/api/v1/oauth2/token",
                            json=token_data,
                            headers={'Content-Type': 'application/json'},
                            timeout=10
                        )

                        if token_response.status_code == 200:
                            tokens = token_response.json()
                            if 'data' in tokens and 'access_token' in tokens['data']:
                                access_token = tokens['data']['access_token']
                                print(
                                    f"   Step 4: Got access token: {access_token[:20]}...")

                                # Step 4: Test UserInfo endpoint
                                userinfo_response = self.session.get(
                                    f"{self.base_url}/api/v1/oauth2/userinfo",
                                    headers={'Authorization': f'Bearer {access_token}'},
                                    timeout=10
                                )

                                if userinfo_response.status_code == 200:
                                    userinfo = userinfo_response.json()
                                    print(
                                        f"   Step 5: Got user info with {len(userinfo.get('data', {}))} fields")
                                    self.log_test(
                                        "Complete OAuth2 Flow", True, "All steps completed successfully")
                                    return True
                                else:
                                    self.log_test(
                                        "Complete OAuth2 Flow", False, f"UserInfo failed: {
                                            userinfo_response.status_code}")
                                    return False
                            else:
                                self.log_test(
                                    "Complete OAuth2 Flow",
                                    False,
                                    f"Token exchange failed: no access_token in response")
                                return False
                        else:
                            token_text = token_response.text[:200] if token_response.text else "No response"
                            self.log_test(
                                "Complete OAuth2 Flow", False, f"Token exchange failed: {
                                    token_response.status_code} - {token_text}")
                            return False
                    else:
                        self.log_test(
                            "Complete OAuth2 Flow",
                            False,
                            "No authorization code in response")
                        return False
                else:
                    self.log_test(
                        "Complete OAuth2 Flow",
                        False,
                        f"Unexpected authorization response format: {auth_response}")
                    return False

            except json.JSONDecodeError:
                self.log_test(
                    "Complete OAuth2 Flow",
                    False,
                    f"Invalid JSON response from authorization endpoint")
                return False

        except Exception as e:
            self.log_test(
                "Complete OAuth2 Flow",
                False,
                f"Flow error: {
                    str(e)}")
            return False

    def test_pkce_flow(self) -> bool:
        """Test OAuth2 flow with PKCE enhancement"""
        print("🔐 Testing OAuth2 Flow with PKCE...")

        try:
            # Generate PKCE pair
            code_verifier, code_challenge = self.generate_pkce_pair()

            # Step 1: Authorization request with PKCE
            state = secrets.token_urlsafe(32)
            params = {
                'response_type': 'code',
                'client_id': 'test_client',
                'redirect_uri': self.redirect_uri,
                'scope': 'openid profile',
                'state': state,
                'code_challenge': code_challenge,
                'code_challenge_method': 'S256'
            }

            print(f"   Step 1: PKCE Authorization Request")
            response = self.session.get(
                f"{self.base_url}/api/v1/oauth2/authorize",
                params=params,
                allow_redirects=False,
                timeout=10
            )

            if response.status_code != 200:
                self.log_test(
                    "PKCE Flow",
                    False,
                    f"PKCE Authorization failed: {
                        response.status_code}")
                return False

            try:
                auth_response = response.json()
                if 'data' in auth_response and 'authorization_url' in auth_response['data']:
                    auth_url = auth_response['data']['authorization_url']
                    parsed_url = urllib.parse.urlparse(auth_url)
                    query_params = urllib.parse.parse_qs(parsed_url.query)

                    if 'code' in query_params:
                        auth_code = query_params['code'][0]
                        print(
                            f"   Step 2: Got PKCE authorization code: {auth_code[:10]}...")

                        # Step 2: Token exchange with code_verifier
                        token_data = {
                            'grant_type': 'authorization_code',
                            'code': auth_code,
                            'redirect_uri': self.redirect_uri,
                            'client_id': 'test_client',
                            'code_verifier': code_verifier
                        }

                        token_response = self.session.post(
                            f"{self.base_url}/api/v1/oauth2/token",
                            json=token_data,
                            headers={'Content-Type': 'application/json'},
                            timeout=10
                        )

                        if token_response.status_code == 200:
                            tokens = token_response.json()
                            if 'data' in tokens and 'access_token' in tokens['data']:
                                print(
                                    f"   Step 3: PKCE token exchange successful")
                                self.log_test(
                                    "PKCE Flow", True, "PKCE security enhancement working")
                                return True
                            else:
                                self.log_test(
                                    "PKCE Flow", False, "PKCE token exchange: no access_token")
                                return False
                        else:
                            token_text = token_response.text[:200] if token_response.text else "No response"
                            self.log_test(
                                "PKCE Flow", False, f"PKCE token exchange failed: {
                                    token_response.status_code} - {token_text}")
                            return False
                    else:
                        self.log_test(
                            "PKCE Flow", False, "No authorization code in PKCE response")
                        return False
                else:
                    self.log_test(
                        "PKCE Flow",
                        False,
                        f"Unexpected PKCE authorization response")
                    return False

            except json.JSONDecodeError:
                self.log_test(
                    "PKCE Flow",
                    False,
                    "Invalid JSON response from PKCE authorization")
                return False

        except Exception as e:
            self.log_test("PKCE Flow", False, f"PKCE flow error: {str(e)}")
            return False

    def test_server_capabilities(self) -> bool:
        """Test server capabilities and discovery"""
        print("🔍 Testing Server Capabilities...")

        try:
            # Test health endpoint
            health_response = self.session.get(
                f"{self.base_url}/health", timeout=5)
            if health_response.status_code != 200:
                self.log_test(
                    "Server Capabilities",
                    False,
                    f"Health check failed: {
                        health_response.status_code}")
                return False

            # Test discovery endpoint
            discovery_response = self.session.get(
                f"{self.base_url}/.well-known/openid-configuration", timeout=5)
            if discovery_response.status_code != 200:
                self.log_test(
                    "Server Capabilities", False, f"Discovery failed: {
                        discovery_response.status_code}")
                return False

            discovery_data = discovery_response.json()
            required_endpoints = [
                'authorization_endpoint',
                'token_endpoint',
                'issuer']

            for endpoint in required_endpoints:
                if endpoint not in discovery_data:
                    self.log_test(
                        "Server Capabilities",
                        False,
                        f"Missing {endpoint} in discovery")
                    return False

            # Test JWKS endpoint
            jwks_response = self.session.get(
                f"{self.base_url}/.well-known/jwks.json", timeout=5)
            if jwks_response.status_code != 200:
                self.log_test(
                    "Server Capabilities", False, f"JWKS failed: {
                        jwks_response.status_code}")
                return False

            jwks_data = jwks_response.json()
            if 'keys' not in jwks_data or len(jwks_data['keys']) == 0:
                self.log_test("Server Capabilities", False, "No keys in JWKS")
                return False

            self.log_test(
                "Server Capabilities",
                True,
                f"All capabilities verified")
            return True

        except Exception as e:
            self.log_test(
                "Server Capabilities",
                False,
                f"Capabilities error: {
                    str(e)}")
            return False

    def run_integration_tests(self):
        """Run complete OAuth2 integration tests"""
        print("🚀 Starting OAuth2 Integration Flow Tests")
        print("=" * 60)

        # Test server capabilities first
        if not self.test_server_capabilities():
            print("\n❌ Server capabilities test failed. Stopping integration tests.")
            return

        # Test complete OAuth2 flow
        self.test_complete_oauth2_flow()

        # Test PKCE enhancement
        self.test_pkce_flow()

        # Summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 OAuth2 Integration Test Summary")
        print("=" * 60)

        passed = sum(1 for result in self.test_results.values()
                     if result['success'])
        total = len(self.test_results)

        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {passed / total * 100:.1f}%")

        if total - passed > 0:
            print("\n❌ Failed Tests:")
            for name, result in self.test_results.items():
                if not result['success']:
                    print(f"  - {name}: {result['details']}")

        print("\n🎯 OAuth2 Integration Status:")

        # Check overall OAuth2 functionality
        oauth2_working = self.test_results.get(
            "Complete OAuth2 Flow", {}).get(
            "success", False)
        pkce_working = self.test_results.get(
            "PKCE Flow", {}).get(
            "success", False)
        capabilities_working = self.test_results.get(
            "Server Capabilities", {}).get(
            "success", False)

        if oauth2_working:
            print("  ✅ OAuth2 Authorization Code Flow: WORKING")
        else:
            print("  ❌ OAuth2 Authorization Code Flow: NEEDS WORK")

        if pkce_working:
            print("  ✅ PKCE Security Enhancement: WORKING")
        else:
            print("  ❌ PKCE Security Enhancement: NEEDS WORK")

        if capabilities_working:
            print("  ✅ Server Standards Compliance: WORKING")
        else:
            print("  ❌ Server Standards Compliance: NEEDS WORK")

        if oauth2_working and pkce_working and capabilities_working:
            print("\n🎉 OVERALL STATUS: OAuth2 implementation is FULLY FUNCTIONAL!")
        else:
            print("\n⚠️  OVERALL STATUS: Some OAuth2 components need attention")

        print("\n" + "=" * 60)


if __name__ == "__main__":
    # Wait a moment for server to be ready
    print("⏳ Preparing OAuth2 integration tests...")
    time.sleep(2)

    tester = OAuth2IntegrationTester()
    tester.run_integration_tests()
