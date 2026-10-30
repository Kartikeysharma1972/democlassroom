# School Admin Portal — Express API serving the built React client on one port.
# Reads Classroom AI's SQLite (mounted read-only). No other database.
FROM node:20-slim

# better-sqlite3 is a native module, so it needs a toolchain to build.
RUN apt-get update && apt-get install -y --no-install-recommends python3 build-essential \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install both halves first so a source edit doesn't re-run npm install.
COPY server/package*.json server/
RUN cd server && npm install --omit=dev

COPY client/package*.json client/
RUN cd client && npm install --include=dev

COPY . .

# Baked into the bundle at build time, so it has to be set here rather than at
# run time. Classroom AI's sign-in page is the other half of this pair.
ARG VITE_CLASSROOM_AI_URL=http://localhost:8001
ENV VITE_CLASSROOM_AI_URL=$VITE_CLASSROOM_AI_URL
RUN cd client && npm run build

# server.js serves ../client/dist. Admin accounts live in a file, so point
# ADMIN_DB_PATH at a mounted volume or they are lost when the container goes.
ENV PORT=5002 NODE_ENV=production
EXPOSE 5002
CMD ["node", "server/server.js"]
