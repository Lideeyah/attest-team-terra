FROM node:24-bookworm-slim
WORKDIR /app
COPY . .
RUN npm ci && npm ci --prefix backend && npm run backend:build && node scripts/build-integrated.mjs
RUN mkdir -p backend/uploads && chown -R node:node /app/.next /app/backend/uploads
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
USER node
CMD ["node", "scripts/start-integrated.mjs"]
