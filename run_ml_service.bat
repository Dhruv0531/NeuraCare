@echo off
title NeuraCare ML Service
cd /d "%~dp0src\backend"
echo Starting NeuraCare Python ML Service on http://localhost:8000...
.\.venv\Scripts\uvicorn app.main:app --port 8000
pause
