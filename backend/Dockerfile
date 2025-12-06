# Backend Dockerfile for Order Management System
# Multi-stage build for optimized production image

FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Start the server
CMD ["node", "server.js"]
