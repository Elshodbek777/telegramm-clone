# Telegram Clone - Authentication System

Professional login and registration system with phone verification for Telegram Clone.

## Features

✅ Phone number authentication with SMS verification
✅ Professional UI design with Telegram-style branding
✅ JWT-based session management
✅ Redis caching for verification codes
✅ PostgreSQL database for user data
✅ TypeScript full-stack implementation
✅ React frontend with Tailwind CSS
✅ Express.js backend with proper error handling

## Tech Stack

### Backend
- Node.js + TypeScript
- Express.js
- PostgreSQL (user data)
- Redis (verification sessions)
- JWT (authentication)
- Twilio (SMS - optional)

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- Zustand (state management)
- React Router
- Axios

## Quick Start

### 1. Start Database Services

```bash
docker-compose up -d
```

This starts PostgreSQL and Redis containers.

### 2. Install Dependencies

```bash
# Install all workspace dependencies
npm install

# Or install individually
cd services/auth-service && npm install
cd clients/web-client && npm install
```

### 3. Start Backend (Auth Service)

```bash
npm run dev:auth
```

Backend runs on http://localhost:3001

### 4. Start Frontend (Web Client)

```bash
npm run dev:web
```

Frontend runs on http://localhost:3000

## Usage

1. Open http://localhost:3000
2. Enter your phone number in E.164 format (e.g., +998901234567)
3. Check console for verification code (in development mode)
4. Enter the 6-digit code
5. You're logged in!

## Development Mode

In development, SMS codes are logged to the console instead of being sent via Twilio:

```
📱 SMS to +998901234567: Your verification code is 123456
```

## API Endpoints

### POST /api/v1/auth/register
Register phone number and send verification code.

**Request:**
```json
{
  "phoneNumber": "+998901234567",
  "deviceId": "unique-device-id"
}
```

**Response:**
```json
{
  "verificationId": "uuid",
  "expiresAt": 1234567890000
}
```

### POST /api/v1/auth/verify
Verify code and create session.

**Request:**
```json
{
  "verificationId": "uuid",
  "code": "123456",
  "deviceId": "unique-device-id"
}
```

**Response:**
```json
{
  "userId": "uuid",
  "sessionToken": "jwt-token",
  "expiresAt": 1234567890000,
  "isNewUser": true,
  "user": {
    "userId": "uuid",
    "phoneNumber": "+998901234567",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Project Structure

```
telegram-clone/
├── services/
│   └── auth-service/          # Authentication backend
│       ├── src/
│       │   ├── config/        # Database & Redis config
│       │   ├── services/      # Business logic
│       │   ├── routes/        # API routes
│       │   ├── middleware/    # Error handling
│       │   └── utils/         # Validation & errors
│       └── package.json
├── clients/
│   └── web-client/            # React frontend
│       ├── src/
│       │   ├── api/           # API calls
│       │   ├── pages/         # Login & Home pages
│       │   ├── store/         # Zustand store
│       │   └── types/         # TypeScript types
│       └── package.json
├── docker-compose.yml         # PostgreSQL & Redis
└── package.json               # Workspace root
```

## Environment Variables

### Backend (.env)
```env
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/telegram_clone
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001/api/v1
```

## Security Features

- Phone number validation (E.164 format)
- 6-digit verification codes
- 5-minute code expiration
- Maximum 3 verification attempts
- JWT session tokens (30-day expiry)
- Password hashing for session tokens
- CORS protection
- Input validation with Zod

## Next Steps

This authentication system is ready for:
- User profile management
- Real-time messaging
- Group chats
- Media sharing
- Voice/video calls

See `.kiro/specs/telegram-clone/tasks.md` for the full implementation plan.

## License

MIT
