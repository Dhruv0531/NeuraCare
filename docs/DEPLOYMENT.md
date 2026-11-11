# NeuraCare Zero-Cost Cloud Deployment Guide

This document explains **how NeuraCare is deployed for 100% free**, what tools and cloud providers are used, and **how your local machine learning model connects to the public website in plain, simple words**.

---

## 1. The Big Picture (In Simple Words)

NeuraCare is made up of **4 main parts**. Each part runs on a service that is completely free:

```
┌─────────────────────────────────┐
│       1. Next.js Frontend       │  Hosted on Vercel (Free)
│   https://neura-care-woad.      │  - Fast, modern website interface
│            vercel.app           │  - 6-Stage Stepped Adaptive Wizard & Clinician Portal
│                                 │  - Never goes to sleep
└────────────────┬────────────────┘
                 │ (1) User submits assessment or clinician logs in
                 ▼
┌─────────────────────────────────┐
│        2. Express Backend       │  Hosted on Render (Free Web Service)
│   https://neuracare-backend.    │  - Coordinates everything
│          onrender.com           │  - Clinician RBAC & Connect Codes
│                                 │  - Adaptive Section Proxy & Local Fallback
└────────┬───────────────┬────────┘
         │               │
         │ (2) Save/Read │ (3) Sends questions, adaptive sections & text notes
         │     data      │     for AI predictions
         ▼               ▼
┌─────────────────┐  ┌──────────────────────────────────────────────┐
│   3. Database   │  │   4. Cloudflare Tunnel + Your Local ML Model │
│  MongoDB Atlas  │  │   https://<random-name>.trycloudflare.com    │
│  (M0 Free Tier) │  │   - Runs PyTorch & DistilBERT on your PC     │
│  - 512MB Cloud  │  │   - Computes XGBoost, SHAP & Adaptive Engine │
│  - Indexed refs │  │   - Cloudflare safely exposes it to Render   │
└─────────────────┘  └──────────────────────────────────────────────┘
```

---

## 2. Why is the ML Model Running on Your PC Instead of the Cloud?

Many people wonder: *"Why not deploy the Python ML model directly on Render or Vercel?"*

Here is the simple reason:
1. **The Size of the AI**: Your ML service uses **PyTorch**, **Transformers**, and a **267 MB DistilBERT deep learning model** (`model.safetensors`).
2. **Memory Limit**: To run these models, your computer needs **1.5 GB to 2 GB of RAM**.
   - **Render Free Tier**: Only provides **512 MB of RAM**. As soon as PyTorch and DistilBERT load, Render hits memory limits and crashes with an **Out Of Memory (Killed)** error.
   - **Vercel**: Designed for ephemeral stateless API routes and web frontends, where heavy deep learning frameworks (PyTorch, transformers) exceed practical package bundle limits and encounter severe cold-start latencies.
3. **The Free Solution**:
   - Your PC already has plenty of RAM and power.
   - By running the heavy Python model on your PC and using **Cloudflare Tunnel**, Cloudflare gives your local model a **secure, public HTTPS link** (`https://xxx.trycloudflare.com`).
   - Your Render backend simply calls that link as if it were a massive cloud server — **at zero cost!**

---

## 3. How the 4 Components Connect Together

### Step 1: The User Visits the Frontend
A user opens `https://neura-care-woad.vercel.app` on their phone or laptop.

### Step 2: Frontend Calls the Backend
The frontend has an environment variable configured in Vercel:
```env
NEXT_PUBLIC_API_URL=https://neuracare-backend.onrender.com
```
When a user logs in, completes a stepped adaptive section, or submits an evaluation, the frontend sends the request to your Render backend.

### Step 3: Backend Calls the ML Model
The Render backend has an environment variable configured in Render:
```env
ML_API_URL=https://<your-tunnel-name>.trycloudflare.com
```
The backend forwards the questionnaire answers, adaptive section cluster analysis requests, and the journal entry to this link.

### Step 4: Cloudflare Delivers it to Your PC
Cloudflare routes the request down through the tunnel into your PC's `http://localhost:8000`. Your Python code calculates the XGBoost risk, SHAP explanations, DistilBERT emotions, and Stepped Adaptive questions, and sends the answer back!

### Step 5: Backend Saves to Database
The backend tags the patient's assigned clinician (if linked), saves the final report to your **MongoDB Atlas** database, and sends the results back to the user's screen.

---

## 4. Summary of Free Providers Used

| Service | What It Does | Why It's Free |
| :--- | :--- | :--- |
| **Vercel** | Hosts the Next.js Frontend | Unlimited personal projects on the Hobby Free Tier. Always online. |
| **Render** | Hosts the Express.js Backend API | Free Web Service tier (512 MB RAM, spins down after 15 min inactivity). |
| **MongoDB Atlas** | Stores users, clinician profiles, and assessments | Free M0 Cluster (512 MB storage forever, no credit card required). |
| **Cloudflare Quick Tunnel** | Bridges your local ML model to Render | 100% free tool (`cloudflared.exe`) with no account or domain needed. |
| **OpenRouter** | Generates clinical recommendations & adaptive questions | Free-tier LLM models (`liquid/lfm-2.5-2.6b:free`). |

---

## 5. What Happens After Inactivity (Coming Back After 2 Days)

### The Cloud Parts (Vercel & MongoDB Atlas)
- **Status**: 🟢 **Always active**. They never shut down.

### The Backend (Render)
- **Status**: 🟡 **Sleeps after 15 minutes**.
- **How to wake it up**: Just open your website! The very first request will take **~40 seconds** while Render spins the container back up. After that, it runs fast.

### The Local ML Model (Your PC)
- **Status**: 🔴 **Stops when you shut down your PC or close the terminal**.
- If your PC is off, your website **still works!** The backend has an automatic two-tier fallback:
  * Adaptive questions use built-in deterministic JS clinical templates.
  * Assessment submissions calculate scores using standard medical sum rules.
  * The user never sees an error.

---

## 6. How to Start the ML Model Again (Step-by-Step)

Whenever you restart your PC or want to demonstrate the full AI pipeline:

### Method A: With Antigravity (Easiest)
Just type in the Antigravity chat:
> *"Start the ML model and tunnel"*

The AI will launch both processes and provide your active link right in the chat.

---

### Method B: Manually (2 Double-Clicks)
1. In `E:\NeuraCare`, double-click **`run_ml_service.bat`**.
   *(Wait for: `Uvicorn running on http://127.0.0.1:8000`)*
2. Double-click **`run_tunnel.bat`**.
   *(Look for: `https://<random-name>.trycloudflare.com`)*
3. If the link name changed:
   - Go to [dashboard.render.com](https://dashboard.render.com/) → **`neuracare-backend`**.
   - Go to **Environment Variables** → update **`ML_API_URL`** to the new link.
   - Click **Save Changes**.

---

## 7. Deployment Sanity Verification

To verify that all services, models, endpoints, and RBAC security rules are functioning correctly in your environment, run the master sanity test suite:

```bash
python run_sanity_check.py
```

This runs 23 automated tests verifying:
- XGBoost, SHAP, DistilBERT, ISI, and Stepped Adaptive question generation.
- Node.js backend health and adaptive section proxying.
- Clinician connect code generation and RBAC authorization isolation.
- Complete end-to-end clinical assessment lifecycle.
