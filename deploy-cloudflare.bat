@echo off
chcp 65001 >nul
title 部署前端到 Cloudflare Pages

echo ========================================
echo  部署前端到 Cloudflare Pages
echo ========================================
echo.
echo  代码已在 GitHub: https://github.com/sea89/heating-supply
echo.
echo  在浏览器操作：
echo.
echo  1. 打开 https://dash.cloudflare.com
echo  2. Workers & Pages -> Pages -> Connect to Git
echo  3. 授权 GitHub，选 sea89/heating-supply
echo.
echo  构建设置:
echo     Framework preset: React
echo     Build command: cd client ^&^& npm install ^&^& npm run build
echo     Build output: /client/dist
echo     Root directory: (留空，用仓库根)
echo.
echo  环境变量:
echo     NODE_VERSION = 20
echo.
echo  点 Save and Deploy
echo.
echo ========================================
echo  部署后打开 https://heating-supply.pages.dev
echo.
echo  演示账号:
echo  维修: weixiu1 / 123456
echo  仓管: cangku1 / 123456
echo  采购: caigou1 / 123456
echo ========================================
pause
