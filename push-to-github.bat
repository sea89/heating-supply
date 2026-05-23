@echo off
chcp 65001 >nul
cd /d "C:\Users\robin\Downloads\superpowers-5.1.0\heating-supply-app"
echo 正在推送代码到 GitHub...
git remote set-url origin https://github.com/sea89/heating-supply.git
git push -u origin main
if %ERRORLEVEL% EQU 0 (
    echo [OK] 推送成功！
) else (
    echo [错误] 推送失败，可能是因为需要登录。
    echo.
    echo 请先登录 GitHub：
    echo   1. 打开 https://github.com/login
    echo   2. 创建 Personal Access Token: Settings → Developer settings → Personal access tokens → Tokens (classic)
    echo     勾选 repo 权限
    echo   3. 复制 token
    echo.
    echo 然后运行：
    echo   git push -u origin main
    echo   用户名输入你的 GitHub 用户名
    echo   密码输入刚才复制的 token
)
pause
