import requests
import sys
import json
from datetime import datetime

class LeadHunterAPITester:
    def __init__(self, base_url="https://saas-demo-builder.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=30)

            success = response.status_code == expected_status
            
            result = {
                'name': name,
                'success': success,
                'expected_status': expected_status,
                'actual_status': response.status_code,
                'response': None,
                'error': None
            }

            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    result['response'] = response.json()
                    if result['response']:
                        print(f"   Response: {json.dumps(result['response'], indent=2)[:200]}...")
                except:
                    result['response'] = response.text[:200]
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    result['error'] = error_detail
                    print(f"   Error: {error_detail}")
                except:
                    result['error'] = response.text
                    print(f"   Error: {response.text[:200]}")

            self.test_results.append(result)
            return success, result['response'] if success else result['error']

        except Exception as e:
            print(f"❌ Failed - Exception: {str(e)}")
            result = {
                'name': name,
                'success': False,
                'expected_status': expected_status,
                'actual_status': 'Exception',
                'response': None,
                'error': str(e)
            }
            self.test_results.append(result)
            return False, str(e)

    def test_health_check(self):
        """Test API health check"""
        return self.run_test("Health Check", "GET", "api/", 200)

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        return self.run_test("Dashboard Stats", "GET", "api/stats/dashboard", 200)

    def test_get_leads(self):
        """Test get leads (should be empty initially)"""
        return self.run_test("Get All Leads", "GET", "api/leads", 200)

    def test_get_leads_filtered(self):
        """Test get leads with status filter"""
        return self.run_test("Get Leads by Status", "GET", "api/leads", 200, params={"status": "nuovo_lead"})

    def test_get_demos(self):
        """Test get demo sites (should be empty initially)"""
        return self.run_test("Get Demo Sites", "GET", "api/demos", 200)

    def test_search_companies_no_api_key(self):
        """Test company search without Google Maps API key (should fail with descriptive error)"""
        search_data = {
            "city": "Milano",
            "country": "IT",
            "category": "ristorante",
            "min_reviews": 10,
            "min_rating": 4.0
        }
        return self.run_test("Search Companies (No API Key)", "POST", "api/search/companies", 400, data=search_data)

    def test_generate_demo_invalid_lead(self):
        """Test demo generation with invalid lead ID"""
        demo_data = {"lead_id": "invalid-lead-id"}
        return self.run_test("Generate Demo (Invalid Lead)", "POST", "api/demo/generate", 404, data=demo_data)

    def test_update_lead_status_invalid(self):
        """Test updating lead status for non-existent lead"""
        return self.run_test("Update Lead Status (Invalid)", "PATCH", "api/leads/invalid-id/status?status=contattato", 404)

    def test_generate_email_invalid_lead(self):
        """Test email generation with invalid lead ID"""
        return self.run_test("Generate Email (Invalid Lead)", "POST", "api/email/generate?lead_id=invalid&demo_url=https://test.com", 404)

    def test_send_email_no_api_key(self):
        """Test email sending without Resend API key"""
        email_data = {
            "recipient_email": "test@example.com",
            "subject": "Test Subject",
            "html_content": "<p>Test content</p>"
        }
        return self.run_test("Send Email (No API Key)", "POST", "api/email/send", 400, data=email_data)

    def print_summary(self):
        """Print test summary"""
        print(f"\n{'='*60}")
        print(f"📊 TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        print(f"\n🔍 DETAILED RESULTS:")
        for result in self.test_results:
            status = "✅ PASS" if result['success'] else "❌ FAIL"
            print(f"{status} {result['name']} - {result['actual_status']}")
            if not result['success'] and result['error']:
                print(f"     Error: {result['error']}")

        # Check specific expectations
        print(f"\n🎯 EXPECTED BEHAVIORS:")
        
        # Check if Google Maps API error is descriptive
        search_test = next((r for r in self.test_results if r['name'] == "Search Companies (No API Key)"), None)
        if search_test and search_test['success']:
            if search_test['error'] and 'Google Maps API key non configurata' in str(search_test['error']):
                print("✅ Google Maps API error message is descriptive")
            else:
                print("❌ Google Maps API error message not descriptive enough")
        
        # Check if Resend API error is descriptive  
        email_test = next((r for r in self.test_results if r['name'] == "Send Email (No API Key)"), None)
        if email_test and email_test['success']:
            if email_test['error'] and 'Resend API key non configurata' in str(email_test['error']):
                print("✅ Resend API error message is descriptive")
            else:
                print("❌ Resend API error message not descriptive enough")

        # Check if dashboard stats returns proper structure
        stats_test = next((r for r in self.test_results if r['name'] == "Dashboard Stats"), None)
        if stats_test and stats_test['success'] and stats_test['response']:
            expected_keys = ['total_leads', 'demos_created', 'contacted', 'clients_acquired', 'new_leads']
            if all(key in stats_test['response'] for key in expected_keys):
                print("✅ Dashboard stats has correct structure")
            else:
                print("❌ Dashboard stats missing required fields")

def main():
    print("🚀 Starting LeadHunter Pro API Tests")
    print("="*60)
    
    tester = LeadHunterAPITester()
    
    # Run all tests
    tester.test_health_check()
    tester.test_dashboard_stats()
    tester.test_get_leads()
    tester.test_get_leads_filtered()
    tester.test_get_demos()
    tester.test_search_companies_no_api_key()
    tester.test_generate_demo_invalid_lead()
    tester.test_update_lead_status_invalid()
    tester.test_generate_email_invalid_lead()
    tester.test_send_email_no_api_key()
    
    # Print summary
    tester.print_summary()
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())