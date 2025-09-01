@echo off
echo Starting Card Game Server...
cd /d "%~dp0"
start http://localhost:3001/index.html
npx http-server -p 3001 -c-1