# Docker Best Practices

A beginner-friendly guide to building efficient Docker images.

---

## 1. Use Multi-Stage Builds

**Problem:** You need build tools (compilers, package managers) to create your app, but you don't need them in production.

**Solution:** Use two stages — one to build, one to run.

```dockerfile
# Stage 1: Build (has all tools)
FROM node:22 AS builder
WORKDIR /app
COPY . .
RUN npm install

# Stage 2: Run (only what's needed)
FROM node:22-slim
COPY --from=builder /app/node_modules ./node_modules
COPY . .
CMD ["node", "server.js"]
```

**Result:** Build tools, source maps, dev dependencies — all left behind. Image goes from ~900MB to ~150MB.

---

## 2. Choose the Right Base Image

| Image | Size | Use Case |
|-------|------|----------|
| `node:22` | ~350MB | Full Debian — avoid in production |
| `node:22-slim` | ~80MB | Debian without extras — good middle ground |
| `node:22-alpine` | ~50MB | Minimal Linux — smallest, but uses `apk` not `apt` |
| `distroless` | ~30MB | No shell, no package manager — maximum security |

**Rule:** Start with `alpine`. If something breaks, use `slim`.

---

## 3. Order Dockerfile Commands by Change Frequency

Docker caches layers. Put things that **rarely change** at the top.

```dockerfile
# GOOD: Dependencies change less often
COPY package.json package-lock.json ./
RUN npm install

# Source code changes every commit
COPY . .
```

**Why:** If you change `app.js`, Docker reuses the cached `npm install` layer. Saves minutes on every build.

---

## 4. Use .dockerignore

Just like `.gitignore`, but for Docker. Prevents unnecessary files from entering the image.

```dockerignore
node_modules
.git
.env
*.db
Dockerfile
docker-compose.yml
README.md
```

**Why:** `COPY . .` copies everything. Without `.dockerignore`, you're shipping `.git` history, logs, and secrets into your image.

---

## 5. Clean Up in the Same Layer

Every `RUN` command creates a layer. If you install and don't clean up, the cache stays.

```dockerfile
# BAD: Two layers, cache bloat
RUN apt-get update
RUN apt-get install -y curl

# GOOD: One layer, cleaned up
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*
```

---

## 6. Don't Run as Root

Root inside the container = root on the host if there's a breakout.

```dockerfile
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
```

---

## 7. Use tini as Init Process

Docker containers don't have a proper init system. `tini` fixes signal handling.

```dockerfile
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
```

**Why:** Without `tini`, Node.js doesn't receive `SIGTERM` from Kubernetes. Your container gets killed forcefully instead of shutting down gracefully.

---

## 8. Pin Your Versions

```dockerfile
# BAD: Might break tomorrow
FROM node:latest

# GOOD: Reproducible builds
FROM node:22.6.0-alpine
```

Same for packages in `package.json` — use lock files.

---

## Quick Reference: Image Size Comparison

| Technique | Approximate Savings |
|-----------|-------------------|
| Multi-stage build | 50-70% |
| Alpine base | 80% vs debian |
| .dockerignore | 10-30% |
| Layer cleanup | 5-20% |
| No dev dependencies | 20-40% |

---

## TL;DR Checklist

- [ ] Multi-stage build
- [ ] Alpine or slim base image
- [ ] `.dockerignore` file
- [ ] Copy deps before source (layer caching)
- [ ] Clean up in same `RUN` layer
- [ ] Non-root user
- [ ] `tini` for signal handling
- [ ] Pin versions
- [ ] Don't store secrets in image

---

## Running This Project with Docker

### Start everything (PostgreSQL + API)

```bash
docker compose up -d
```

This starts:
- PostgreSQL on port `5432`
- API on port `3000`

### Check if it's running

```bash
docker compose ps
curl http://localhost:3000/healthz
```

### View logs

```bash
docker compose logs -f api       # API logs
docker compose logs -f postgres  # PostgreSQL logs
```

### Stop everything

```bash
docker compose down
```

### Stop and delete data

```bash
docker compose down -v
```

### Rebuild after code changes

```bash
docker compose up -d --build
```

### Run locally without Docker

```bash
# Start only PostgreSQL
docker compose up -d postgres

# Start API locally
pnpm dev
```
