# Setup Guide - Telegram Clone Authentication

## Prerequisites

- Node.js 18+ installed
- Docker and Docker Compose installed
- npm or yarn package manager

## Step-by-Step Setup

### 1. Clone and Install

```bash
# Install all dependencies
npm install
```

### 2. Start Database Services

```bash
# Start PostgreSQL and Redis with Docker
docker-compose up -d

# Check if services are running
docker-compose ps
```

You should see:
- `telegram-postgres` on port 5432
- `telegram-redis` on port 6379

### 3. Configure Environment Variables

Backend environment is already configured in `services/auth-service/.env`:
- PostgreSQL connection
- Redis connection
- JWT secret
- CORS settings

Frontend environment is already configured in `clients/web-client/.env`:
- API URL pointing to backend

### 4. Start Backend Service

```bash
# Terminal 1: Start auth service
npm run dev:auth
```

You should see:
```
✅ Database tables initialized
✅ Redis connected
🚀 Auth service running on port 3001
📍 http://localhost:3001
```

### 5. Start Frontend Application

```bash
# Terminal 2: Start web client
npm run dev:web
```

You should see:
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

### 6. Test the Application

1. Open browser: http://localhost:3000
2. You'll see the login page
3. Enter a phone number (e.g., +998901234567)
4. Click "Continue"
5. Check the backend terminal for the verification code:
   ```
   📱 SMS to +998901234567: Your verification code is 123456
   ```
6. Enter the code in the frontend
7. You're logged in!

## Troubleshooting

### Database Connection Error

```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart PostgreSQL
docker-compose restart postgres

# View logs
docker-compose logs postgres
```

### Redis Connection Error

```bash
# Check if Redis is running
docker-compose ps

# Restart Redis
docker-compose restart redis

# View logs
docker-compose logs redis
```

### Port Already in Use

If port 3001 or 3000 is already in use:

**Backend (3001):**
Edit `services/auth-service/.env`:
```env
PORT=3002
```

**Frontend (3000):**
Edit `clients/web-client/vite.config.ts`:
```ts
server: {
  port: 3001,
}
```

### SMS Not Sending (Production)

For production, configure Twilio in `services/auth-service/.env`:

```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

Get credentials from: https://www.twilio.com/console

## Database Management

### View Database

```bash
# Connect to PostgreSQL
docker exec -it telegram-postgres psql -U postgres -d telegram_clone

# List tables
\dt

# View users
SELECT * FROM users;

# View sessions
SELECT * FROM sessions;

# Exit
\q
```

### Reset Database

```bash
# Stop and remove containers with volumes
docker-compose down -v

# Start fresh
docker-compose up -d

# Restart backend to recreate tables
npm run dev:auth
```

## Development Tips

### Hot Reload

Both backend and frontend support hot reload:
- Backend: Uses `tsx watch` for automatic restart
- Frontend: Uses Vite HMR for instant updates

### API Testing

Test API endpoints with curl:

```bash
# Register phone
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+998901234567","deviceId":"test-device"}'

# Verify code
curl -X POST http://localhost:3001/api/v1/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"verificationId":"uuid-from-register","code":"123456","deviceId":"test-device"}'
```

### View Logs

```bash
# Backend logs
npm run dev:auth

# Frontend logs
npm run dev:web

# Database logs
docker-compose logs -f postgres

# Redis logs
docker-compose logs -f redis
```

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Configure real Twilio credentials
3. Use strong JWT secret
4. Set up proper database (not Docker)
5. Configure HTTPS
6. Set up proper CORS origins
7. Enable rate limiting
8. Set up monitoring and logging

## Next Steps

After authentication is working:

1. Implement user profile management
2. Add real-time messaging with WebSocket
3. Implement group chats
4. Add media upload functionality
5. Implement voice/video calls

See `.kiro/specs/telegram-clone/tasks.md` for the complete roadmap.
