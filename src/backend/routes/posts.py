import os
import json
import time
import sqlite3
import uuid
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(tags=["posts"])

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
SAVES_DB_DIR = os.path.join(PROJECT_ROOT, "data")
SAVES_DB_PATH = os.path.join(SAVES_DB_DIR, "saves.db")

def init_saves_db():
    """Ensures SQLite saves and follows tables exist."""
    os.makedirs(SAVES_DB_DIR, exist_ok=True)
    with sqlite3.connect(SAVES_DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_saves (
                user_id TEXT NOT NULL,
                post_id TEXT NOT NULL,
                post_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, post_id)
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_user_saves_user ON user_saves(user_id);")
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
        conn.execute("""
            CREATE TABLE IF NOT EXISTS post_comments (
                id TEXT PRIMARY KEY,
                post_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                author_name TEXT,
                author_avatar TEXT,
                author_tier TEXT,
                content TEXT NOT NULL,
                parent_id TEXT,
                likes_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_comments_post ON post_comments(post_id);")
        conn.commit()


# Models
class SavePostRequest(BaseModel):
    user_id: str
    post_id: str
    saved: bool = True
    post_data: Optional[Dict[str, Any]] = None


class SyncSavesRequest(BaseModel):
    user_id: str
    saved_ids: List[str]
    posts: Optional[Dict[str, Any]] = None


class FollowUserRequest(BaseModel):
    user_id: str
    target_user_id: str
    is_following: bool = True
    creator_data: Optional[Dict[str, Any]] = None


class SyncFollowsRequest(BaseModel):
    user_id: str
    following: List[Dict[str, Any]] = []


class CommentCreateRequest(BaseModel):
    post_id: str
    user_id: str
    content: str
    author_name: Optional[str] = "Creator"
    author_avatar: Optional[str] = None
    author_tier: Optional[str] = "Member"
    parent_id: Optional[str] = None


class CommentLikeRequest(BaseModel):
    comment_id: str
    user_id: Optional[str] = "usr_current_user"


# --- SAVES & BOOKMARKS ---
@router.get("/saves")
async def get_user_saves(user_id: str = Query(..., description="User ID or identifier")):
    """Retrieves all permanently saved posts for a user from SQLite store."""
    uid = user_id.strip() if user_id else ""
    if not uid:
        return {"success": False, "saved_ids": [], "posts": {}}

    try:
        init_saves_db()
        saved_ids = []
        posts = {}
        with sqlite3.connect(SAVES_DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT post_id, post_data FROM user_saves WHERE user_id = ? ORDER BY created_at DESC",
                (uid,)
            )
            rows = cursor.fetchall()
            for row in rows:
                pid = str(row[0])
                saved_ids.append(pid)
                if row[1]:
                    try:
                        posts[pid] = json.loads(row[1])
                    except Exception:
                        pass
        return {"success": True, "user_id": uid, "saved_ids": saved_ids, "posts": posts}
    except Exception as e:
        return {"success": False, "error": str(e), "saved_ids": [], "posts": {}}


@router.post("/saves")
async def save_user_post(req: SavePostRequest):
    """Bookmarks or removes a post for a user in the SQLite store."""
    uid = req.user_id.strip()
    pid = req.post_id.strip()
    if not uid or not pid:
        raise HTTPException(status_code=400, detail="user_id and post_id are required.")

    try:
        init_saves_db()
        with sqlite3.connect(SAVES_DB_PATH) as conn:
            if req.saved:
                post_json = json.dumps(req.post_data) if req.post_data else None
                conn.execute(
                    """
                    INSERT INTO user_saves (user_id, post_id, post_data, created_at)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(user_id, post_id) DO UPDATE SET
                        post_data = COALESCE(excluded.post_data, user_saves.post_data),
                        created_at = CURRENT_TIMESTAMP
                    """,
                    (uid, pid, post_json)
                )
            else:
                conn.execute("DELETE FROM user_saves WHERE user_id = ? AND post_id = ?", (uid, pid))
            conn.commit()
        return {"success": True, "user_id": uid, "post_id": pid, "saved": req.saved}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@router.post("/saves/sync")
async def sync_user_saves(req: SyncSavesRequest):
    """Batch synchronizes a user's client-side saves into the backend SQLite store."""
    uid = req.user_id.strip()
    if not uid:
        raise HTTPException(status_code=400, detail="user_id is required.")

    try:
        init_saves_db()
        with sqlite3.connect(SAVES_DB_PATH) as conn:
            for pid in req.saved_ids:
                pid_str = str(pid).strip()
                if not pid_str:
                    continue
                p_data = (req.posts or {}).get(pid_str)
                post_json = json.dumps(p_data) if p_data else None
                conn.execute(
                    """
                    INSERT INTO user_saves (user_id, post_id, post_data, created_at)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(user_id, post_id) DO UPDATE SET
                        post_data = COALESCE(excluded.post_data, user_saves.post_data)
                    """,
                    (uid, pid_str, post_json)
                )
            conn.commit()
        return {"success": True, "user_id": uid, "synced_count": len(req.saved_ids)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database sync error: {e}")


# --- CREATOR FOLLOWS ---
@router.get("/follows")
async def get_user_follows(user_id: str = Query(..., description="User ID or identifier")):
    """Retrieves all followed creators stored for a user."""
    uid = user_id.strip() if user_id else ""
    if not uid:
        return {"success": False, "following": []}

    try:
        init_saves_db()
        following = []
        with sqlite3.connect(SAVES_DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT target_user_id, creator_data FROM user_follows WHERE user_id = ? ORDER BY created_at DESC", (uid,))
            for row in cursor.fetchall():
                tid = str(row[0])
                c_data = {}
                if row[1]:
                    try:
                        c_data = json.loads(row[1])
                    except Exception:
                        pass
                if not c_data.get("userId"):
                    c_data["userId"] = tid
                following.append(c_data)
        return {"success": True, "user_id": uid, "following": following}
    except Exception as e:
        return {"success": False, "error": str(e), "following": []}


@router.get("/follows/stats")
async def get_user_follow_stats(user_id: str = Query(..., description="User ID"), username: Optional[str] = Query(None)):
    """Retrieves follower and following counts for a user."""
    uid = user_id.strip() if user_id else ""
    uname = (username or "").strip().lstrip("@")
    try:
        init_saves_db()
        followers_count = 0
        following_count = 0
        with sqlite3.connect(SAVES_DB_PATH) as conn:
            cursor = conn.cursor()
            if uid and uname:
                cursor.execute("SELECT COUNT(DISTINCT user_id) FROM user_follows WHERE target_user_id = ? OR target_user_id = ?", (uid, uname))
            elif uid:
                cursor.execute("SELECT COUNT(DISTINCT user_id) FROM user_follows WHERE target_user_id = ?", (uid,))
            else:
                cursor.execute("SELECT COUNT(DISTINCT user_id) FROM user_follows WHERE target_user_id = ?", (uname,))
            f_row = cursor.fetchone()
            if f_row:
                followers_count = f_row[0]

            if uid:
                cursor.execute("SELECT COUNT(DISTINCT target_user_id) FROM user_follows WHERE user_id = ?", (uid,))
                g_row = cursor.fetchone()
                if g_row:
                    following_count = g_row[0]

        return {"success": True, "user_id": uid, "username": uname, "followers_count": followers_count, "following_count": following_count}
    except Exception as e:
        return {"success": False, "error": str(e), "followers_count": 0, "following_count": 0}


@router.post("/follows")
async def toggle_user_follow(req: FollowUserRequest):
    """Follows or unfollows a creator."""
    uid = req.user_id.strip()
    tid = req.target_user_id.strip()
    if not uid or not tid:
        raise HTTPException(status_code=400, detail="user_id and target_user_id are required.")

    try:
        init_saves_db()
        with sqlite3.connect(SAVES_DB_PATH) as conn:
            if req.is_following:
                c_json = json.dumps(req.creator_data) if req.creator_data else None
                conn.execute(
                    """
                    INSERT INTO user_follows (user_id, target_user_id, creator_data, created_at)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(user_id, target_user_id) DO UPDATE SET
                        creator_data = COALESCE(excluded.creator_data, user_follows.creator_data)
                    """,
                    (uid, tid, c_json)
                )
            else:
                conn.execute("DELETE FROM user_follows WHERE user_id = ? AND target_user_id = ?", (uid, tid))
            conn.commit()
        return {"success": True, "user_id": uid, "target_user_id": tid, "is_following": req.is_following}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


# --- COMMENTS & THREADS ---
@router.get("/comments")
async def get_comments(post_id: str = Query(...)):
    """Fetches all comments and replies for a specific post."""
    try:
        init_saves_db()
        comments = []
        with sqlite3.connect(SAVES_DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM post_comments WHERE post_id = ? ORDER BY created_at ASC", (post_id,))
            for row in cursor.fetchall():
                comments.append(dict(row))
        return {"success": True, "post_id": post_id, "comments": comments}
    except Exception as e:
        return {"success": False, "comments": [], "error": str(e)}


@router.post("/comments")
async def post_comment(req: CommentCreateRequest):
    """Creates a new comment or nested reply."""
    try:
        init_saves_db()
        cid = f"cmt_{int(time.time())}_{uuid.uuid4().hex[:6]}"
        with sqlite3.connect(SAVES_DB_PATH) as conn:
            conn.execute(
                """
                INSERT INTO post_comments (id, post_id, user_id, author_name, author_avatar, author_tier, content, parent_id, likes_count, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
                """,
                (cid, req.post_id, req.user_id, req.author_name, req.author_avatar, req.author_tier, req.content, req.parent_id)
            )
            conn.commit()
        return {
            "success": True,
            "comment": {
                "id": cid,
                "post_id": req.post_id,
                "user_id": req.user_id,
                "author_name": req.author_name,
                "author_avatar": req.author_avatar,
                "author_tier": req.author_tier,
                "content": req.content,
                "parent_id": req.parent_id,
                "likes_count": 0,
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/comments/like")
async def like_comment(req: CommentLikeRequest):
    """Increments like count on a comment."""
    try:
        init_saves_db()
        with sqlite3.connect(SAVES_DB_PATH) as conn:
            conn.execute("UPDATE post_comments SET likes_count = likes_count + 1 WHERE id = ?", (req.comment_id,))
            conn.commit()
        return {"success": True, "comment_id": req.comment_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/comments/delete")
async def delete_comment(comment_id: str = Query(...), user_id: Optional[str] = Query(None)):
    """Deletes a comment and its child replies."""
    try:
        init_saves_db()
        with sqlite3.connect(SAVES_DB_PATH) as conn:
            conn.execute("DELETE FROM post_comments WHERE id = ? OR parent_id = ?", (comment_id, comment_id))
            conn.commit()
        return {"success": True, "comment_id": comment_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
