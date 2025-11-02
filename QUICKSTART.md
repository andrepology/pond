# Quick Start Checklist

## 🚀 Get Pond Auth Running in 10 Minutes

### Step 1: Database (3 min)
```bash
fly auth login
fly postgres create --name pond-auth-db
# Choose: Development config, select your region
# Copy the password shown!
```

### Step 2: Backend Setup (2 min)
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

# Start server
pnpm dev
```

**Verify:** Server shows "✅ Database connected"

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

**Database connection error?**
```bash
fly postgres list  # Check it's running
```

**Jazz not loading?**
- Check `.env.local` has valid `VITE_JAZZ_SYNC_PEER`
- Get key from https://dashboard.jazz.tools

**CORS error?**
- Restart backend after changing `.env`

---

See [SETUP.md](./SETUP.md) for detailed documentation.

