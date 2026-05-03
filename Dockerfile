FROM node:20-slim

# Chromium dependencies for Playwright browser scraper
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libxshmfence1 \
    xdg-utils \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Use system Chromium — skip Playwright's own download
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

# Install all deps (need devDeps for the build step)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Persistent data folder — mount Railway volume here
RUN mkdir -p /data
ENV DATABASE_PATH=/data/data.db

EXPOSE 5000
CMD ["node", "dist/index.cjs"]
