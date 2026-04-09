FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml ./
COPY app/ ./app/
COPY public/ ./public/
COPY auth.config.ts envConfig.ts next.config.ts tsconfig.json postcss.config.mjs ./
ARG BACKEND_URL=http://backend:8000
ARG NEXT_PUBLIC_API_BASE=/api
ARG GIT_COMMIT=unknown
ENV BACKEND_URL=$BACKEND_URL
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV GIT_COMMIT=$GIT_COMMIT
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG GIT_COMMIT=unknown
ENV GIT_COMMIT=$GIT_COMMIT

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN chown -R nextjs:nodejs ./ && chmod -R a-w ./

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
