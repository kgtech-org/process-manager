# Multi-stage build for Next.js frontend
FROM node:18-alpine AS deps

# Install dependencies only when needed
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM node:18-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_NAME
ARG NEXT_PUBLIC_FIREBASE_VAPID_KEY

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_FIREBASE_VAPID_KEY=$NEXT_PUBLIC_FIREBASE_VAPID_KEY

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV production
ENV DOCKER_ENV true

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Ensure native deps for sharp are present on Alpine
RUN apk add --no-cache libc6-compat

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Ensure sharp is available at runtime in standalone mode
# (Next.js image optimization requires sharp in the final image)
COPY --from=builder /app/node_modules/sharp ./node_modules/sharp

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]