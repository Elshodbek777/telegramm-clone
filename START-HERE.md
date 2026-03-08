# 🚀 Boshlash - 3 Qadam

## ✅ Barcha muammolar hal qilindi!

- Phone input formatlash ishlaydi
- Mock mode - database/Redis kerak emas
- Verification kodlar console'ga chiqadi

## 1️⃣ Dependencies o'rnatish

```bash
npm install
```

## 2️⃣ Backend ishga tushirish

```bash
npm run dev:auth
```

Ko'rishingiz kerak:
```
⚠️  Running in MOCK mode (no database required)
📝 Verification codes will be logged to console
🚀 Auth service running on port 3001
📍 http://localhost:3001
🔧 Mode: MOCK (Development)
```

## 3️⃣ Frontend ishga tushirish

Yangi terminal oching:

```bash
npm run dev:web
```

## 4️⃣ Test qilish

1. Browser: http://localhost:3000
2. Telefon kiriting: `901234567`
3. Avtomatik formatlanadi: `+998 90 123 45 67`
4. "Continue" bosing
5. Backend terminalda kodni ko'ring:
   ```
   📱 SMS to +998901234567: Your verification code is 123456
   ```
6. Kodni kiriting: `123456`
7. ✅ Tizimga kirdingiz!

## 🎉 Xususiyatlar

✅ Phone formatlash - avtomatik bo'sh joylar
✅ Mock mode - database kerak emas
✅ Verification kodlar console'da
✅ To'liq authentication
✅ Professional UI
✅ Error handling
✅ Loading states

## 🔧 Mock Mode

Mock mode nima qiladi:
- Barcha ma'lumotlar xotirada saqlanadi
- Database/Redis kerak emas
- Verification kodlar console'ga chiqadi
- Tez va oson test qilish
- Production uchun `.env` da `USE_MOCK=false` qiling

## 📝 Test Ma'lumotlari

Istalgan telefon raqamini kiriting:
- `+998 90 123 45 67`
- `+998 91 234 56 78`
- `+998 93 456 78 90`

Verification kod backend terminalda ko'rinadi!

## ❓ Muammolar

### Backend ishlamayapti?
```bash
# Port band bo'lsa
npx kill-port 3001

# Qayta ishga tushiring
npm run dev:auth
```

### Frontend ishlamayapti?
```bash
# Port band bo'lsa
npx kill-port 3000

# Qayta ishga tushiring
npm run dev:web
```

### Kod kelmayapti?
Backend terminalga qarang - kod u yerda chiqadi!

## 🎯 Keyingi Qadamlar

Authentication ishlayapti! Endi qo'shishingiz mumkin:
- User profile
- Real-time messaging
- Group chats
- Media sharing

Barcha vazifalar: `.kiro/specs/telegram-clone/tasks.md`

---

**Tayyor! Ishga tushiring va test qiling! 🚀**
