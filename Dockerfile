# Classroom AI — React frontend (built) served by the FastAPI backend on one port.

# ---- Stage 1: build the React frontend ----
FROM node:20-slim AS frontend
WORKDIR /fe
COPY frontend/package*.json ./
RUN npm install --include=dev
COPY frontend/ ./
ARG VITE_PORTAL_URL=http://localhost:3000/
ENV VITE_PORTAL_URL=$VITE_PORTAL_URL
RUN npm run build

# ---- Stage 2: Python backend (serves the built frontend from ../frontend/dist) ----
FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
  && pip install --no-cache-dir -r backend/requirements.txt
COPY backend/ backend/
COPY --from=frontend /fe/dist frontend/dist
ENV PORT=8001 PYTHONUNBUFFERED=1
EXPOSE 8001
WORKDIR /app/backend
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8001}"]
