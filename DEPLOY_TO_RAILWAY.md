# Deploy Backend to Railway - NO GITHUB Required!

## 🚀 Super Simple Deployment (5 Minutes)

---

## Step 1: Sign Up for Railway (1 minute)

1. Go to **https://railway.app**
2. Click **"Start a New Project"**
3. You can sign up with:
   - Email (no GitHub needed!)
   - Google account
   - Or GitHub if you change your mind

---

## Step 2: Create New Project from Template (2 minutes)

### Option A: Upload This Folder Directly

1. In Railway dashboard, click **"New Project"**
2. Select **"Empty Project"**
3. Click **"+ New"** → **"Empty Service"**
4. Click on the service
5. Go to **"Settings"** tab
6. Under **"Source"**, you'll see options to deploy

**UNFORTUNATELY:** Railway doesn't support direct folder upload via web interface.

### Option B: Use Railway CLI (Easiest Without GitHub)

Don't worry - this is SUPER easy! Just 3 commands:

#### On Your Computer:

1. **Download this folder** to your computer
2. **Open Terminal** (Mac) or **Command Prompt** (Windows)
3. **Run these commands:**

```bash
# Install Railway CLI (one time only)
npm install -g @railway/cli

# Navigate to the backend folder
cd path/to/pure-fire-backend

# Login to Railway (opens browser)
railway login

# Deploy!
railway up
```

That's it! Railway will deploy your backend automatically.

---

## Step 3: Add Environment Variables (1 minute)

1. In Railway dashboard, click on your deployed service
2. Go to **"Variables"** tab
3. Click **"+ New Variable"**

Add these THREE variables:

**Variable 1:**
```
NODE_ENV=production
```

**Variable 2:**
```
JWT_SECRET=a4ac027951d58a47c337464ac052870ac439cb27437c26a33d213d7884754305187b5adb84ae96acb9c0585b7f0fec5f79d0e37363b766d3f7733aa8fed9866d
```

**Variable 3:**
```
FRONTEND_URL=https://mgx-website-d6vpsjnxj-pure-fire-nutritional.vercel.app
```

---

## Step 4: Generate Domain (30 seconds)

1. Go to **"Settings"** tab
2. Scroll to **"Networking"**
3. Click **"Generate Domain"**
4. Copy the URL (looks like: `https://xxxxx.up.railway.app`)

---

## Step 5: Connect Frontend (1 minute)

1. Go to **https://vercel.com/dashboard**
2. Click **"mgx-website"** project
3. **Settings** → **Environment Variables**
4. Add new variable:
   - Name: `VITE_API_URL`
   - Value: `https://your-railway-url.up.railway.app/api`
5. **Redeploy** your frontend

---

## ✅ Done!

Your backend is live with user accounts and order tracking!

---

## 🆘 Alternative: I Can Deploy It For You!

If you don't want to deal with any of this:

1. Give me access to your Railway account (create an API token)
2. I'll deploy it for you in 2 minutes
3. You just add the environment variables

Let me know if you want me to do it! 🚀

