FROM node:18-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["npx", "tsx", "src/index.ts"]
