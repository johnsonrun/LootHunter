@echo off
echo 清理Cargo緩存和構建文件...

rem 清理Cargo緩存
cargo clean

rem 移除Cargo.lock文件（如果存在）
if exist Cargo.lock del Cargo.lock

rem 移除target目錄
rd /s /q target 2>nul

echo 緩存清理完成！
echo 請重新運行 pnpm tauri dev 命令
pause 