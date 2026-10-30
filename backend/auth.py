import hashlib
import hmac
import os
import re
import secrets
import json
import time
import sqlite3
from pathlib import Path

# Same file as database.py — see the note there about CLASSROOM_DB_PATH.
DB_PATH = Path(os.environ.get("CLASSROOM_DB_PATH") or Path(__file__).parent / "classroomai.db")
TOKEN_EXPIRY = 60 * 60 * 24 * 30  # 30 days


def _get_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_auth_tables():
    conn = _get_conn()
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            school_name TEXT DEFAULT '',
            role TEXT DEFAULT 'teacher',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS auth_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    ''')
    conn.commit()
    conn.close()


def _md5(value: str) -> str:
    return hashlib.md5(value.encode()).hexdigest()


def _hash_password(password: str, salt: str) -> str:
    return hashlib.sha256((password + salt).encode()).hexdigest()


def register_user(name: str, email: str, password: str, school_name: str = "") -> dict:
    email = email.strip().lower()
    if len(password) < 6:
        return {"success": False, "error": "Password must be at least 6 characters"}
    if not name.strip():
        return {"success": False, "error": "Name is required"}
    if not email or "@" not in email:
        return {"success": False, "error": "Valid email is required"}

    conn = _get_conn()
    c = conn.cursor()

    c.execute("SELECT id FROM users WHERE email = ?", (email,))
    if c.fetchone():
        conn.close()
        return {"success": False, "error": "An account with this email already exists"}

    salt = secrets.token_hex(16)
    password_hash = _hash_password(password, salt)

    c.execute(
        "INSERT INTO users (name, email, password_hash, salt, school_name) VALUES (?, ?, ?, ?, ?)",
        (name.strip(), email, password_hash, salt, school_name.strip())
    )
    conn.commit()
    user_id = c.lastrowid

    token = _create_token(conn, user_id)
    conn.close()

    return {
        "success": True,
        "token": token,
        "user": {"id": user_id, "name": name.strip(), "email": email, "school_name": school_name.strip()}
    }


def _credential_matches(supplied: str, row) -> bool:
    """True when `supplied` unlocks `row`, whether it is the password or its MD5.

    An account the LMS created holds the MD5 as its secret, because that is all
    the link ever carried. Accepting the MD5 of whatever was typed as well means
    the same teacher can also sign in on the form with their real password.
    """
    salt = row["salt"]
    stored = row["password_hash"]
    return (
        _hash_password(supplied, salt) == stored
        or _hash_password(_md5(supplied), salt) == stored
    )


# The LMS signs each link with a secret both sides hold. Nothing about the
# teacher's password travels, and a link is only good for a couple of minutes.
#
# Read when used, not at import: this module is imported before main.py calls
# load_dotenv(), so reading it here at import time would always find nothing.
def _lms_secret() -> str:
    return os.environ.get("LMS_SHARED_SECRET", "")


def _lms_max_age() -> int:
    try:
        return int(os.environ.get("LMS_LINK_MAX_AGE", "120"))
    except ValueError:
        return 120

_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def verify_lms_link(email: str, ts, sig: str) -> dict:
    """Check an LMS link and return the teacher it names.

    The LMS builds the signature as

        hash_hmac('sha256', email + '|' + ts, secret)

    so the same string is rebuilt here and compared in constant time. A link
    older than LMS_LINK_MAX_AGE seconds is refused, which is what stops one
    being saved and reused later.
    """
    secret = _lms_secret()
    if not secret:
        return {"success": False, "error": "LMS sign-in is not configured on this server"}

    email = (email or "").strip().lower()
    sig = (sig or "").strip().lower()

    try:
        ts = int(ts)
    except (TypeError, ValueError):
        return {"success": False, "error": "Invalid or expired link"}

    if not _EMAIL.match(email) or not sig:
        return {"success": False, "error": "Invalid or expired link"}

    expected = hmac.new(
        secret.encode(),
        f"{email}|{ts}".encode(),
        hashlib.sha256,
    ).hexdigest()

    # compare_digest, not ==, so a wrong signature cannot be guessed a
    # character at a time from how long the comparison takes.
    if not hmac.compare_digest(expected, sig):
        return {"success": False, "error": "Invalid or expired link"}

    if abs(time.time() - ts) > _lms_max_age():
        return {"success": False, "error": "This link has expired. Please open it from the LMS again."}

    return {"success": True, "email": email}


def lms_sign_in(email: str, ts, sig: str, name: str = "", school_name: str = "") -> dict:
    """Sign a teacher in from a signed LMS link, making their account if needed."""
    checked = verify_lms_link(email, ts, sig)
    if not checked["success"]:
        return checked

    email = checked["email"]
    conn = _get_conn()
    c = conn.cursor()

    c.execute("SELECT id, name, email, school_name FROM users WHERE email = ?", (email,))
    row = c.fetchone()

    if row:
        c.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", (row["id"],))
        conn.commit()
        token = _create_token(conn, row["id"])
        user = {"id": row["id"], "name": row["name"], "email": row["email"], "school_name": row["school_name"]}
        conn.close()
        return {"success": True, "token": token, "user": user, "created": False}

    # First arrival. There is no password to store - this teacher only ever
    # reaches us through a signed link - so the slot gets an unguessable value
    # rather than anything derived from what the link carried.
    salt = secrets.token_hex(16)
    display = (name or "").strip() or email.split("@")[0]
    c.execute(
        "INSERT INTO users (name, email, password_hash, salt, school_name, last_login) "
        "VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
        (display, email, _hash_password(secrets.token_urlsafe(32), salt), salt, (school_name or "").strip()),
    )
    conn.commit()
    user_id = c.lastrowid
    token = _create_token(conn, user_id)
    conn.close()

    return {
        "success": True,
        "token": token,
        "user": {"id": user_id, "name": display, "email": email, "school_name": (school_name or "").strip()},
        "created": True,
    }


def lms_login(username: str, password: str = "", name: str = "", school_name: str = "",
              password_md5: str = "") -> dict:
    """Sign in whoever the LMS sent, making them an account on first arrival.

    Teachers live in the LMS, not here, so the first time one follows the link
    from it there is nobody to sign in as. Rather than turn them away, their
    account is created from what the link carried. On every later visit it is
    an ordinary sign-in, so a wrong password is still refused - the account
    only appears once.

    The usual sign-up rules (an address with an @, six characters) do not apply:
    the LMS decides what a username and password look like, not us.
    """
    username = (username or "").strip().lower()

    # The LMS may send the password already hashed so it never travels in the
    # clear. MD5 cannot be reversed, and it does not need to be: the hash is
    # simply what we treat as the secret, and the same hash arrives every time.
    credential = (password_md5 or "").strip().lower() or (password or "")
    if not username or not credential:
        return {"success": False, "error": "Missing username or password"}

    conn = _get_conn()
    c = conn.cursor()

    c.execute("SELECT id, name, email, password_hash, salt, school_name FROM users WHERE email = ?", (username,))
    row = c.fetchone()

    if row:
        if not _credential_matches(credential, row):
            conn.close()
            return {"success": False, "error": "Invalid username or password"}

        c.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", (row["id"],))
        conn.commit()
        token = _create_token(conn, row["id"])
        user = {"id": row["id"], "name": row["name"], "email": row["email"], "school_name": row["school_name"]}
        conn.close()
        return {"success": True, "token": token, "user": user, "created": False}

    salt = secrets.token_hex(16)
    display = (name or "").strip() or username.split("@")[0]
    c.execute(
        "INSERT INTO users (name, email, password_hash, salt, school_name, last_login) "
        "VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
        (display, username, _hash_password(credential, salt), salt, (school_name or "").strip()),
    )
    conn.commit()
    user_id = c.lastrowid
    token = _create_token(conn, user_id)
    conn.close()

    return {
        "success": True,
        "token": token,
        "user": {"id": user_id, "name": display, "email": username, "school_name": (school_name or "").strip()},
        "created": True,
    }


def login_user(email: str, password: str) -> dict:
    email = email.strip().lower()
    conn = _get_conn()
    c = conn.cursor()

    c.execute("SELECT id, name, email, password_hash, salt, school_name FROM users WHERE email = ?", (email,))
    row = c.fetchone()

    if not row:
        conn.close()
        return {"success": False, "error": "Invalid email or password"}

    if not _credential_matches(password, row):
        conn.close()
        return {"success": False, "error": "Invalid email or password"}

    c.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", (row["id"],))
    conn.commit()

    token = _create_token(conn, row["id"])
    conn.close()

    return {
        "success": True,
        "token": token,
        "user": {"id": row["id"], "name": row["name"], "email": row["email"], "school_name": row["school_name"]}
    }


def _create_token(conn, user_id: int) -> str:
    token = secrets.token_urlsafe(48)
    expires_at = int(time.time()) + TOKEN_EXPIRY
    c = conn.cursor()
    c.execute(
        "INSERT INTO auth_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
        (user_id, token, expires_at)
    )
    conn.commit()
    return token


def verify_token(token: str) -> dict | None:
    if not token:
        return None
    conn = _get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT u.id, u.name, u.email, u.school_name, t.expires_at
        FROM auth_tokens t JOIN users u ON t.user_id = u.id
        WHERE t.token = ?
    """, (token,))
    row = c.fetchone()
    conn.close()

    if not row:
        return None
    if int(time.time()) > row["expires_at"]:
        return None

    return {"id": row["id"], "name": row["name"], "email": row["email"], "school_name": row["school_name"]}


def logout_user(token: str):
    conn = _get_conn()
    c = conn.cursor()
    c.execute("DELETE FROM auth_tokens WHERE token = ?", (token,))
    conn.commit()
    conn.close()


init_auth_tables()
