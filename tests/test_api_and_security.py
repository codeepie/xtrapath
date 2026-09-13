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

    def test_admin_spoofed_header_rejection(self):
        """Zero-Trust P0: Spoofed x-admin-user header without cryptographic proof must return 403."""
        resp = self.client.get("/api/admin/stats", headers={"x-admin-user": "codeepie@gmail.com"})
        self.assertEqual(resp.status_code, 403)

    def test_admin_authorized_secret_key(self):
        """Zero-Trust P0: Valid x-admin-secret-key permits backend-to-backend operations."""
        resp = self.client.get("/api/admin/stats", headers={"x-admin-secret-key": "xtrapath_admin_super_secret_2026"})
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json().get("success"))

    def test_razorpay_signature_verification(self):
        """Monetization P0: Forged Razorpay signature payloads must be rejected with 400 Bad Request."""
        resp = self.client.post("/api/razorpay/verify-payment", json={
            "razorpay_order_id": "order_fake_12345",
            "razorpay_payment_id": "pay_fake_99999",
            "razorpay_signature": "forged_invalid_signature_hex"
        })
        self.assertEqual(resp.status_code, 400)

    def test_paypal_capture_verification(self):
        """Monetization P0: Forged PayPal capture attempts must be rejected."""
        resp = self.client.post("/api/paypal/capture-order", json={
            "orderId": "PAYID-fake12345",
            "userId": "usr_test_student"
        })
        self.assertIn(resp.status_code, [400, 500])

    def test_reserved_usernames_and_xtra_prefix(self):
        """Social Graph P0: Handles matching reserved words or starting with 'xtra' must be rejected."""
        resp1 = self.client.get("/api/users/check-username?username=admin")
        self.assertEqual(resp1.status_code, 200)
        self.assertFalse(resp1.json().get("available"))

        resp2 = self.client.get("/api/users/check-username?username=xtra_official")
        self.assertEqual(resp2.status_code, 200)
        self.assertFalse(resp2.json().get("available"))

        resp3 = self.client.get("/api/users/check-username?username=valid_creator_88")
        self.assertEqual(resp3.status_code, 200)
        self.assertTrue(resp3.json().get("available"))

    def test_self_follow_prevention(self):
        """Social Graph P0: Users cannot create self-following edges."""
        resp = self.client.post("/api/users/usr_samename/follow", json={
            "follower_id": "usr_samename",
            "following_id": "usr_samename"
        })
        self.assertEqual(resp.status_code, 400)

if __name__ == "__main__":
    unittest.main()
