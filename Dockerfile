FROM --platform=linux/amd64 node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
COPY packages/contracts/package.json ./packages/contracts/package.json
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
COPY data ./data
COPY tests ./tests
COPY packages ./packages
RUN npm run build:production && npm prune --omit=dev

FROM --platform=linux/amd64 node:24-bookworm-slim
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist/production ./dist/production
COPY --from=build --chown=node:node /app/packages/contracts ./packages/contracts
COPY --chown=node:node package.json ./
COPY --chown=node:node migrations ./migrations
COPY --chown=node:node public ./public
USER node
EXPOSE 8080
CMD ["node", "dist/production/main.mjs"]
