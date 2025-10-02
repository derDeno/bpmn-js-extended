FROM node:20-alpine AS build

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm install -g npm@latest \
    && npm ci

COPY . .
RUN npm run distro

FROM node:20-alpine AS base

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm install -g npm@latest \
    && npm ci --omit=dev

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
