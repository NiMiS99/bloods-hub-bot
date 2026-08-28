FROM node:20-slim

WORKDIR /app

# Copy package files and install deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy dashboard package and install
COPY dashboard/package.json dashboard/package-lock.json ./dashboard/
RUN cd dashboard && npm ci --omit=dev

# Copy source
COPY . .

# Build dashboard
RUN cd dashboard && npm run build

# Expose port
EXPOSE 4567

# Environment
ENV NODE_ENV=production
ENV DASHBOARD_PORT=4567

# Start
CMD ["node", "src/index.js"]
