# Pond Backend Deployment Guide

## Prerequisites

1. **Database already exists**: `pond-auth-db` on Fly.io
2. **Fly CLI installed**: `fly auth login` completed
3. **Secrets configured**: See "Setting Secrets" below

## Initial Setup

### 1. Create Backend App (if not exists)

```bash
cd backend
fly apps create pond-backend
```

### 2. Attach Database to Backend App

**This is the recommended way** - automatically sets up DATABASE_URL secret and creates a database user:

```bash
fly postgres attach pond-auth-db -a pond-backend
```

This command will:
- Create a database user for `pond-backend`
- Create a dedicated database for the app
- Automatically set `DATABASE_URL` secret with correct connection string
- Use `.internal` or `.flycast` hostname (automatically configured)

**Note**: If you prefer to use the existing `postgres` user instead, you can manually set the secret (see alternative below).

### 3. Set Other Required Secrets

After attaching the database, set the remaining secrets:

```bash
fly secrets set \
  BETTER_AUTH_SECRET="<your-secret-from-local-.env>" \
  BETTER_AUTH_URL="https://pond-backend.fly.dev" \
  TRUSTED_ORIGINS="https://pond.fly.dev,https://your-frontend-domain.com" \
  -a pond-backend
```

**Important Notes:**
- `BETTER_AUTH_SECRET` must match your local development secret (or use a new one for production)
- `BETTER_AUTH_URL` will be your deployed backend URL
- `TRUSTED_ORIGINS` should include your frontend domain(s)

### Alternative: Manual Database Connection

If you prefer to manually configure the database connection (using the existing `postgres` user):

```bash
fly secrets set \
  DATABASE_URL="postgres://postgres:aN1V85HyT38EEt6@pond-auth-db.internal:5432/postgres" \
  BETTER_AUTH_SECRET="<your-secret>" \
  BETTER_AUTH_URL="https://pond-backend.fly.dev" \
  TRUSTED_ORIGINS="https://pond.fly.dev" \
  -a pond-backend
```

**Why use `attach` instead?**
- Automatically creates a dedicated database user (better security)
- Creates a separate database for your app
- Handles connection string formatting automatically
- Follows Fly.io best practices

### 4. Deploy

```bash
fly deploy -a pond-backend
```

This will:
1. Build the Docker image
2. Run migrations via `release_command` in `fly.toml`
3. Deploy the app
4. Start the server

### 5. Verify Deployment

```bash
# Check app status
fly status -a pond-backend

# Check logs
fly logs -a pond-backend

# Test health endpoint
curl https://pond-backend.fly.dev/health
```

## Database Connection

After using `fly postgres attach`, the backend connects via the `DATABASE_URL` secret:
- Automatically configured by Fly.io
- Uses Fly.io private networking (`.internal` or `.flycast`)
- Both apps are in the same organization
- Fast, low-latency internal networking
- Dedicated database user for better security

## Migrations

Migrations run automatically via `release_command` in `fly.toml` before each deployment:
```toml
[deploy]
  release_command = "pnpm migrate"
```

If migrations fail, deployment stops and the previous version remains running.

## Manual Migration (if needed)

```bash
fly ssh console -a pond-backend -C "pnpm migrate"
```

## Troubleshooting

### Migration fails on deploy
- Check logs: `fly logs -a pond-backend`
- Verify `DATABASE_URL` secret is correct
- Ensure database is running: `fly status -a pond-auth-db`

### Database connection errors
- Verify both apps in same organization
- Check `DATABASE_URL` uses `.internal` hostname
- Ensure database machine is running

### CORS errors
- Verify `TRUSTED_ORIGINS` includes frontend domain
- Check frontend is sending requests to correct backend URL

## Files

- `Dockerfile`: Multi-stage build for production
- `fly.toml`: Fly.io app configuration
- `better-auth.config.ts`: Used by migration CLI
- `src/auth.ts`: Auto-detects environment (Fly.io vs local)

