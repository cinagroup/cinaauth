#!/usr/bin/env python3
"""
OAuth2 Security and Token Lifecycle Tests
Additional validation for token management, security features, and edge cases
"""
import requests
import json
import base64
import hashlib
import secrets
import urllib.parse
import time
from typing import Dict, Optional, Tuple

class OAuth2SecurityTester:
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
        
    def get_valid_token(self) -> Optional[str]:
        """Get a valid access token for testing"""
        try:
            # Get authorization code
            state = secrets.token_urlsafe(32)
            params = {
                'response_type': 'code',
                'client_id': 'test_client',
                'redirect_uri': 'http://localhost:3000/callback',
                'scope': 'openid profile',
                'state': state
            }
            
            auth_response = self.session.get(
                f"{self.base_url}/api/v1/oauth2/authorize",
                params=params,
                allow_redirects=False,
                timeout=10
            )
            
            if auth_response.status_code == 200:
                auth_data = auth_response.json()
                if 'data' in auth_data and 'authorization_url' in auth_data['data']:
                    auth_url = auth_data['data']['authorization_url']
                    parsed_url = urllib.parse.urlparse(auth_url)
                    query_params = urllib.parse.parse_qs(parsed_url.query)
                    
                    if 'code' in query_params:
                        auth_code = query_params['code'][0]
                        
                        # Exchange for token
                        token_data = {
                            'grant_type': 'authorization_code',
                            'code': auth_code,
                            'redirect_uri': 'http://localhost:3000/callback',
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
                                return tokens['data']['access_token']
                                
        except Exception as e:
            print(f"Error getting token: {e}")
            
        return None
        
    def test_token_revocation_lifecycle(self) -> bool:
        """Test complete token lifecycle including revocation"""
        print("🔄 Testing Token Lifecycle Management...")
        
        # Get a valid token
        access_token = self.get_valid_token()
        if not access_token:
            self.log_test("Token Lifecycle", False, "Could not obtain access token")
            return False
            
        try:
            # Step 1: Verify token works
            print("   Step 1: Verifying token is valid...")
            userinfo_response = self.session.get(
                f"{self.base_url}/api/v1/oauth2/userinfo",
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10
            )
            
            if userinfo_response.status_code != 200:
                self.log_test("Token Lifecycle", False, f"Token validation failed: {userinfo_response.status_code}")
                return False
                
            print(f"   Step 2: Token is valid, got userinfo")
            
            # Step 2: Revoke the token
            revoke_data = {
                'token': access_token,
                'client_id': 'test_client',
                'client_secret': 'test_secret'
            }
            
            print("   Step 3: Revoking token...")
            revoke_response = self.session.post(
                f"{self.base_url}/api/v1/oauth2/revoke",
                json=revoke_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if revoke_response.status_code not in [200, 204]:
                self.log_test("Token Lifecycle", False, f"Token revocation failed: {revoke_response.status_code}")
                return False
                
            print("   Step 4: Token revoked successfully")
            
            # Step 3: Verify token no longer works
            print("   Step 5: Verifying revoked token is rejected...")
            userinfo_response_after = self.session.get(
                f"{self.base_url}/api/v1/oauth2/userinfo",
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10
            )
            
            if userinfo_response_after.status_code == 401:
                print("   Step 6: Revoked token correctly rejected")
                self.log_test("Token Lifecycle", True, "Complete token lifecycle working correctly")
                return True
            else:
                self.log_test("Token Lifecycle", False, f"Revoked token not rejected: {userinfo_response_after.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Token Lifecycle", False, f"Lifecycle error: {str(e)}")
            return False
            
    def test_invalid_grant_handling(self) -> bool:
        """Test handling of invalid grants and security scenarios"""
        print("🔒 Testing Invalid Grant Handling...")
        
        try:
            # Test with invalid authorization code
            invalid_token_data = {
                'grant_type': 'authorization_code',
                'code': 'invalid_auth_code_12345',
                'redirect_uri': 'http://localhost:3000/callback',
                'client_id': 'test_client',
                'client_secret': 'test_secret'
            }
            
            print("   Testing invalid authorization code...")
            response = self.session.post(
                f"{self.base_url}/api/v1/oauth2/token",
                json=invalid_token_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 400 or response.status_code == 500:
                # Should reject invalid codes
                print(f"   Invalid code correctly rejected: {response.status_code}")
                
                # Test with invalid client credentials
                print("   Testing invalid client credentials...")
                invalid_client_data = {
                    'grant_type': 'authorization_code',
                    'code': 'some_code',
                    'redirect_uri': 'http://localhost:3000/callback',
                    'client_id': 'invalid_client',
                    'client_secret': 'invalid_secret'
                }
                
                response2 = self.session.post(
                    f"{self.base_url}/api/v1/oauth2/token",
                    json=invalid_client_data,
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                
                if response2.status_code in [400, 401, 500]:
                    print(f"   Invalid client correctly rejected: {response2.status_code}")
                    self.log_test("Invalid Grant Handling", True, "Security validations working")
                    return True
                else:
                    self.log_test("Invalid Grant Handling", False, f"Invalid client not rejected: {response2.status_code}")
                    return False
            else:
                self.log_test("Invalid Grant Handling", False, f"Invalid code not rejected: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Invalid Grant Handling", False, f"Security test error: {str(e)}")
            return False
            
    def test_pkce_security_validation(self) -> bool:
        """Test PKCE security validations"""
        print("🔐 Testing PKCE Security Validations...")
        
        try:
            # Generate PKCE pair
            code_verifier, code_challenge = self.generate_pkce_pair()
            
            # Get authorization code with PKCE
            state = secrets.token_urlsafe(32)
            params = {
                'response_type': 'code',
                'client_id': 'test_client',
                'redirect_uri': 'http://localhost:3000/callback',
                'scope': 'openid profile',
                'state': state,
                'code_challenge': code_challenge,
                'code_challenge_method': 'S256'
            }
            
            auth_response = self.session.get(
                f"{self.base_url}/api/v1/oauth2/authorize",
                params=params,
                allow_redirects=False,
                timeout=10
            )
            
            if auth_response.status_code == 200:
                auth_data = auth_response.json()
                if 'data' in auth_data and 'authorization_url' in auth_data['data']:
                    auth_url = auth_data['data']['authorization_url']
                    parsed_url = urllib.parse.urlparse(auth_url)
                    query_params = urllib.parse.parse_qs(parsed_url.query)
                    
                    if 'code' in query_params:
                        auth_code = query_params['code'][0]
                        
                        # Test 1: Try to exchange with wrong code_verifier
                        print("   Testing wrong PKCE code verifier...")
                        wrong_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')
                        
                        token_data = {
                            'grant_type': 'authorization_code',
                            'code': auth_code,
                            'redirect_uri': 'http://localhost:3000/callback',
                            'client_id': 'test_client',
                            'code_verifier': wrong_verifier
                        }
                        
                        response = self.session.post(
                            f"{self.base_url}/api/v1/oauth2/token",
                            json=token_data,
                            headers={'Content-Type': 'application/json'},
                            timeout=10
                        )
                        
                        if response.status_code in [400, 401, 500]:
                            print(f"   Wrong PKCE verifier correctly rejected: {response.status_code}")
                            
                            # Test 2: Try without code_verifier when PKCE was used
                            print("   Testing missing PKCE code verifier...")
                            token_data_no_verifier = {
                                'grant_type': 'authorization_code',
                                'code': auth_code,
                                'redirect_uri': 'http://localhost:3000/callback',
                                'client_id': 'test_client',
                                'client_secret': 'test_secret'
                            }
                            
                            response2 = self.session.post(
                                f"{self.base_url}/api/v1/oauth2/token",
                                json=token_data_no_verifier,
                                headers={'Content-Type': 'application/json'},
                                timeout=10
                            )
                            
                            if response2.status_code in [400, 401, 500]:
                                print(f"   Missing PKCE verifier correctly rejected: {response2.status_code}")
                                self.log_test("PKCE Security", True, "PKCE security validations working")
                                return True
                            else:
                                self.log_test("PKCE Security", False, f"Missing verifier not rejected: {response2.status_code}")
                                return False
                        else:
                            self.log_test("PKCE Security", False, f"Wrong verifier not rejected: {response.status_code}")
                            return False
                    else:
                        self.log_test("PKCE Security", False, "No auth code in PKCE response")
                        return False
                else:
                    self.log_test("PKCE Security", False, "No authorization URL in response")
                    return False
            else:
                self.log_test("PKCE Security", False, f"PKCE authorization failed: {auth_response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("PKCE Security", False, f"PKCE security test error: {str(e)}")
            return False
            
    def test_scope_validation(self) -> bool:
        """Test OAuth2 scope handling"""
        print("🎯 Testing Scope Validation...")
        
        try:
            # Test with different scopes
            test_scopes = [
                'openid',
                'openid profile',
                'openid profile email',
                'invalid_scope'
            ]
            
            valid_scope_count = 0
            
            for scope in test_scopes:
                print(f"   Testing scope: '{scope}'")
                params = {
                    'response_type': 'code',
                    'client_id': 'test_client',
                    'redirect_uri': 'http://localhost:3000/callback',
                    'scope': scope,
                    'state': secrets.token_urlsafe(16)
                }
                
                response = self.session.get(
                    f"{self.base_url}/api/v1/oauth2/authorize",
                    params=params,
                    allow_redirects=False,
                    timeout=10
                )
                
                if response.status_code == 200:
                    valid_scope_count += 1
                    print(f"     Scope '{scope}' accepted")
                else:
                    print(f"     Scope '{scope}' rejected: {response.status_code}")
                    
            # At least openid should be valid
            if valid_scope_count >= 1:
                self.log_test("Scope Validation", True, f"{valid_scope_count}/{len(test_scopes)} scopes valid")
                return True
            else:
                self.log_test("Scope Validation", False, "No scopes accepted")
                return False
                
        except Exception as e:
            self.log_test("Scope Validation", False, f"Scope test error: {str(e)}")
            return False
            
    def run_security_tests(self):
        """Run all OAuth2 security and lifecycle tests"""
        print("🔒 Starting OAuth2 Security and Token Lifecycle Tests")
        print("=" * 60)
        
        # Test token lifecycle
        self.test_token_revocation_lifecycle()
        
        # Test security validations
        self.test_invalid_grant_handling()
        
        # Test PKCE security
        self.test_pkce_security_validation()
        
        # Test scope handling
        self.test_scope_validation()
        
        # Summary
        self.print_summary()
        
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 OAuth2 Security Test Summary")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results.values() if result['success'])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {passed/total*100:.1f}%" if total > 0 else "No tests run")
        
        if total - passed > 0:
            print("\n❌ Failed Tests:")
            for name, result in self.test_results.items():
                if not result['success']:
                    print(f"  - {name}: {result['details']}")
                    
        print("\n🎯 OAuth2 Security Status:")
        
        # Check security components
        lifecycle_working = self.test_results.get("Token Lifecycle", {}).get("success", False)
        security_working = self.test_results.get("Invalid Grant Handling", {}).get("success", False)
        pkce_security_working = self.test_results.get("PKCE Security", {}).get("success", False)
        scope_working = self.test_results.get("Scope Validation", {}).get("success", False)
        
        if lifecycle_working:
            print("  ✅ Token Lifecycle Management: SECURE")
        else:
            print("  ❌ Token Lifecycle Management: NEEDS ATTENTION")
            
        if security_working:
            print("  ✅ Invalid Grant Handling: SECURE")
        else:
            print("  ❌ Invalid Grant Handling: NEEDS ATTENTION")
            
        if pkce_security_working:
            print("  ✅ PKCE Security Validations: SECURE")
        else:
            print("  ❌ PKCE Security Validations: NEEDS ATTENTION")
            
        if scope_working:
            print("  ✅ Scope Validation: WORKING")
        else:
            print("  ❌ Scope Validation: NEEDS ATTENTION")
            
        if all([lifecycle_working, security_working, pkce_security_working, scope_working]):
            print("\n🛡️  SECURITY STATUS: OAuth2 security implementation is ROBUST!")
        else:
            print("\n⚠️  SECURITY STATUS: Some security components need attention")
            
        print("\n" + "=" * 60)

if __name__ == "__main__":
    # Wait a moment for server
    print("⏳ Preparing OAuth2 security tests...")
    time.sleep(1)
    
    tester = OAuth2SecurityTester()
    tester.run_security_tests()