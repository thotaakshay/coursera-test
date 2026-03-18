# Swiftdo Backend

## Deploy to Railway (2 minutes)

1. Go to railway.app → Login with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
   OR drag this folder into Railway dashboard
3. Railway auto-detects Node.js and deploys
4. Click your project → Settings → copy the PUBLIC URL
5. Paste that URL into the frontend HTML file (replace `const API = '...'`)

## Local Development

```bash
npm install
node server.js
# Runs on http://localhost:4000
```

## API Endpoints

- POST /api/otp/send        → Send OTP
- POST /api/otp/verify      → Verify OTP  
- POST /api/auth/register   → Register
- POST /api/auth/login      → Login
- GET  /api/worker/tasks    → Worker tasks
- POST /api/worker/tasks/:id/accept   → Accept task
- POST /api/worker/tasks/:id/submit   → Submit with photos
- GET  /api/worker/wallet   → Wallet balance
- POST /api/buyer/request   → Request work
- POST /api/buyer/tasks/:id/confirm   → Confirm work
- GET  /api/admin/stats     → Platform stats
- PUT  /api/admin/users/:id → Approve/reject worker
- POST /api/admin/payouts   → Process EOD payouts
- POST /api/citizen/report  → Submit civic report
- GET  /api/notifications   → Get notifications

## Health Check
GET /api/health
