# 🚀 Quick Start - 5 Minutes to Running App

## 1️⃣ Install Dependencies (1 min)

```bash
npm install
```

## 2️⃣ Start Database (30 sec)

```bash
docker-compose up -d
```

## 3️⃣ Start Backend (30 sec)

```bash
npm run dev:auth
```

Wait for:
```
✅ Database tables initialized
✅ Redis connected
🚀 Auth service running on port 3001
```

## 4️⃣ Start Frontend (30 sec)

Open a new terminal:

```bash
npm run dev:web
```

## 5️⃣ Open Browser

Go to: **http://localhost:3000**

## 6️⃣ Test Login

1. Enter phone: `+998901234567`
2. Click "Continue"
3. Check backend terminal for code (e.g., `123456`)
4. Enter the code
5. ✅ You're in!

---

## 📸 What You'll See

### Login Page
- Professional Telegram-style design
- Phone number input with country selector
- Smooth animations and transitions

### Verification Page
- 6-digit code input
- Auto-focus and numeric keyboard
- Loading states and error handling

### Home Page
- Welcome message
- User info display
- Logout button

---

## 🎯 Features Included

✅ Phone authentication with SMS verification
✅ JWT session management (30-day expiry)
✅ Redis caching for verification codes
✅ PostgreSQL database for users
✅ Professional UI with Tailwind CSS
✅ TypeScript full-stack
✅ Error handling and validation
✅ Responsive design

---

## 🛠️ Tech Stack

**Backend:** Node.js, Express, TypeScript, PostgreSQL, Redis, JWT
**Frontend:** React, TypeScript, Tailwind CSS, Zustand, React Router

---

## 📝 Notes

- In development mode, SMS codes are logged to console
- Verification codes expire in 5 minutes
- Maximum 3 verification attempts
- Sessions last 30 days

---

## 🐛 Troubleshooting

**Port already in use?**
```bash
# Kill process on port 3001
npx kill-port 3001

# Kill process on port 3000
npx kill-port 3000
```

**Database not connecting?**
```bash
docker-compose restart postgres redis
```

**Need to reset everything?**
```bash
docker-compose down -v
docker-compose up -d
npm run dev:auth
```

---

## 📚 Full Documentation

- **SETUP.md** - Detailed setup guide
- **README.md** - Project overview and API docs
- **.kiro/specs/** - Complete project specifications

---

## 🎉 Next Steps

After authentication works, you can implement:
- User profiles
- Real-time messaging
- Group chats
- Media sharing
- Voice/video calls

See `tasks.md` for the complete roadmap!
