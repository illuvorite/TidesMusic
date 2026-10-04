@echo off
REM DSH 沙箱会向子进程注入 ELECTRON_RUN_AS_NODE=1，导致 electron 退化为 Node。
REM 这里显式清掉后再启动应用。
set ELECTRON_RUN_AS_NODE=
set ELECTRON_ENABLE_LOGGING=1
"%~dp0node_modules\electron\dist\electron.exe" "%~dp0dist\main.js" %*