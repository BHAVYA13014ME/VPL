# Deployment Guide

This project uses a **split deployment** strategy:
- **Frontend** → [Vercel](https://vercel.com) (React static site)
- **Backend** → [Railway](https://railway.app) or [Render](https://render.com) (Node.js + Socket.IO)

> Socket.IO requires persistent WebSocket connections, which are **not** supported by Vercel serverless functions. The backend must be deployed on a platform that supports long-lived processes.

---

## 1. Deploy the Backend (Railway — recommended)

### Steps
1. Create a free account at [railway.app](https://railway.app).
2. Click **New Project → Deploy from GitHub repo**.
3. Select this repository.
4. Set the **Root Directory** to `backend`.
5. Add the following **Environment Variables** in the Railway dashboard (copy from `backend/.env.example`):

| Variable | Value |
|---|---|
| `PORT` | `5000` |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | A long random secret string |
| `JWT_EXPIRE` | `7d` |
| `CLIENT_URL` | Your Vercel frontend URL (set after step 2 below) |

6. Railway will automatically run `npm start` (`node server.js`).
7. Copy the deployed URL, e.g. `https://vpl-backend.railway.app`.

### Alternative: Render
1. Create a new **Web Service** at [render.com](https://render.com).
2. Connect your GitHub repo, set Root Directory → `backend`.
3. Build command: `npm install` — Start command: `node server.js`
4. Add the same environment variables as above.

---

## 2. Deploy the Frontend (Vercel)

### Steps
1. Go to [vercel.com](https://vercel.com) → **New Project → Import Git Repository**.
2. Select this repository.
3. Set **Root Directory** to `frontend`.
4. Set **Framework Preset** to `Create React App`.
5. Add these **Environment Variables**:

| Variable | Value |
|---|---|
| `REACT_APP_BACKEND_URL` | `https://your-backend.railway.app` |
| `REACT_APP_API_URL` | `https://your-backend.railway.app/api` |

6. Click **Deploy**.
7. Copy your Vercel URL, e.g. `https://vpl.vercel.app`.

### SPA Routing
`frontend/vercel.json` already includes the SPA rewrite rule so all routes serve `index.html`.

---

## 3. Connect Backend ↔ Frontend

After both are deployed:

1. In Railway dashboard → your backend service → **Variables**:
   - Set `CLIENT_URL` = `https://vpl.vercel.app` (your actual Vercel URL)
2. Redeploy (or it auto-deploys on variable change).

This tells the backend's CORS config to allow requests from your Vercel frontend.

---

## 4. OAuth Setup (Google / GitHub) — optional

Update callback URLs in your OAuth app settings to point to the production backend:
- Google: `https://your-backend.railway.app/api/auth/google/callback`
- GitHub: `https://your-backend.railway.app/api/auth/github/callback`

Update `GOOGLE_CALLBACK_URL` / `GITHUB_CALLBACK_URL` env vars on Railway accordingly.

---

## 5. File Uploads in Production

By default the backend stores uploaded files in `backend/uploads/` on the local filesystem.  
On Railway/Render these files **disappear on redeploy**.

For persistent file storage, integrate a cloud storage service (e.g. Cloudinary or AWS S3) and update `backend/middleware/upload.js` accordingly.

---

## Local Development (unchanged)

```bash
# Install all dependencies
npm run install-deps

# Run both frontend and backend with hot-reload
npm run dev
```

Frontend runs on `http://localhost:3000`, backend on `http://localhost:5000`.
