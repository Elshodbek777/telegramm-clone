# MongoDB Setup Guide

## 1. MongoDB o'rnatish (Windows)

### Option 1: MongoDB Community Server (Tavsiya etiladi)

1. **MongoDB yuklab olish:**
   - https://www.mongodb.com/try/download/community ga o'ting
   - Windows versiyasini tanlang
   - MSI installer yuklab oling

2. **O'rnatish:**
   - Installer ni ishga tushiring
   - "Complete" setup ni tanlang
   - "Install MongoDB as a Service" ni belgilang
   - "Install MongoDB Compass" ni belgilang (GUI tool)

3. **Tekshirish:**
   ```bash
   mongod --version
   ```

### Option 2: MongoDB Docker (Agar Docker o'rnatilgan bo'lsa)

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

## 2. MongoDB ishga tushirish

### Windows Service sifatida (avtomatik ishga tushadi)
MongoDB o'rnatilgandan keyin avtomatik ishga tushadi.

### Qo'lda ishga tushirish:
```bash
# Windows Services dan "MongoDB Server" ni ishga tushiring
# yoki
net start MongoDB
```

## 3. MongoDB Compass (GUI) ishlatish

1. MongoDB Compass ni oching
2. Connection string: `mongodb://localhost:27017`
3. "Connect" bosing
4. `telegram-clone` database yaratiladi (avtomatik)

## 4. Backend ishga tushirish

```bash
cd services/auth-service
npm run dev:mongodb
```

## 5. Ma'lumotlarni ko'rish

### MongoDB Compass orqali:
1. Compass ni oching
2. `telegram-clone` database ni tanlang
3. Collections: `users`, `verificationsessions`

### Mongo Shell orqali:
```bash
mongosh
use telegram-clone
db.users.find()
db.verificationsessions.find()
```

## 6. Ma'lumotlarni tozalash (agar kerak bo'lsa)

```bash
mongosh
use telegram-clone
db.users.deleteMany({})
db.verificationsessions.deleteMany({})
```

## Troubleshooting

### MongoDB ishlamayapti:
```bash
# Windows Services ni tekshiring
services.msc
# "MongoDB Server" ni toping va ishga tushiring
```

### Port band:
```bash
# 27017 portni tekshiring
netstat -ano | findstr :27017
```

### Connection error:
- MongoDB service ishga tushganligini tekshiring
- Firewall sozlamalarini tekshiring
- .env faylda MONGODB_URI to'g'ri ekanligini tekshiring

## Afzalliklari

✅ Ma'lumotlar saqlanadi (restart qilsangiz ham)
✅ Real database bilan ishlash tajribasi
✅ Production ga yaqin muhit
✅ Qidiruv tezroq ishlaydi (indexlar bilan)
✅ Bir nechta user yaratib test qilish oson

## Eslatma

Agar MongoDB o'rnatishda muammo bo'lsa, `npm run dev` bilan eski simple versiyani ishlatishingiz mumkin (in-memory storage).
