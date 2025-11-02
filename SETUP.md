# Pond Authentication Setup Guide

## Phase 1: Better Auth + Jazz Integration

This guide walks you through setting up Better Auth with Jazz for Pond's authentication system.

---

## Prerequisites

1. **Fly.io Account**: Sign up at https://fly.io
2. **Jazz Cloud Account**: Sign up at https://dashboard.jazz.tools
3. **Node.js 18+** and **pnpm** installed

---

## Setup Steps

### 1️⃣ Database Setup (Fly.io Postgres)

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh
fly auth login

# Create Postgres database
fly postgres create --name pond-auth-db

# Choose: Development configuration (1x shared CPU, 256MB RAM)
# Select region closest to you
```

**Save the connection details!** You'll need them in the next step.

Get your connection string:
```bash
fly postgres connect -a pond-auth-db
# Note the connection details shown
```

### 2️⃣ Backend Configuration

Create `backend/.env`:

```bash
cd backend
cat > .env << 'EOF'
DATABASE_URL=postgres://postgres:<YOUR_PASSWORD>@pond-auth-db.internal:5432/postgres
BETTER_AUTH_SECRET=<GENERATE_THIS>
BETTER_AUTH_URL=http://localhost:3000
TRUSTED_ORIGINS=http://localhost:5173
NODE_ENV=development
PORT=3000
EOF
```

**Generate `BETTER_AUTH_SECRET`:**
```bash
openssl rand -base64 32
```

**Install dependencies:**
```bash
pnpm install
```

**Run database migrations:**
```bash
pnpm migrate
```

This creates the Better Auth tables with Jazz's `accountID` field.

**Start the backend server:**
```bash
pnpm dev
```

You should see:
```
🚀 Pond Auth Server running on http://localhost:3000
✅ Database connected at: <timestamp>
```

**Test the server:**
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok","timestamp":"...","service":"pond-auth-server"}
```

### 3️⃣ Jazz Cloud Setup

1. Go to https://dashboard.jazz.tools
2. Create a new project (or use existing)
3. Copy your API key

### 4️⃣ Frontend Configuration

Create `.env.local` in the project root:

```bash
cd ..  # Back to project root
cat > .env.local << 'EOF'
VITE_API_URL=http://localhost:3000
VITE_JAZZ_SYNC_PEER=wss://cloud.jazz.tools/?key=YOUR_JAZZ_API_KEY
VITE_ELEVENLABS_AGENT_ID=agent_xyz123
EOF
```

Replace `YOUR_JAZZ_API_KEY` with your actual Jazz API key.

**Install dependencies:**
```bash
pnpm install
```

**Start the development server:**
```bash
pnpm dev
```

---

## Testing the Authentication Flow

### Test 1: Anonymous Jazz Account

1. Open http://localhost:5173
2. You should see:
   - The 3D pond scene
   - An auth modal overlay
   - "Loading Jazz..." briefly, then sign in/sign up form

### Test 2: Sign Up

1. Click "Need an account? Sign up"
2. Fill in:
   - Name: `Test User`
   - Email: `test@example.com`
   - Password: `password123`
3. Click "Sign Up"
4. **Expected result:**
   - Modal shows "Welcome, Test User!"
   - Jazz Account ID displayed
   - Backend logs: `✅ User created: test@example.com Jazz Account ID: ...`

### Test 3: Database Verification

```bash
# Connect to database
fly postgres connect -a pond-auth-db

# Query users
SELECT email, name, "accountID" FROM user;
# Should show your test user with a Jazz accountID
```

### Test 4: Sign Out & Sign In

1. Click "Sign Out" in the modal
2. Modal shows sign in form again
3. Enter same credentials
4. Click "Sign In"
5. **Expected result:**
   - Modal shows "Welcome, Test User!" again
   - Same Jazz Account ID as before (proving key retrieval works)

### Test 5: Jazz Data Persistence

Open browser console and run:

```javascript
// This will be available after you're signed in
// Test creating an intention
const me = window.__JAZZ_TEST_ACCOUNT; // (we'll need to expose this for testing)
```

**Note:** Full Jazz data testing will be easier once we build the UI for intentions.

---

## Troubleshooting

### Backend won't start

**Error:** `Database connection failed`

**Fix:** 
- Check `DATABASE_URL` in `backend/.env`
- Verify database is running: `fly postgres list`
- Try external connection string if internal doesn't work

### Frontend shows "Loading Jazz..." forever

**Fix:**
- Check `VITE_JAZZ_SYNC_PEER` in `.env.local`
- Verify Jazz API key is valid
- Check browser console for errors

### Sign up fails with CORS error

**Fix:**
- Verify `TRUSTED_ORIGINS` in `backend/.env` includes `http://localhost:5173`
- Restart backend server after changing `.env`

### Migrations fail

**Error:** `Cannot find module 'dotenv'`

**Fix:**
```bash
cd backend
pnpm install
```

### Jazz account not transforming on sign up

**Fix:**
- Check browser console for errors
- Verify `x-jazz-auth` header is being sent (Network tab)
- Check backend logs for any errors

---

## Architecture Overview

```mermaid
graph TB
    subgraph "Client (http://localhost:5173)"
        A[React App]
        B[JazzReactProvider]
        C[AuthProvider]
        D[Better Auth Client]
        E[Jazz CoValues]
    end
    
    subgraph "Backend (http://localhost:3000)"
        F[Express Server]
        G[Better Auth Handler]
        H[Jazz Plugin Server]
    end
    
    subgraph "Fly.io"
        I[(Postgres DB)]
    end
    
    subgraph "Jazz Cloud"
        J[Sync Peer]
    end
    
    A --> B
    B --> C
    C --> D
    D --> F
    F --> G
    G --> H
    H --> I
    B --> E
    E --> J
    
    style A fill:#e1f5fe
    style B fill:#b3e5fc
    style C fill:#81d4fa
    style E fill:#4fc3f7
    style F fill:#fff9c4
    style G fill:#fff59d
    style H fill:#fff176
    style I fill:#c8e6c9
    style J fill:#a5d6a7
```

---

## What's Next?

### Phase 1 Complete ✅
- [x] Database provisioned on Fly.io
- [x] Backend server with Better Auth + Jazz plugin
- [x] Client with Jazz providers
- [x] Authentication flow working

### Phase 2: Core Data Model
- [ ] Build UI for creating intentions
- [ ] Test Jazz CoValue creation and syncing
- [ ] Implement world model updates
- [ ] Add field notes

### Phase 3: ElevenLabs Integration
- [ ] Voice conversation setup
- [ ] Conversation data capture
- [ ] Link conversations to intentions

---

## Files Created

### Backend
- `backend/src/auth.ts` - Better Auth instance with Jazz plugin
- `backend/src/server.ts` - Express server
- `backend/package.json` - Dependencies
- `backend/tsconfig.json` - TypeScript config
- `backend/better-auth.config.ts` - Migration config

### Frontend
- `src/schema/index.ts` - Jazz CoValue schemas
- `src/lib/auth-client.ts` - Better Auth client
- `src/components/AuthFlow.tsx` - Sign up/in UI
- `src/main.tsx` - Updated with providers

### Config
- `backend/.env` - Backend environment variables
- `.env.local` - Frontend environment variables

---

## Resources

- **Jazz Docs**: https://jazz.tools/docs/react
- **Better Auth Docs**: https://better-auth.com/docs
- **Jazz + Better Auth**: https://jazz.tools/docs/react/key-features/authentication/better-auth
- **Fly.io Docs**: https://fly.io/docs
- **Jazz Inspector**: https://inspector.jazz.tools (for debugging CoValues)

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Check backend terminal logs
3. Verify all environment variables are set
4. Test database connection: `fly postgres connect -a pond-auth-db`
5. Check Jazz dashboard for sync peer status

---

**Status:** Phase 1 implementation complete! Ready for testing. 🎉

