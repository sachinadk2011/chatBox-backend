FROM node:20-alpine

# Use the existing 'node' user instead of creating a new one
USER node
ENV HOME=/home/node \
    PATH=/home/node/.local/bin:$PATH

WORKDIR /app

# Copy package manifests with correct user permissions (use 'node' instead of 'user')
COPY --chown=node package.json package-lock.json* ./

# Install dependencies
RUN npm install --omit=dev

# Copy the rest of the backend source files
COPY --chown=node . .

# Hugging Face strictly routes incoming traffic through port 7860
EXPOSE 7860
ENV PORT=7860

# Start your Express / Socket.IO app
CMD ["node", "app.js"]