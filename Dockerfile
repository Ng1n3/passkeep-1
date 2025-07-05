FROM node:20-alpine AS base

RUN npm install -g pnpm

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml ./

# Development stage
FROM base AS development

ENV NODE_ENV=development

# Install dependencies with retry logic
RUN set -eux; \
    for i in 1 2 3; do \
        apk add --no-cache --update curl ca-certificates && break || \
        (echo "Retrying ($i)..." && sleep 5); \
    done

RUN pnpm install

COPY . .

EXPOSE 4000

USER node

CMD ["pnpm", "run", "start:dev"]

# Build stage
FROM base AS build

ENV NODE_ENV=production

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

# Production stage
FROM node:20-alpine AS production

RUN npm install -g pnpm

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml ./

RUN apk add --no-cache --update curl ca-certificates

RUN pnpm install --frozen-lockfile --prod

COPY --from=build /usr/src/app/dist ./dist

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /usr/src/app

USER nestjs

EXPOSE 4000

CMD ["node", "dist/main"]