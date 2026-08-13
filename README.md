# NeuraCare

NeuraCare is a mental health assessment platform that allows users to complete wellness evaluations, view risk insights, and review past results. The project contains a Node/Express backend, a Next.js frontend, and a legacy React app in the root folder.

## Project structure

- backend/ - Express API and MongoDB integration
- frontend/ - Next.js application used for the main UI
- src/ - older React project kept for reference or legacy use
- public/ - static web assets

## Tech stack

- Frontend: Next.js, React, Tailwind CSS
- Backend: Node.js, Express, MongoDB
- Optional ML API: Python + FastAPI

## Prerequisites

Before running the project, make sure you have:

- Node.js 18+
- npm
- Python 3.10+ (for the optional ML API)
- MongoDB running locally or a valid MongoDB connection string

## 1) Install backend dependencies

```bash
cd backend
npm install
```

Create a `.env` file inside the backend folder:

```env
PORT=5000
JWT_SECRET=your_secret_key
MONGODB_URI=mongodb://localhost:27017/neuracare
ML_API_URL=http://localhost:8000
```

Then start the API:

```bash
cd backend
npm run dev
```

The backend runs on:

- http://localhost:5000

## 2) Install frontend dependencies

```bash
cd frontend
npm install
```

Start the frontend:

```bash
cd frontend
npm run dev
```

The app runs on:

- http://localhost:3000

## 3) Optional Python ML service

There is also a Python FastAPI app under the legacy folder structure. To run it:

```bash
cd src/backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

This service is used by the backend for prediction requests when configured via `ML_API_URL`.

## Common workflow

1. Start MongoDB
2. Start backend API
3. Start frontend app
4. Open http://localhost:3000 in the browser

## Notes

- The backend falls back to mock prediction data if the ML service is unavailable.
- If MongoDB is not available, the app may still boot in a degraded mode but saved assessments will not persist.
- The root React project is older and not the main app currently used for development.

## Useful scripts

Backend:

```bash
cd backend
npm run dev
npm start
```

Frontend:

```bash
cd frontend
npm run dev
npm run build
```

## Production build

Frontend production build:

```bash
cd frontend
npm run build
```

## License

This project is for educational and internal project use unless a separate license is added later.
