# ==========================================
# Stage 1: Build stage
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package manifests and Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies including devDependencies for build
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code and build configs
COPY tsconfig*.json nest-cli.json ./
COPY src ./src/

# Compile NestJS application
RUN npm run build

# Remove development dependencies to keep bundle slim
RUN npm prune --production

# ==========================================
# Stage 2: Production runtime stage
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install dumb-init for proper signal proxying (graceful shutdown) and curl for healthcheck
RUN apk add --no-cache dumb-init curl

ENV NODE_ENV=production
ENV PORT=3000

# Copy runtime artifacts from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# Use non-privileged node user for security
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/main.js"]
