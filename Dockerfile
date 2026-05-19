# ── Stage 1: build dependencies ────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

# ── Stage 2: final runtime image ───────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Copy installed modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy app source
COPY . .

# Cloud Run injects PORT automatically; default to 8080
ENV PORT=8080
ENV NODE_ENV=production

# Create the uploads directory so multer never crashes on a fresh container
RUN mkdir -p files

EXPOSE 8080

CMD ["node", "index.js"]
