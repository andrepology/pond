# Multi-stage build for Node.js/TypeScript backend
FROM node:20-slim AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Dependencies stage
FROM base AS deps
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Production stage
FROM base AS runtime
ENV NODE_ENV=production
# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile
COPY --from=build /app/dist ./dist
COPY package.json better-auth.config.ts ./

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "dist/server.js"]

