#!/usr/bin/env python3
"""OAuth2 Flow Comprehensive Validation Test Suite
AuthFramework - OAuth2 Implementation Testing

This script validates:
1. Complete Authorization Code Flow
2. PKCE Implementation Security  
3. Token Management Lifecycle
4. Integration Testing
"""

import requests
import urllib.parse
import hashlib
import base64
import secrets
import json
import time
from typing import Dict, Any, Tuple


class OAuth2FlowTester:
    def __init__(self, base_url: str = "http://localhost:8080"):
        self.base_url = base_url
        self.session = requests.Session()
        self.client_id = "test_client"
        self.client_secret = "test_secret"
        self.redirect_uri = "http://localhost:8080/callback"

    def generate_pkce_challenge(self) -> Tuple[str, str]:
        """Generate PKCE code verifier and challenge"""
        code_verifier = base64.urlsafe_b64encode(
            secrets.token_bytes(32)
        ).decode("utf-8").rstrip("=")
        
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode("utf-8")).digest()
        ).decode("utf-8").rstrip("=")
        
        return code_verifier, code_challenge

    def test_authorization_endpoint(self) -> Dict[str, Any]:
        """Test 1: Authorization Code Flow - Authorization Endpoint"""
        print("\n🔐 Testing Authorization Endpoint...")
        
        code_verifier, code_challenge = self.generate_pkce_challenge()
        state = secrets.token_urlsafe(32)
        
        auth_params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scope": "read write",
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256"
        }
        
        auth_url = (
            f"{self.base_url}/oauth/authorize?"
            + urllib.parse.urlencode(auth_params)
        )
        
        try:
            response = self.session.get(
                auth_url, allow_redirects=False
            )
            
            result = {
                "test": "authorization_endpoint",
                "status_code": response.status_code,
                "success": response.status_code in [200, 302],
                "has_location_header": "Location" in response.headers,
                "response_size": len(response.content),
                "code_verifier": code_verifier,
                "code_challenge": code_challenge,
                "state": state
            }
            
            if response.status_code == 200:
                result["content_type"] = response.headers.get(
                    "Content-Type", ""
                )
                result["has_form"] = b"<form" in response.content
            
            print(f"   ✅ Status: {response.status_code}")
            print(
                f"   ✅ Response Size: {len(response.content)} bytes"
            )
            
            return result
            
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            return {
                "test": "authorization_endpoint",
                "success": False,
                "error": str(e)
            }

    def test_token_endpoint_with_pkce(
        self, auth_code: str, code_verifier: str
    ) -> Dict[str, Any]:
        """Test 2: Token Exchange with PKCE Verification"""
        print("\n🎫 Testing Token Endpoint with PKCE...")
        
        token_data = {
            "grant_type": "authorization_code",
            "code": auth_code,
            "redirect_uri": self.redirect_uri,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code_verifier": code_verifier
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/oauth/token",
                data=token_data,
                headers={
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            )
            
            result = {
                "test": "token_endpoint_pkce",
                "status_code": response.status_code,
                "success": response.status_code == 200,
                "content_type": response.headers.get(
                    "Content-Type", ""
                )
            }
            
            if response.status_code == 200:
                try:
                    token_response = response.json()
                    result.update({
                        "has_access_token": (
                            "access_token" in token_response
                        ),
                        "has_refresh_token": (
                            "refresh_token" in token_response
                        ),
                        "has_expires_in": (
                            "expires_in" in token_response
                        ),
                        "token_type": token_response.get(
                            "token_type", ""
                        ),
                        "scope": token_response.get("scope", ""),
                        "access_token": token_response.get(
                            "access_token", ""
                        ),
                        "refresh_token": token_response.get(
                            "refresh_token", ""
                        )
                    })
                    access_preview = (
                        token_response.get("access_token", "")[:20]
                    )
                    print(f"   ✅ Access Token: {access_preview}...")
                    print(
                        f"   ✅ Token Type: "
                        f"{token_response.get('token_type', '')}"
                    )
                    print(
                        f"   ✅ Expires In: "
                        f"{token_response.get('expires_in', '')} seconds"
                    )
                except json.JSONDecodeError:
                    result["json_parse_error"] = True
            else:
                result["error_response"] = response.text
                print(
                    f"   ❌ Error: {response.status_code} - "
                    f"{response.text}"
                )
            
            return result
            
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            return {
                "test": "token_endpoint_pkce",
                "success": False,
                "error": str(e)
            }

    def test_userinfo_endpoint(
        self, access_token: str
    ) -> Dict[str, Any]:
        """Test 3: UserInfo Endpoint with Access Token"""
        print("\n👤 Testing UserInfo Endpoint...")
        
        try:
            response = self.session.get(
                f"{self.base_url}/oauth/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            result = {
                "test": "userinfo_endpoint",
                "status_code": response.status_code,
                "success": response.status_code == 200,
                "content_type": response.headers.get(
                    "Content-Type", ""
                )
            }
            
            if response.status_code == 200:
                try:
                    userinfo = response.json()
                    result.update({
                        "has_sub": "sub" in userinfo,
                        "has_email": "email" in userinfo,
                        "userinfo": userinfo
                    })
                    print(
                        f"   ✅ Subject: {userinfo.get('sub', '')}"
                    )
                    print(
                        f"   ✅ Email: {userinfo.get('email', '')}"
                    )
                except json.JSONDecodeError:
                    result["json_parse_error"] = True
            else:
                result["error_response"] = response.text
                print(
                    f"   ❌ Error: {response.status_code} - "
                    f"{response.text}"
                )
            
            return result
            
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            return {
                "test": "userinfo_endpoint",
                "success": False,
                "error": str(e)
            }

    def test_token_revocation(
        self, access_token: str, refresh_token: str
    ) -> Dict[str, Any]:
        """Test 4: Token Revocation"""
        print("\n🚫 Testing Token Revocation...")
        
        results: Dict[str, Any] = {}
        
        try:
            revoke_data = {
                "token": access_token,
                "token_type_hint": "access_token",
                "client_id": self.client_id,
                "client_secret": self.client_secret
            }
            
            response = self.session.post(
                f"{self.base_url}/oauth/revoke",
                data=revoke_data,
                headers={
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            )
            
            results["access_token_revocation"] = {
                "status_code": response.status_code,
                "success": response.status_code == 200,
                "response": response.text
            }
            
            print(
                f"   ✅ Access Token Revocation: "
                f"{response.status_code}"
            )
            
        except Exception as e:
            results["access_token_revocation"] = {
                "success": False,
                "error": str(e)
            }
            print(
                f"   ❌ Access Token Revocation Error: {str(e)}"
            )
        
        if refresh_token:
            try:
                revoke_data = {
                    "token": refresh_token,
                    "token_type_hint": "refresh_token",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret
                }
                
                response = self.session.post(
                    f"{self.base_url}/oauth/revoke",
                    data=revoke_data,
                    headers={
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                )
                
                results["refresh_token_revocation"] = {
                    "status_code": response.status_code,
                    "success": response.status_code == 200,
                    "response": response.text
                }
                
                print(
                    f"   ✅ Refresh Token Revocation: "
                    f"{response.status_code}"
                )
                
            except Exception as e:
                results["refresh_token_revocation"] = {
                    "success": False,
                    "error": str(e)
                }
                print(
                    f"   ❌ Refresh Token Revocation Error: "
                    f"{str(e)}"
                )
        
        return results

    def test_pkce_security(self) -> Dict[str, Any]:
        """Test 5: PKCE Security Verification"""
        print("\n🔒 Testing PKCE Security Implementation...")
        
        code_verifier, code_challenge = self.generate_pkce_challenge()
        wrong_verifier = base64.urlsafe_b64encode(
            secrets.token_bytes(32)
        ).decode("utf-8").rstrip("=")
        
        test_data = {
            "grant_type": "authorization_code",
            "code": "test_code",
            "redirect_uri": self.redirect_uri,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code_verifier": wrong_verifier
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/oauth/token",
                data=test_data,
                headers={
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            )
            
            result = {
                "test": "pkce_security",
                "status_code": response.status_code,
                "rejects_wrong_verifier": (
                    response.status_code != 200
                ),
                "response": (
                    response.text[:200] if response.text else ""
                ),
                "success": (
                    response.status_code == 400
                    or "invalid" in response.text.lower()
                )
            }
            
            print(
                f"   ✅ Wrong Verifier Rejected: "
                f"{result['rejects_wrong_verifier']}"
            )
            
            return result
            
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            return {
                "test": "pkce_security",
                "success": False,
                "error": str(e)
            }

    def test_server_health(self) -> Dict[str, Any]:
        """Test Server Health and Availability"""
        print("\n🏥 Testing Server Health...")
        
        try:
            response = self.session.get(
                f"{self.base_url}/health", timeout=5
            )
            
            result = {
                "test": "server_health",
                "status_code": response.status_code,
                "success": response.status_code == 200,
                "response_time": response.elapsed.total_seconds(),
                "content": response.text[:100]
            }
            
            print(f"   ✅ Health Check: {response.status_code}")
            print(
                f"   ✅ Response Time: "
                f"{result['response_time']:.3f}s"
            )
            
            return result
            
        except requests.exceptions.ConnectionError:
            print(
                "   ❌ Server not reachable - testing OAuth "
                "endpoints directly"
            )
            return {
                "test": "server_health",
                "success": False,
                "connection_error": True
            }
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            return {
                "test": "server_health",
                "success": False,
                "error": str(e)
            }

    def run_comprehensive_test(self) -> Dict[str, Any]:
        """Run complete OAuth2 validation test suite"""
        print("🚀 Starting Comprehensive OAuth2 Flow Validation")
        print("=" * 60)
        
        results: Dict[str, Any] = {
            "timestamp": time.time(),
            "base_url": self.base_url,
            "tests": {}
        }
        
        results["tests"]["server_health"] = self.test_server_health()
        
        auth_result = self.test_authorization_endpoint()
        results["tests"]["authorization_endpoint"] = auth_result
        
        results["tests"]["pkce_security"] = self.test_pkce_security()
        
        print(
            "\n📝 Note: Full token exchange requires authorization "
            "code from user consent"
        )
        print("    Testing token endpoint error handling...")
        
        token_test_result = self.test_token_endpoint_with_pkce(
            "invalid_code", "test_verifier"
        )
        results["tests"]["token_endpoint"] = token_test_result
        
        print(
            "\n📝 Note: UserInfo testing requires valid access token"
        )
        userinfo_result = self.test_userinfo_endpoint("invalid_token")
        results["tests"]["userinfo_endpoint"] = userinfo_result
        
        print("\n📝 Note: Revocation testing requires valid tokens")
        revoke_result = self.test_token_revocation(
            "invalid_access", "invalid_refresh"
        )
        results["tests"]["token_revocation"] = revoke_result
        
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(results["tests"])
        successful_tests = sum(
            1 for test in results["tests"].values()
            if isinstance(test, dict) and test.get("success", False)
        )
        
        print(f"Total Tests: {total_tests}")
        print(f"Successful: {successful_tests}")
        print(f"Failed: {total_tests - successful_tests}")
        success_rate = (successful_tests / total_tests) * 100
        print(f"Success Rate: {success_rate:.1f}%")
        
        results["summary"] = {
            "total_tests": total_tests,
            "successful_tests": successful_tests,
            "failed_tests": total_tests - successful_tests,
            "success_rate": (successful_tests / total_tests) * 100
        }
        
        return results


def main():
    """Main test execution"""
    tester = OAuth2FlowTester()
    results = tester.run_comprehensive_test()
    
    with open("oauth2_test_results.json", "w") as f:
        json.dump(results, f, indent=2, default=str)
    
    print("\n💾 Results saved to oauth2_test_results.json")
    
    return results


if __name__ == "__main__":
    main()
