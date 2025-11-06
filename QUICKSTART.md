# Quick Start Checklist

## 🚀 Get Pond Auth Running in 10 Minutes

### Step 1: Database (3 min)
```bash
fly auth login
fly postgres create --name pond-auth-db --region ams --vm-size shared-cpu-1x --initial-cluster-size 1 --volume-size 1
# Choose: Development config, select your region (e.g., ams)
# Copy the password shown!

# IMPORTANT: Prevent suspension
fly machines list -a pond-auth-db
fly machines update <MACHINE_ID> -a pond-auth-db --autostop=off --yes
```

### Step 2: Backend Setup (2 min)

**Start database proxy (keep running in separate terminal):**
```bash
fly proxy 5432 -a pond-auth-db
```

**Backend setup:**
```bash
cd backend

# Create .env file
cat > .env << 'EOF'
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@pond-auth-db.internal:5432/postgres
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
BETTER_AUTH_URL=http://localhost:3000
TRUSTED_ORIGINS=http://localhost:5173
NODE_ENV=development
PORT=3000
EOF

# Install & migrate
pnpm install
pnpm migrate

# Start server (in a NEW terminal - keep proxy running!)
pnpm dev
```

**Verify:** Server shows "🔄 Local dev: Using proxy connection" and "📊 Database configured: localhost:5432"

### Step 3: Frontend Setup (2 min)
```bash
cd ..  # Back to project root

# Get Jazz API key from https://dashboard.jazz.tools
# Create .env.local
cat > .env.local << 'EOF'
VITE_API_URL=http://localhost:3000
VITE_JAZZ_SYNC_PEER=wss://cloud.jazz.tools/?key=YOUR_JAZZ_KEY
EOF

# Install & run
pnpm install
pnpm dev
```

### Step 4: Test (3 min)
1. Open http://localhost:5173
2. Sign up with any email/password
3. See "Welcome!" message with Jazz Account ID
4. Sign out, then sign in again
5. Verify same account loads

## ✅ Success Indicators

- Backend: `🚀 Pond Auth Server running`
- Frontend: Auth modal appears
- Sign up: Creates user in database
- Sign in: Loads same Jazz account

## 🆘 Quick Fixes

**Database connection error (`ENOTFOUND pond-auth-db.internal`)?**
```bash
# 1. Make sure fly proxy is running:
fly proxy 5432 -a pond-auth-db

# 2. Check database is running:
fly postgres list

# 3. The code auto-converts .internal to localhost in dev mode
#    If errors persist, verify proxy is active
```

**Jazz not loading?**
- Check `.env.local` has valid `VITE_JAZZ_SYNC_PEER`
- Get key from https://dashboard.jazz.tools

**CORS error?**
- Restart backend after changing `.env`

---

See [SETUP.md](./SETUP.md) for detailed documentation.

