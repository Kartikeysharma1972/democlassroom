#!/usr/bin/env bash
set -e

# Install Node.js via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm install 18

# Build frontend (force devDeps — Render sets NODE_ENV=production which skips them)
npm --prefix frontend install --include=dev
npm --prefix frontend run build

# Install Python dependencies
pip install -r backend/requirements.txt
