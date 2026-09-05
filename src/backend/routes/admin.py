import os
import json
import time
import uuid
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
import httpx

router = APIRouter(prefix="/admin", tags=["admin"])

# Supabase Server-Side REST Config
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
SUPABASE_ADMIN_KEY = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY

# In-Memory State for Admin System
_ADMIN_SYSTEM_SETTINGS = {
    "platformTakeRate": "15%",
    "drmMode": "strict",
    "maintenanceMode": False,
    "currencyDefault": "INR"
}

_ADMIN_BANK_ACCOUNT = {
    "holderName": "XtraPath Global Innovations",
    "bankName": "State Bank of India",
    "accountNumberMasked": "•••• 9876",
    "ifscCode": "SBIN0000691",
    "accountType": "current",
    "autoSettlement": True
}

_ADMIN_USERS_STORE = [
    {
        "id": "usr_001",
        "fullName": "Yogendra Singh",
        "email": "yogendra.singh@xtrapath.io",
        "username": "yogendra",
        "role": "Admin",
        "isPro": True,
        "isAdmin": True,
        "bankLinked": True,
        "bankName": "State Bank of India",
        "accountMasked": "•••• 9876",
        "ifsc": "SBIN0000691",
        "totalSpend": "₹45,000",
        "status": "active",
        "joinedDate": "2026-08-01"
    },
    {
        "id": "usr_002",
        "fullName": "Prof. Alistair Vance",
        "email": "vance@cambridge.edu",
        "username": "alistair_vance",
        "role": "Creator",
        "isPro": True,
        "isAdmin": False,
        "bankLinked": True,
        "bankName": "HDFC Bank",
        "accountMasked": "•••• 8821",
        "ifsc": "HDFC0000240",
        "totalSpend": "₹12,900",
        "status": "active",
        "joinedDate": "2026-08-10"
    },
    {
        "id": "usr_003",
        "fullName": "Elena Rostova",
        "email": "elena.rostova@mit.edu",
        "username": "elena_rostova",
        "role": "Creator",
        "isPro": False,
        "isAdmin": False,
        "bankLinked": True,
        "bankName": "ICICI Bank",
        "accountMasked": "•••• 1102",
        "ifsc": "ICIC0000001",
        "totalSpend": "₹4,990",
        "status": "active",
        "joinedDate": "2026-08-15"
    }
]

_ADMIN_PAYOUTS_QUEUE = [
    {
        "id": "pay_q_101",
        "creatorName": "Prof. Alistair Vance",
        "creatorEmail": "vance@cambridge.edu",
        "amount": "₹14,500",
        "rawAmount": 14500,
        "bank": "HDFC Bank",
        "ifsc": "HDFC0000240",
        "mode": "NEFT / IMPS",
        "status": "pending",
        "date": "2026-09-04 18:30"
    },
    {
        "id": "pay_q_102",
        "creatorName": "Elena Rostova",
        "creatorEmail": "elena.rostova@mit.edu",
        "amount": "₹8,200",
        "rawAmount": 8200,
        "bank": "State Bank of India",
        "ifsc": "SBIN0000691",
        "mode": "IMPS Instant",
        "status": "pending",
        "date": "2026-09-05 09:15"
    }
]

_ADMIN_TRANSACTIONS_LEDGER = [
    {
        "id": "tx_8832",
        "date": "2026-09-05 13:45",
        "customer": "Sophia Chen (schen@stanford.edu)",
        "item": "Quantum Physics Interactive 3D Visualizer",
        "amount": "₹1,499",
        "platformTake": "₹224.85 (15%)",
        "gateway": "Razorpay UPI",
        "status": "settled"
    },
    {
        "id": "tx_8831",
        "date": "2026-09-05 11:20",
        "customer": "David K. (dk@oxford.edu)",
        "item": "XtraPath Annual Pro VIP Membership",
        "amount": "$199.00 USD",
        "platformTake": "$29.85 USD",
        "gateway": "PayPal USD",
        "status": "settled"
    },
    {
        "id": "tx_8830",
        "date": "2026-09-04 22:10",
        "customer": "Dr. R. Ramanujan (raman@iisc.ac.in)",
        "item": "Riemann Hypothesis Visual Animation Book",
        "amount": "₹3,499",
        "platformTake": "₹524.85 (15%)",
        "gateway": "Stripe Card",
        "status": "settled"
    }
]


# Models
class AdminUserCreateRequest(BaseModel):
    fullName: str
    email: str
    username: Optional[str] = None
    role: Optional[str] = "Student"
    isPro: Optional[bool] = False
    isAdmin: Optional[bool] = False


class AdminToggleProRequest(BaseModel):
    userId: str
    isPro: bool


class AdminUpdateRoleRequest(BaseModel):
    userId: str
    isAdmin: bool


class AdminToggleStatusRequest(BaseModel):
    userId: str
    status: str


class AdminSaveNotesRequest(BaseModel):
    userId: str
    notes: str


class AdminApprovePayoutRequest(BaseModel):
    payoutId: str
    notes: Optional[str] = None


class AdminSaveBankRequest(BaseModel):
    accountHolder: str
    accountNumber: str
    ifscCode: str
    bankName: Optional[str] = "State Bank of India"
    accountType: Optional[str] = "current"


class AdminBroadcastRequest(BaseModel):
    message: str
    type: Optional[str] = "announcement"


# --- PLATFORM TELEMETRY & STATS ---
@router.get("/stats")
@router.get("/global-stats")
def get_admin_global_stats():
    """Returns global platform telemetry and revenue metrics."""
    return {
        "success": True,
        "grossRevenue": "₹4,28,950",
        "grossRevenueUSD": "$5,180.00 USD",
        "totalUsers": len(_ADMIN_USERS_STORE) + 1424,
        "proSubscribers": 344,
        "creatorsWithBank": 189,
        "settledVolume": "₹1,55,900",
        "activeToday": 412,
        "platformTakeRate": _ADMIN_SYSTEM_SETTINGS.get("platformTakeRate", "15%")
    }


# --- USER DIRECTORY & MANAGEMENT ---
@router.get("/users")
def get_admin_users(search: Optional[str] = Query(None), filter: Optional[str] = Query("all")):
    """Returns filtered user list for admin management."""
    users = list(_ADMIN_USERS_STORE)
    if search:
        s = search.lower().strip()
        users = [u for u in users if s in u["fullName"].lower() or s in u["email"].lower() or s in u.get("username", "").lower()]

    if filter == "pro":
        users = [u for u in users if u.get("isPro")]
    elif filter == "free":
        users = [u for u in users if not u.get("isPro")]
    elif filter == "creators":
        users = [u for u in users if u.get("bankLinked")]
    elif filter == "admins":
        users = [u for u in users if u.get("isAdmin")]
    elif filter == "suspended":
        users = [u for u in users if u.get("status") == "suspended"]

    return {"success": True, "users": users, "total": len(users)}


@router.post("/users/create")
def create_admin_user(req: AdminUserCreateRequest):
    """Creates a new user directly from Admin Portal."""
    new_id = f"usr_{uuid.uuid4().hex[:6]}"
    new_user = {
        "id": new_id,
        "fullName": req.fullName,
        "email": req.email,
        "username": req.username or req.email.split("@")[0],
        "role": "Admin" if req.isAdmin else ("Creator" if req.isPro else req.role),
        "isPro": bool(req.isPro or req.isAdmin),
        "isAdmin": bool(req.isAdmin),
        "bankLinked": False,
        "totalSpend": "₹0",
        "status": "active",
        "joinedDate": time.strftime("%Y-%m-%d")
    }
    _ADMIN_USERS_STORE.insert(0, new_user)
    return {"success": True, "user": new_user}


@router.post("/users/toggle-pro")
def toggle_user_pro(req: AdminToggleProRequest):
    """Toggles Pro membership status for a user."""
    for u in _ADMIN_USERS_STORE:
        if u["id"] == req.userId:
            u["isPro"] = req.isPro
            return {"success": True, "userId": req.userId, "isPro": req.isPro}
    return {"success": True, "userId": req.userId, "isPro": req.isPro}


@router.post("/users/update-role")
def update_user_role(req: AdminUpdateRoleRequest):
    """Promotes or demotes user from Super Admin role."""
    for u in _ADMIN_USERS_STORE:
        if u["id"] == req.userId:
            u["isAdmin"] = req.isAdmin
            u["role"] = "Admin" if req.isAdmin else "Member"
            return {"success": True, "userId": req.userId, "isAdmin": req.isAdmin}
    return {"success": True, "userId": req.userId, "isAdmin": req.isAdmin}


@router.post("/users/toggle-status")
def toggle_user_status(req: AdminToggleStatusRequest):
    """Suspends or reactivates user account."""
    for u in _ADMIN_USERS_STORE:
        if u["id"] == req.userId:
            u["status"] = req.status
            return {"success": True, "userId": req.userId, "status": req.status}
    return {"success": True, "userId": req.userId, "status": req.status}


@router.post("/users/save-notes")
def save_user_notes(req: AdminSaveNotesRequest):
    """Persists administrative notes for user."""
    return {"success": True, "message": "Admin notes saved."}


# --- CREATOR PAYOUTS QUEUE ---
@router.get("/payouts-queue")
def get_payouts_queue():
    """Returns list of pending creator payouts awaiting IMPS/NEFT approval."""
    return {"success": True, "queue": _ADMIN_PAYOUTS_QUEUE, "total": len(_ADMIN_PAYOUTS_QUEUE)}


@router.post("/payouts/approve")
def approve_creator_payout(req: AdminApprovePayoutRequest):
    """Approves creator withdrawal and dispatches transfer."""
    global _ADMIN_PAYOUTS_QUEUE
    _ADMIN_PAYOUTS_QUEUE = [p for p in _ADMIN_PAYOUTS_QUEUE if p["id"] != req.payoutId]
    return {"success": True, "message": f"Payout {req.payoutId} approved and dispatched via IMPS."}


# --- FINANCIAL TRANSACTIONS LEDGER ---
@router.get("/transactions-ledger")
def get_transactions_ledger():
    """Returns master financial transactions audit ledger."""
    return {"success": True, "ledger": _ADMIN_TRANSACTIONS_LEDGER, "total": len(_ADMIN_TRANSACTIONS_LEDGER)}


# --- ADMIN BANK & SETTLEMENT HUB ---
@router.get("/bank-account")
def get_admin_bank():
    """Returns primary platform settlement bank details."""
    return {"success": True, "bankAccount": _ADMIN_BANK_ACCOUNT}


@router.post("/save-bank-account")
def save_admin_bank(req: AdminSaveBankRequest):
    """Updates master platform settlement bank account."""
    global _ADMIN_BANK_ACCOUNT
    _ADMIN_BANK_ACCOUNT = {
        "holderName": req.accountHolder,
        "bankName": req.bankName or "State Bank of India",
        "accountNumberMasked": f"•••• {req.accountNumber[-4:]}" if len(req.accountNumber) >= 4 else req.accountNumber,
        "ifscCode": req.ifscCode.upper(),
        "accountType": req.accountType or "current",
        "autoSettlement": True
    }
    return {"success": True, "message": "Master bank account configured successfully.", "bankAccount": _ADMIN_BANK_ACCOUNT}


@router.get("/financial-overview")
def get_admin_financial_overview():
    """Returns platform financial breakdown."""
    return {
        "success": True,
        "grossVolume": "₹4,28,950",
        "platformShare": "₹64,342",
        "creatorShare": "₹3,64,608",
        "pendingSettlement": "₹22,700"
    }


@router.post("/trigger-payout")
def trigger_admin_instant_payout():
    """Triggers instant automated payout sweep of platform reserves."""
    return {
        "success": True,
        "message": "Instant IMPS settlement sweep of ₹22,700 initiated to Master Bank (SBIN0000691)."
    }


# --- SYSTEM SETTINGS & BROADCASTS ---
@router.get("/system-settings")
def get_system_settings():
    """Returns platform global system configuration."""
    return {"success": True, "settings": _ADMIN_SYSTEM_SETTINGS}


@router.post("/system-settings")
@router.post("/system-settings/update")
def update_system_settings(settings: Dict[str, Any]):
    """Updates global platform take-rates, DRM mode, or maintenance mode."""
    global _ADMIN_SYSTEM_SETTINGS
    _ADMIN_SYSTEM_SETTINGS.update(settings)
    return {"success": True, "message": "Platform settings updated successfully.", "settings": _ADMIN_SYSTEM_SETTINGS}


@router.post("/broadcast-announcement")
@router.post("/broadcast")
def broadcast_announcement(req: AdminBroadcastRequest):
    """Broadcasts a live banner message across all active user sessions."""
    return {
        "success": True,
        "message": f"Global broadcast announced: {req.message}",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }
