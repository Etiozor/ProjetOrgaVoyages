# ---- deps: install exact dependencies from the lockfile ----
FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: the postinstall (`prisma generate`) needs prisma/schema.prisma,
# which isn't copied into this stage yet — it runs explicitly in the builder stage below.
RUN npm ci --ignore-scripts

# ---- builder: generate the Prisma client and build the Next.js app ----
FROM node:26-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- runner: minimal production image ----
FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Full node_modules: the standalone output's trimmed copy doesn't include the
# prisma CLI's dependency closure (it's invoked via CLI at deploy time, never
# imported, so Next's file tracing drops it) — needed here for `prisma migrate deploy`.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Next.js standalone server (merges its own trimmed node_modules subset on top, harmless)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
