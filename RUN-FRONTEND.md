# Frontend Ishga Tushirish

## 1️⃣ Frontend dependencies o'rnatish

```bash
cd clients/web-client
npm install
cd ../..
```

## 2️⃣ Frontend ishga tushirish

```bash
npm run dev:web
```

## ❌ Agar xatolik bo'lsa

### "npm run dev:web" ishlamasa:

```bash
cd clients/web-client
npm run dev
```

### Port 3000 band bo'lsa:

```bash
npx kill-port 3000
npm run dev:web
```

### Dependencies o'rnatilmagan bo'lsa:

```bash
# Root papkada
npm install

# Frontend papkada
cd clients/web-client
npm install
cd ../..

# Qayta urinib ko'ring
npm run dev:web
```

## ✅ Ishlashi kerak

Ko'rishingiz kerak:
```
VITE v5.0.8  ready in 500 ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

Keyin browser'da: http://localhost:3000
