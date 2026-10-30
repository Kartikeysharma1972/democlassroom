# ClassroomAI

An AI teaching assistant for K-12 classrooms, built by Codevidhya. Teachers
pick a grade, a subject and a chapter, and get back a lesson plan, worksheet,
question paper or set of class activities. It also includes language tools and
a code debugger for computer-science lessons.

This repository is the demo build prepared for deployment. It holds two
services:

| Service | Who it is for | Port |
|---|---|---|
| **Classroom AI** (repo root) | Teachers | 8001 |
| **Admin portal** (`admin-portal/`) | Principals and coordinators | 5002 |

They share one SQLite file: Classroom AI writes it, the admin portal only
reads it. `admin-portal/README.md` covers that side on its own.

## Deploying both

```bash
cp .env.example .env     # fill in GROQ_API_KEY and ADMIN_JWT_SECRET
docker compose up --build
```

Classroom AI comes up on 8001 and the admin portal on 5002.

Two of the settings are compiled into the browser bundles rather than read at
run time, so **changing them needs a rebuild, not a restart**:

| Setting | What it is |
|---|---|
| `PUBLIC_CLASSROOM_URL` | Where Classroom AI answers, e.g. `https://aitutor.codevidhya.com` |
| `PUBLIC_ADMIN_URL` | Where the admin portal answers; the Admin box on the sign-in page links here |

Leave `PUBLIC_ADMIN_URL` unset and the Admin box says the portal is not set up
rather than linking to an address that is not there.

Two volumes must survive a redeploy or data is lost: `classroom-data` holds
every teacher account and everything they have generated, and `admin-data`
holds the admin accounts.

### Signing in

One page at `/login` asks whether a teacher or an admin is signing in, and the
teacher side has both a login and a sign-up tab.

An LMS links straight in, with no form in the way:

```
/login/?username=<lms username>&password_md5=<md5 of their password>
```

The password itself never appears in the URL. Nothing is decrypted - MD5 is
one way - the hash is simply what the account's secret is set to, and the same
hash arrives on every visit. A teacher with no account here yet gets one made
on first arrival, so every LMS user can follow the link. `name` and `school`
may be added to the link and are used once, to give that new account something
readable.

`make-lms-link.py` builds one of these links for testing:

```bash
python make-lms-link.py rahul.mehta Teach@2026 "Rahul Mehta" "DPS Jaipur" https://aitutor.codevidhya.com
```

Without those parameters the page shows the ordinary sign-in, so a link shared
by hand still asks for a password.

## The tools

| Tool | What it produces |
|---|---|
| Lesson Planner | Full plan with objectives, activities and assessment |
| Worksheet Generator | Mixed question types with a complete answer key |
| Question Paper | Sectioned paper with marks distribution |
| Class Activities | Group work and projects with materials and rubrics |
| Vocabulary Builder | Word lists with meanings and usage |
| Reading Comprehension | Passages with graded questions |
| Code Debugger | Finds and explains bugs in 19 languages |
| Feedback Writer | Report-card style comments |

Output can be generated in regional languages, not only English.

## Architecture

One process serves everything. The React frontend is built to static files and
served by the FastAPI backend, so there is a single port and no CORS to
configure in production.

```
frontend/  React + Vite   -> built into frontend/dist
backend/   FastAPI        -> serves the API and frontend/dist on one port
```

The language models run on Groq. The backend holds a pool of API keys and
rotates to the next one when a key hits its rate limit.

## Deploying with Docker

The `Dockerfile` builds the frontend and runs the backend in one image.

```bash
docker build -t classroomai .
docker run -d --name classroomai -p 8001:8001 \
  -e GROQ_API_KEYS="key1,key2,key3" \
  -e GROQ_MODEL="openai/gpt-oss-120b" \
  classroomai
```

The app then answers on port 8001. Put it behind a reverse proxy that
terminates TLS — the app itself speaks plain HTTP and expects the proxy to
handle certificates.

An nginx server block looks like this:

```nginx
server {
    listen 443 ssl;
    server_name classroom.example.com;

    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;          # generations take 10-20 seconds
    }
}
```

The `proxy_read_timeout` matters: a generation takes 10 to 20 seconds, and the
default 60 seconds is enough but leaves little margin on a slow day.

## Deploying without Docker

```bash
./build.sh                       # installs both sides and builds the frontend
cd backend
uvicorn main:app --host 0.0.0.0 --port 8001
```

Requires Python 3.11 and Node 20.

`render.yaml` is included for deploying to Render.

## Configuration

Set these in the environment, or in `backend/.env` for local work. Copy
`backend/.env.example` to start.

| Variable | Required | Notes |
|---|---|---|
| `GROQ_API_KEYS` | yes | Comma-separated pool. The backend rotates through them on rate limits. |
| `GROQ_API_KEY` | — | Single-key alternative if you only have one. |
| `GROQ_MODEL` | no | Defaults to `openai/gpt-oss-120b`. |
| `PORT` | no | Defaults to 8001. |
| `CORS_ORIGINS` | no | Only needed if the frontend is served from a different origin. |
| `WEBSHARE_PROXY_USERNAME` / `WEBSHARE_PROXY_PASSWORD` | no | Proxy for YouTube transcript fetching, if your host's IP is blocked. |
| `ANTHROPIC_API_KEY` | no | Arms the paid fallback below. Leave it unset and the app behaves exactly as before. |
| `ANTHROPIC_MODEL` | no | Defaults to `claude-opus-5-5`. |
| `ANTHROPIC_EFFORT` | no | Defaults to `medium`. |
| `VITE_REQUIRE_LOGIN` | no | Build-time. Sign-in is required by default; set to `false` to open the app without it. |

Never commit real keys. `.env` is gitignored; `.env.example` is the template.

## Who the app thinks you are

The app is normally opened from the Codevidhya portal or an LMS, which have
already signed the person in. They arrive with `?cv_handoff=<base64 JSON>`:

```json
{ "token": "<optional session token>",
  "user": { "id": "4812", "name": "Priya Sharma",
            "email": "priya@school.edu", "school_name": "DPS Jaipur" } }
```

`user.id` must be the LMS's own stable id for that person - not their name or
email. It is what scopes saved history, so each teacher sees their own work and
nobody else's. Sent without one, the app falls back to a shared demo identity
rather than filing the work under a guessed key.

Opening the app any other way means signing in: Classroom AI has its own page
at `/login`, wired to the accounts in this app's database, and a cold visit to
any route lands there. Accounts are created through `POST /api/auth/register`.
Build with `VITE_REQUIRE_LOGIN=false` to drop the requirement.

## When the keys run out

Every Groq key is tried before a request is allowed to fail. If all of them
answer with a rate limit - a whole class generating at the same moment - and
`ANTHROPIC_API_KEY` is set, the request is reissued against the Anthropic API
rather than returning an error.

This is a paid path and it sits behind the entire pool on purpose: Groq serves
every ordinary request, and only the overflow reaches it. At `claude-opus-5-5`
a lesson plan costs roughly $0.10, a worksheet about $0.07. Leaving the key
unset disables the fallback entirely.

## Rate limits worth knowing

On Groq's free tier each key allows 30 requests per minute, 1,000 requests per
day, 8,000 tokens per minute and 200,000 tokens per day. There is no monthly
cap.

The tokens-per-day limit binds first, not the request count. A full lesson plan
costs roughly 6,700 tokens, so one key covers about 30 of them per day — a pool
of eight keys covers around 240. Size the pool against lesson plans, not
against the 1,000 requests the headers advertise.

## Notes for whoever deploys this

- The demo build has login bypassed: every visitor lands straight on the
  dashboard. Restore the auth guard in `frontend/src/App.jsx` before putting
  this in front of real users.
- The Code Debugger executes Python and JavaScript in a subprocess with a 10
  and 8 second timeout. The other 17 languages are analysed, not run. If the
  host is shared, run the container with limited privileges.
- Input to the debugger is capped at 600 lines or 25,000 characters.
