import requests
import sys
import json
from datetime import datetime, timezone
import time

class DreamWiseAPITester:
    def __init__(self, base_url="https://dreamscape-66.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.test_dream_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_result(self, test_name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            self.failed_tests.append({"test": test_name, "details": details})
            print(f"❌ {test_name} - FAILED: {details}")

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}

            return success, response.status_code, response_data

        except Exception as e:
            return False, 0, {"error": str(e)}

    def test_user_signup(self):
        """Test user registration"""
        timestamp = int(time.time())
        test_data = {
            "email": f"test_user_{timestamp}@dreamwise.com",
            "password": "TestPassword123!",
            "name": f"Test User {timestamp}"
        }
        
        success, status, response = self.make_request('POST', 'auth/signup', test_data, 200)
        
        if success and 'token' in response and 'user' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            self.test_email = test_data['email']
            self.test_password = test_data['password']
            self.log_result("User Signup", True)
            return True
        else:
            self.log_result("User Signup", False, f"Status: {status}, Response: {response}")
            return False

    def test_user_login(self):
        """Test user login with created account"""
        if not hasattr(self, 'test_email'):
            self.log_result("User Login", False, "No test user created")
            return False
            
        login_data = {
            "email": self.test_email,
            "password": self.test_password
        }
        
        success, status, response = self.make_request('POST', 'auth/login', login_data, 200)
        
        if success and 'token' in response:
            self.token = response['token']  # Update token
            self.log_result("User Login", True)
            return True
        else:
            self.log_result("User Login", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_user_profile(self):
        """Test getting current user profile"""
        success, status, response = self.make_request('GET', 'auth/me', expected_status=200)
        
        if success and 'id' in response and 'email' in response:
            self.log_result("Get User Profile", True)
            return True
        else:
            self.log_result("Get User Profile", False, f"Status: {status}, Response: {response}")
            return False

    def test_create_dream(self):
        """Test creating a new dream"""
        dream_data = {
            "title": "Test Dream - Flying Over Mountains",
            "content": "I was soaring above snow-capped mountains, feeling completely free and weightless. The sky was painted in ethereal purples and mint greens, just like a surreal painting.",
            "date": datetime.now(timezone.utc).isoformat(),
            "tags": ["flying", "peaceful", "vivid"]
        }
        
        success, status, response = self.make_request('POST', 'dreams', dream_data, 200)
        
        if success and 'id' in response:
            self.test_dream_id = response['id']
            self.log_result("Create Dream", True)
            return True
        else:
            self.log_result("Create Dream", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_dreams(self):
        """Test retrieving user's dreams"""
        success, status, response = self.make_request('GET', 'dreams', expected_status=200)
        
        if success and isinstance(response, list):
            self.log_result("Get Dreams", True)
            return True
        else:
            self.log_result("Get Dreams", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_dream_by_id(self):
        """Test retrieving specific dream"""
        if not self.test_dream_id:
            self.log_result("Get Dream by ID", False, "No test dream created")
            return False
            
        success, status, response = self.make_request('GET', f'dreams/{self.test_dream_id}', expected_status=200)
        
        if success and 'id' in response and response['id'] == self.test_dream_id:
            self.log_result("Get Dream by ID", True)
            return True
        else:
            self.log_result("Get Dream by ID", False, f"Status: {status}, Response: {response}")
            return False

    def test_search_dreams(self):
        """Test dream search functionality"""
        success, status, response = self.make_request('GET', 'dreams?search=flying', expected_status=200)
        
        if success and isinstance(response, list):
            self.log_result("Search Dreams", True)
            return True
        else:
            self.log_result("Search Dreams", False, f"Status: {status}, Response: {response}")
            return False

    def test_filter_dreams_by_tags(self):
        """Test filtering dreams by tags"""
        success, status, response = self.make_request('GET', 'dreams?tags=flying,peaceful', expected_status=200)
        
        if success and isinstance(response, list):
            self.log_result("Filter Dreams by Tags", True)
            return True
        else:
            self.log_result("Filter Dreams by Tags", False, f"Status: {status}, Response: {response}")
            return False

    def test_update_dream(self):
        """Test updating dream content"""
        if not self.test_dream_id:
            self.log_result("Update Dream", False, "No test dream created")
            return False
            
        update_data = {
            "title": "Updated Test Dream - Flying Over Mountains",
            "human_analysis": "This dream represents my desire for freedom and escape from daily constraints."
        }
        
        success, status, response = self.make_request('PATCH', f'dreams/{self.test_dream_id}', update_data, 200)
        
        if success and 'id' in response:
            self.log_result("Update Dream", True)
            return True
        else:
            self.log_result("Update Dream", False, f"Status: {status}, Response: {response}")
            return False

    def test_ai_analysis(self):
        """Test AI dream analysis"""
        if not self.test_dream_id:
            self.log_result("AI Analysis", False, "No test dream created")
            return False
            
        print("🔍 Testing AI Analysis (this may take a few seconds)...")
        success, status, response = self.make_request('POST', f'dreams/{self.test_dream_id}/analyze', {}, 200)
        
        if success and 'analysis' in response:
            self.log_result("AI Analysis", True)
            return True
        else:
            self.log_result("AI Analysis", False, f"Status: {status}, Response: {response}")
            return False

    def test_dream_statistics(self):
        """Test dream statistics endpoint"""
        success, status, response = self.make_request('GET', 'dreams/stats/overview', expected_status=200)
        
        expected_fields = ['total_dreams', 'dreams_this_week', 'dreams_this_month', 'most_common_tags', 'recent_dreams']
        
        if success and all(field in response for field in expected_fields):
            self.log_result("Dream Statistics", True)
            return True
        else:
            self.log_result("Dream Statistics", False, f"Status: {status}, Response: {response}")
            return False

    def test_delete_dream(self):
        """Test deleting a dream"""
        if not self.test_dream_id:
            self.log_result("Delete Dream", False, "No test dream created")
            return False
            
        success, status, response = self.make_request('DELETE', f'dreams/{self.test_dream_id}', expected_status=200)
        
        if success:
            self.log_result("Delete Dream", True)
            return True
        else:
            self.log_result("Delete Dream", False, f"Status: {status}, Response: {response}")
            return False

    def run_all_tests(self):
        """Run complete test suite"""
        print("🌙 Starting DreamWise API Testing...")
        print(f"🔗 Testing against: {self.base_url}")
        print("=" * 50)
        
        # Authentication Tests
        if not self.test_user_signup():
            print("❌ Cannot proceed without user signup")
            return False
            
        if not self.test_user_login():
            print("❌ Cannot proceed without user login")
            return False
            
        self.test_get_user_profile()
        
        # Dream Management Tests
        self.test_create_dream()
        self.test_get_dreams()
        self.test_get_dream_by_id()
        self.test_search_dreams()
        self.test_filter_dreams_by_tags()
        self.test_update_dream()
        
        # AI and Statistics Tests
        self.test_ai_analysis()
        self.test_dream_statistics()
        
        # Cleanup
        self.test_delete_dream()
        
        # Print Summary
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for failure in self.failed_tests:
                print(f"  - {failure['test']}: {failure['details']}")
        
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"✨ Success Rate: {success_rate:.1f}%")
        
        return success_rate >= 80  # Consider 80%+ as passing

def main():
    tester = DreamWiseAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())