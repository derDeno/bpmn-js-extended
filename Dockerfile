FROM node:20-alpine AS base

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY dist ./dist
COPY assets ./assets
COPY resources ./resources
COPY app ./app

ENV NODE_ENV=production \
    PORT=3000 \
    STORAGE_PATH=/data

VOLUME ["/data"]

EXPOSE 3000

CMD ["node", "app/server.js"]
