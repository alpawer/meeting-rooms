FROM node:22-slim

# openssl is needed by Prisma, python3 and build tools by better-sqlite3 when
# no prebuilt binary matches the platform.
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# prisma.config.ts reads DATABASE_URL, but generating the client and building
# the app never touch the database. A placeholder is enough at build time, the
# real value comes from the environment at run time.
ENV DATABASE_URL="file:/app/data/build-placeholder.db"
RUN npx prisma generate && npx next build

ENV NODE_ENV=production
EXPOSE 3000

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]
