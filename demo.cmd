@echo off
echo =========================================
echo   Analytics Platform — Demo Runner
echo =========================================
echo.

where docker >nul 2>nul
if %errorlevel% neq 0 ( echo ERROR: docker not found. && exit /b 1 )
where node >nul 2>nul
if %errorlevel% neq 0 ( echo ERROR: node not found. && exit /b 1 )
where npm >nul 2>nul
if %errorlevel% neq 0 ( echo ERROR: npm not found. && exit /b 1 )

if not exist ".env" (
    echo [*] Creating .env from .env.example...
    copy .env.example .env
)

if not exist "node_modules" (
    echo [1/5] Installing npm dependencies...
    call npm install
) else (
    echo [1/5] Dependencies already installed.
)

echo.
echo [2/5] Starting PostgreSQL...
docker compose up postgres -d --wait
echo   PostgreSQL is ready.

echo.
echo [3/5] Setting up database schema...
call npx prisma generate
call npx prisma db push

echo.
echo [4/5] Seeding demo data...
call npx tsx prisma/seed.ts

echo.
echo =========================================
echo   Demo Credentials
echo =========================================
echo.
echo   Password: demo-password-123
echo.
echo   Example: admin@acme-corp.com
echo.
echo =========================================
echo.
echo [5/5] Starting app at http://localhost:3000 ...
echo.
call npm run dev
