# Deploy Frontend to Vercel

> Complete Railway backend deployment first (see RAILWAY.md) — you need the Railway URL before configuring Vercel.

## 1. Deploy to Vercel

1. Go to https://vercel.com → **Login with GitHub**
2. **Add New** → **Project** → import your GitHub repo
3. Set **Root Directory** to `frontend`
4. **Framework Preset** will auto-detect Next.js
5. Under **Environment Variables**, add:

```
NEXT_PUBLIC_API_URL   https://SOMETHING.up.railway.app/api
```

6. Click **Deploy** — build takes ~3 minutes
7. Copy the URL: `https://YOUR_APP.vercel.app`

---

## 2. Update Railway CORS

After getting the Vercel URL, go back to Railway:

**backend service** → **Variables** → update:

```
FRONTEND_URL    https://YOUR_APP.vercel.app
```

Railway restarts the backend automatically — CORS now allows your Vercel domain.

---

## 3. Verify end-to-end

1. Open `https://YOUR_APP.vercel.app` in browser
2. Register a new account
3. Upload a PDF
4. Wait ~15s for indexing (status changes to "indexed")
5. Go to Chat, ask a question
6. Verify the answer includes citations

---

## Redeploy after code changes

Push to GitHub — Vercel auto-redeploys on every push to `master`.

For backend: Railway also auto-redeploys on push.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Build fails — TypeScript error | Run `cd frontend && npm run build` locally first |
| `NEXT_PUBLIC_API_URL` undefined | Verify the env var is set in Vercel project settings |
| CORS error in browser console | `FRONTEND_URL` in Railway must match Vercel URL exactly (no trailing slash) |
| Login works but API calls fail | Check `NEXT_PUBLIC_API_URL` includes `/api` suffix |
