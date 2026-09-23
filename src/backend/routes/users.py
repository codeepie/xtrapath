import os
import re
import json
import time
import uuid
import sqlite3
import datetime
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Query, Header, Depends
from pydantic import BaseModel, Field
import httpx

router = APIRouter(prefix="/users", tags=["users"])

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

def get_saves_db_path() -> str:
    db_dir = os.path.join(PROJECT_ROOT, "data")
    db_path = os.path.join(db_dir, "saves.db")
    try:
        os.makedirs(db_dir, exist_ok=True)
        test_file = os.path.join(db_dir, ".write_test")
        with open(test_file, "w") as f:
            f.write("1")
        os.remove(test_file)
        return db_path
    except Exception:
        tmp_dir = "/tmp/xtrapath"
        os.makedirs(tmp_dir, exist_ok=True)
        return os.path.join(tmp_dir, "saves.db")

SAVES_DB_PATH = get_saves_db_path()

# Supabase Server-Side Config
FALLBACK_SUPABASE_URL = "https://elhdcldoepjxcxgivohg.supabase.co"
FALLBACK_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsaGRjbGRvZXBqeGN4Z2l2b2hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1Mzk1NTQsImV4cCI6MjEwMTExNTU1NH0.ago19dzlmxsKRy-7bg8q0JRw69o0roLES_w_dcFGt1o"

SUPABASE_URL = os.environ.get("SUPABASE_URL", "") or FALLBACK_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "") or FALLBACK_SUPABASE_ANON_KEY
SUPABASE_ADMIN_KEY = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY

RESERVED_USERNAMES = {
    "admin", "administrator", "superadmin", "support", "help", "root", "xtrapath", "xtraanim",
    "api", "auth", "login", "signup", "register", "explore", "reels", "settings", "terms",
    "privacy", "billing", "store", "dashboard", "null", "undefined", "official", "verify",
    "profile", "feed", "studio", "about", "contact", "security", "jobs", "press"
}

USERNAME_REGEX = re.compile(r"^[a-zA-Z0-9._]{3,30}$")

async def fetch_supabase_profile(uid_or_uname: str) -> Optional[Dict[str, Any]]:
    """Fetches real user profile directly from Supabase profiles table with UUID, username, and full_name fallback."""
    sb_url = (SUPABASE_URL or os.environ.get("SUPABASE_URL") or FALLBACK_SUPABASE_URL).rstrip('/')
    sb_key = SUPABASE_ADMIN_KEY or os.environ.get("SUPABASE_ANON_KEY") or FALLBACK_SUPABASE_ANON_KEY
    if not sb_url or not sb_key or not uid_or_uname:
        return None
    try:
        clean = uid_or_uname.strip().lstrip('@')
        is_uuid = bool(re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', clean, re.I))
        endpoint = f"profiles?id=eq.{clean}" if is_uuid else f"profiles?username=eq.{clean}"
        url = f"{sb_url}/rest/v1/{endpoint}"
        async with httpx.AsyncClient(timeout=5.0, verify=False) as client:
            resp = await client.get(url, headers={
                "apikey": sb_key,
                "Authorization": f"Bearer {sb_key}"
            })
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list) and len(data) > 0:
                    return data[0]
            # Fallback by case-insensitive username or full_name
            if not is_uuid:
                for alt_param in [f"username=ilike.{clean}", f"full_name=ilike.{clean}"]:
                    alt_url = f"{sb_url}/rest/v1/profiles?{alt_param}"
                    alt_resp = await client.get(alt_url, headers={
                        "apikey": sb_key,
                        "Authorization": f"Bearer {sb_key}"
                    })
                    if alt_resp.status_code == 200:
                        alt_data = alt_resp.json()
                        if isinstance(alt_data, list) and len(alt_data) > 0:
                            return alt_data[0]
    except Exception as e:
        print(f"[fetch_supabase_profile Warning]: {e}")
    return None

def upsert_user_profile_data(conn: sqlite3.Connection, p_data: Dict[str, Any]):
    """Safely updates or seeds user_profiles with real data from Supabase, overwriting any dummy placeholders."""
    uid = p_data.get("id")
    uname = (p_data.get("username") or "").strip().lstrip('@')
    fname = (p_data.get("full_name") or p_data.get("username") or "").strip()
    avatar = (p_data.get("avatar_url") or "").strip()
    bio = (p_data.get("bio") or "").strip()
    website = (p_data.get("website") or "").strip()
    if not uid or not uname:
        return
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO user_profiles (id, username, full_name, avatar_url, bio, website)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            username = CASE WHEN excluded.username NOT LIKE 'user_%' OR user_profiles.username LIKE 'user_%' THEN excluded.username ELSE user_profiles.username END,
            full_name = CASE WHEN excluded.full_name <> '' THEN excluded.full_name ELSE user_profiles.full_name END,
            avatar_url = CASE WHEN excluded.avatar_url <> '' THEN excluded.avatar_url ELSE user_profiles.avatar_url END,
            bio = CASE WHEN excluded.bio <> '' THEN excluded.bio ELSE user_profiles.bio END,
            website = CASE WHEN excluded.website <> '' THEN excluded.website ELSE user_profiles.website END
    """, (uid, uname, fname, avatar, bio, website))
    conn.commit()

def init_user_db():
    """Initializes high-concurrency tables, atomic triggers, and seeds initial social graph if empty."""
    global SAVES_DB_PATH
    SAVES_DB_PATH = get_saves_db_path()
    with sqlite3.connect(SAVES_DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_profiles (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL COLLATE NOCASE,
                full_name TEXT NOT NULL DEFAULT '',
                bio TEXT DEFAULT '',
                website TEXT DEFAULT '',
                avatar_url TEXT DEFAULT '',
                cover_url TEXT DEFAULT '',
                is_verified INTEGER DEFAULT 0,
                is_pro INTEGER DEFAULT 0,
                is_private INTEGER DEFAULT 0,
                role TEXT DEFAULT 'member',
                followers_count INTEGER NOT NULL DEFAULT 0,
                following_count INTEGER NOT NULL DEFAULT 0,
                posts_count INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username COLLATE NOCASE);")

        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_follows (
                user_id TEXT NOT NULL,
                target_user_id TEXT NOT NULL,
                creator_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, target_user_id)
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_user_follows_user ON user_follows(user_id);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_user_follows_target ON user_follows(target_user_id);")

        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_follows_graph (
                follower_id TEXT NOT NULL,
                following_id TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'accepted',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (follower_id, following_id)
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_follows_graph_follower ON user_follows_graph(follower_id);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_follows_graph_following ON user_follows_graph(following_id);")

        # SQLite Triggers for atomic follower / following counters
        conn.execute("""
            CREATE TRIGGER IF NOT EXISTS trg_follow_insert AFTER INSERT ON user_follows_graph
            WHEN NEW.status = 'accepted'
            BEGIN
                UPDATE user_profiles
                SET followers_count = followers_count + 1
                WHERE id = NEW.following_id;

                UPDATE user_profiles
                SET following_count = following_count + 1
                WHERE id = NEW.follower_id;
            END;
        """)

        conn.execute("""
            CREATE TRIGGER IF NOT EXISTS trg_follow_delete AFTER DELETE ON user_follows_graph
            WHEN OLD.status = 'accepted'
            BEGIN
                UPDATE user_profiles
                SET followers_count = MAX(0, followers_count - 1)
                WHERE id = OLD.following_id;

                UPDATE user_profiles
                SET following_count = MAX(0, following_count - 1)
                WHERE id = OLD.follower_id;
            END;
        """)

        # Auto-seed initial social graph if user_follows is empty
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM user_follows")
            if cursor.fetchone()[0] == 0:
                seed_candidates = [
                    os.path.join(os.path.dirname(__file__), "..", "data", "seed_social.json"),
                    os.path.join(PROJECT_ROOT, "src", "backend", "data", "seed_social.json"),
                    os.path.join(PROJECT_ROOT, "data", "seed_social.json")
                ]
                for seed_file in seed_candidates:
                    if os.path.exists(seed_file):
                        with open(seed_file, "r") as sf:
                            sdata = json.load(sf)
                        for f in sdata.get("follows", []):
                            c_json = json.dumps(f.get("creator_data", {}))
                            conn.execute(
                                "INSERT OR IGNORE INTO user_follows (user_id, target_user_id, creator_data, created_at) VALUES (?, ?, ?, ?)",
                                (f["user_id"], f["target_user_id"], c_json, f.get("created_at"))
                            )
                            conn.execute(
                                "INSERT OR IGNORE INTO user_follows_graph (follower_id, following_id, status, created_at) VALUES (?, ?, 'accepted', ?)",
                                (f["user_id"], f["target_user_id"], f.get("created_at"))
                            )
                        for p in sdata.get("profiles", []):
                            conn.execute(
                                "INSERT OR IGNORE INTO user_profiles (id, username, full_name, avatar_url, bio) VALUES (?, ?, ?, ?, ?)",
                                (p["id"], p.get("username", ""), p.get("full_name", ""), p.get("avatar_url", ""), p.get("bio", ""))
                            )
                        break
        except Exception as seed_err:
            print(f"[init_user_db Seed Notice]: {seed_err}")

        conn.commit()


# --- Pydantic Models ---
class ProfileUpdateRequest(BaseModel):
    id: str
    username: Optional[str] = None
    full_name: Optional[str] = None
    bio: Optional[str] = None
    website: Optional[str] = None
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    is_private: Optional[bool] = None


class FollowActionRequest(BaseModel):
    follower_id: str
    following_id: str


# --- Helper Functions ---
def clean_username(uname: str) -> str:
    if not uname:
        return ""
    return uname.strip().lstrip("@").lower()


def validate_username(username: str) -> tuple[bool, str]:
    uname = clean_username(username)
    if not uname:
        return False, "Username cannot be empty."
    if len(uname) < 3 or len(uname) > 30:
        return False, "Username must be between 3 and 30 characters."
    if not USERNAME_REGEX.match(uname):
        return False, "Username can only contain letters, numbers, underscores, and periods."
    if uname.startswith(".") or uname.endswith(".") or ".." in uname:
        return False, "Username cannot begin/end with a period or contain consecutive periods."
    if uname.startswith("xtra"):
        return False, f"Usernames starting with 'xtra' are reserved for official platform systems."
    if uname in RESERVED_USERNAMES:
        return False, f"Username '{uname}' is a reserved platform keyword."
    return True, ""


# --- 1. USERNAME AVAILABILITY CHECK ---
@router.get("/check-username")
async def check_username_availability(
    username: str = Query(..., description="Handle to test"),
    current_user_id: Optional[str] = Query(None)
):
    """Real-time debounced check for username availability and syntax compliance."""
    uname = clean_username(username)
    is_valid, err_msg = validate_username(uname)
    if not is_valid:
        return {"available": False, "username": uname, "message": err_msg, "reason": err_msg}

    init_user_db()
    with sqlite3.connect(SAVES_DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM user_profiles WHERE username = ?", (uname,))
        row = cursor.fetchone()
        if row:
            if current_user_id and str(row[0]) == str(current_user_id):
                return {"available": True, "username": uname, "message": "Current username is yours.", "reason": "Current username is yours."}
            return {"available": False, "username": uname, "message": f"@{uname} is already taken.", "reason": "Username is already taken."}

    return {"available": True, "username": uname, "message": f"@{uname} is available!", "reason": "Available"}


# --- 2. SEARCH USERS DIRECTORY (Static path must precede dynamic /{user_id}) ---
@router.get("/search")
async def search_users(
    q: str = Query(..., description="Query term for username or name"),
    limit: int = Query(15, ge=1, le=50)
):
    """Fast search for users by handle or full name."""
    clean_q = q.strip().lstrip("@")
    if not clean_q:
        return {"success": True, "results": [], "users": []}

    init_user_db()
    with sqlite3.connect(SAVES_DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, username, full_name, avatar_url, is_verified, is_pro, followers_count
            FROM user_profiles
            WHERE username LIKE ? OR full_name LIKE ?
            ORDER BY followers_count DESC, username ASC
            LIMIT ?
        """, (f"%{clean_q}%", f"%{clean_q}%", limit))

        results = [dict(r) for r in cursor.fetchall()]
        return {"success": True, "query": clean_q, "results": results, "users": results}


# --- 3. GET USER PROFILE BY USERNAME (Instagram Style) ---
@router.get("/@{username}")
@router.get("/handle/{username}")
async def get_profile_by_username(
    username: str,
    requester_id: Optional[str] = Query(None, description="Optional ID of browsing user")
):
    """Fetches public profile, follower/following counts, and follow state by handle."""
    uname = clean_username(username)
    if not uname:
        raise HTTPException(status_code=400, detail="Username is required.")

    init_user_db()
    with sqlite3.connect(SAVES_DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM user_profiles WHERE username = ? COLLATE NOCASE OR full_name LIKE ? COLLATE NOCASE", (uname, f"%{uname}%"))
        row = cursor.fetchone()

        if not row or (row["username"] and row["username"].startswith("user_")):
            sp = await fetch_supabase_profile(uname)
            if sp:
                upsert_user_profile_data(conn, sp)
                cursor.execute("SELECT * FROM user_profiles WHERE id = ? OR username = ? COLLATE NOCASE", (sp.get("id"), uname))
                row = cursor.fetchone()

        if not row:
            # Fallback check if user email or id exists in local db
            try:
                cursor.execute("SELECT user_id, email, full_name FROM user_emails WHERE email LIKE ?", (f"{uname}@%",))
                alt = cursor.fetchone()
                if alt:
                    uid = alt["user_id"]
                    cursor.execute("""
                        INSERT INTO user_profiles (id, username, full_name, followers_count, following_count)
                        VALUES (?, ?, ?, 0, 0)
                        ON CONFLICT(id) DO NOTHING
                    """, (uid, uname, alt["full_name"] or uname.capitalize()))
                    conn.commit()
                    cursor.execute("SELECT * FROM user_profiles WHERE id = ?", (uid,))
                    row = cursor.fetchone()
            except Exception:
                pass

        if not row:
            raise HTTPException(status_code=404, detail=f"User @{uname} not found.")

        profile_data = dict(row)

        # Count actual posts
        cursor.execute("SELECT COUNT(*) FROM user_saves WHERE user_id = ?", (profile_data["id"],))
        p_row = cursor.fetchone()
        if p_row:
            profile_data["posts_count"] = p_row[0]

        # Dynamically compute accurate follower and following counts across graph and legacy tables
        uid = profile_data["id"]
        try:
            cursor.execute("""
                SELECT COUNT(DISTINCT user_id) FROM (
                    SELECT follower_id AS user_id FROM user_follows_graph WHERE following_id = ? AND status = 'accepted'
                    UNION
                    SELECT user_id FROM user_follows WHERE target_user_id = ? OR target_user_id = ?
                )
            """, (uid, uid, uname))
            fc = cursor.fetchone()
            if fc and fc[0] is not None:
                profile_data["followers_count"] = max(profile_data.get("followers_count", 0), fc[0])

            cursor.execute("""
                SELECT COUNT(DISTINCT target_id) FROM (
                    SELECT following_id AS target_id FROM user_follows_graph WHERE follower_id = ? AND status = 'accepted'
                    UNION
                    SELECT target_user_id AS target_id FROM user_follows WHERE user_id = ?
                )
            """, (uid, uid))
            gc = cursor.fetchone()
            if gc and gc[0] is not None:
                profile_data["following_count"] = max(profile_data.get("following_count", 0), gc[0])
        except Exception:
            pass

        # Check is_following state for requester
        is_following = False
        if isinstance(requester_id, str) and requester_id and requester_id != profile_data["id"]:
            cursor.execute("""
                SELECT 1 FROM user_follows_graph WHERE follower_id = ? AND following_id = ? AND status = 'accepted'
                UNION
                SELECT 1 FROM user_follows WHERE user_id = ? AND (target_user_id = ? OR target_user_id = ?)
            """, (requester_id, profile_data["id"], requester_id, profile_data["id"], uname))
            if cursor.fetchone():
                is_following = True

        profile_data["is_following"] = is_following
        profile_data["is_self"] = bool(requester_id and requester_id == profile_data["id"])

        return {"success": True, "profile": profile_data}


# --- 3. GET USER PROFILE BY ID ---
@router.get("/id/{user_id}")
@router.get("/{user_id}")
async def get_profile_by_id(
    user_id: str,
    requester_id: Optional[str] = Query(None)
):
    """Fetches user profile by user UUID."""
    uid = user_id.strip()
    if not uid:
        raise HTTPException(status_code=400, detail="User ID is required.")

    init_user_db()
    with sqlite3.connect(SAVES_DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM user_profiles WHERE id = ?", (uid,))
        row = cursor.fetchone()

        if not row or (row["username"] and row["username"].startswith("user_")):
            sp = await fetch_supabase_profile(uid)
            if sp:
                upsert_user_profile_data(conn, sp)
                cursor.execute("SELECT * FROM user_profiles WHERE id = ?", (uid,))
                row = cursor.fetchone()

        if not row:
            try:
                cursor.execute("SELECT email, full_name FROM user_emails WHERE user_id = ?", (uid,))
                ue = cursor.fetchone()
                uname = f"user_{uid[:8]}"
                full_name = ue["full_name"] if ue and ue["full_name"] else uname
                cursor.execute("""
                    INSERT INTO user_profiles (id, username, full_name)
                    VALUES (?, ?, ?)
                    ON CONFLICT(id) DO NOTHING
                """, (uid, uname, full_name))
                conn.commit()
                cursor.execute("SELECT * FROM user_profiles WHERE id = ?", (uid,))
                row = cursor.fetchone()
            except Exception:
                pass

        if not row:
            raise HTTPException(status_code=404, detail="User not found.")

        profile_data = dict(row)

        # Count actual posts
        cursor.execute("SELECT COUNT(*) FROM user_saves WHERE user_id = ?", (uid,))
        p_row = cursor.fetchone()
        if p_row:
            profile_data["posts_count"] = p_row[0]

        # Dynamically compute accurate follower and following counts across graph and legacy tables
        try:
            cursor.execute("""
                SELECT COUNT(DISTINCT user_id) FROM (
                    SELECT follower_id AS user_id FROM user_follows_graph WHERE following_id = ? AND status = 'accepted'
                    UNION
                    SELECT user_id FROM user_follows WHERE target_user_id = ? OR target_user_id = ?
                )
            """, (uid, uid, profile_data.get("username", "")))
            fc = cursor.fetchone()
            if fc and fc[0] is not None:
                profile_data["followers_count"] = max(profile_data.get("followers_count", 0), fc[0])

            cursor.execute("""
                SELECT COUNT(DISTINCT target_id) FROM (
                    SELECT following_id AS target_id FROM user_follows_graph WHERE follower_id = ? AND status = 'accepted'
                    UNION
                    SELECT target_user_id AS target_id FROM user_follows WHERE user_id = ?
                )
            """, (uid, uid))
            gc = cursor.fetchone()
            if gc and gc[0] is not None:
                profile_data["following_count"] = max(profile_data.get("following_count", 0), gc[0])
        except Exception:
            pass

        is_following = False
        if isinstance(requester_id, str) and requester_id and requester_id != uid:
            cursor.execute("""
                SELECT 1 FROM user_follows_graph WHERE follower_id = ? AND following_id = ? AND status = 'accepted'
                UNION
                SELECT 1 FROM user_follows WHERE user_id = ? AND (target_user_id = ? OR target_user_id = ?)
            """, (requester_id, uid, requester_id, uid, profile_data.get("username", "")))
            if cursor.fetchone():
                is_following = True

        profile_data["is_following"] = is_following
        profile_data["is_self"] = bool(requester_id and requester_id == uid)

        return {"success": True, "profile": profile_data}


# --- 4. UPDATE USER PROFILE ---
@router.post("/profile")
async def update_user_profile(
    req: ProfileUpdateRequest,
    authorization: Optional[str] = Header(None)
):
    """Updates profile metadata, bio, avatar, and handles atomic username changes with ownership verification."""
    uid = req.id.strip()
    if not uid:
        raise HTTPException(status_code=400, detail="User ID is required.")

    # 1. Zero-Trust Identity Guard: Validate JWT token owner if Authorization header is present
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
        if SUPABASE_URL and SUPABASE_ADMIN_KEY:
            try:
                auth_url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/user"
                async with httpx.AsyncClient(timeout=8.0) as client:
                    res = await client.get(auth_url, headers={
                        "apikey": SUPABASE_ADMIN_KEY,
                        "Authorization": f"Bearer {token}"
                    })
                    if res.is_success:
                        auth_user = res.json()
                        auth_uid = auth_user.get("id")
                        if auth_uid and str(auth_uid) != uid:
                            raise HTTPException(status_code=403, detail="Forbidden: You can only modify your own profile.")
            except HTTPException:
                raise
            except Exception as e:
                print(f"[ProfileAuth Warning]: {e}")

    init_user_db()
    with sqlite3.connect(SAVES_DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Ensure base profile row exists
        cursor.execute("SELECT id FROM user_profiles WHERE id = ?", (uid,))
        if not cursor.fetchone():
            initial_uname = clean_username(req.username) if req.username else f"user_{uid[:8]}_{int(time.time())}"
            cursor.execute("INSERT OR IGNORE INTO user_profiles (id, username) VALUES (?, ?)", (uid, initial_uname))

        # Handle username update if provided
        if req.username:
            uname = clean_username(req.username)
            is_valid, err_msg = validate_username(uname)
            if not is_valid:
                raise HTTPException(status_code=400, detail=err_msg)

            cursor.execute("SELECT id FROM user_profiles WHERE username = ? AND id <> ?", (uname, uid))
            if cursor.fetchone():
                raise HTTPException(status_code=409, detail=f"Username @{uname} is already taken.")

            cursor.execute("UPDATE user_profiles SET username = ? WHERE id = ?", (uname, uid))

        if req.full_name is not None:
            cursor.execute("UPDATE user_profiles SET full_name = ? WHERE id = ?", (req.full_name.strip(), uid))
        if req.bio is not None:
            cursor.execute("UPDATE user_profiles SET bio = ? WHERE id = ?", (req.bio[:250].strip(), uid))
        if req.website is not None:
            cursor.execute("UPDATE user_profiles SET website = ? WHERE id = ?", (req.website.strip(), uid))
        if req.avatar_url is not None:
            cursor.execute("UPDATE user_profiles SET avatar_url = ? WHERE id = ?", (req.avatar_url.strip(), uid))
        if req.cover_url is not None:
            cursor.execute("UPDATE user_profiles SET cover_url = ? WHERE id = ?", (req.cover_url.strip(), uid))
        if req.is_private is not None:
            cursor.execute("UPDATE user_profiles SET is_private = ? WHERE id = ?", (1 if req.is_private else 0, uid))

        cursor.execute("UPDATE user_profiles SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (uid,))
        conn.commit()

        cursor.execute("SELECT * FROM user_profiles WHERE id = ?", (uid,))
        row = cursor.fetchone()
        return {"success": True, "message": "Profile updated successfully.", "profile": dict(row) if row else {}}


# --- 5. FOLLOW USER (Atomic & Idempotent) ---
@router.post("/{target_id}/follow")
async def follow_user(target_id: str, req: FollowActionRequest):
    """Idempotently creates a follow relationship and triggers atomic counter updates."""
    follower_id = req.follower_id.strip()
    following_id = target_id.strip()

    if not follower_id or not following_id:
        raise HTTPException(status_code=400, detail="Follower ID and Following ID are required.")

    if follower_id == following_id:
        raise HTTPException(status_code=400, detail="Users cannot follow themselves.")

    init_user_db()
    with sqlite3.connect(SAVES_DB_PATH) as conn:
        # Ensure profiles exist for counter integrity
        for uid in (follower_id, following_id):
            cursor = conn.cursor()
            cursor.execute("SELECT id, username FROM user_profiles WHERE id = ?", (uid,))
            existing = cursor.fetchone()
            if not existing or (existing[1] and existing[1].startswith("user_")):
                sp = await fetch_supabase_profile(uid)
                if sp:
                    upsert_user_profile_data(conn, sp)
                elif not existing:
                    unique_handle = f"user_{uid[:8]}"
                    cursor.execute("INSERT OR IGNORE INTO user_profiles (id, username) VALUES (?, ?)", (uid, unique_handle))
                    conn.commit()

        conn.execute("""
            INSERT INTO user_follows_graph (follower_id, following_id, status, created_at)
            VALUES (?, ?, 'accepted', CURRENT_TIMESTAMP)
            ON CONFLICT(follower_id, following_id) DO UPDATE SET status = 'accepted'
        """, (follower_id, following_id))

        # Legacy sync table
        conn.execute("""
            INSERT INTO user_follows (user_id, target_user_id, created_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id, target_user_id) DO NOTHING
        """, (follower_id, following_id))
        conn.commit()

        # Fetch new counts
        cursor = conn.cursor()
        cursor.execute("SELECT followers_count FROM user_profiles WHERE id = ?", (following_id,))
        f_row = cursor.fetchone()
        followers_count = f_row[0] if f_row else 1

    return {
        "success": True,
        "is_following": True,
        "follower_id": follower_id,
        "following_id": following_id,
        "followers_count": followers_count,
        "message": f"Successfully followed user {following_id}."
    }


# --- 6. UNFOLLOW USER (Atomic) ---
@router.post("/{target_id}/unfollow")
@router.delete("/{target_id}/follow")
async def unfollow_user(target_id: str, req: FollowActionRequest):
    """Removes a follow edge and atomically decrements counters."""
    follower_id = req.follower_id.strip()
    following_id = target_id.strip()

    if not follower_id or not following_id:
        raise HTTPException(status_code=400, detail="Follower ID and Following ID are required.")

    init_user_db()
    with sqlite3.connect(SAVES_DB_PATH) as conn:
        conn.execute("DELETE FROM user_follows_graph WHERE follower_id = ? AND following_id = ?", (follower_id, following_id))
        conn.execute("DELETE FROM user_follows WHERE user_id = ? AND target_user_id = ?", (follower_id, following_id))
        conn.commit()

        cursor = conn.cursor()
        cursor.execute("SELECT followers_count FROM user_profiles WHERE id = ?", (following_id,))
        f_row = cursor.fetchone()
        followers_count = f_row[0] if f_row else 0

    return {
        "success": True,
        "is_following": False,
        "follower_id": follower_id,
        "following_id": following_id,
        "followers_count": followers_count,
        "message": f"Successfully unfollowed user {following_id}."
    }


# --- 7. GET FOLLOWERS LIST (Cursor Paginated) ---
# --- 7. GET FOLLOWERS LIST (Cursor Paginated) ---
@router.get("/{target_id}/followers")
async def get_user_followers(
    target_id: str,
    limit: int = Query(20, ge=1, le=100),
    cursor: Optional[str] = Query(None, description="ISO timestamp cursor for pagination")
):
    """Returns cursor-paginated list of followers with full profile cards."""
    tid = target_id.strip()
    if not isinstance(limit, int):
        try:
            limit = int(getattr(limit, "default", 20))
        except Exception:
            limit = 20
    if not isinstance(cursor, str):
        cursor = None
    init_user_db()
    with sqlite3.connect(SAVES_DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor_obj = conn.cursor()

        # Resolve tid to UUID if target_id was passed as a handle
        raw_handle = tid.lstrip('@')
        is_uuid = bool(re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', tid, re.I))
        if not is_uuid:
            cursor_obj.execute("SELECT id FROM user_profiles WHERE username = ? COLLATE NOCASE", (raw_handle,))
            row = cursor_obj.fetchone()
            if row and row[0]:
                tid = row[0]
            else:
                sp = await fetch_supabase_profile(raw_handle)
                if sp and sp.get("id"):
                    tid = sp["id"]
                    upsert_user_profile_data(conn, sp)

        if cursor:
            query = """
                SELECT COALESCE(p.id, f_ids.follower_id) as id,
                       COALESCE(p.username, '') as username,
                       COALESCE(p.full_name, '') as full_name,
                       COALESCE(p.avatar_url, '') as avatar_url,
                       COALESCE(p.is_verified, 0) as is_verified,
                       COALESCE(p.is_pro, 0) as is_pro,
                       COALESCE(p.bio, '') as bio,
                       f_ids.followed_at
                FROM (
                    SELECT follower_id, created_at as followed_at
                    FROM user_follows_graph
                    WHERE following_id = ? AND created_at < ?
                    UNION
                    SELECT user_id as follower_id, created_at as followed_at
                    FROM user_follows
                    WHERE (target_user_id = ? OR target_user_id = ?) AND created_at < ?
                ) f_ids
                LEFT JOIN user_profiles p ON f_ids.follower_id = p.id
                ORDER BY f_ids.followed_at DESC
                LIMIT ?
            """
            cursor_obj.execute(query, (tid, cursor, tid, raw_handle, cursor, limit + 1))
        else:
            query = """
                SELECT COALESCE(p.id, f_ids.follower_id) as id,
                       COALESCE(p.username, '') as username,
                       COALESCE(p.full_name, '') as full_name,
                       COALESCE(p.avatar_url, '') as avatar_url,
                       COALESCE(p.is_verified, 0) as is_verified,
                       COALESCE(p.is_pro, 0) as is_pro,
                       COALESCE(p.bio, '') as bio,
                       f_ids.followed_at
                FROM (
                    SELECT follower_id, created_at as followed_at
                    FROM user_follows_graph
                    WHERE following_id = ?
                    UNION
                    SELECT user_id as follower_id, created_at as followed_at
                    FROM user_follows
                    WHERE target_user_id = ? OR target_user_id = ?
                ) f_ids
                LEFT JOIN user_profiles p ON f_ids.follower_id = p.id
                ORDER BY f_ids.followed_at DESC
                LIMIT ?
            """
            cursor_obj.execute(query, (tid, tid, raw_handle, limit + 1))

        rows = [dict(r) for r in cursor_obj.fetchall()]
        for r in rows:
            if not r.get("full_name") or not r.get("username") or r["username"].startswith("user_"):
                sp = await fetch_supabase_profile(r["id"])
                if sp:
                    upsert_user_profile_data(conn, sp)
                    if sp.get("username"):
                        r["username"] = sp["username"]
                    if sp.get("full_name"):
                        r["full_name"] = sp["full_name"]
                    if sp.get("avatar_url"):
                        r["avatar_url"] = sp["avatar_url"]

        has_more = len(rows) > limit
        followers = rows[:limit]
        next_cursor = followers[-1]["followed_at"] if has_more and followers else None

        return {
            "success": True,
            "target_id": tid,
            "followers": followers,
            "has_more": has_more,
            "next_cursor": next_cursor
        }


# --- 8. GET FOLLOWING LIST (Cursor Paginated) ---
@router.get("/{target_id}/following")
async def get_user_following(
    target_id: str,
    limit: int = Query(20, ge=1, le=100),
    cursor: Optional[str] = Query(None)
):
    """Returns cursor-paginated list of creators followed by target_id."""
    tid = target_id.strip()
    if not isinstance(limit, int):
        try:
            limit = int(getattr(limit, "default", 20))
        except Exception:
            limit = 20
    if not isinstance(cursor, str):
        cursor = None
    init_user_db()
    with sqlite3.connect(SAVES_DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor_obj = conn.cursor()

        # Resolve tid to UUID if target_id was passed as a handle
        raw_handle = tid.lstrip('@')
        is_uuid = bool(re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', tid, re.I))
        if not is_uuid:
            cursor_obj.execute("SELECT id FROM user_profiles WHERE username = ? COLLATE NOCASE", (raw_handle,))
            row = cursor_obj.fetchone()
            if row and row[0]:
                tid = row[0]
            else:
                sp = await fetch_supabase_profile(raw_handle)
                if sp and sp.get("id"):
                    tid = sp["id"]
                    upsert_user_profile_data(conn, sp)

        if cursor:
            query = """
                SELECT COALESCE(p.id, f_ids.following_id) as id,
                       COALESCE(p.username, '') as username,
                       COALESCE(p.full_name, '') as full_name,
                       COALESCE(p.avatar_url, '') as avatar_url,
                       COALESCE(p.is_verified, 0) as is_verified,
                       COALESCE(p.is_pro, 0) as is_pro,
                       COALESCE(p.bio, '') as bio,
                       f_ids.followed_at
                FROM (
                    SELECT following_id, created_at as followed_at
                    FROM user_follows_graph
                    WHERE follower_id = ? AND created_at < ?
                    UNION
                    SELECT target_user_id as following_id, created_at as followed_at
                    FROM user_follows
                    WHERE user_id = ? AND created_at < ?
                ) f_ids
                LEFT JOIN user_profiles p ON f_ids.following_id = p.id
                ORDER BY f_ids.followed_at DESC
                LIMIT ?
            """
            cursor_obj.execute(query, (tid, cursor, tid, cursor, limit + 1))
        else:
            query = """
                SELECT COALESCE(p.id, f_ids.following_id) as id,
                       COALESCE(p.username, '') as username,
                       COALESCE(p.full_name, '') as full_name,
                       COALESCE(p.avatar_url, '') as avatar_url,
                       COALESCE(p.is_verified, 0) as is_verified,
                       COALESCE(p.is_pro, 0) as is_pro,
                       COALESCE(p.bio, '') as bio,
                       f_ids.followed_at
                FROM (
                    SELECT following_id, created_at as followed_at
                    FROM user_follows_graph
                    WHERE follower_id = ?
                    UNION
                    SELECT target_user_id as following_id, created_at as followed_at
                    FROM user_follows
                    WHERE user_id = ?
                ) f_ids
                LEFT JOIN user_profiles p ON f_ids.following_id = p.id
                ORDER BY f_ids.followed_at DESC
                LIMIT ?
            """
            cursor_obj.execute(query, (tid, tid, limit + 1))

        rows = [dict(r) for r in cursor_obj.fetchall()]
        for r in rows:
            if not r.get("full_name") or not r.get("username") or r["username"].startswith("user_"):
                sp = await fetch_supabase_profile(r["id"])
                if sp:
                    upsert_user_profile_data(conn, sp)
                    if sp.get("username"):
                        r["username"] = sp["username"]
                    if sp.get("full_name"):
                        r["full_name"] = sp["full_name"]
                    if sp.get("avatar_url"):
                        r["avatar_url"] = sp["avatar_url"]

        has_more = len(rows) > limit
        following = rows[:limit]
        next_cursor = following[-1]["followed_at"] if has_more and following else None

        return {
            "success": True,
            "target_id": tid,
            "following": following,
            "has_more": has_more,
            "next_cursor": next_cursor
        }
