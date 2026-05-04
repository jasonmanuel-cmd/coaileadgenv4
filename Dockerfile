FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app

# Playwright base image already has Chromium installed at /ms-playwright
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Install all deps (need devDeps for the build step)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Persistent folder for SQLite — mount Railway volume here
RUN mkdir -p /data
ENV DATABASE_PATH=/data/data.db

EXPOSE 3000
CMD ["node", "dist/index.cjs"]
