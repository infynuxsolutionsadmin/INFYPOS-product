# INFYPOS Production Deployment Runbook

**Document Version:** 1.0.0  
**Target Architecture:** PostgreSQL 17 + NestJS Modular API + Vite/React Frontend + Electron Desktop POS  

---

## 1. Production Prerequisites & Environment Configuration

### 1.1 Backend Environment Variables Template (`.env.production`)
```ini
NODE_ENV=production
APP_NAME="INFEPOS Enterprise Backend"
APP_PORT=3000
APP_HOST=0.0.0.0

API_PREFIX=api
API_VERSION=v1

# Database Configuration (Managed PostgreSQL 17)
DATABASE_URL="postgresql://<user>:<password>@<db-host>:5432/<dbname>?sslmode=require&schema=public"

# Authentication Secrets
JWT_ACCESS_SECRET="<generate-64-character-random-hex-string>"
JWT_ACCESS_EXPIRES="15m"
JWT_REFRESH_SECRET="<generate-64-character-random-hex-string>"
JWT_REFRESH_EXPIRES="7d"
BCRYPT_SALT_ROUNDS=12

# Network & CORS Security
ALLOWED_ORIGINS="https://app.infypos.com,https://pos.infypos.com"

# AWS Cloud Storage & Email (Optional - will simulate if omitted)
AWS_REGION="eu-west-2"
AWS_ACCESS_KEY_ID="<aws-key-id>"
AWS_SECRET_ACCESS_KEY="<aws-secret-key>"
AWS_S3_BUCKET="infypos-production-installers"
AWS_SES_SENDER_EMAIL="no-reply@infypos.com"
```

### 1.2 Frontend Environment Variables Template (`.env.production`)
- **Admin Dashboard:**
  ```ini
  VITE_API_BASE_URL="https://api.infypos.com/api/v1"
  ```
- **POS Terminal:**
  ```ini
  VITE_API_BASE_URL="https://api.infypos.com/api/v1"
  ```

---

## 2. Step-by-Step Production Release Workflow

### Step 1: Database Migration Execution
```bash
# Inside backend directory
cd backend

# Generate Prisma Client
npx prisma generate

# Apply pending production migrations safely
npx prisma migrate deploy
```
> [!CAUTION]
> Never run `prisma migrate dev` or `prisma db push` on a production database. Only use `prisma migrate deploy`.

### Step 2: Backend Container / Service Build
```bash
# Build NestJS distribution
npm run build

# Start production server
npm run start:prod
```

### Step 3: Frontend Distribution Build & CDN Sync
```bash
# Admin Dashboard
cd INFEPOS_FRONTEND/admin-dashboard
npm run build
# Sync `dist/` to Cloudflare Pages, Vercel, or AWS S3 + CloudFront

# POS Terminal Desktop Distribution
cd ../pos-terminal
npm run package
# Outputs Windows `.exe` installer to `release/`
```

---

## 3. Post-Deployment Smoke Verification

1. **API Liveness Probe:**
   ```bash
   curl -i https://api.infypos.com/api/v1/health
   # Expected: HTTP 200 {"status":"ok"}
   ```
2. **CORS Header Validation:**
   ```bash
   curl -I -X OPTIONS https://api.infypos.com/api/v1/auth/login \
     -H "Origin: https://app.infypos.com" \
     -H "Access-Control-Request-Method: POST"
   # Expected: HTTP 204 No Content with Access-Control-Allow-Origin: https://app.infypos.com
   ```
3. **Admin Portal Login:**
   - Sign in as Store Manager or Owner.
   - Verify products list, inventory table, and live dashboard load without console errors.
4. **Till Checkout Flow:**
   - Open till terminal, clock into shift with float.
   - Execute test cash sale.
   - Assert stock decrements and invoice prints correctly.
   - Generate X-Report and close shift with Z-Report.

---

## 4. Rollback & Emergency Recovery Procedures

### 4.1 Application Rollback
- In Render, AWS ECS, or Docker, revert deployment to the previous immutable container image tag.
- Point CDN distributions to the previous stable release commit.

### 4.2 Database Rollback Policy
- Because PostgreSQL transactions are atomic, failed deployments during migrations roll back the active transaction.
- If a migration completed but corrupted a business rule, restore from the pre-deployment PostgreSQL snapshot taken in Step 0.
