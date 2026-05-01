# Deploy Backend to Railway

## 1. Setup GitHub repo first

```bash
# In project root (e.g. E:\Project ca nhan\Website)
git init
git add .
git commit -m "feat: initial commit"
```

Go to https://github.com/new → create a **private** repo → copy the remote URL, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin master
```

---

## 2. Create Railway project

1. Go to https://railway.app → **Login with GitHub**
2. **New Project** → **Deploy from GitHub repo** → select your repo
3. Railway will ask which folder — set **Root Directory** to `backend`
4. It will auto-detect the `Dockerfile` and start building

---

## 3. Add PostgreSQL database

In the project view:
- Click **+ New** → **Database** → **PostgreSQL**
- Wait for it to provision (~30s)

---

## 4. Add persistent volumes

Click on the **backend service** → **Settings** → **Volumes** → **Add Volume**:

| Mount Path | Purpose |
|---|---|
| `/app/storage` | Uploaded PDF files |
| `/app/vector_store` | ChromaDB embeddings |

These paths match the defaults in `backend/app/config.py`.

---

## 5. Set environment variables

Click on the **backend service** → **Variables** → add each:

```
DATABASE_URL          ${{Postgres.DATABASE_URL}}
ENVIRONMENT           production
FRONTEND_URL          https://YOUR_APP.vercel.app    <- fill after Vercel deploy
JWT_SECRET_KEY        <generate below>
INITIAL_ADMIN_EMAIL   admin@example.com
INITIAL_ADMIN_PASSWORD <strong password — 12+ chars, upper+lower+digit+special>
INITIAL_ADMIN_NAME    Administrator
LLM_PROVIDER          anthropic
LLM_MODEL_NAME        claude-haiku-4-5
ANTHROPIC_API_KEY     <your key from genzshop>
ANTHROPIC_BASE_URL    https://1gw.gwai.cloud
EMBEDDING_MODEL_NAME  sentence-transformers/all-MiniLM-L6-v2
RETRIEVAL_TOP_K       5
```

**Generate JWT_SECRET_KEY:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

> **Note**: `OPENAI_API_KEY` and `GOOGLE_API_KEY` are optional — only set if you want those providers.

---

## 6. Generate public domain

Click **backend service** → **Settings** → **Networking** → **Generate Domain**

Copy the URL: `https://SOMETHING.up.railway.app`

---

## 7. Verify deployment

```bash
curl https://SOMETHING.up.railway.app/health
# Expected: {"status":"ok","service":"Research Paper Assistant API"}
```

If the first deploy is slow (2-3 min), it is downloading the 100MB sentence-transformers model.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Build fails — `psycopg2` error | Railway uses Linux, binary wheel should work; check build logs |
| `ValidationError` on startup | Missing env var — check all required vars are set |
| ChromaDB resets after redeploy | Volume not mounted at `/app/vector_store` |
| 502 on first chat | Model loading takes ~30s on cold start — wait and retry |
