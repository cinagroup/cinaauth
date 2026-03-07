#!/usr/bin/env python3
"""
Simple OAuth2 Server Connectivity Test
Check if the OAuth2 test server is responding to requests
"""

import requests
import sys
import time

def test_server_connectivity(base_url="http://127.0.0.1:8080", max_retries=5):
    """Test basic server connectivity"""
    print(f"🔍 Testing server connectivity at {base_url}")
    
    endpoints_to_test = [
        ("/health", "Health Check"),
        ("/api/v1/oauth2/authorize", "OAuth2 Authorization"),
        ("/api/v1/oauth2/token", "OAuth2 Token"),
        ("/api/v1/oauth2/revoke", "OAuth2 Revoke"),
        ("/api/v1/oauth2/userinfo", "OAuth2 UserInfo")
    ]
    
    for retry in range(max_retries):
        print(f"\n📡 Connection attempt {retry + 1}/{max_retries}")
        
        for endpoint, name in endpoints_to_test:
            url = f"{base_url}{endpoint}"
            try:
                # Use a short timeout
                response = requests.get(url, timeout=2)
                status = response.status_code
                
                if status == 200:
                    print(f"   ✅ {name}: {status} (OK)")
                elif status == 404:
                    print(f"   ❓ {name}: {status} (Not Found - endpoint may not exist)")
                elif status == 405:
                    print(f"   ⚠️  {name}: {status} (Method Not Allowed - server responding)")
                elif status in [400, 401, 403]:
                    print(f"   ⚠️  {name}: {status} (Client Error - server responding)")
                else:
                    print(f"   ❓ {name}: {status} (Unexpected)")
                    
            except requests.exceptions.ConnectionError:
                print(f"   ❌ {name}: Connection refused")
            except requests.exceptions.Timeout:
                print(f"   ⏰ {name}: Timeout")
            except Exception as e:
                print(f"   ❌ {name}: Error - {str(e)}")
        
        # If we got at least one successful response, server is running
        try:
            response = requests.get(f"{base_url}/health", timeout=2)
            if response.status_code < 500:  # Any response < 500 means server is up
                print(f"\n✅ Server is responding! Health check returned {response.status_code}")
                return True
        except:
            pass
        
        if retry < max_retries - 1:
            print(f"   ⏳ Waiting 2 seconds before retry...")
            time.sleep(2)
    
    print(f"\n❌ Server is not responding after {max_retries} attempts")
    return False

def test_basic_oauth2_endpoints():
    """Test OAuth2 endpoint availability"""
    print("\n🔐 Testing OAuth2 Endpoint Availability")
    
    base_url = "http://127.0.0.1:8080"
    
    # Test authorization endpoint with basic parameters
    auth_params = {
        'response_type': 'code',
        'client_id': 'test_client',
        'redirect_uri': 'http://localhost:8080/callback',
        'scope': 'read write',
        'state': 'test_state'
    }
    
    auth_url = f"{base_url}/api/v1/oauth2/authorize"
    
    try:
        response = requests.get(auth_url, params=auth_params, timeout=5)
        print(f"   📋 Authorization endpoint: {response.status_code}")
        if response.status_code == 200:
            print(f"      Content-Type: {response.headers.get('Content-Type', 'Unknown')}")
            print(f"      Response size: {len(response.content)} bytes")
        elif response.status_code == 404:
            print("      ❌ Endpoint not found - check server implementation")
        else:
            print(f"      Response: {response.text[:100]}...")
            
    except Exception as e:
        print(f"   ❌ Authorization endpoint error: {str(e)}")
    
    # Test token endpoint with invalid data (should return error)
    token_data = {
        'grant_type': 'authorization_code',
        'code': 'invalid_code',
        'client_id': 'test_client'
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/v1/oauth2/token",
            data=token_data,
            timeout=5,
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        print(f"   🎫 Token endpoint: {response.status_code}")
        if response.status_code in [400, 401]:
            print("      ✅ Properly rejecting invalid request")
        elif response.status_code == 404:
            print("      ❌ Endpoint not found - check server implementation")
        else:
            print(f"      Response: {response.text[:100]}...")
            
    except Exception as e:
        print(f"   ❌ Token endpoint error: {str(e)}")

if __name__ == "__main__":
    print("🚀 OAuth2 Server Connectivity Test")
    print("=" * 40)
    
    server_available = test_server_connectivity()
    
    if server_available:
        test_basic_oauth2_endpoints()
        print("\n✅ Basic connectivity test completed")
        sys.exit(0)
    else:
        print("\n❌ Server is not available - start the OAuth2 test server first")
        print("   Run: cargo run --bin oauth2_test_server --features api-server")
        sys.exit(1)