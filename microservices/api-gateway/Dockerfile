# API Gateway Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY api-gateway/package.json api-gateway/package-lock.json ./

# Install dependencies
RUN npm install --production

# Copy shared utilities
COPY shared ./shared

# Copy source code
COPY api-gateway .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"] 