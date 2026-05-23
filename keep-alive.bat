@echo off
chcp 65001 >nul
title Render Keep-Alive
echo ========================================
echo  Render Keep-Alive
echo  Ã¿¸ô 10 ·ÖÖÓ ping Ò»´Î·ÀÖ¹ÐÝÃß
echo  °´ Ctrl+C Í£Ö¹
echo ========================================

:loop
echo [%date% %time%] Pinging https://hs-app-4ist.onrender.com/api/health
curl -s -o nul -w "HTTP %%{http_code}\n" https://hs-app-4ist.onrender.com/api/health
timeout /t 600 /nobreak >nul
goto loop