@echo off
title NeuraCare Cloudflare Tunnel
cd /d "%~dp0"
echo Starting Cloudflare Tunnel for NeuraCare ML Service...
echo The public HTTPS URL will appear below:
echo ========================================================
.\tools\cloudflared.exe tunnel --url http://localhost:8000
pause
