FROM node:22-slim

WORKDIR /app

# better-sqlite3 ships prebuilt binaries for linux x64/arm64; these build
# tools are only a fallback for platforms without one.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY public ./public
COPY tsconfig.json ./

ENV NODE_ENV=production
ENV DATA_DIR=/data
EXPOSE 3000

CMD ["npx", "tsx", "src/server.ts"]
