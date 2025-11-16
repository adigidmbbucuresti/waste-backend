# 🚀 Waste Management Backend

Backend pentru platforma de gestionare a deșeurilor - Node.js + Express + PostgreSQL + Prisma

---

## 📋 Conținut

- [Tehnologii](#tehnologii)
- [Setup Local](#setup-local)
- [Deploy Railway](#deploy-railway)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)

---

## 🛠️ Tehnologii

- **Node.js 18+** - Runtime
- **Express** - Web framework
- **PostgreSQL** - Database
- **Prisma** - ORM
- **JWT** - Authentication
- **bcryptjs** - Password hashing

---

## 💻 Setup Local

### 1. Instalează dependențele

```bash
npm install
```

### 2. Configurează environment variables

Creează fișierul `.env` (copiază din `.env.example`):

```bash
cp .env.example .env
```

Editează `.env` și completează:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://user:password@localhost:5432/waste_management?schema=public"
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
FRONTEND_URL=http://localhost:5173
```

### 3. Pornește PostgreSQL local

**Opțiune A - Docker:**
```bash
docker run --name postgres-waste -e POSTGRES_PASSWORD=password -e POSTGRES_DB=waste_management -p 5432:5432 -d postgres:15
```

**Opțiune B - PostgreSQL instalat local:**
```bash
# Creează database
createdb waste_management
```

### 4. Rulează migrările Prisma

```bash
npm run prisma:push
```

Sau dacă vrei cu migrări:
```bash
npm run prisma:migrate
```

### 5. (Opțional) Vizualizează database-ul

```bash
npm run prisma:studio
```

Se deschide Prisma Studio pe `http://localhost:5555`

### 6. Pornește serverul

```bash
npm run dev
```

Server pornit pe: `http://localhost:3000`

---

## 🚂 Deploy pe Railway

### Pasul 1: Pregătește repository-ul

```bash
# Inițializează Git (dacă nu ai făcut deja)
git init

# Adaugă fișierele
git add .
git commit -m "Initial backend setup"

# Push pe GitHub
git remote add origin https://github.com/your-username/waste-backend.git
git push -u origin main
```

### Pasul 2: Creează cont Railway

1. Mergi pe [railway.app](https://railway.app)
2. Sign up cu GitHub

### Pasul 3: Deploy aplicația

1. **New Project** → **Deploy from GitHub repo**
2. Selectează repository-ul tău
3. Railway detectează automat Node.js

### Pasul 4: Adaugă PostgreSQL

1. În project, click **+ New**
2. Selectează **Database** → **PostgreSQL**
3. Railway generează automat `DATABASE_URL`

### Pasul 5: Configurează Environment Variables

În **Variables** tab, adaugă:

```
NODE_ENV=production
JWT_SECRET=[generează un string random puternic]
JWT_REFRESH_SECRET=[alt string random]
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=[URL-ul StackBlitz-ului tău]
```

**Generează JWT secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Pasul 6: Deploy Prisma

Railway va rula automat:
```bash
npx prisma generate
npx prisma db push
```

### Pasul 7: Obține URL-ul public

Railway îți dă un URL de genul:
```
https://your-app.railway.app
```

**GATA!** Backend-ul tău e live! 🎉

---

## 🔗 API Endpoints

### Base URL
```
Local: http://localhost:3000
Railway: https://your-app.railway.app
```

### Authentication

#### POST `/api/auth/login`
Login utilizator

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Autentificare reușită",
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@example.com",
      "name": "admin",
      "globalRole": "PLATFORM_ADMIN",
      "institutions": []
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

#### POST `/api/auth/refresh`
Reîmprospătează access token

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc..."
  }
}
```

#### GET `/api/auth/me`
Obține datele utilizatorului curent

**Headers:**
```
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@example.com",
      "globalRole": "PLATFORM_ADMIN",
      "institutions": []
    }
  }
}
```

#### POST `/api/auth/logout`
Logout utilizator

**Headers:**
```
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
{
  "success": true,
  "message": "Deconectare reușită"
}
```

---

## 🔐 Environment Variables

| Variable | Descriere | Exemplu |
|----------|-----------|---------|
| `PORT` | Port server | `3000` |
| `NODE_ENV` | Environment | `development` / `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `JWT_SECRET` | Secret pentru access tokens | `random-string-32-chars` |
| `JWT_REFRESH_SECRET` | Secret pentru refresh tokens | `another-random-string` |
| `JWT_EXPIRES_IN` | Expirare access token | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Expirare refresh token | `7d` |
| `FRONTEND_URL` | URL frontend pentru CORS | `https://stackblitz.com` |

---

## 🗄️ Database Schema

### Users
```sql
- id (UUID, PK)
- email (unique)
- password_hash
- global_role (enum: PLATFORM_ADMIN, REGULATOR_VIEWER, STANDARD_USER)
- is_active (boolean)
- created_at
- updated_at
```

### Institutions
```sql
- id (UUID, PK)
- name
- type (enum: PRIMARIE_SECTOR, PMB, OPERATOR_SALUBRIZARE, etc.)
- territory_level (enum: SECTOR, MUNICIPIU, JUDET, NATIONAL)
- territory_code
- is_active
- created_at
- updated_at
```

### User_Institutions
```sql
- id (UUID, PK)
- user_id (FK → users)
- institution_id (FK → institutions)
- institution_role (enum: INSTITUTION_ADMIN, INSTITUTION_EDITOR, INSTITUTION_VIEWER)
- created_at
```

---

## 🧪 Testing

### Testează cu cURL

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.ro","password":"password123"}'
```

**Get current user:**
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Testează cu Postman

1. Importă collection (vezi `/postman` folder)
2. Setează `{{baseUrl}}` variable
3. Rulează requests

---

## 🔧 Scripts NPM

```bash
# Development cu hot reload
npm run dev

# Production
npm start

# Generează Prisma Client
npm run prisma:generate

# Rulează migrări
npm run prisma:migrate

# Push schema la DB (fără migrări)
npm run prisma:push

# Deschide Prisma Studio
npm run prisma:studio
```

---

## 📝 Următorii pași

După ce backend-ul funcționează:

1. **Creează primul user admin** (direct în DB sau script seed)
2. **Testează toate endpointurile**
3. **Conectează frontend-ul** din StackBlitz
4. **Adaugă validări** (express-validator)
5. **Adaugă rate limiting**
6. **Implementează refresh token rotation**

---

## 🐛 Troubleshooting

### Eroare: "Can't reach database server"
- Verifică că PostgreSQL rulează
- Verifică `DATABASE_URL` în `.env`

### Eroare: "JWT must be provided"
- Token lipsește sau invalid
- Verifică header-ul `Authorization: Bearer <token>`

### Eroare: "CORS error"
- Adaugă URL-ul frontend-ului în `FRONTEND_URL`
- Verifică configurația CORS din `server.js`

---

## 📧 Contact

Pentru probleme sau întrebări, deschide un Issue pe GitHub.

---

**Succes cu deployment-ul! 🚀**
