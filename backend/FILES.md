# Backend File Structure

## Configuration Files

### `fly.toml`
**Purpose**: Configuration for the **backend API app** (`pond-backend`) on Fly.io
- App name: `pond-backend`
- HTTP service configuration
- Release command for migrations
- VM resources

**Note**: The database app (`pond-auth-db`) has its own separate Fly.io configuration managed by Fly.io Postgres.

### `Dockerfile`
**Purpose**: Multi-stage build for production deployment
- Builds TypeScript to JavaScript
- Production-only dependencies
- Optimized image size

### `better-auth.config.ts`
**Purpose**: Used by `pnpm migrate` command
- Exports auth configuration
- Used by Better Auth CLI

## Environment Files

### `.env` (local development)
**Do NOT commit this file**
- `DATABASE_URL`: Uses `pond-auth-db.internal:5432` (auto-converted to `localhost:5432` by code)
- `BETTER_AUTH_SECRET`: Generated secret
- Other local config

### Fly.io Secrets (production)
Set via `fly secrets set` command
- `DATABASE_URL`: Uses `pond-auth-db.internal:5432` (direct internal connection)
- `BETTER_AUTH_SECRET`: Same as local (or regenerate for production)
- `BETTER_AUTH_URL`: Production backend URL
- `TRUSTED_ORIGINS`: Production frontend URL(s)

## Key Differences: Local vs Production

| Aspect | Local Development | Production (Fly.io) |
|--------|-------------------|---------------------|
| Database URL | `localhost:5432` (via proxy) | `pond-auth-db.internal:5432` |
| Hostname | `localhost` | `0.0.0.0` |
| Migration | Manual: `pnpm migrate` | Automatic: `release_command` |
| Connection | `fly proxy` required | Direct `.internal` network |

## How It Works

1. **Local Dev**: 
   - `fly proxy 5432 -a pond-auth-db` forwards localhost → Fly.io DB
   - Code auto-converts `.internal` → `localhost:5432`
   - Run `pnpm migrate` manually when needed

2. **Production**:
   - Apps in same Fly.io org can use `.internal` hostnames
   - Direct private network connection (fast, no SSL needed)
   - Migrations run automatically on `fly deploy`

