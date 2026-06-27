FROM node:20-alpine

# Hugging Face requires a non-root user (ID 1000)
RUN adduser -D -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR /app

# Copy package manifests with correct user permissions
COPY --chown=user package.json package-lock.json* ./

# Install dependencies
RUN npm install --omit=dev

# Copy the rest of the backend source files
COPY --chown=user . .

# Hugging Face strictly routes incoming traffic through port 7860
EXPOSE 7860
ENV PORT=7860

# Start your Express / Socket.IO app
CMD ["node", "app.js"]