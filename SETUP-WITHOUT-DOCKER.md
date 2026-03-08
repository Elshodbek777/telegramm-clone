# Setup Without Docker - Windows

Agar Docker o'rnatishni xohlamasangiz, PostgreSQL va Redis'ni Windows'ga to'g'ridan-to'g'ri o'rnatishingiz mumkin.

## 1. PostgreSQL o'rnatish

### Download va Install
1. https://www.postgresql.org/download/windows/ ga o'ting
2. PostgreSQL 16 versiyasini yuklab oling
3. O'rnatish jarayonida:
   - Password: `postgres` (yoki o'zingizniki)
   - Port: `5432`
   - Locale: Default

### Database yaratish
1. pgAdmin 4 ni oching (PostgreSQL bilan birga o'rnatiladi)
2. Yoki CMD/PowerShell'da:

```powershell
# PostgreSQL CLI ga kirish
psql -U postgres

# Database yaratish
CREATE DATABASE telegram_clone;

# Chiqish
\q
```

## 2. Redis o'rnatish (Windows)

### Option A: Memurai (Tavsiya etiladi - Windows uchun)
1. https://www.memurai.com/get-memurai ga o'ting
2. Memurai Developer Edition (Free) yuklab oling
3. O'rnating
4. Memurai Service avtomatik ishga tushadi

### Option B: WSL orqali Redis
```powershell
# WSL o'rnatish (agar yo'q bo'lsa)
wsl --install

# WSL ichida Redis o'rnatish
wsl
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

## 3. Environment o'zgartirish

Agar PostgreSQL parolingiz boshqa bo'lsa, `.env` faylini o'zgartiring:

**services/auth-service/.env:**
```env
DATABASE_URL=postgresql://postgres:SIZNING_PAROLINGIZ@localhost:5432/telegram_clone
REDIS_URL=redis://localhost:6379
```

## 4. Ishga tushirish

```bash
# Dependencies o'rnatish
npm install

# Backend ishga tushirish
npm run dev:auth

# Yangi terminal - Frontend ishga tushirish
npm run dev:web
```

## 5. Tekshirish

### PostgreSQL tekshirish
```powershell
psql -U postgres -d telegram_clone -c "SELECT version();"
```

### Redis tekshirish
```powershell
redis-cli ping
# Yoki Memurai uchun:
memurai-cli ping
```

Agar "PONG" javobini olsangiz, hammasi ishlayapti! ✅

## Troubleshooting

### PostgreSQL ishlamayapti
```powershell
# Service holatini tekshirish
Get-Service postgresql*

# Service ishga tushirish
Start-Service postgresql-x64-16
```

### Redis/Memurai ishlamayapti
```powershell
# Memurai service tekshirish
Get-Service Memurai

# Ishga tushirish
Start-Service Memurai
```

### Port band
```powershell
# Port 5432 ni tekshirish
netstat -ano | findstr :5432

# Port 6379 ni tekshirish
netstat -ano | findstr :6379
```

## Alternative: Cloud Database (Eng oson)

Agar mahalliy o'rnatish qiyin bo'lsa, cloud database ishlatishingiz mumkin:

### PostgreSQL - Neon (Free)
1. https://neon.tech ga ro'yxatdan o'ting
2. Database yarating
3. Connection string oling
4. `.env` ga qo'ying:
```env
DATABASE_URL=postgresql://user:pass@host.neon.tech/telegram_clone
```

### Redis - Upstash (Free)
1. https://upstash.com ga ro'yxatdan o'ting
2. Redis database yarating
3. Connection string oling
4. `.env` ga qo'ying:
```env
REDIS_URL=redis://default:pass@host.upstash.io:6379
```

Bu usul bilan hech narsa o'rnatmasdan ishlay olasiz! 🚀
