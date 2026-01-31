Write-Host "🚀 Iniciando Quintas CRM..." -ForegroundColor Cyan

# 1. Iniciar Backend (Directus)
Write-Host "Starting Backend (Directus)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& { Write-Host 'BACKEND - DIRECTUS' -ForegroundColor Magenta; npm start }"

# 2. Iniciar Frontend (Next.js)
Write-Host "Starting Frontend (Next.js)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& { cd frontend; Write-Host 'FRONTEND - NEXT.JS' -ForegroundColor Cyan; npm run dev }"

Write-Host "✅ Servicios iniciados en ventanas separadas." -ForegroundColor Yellow
Write-Host "Backend URL: http://localhost:8055"
Write-Host "Frontend URL: http://localhost:3000"
