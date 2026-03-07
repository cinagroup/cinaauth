#!/usr/bin/env python3
"""
Comprehensive OAuth2 Flow Validation Tests
Tests all OAuth2 flows, PKCE implementation, token management, and integration
"""
import requests
import json
import base64
import hashlib
import secrets
import urllib.parse
import time
from typing import Dict, Optional, Tuple

class OAuth2Tester:
    def __init__(self, base_url: str = "http://127.0.0.1:8080"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = {}
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        self.test_results[test_name] = {"success": success, "details": details}
        
    def generate_pkce_pair(self) -> Tuple[str, str]:
        """Generate PKCE code verifier and challenge"""
        code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode('utf-8')).digest()
        ).decode('utf-8').rstrip('=')
        return code_verifier, code_challenge
        
    def test_server_connectivity(self) -> bool:
        """Test 1: Basic server connectivity"""
        try:
            response = self.session.get(f"{self.base_url}/health", timeout=5)
            success = response.status_code == 200
            self.log_test("Server Connectivity", success, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Server Connectivity", False, f"Error: {str(e)}")
            return False
            
    def test_oauth2_discovery(self) -> bool:
        """Test 2: OAuth2/OIDC Discovery Endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/.well-known/openid-configuration", timeout=5)
            if response.status_code == 200:
                config = response.json()
                required_fields = ['authorization_endpoint', 'token_endpoint', 'issuer']
                has_required = all(field in config for field in required_fields)
                self.log_test("OAuth2 Discovery", has_required, 
                            f"Found {len(config)} configuration fields")
                return has_required
            else:
                self.log_test("OAuth2 Discovery", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("OAuth2 Discovery", False, f"Error: {str(e)}")
            return False
            
    def test_authorization_endpoint_basic(self) -> Optional[str]:
        """Test 3: Basic Authorization Code Flow (without PKCE)"""
        try:
            params = {
                'response_type': 'code',
                'client_id': 'test_client',
                'redirect_uri': 'http://localhost:3000/callback',
                'scope': 'openid profile',
                'state': 'test_state_123'
            }
            
            response = self.session.get(
                f"{self.base_url}/api/v1/oauth2/authorize",
                params=params,
                allow_redirects=False,
                timeout=5
            )
            
            if response.status_code in [200, 302]:
                # For testing purposes, we expect either a form or redirect
                success = True
                details = f"Status: {response.status_code}"
                
                # Check if we got a redirect with authorization code
                if response.status_code == 302:
                    location = response.headers.get('Location', '')
                    if 'code=' in location:
                        # Extract authorization code
                        parsed = urllib.parse.urlparse(location)
                        query_params = urllib.parse.parse_qs(parsed.query)
                        auth_code = query_params.get('code', [None])[0]
                        details += f", Code: {auth_code[:10]}..." if auth_code else ""
                        self.log_test("Authorization Endpoint (Basic)", success, details)
                        return auth_code
                        
                self.log_test("Authorization Endpoint (Basic)", success, details)
                return "mock_auth_code"  # Return mock code for further testing
            else:
                self.log_test("Authorization Endpoint (Basic)", False, f"Status: {response.status_code}")
                return None
                
        except Exception as e:
            self.log_test("Authorization Endpoint (Basic)", False, f"Error: {str(e)}")
            return None
            
    def test_authorization_endpoint_pkce(self) -> Optional[Tuple[str, str]]:
        """Test 4: Authorization Code Flow with PKCE"""
        try:
            code_verifier, code_challenge = self.generate_pkce_pair()
            
            params = {
                'response_type': 'code',
                'client_id': 'test_client',
                'redirect_uri': 'http://localhost:3000/callback',
                'scope': 'openid profile',
                'state': 'test_state_pkce',
                'code_challenge': code_challenge,
                'code_challenge_method': 'S256'
            }
            
            response = self.session.get(
                f"{self.base_url}/api/v1/oauth2/authorize",
                params=params,
                allow_redirects=False,
                timeout=5
            )
            
            if response.status_code in [200, 302]:
                success = True
                details = f"Status: {response.status_code}, PKCE Challenge generated"
                
                # Extract authorization code if redirected
                auth_code = "mock_auth_code_pkce"
                if response.status_code == 302:
                    location = response.headers.get('Location', '')
                    if 'code=' in location:
                        parsed = urllib.parse.urlparse(location)
                        query_params = urllib.parse.parse_qs(parsed.query)
                        auth_code = query_params.get('code', ['mock_auth_code_pkce'])[0]
                        
                self.log_test("Authorization Endpoint (PKCE)", success, details)
                return auth_code, code_verifier
            else:
                self.log_test("Authorization Endpoint (PKCE)", False, f"Status: {response.status_code}")
                return None
                
        except Exception as e:
            self.log_test("Authorization Endpoint (PKCE)", False, f"Error: {str(e)}")
            return None
            
    def test_token_endpoint_basic(self, auth_code: str) -> Optional[Dict]:
        """Test 5: Token Exchange (Basic Flow)"""
        try:
            data = {
                'grant_type': 'authorization_code',
                'code': auth_code,
                'redirect_uri': 'http://localhost:3000/callback',
                'client_id': 'test_client',
                'client_secret': 'test_secret'
            }
            
            response = self.session.post(
                f"{self.base_url}/api/v1/oauth2/token",
                json=data,
                headers={'Content-Type': 'application/json'},
                timeout=5
            )
            
            if response.status_code == 200:
                tokens = response.json()
                has_required = all(key in tokens for key in ['access_token', 'token_type'])
                details = f"Got {len(tokens)} token fields"
                self.log_test("Token Exchange (Basic)", has_required, details)
                return tokens if has_required else None
            else:
                self.log_test("Token Exchange (Basic)", False, 
                            f"Status: {response.status_code}, Response: {response.text[:100]}")
                return None
                
        except Exception as e:
            self.log_test("Token Exchange (Basic)", False, f"Error: {str(e)}")
            return None
            
    def test_token_endpoint_pkce(self, auth_code: str, code_verifier: str) -> Optional[Dict]:
        """Test 6: Token Exchange with PKCE"""
        try:
            data = {
                'grant_type': 'authorization_code', 
                'code': auth_code,
                'redirect_uri': 'http://localhost:3000/callback',
                'client_id': 'test_client',
                'code_verifier': code_verifier
            }
            
            response = self.session.post(
                f"{self.base_url}/api/v1/oauth2/token",
                json=data,
                headers={'Content-Type': 'application/json'},
                timeout=5
            )
            
            if response.status_code == 200:
                tokens = response.json()
                has_required = all(key in tokens for key in ['access_token', 'token_type'])
                details = f"PKCE verified, got {len(tokens)} token fields"
                self.log_test("Token Exchange (PKCE)", has_required, details)
                return tokens if has_required else None
            else:
                self.log_test("Token Exchange (PKCE)", False,
                            f"Status: {response.status_code}, Response: {response.text[:100]}")
                return None
                
        except Exception as e:
            self.log_test("Token Exchange (PKCE)", False, f"Error: {str(e)}")
            return None
            
    def test_userinfo_endpoint(self, access_token: str) -> bool:
        """Test 7: UserInfo Endpoint with Access Token"""
        try:
            headers = {'Authorization': f'Bearer {access_token}'}
            response = self.session.get(
                f"{self.base_url}/api/v1/oauth2/userinfo",
                headers=headers,
                timeout=5
            )
            
            if response.status_code == 200:
                userinfo = response.json()
                has_subject = 'sub' in userinfo
                details = f"Got {len(userinfo)} user fields"
                self.log_test("UserInfo Endpoint", has_subject, details)
                return has_subject
            else:
                self.log_test("UserInfo Endpoint", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("UserInfo Endpoint", False, f"Error: {str(e)}")
            return False
            
    def test_token_revocation(self, access_token: str) -> bool:
        """Test 8: Token Revocation"""
        try:
            data = {
                'token': access_token,
                'client_id': 'test_client',
                'client_secret': 'test_secret'
            }
            
            response = self.session.post(
                f"{self.base_url}/api/v1/oauth2/revoke",
                json=data,
                headers={'Content-Type': 'application/json'},
                timeout=5
            )
            
            success = response.status_code in [200, 204]
            details = f"Status: {response.status_code}"
            self.log_test("Token Revocation", success, details)
            return success
            
        except Exception as e:
            self.log_test("Token Revocation", False, f"Error: {str(e)}")
            return False
            
    def test_revoked_token_access(self, access_token: str) -> bool:
        """Test 9: Verify Revoked Token Cannot Access Resources"""
        try:
            headers = {'Authorization': f'Bearer {access_token}'}
            response = self.session.get(
                f"{self.base_url}/api/v1/oauth2/userinfo",
                headers=headers,
                timeout=5
            )
            
            # Should fail with 401 Unauthorized
            success = response.status_code == 401
            details = f"Status: {response.status_code} (should be 401)"
            self.log_test("Revoked Token Rejection", success, details)
            return success
            
        except Exception as e:
            self.log_test("Revoked Token Rejection", False, f"Error: {str(e)}")
            return False
            
    def test_jwks_endpoint(self) -> bool:
        """Test 10: JWKS (JSON Web Key Set) Endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/.well-known/jwks.json", timeout=5)
            
            if response.status_code == 200:
                jwks = response.json()
                has_keys = 'keys' in jwks and len(jwks['keys']) > 0
                details = f"Found {len(jwks.get('keys', []))} keys"
                self.log_test("JWKS Endpoint", has_keys, details)
                return has_keys
            else:
                self.log_test("JWKS Endpoint", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("JWKS Endpoint", False, f"Error: {str(e)}")
            return False
            
    def run_comprehensive_tests(self):
        """Run all OAuth2 validation tests"""
        print("🚀 Starting Comprehensive OAuth2 Validation Tests")
        print("=" * 60)
        
        # Test 1: Basic connectivity
        if not self.test_server_connectivity():
            print("\n❌ Server not accessible. Stopping tests.")
            return
            
        # Test 2: Discovery
        self.test_oauth2_discovery()
        
        # Test 3-5: Basic Authorization Code Flow
        auth_code = self.test_authorization_endpoint_basic()
        if auth_code:
            tokens = self.test_token_endpoint_basic(auth_code)
            if tokens and 'access_token' in tokens:
                self.test_userinfo_endpoint(tokens['access_token'])
                
        # Test 6-7: PKCE Flow
        pkce_result = self.test_authorization_endpoint_pkce()
        if pkce_result:
            auth_code_pkce, code_verifier = pkce_result
            tokens_pkce = self.test_token_endpoint_pkce(auth_code_pkce, code_verifier)
            if tokens_pkce and 'access_token' in tokens_pkce:
                # Test token lifecycle
                self.test_token_revocation(tokens_pkce['access_token'])
                self.test_revoked_token_access(tokens_pkce['access_token'])
                
        # Test 10: JWKS
        self.test_jwks_endpoint()
        
        # Summary
        self.print_summary()
        
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 OAuth2 Validation Test Summary")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results.values() if result['success'])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {passed/total*100:.1f}%")
        
        if total - passed > 0:
            print("\n❌ Failed Tests:")
            for name, result in self.test_results.items():
                if not result['success']:
                    print(f"  - {name}: {result['details']}")
                    
        print("\n🎯 OAuth2 Implementation Status:")
        
        # Core OAuth2 Flow
        auth_basic = self.test_results.get("Authorization Endpoint (Basic)", {}).get("success", False)
        token_basic = self.test_results.get("Token Exchange (Basic)", {}).get("success", False)
        userinfo = self.test_results.get("UserInfo Endpoint", {}).get("success", False)
        
        if auth_basic and token_basic:
            print("  ✅ Basic OAuth2 Authorization Code Flow: WORKING")
        else:
            print("  ❌ Basic OAuth2 Authorization Code Flow: NEEDS WORK")
            
        # PKCE Support
        auth_pkce = self.test_results.get("Authorization Endpoint (PKCE)", {}).get("success", False)
        token_pkce = self.test_results.get("Token Exchange (PKCE)", {}).get("success", False)
        
        if auth_pkce and token_pkce:
            print("  ✅ PKCE Security Enhancement: WORKING")
        else:
            print("  ❌ PKCE Security Enhancement: NEEDS WORK")
            
        # Token Management
        revocation = self.test_results.get("Token Revocation", {}).get("success", False)
        revoked_rejection = self.test_results.get("Revoked Token Rejection", {}).get("success", False)
        
        if revocation and revoked_rejection:
            print("  ✅ Token Lifecycle Management: WORKING")
        else:
            print("  ❌ Token Lifecycle Management: NEEDS WORK")
            
        # Discovery & Standards
        discovery = self.test_results.get("OAuth2 Discovery", {}).get("success", False)
        jwks = self.test_results.get("JWKS Endpoint", {}).get("success", False)
        
        if discovery and jwks:
            print("  ✅ OAuth2/OIDC Standards Compliance: WORKING")
        else:
            print("  ❌ OAuth2/OIDC Standards Compliance: NEEDS WORK")
            
        print("\n" + "=" * 60)

if __name__ == "__main__":
    # Wait a moment for server to start
    print("⏳ Waiting for OAuth2 server to start...")
    time.sleep(3)
    
    tester = OAuth2Tester()
    tester.run_comprehensive_tests()