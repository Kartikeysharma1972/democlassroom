"""Build an LMS sign-in link, the way the LMS will build one.

    python make-lms-link.py <username> <password> [name] [school] [base-url]

Prints a link that opens Classroom AI already signed in. The password is
never in it - only its MD5, which is what the LMS sends.
"""
import hashlib
import sys
from urllib.parse import quote

if len(sys.argv) < 3:
    print(__doc__)
    raise SystemExit(1)

username, password = sys.argv[1], sys.argv[2]
name = sys.argv[3] if len(sys.argv) > 3 else ""
school = sys.argv[4] if len(sys.argv) > 4 else ""
base = sys.argv[5] if len(sys.argv) > 5 else "http://localhost:8001"

parts = [
    "username=" + quote(username),
    "password_md5=" + hashlib.md5(password.encode()).hexdigest(),
]
if name:
    parts.append("name=" + quote(name))
if school:
    parts.append("school=" + quote(school))

print(base.rstrip("/") + "/login/?" + "&".join(parts))
