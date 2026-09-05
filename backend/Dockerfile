# ==========================================
# Stage 1: Build & Compile TypeScript
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install package files and run dependency caching
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Copy configuration and source files
COPY tsconfig.json ./
COPY src ./src

# Build production javascript assets and generate Prisma client
RUN npm run build
RUN npx prisma generate

# ==========================================
# Stage 2: Lightweight Production runner
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled source and ORM metadata from builder stage
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /usr/src/app/node_modules/@prisma/client ./node_modules/@prisma/client

# Set environment defaults
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "dist/server.js"]
