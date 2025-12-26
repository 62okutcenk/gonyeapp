#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class CraftForgeAPITester:
    def __init__(self, base_url="https://woodcraft-hub-12.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tenant_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details="", error=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {error}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "error": error,
            "timestamp": datetime.now().isoformat()
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                try:
                    response_data = response.json()
                    self.log_test(name, True, f"Status: {response.status_code}")
                    return True, response_data
                except:
                    self.log_test(name, True, f"Status: {response.status_code}, No JSON response")
                    return True, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"Status: {response.status_code}")
                except:
                    error_msg = f"Status: {response.status_code}"
                
                self.log_test(name, False, "", error_msg)
                return False, {}

        except Exception as e:
            self.log_test(name, False, "", str(e))
            return False, {}

    def test_user_registration(self):
        """Test user registration with tenant creation"""
        print("\n🔍 Testing User Registration...")
        
        # Generate unique test data
        timestamp = int(time.time())
        test_email = f"test_user_{timestamp}@example.com"
        test_tenant = f"Test Firma {timestamp}"
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": test_email,
                "password": "TestPass123!",
                "full_name": "Test User",
                "tenant_name": test_tenant
            }
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response['user']
            
            # Check if setup_completed is False for new user
            if not self.user_data.get('setup_completed', True):
                self.log_test("New User Setup Status", True, "setup_completed is False as expected")
            else:
                self.log_test("New User Setup Status", False, "", "setup_completed should be False for new users")
            
            return True
        
        return False

    def test_tenant_operations(self):
        """Test tenant CRUD operations with new fields"""
        print("\n🔍 Testing Tenant Operations...")
        
        # Get current tenant
        success, tenant = self.run_test(
            "Get Tenant Info",
            "GET",
            "tenant",
            200
        )
        
        if success:
            self.tenant_data = tenant
            
            # Test updating tenant with new fields
            update_data = {
                "name": tenant.get('name', 'Test Firma'),
                "city": "İstanbul",
                "district": "Kadıköy",
                "address": "Test Mahallesi, Test Sokak No:1",
                "contact_email": "iletisim@testfirma.com",
                "phone": "0 (212) 555 12 34",
                "tax_office": "Kadıköy Vergi Dairesi",
                "tax_number": "1234567890",
                "light_logo_url": None,
                "dark_logo_url": None
            }
            
            success, updated_tenant = self.run_test(
                "Update Tenant with New Fields",
                "PUT",
                "tenant",
                200,
                data=update_data
            )
            
            if success:
                # Verify new fields are saved
                expected_fields = ['city', 'district', 'address', 'contact_email', 'phone', 'tax_office', 'tax_number']
                all_fields_present = all(field in updated_tenant for field in expected_fields)
                
                if all_fields_present:
                    self.log_test("New Tenant Fields Saved", True, "All new fields present in response")
                else:
                    missing_fields = [f for f in expected_fields if f not in updated_tenant]
                    self.log_test("New Tenant Fields Saved", False, "", f"Missing fields: {missing_fields}")
            
            return success
        
        return False

    def test_setup_wizard_completion(self):
        """Test marking setup as completed"""
        print("\n🔍 Testing Setup Wizard Completion...")
        
        success, response = self.run_test(
            "Mark Setup Complete",
            "PUT",
            "tenant",
            200,
            data={"setup_completed": True}
        )
        
        if success:
            # Verify setup_completed is now True
            if response.get('setup_completed'):
                self.log_test("Setup Completion Status", True, "setup_completed is True")
            else:
                self.log_test("Setup Completion Status", False, "", "setup_completed should be True")
        
        return success

    def test_user_auth_flow(self):
        """Test user authentication flow after setup"""
        print("\n🔍 Testing User Auth Flow...")
        
        # Test /auth/me endpoint to check setup_completed status
        success, user_info = self.run_test(
            "Get Current User Info",
            "GET",
            "auth/me",
            200
        )
        
        if success:
            if user_info.get('setup_completed'):
                self.log_test("User Setup Status After Completion", True, "User shows setup_completed: true")
            else:
                self.log_test("User Setup Status After Completion", False, "", "User should show setup_completed: true")
        
        return success

    def test_groups_and_subtasks(self):
        """Test groups and subtasks (default ones should exist)"""
        print("\n🔍 Testing Groups and Subtasks...")
        
        # Get groups
        success, groups = self.run_test(
            "Get Groups",
            "GET",
            "groups",
            200
        )
        
        if success and isinstance(groups, list) and len(groups) > 0:
            self.log_test("Default Groups Created", True, f"Found {len(groups)} groups")
            
            # Test getting subtasks for first group
            first_group_id = groups[0]['id']
            success, subtasks = self.run_test(
                "Get Subtasks",
                "GET",
                f"subtasks?group_id={first_group_id}",
                200
            )
            
            if success and isinstance(subtasks, list):
                self.log_test("Get Subtasks for Group", True, f"Found {len(subtasks)} subtasks")
            else:
                self.log_test("Get Subtasks for Group", False, "", "Failed to get subtasks")
        else:
            self.log_test("Default Groups Created", False, "", "No default groups found")
        
        return success

    def test_work_items(self):
        """Test work items CRUD operations"""
        print("\n🔍 Testing Work Items...")
        
        # Create a work item
        success, work_item = self.run_test(
            "Create Work Item",
            "POST",
            "workitems",
            200,
            data={
                "name": "Test Mutfak Dolabı",
                "description": "Test iş kalemi açıklaması",
                "default_subtask_ids": []
            }
        )
        
        if success:
            work_item_id = work_item['id']
            
            # Get all work items
            success, work_items = self.run_test(
                "Get Work Items",
                "GET",
                "workitems",
                200
            )
            
            if success and isinstance(work_items, list):
                self.log_test("List Work Items", True, f"Found {len(work_items)} work items")
                
                # Update work item
                success, updated_item = self.run_test(
                    "Update Work Item",
                    "PUT",
                    f"workitems/{work_item_id}",
                    200,
                    data={
                        "name": "Updated Mutfak Dolabı",
                        "description": "Updated açıklama"
                    }
                )
                
                if success:
                    self.log_test("Update Work Item", True, "Work item updated successfully")
                
                # Delete work item
                success, _ = self.run_test(
                    "Delete Work Item",
                    "DELETE",
                    f"workitems/{work_item_id}",
                    200
                )
                
                if success:
                    self.log_test("Delete Work Item", True, "Work item deleted successfully")
        
        return success

    def test_roles_and_permissions(self):
        """Test roles and permissions"""
        print("\n🔍 Testing Roles and Permissions...")
        
        # Get permissions
        success, permissions = self.run_test(
            "Get Permissions",
            "GET",
            "permissions",
            200
        )
        
        if success and isinstance(permissions, list) and len(permissions) > 0:
            self.log_test("Default Permissions Created", True, f"Found {len(permissions)} permissions")
        else:
            self.log_test("Default Permissions Created", False, "", "No permissions found")
        
        # Get roles
        success, roles = self.run_test(
            "Get Roles",
            "GET",
            "roles",
            200
        )
        
        if success and isinstance(roles, list) and len(roles) > 0:
            self.log_test("Default Roles Created", True, f"Found {len(roles)} roles")
        else:
            self.log_test("Default Roles Created", False, "", "No roles found")
        
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        print("\n🔍 Testing Dashboard Stats...")
        
        success, stats = self.run_test(
            "Get Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        
        if success:
            expected_fields = ['total_projects', 'active_projects', 'completed_projects', 'total_tasks', 'completed_tasks', 'user_count']
            all_fields_present = all(field in stats for field in expected_fields)
            
            if all_fields_present:
                self.log_test("Dashboard Stats Fields", True, "All expected fields present")
            else:
                missing_fields = [f for f in expected_fields if f not in stats]
                self.log_test("Dashboard Stats Fields", False, "", f"Missing fields: {missing_fields}")
        
        return success

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting CraftForge API Tests...")
        print(f"Testing against: {self.base_url}")
        
        # Test sequence
        tests = [
            self.test_user_registration,
            self.test_tenant_operations,
            self.test_groups_and_subtasks,
            self.test_work_items,
            self.test_roles_and_permissions,
            self.test_setup_wizard_completion,
            self.test_user_auth_flow,
            self.test_dashboard_stats,
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                print(f"❌ Test failed with exception: {str(e)}")
                self.log_test(test.__name__, False, "", str(e))
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed / self.tests_run * 100):.1f}%" if self.tests_run > 0 else "0%")
        
        return {
            "tests_run": self.tests_run,
            "tests_passed": self.tests_passed,
            "tests_failed": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0,
            "test_results": self.test_results,
            "user_data": self.user_data,
            "tenant_data": self.tenant_data
        }

def main():
    tester = CraftForgeAPITester()
    results = tester.run_all_tests()
    
    # Return appropriate exit code
    if results["success_rate"] >= 80:
        return 0
    else:
        return 1

if __name__ == "__main__":
    sys.exit(main())