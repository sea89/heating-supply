@echo off
chcp 65001 >nul
title Bu Shu Hou Duan dao Fly.io

cd /d "C:\Users\robin\Downloads\superpowers-5.1.0\heating-supply-app\server"

echo ========================================
echo  Bu Shu Hou Duan dao Fly.io
echo ========================================
echo.

echo 1/5 Jian cha flyctl...
where flyctl >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo An zhuang flyctl...
    start "" "https://fly.io/docs/hands-on/install-flyctl/"
    echo Qing xia zai hou ji xu...
    pause
)

echo 2/5 Deng lu...
flyctl auth login

echo 3/5 Chuang jian ying yong...
flyctl launch --name hs-app-sea89 --region hkg --no-deploy

echo 4/5 She zhi huan jing bian liang...
flyctl secrets set DATABASE_URL="postgresql://neondb_owner:npg_fUtI4dzLNO0K@ep-cold-art-aok1eebe-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
flyctl secrets set JWT_SECRET="heating-app-jwt-secret-2026"

echo 5/5 Bu shu...
flyctl deploy

echo Chu shi hua shu ju ku...
flyctl ssh console -C "node /app/setup.js"

echo.
echo ========================================
echo  Wan cheng!
echo  Hou duan di zhi: https://hs-app-sea89.fly.dev
echo.
echo  Ji xu bu shu qian duan: yun xing deploy-cloudflare.bat
echo ========================================
pause