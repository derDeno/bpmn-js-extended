FROM node:20-bookworm-slim AS build

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run distro \
    && npm prune --omit=dev

FROM node:20-bookworm-slim AS base

WORKDIR /usr/src/app

COPY --from=build /usr/src/app/package.json ./
COPY --from=build /usr/src/app/package-lock.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/assets ./assets
COPY --from=build /usr/src/app/resources ./resources
COPY --from=build /usr/src/app/app ./app

ENV NODE_ENV=production \
    PORT=3000 \
    STORAGE_PATH=/data

VOLUME ["/data"]

EXPOSE 3000

CMD ["node", "app/server.js"]
