# ClassroomAI

An AI teaching assistant for K-12 classrooms, built by Codevidhya. Teachers
pick a grade, a subject and a chapter, and get back a lesson plan, worksheet,
question paper or set of class activities. It also includes language tools and
a code debugger for computer-science lessons.

This repository is the demo build prepared for deployment.

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

Never commit real keys. `.env` is gitignored; `.env.example` is the template.

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
