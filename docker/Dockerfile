# Use a Smaller Base Image
FROM node:18-alpine

WORKDIR /app

# Copy only API package files
COPY app/package.json app/package-lock.json ./

RUN npm ci --omit=dev

# Copy API source
COPY app/ ./

RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 3000

CMD ["node", "index.js"]