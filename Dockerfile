FROM node:20-bookworm-slim AS build

ENV COREPACK_HOME=/usr/local/share/corepack \
    PATH=${COREPACK_HOME}/shims:${PATH}

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN set -eux; \
    mkdir -p "$COREPACK_HOME/shims"; \
    corepack enable --install-directory "$COREPACK_HOME/shims"; \
    corepack prepare npm@latest --activate; \
    npm ci

COPY . .
RUN npm run distro

FROM node:20-bookworm-slim AS base

ENV COREPACK_HOME=/usr/local/share/corepack \
    PATH=${COREPACK_HOME}/shims:${PATH}

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN set -eux; \
    mkdir -p "$COREPACK_HOME/shims"; \
    corepack enable --install-directory "$COREPACK_HOME/shims"; \
    corepack prepare npm@latest --activate; \
    npm ci --omit=dev

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
