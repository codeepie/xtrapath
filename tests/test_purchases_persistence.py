import unittest
import uuid
from fastapi.testclient import TestClient
from src.backend.server import app


class PurchasesPersistenceTestCase(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_sync_and_retrieve_purchases(self):
        uid = f"usr_test_{uuid.uuid4().hex[:8]}"
        item_id = f"item_{uuid.uuid4().hex[:6]}"

        # Sync purchase
        resp = self.client.post("/api/user/purchases/sync", json={
            "userId": uid,
            "itemIds": [item_id],
            "itemType": "simulation"
        })
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json().get("success"))
        self.assertIn(item_id, resp.json().get("synced", []))

        # Retrieve purchases
        get_resp = self.client.get(f"/api/user/purchases?userId={uid}")
        self.assertEqual(get_resp.status_code, 200)
        data = get_resp.json()
        self.assertTrue(data.get("success"))
        items = [str(p.get("item_id")) for p in data.get("purchases", [])]
        self.assertIn(item_id, items)

    def test_guest_to_authenticated_reconciliation(self):
        guest_item = f"guest_item_{uuid.uuid4().hex[:6]}"

        # Record purchase under usr_current_user (guest)
        resp = self.client.post("/api/user/purchases/sync", json={
            "userId": "usr_current_user",
            "itemIds": [guest_item],
            "itemType": "asset"
        })
        self.assertEqual(resp.status_code, 200)

        # Now an authenticated user logs in and queries
        auth_uid = f"usr_auth_{uuid.uuid4().hex[:8]}"
        get_resp = self.client.get(f"/api/user/purchases?userId={auth_uid}")
        self.assertEqual(get_resp.status_code, 200)
        data = get_resp.json()
        items = [str(p.get("item_id")) for p in data.get("purchases", [])]
        # Guest purchase should be reconciled and visible to the user
        self.assertIn(guest_item, items)


if __name__ == "__main__":
    unittest.main()
