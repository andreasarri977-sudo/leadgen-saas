"""
Site Editor MVP Backend Tests
Tests for the manual editor endpoints:
- GET /api/sites/{demo_id}/editor-data
- POST /api/sites/{demo_id}/update
- POST /api/sites/{demo_id}/republish
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
DEMO_ID = "a98f4f72-fd36-4593-b92c-36fa1e1d88bf"  # Aisha demo

class TestEditorDataEndpoint:
    """Test GET /api/sites/{demo_id}/editor-data endpoint"""
    
    def test_get_editor_data_success(self):
        """Test successful retrieval of editor data"""
        response = requests.get(f"{BASE_URL}/api/sites/{DEMO_ID}/editor-data")
        assert response.status_code == 200
        
        data = response.json()
        
        # Validate response structure
        assert "demo_id" in data
        assert data["demo_id"] == DEMO_ID
        assert "business_name" in data
        assert "locale_lang" in data
        assert "publish_status" in data
        
        # Validate editor sections exist
        assert "hours" in data
        assert "menu" in data
        assert "texts" in data
        assert "contacts" in data
        assert "gallery" in data
        assert "seo" in data
        
    def test_get_editor_data_hours_structure(self):
        """Test hours data has correct structure"""
        response = requests.get(f"{BASE_URL}/api/sites/{DEMO_ID}/editor-data")
        data = response.json()
        
        hours = data["hours"]
        expected_days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        
        for day in expected_days:
            assert day in hours, f"Day {day} not in hours"
            assert "closed" in hours[day]
            assert "open" in hours[day]
            assert "close" in hours[day]
            assert "note" in hours[day]
    
    def test_get_editor_data_menu_structure(self):
        """Test menu data has correct structure"""
        response = requests.get(f"{BASE_URL}/api/sites/{DEMO_ID}/editor-data")
        data = response.json()
        
        menu = data["menu"]
        assert "mode" in menu
        assert menu["mode"] in ["menu", "services"]
        assert "categories" in menu
        assert "services" in menu
    
    def test_get_editor_data_texts_structure(self):
        """Test texts data has correct structure"""
        response = requests.get(f"{BASE_URL}/api/sites/{DEMO_ID}/editor-data")
        data = response.json()
        
        texts = data["texts"]
        assert "about_local" in texts
        assert "about_en" in texts
        assert "tagline_local" in texts
        assert "tagline_en" in texts
    
    def test_get_editor_data_contacts_structure(self):
        """Test contacts data has correct structure"""
        response = requests.get(f"{BASE_URL}/api/sites/{DEMO_ID}/editor-data")
        data = response.json()
        
        contacts = data["contacts"]
        assert "phone" in contacts
        assert "whatsapp" in contacts
        assert "email" in contacts
    
    def test_get_editor_data_seo_structure(self):
        """Test SEO data has correct structure"""
        response = requests.get(f"{BASE_URL}/api/sites/{DEMO_ID}/editor-data")
        data = response.json()
        
        seo = data["seo"]
        assert "title_local" in seo
        assert "title_en" in seo
        assert "meta_local" in seo
        assert "meta_en" in seo
    
    def test_get_editor_data_not_found(self):
        """Test 404 for non-existent demo"""
        response = requests.get(f"{BASE_URL}/api/sites/nonexistent-demo-id/editor-data")
        assert response.status_code == 404


class TestUpdateEndpoint:
    """Test POST /api/sites/{demo_id}/update endpoint"""
    
    def test_update_contacts_success(self):
        """Test updating contacts section"""
        response = requests.post(
            f"{BASE_URL}/api/sites/{DEMO_ID}/update",
            json={
                "section": "contacts",
                "data": {
                    "phone": "+39 389 548 2837",
                    "whatsapp": "+39 389 548 2837",
                    "email": "test@aisha.it"
                }
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "Sezione" in data["message"]
    
    def test_update_texts_success(self):
        """Test updating texts section"""
        response = requests.post(
            f"{BASE_URL}/api/sites/{DEMO_ID}/update",
            json={
                "section": "texts",
                "data": {
                    "about_local": "Test about text in Italian",
                    "about_en": "Test about text in English",
                    "tagline_local": "Test tagline IT",
                    "tagline_en": "Test tagline EN"
                }
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    def test_update_hours_success(self):
        """Test updating hours section"""
        response = requests.post(
            f"{BASE_URL}/api/sites/{DEMO_ID}/update",
            json={
                "section": "hours",
                "data": {
                    "mon": {"closed": True, "open": "", "close": "", "note": ""},
                    "tue": {"closed": False, "open": "18:00", "close": "02:00", "note": ""},
                    "wed": {"closed": False, "open": "18:00", "close": "02:00", "note": ""},
                    "thu": {"closed": False, "open": "18:00", "close": "02:00", "note": ""},
                    "fri": {"closed": False, "open": "18:00", "close": "02:00", "note": ""},
                    "sat": {"closed": False, "open": "18:00", "close": "02:00", "note": ""},
                    "sun": {"closed": False, "open": "18:00", "close": "02:00", "note": ""}
                }
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    def test_update_menu_success(self):
        """Test updating menu section"""
        response = requests.post(
            f"{BASE_URL}/api/sites/{DEMO_ID}/update",
            json={
                "section": "menu",
                "data": {
                    "mode": "menu",
                    "categories": [
                        {"name": "Colazione", "items": ["Cornetto", "Cappuccino"]},
                        {"name": "Pranzo", "items": ["Pasta", "Insalata"]}
                    ],
                    "services": []
                }
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    def test_update_seo_success(self):
        """Test updating SEO section"""
        response = requests.post(
            f"{BASE_URL}/api/sites/{DEMO_ID}/update",
            json={
                "section": "seo",
                "data": {
                    "title_local": "Aisha | Bar",
                    "title_en": "Aisha | Bar",
                    "meta_local": "Descrizione SEO in italiano",
                    "meta_en": "SEO description in English"
                }
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    def test_update_gallery_success(self):
        """Test updating gallery section"""
        response = requests.post(
            f"{BASE_URL}/api/sites/{DEMO_ID}/update",
            json={
                "section": "gallery",
                "data": {
                    "images": [
                        {"url": "https://example.com/image1.jpg", "caption": "", "order": 0},
                        {"url": "https://example.com/image2.jpg", "caption": "", "order": 1}
                    ]
                }
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    def test_update_invalid_section(self):
        """Test updating with invalid section name"""
        response = requests.post(
            f"{BASE_URL}/api/sites/{DEMO_ID}/update",
            json={
                "section": "invalid_section",
                "data": {}
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert "errors" in data
    
    def test_update_invalid_email_format(self):
        """Test validation error for invalid email"""
        response = requests.post(
            f"{BASE_URL}/api/sites/{DEMO_ID}/update",
            json={
                "section": "contacts",
                "data": {
                    "phone": "+39 123 456 7890",
                    "whatsapp": "+39 123 456 7890",
                    "email": "invalid-email"  # Missing @
                }
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert "errors" in data
    
    def test_update_demo_not_found(self):
        """Test 404 for non-existent demo"""
        response = requests.post(
            f"{BASE_URL}/api/sites/nonexistent-demo-id/update",
            json={
                "section": "contacts",
                "data": {"phone": "+39 123 456 7890"}
            }
        )
        assert response.status_code == 404


class TestRepublishEndpoint:
    """Test POST /api/sites/{demo_id}/republish endpoint"""
    
    def test_republish_success(self):
        """Test successful republish"""
        response = requests.post(f"{BASE_URL}/api/sites/{DEMO_ID}/republish")
        
        # Note: This may return 200 even if Vercel deploy fails
        assert response.status_code == 200
        data = response.json()
        
        # Response should have success field
        assert "success" in data
        
        if data["success"]:
            assert "production_url" in data
            assert data["production_url"].startswith("https://")
        else:
            assert "error" in data
    
    def test_republish_demo_not_found(self):
        """Test 404 for non-existent demo"""
        response = requests.post(f"{BASE_URL}/api/sites/nonexistent-demo-id/republish")
        assert response.status_code == 404


class TestDemosListEndpoint:
    """Test demos list endpoint for Edit button"""
    
    def test_demos_list_returns_demo_id(self):
        """Test that demos list includes demo_id for edit button"""
        response = requests.get(f"{BASE_URL}/api/demos")
        assert response.status_code == 200
        
        demos = response.json()
        assert len(demos) > 0
        
        # Check first demo has demo_id
        demo = demos[0]
        assert "demo_id" in demo
        assert isinstance(demo["demo_id"], str)
        assert len(demo["demo_id"]) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
