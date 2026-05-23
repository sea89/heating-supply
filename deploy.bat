@echo off
chcp 65001 >nul
title 供热备件管理系统 - 本地部署

echo ========================================
echo   供热备件管理系统 - 本地部署
echo ========================================
echo.

REM 检查 Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js 20+
    echo 下载地址：https://nodejs.org/
    pause
    exit /b 1
)
echo [✓] Node.js 已安装
node --version

REM 检查 npm
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未检测到 npm
    pause
    exit /b 1
)
echo [✓] npm 已安装
npm --version
echo.

REM 获取当前目录
set APP_DIR=%~dp0
echo 项目目录：%APP_DIR%
echo.

REM ===================== 后端部署 =====================
echo ------ 第一步：安装后端依赖 ------
cd /d "%APP_DIR%server"
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 后端依赖安装失败
    pause
    exit /b 1
)
echo [✓] 后端依赖安装完成
echo.

echo ------ 第二步：运行数据库迁移 ------
call npx knex migrate:latest --knexfile db/knexfile.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [警告] 数据库迁移失败，可能原因：
    echo  1. PostgreSQL 未启动
    echo  2. 数据库 heating_supply 不存在
    echo  3. 密码不正确（配置的密码是 1989）
    echo.
    echo 请确保 PostgreSQL 已启动，然后手动执行：
    echo   cd "%APP_DIR%server"
    echo   npx knex migrate:latest --knexfile db/knexfile.js
    echo   npx knex seed:run --knexfile db/knexfile.js
    echo.
    pause
    exit /b 1
)
echo [✓] 数据库迁移完成

echo ------ 第三步：导入演示数据 ------
call npx knex seed:run --knexfile db/knexfile.js
echo [✓] 演示数据导入完成
echo.

REM ===================== 前端部署 =====================
echo ------ 第四步：安装前端依赖 ------
cd /d "%APP_DIR%client"
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 前端依赖安装失败
    pause
    exit /b 1
)
echo [✓] 前端依赖安装完成
echo.

echo ========================================
echo   部署完成！
echo ========================================
echo.
echo 请打开两个终端窗口分别运行：
echo.
echo [终端 1] 启动后端：
echo   cd /d "%APP_DIR%server"
echo   npm run dev
echo.
echo [终端 2] 启动前端：
echo   cd /d "%APP_DIR%client"
echo   npm run dev
echo.
echo 然后浏览器访问：http://localhost:5173
echo.
echo 演示账号：
echo   weixiu1 / 123456  - 维修人员
echo   cangku1 / 123456  - 仓管人员
echo   caigou1 / 123456  - 采购人员
echo.
pause
