"""
Backend API Tests for LeadHunter Pro
Tests: Dashboard stats, Leads list, Demos list
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://emergent-lead-finder.preview.emergentagent.com')

class TestHealthAndRoot:
    """Test basic API health"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "LeadHunter Pro API"


class TestDashboardStats:
    """Test /api/stats/dashboard endpoint"""
    
    def test_dashboard_stats_returns_200(self):
        """Test dashboard stats endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/stats/dashboard")
        assert response.status_code == 200
    
    def test_dashboard_stats_structure(self):
        """Test dashboard stats response structure"""
        response = requests.get(f"{BASE_URL}/api/stats/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required fields exist
        assert "total_leads" in data
        assert "demos_created" in data
        assert "contacted" in data
        assert "clients_acquired" in data
        assert "new_leads" in data
    
    def test_dashboard_stats_values_are_integers(self):
        """Test dashboard stats values are integers"""
        response = requests.get(f"{BASE_URL}/api/stats/dashboard")
        data = response.json()
        
        assert isinstance(data["total_leads"], int)
        assert isinstance(data["demos_created"], int)
        assert isinstance(data["contacted"], int)
        assert isinstance(data["clients_acquired"], int)
        assert isinstance(data["new_leads"], int)
    
    def test_dashboard_stats_values_non_negative(self):
        """Test dashboard stats values are non-negative"""
        response = requests.get(f"{BASE_URL}/api/stats/dashboard")
        data = response.json()
        
        assert data["total_leads"] >= 0
        assert data["demos_created"] >= 0
        assert data["contacted"] >= 0
        assert data["clients_acquired"] >= 0
        assert data["new_leads"] >= 0


class TestLeadsAPI:
    """Test /api/leads endpoint"""
    
    def test_leads_list_returns_200(self):
        """Test leads list endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/leads")
        assert response.status_code == 200
    
    def test_leads_list_returns_array(self):
        """Test leads list returns an array"""
        response = requests.get(f"{BASE_URL}/api/leads")
        data = response.json()
        assert isinstance(data, list)
    
    def test_leads_list_structure(self):
        """Test lead object structure"""
        response = requests.get(f"{BASE_URL}/api/leads")
        data = response.json()
        
        if len(data) > 0:
            lead = data[0]
            # Verify required fields
            assert "lead_id" in lead
            assert "name" in lead
            assert "category" in lead
            assert "city" in lead
            assert "status" in lead
    
    def test_leads_filter_by_status(self):
        """Test leads filtering by status"""
        response = requests.get(f"{BASE_URL}/api/leads?status=nuovo_lead")
        assert response.status_code == 200
        data = response.json()
        
        # All returned leads should have status nuovo_lead
        for lead in data:
            assert lead["status"] == "nuovo_lead"


class TestDemosAPI:
    """Test /api/demos endpoint"""
    
    def test_demos_list_returns_200(self):
        """Test demos list endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/demos")
        assert response.status_code == 200
    
    def test_demos_list_returns_array(self):
        """Test demos list returns an array"""
        response = requests.get(f"{BASE_URL}/api/demos")
        data = response.json()
        assert isinstance(data, list)
    
    def test_demos_list_structure(self):
        """Test demo object structure"""
        response = requests.get(f"{BASE_URL}/api/demos")
        data = response.json()
        
        if len(data) > 0:
            demo = data[0]
            # Verify required fields
            assert "demo_id" in demo
            assert "lead_id" in demo
            assert "business_name" in demo
            assert "demo_url" in demo
            assert "content" in demo
            assert "publish_status" in demo
    
    def test_get_demo_by_id(self):
        """Test getting a specific demo by ID"""
        # First get list of demos
        response = requests.get(f"{BASE_URL}/api/demos")
        data = response.json()
        
        if len(data) > 0:
            demo_id = data[0]["demo_id"]
            # Get specific demo
            response = requests.get(f"{BASE_URL}/api/demos/{demo_id}")
            assert response.status_code == 200
            demo = response.json()
            assert demo["demo_id"] == demo_id
    
    def test_get_demo_not_found(self):
        """Test getting non-existent demo returns 404"""
        response = requests.get(f"{BASE_URL}/api/demos/non-existent-id")
        assert response.status_code == 404


class TestAPISettings:
    """Test /api/settings/api endpoint"""
    
    def test_get_api_settings(self):
        """Test getting API settings"""
        response = requests.get(f"{BASE_URL}/api/settings/api")
        assert response.status_code == 200
        data = response.json()
        assert "setting_id" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
