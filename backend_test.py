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

    def test_project_with_areas(self):
        """Test new project creation with multiple areas"""
        print("\n🔍 Testing Project with Areas (NEW FEATURE)...")
        
        # First ensure we have work items
        success, work_items = self.run_test(
            "Get Work Items for Project",
            "GET",
            "workitems",
            200
        )
        
        if not success or not work_items:
            # Create test work items
            for item_name in ["Mutfak Dolabı", "Gardrop"]:
                self.run_test(
                    f"Create Work Item: {item_name}",
                    "POST",
                    "workitems",
                    200,
                    data={
                        "name": item_name,
                        "description": f"Test {item_name} açıklaması",
                        "default_subtask_ids": []
                    }
                )
            
            # Get work items again
            success, work_items = self.run_test(
                "Get Work Items After Creation",
                "GET",
                "workitems",
                200
            )
        
        if success and work_items and len(work_items) >= 2:
            # Create project with multiple areas
            project_data = {
                "name": "Test Proje - Mutfak ve Gardrop",
                "description": "Test projesi açıklaması",
                "customer_name": "Ahmet Yılmaz",
                "customer_phone": "0 (555) 123 45 67",
                "customer_email": "ahmet@example.com",
                "due_date": "2024-12-31",
                "areas": [
                    {
                        "name": "Mutfak",
                        "address": "Mutfak adresi",
                        "city": "İstanbul",
                        "district": "Kadıköy",
                        "work_items": [
                            {
                                "work_item_id": work_items[0]["id"],
                                "work_item_name": work_items[0]["name"],
                                "quantity": 1,
                                "notes": "Mutfak için özel not"
                            }
                        ],
                        "agreed_price": 15000.0,
                        "status": "planlandi"
                    },
                    {
                        "name": "Gardrop",
                        "address": "Yatak odası",
                        "city": "İstanbul", 
                        "district": "Kadıköy",
                        "work_items": [
                            {
                                "work_item_id": work_items[1]["id"] if len(work_items) > 1 else work_items[0]["id"],
                                "work_item_name": work_items[1]["name"] if len(work_items) > 1 else work_items[0]["name"],
                                "quantity": 2,
                                "notes": "Gardrop için özel not"
                            }
                        ],
                        "agreed_price": 25000.0,
                        "status": "planlandi"
                    }
                ],
                "assigned_users": []
            }
            
            success, project = self.run_test(
                "Create Project with Multiple Areas",
                "POST",
                "projects",
                200,
                data=project_data
            )
            
            if success and project:
                project_id = project["id"]
                self.project_id = project_id  # Store for other tests
                
                # Verify project structure
                if "areas" in project and len(project["areas"]) == 2:
                    self.log_test("Project Areas Created", True, f"Created {len(project['areas'])} areas")
                    
                    # Verify finance calculation
                    expected_total = 40000.0  # 15000 + 25000
                    actual_total = project.get("finance", {}).get("total_agreed", 0)
                    if abs(actual_total - expected_total) < 0.01:
                        self.log_test("Project Finance Calculation", True, f"Total: {actual_total}")
                    else:
                        self.log_test("Project Finance Calculation", False, "", f"Expected {expected_total}, got {actual_total}")
                else:
                    self.log_test("Project Areas Created", False, "", "Areas not created properly")
                
                return True
        
        self.log_test("Project with Areas Test", False, "", "Insufficient work items or creation failed")
        return False

    def test_project_payments(self):
        """Test project payment functionality"""
        print("\n🔍 Testing Project Payments...")
        
        if not hasattr(self, 'project_id'):
            self.log_test("Project Payments Test", False, "", "No project available for testing")
            return False
        
        # Get project details to get area IDs
        success, project = self.run_test(
            "Get Project for Payment Test",
            "GET",
            f"projects/{self.project_id}",
            200
        )
        
        if success and project.get("areas"):
            area_id = project["areas"][0]["id"]
            
            # Add payment
            payment_data = {
                "area_id": area_id,
                "amount": 5000.0,
                "payment_date": "2024-01-15",
                "payment_method": "nakit",
                "notes": "İlk tahsilat"
            }
            
            success, payment = self.run_test(
                "Add Project Payment",
                "POST",
                f"projects/{self.project_id}/payments",
                200,
                data=payment_data
            )
            
            if success:
                # Get payments list
                success, payments = self.run_test(
                    "Get Project Payments",
                    "GET",
                    f"projects/{self.project_id}/payments",
                    200
                )
                
                if success and payments and len(payments) > 0:
                    self.log_test("Project Payments List", True, f"Found {len(payments)} payments")
                    
                    # Test payment deletion
                    payment_id = payments[0]["id"]
                    success, _ = self.run_test(
                        "Delete Project Payment",
                        "DELETE",
                        f"projects/{self.project_id}/payments/{payment_id}",
                        200
                    )
                    
                    if success:
                        self.log_test("Delete Project Payment", True, "Payment deleted successfully")
                    
                    return True
        
        return False

    def test_project_assignments(self):
        """Test project staff assignment functionality"""
        print("\n🔍 Testing Project Assignments...")
        
        if not hasattr(self, 'project_id'):
            self.log_test("Project Assignments Test", False, "", "No project available for testing")
            return False
        
        # Get users for assignment
        success, users = self.run_test(
            "Get Users for Assignment",
            "GET",
            "users",
            200
        )
        
        if success and users and len(users) > 0:
            user_id = users[0]["id"]
            
            # Test project-level assignment
            assignment_data = {
                "user_id": user_id,
                "assignment_type": "project",
                "area_id": None
            }
            
            success, assignment = self.run_test(
                "Create Project Assignment",
                "POST",
                f"projects/{self.project_id}/assignments",
                200,
                data=assignment_data
            )
            
            if success:
                assignment_id = assignment["id"]
                
                # Test assignment deletion
                success, _ = self.run_test(
                    "Delete Project Assignment",
                    "DELETE",
                    f"projects/{self.project_id}/assignments/{assignment_id}",
                    200
                )
                
                if success:
                    self.log_test("Project Assignment CRUD", True, "Assignment created and deleted successfully")
                    return True
        
        return False

    def test_project_activities(self):
        """Test project activity logs"""
        print("\n🔍 Testing Project Activities...")
        
        if not hasattr(self, 'project_id'):
            self.log_test("Project Activities Test", False, "", "No project available for testing")
            return False
        
        success, activities = self.run_test(
            "Get Project Activities",
            "GET",
            f"projects/{self.project_id}/activities",
            200
        )
        
        if success and isinstance(activities, list):
            self.log_test("Project Activities", True, f"Found {len(activities)} activities")
            
            # Verify activity structure
            if activities:
                activity = activities[0]
                expected_fields = ["id", "project_id", "user_id", "user_name", "action", "description", "created_at"]
                all_fields_present = all(field in activity for field in expected_fields)
                
                if all_fields_present:
                    self.log_test("Activity Structure", True, "All expected fields present")
                else:
                    missing_fields = [f for f in expected_fields if f not in activity]
                    self.log_test("Activity Structure", False, "", f"Missing fields: {missing_fields}")
            
            return True
        
        return False

    def test_project_tasks(self):
        """Test project tasks functionality"""
        print("\n🔍 Testing Project Tasks...")
        
        if not hasattr(self, 'project_id'):
            self.log_test("Project Tasks Test", False, "", "No project available for testing")
            return False
        
        success, tasks = self.run_test(
            "Get Project Tasks",
            "GET",
            f"projects/{self.project_id}/tasks",
            200
        )
        
        if success and isinstance(tasks, list):
            self.log_test("Project Tasks", True, f"Found {len(tasks)} tasks")
            
            # Test task update if tasks exist
            if tasks:
                task_id = tasks[0]["id"]
                update_data = {
                    "status": "uretimde",
                    "notes": "Test güncelleme",
                    "assigned_to": None
                }
                
                success, _ = self.run_test(
                    "Update Project Task",
                    "PUT",
                    f"projects/{self.project_id}/tasks/{task_id}",
                    200,
                    data=update_data
                )
                
                if success:
                    self.log_test("Project Task Update", True, "Task updated successfully")
            
            return True
        
        return False

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
            self.test_project_with_areas,
            self.test_project_payments,
            self.test_project_assignments,
            self.test_project_activities,
            self.test_project_tasks,
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