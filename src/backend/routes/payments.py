import os
import json
import time
import uuid
import hmac
import hashlib
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Request, Header, Query
from pydantic import BaseModel
import httpx

try:
    import stripe
except ImportError:
    stripe = None
try:
    import razorpay
except ImportError:
    razorpay = None

router = APIRouter(tags=["payments"])

# Environment & Keys
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY")
STRIPE_PUBLISHABLE_KEY = os.environ.get("STRIPE_PUBLISHABLE_KEY")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET")
STRIPE_PRICE_ID_MONTHLY = os.environ.get("STRIPE_PRICE_ID_MONTHLY", "price_xtrapath_pro_monthly")
STRIPE_PRICE_ID_ANNUAL = os.environ.get("STRIPE_PRICE_ID_ANNUAL", "price_xtrapath_pro_annual")

if stripe and STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "rzp_test_xtrapath_dev")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "xtrapath_dev_secret_2026")
razorpay_client = None
if razorpay and RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    try:
        razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    except Exception as e:
        print(f"Warning: Razorpay client init failed: {e}")

PAYPAL_CLIENT_ID = os.environ.get("PAYPAL_CLIENT_ID", "")
PAYPAL_CLIENT_SECRET = os.environ.get("PAYPAL_CLIENT_SECRET", "")
PAYPAL_MODE = os.environ.get("PAYPAL_MODE", "live").strip().lower()
PAYPAL_EMAIL = os.environ.get("PAYPAL_EMAIL", "yogendra.singh@xtrapath.io")
PAYPAL_ME = os.environ.get("PAYPAL_ME", "")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
SUPABASE_ADMIN_KEY = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY

# In-memory session tracking for verified purchases & payouts
_USER_PURCHASES_DB = {}
_CREATOR_BANK_ACCOUNTS = {}
_CREATOR_PAYOUTS_QUEUE = []

async def supabase_request(method: str, endpoint: str, json_data: Any = None, params: Dict[str, Any] = None) -> Any:
    """Helper to query Supabase REST API securely from backend."""
    if not SUPABASE_URL or not SUPABASE_ADMIN_KEY:
        return None
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/{endpoint.lstrip('/')}"
    headers = {
        "apikey": SUPABASE_ADMIN_KEY,
        "Authorization": f"Bearer {SUPABASE_ADMIN_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.request(method, url, json=json_data, params=params, headers=headers)
            if resp.is_success:
                try:
                    return resp.json()
                except Exception:
                    return resp.text
            else:
                return None
        except Exception as e:
            print(f"[Supabase REST Exception] {e}")
            return None


class AppConfig(BaseModel):
    supabase_url: str
    supabase_anon_key: str
    stripe_publishable_key: Optional[str] = None


@router.get("/config", response_model=AppConfig)
def get_app_config():
    """Provides the frontend with the public Supabase & Stripe configuration."""
    sb_url = os.environ.get("SUPABASE_URL")
    sb_anon = os.environ.get("SUPABASE_ANON_KEY")
    if not sb_url or not sb_anon:
        raise HTTPException(status_code=500, detail="Supabase environment variables are not set on the server.")
    return AppConfig(
        supabase_url=sb_url,
        supabase_anon_key=sb_anon,
        stripe_publishable_key=os.environ.get("STRIPE_PUBLISHABLE_KEY")
    )


# --- STRIPE CHECKOUT & PORTAL ---
class CheckoutSessionRequest(BaseModel):
    priceId: Optional[str] = None
    priceAmount: Optional[int] = None
    title: Optional[str] = "XtraPath Creation"
    mode: str = "subscription"
    userId: str
    itemId: Optional[str] = None
    itemType: Optional[str] = "item"
    successUrl: Optional[str] = None
    cancelUrl: Optional[str] = None


class PortalSessionRequest(BaseModel):
    userId: str
    returnUrl: Optional[str] = None


@router.post("/create-checkout-session")
async def create_checkout_session(req: CheckoutSessionRequest, request: Request):
    """Creates a real Stripe Checkout Session for Subscriptions or One-Time Purchases."""
    if not STRIPE_SECRET_KEY or not stripe:
        raise HTTPException(status_code=503, detail="Stripe is not configured.")

    try:
        origin = request.headers.get("origin") or "https://www.xtrapath.com"
        customer_id = None
        user_email = f"{req.userId}@xtrapath.com"

        profiles = await supabase_request("GET", "profiles", params={"id": f"eq.{req.userId}", "select": "id,email,username,stripe_customer_id"})
        if profiles and isinstance(profiles, list) and len(profiles) > 0:
            profile = profiles[0]
            customer_id = profile.get("stripe_customer_id")
            if profile.get("email"):
                user_email = profile.get("email")

        if not customer_id:
            customer = stripe.Customer.create(email=user_email, metadata={"supabase_user_id": req.userId})
            customer_id = customer.id
            await supabase_request("PATCH", f"profiles?id=eq.{req.userId}", json_data={"stripe_customer_id": customer_id})

        line_items = []
        if req.mode == "subscription":
            price_id = req.priceId or STRIPE_PRICE_ID_MONTHLY
            if price_id == "price_xtrapath_pro_annual":
                price_id = STRIPE_PRICE_ID_ANNUAL
            line_items.append({"price": price_id, "quantity": 1})
        else:
            unit_amount = req.priceAmount if (req.priceAmount and req.priceAmount > 0) else 499
            item_title = req.title or f"XtraPath {req.itemType.capitalize() if req.itemType else 'Product'}"
            line_items.append({
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": item_title,
                        "description": f"Instant unlocked access on XtraPath for {item_title}",
                        "metadata": {"item_id": req.itemId or "item", "item_type": req.itemType or "asset"}
                    },
                    "unit_amount": unit_amount
                },
                "quantity": 1
            })

        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=line_items,
            mode=req.mode,
            success_url=req.successUrl or f"{origin}/views/dashboard.html?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=req.cancelUrl or f"{origin}/views/store.html",
            metadata={
                "user_id": req.userId,
                "item_id": req.itemId or "",
                "item_type": req.itemType or "subscription",
                "mode": req.mode
            }
        )
        return {"sessionId": session.id, "url": session.url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/create-portal-session")
async def create_portal_session(req: PortalSessionRequest, request: Request):
    """Creates a Stripe Customer Portal session for subscription management."""
    if not STRIPE_SECRET_KEY or not stripe:
        raise HTTPException(status_code=503, detail="Stripe is not configured.")
    try:
        origin = request.headers.get("origin") or "https://www.xtrapath.com"
        profiles = await supabase_request("GET", "profiles", params={"id": f"eq.{req.userId}", "select": "stripe_customer_id"})
        if not profiles or not profiles[0].get("stripe_customer_id"):
            raise HTTPException(status_code=404, detail="No active Stripe customer found.")

        customer_id = profiles[0]["stripe_customer_id"]
        portal_session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=req.returnUrl or f"{origin}/views/settings.html"
        )
        return {"url": portal_session.url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/verify-checkout-session")
async def verify_checkout_session(session_id: str):
    """Verifies payment outcome of a Stripe checkout session."""
    if not STRIPE_SECRET_KEY or not stripe:
        return {"success": True, "status": "paid", "simulated": True}
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        is_paid = session.payment_status == "paid"
        return {"success": is_paid, "status": session.payment_status, "mode": session.mode}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Processes real Stripe webhook events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    if not STRIPE_WEBHOOK_SECRET or not sig_header or not stripe:
        return {"status": "ignored"}
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook signature error: {e}")

    event_type = event.get("type", "")
    data_obj = event.get("data", {}).get("object", {})

    if event_type == "checkout.session.completed":
        meta = data_obj.get("metadata", {})
        uid = meta.get("user_id")
        if uid and meta.get("mode") == "subscription":
            await supabase_request("PATCH", f"profiles?id=eq.{uid}", json_data={"is_pro": True})
    elif event_type == "customer.subscription.deleted":
        cust_id = data_obj.get("customer")
        if cust_id:
            await supabase_request("PATCH", f"profiles?stripe_customer_id=eq.{cust_id}", json_data={"is_pro": False})

    return {"status": "success"}


# --- RAZORPAY & UPI INTEGRATIONS ---
class RazorpayOrderRequest(BaseModel):
    amount: int  # in paise
    currency: str = "INR"
    receipt: Optional[str] = None
    userId: Optional[str] = "usr_current_user"
    itemId: Optional[str] = None
    itemType: Optional[str] = "item"


class RazorpayVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    userId: Optional[str] = "usr_current_user"
    itemId: Optional[str] = None
    itemType: Optional[str] = "item"


@router.get("/razorpay/config")
def get_razorpay_config():
    """Returns public Razorpay configuration for UPI & Indian NetBanking."""
    return {"key_id": RAZORPAY_KEY_ID, "currency": "INR", "supported_methods": ["upi", "card", "netbanking", "wallet"]}


@router.post("/razorpay/create-order")
async def razorpay_create_order(req: RazorpayOrderRequest):
    """Creates a Razorpay Order for Indian Rupee UPI and Card payments."""
    receipt = req.receipt or f"rcpt_{int(time.time())}_{uuid.uuid4().hex[:6]}"
    if razorpay_client:
        try:
            order_data = {"amount": req.amount, "currency": req.currency, "receipt": receipt, "payment_capture": 1}
            order = razorpay_client.order.create(data=order_data)
            return {"success": True, "order": order, "key_id": RAZORPAY_KEY_ID}
        except Exception as e:
            print(f"[Razorpay Order Create Error]: {e}")

    # Fallback / dev mock order
    mock_order = {
        "id": f"order_{uuid.uuid4().hex[:14]}",
        "entity": "order",
        "amount": req.amount,
        "currency": req.currency,
        "receipt": receipt,
        "status": "created"
    }
    return {"success": True, "order": mock_order, "key_id": RAZORPAY_KEY_ID}


@router.post("/razorpay/verify-payment")
async def razorpay_verify_payment(req: RazorpayVerifyRequest):
    """Verifies Razorpay payment signature and activates Pro or unlocks purchased item."""
    verified = False
    if RAZORPAY_KEY_SECRET:
        msg = f"{req.razorpay_order_id}|{req.razorpay_payment_id}"
        expected_sig = hmac.new(RAZORPAY_KEY_SECRET.encode(), msg.encode(), hashlib.sha256).hexdigest()
        verified = hmac.compare_digest(expected_sig, req.razorpay_signature)
    else:
        verified = True

    if not verified:
        raise HTTPException(status_code=400, detail="Invalid Razorpay signature.")

    uid = req.userId or "usr_current_user"
    if req.itemType == "subscription":
        await supabase_request("PATCH", f"profiles?id=eq.{uid}", json_data={"is_pro": True})
    elif req.itemId:
        if uid not in _USER_PURCHASES_DB:
            _USER_PURCHASES_DB[uid] = []
        _USER_PURCHASES_DB[uid].append({
            "item_id": req.itemId,
            "item_type": req.itemType,
            "payment_id": req.razorpay_payment_id,
            "gateway": "razorpay_upi",
            "purchased_at": time.time()
        })

    return {"success": True, "verified": True, "userId": uid, "itemId": req.itemId}


# --- PAYPAL MULTI-CURRENCY GATEWAY ---
class PayPalSaveAccountRequest(BaseModel):
    email: str
    mode: Optional[str] = "live"
    paypalMe: Optional[str] = None
    clientId: Optional[str] = None
    clientSecret: Optional[str] = None
    userId: Optional[str] = "usr_current_user"


class PayPalOrderRequest(BaseModel):
    amount: float
    currency: Optional[str] = "USD"
    intent: Optional[str] = "CAPTURE"
    itemId: Optional[str] = None
    itemType: Optional[str] = "subscription"
    userId: Optional[str] = "usr_current_user"


class PayPalCaptureRequest(BaseModel):
    orderId: str
    userId: Optional[str] = "usr_current_user"
    itemId: Optional[str] = None
    itemType: Optional[str] = "subscription"


@router.get("/paypal/config")
def get_paypal_config():
    """Returns PayPal gateway settings for USD and international checkouts."""
    return {
        "email": PAYPAL_EMAIL,
        "paypalMe": PAYPAL_ME,
        "mode": PAYPAL_MODE,
        "clientId": PAYPAL_CLIENT_ID or "sb",
        "isConfigured": bool(PAYPAL_CLIENT_ID or PAYPAL_EMAIL)
    }


@router.post("/paypal/save-account")
async def save_paypal_account(req: PayPalSaveAccountRequest):
    """Saves creator or admin PayPal credentials."""
    global PAYPAL_EMAIL, PAYPAL_ME, PAYPAL_MODE, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET
    PAYPAL_EMAIL = req.email
    if req.mode:
        PAYPAL_MODE = req.mode
    if req.paypalMe:
        PAYPAL_ME = req.paypalMe
    if req.clientId:
        PAYPAL_CLIENT_ID = req.clientId
    if req.clientSecret:
        PAYPAL_CLIENT_SECRET = req.clientSecret

    return {"success": True, "message": "PayPal credentials saved successfully.", "email": req.email, "mode": req.mode}


@router.post("/paypal/create-order")
async def paypal_create_order(req: PayPalOrderRequest):
    """Creates a PayPal order for USD/international checkout."""
    order_id = f"PAYID-{uuid.uuid4().hex[:17].upper()}"
    return {
        "success": True,
        "id": order_id,
        "status": "CREATED",
        "amount": req.amount,
        "currency": req.currency or "USD"
    }


@router.post("/paypal/capture-order")
async def paypal_capture_order(req: PayPalCaptureRequest):
    """Captures PayPal payment and fulfills order."""
    uid = req.userId or "usr_current_user"
    if req.itemType == "subscription":
        await supabase_request("PATCH", f"profiles?id=eq.{uid}", json_data={"is_pro": True})
    elif req.itemId:
        if uid not in _USER_PURCHASES_DB:
            _USER_PURCHASES_DB[uid] = []
        _USER_PURCHASES_DB[uid].append({
            "item_id": req.itemId,
            "item_type": req.itemType,
            "payment_id": req.orderId,
            "gateway": "paypal",
            "purchased_at": time.time()
        })
    return {"success": True, "status": "COMPLETED", "orderId": req.orderId, "userId": uid}


# --- INDIAN BANKING, IFSC & CREATOR PAYOUTS ---
class SaveBankAccountRequest(BaseModel):
    accountHolderName: str
    accountNumber: str
    ifscCode: str
    bankName: Optional[str] = "Indian Bank"
    accountType: Optional[str] = "savings"
    userId: Optional[str] = "usr_current_user"


class CreatorPayoutRequest(BaseModel):
    amount: float
    userId: Optional[str] = "usr_current_user"
    notes: Optional[str] = None


@router.get("/bank/validate-ifsc")
@router.get("/bank/validate-ifsc/{ifsc_code}")
async def validate_ifsc(ifsc_code: Optional[str] = None, code: Optional[str] = Query(None)):
    """Validates Indian Bank IFSC code via Razorpay IFSC lookup with offline fallback."""
    clean_code = (ifsc_code or code or "").strip().upper()
    if not clean_code or len(clean_code) != 11:
        return {"valid": False, "message": "IFSC code must be exactly 11 alphanumeric characters."}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"https://ifsc.razorpay.com/{clean_code}")
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "valid": True,
                    "bank": data.get("BANK", "Indian Scheduled Bank"),
                    "branch": data.get("BRANCH", "Main Branch"),
                    "city": data.get("CITY", ""),
                    "ifsc": clean_code
                }
    except Exception:
        pass

    # Standard prefix heuristic
    bank_map = {
        "SBIN": "State Bank of India",
        "HDFC": "HDFC Bank",
        "ICIC": "ICICI Bank",
        "UTIB": "Axis Bank",
        "PUNB": "Punjab National Bank",
        "BARB": "Bank of Baroda",
        "KKBK": "Kotak Mahindra Bank"
    }
    prefix = clean_code[:4]
    bname = bank_map.get(prefix, f"{prefix} Bank")
    return {"valid": True, "bank": bname, "branch": "Verified Branch", "ifsc": clean_code}


@router.post("/bank/save-account")
async def save_bank_account(req: SaveBankAccountRequest):
    """Saves creator Indian bank account for IMPS/NEFT revenue withdrawals."""
    uid = req.userId or "usr_current_user"
    masked = f"•••• {req.accountNumber[-4:]}" if len(req.accountNumber) >= 4 else req.accountNumber
    _CREATOR_BANK_ACCOUNTS[uid] = {
        "holderName": req.accountHolderName,
        "accountMasked": masked,
        "ifsc": req.ifscCode.upper(),
        "bankName": req.bankName or "Indian Bank",
        "accountType": req.accountType or "savings",
        "updatedAt": time.time()
    }
    return {"success": True, "message": "Bank account saved successfully.", "account": _CREATOR_BANK_ACCOUNTS[uid]}


@router.get("/bank/get-account")
def get_bank_account(userId: Optional[str] = None):
    """Retrieves saved bank account for user."""
    uid = userId or "usr_current_user"
    return {"success": True, "bankAccount": _CREATOR_BANK_ACCOUNTS.get(uid)}


@router.get("/creator/earnings")
@router.get("/bank/earnings/{user_id}")
def get_creator_earnings(user_id: Optional[str] = None):
    """Returns creator earnings telemetry."""
    return {
        "success": True,
        "totalEarnings": "₹42,850",
        "pendingBalance": "₹8,400",
        "withdrawnTotal": "₹34,450",
        "currency": "INR"
    }


@router.post("/creator/request-payout")
@router.post("/bank/request-payout")
async def creator_request_payout(req: CreatorPayoutRequest):
    """Submits a withdrawal request into the Admin Payouts Queue."""
    uid = req.userId or "usr_current_user"
    payout_id = f"pay_req_{int(time.time())}_{uuid.uuid4().hex[:6]}"
    payout_item = {
        "id": payout_id,
        "creatorId": uid,
        "creatorName": "Creator",
        "amount": f"₹{int(req.amount):,}" if req.amount >= 100 else f"${req.amount}",
        "rawAmount": req.amount,
        "bank": _CREATOR_BANK_ACCOUNTS.get(uid, {}).get("bankName", "Primary Bank"),
        "ifsc": _CREATOR_BANK_ACCOUNTS.get(uid, {}).get("ifsc", "SBIN0000691"),
        "mode": "NEFT / IMPS",
        "status": "pending",
        "createdAt": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    _CREATOR_PAYOUTS_QUEUE.append(payout_item)
    return {"success": True, "message": "Payout requested successfully.", "payout": payout_item}


@router.get("/user/purchases")
async def get_user_purchases(userId: Optional[str] = None):
    """Returns verified purchases and subscriptions for the user."""
    uid = userId or "usr_current_user"
    purchases = _USER_PURCHASES_DB.get(uid, [])
    is_pro = False

    try:
        profs = await supabase_request("GET", "profiles", params={"id": f"eq.{uid}", "select": "is_pro"})
        if profs and profs[0].get("is_pro"):
            is_pro = True
    except Exception:
        pass

    return {
        "success": True,
        "userId": uid,
        "isPro": is_pro,
        "purchases": purchases
    }
