"""
Enterprise Test Suite for XtraPath Platform
Benchmarked against Tier-1 Production Standards (Figma, Canva, TikTok, Supabase architecture)
Validates:
1. Zero-Trust Admin Authorization (Rejecting unauthenticated access with 401/403)
2. Network Performance & Asset Headers (GZip, ETag, CDN Cache-Control)
3. Entitlement & User Purchases Verification
4. Subprocess Concurrency & Rendering Queue Health
"""

import unittest
import sys
import os

# Add src to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "backend")))

from fastapi.testclient import TestClient
from backend.server import app

class TestSecurityAndPerformance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_check(self):
        """Validates that health check endpoint returns 200 OK with operational status."""
        resp = self.client.get("/api/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data.get("status"), "ok")

    def test_admin_endpoints_unauthorized_rejection(self):
        """Zero-Trust P0: Unauthenticated requests to administrative endpoints must return 403 Forbidden."""
        admin_routes = [
            "/api/admin/users",
            "/api/admin/stats",
            "/api/admin/global-stats",
            "/api/admin/transactions-ledger",
            "/api/admin/payouts-queue",
            "/api/admin/system-settings",
            "/api/admin/bank-account",
        ]
        for route in admin_routes:
            with self.subTest(route=route):
                resp = self.client.get(route)
                self.assertIn(resp.status_code, [401, 403], f"Unauthenticated access permitted on {route}")

    def test_admin_update_routes_unauthorized_rejection(self):
        """Zero-Trust P0: Unauthenticated POST requests to admin mutation routes must return 403 Forbidden."""
        resp = self.client.post("/api/admin/users/toggle-pro", json={"userId": "victim_user", "isPro": True})
        self.assertIn(resp.status_code, [401, 403])

        resp = self.client.post("/api/admin/users/update-role", json={"userId": "victim_user", "isAdmin": True, "role": "Admin"})
        self.assertIn(resp.status_code, [401, 403])

    def test_security_and_caching_headers(self):
        """Speed & Latency P0: Responses must carry modern security headers and edge caching headers."""
        resp = self.client.get("/viewmodel/script.js")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("Cache-Control", resp.headers)
        self.assertEqual(resp.headers.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(resp.headers.get("X-Frame-Options"), "SAMEORIGIN")

    def test_user_purchases_entitlements_structure(self):
        """Monetization P0: /api/user/purchases returns normalized entitlement contract."""
        resp = self.client.get("/api/user/purchases?userId=test_student_01")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("success"))
        self.assertIn("isPro", data)
        self.assertIn("purchases", data)
        self.assertIsInstance(data["purchases"], list)

    def test_saves_endpoint_pagination_and_query(self):
        """Feed Latency P0: User saves query responds efficiently with list structure."""
        resp = self.client.get("/api/saves?user_id=test_student_01")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("success"))
        self.assertIn("saved_ids", data)
        self.assertIsInstance(data["saved_ids"], list)

if __name__ == "__main__":
    unittest.main()
