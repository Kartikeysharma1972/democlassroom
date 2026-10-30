"""Build a signed LMS sign-in link, the way the LMS builds one.

    python make-lms-link.py <email> [name] [school] [base-url]

The secret comes from LMS_SHARED_SECRET, or backend/.env if it is set there.
It must be the same string the LMS uses. No password is involved: the
signature is what proves the LMS vouched for this address, and the link is
only good for a couple of minutes.

The LMS builds the same thing in PHP:

    $sig = hash_hmac('sha256', $email . '|' . $ts, $secret);
"""
import hashlib
import hmac
import os
import sys
import time
from pathlib import Path
from urllib.parse import quote


def shared_secret() -> str:
    secret = os.environ.get("LMS_SHARED_SECRET", "")
    if secret:
        return secret
    env = Path(__file__).parent / "backend" / ".env"
    if env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            if line.startswith("LMS_SHARED_SECRET="):
                return line.split("=", 1)[1].strip()
    return ""


if len(sys.argv) < 2:
    print(__doc__)
    raise SystemExit(1)

secret = shared_secret()
if not secret:
    print("No LMS_SHARED_SECRET found - set it in the environment or backend/.env")
    raise SystemExit(1)

email = sys.argv[1].strip().lower()
name = sys.argv[2] if len(sys.argv) > 2 else ""
school = sys.argv[3] if len(sys.argv) > 3 else ""
base = sys.argv[4] if len(sys.argv) > 4 else "http://localhost:8001"

ts = int(time.time())
sig = hmac.new(secret.encode(), f"{email}|{ts}".encode(), hashlib.sha256).hexdigest()

parts = [f"email={quote(email)}", f"ts={ts}", f"sig={sig}"]
if name:
    parts.append("name=" + quote(name))
if school:
    parts.append("school=" + quote(school))

print(base.rstrip("/") + "/login/?" + "&".join(parts))
print()
print(f"Valid for 2 minutes, until {time.strftime('%H:%M:%S', time.localtime(ts + 120))}.")
