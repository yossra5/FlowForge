# server/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production || npm install

# Copy source code
COPY . .

# Create .env file from example if needed
RUN if [ ! -f .env ]; then cp .env.example .env 2>/dev/null || true; fi

EXPOSE 5000

CMD ["node", "index.js"]