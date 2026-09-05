# syntax=docker/dockerfile:1
# The app on one VM (handoff 0010 Track A). Targets:
#   deps     node_modules incl. the Prisma client (postinstall runs `prisma generate`); a cache layer, never shipped
#   builder  `npm run build` (not `next build`: prebuild/postbuild mint the build id and write the worker manifest into
#            .next/static/<id>/sw-manifest.json, which the static copy below carries into the image; findings 0009)
#   migrate  the one-shot `prisma migrate deploy` service of deploy/compose.yml: the Prisma CLI, the schema, the migrations
#   runner   alpine + the node binary + .next/standalone + .next/static + public; `node server.js`
# The runner is not node:22-alpine because that base carries npm, corepack and yarn the server never calls (~25 MB) and
# a base layer cannot be trimmed later; the node binary is copied out of it instead. Keep the two alpine versions in step.

FROM node:22-alpine AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json .npmrc prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund && npm cache clean --force

FROM deps AS builder
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-alpine AS migrate
WORKDIR /app
COPY package.json /tmp/package.json
RUN npm i --no-audit --no-fund "prisma@$(node -p "require('/tmp/package.json').devDependencies.prisma")" && npm cache clean --force
COPY prisma.config.ts ./
COPY prisma ./prisma
CMD ["npx", "prisma", "migrate", "deploy"]

FROM alpine:3.24 AS runner
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1 PHOTO_DIR=/data/photos
RUN apk add --no-cache libstdc++ libgcc \
 && addgroup -S dex && adduser -S dex -G dex && mkdir -p /data/photos && chown dex:dex /data/photos
COPY --from=deps /usr/local/bin/node /usr/local/bin/node
COPY --from=builder --chown=dex:dex /app/.next/standalone ./
COPY --from=builder --chown=dex:dex /app/.next/static ./.next/static
COPY --from=builder --chown=dex:dex /app/public ./public
USER dex
EXPOSE 3000
CMD ["node", "server.js"]
