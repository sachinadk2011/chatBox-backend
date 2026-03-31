# ── Backend Dockerfile ───────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* ./

# Install production dependencies
RUN npm install --omit=dev

# Copy the rest of the source
COPY . .

# Expose Express / Socket.IO port
EXPOSE 8000

# Use plain node so env vars come from Docker (no --env-file needed)
# Docker Compose injects all vars via the `environment:` section
CMD ["node", "app.js"]

