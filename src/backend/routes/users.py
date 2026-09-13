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
SAVES_DB_DIR = os.path.join(PROJECT_ROOT, "data")
SAVES_DB_PATH = os.path.join(SAVES_DB_DIR, "saves.db")

# Supabase Server-Side Config
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
SUPABASE_ADMIN_KEY = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY

RESERVED_USERNAMES = {
    "admin", "administrator", "superadmin", "support", "help", "root", "xtrapath", "xtraanim",
    "api", "auth", "login", "signup", "register", "explore", "reels", "settings", "terms",
    "privacy", "billing", "store", "dashboard", "null", "undefined", "official", "verify",
    "profile", "feed", "studio", "about", "contact", "security", "jobs", "press"
}

USERNAME_REGEX = re.compile(r"^[a-zA-Z0-9._]{3,30}$")

def init_user_db():
    """Initializes high-concurrency tables and atomic triggers for profiles and follows in SQLite."""
    os.makedirs(SAVES_DB_DIR, exist_ok=True)
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
        cursor.execute("SELECT * FROM user_profiles WHERE username = ?", (uname,))
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

        # Check is_following state for requester
        is_following = False
        if requester_id and requester_id != profile_data["id"]:
            cursor.execute("SELECT 1 FROM user_follows_graph WHERE follower_id = ? AND following_id = ? AND status = 'accepted'", (requester_id, profile_data["id"]))
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

        is_following = False
        if requester_id and requester_id != uid:
            cursor.execute("SELECT 1 FROM user_follows_graph WHERE follower_id = ? AND following_id = ?", (requester_id, uid))
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
            cursor.execute("SELECT id FROM user_profiles WHERE id = ?", (uid,))
            if not cursor.fetchone():
                unique_handle = f"user_{uid[:8]}_{int(time.time())}"
                cursor.execute("INSERT OR IGNORE INTO user_profiles (id, username) VALUES (?, ?)", (uid, unique_handle))

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
@router.get("/{target_id}/followers")
async def get_user_followers(
    target_id: str,
    limit: int = Query(20, ge=1, le=100),
    cursor: Optional[str] = Query(None, description="ISO timestamp cursor for pagination")
):
    """Returns cursor-paginated list of followers with full profile cards."""
    tid = target_id.strip()
    init_user_db()
    with sqlite3.connect(SAVES_DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor_obj = conn.cursor()

        if cursor:
            query = """
                SELECT p.id, p.username, p.full_name, p.avatar_url, p.is_verified, p.is_pro, p.bio, g.created_at as followed_at
                FROM user_follows_graph g
                JOIN user_profiles p ON g.follower_id = p.id
                WHERE g.following_id = ? AND g.created_at < ?
                ORDER BY g.created_at DESC
                LIMIT ?
            """
            cursor_obj.execute(query, (tid, cursor, limit + 1))
        else:
            query = """
                SELECT p.id, p.username, p.full_name, p.avatar_url, p.is_verified, p.is_pro, p.bio, g.created_at as followed_at
                FROM user_follows_graph g
                JOIN user_profiles p ON g.follower_id = p.id
                WHERE g.following_id = ?
                ORDER BY g.created_at DESC
                LIMIT ?
            """
            cursor_obj.execute(query, (tid, limit + 1))

        rows = [dict(r) for r in cursor_obj.fetchall()]
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
    init_user_db()
    with sqlite3.connect(SAVES_DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor_obj = conn.cursor()

        if cursor:
            query = """
                SELECT p.id, p.username, p.full_name, p.avatar_url, p.is_verified, p.is_pro, p.bio, g.created_at as followed_at
                FROM user_follows_graph g
                JOIN user_profiles p ON g.following_id = p.id
                WHERE g.follower_id = ? AND g.created_at < ?
                ORDER BY g.created_at DESC
                LIMIT ?
            """
            cursor_obj.execute(query, (tid, cursor, limit + 1))
        else:
            query = """
                SELECT p.id, p.username, p.full_name, p.avatar_url, p.is_verified, p.is_pro, p.bio, g.created_at as followed_at
                FROM user_follows_graph g
                JOIN user_profiles p ON g.following_id = p.id
                WHERE g.follower_id = ?
                ORDER BY g.created_at DESC
                LIMIT ?
            """
            cursor_obj.execute(query, (tid, limit + 1))

        rows = [dict(r) for r in cursor_obj.fetchall()]
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
