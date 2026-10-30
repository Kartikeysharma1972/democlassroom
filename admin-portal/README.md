# Codevidhya Admin Portal

The sign-in page for Classroom AI, plus the dashboard a principal uses to see
how their staff are using it.

This started as a copy of `apps/school-admin`. That one also supervised the AI
Tutor student app, which meant a MongoDB connection, student records, chat
monitoring and risk flagging. None of that is here: this portal reads Classroom
AI's SQLite file and nothing else, so there is no database server to run.

`apps/school-admin` is untouched and still does the whole job if you need it.

## Who signs in

One page at `/login` asks who is signing in, and each side has both a login and
a sign-up form:

- **Teacher** — these are Classroom AI's own accounts. The portal does not store
  them; it forwards the two calls to Classroom AI and then hands the session
  over, so a teacher lands straight in Classroom AI, signed in.
- **Admin** — accounts kept in this portal's own `admin.db`. Signing in opens
  the dashboard below.

The first person to sign up becomes an admin; after that, further admins are
added from **Settings**, which is also where one is removed. The last remaining
admin account cannot be deleted.

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Teacher | `teacher@ai.com` | `teacher123` |
| Admin | `admin@ai.com` | `admin123` |

`npm run seed` creates them. Accounts live in databases that git ignores, so a
fresh checkout starts empty and needs this run once. It is safe to run again:
it resets the admin password and leaves every other account alone. The teacher
goes through Classroom AI, which must be running, and which has no password
reset - so if that address already exists there, its existing password stands.

## What the dashboard shows

| Page | What it covers |
| --- | --- |
| Dashboard | Teachers, lessons generated, who worked today, grade coverage, tool usage, recent activity |
| Teachers | Every teacher with their lesson count, opening onto one teacher's history |
| Analytics | Generations over time, tool popularity, grade and curriculum coverage, a per-teacher activity table |
| Reports | A printable summary, plus teacher and activity CSV exports |
| Settings | Admin accounts |

## Running it

```bash
cd server && npm install
cd ../client && npm install && npm run build
cd ../server && npm start          # http://localhost:5002
```

Classroom AI has to be running too, or teacher sign-in has nowhere to go.

For client development with hot reload, `npm run dev` in `client/` serves on
5178 and proxies `/api` to the server.

## Configuration

`server/.env` (see `.env.example`):

| Variable | Default | What it does |
| --- | --- | --- |
| `PORT` | `5002` | Port to serve on |
| `CLASSROOM_DB_PATH` | `../../classroom-ai/backend/classroomai.db` | Classroom AI's SQLite file, opened read-only |
| `ADMIN_DB_PATH` | `admin.db` | Where admin accounts are kept |
| `CLASSROOM_AI_URL` | `http://localhost:8001` | Where the server forwards teacher sign-in |
| `JWT_SECRET` | dev placeholder | Signs admin tokens — change before deploying |

The client needs one more, because the teacher redirect happens in the browser
rather than on the server. Set it in `client/.env` if Classroom AI is not on
localhost:

| Variable | Default |
| --- | --- |
| `VITE_CLASSROOM_AI_URL` | `http://localhost:8001` |

## A note on teacher ids

Classroom AI files every saved generation under `teacher-<user id>`, not the
bare id. Any query joining `chat_history` back to `users` has to carry that
prefix or it silently matches nothing — which is what used to leave the teacher
column in Recent Activity empty.
