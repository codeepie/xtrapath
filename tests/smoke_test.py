#!/usr/bin/env python3
"""
Comprehensive Production-Readiness Smoke Test Suite for XtraPath.
Validates all core systems, security barriers, data models, social graph, payment gateways, and view delivery.
"""

import os
import sys
import json
import time
import uuid
import unittest
from fastapi.testclient import TestClient

# Add project root to sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC_DIR = os.path.join(PROJECT_ROOT, "src")
BACKEND_DIR = os.path.join(SRC_DIR, "backend")

if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from src.backend.server import app, ADMIN_SECRET_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET


class XtraPathProductionSmokeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.test_uid_1 = f"smoke_usr_{uuid.uuid4().hex[:8]}"
        cls.test_uid_2 = f"smoke_usr_{uuid.uuid4().hex[:8]}"
        cls.test_handle_1 = f"smoke_{uuid.uuid4().hex[:6]}"
        cls.test_handle_2 = f"smoke_{uuid.uuid4().hex[:6]}"

    # ==========================================
    # 1. CORE SERVER & EDGE INFRASTRUCTURE
    # ==========================================
    def test_01_health_and_version(self):
        """Smoke Test: Server health status and versioning."""
        resp = self.client.get("/api/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data.get("status"), "ok")

    def test_02_security_and_edge_headers(self):
        """Smoke Test: Nosniff, SameOrigin, Referrer-Policy headers."""
        resp = self.client.get("/api/health")
        self.assertEqual(resp.headers.get("x-content-type-options"), "nosniff")
        self.assertEqual(resp.headers.get("x-frame-options"), "SAMEORIGIN")
        self.assertIn("strict-origin", resp.headers.get("referrer-policy", ""))

    # ==========================================
    # 2. USER MODEL & RESERVED HANDLE ENGINE
    # ==========================================
    def test_03_reserved_username_protection(self):
        """Smoke Test: Reserved prefixes ('xtra*') and system keywords blocked."""
        # 1. Test xtra* prefix block
        resp = self.client.get("/api/users/check-username?username=xtraanim_official")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertFalse(data["available"])
        self.assertIn("reserved", data["reason"].lower())

        # 2. Test system keyword block
        resp = self.client.get("/api/users/check-username?username=admin")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertFalse(data["available"])
        self.assertIn("reserved", data["reason"].lower())

        # 3. Test valid unique handle
        resp = self.client.get(f"/api/users/check-username?username={self.test_handle_1}")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["available"])

    def test_04_user_profile_lifecycle(self):
        """Smoke Test: Profile creation, retrieval by @handle, and update."""
        # 1. Create/Update Profile for User 1
        update_payload = {
            "id": self.test_uid_1,
            "username": self.test_handle_1,
            "full_name": "Smoke Test Creator 1",
            "bio": "Production smoke test account",
            "website": "https://xtrapath.com",
            "avatar_url": "https://api.dicebear.com/7.x/identicon/svg?seed=smoke1"
        }
        resp = self.client.post("/api/users/profile", json=update_payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["profile"]["username"], self.test_handle_1.lower())

        # 2. Create Profile for User 2
        update_payload_2 = {
            "id": self.test_uid_2,
            "username": self.test_handle_2,
            "full_name": "Smoke Test Creator 2",
            "bio": "Production smoke test account 2",
            "avatar_url": "https://api.dicebear.com/7.x/identicon/svg?seed=smoke2"
        }
        resp2 = self.client.post("/api/users/profile", json=update_payload_2)
        self.assertEqual(resp2.status_code, 200)

        # 3. Fetch Profile by @handle
        resp_get = self.client.get(f"/api/users/@{self.test_handle_1}")
        self.assertEqual(resp_get.status_code, 200)
        p_data = resp_get.json()
        self.assertTrue(p_data["success"])
        self.assertEqual(p_data["profile"]["id"], self.test_uid_1)

    # ==========================================
    # 3. SOCIAL GRAPH & ATOMIC COUNTERS
    # ==========================================
    def test_05_social_graph_follow_flow(self):
        """Smoke Test: Follow, atomic DB triggers count check, and unfollow."""
        # 1. User 1 follows User 2
        resp = self.client.post(
            f"/api/users/{self.test_uid_2}/follow",
            json={"follower_id": self.test_uid_1, "following_id": self.test_uid_2}
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["is_following"])

        # 2. Verify User 2's followers list contains User 1
        resp_followers = self.client.get(f"/api/users/{self.test_uid_2}/followers")
        self.assertEqual(resp_followers.status_code, 200)
        followers = resp_followers.json().get("followers", [])
        self.assertTrue(any(f["id"] == self.test_uid_1 for f in followers))

        # 3. Verify User 1's following list contains User 2
        resp_following = self.client.get(f"/api/users/{self.test_uid_1}/following")
        self.assertEqual(resp_following.status_code, 200)
        following = resp_following.json().get("following", [])
        self.assertTrue(any(f["id"] == self.test_uid_2 for f in following))

        # 4. Verify Atomic DB Counter Triggers
        resp_p2 = self.client.get(f"/api/users/{self.test_uid_2}")
        self.assertEqual(resp_p2.status_code, 200)
        self.assertGreaterEqual(resp_p2.json()["profile"]["followers_count"], 1)

        resp_p1 = self.client.get(f"/api/users/{self.test_uid_1}")
        self.assertEqual(resp_p1.status_code, 200)
        self.assertGreaterEqual(resp_p1.json()["profile"]["following_count"], 1)

        # 5. User 1 unfollows User 2
        resp_unfollow = self.client.post(
            f"/api/users/{self.test_uid_2}/unfollow",
            json={"follower_id": self.test_uid_1, "following_id": self.test_uid_2}
        )
        self.assertEqual(resp_unfollow.status_code, 200)
        self.assertFalse(resp_unfollow.json()["is_following"])

    def test_06_user_directory_search(self):
        """Smoke Test: Search directory finds matching profiles."""
        resp = self.client.get(f"/api/users/search?q={self.test_handle_1[:5]}")
        self.assertEqual(resp.status_code, 200)
        users = resp.json().get("users", [])
        self.assertTrue(any(u["username"] == self.test_handle_1 for u in users))

    # ==========================================
    # 4. POSTS, BOOKMARKS & COMMENTS
    # ==========================================
    def test_07_bookmark_and_comment_lifecycle(self):
        """Smoke Test: Post saving, comment publishing, and comment liking."""
        test_pid = f"post_smoke_{uuid.uuid4().hex[:6]}"

        # 1. Save / Bookmark post
        resp_save = self.client.post("/api/saves", json={
            "user_id": self.test_uid_1,
            "post_id": test_pid,
            "saved": True,
            "post_data": {"title": "Smoke Test Post", "author": self.test_handle_1}
        })
        self.assertEqual(resp_save.status_code, 200)

        # 2. Retrieve saves
        resp_get_saves = self.client.get(f"/api/saves?user_id={self.test_uid_1}")
        self.assertEqual(resp_get_saves.status_code, 200)
        saved_ids = resp_get_saves.json().get("saved_ids", [])
        self.assertIn(test_pid, saved_ids)

        # 3. Add comment
        resp_comment = self.client.post("/api/comments", json={
            "post_id": test_pid,
            "user_id": self.test_uid_1,
            "author_name": "Smoke Creator",
            "content": "Awesome animated visualization! #math"
        })
        self.assertEqual(resp_comment.status_code, 200)
        comment_id = resp_comment.json().get("id")
        self.assertIsNotNone(comment_id)

        # 4. Like comment
        resp_like = self.client.post("/api/comments/like", json={
            "comment_id": comment_id,
            "user_id": self.test_uid_2
        })
        self.assertEqual(resp_like.status_code, 200)

        # 5. Fetch comments
        resp_get_comments = self.client.get(f"/api/comments?post_id={test_pid}")
        self.assertEqual(resp_get_comments.status_code, 200)
        comments = resp_get_comments.json().get("comments", [])
        self.assertTrue(any(c["id"] == comment_id for c in comments))

    # ==========================================
    # 5. PAYMENT GATEWAYS & PURCHASE SECURITY
    # ==========================================
    def test_08_payment_order_and_signature_security(self):
        """Smoke Test: Razorpay order generation and forged signature rejection."""
        # 1. Create Razorpay order
        resp_order = self.client.post("/api/razorpay/create-order", json={
            "amount": 49900,
            "currency": "INR",
            "notes": {"item_id": "test_sim_1"}
        })
        self.assertEqual(resp_order.status_code, 200)
        data = resp_order.json()
        self.assertTrue(data.get("success"))
        order_id = data.get("order_id") or data.get("orderId")
        self.assertIsNotNone(order_id)

        # 2. Forged signature must be rejected with 400
        forged_verify = self.client.post("/api/razorpay/verify-payment", json={
            "razorpay_order_id": order_id,
            "razorpay_payment_id": "pay_fake_hacker_999",
            "razorpay_signature": "0000000000000000000000000000000000000000000000000000000000000000",
            "item_id": "test_sim_1",
            "user_id": self.test_uid_1
        })
        self.assertEqual(forged_verify.status_code, 400)

    # ==========================================
    # 6. ZERO-TRUST ADMIN AUTHENTICATION
    # ==========================================
    def test_09_admin_zero_trust_guard(self):
        """Smoke Test: Admin endpoints reject unauthenticated calls and accept secret key."""
        # 1. Unauthenticated request -> 403
        resp_unauth = self.client.get("/api/admin/stats")
        self.assertEqual(resp_unauth.status_code, 403)

        # 2. Spoofed header ('x-admin-user') -> 403
        resp_spoof = self.client.get("/api/admin/stats", headers={"x-admin-user": "superadmin"})
        self.assertEqual(resp_spoof.status_code, 403)

        # 3. Valid secret key -> 200
        resp_auth = self.client.get(
            "/api/admin/stats",
            headers={"x-admin-secret-key": ADMIN_SECRET_KEY}
        )
        self.assertEqual(resp_auth.status_code, 200)
        self.assertTrue(resp_auth.json().get("success"))

    # ==========================================
    # 7. MANIM / LATEX RENDERING ENGINE ISOLATION
    # ==========================================
    def test_10_engine_render_task_creation(self):
        """Smoke Test: Engine task creation and safe queuing."""
        resp = self.client.post("/api/render", json={
            "code": "from manim import *\nclass TestScene(Scene):\n    def construct(self):\n        self.add(Circle())",
            "preview": True,
            "quality": "l"
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        task_id = data.get("task_id")
        self.assertIsNotNone(task_id)

        # Poll status
        resp_status = self.client.get(f"/api/status/{task_id}")
        self.assertEqual(resp_status.status_code, 200)

    # ==========================================
    # 8. HTML VIEWS INTEGRITY SMOKE TEST
    # ==========================================
    def test_11_html_views_serve_cleanly(self):
        """Smoke Test: All primary HTML views serve HTTP 200."""
        primary_views = [
            "/views/explore.html",
            "/views/reels.html",
            "/views/profile.html",
            "/views/dashboard.html",
            "/views/store.html",
            "/views/settings.html",
            "/views/admin.html",
            "/views/xtraAnim.html",
            "/views/xtraBook.html",
            "/views/researchLab.html"
        ]
        for v in primary_views:
            resp = self.client.get(v)
            self.assertEqual(
                resp.status_code, 200,
                f"Failed to serve view {v}: status {resp.status_code}"
            )
            self.assertIn("<!DOCTYPE html>", resp.text)


if __name__ == "__main__":
    unittest.main(verbosity=2)
