# Fly.io Database Setup Instructions

## Step 1: Install Fly CLI (if not already installed)

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

## Step 2: Create Postgres Database

```bash
fly postgres create --name pond-auth-db --region ams --vm-size shared-cpu-1x --initial-cluster-size 1 --volume-size 1
```

**Choose these options:**
- Configuration: `Development - Single node, 1x shared CPU, 256MB RAM, 1GB disk`
- Region: Choose closest to your location (e.g., `ams`)
- **IMPORTANT**: Save the connection details that appear after creation!

**Configure to prevent suspension:**
```bash
# After creation, disable auto-stop to prevent database suspension
fly machines update <MACHINE_ID> -a pond-auth-db --autostop=off --yes
```

## Step 3: Save Connection String

After creation, you'll see output like:

```
Postgres cluster pond-auth-db created
  Username:    postgres
  Password:    <password>
  Hostname:    pond-auth-db.internal
  Flycast:     fdaa:X:XXXX:X:X:XXXX:XXXX:X
  Proxy port:  5432
  Postgres port: 5433
  Connection string: postgres://postgres:<password>@pond-auth-db.flycast:5432/pond_auth_db?sslmode=disable
```

**Example output (credentials will differ):**
```
Postgres cluster pond-auth-db created
  Username:    postgres
  Password:    <your-password>
  Hostname:    pond-auth-db.internal
  Flycast:     fdaa:32:586e:0:1::6
  Proxy port:  5432
  Postgres port:  5433
  Connection string: postgres://postgres:<your-password>@pond-auth-db.internal:5432/postgres
```

**Current active credentials (as of 2025-11-02):**
- Password: `aN1V85HyT38EEt6`
- Connection string: `postgres://postgres:aN1V85HyT38EEt6@pond-auth-db.internal:5432/postgres`

## Step 4: Get the Connection String

Run this command to get the full connection string:

```bash
fly postgres connect -a pond-auth-db --command="echo 'Connection string:'; echo \$DATABASE_URL"
```

Or manually construct it:
```
postgres://postgres:<password>@pond-auth-db.internal:5432/postgres
```

**Current connection string:**
```
postgres://postgres:aN1V85HyT38EEt6@pond-auth-db.internal:5432/postgres
```

## Step 5: Create `.env` file

Once you have the connection string, create `backend/.env`:

```bash
cd backend
cat > .env << 'EOF'
DATABASE_URL=postgres://postgres:<YOUR_PASSWORD>@pond-auth-db.internal:5432/postgres
BETTER_AUTH_SECRET=<GENERATE_RANDOM_32_CHARS>
BETTER_AUTH_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
EOF
```

**Generate BETTER_AUTH_SECRET:**
```bash
openssl rand -base64 32
```

## Next Steps

After completing these steps, return to me and I'll continue with backend setup.

