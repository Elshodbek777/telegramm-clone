# 🚀 Windows uchun Tez Ishga Tushirish

## Docker bor bo'lsa

```powershell
# Yangi Docker versiyasi (tire yo'q!)
docker compose up -d

# Eski versiya bo'lsa
docker-compose up -d
```

## Docker yo'q bo'lsa - 3 ta variant

### ✅ Variant 1: Docker Desktop o'rnatish (ENG OSON)

1. **Yuklab olish:** https://www.docker.com/products/docker-desktop/
2. **O'rnatish va ishga tushirish**
3. **Buyruq:**
   ```powershell
   docker compose up -d
   ```

### ✅ Variant 2: Cloud Database (O'RNATISHSIZ)

**PostgreSQL - Neon (Free):**
1. https://neon.tech ga kiring
2. Database yarating
3. Connection string oling

**Redis - Upstash (Free):**
1. https://upstash.com ga kiring
2. Redis yarating
3. Connection string oling

**services/auth-service/.env ni yangilang:**
```env
DATABASE_URL=postgresql://user:pass@host.neon.tech/telegram_clone
REDIS_URL=redis://default:pass@host.upstash.io:6379
```

### ✅ Variant 3: Mahalliy o'rnatish

**PostgreSQL:**
- https://www.postgresql.org/download/windows/
- O'rnating, password: `postgres`, port: `5432`

**Redis (Memurai):**
- https://www.memurai.com/get-memurai
- Developer Edition (Free) o'rnating

## Keyin

```powershell
# 1. Dependencies
npm install

# 2. Backend (Terminal 1)
npm run dev:auth

# 3. Frontend (Terminal 2)
npm run dev:web

# 4. Browser
# http://localhost:3000
```

## ✅ Tayyor!

Phone: `+998901234567`
Code: Backend terminalda ko'ring

---

**Batafsil:** `SETUP-WITHOUT-DOCKER.md` ni o'qing
