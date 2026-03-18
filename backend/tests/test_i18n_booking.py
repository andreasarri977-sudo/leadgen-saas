"""
Backend API Tests for i18n and Booking Features
Tests: Lead settings (site_language, booking_mode), Bookings CRUD
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://site-editor-mvp.preview.emergentagent.com')

# Test data IDs from main agent
TEST_LEAD_ID = "3e061e0f-d673-495b-aa9e-350fee511f41"
TEST_DEMO_ID = "80ce74e8-f4bb-4b1e-bf4d-9ca5d3992baa"


class TestLeadSettings:
    """Test PATCH /api/leads/{id}/settings endpoint"""
    
    def test_get_lead_by_id(self):
        """Test getting a specific lead by ID"""
        response = requests.get(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}")
        assert response.status_code == 200
        lead = response.json()
        assert lead["lead_id"] == TEST_LEAD_ID
        # Verify new fields exist
        assert "site_language" in lead
        assert "booking_mode" in lead
        print(f"Lead site_language: {lead.get('site_language')}, booking_mode: {lead.get('booking_mode')}")
    
    def test_update_site_language_valid(self):
        """Test updating site_language with valid value"""
        # Test all valid languages
        for lang in ['it', 'fr', 'en', 'es', 'de']:
            response = requests.patch(
                f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/settings",
                json={"site_language": lang}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True
            assert data["updated"]["site_language"] == lang
            
            # Verify persistence
            get_response = requests.get(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}")
            assert get_response.status_code == 200
            lead = get_response.json()
            assert lead["site_language"] == lang
        
        # Reset to French (original)
        requests.patch(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/settings", json={"site_language": "fr"})
    
    def test_update_site_language_invalid(self):
        """Test updating site_language with invalid value"""
        response = requests.patch(
            f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/settings",
            json={"site_language": "invalid_lang"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
    
    def test_update_booking_mode_valid(self):
        """Test updating booking_mode with valid values"""
        for mode in ['none', 'appointment', 'table']:
            response = requests.patch(
                f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/settings",
                json={"booking_mode": mode}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True
            assert data["updated"]["booking_mode"] == mode
            
            # Verify persistence
            get_response = requests.get(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}")
            assert get_response.status_code == 200
            lead = get_response.json()
            assert lead["booking_mode"] == mode
        
        # Reset to appointment (original)
        requests.patch(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/settings", json={"booking_mode": "appointment"})
    
    def test_update_booking_mode_invalid(self):
        """Test updating booking_mode with invalid value"""
        response = requests.patch(
            f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/settings",
            json={"booking_mode": "invalid_mode"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
    
    def test_update_external_booking_url(self):
        """Test updating external_booking_url"""
        test_url = "https://www.thefork.it/test-restaurant"
        response = requests.patch(
            f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/settings",
            json={"external_booking_url": test_url}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["updated"]["external_booking_url"] == test_url
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}")
        assert get_response.status_code == 200
        lead = get_response.json()
        assert lead["external_booking_url"] == test_url
        
        # Clear the URL
        requests.patch(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/settings", json={"external_booking_url": ""})
    
    def test_update_multiple_settings(self):
        """Test updating multiple settings at once"""
        response = requests.patch(
            f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/settings",
            json={
                "site_language": "it",
                "booking_mode": "table"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "site_language" in data["updated"]
        assert "booking_mode" in data["updated"]
        
        # Reset
        requests.patch(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/settings", json={"site_language": "fr", "booking_mode": "appointment"})
    
    def test_update_settings_empty_body(self):
        """Test updating with empty body returns error"""
        response = requests.patch(
            f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/settings",
            json={}
        )
        assert response.status_code == 400
    
    def test_update_settings_nonexistent_lead(self):
        """Test updating settings for non-existent lead"""
        response = requests.patch(
            f"{BASE_URL}/api/leads/nonexistent-lead-id/settings",
            json={"site_language": "it"}
        )
        assert response.status_code == 404


class TestBookingsAPI:
    """Test /api/bookings endpoints"""
    
    def test_get_bookings(self):
        """Test getting all bookings"""
        response = requests.get(f"{BASE_URL}/api/bookings")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} bookings")
    
    def test_get_bookings_by_lead_id(self):
        """Test getting bookings filtered by lead_id"""
        response = requests.get(f"{BASE_URL}/api/bookings?lead_id={TEST_LEAD_ID}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned bookings should have the correct lead_id
        for booking in data:
            assert booking["lead_id"] == TEST_LEAD_ID
    
    def test_create_booking_appointment(self):
        """Test creating an appointment booking"""
        booking_data = {
            "demo_id": TEST_DEMO_ID,
            "booking_type": "appointment",
            "date": "2026-01-15",
            "time": "10:00",
            "name": "TEST_User Appointment",
            "phone": "+39111222333",
            "email": "test_appointment@test.com",
            "notes": "Test appointment booking"
        }
        
        response = requests.post(f"{BASE_URL}/api/bookings", json=booking_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "booking_id" in data
        
        # Verify booking was created
        booking_id = data["booking_id"]
        get_response = requests.get(f"{BASE_URL}/api/bookings")
        bookings = get_response.json()
        created_booking = next((b for b in bookings if b["booking_id"] == booking_id), None)
        assert created_booking is not None
        assert created_booking["customer_name"] == "TEST_User Appointment"
        assert created_booking["booking_type"] == "appointment"
        print(f"Created appointment booking: {booking_id}")
    
    def test_create_booking_table(self):
        """Test creating a table booking"""
        booking_data = {
            "demo_id": TEST_DEMO_ID,
            "booking_type": "table",
            "date": "2026-01-20",
            "time": "20:00",
            "name": "TEST_User Table",
            "phone": "+39444555666",
            "email": "test_table@test.com",
            "number_of_people": 4,
            "notes": "Test table booking"
        }
        
        response = requests.post(f"{BASE_URL}/api/bookings", json=booking_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "booking_id" in data
        
        # Verify booking was created with number_of_people
        booking_id = data["booking_id"]
        get_response = requests.get(f"{BASE_URL}/api/bookings")
        bookings = get_response.json()
        created_booking = next((b for b in bookings if b["booking_id"] == booking_id), None)
        assert created_booking is not None
        assert created_booking["number_of_people"] == 4
        assert created_booking["booking_type"] == "table"
        print(f"Created table booking: {booking_id}")
    
    def test_create_booking_invalid_demo(self):
        """Test creating booking with invalid demo_id"""
        booking_data = {
            "demo_id": "nonexistent-demo-id",
            "booking_type": "appointment",
            "date": "2026-01-15",
            "time": "10:00",
            "name": "Test User",
            "phone": "+39111222333"
        }
        
        response = requests.post(f"{BASE_URL}/api/bookings", json=booking_data)
        assert response.status_code == 404
    
    def test_booking_structure(self):
        """Test booking object structure"""
        response = requests.get(f"{BASE_URL}/api/bookings")
        data = response.json()
        
        if len(data) > 0:
            booking = data[0]
            # Verify required fields
            assert "booking_id" in booking
            assert "demo_id" in booking
            assert "lead_id" in booking
            assert "business_name" in booking
            assert "booking_type" in booking
            assert "date" in booking
            assert "time" in booking
            assert "customer_name" in booking
            assert "customer_phone" in booking
            assert "status" in booking
            assert "created_at" in booking


class TestDemoWithI18n:
    """Test demo endpoint returns i18n data"""
    
    def test_demo_has_i18n_fields(self):
        """Test that demo business_data includes i18n fields"""
        response = requests.get(f"{BASE_URL}/api/demos/{TEST_DEMO_ID}")
        assert response.status_code == 200
        demo = response.json()
        
        business_data = demo.get("business_data", {})
        assert "site_language" in business_data
        assert "booking_mode" in business_data
        print(f"Demo site_language: {business_data.get('site_language')}, booking_mode: {business_data.get('booking_mode')}")


class TestDashboardStats:
    """Test dashboard stats still work"""
    
    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/stats/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "total_leads" in data
        assert "demos_created" in data
        print(f"Dashboard stats: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
