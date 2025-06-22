FROM node:lts-alpine AS base

RUN npm install -g pnpm

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml ./


#development stage
# This stage is used for development purposes, allowing for live reloading and debugging.
FROM base AS development

ENV NODE_ENV=development

RUN pnpm install

COPY . .

EXPOSE 4000

USER node

CMD ["pnpm", "run", "start:dev"]


#build stage
FROM base AS build

ENV NODE_ENV=production

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build


# production stage
FROM node:lts-alpine AS production

RUN npm install -g pnpm

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile --prod

COPY --from=build /usr/src/app/dist ./dist

RUN addgroup -g 1001 -S nodejs

RUN adduser -S nestjs -u 1001

RUN chown -R nestjs:nodejs /usr/src/app

USER nestjs

EXPOSE 4000

CMD ["node", "dist/main"]