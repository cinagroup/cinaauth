#!/usr/bin/env python3
"""
OAuth2 Security Fixes Validation Tests
Tests the three specific security fixes:
1. Token Revocation Enforcement
2. PKCE Verifier Requirement Validation
3. Enhanced Scope Validation
"""
import requests
import json
import base64
import hashlib
import secrets
import urllib.parse
import time
from typing import Dict, Optional, Tuple

class OAuth2SecurityFixesTester:
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
        
    def test_token_revocation_enforcement(self) -> bool:
        """Test Fix 1: Token revocation enforcement"""
        print("🔒 Testing Token Revocation Enforcement...")
        
        # Get a valid token
        access_token = self.get_valid_token()
        if not access_token:
            self.log_test("Token Revocation Enforcement", False, "Could not obtain access token")
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
                self.log_test("Token Revocation Enforcement", False, f"Token validation failed: {userinfo_response.status_code}")
                return False
                
            print("   Step 2: Token is valid, got userinfo")
            
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
                self.log_test("Token Revocation Enforcement", False, f"Token revocation failed: {revoke_response.status_code}")
                return False
                
            print("   Step 4: Token revoked successfully")
            
            # Step 3: Verify token no longer works (THIS IS THE FIX)
            print("   Step 5: Verifying revoked token is rejected...")
            userinfo_response_after = self.session.get(
                f"{self.base_url}/api/v1/oauth2/userinfo",
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10
            )
            
            if userinfo_response_after.status_code == 401:
                print("   Step 6: ✅ FIXED - Revoked token correctly rejected")
                self.log_test("Token Revocation Enforcement", True, "Revoked tokens now properly rejected")
                return True
            else:
                print(f"   Step 6: ❌ STILL BROKEN - Revoked token accepted: {userinfo_response_after.status_code}")
                self.log_test("Token Revocation Enforcement", False, f"Revoked token not rejected: {userinfo_response_after.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Token Revocation Enforcement", False, f"Test error: {str(e)}")
            return False
            
    def test_pkce_verifier_requirement(self) -> bool:
        """Test Fix 2: PKCE verifier requirement validation"""
        print("🔐 Testing PKCE Verifier Requirement Validation...")
        
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
            
            print("   Step 1: Getting authorization code with PKCE challenge...")
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
                        print("   Step 2: Got authorization code with PKCE challenge")
                        
                        # Test: Try to exchange without code_verifier (THIS SHOULD FAIL NOW)
                        print("   Step 3: Testing token exchange WITHOUT code_verifier (should fail)...")
                        token_data_no_verifier = {
                            'grant_type': 'authorization_code',
                            'code': auth_code,
                            'redirect_uri': 'http://localhost:3000/callback',
                            'client_id': 'test_client',
                            'client_secret': 'test_secret'
                        }
                        
                        response = self.session.post(
                            f"{self.base_url}/api/v1/oauth2/token",
                            json=token_data_no_verifier,
                            headers={'Content-Type': 'application/json'},
                            timeout=10
                        )
                        
                        if response.status_code in [400, 401, 500]:
                            print("   Step 4: ✅ FIXED - Missing PKCE verifier correctly rejected")
                            self.log_test("PKCE Verifier Requirement", True, f"Missing verifier rejected: {response.status_code}")
                            return True
                        else:
                            print(f"   Step 4: ❌ STILL BROKEN - Missing verifier accepted: {response.status_code}")
                            self.log_test("PKCE Verifier Requirement", False, f"Missing verifier not rejected: {response.status_code}")
                            return False
                    else:
                        self.log_test("PKCE Verifier Requirement", False, "No auth code in PKCE response")
                        return False
                else:
                    self.log_test("PKCE Verifier Requirement", False, "No authorization URL in response")
                    return False
            else:
                self.log_test("PKCE Verifier Requirement", False, f"PKCE authorization failed: {auth_response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("PKCE Verifier Requirement", False, f"Test error: {str(e)}")
            return False
            
    def test_enhanced_scope_validation(self) -> bool:
        """Test Fix 3: Enhanced scope validation"""
        print("🎯 Testing Enhanced Scope Validation...")
        
        try:
            # Test 1: Valid scopes should work
            print("   Step 1: Testing valid scopes...")
            valid_params = {
                'response_type': 'code',
                'client_id': 'test_client',
                'redirect_uri': 'http://localhost:3000/callback',
                'scope': 'openid profile email',
                'state': secrets.token_urlsafe(16)
            }
            
            response = self.session.get(
                f"{self.base_url}/api/v1/oauth2/authorize",
                params=valid_params,
                allow_redirects=False,
                timeout=10
            )
            
            if response.status_code != 200:
                self.log_test("Enhanced Scope Validation", False, f"Valid scopes rejected: {response.status_code}")
                return False
                
            print("   Step 2: Valid scopes accepted ✅")
            
            # Test 2: Invalid scope should be rejected (THIS IS THE FIX)
            print("   Step 3: Testing invalid scope (should be rejected)...")
            invalid_params = {
                'response_type': 'code',
                'client_id': 'test_client',
                'redirect_uri': 'http://localhost:3000/callback',
                'scope': 'invalid_scope_12345',
                'state': secrets.token_urlsafe(16)
            }
            
            response = self.session.get(
                f"{self.base_url}/api/v1/oauth2/authorize",
                params=invalid_params,
                allow_redirects=False,
                timeout=10
            )
            
            if response.status_code in [400, 401]:
                print("   Step 4: ✅ FIXED - Invalid scope correctly rejected")
                
                # Test 3: Invalid scope format should be rejected
                print("   Step 5: Testing invalid scope format...")
                format_params = {
                    'response_type': 'code',
                    'client_id': 'test_client',
                    'redirect_uri': 'http://localhost:3000/callback',
                    'scope': 'invalid scope with spaces!@#',
                    'state': secrets.token_urlsafe(16)
                }
                
                response2 = self.session.get(
                    f"{self.base_url}/api/v1/oauth2/authorize",
                    params=format_params,
                    allow_redirects=False,
                    timeout=10
                )
                
                if response2.status_code in [400, 401]:
                    print("   Step 6: ✅ FIXED - Invalid scope format correctly rejected")
                    self.log_test("Enhanced Scope Validation", True, "Scope validation working correctly")
                    return True
                else:
                    print(f"   Step 6: ⚠️ PARTIAL - Invalid format accepted: {response2.status_code}")
                    self.log_test("Enhanced Scope Validation", False, f"Invalid format not rejected: {response2.status_code}")
                    return False
            else:
                print(f"   Step 4: ❌ STILL BROKEN - Invalid scope accepted: {response.status_code}")
                self.log_test("Enhanced Scope Validation", False, f"Invalid scope not rejected: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Enhanced Scope Validation", False, f"Test error: {str(e)}")
            return False
            
    def run_security_fixes_tests(self):
        """Run all security fixes validation tests"""
        print("🔒 Testing OAuth2 Security Fixes")
        print("=" * 60)
        print("Testing the three specific security improvements:")
        print("1. Token Revocation Enforcement")
        print("2. PKCE Verifier Requirement Validation") 
        print("3. Enhanced Scope Validation")
        print("=" * 60)
        
        # Test 1: Token Revocation Enforcement
        fix1_passed = self.test_token_revocation_enforcement()
        
        # Test 2: PKCE Verifier Requirement
        fix2_passed = self.test_pkce_verifier_requirement()
        
        # Test 3: Enhanced Scope Validation
        fix3_passed = self.test_enhanced_scope_validation()
        
        # Summary
        self.print_summary()
        
        return fix1_passed and fix2_passed and fix3_passed
        
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 OAuth2 Security Fixes Validation Summary")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results.values() if result['success'])
        total = len(self.test_results)
        
        print(f"Total Security Fixes Tested: {total}")
        print(f"Fixes Working: {passed}")
        print(f"Fixes Still Broken: {total - passed}")
        print(f"Success Rate: {passed/total*100:.1f}%" if total > 0 else "No tests run")
        
        if total - passed > 0:
            print("\n❌ Fixes Still Needed:")
            for name, result in self.test_results.items():
                if not result['success']:
                    print(f"  - {name}: {result['details']}")
                    
        if passed > 0:
            print("\n✅ Fixes Working:")
            for name, result in self.test_results.items():
                if result['success']:
                    print(f"  - {name}: {result['details']}")
                    
        print("\n🎯 Security Status:")
        
        # Check each fix
        token_revocation = self.test_results.get("Token Revocation Enforcement", {}).get("success", False)
        pkce_requirement = self.test_results.get("PKCE Verifier Requirement", {}).get("success", False)
        scope_validation = self.test_results.get("Enhanced Scope Validation", {}).get("success", False)
        
        if token_revocation:
            print("  ✅ Token Revocation: FIXED - Revoked tokens properly rejected")
        else:
            print("  ❌ Token Revocation: BROKEN - Revoked tokens still accepted")
            
        if pkce_requirement:
            print("  ✅ PKCE Enforcement: FIXED - Missing verifier properly rejected")
        else:
            print("  ❌ PKCE Enforcement: BROKEN - Missing verifier still accepted")
            
        if scope_validation:
            print("  ✅ Scope Validation: FIXED - Invalid scopes properly rejected")
        else:
            print("  ❌ Scope Validation: BROKEN - Invalid scopes still accepted")
            
        if all([token_revocation, pkce_requirement, scope_validation]):
            print("\n🎉 ALL SECURITY FIXES WORKING! OAuth2 security is now robust!")
        else:
            print(f"\n⚠️  {passed}/{total} security fixes working. Continue with remaining issues.")
            
        print("\n" + "=" * 60)

if __name__ == "__main__":
    print("⏳ Waiting for OAuth2 server to be ready...")
    time.sleep(5)
    
    tester = OAuth2SecurityFixesTester()
    all_fixed = tester.run_security_fixes_tests()
    
    if all_fixed:
        print("\n🚀 SUCCESS: All OAuth2 security fixes validated!")
    else:
        print("\n⚠️  Some security fixes may need additional work.")